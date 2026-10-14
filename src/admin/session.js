'use strict';

/**
 * Back-office sessions. Every /api/admin request is checked here, on the server:
 *   1. an admin session token (not a player's token), signed by the server;
 *   2. its session still open: started with the 2-step code, used in the last
 *      30 minutes (IDLE_MINUTES), not logged out; each request keeps it alive;
 *   3. the account still an admin and not suspended (read fresh every time).
 *
 * Starting a session: the admin logs in as a player (password), then
 *   POST /api/admin/session/start            → { setup: { secret, otpauth } } the first time, else { needCode: true }
 *   POST /api/admin/session/verify { code }  → { token, expiresInMinutes } (the first code also switches 2-step on)
 *   POST /api/admin/session/end              → logs out
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { HttpError, forbidden, unauthorized, badRequest } = require('../utils/httpError');
const totp = require('./totp');
const security = require('../security');

const IDLE_MINUTES = 30;
const AUDIENCE = 'marble-admin';
const TRIES = new Map(); // user id → { n, until }: 5 wrong codes = a 15-minute pause

function signAdminToken(userId, sessionId) {
  return jwt.sign({ sub: userId, sid: sessionId }, config.auth.jwtSecret, { algorithm: 'HS256', audience: AUDIENCE, expiresIn: '12h' });
}

function bearer(req) {
  const [scheme, token] = (req.get('authorization') || '').split(' ');
  return scheme?.toLowerCase() === 'bearer' ? token : null;
}

/** The check on every back-office request (see the top of this file). */
async function requireAdminSession(req, _res, next) {
  let payload;
  try {
    payload = jwt.verify(bearer(req) ?? '', config.auth.jwtSecret, { algorithms: ['HS256'], audience: AUDIENCE });
  } catch {
    throw unauthorized('Back-office login needed');
  }
  const { rows } = await db.query(
    `UPDATE admin_sessions s SET last_seen_at = now()
       FROM users u
      WHERE s.id = $1 AND s.user_id = $2 AND u.id = s.user_id
        AND s.ended_at IS NULL AND s.last_seen_at > now() - make_interval(mins => $3)
        AND u.role = 'admin' AND u.suspended_at IS NULL
      RETURNING u.id, u.username, u.role, s.id AS session_id`,
    [payload.sid, payload.sub, IDLE_MINUTES],
  );
  if (!rows[0]) throw unauthorized('Your back-office session has ended. Log in again.');
  req.admin = rows[0];
  next();
}

const router = express.Router();

function mustBeAdmin(req) {
  if (req.user?.role !== 'admin') throw forbidden('Admin access required');
}

/** POST /api/admin/session/start (with the player login token) */
router.post('/start', requireAuth, async (req, res) => {
  mustBeAdmin(req);
  const { rows } = await db.query('SELECT secret_enc, enabled_at FROM admin_2fa WHERE user_id = $1', [req.user.id]);
  if (rows[0]?.enabled_at) return res.json({ needCode: true });
  // First time (or set up but never confirmed): a new secret to scan.
  const secret = totp.newSecret();
  await db.query(
    `INSERT INTO admin_2fa (user_id, secret_enc) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET secret_enc = EXCLUDED.secret_enc, enabled_at = NULL, last_step = NULL`,
    [req.user.id, totp.encrypt(secret)],
  );
  return res.json({ setup: { secret, otpauth: totp.otpauthUrl(secret, req.user.username) } });
});

/** POST /api/admin/session/verify { code } */
router.post('/verify', requireAuth, async (req, res) => {
  mustBeAdmin(req);
  const tries = TRIES.get(req.user.id);
  if (tries && tries.until > Date.now() && tries.n >= 5) throw new HttpError(429, 'Too many wrong codes. Wait 15 minutes.');
  const { rows } = await db.query('SELECT secret_enc, enabled_at, last_step FROM admin_2fa WHERE user_id = $1', [req.user.id]);
  if (!rows[0]) throw badRequest('Start the back-office login first');
  const step = totp.verify(totp.decrypt(rows[0].secret_enc), req.body?.code, { lastStep: rows[0].last_step === null ? null : Number(rows[0].last_step) });
  if (step === null) {
    const t = tries && tries.until > Date.now() ? tries : { n: 0, until: Date.now() + 15 * 60_000 };
    t.n += 1;
    TRIES.set(req.user.id, t);
    throw unauthorized('That code is not right (or was already used). Try the next one.');
  }
  TRIES.delete(req.user.id);
  await db.query('UPDATE admin_2fa SET last_step = $2, enabled_at = COALESCE(enabled_at, now()) WHERE user_id = $1', [req.user.id, step]);
  const { rows: s } = await db.query('INSERT INTO admin_sessions (user_id) VALUES ($1) RETURNING id', [req.user.id]);
  await security.record(req, req.user.id, 'admin-login');
  res.json({ token: signAdminToken(req.user.id, s[0].id), idleMinutes: IDLE_MINUTES, user: { id: req.user.id, username: req.user.username } });
});

/** POST /api/admin/session/end */
router.post('/end', requireAdminSession, async (req, res) => {
  await db.query('UPDATE admin_sessions SET ended_at = now() WHERE id = $1', [req.admin.session_id]);
  res.status(204).end();
});

/** GET /api/admin/session — still logged in? (also keeps the session alive) */
router.get('/', requireAdminSession, (req, res) => {
  res.json({ user: { id: req.admin.id, username: req.admin.username }, idleMinutes: IDLE_MINUTES });
});

module.exports = { router, requireAdminSession, IDLE_MINUTES, AUDIENCE, signAdminToken };
