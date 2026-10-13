'use strict';

const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const db = require('../db');
const { signToken } = require('../utils/jwt');
const { validate } = require('../utils/validate');
const { unauthorized, conflict } = require('../utils/httpError');
const { requireAuth } = require('../middleware/auth');
const { ensureAppearance } = require('../game/appearance');
const economy = require('../economy');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.isTest ? 1000 : 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
});

const PUBLIC_USER_COLUMNS = 'id, username, email, display_name, avatar_url, role, coins, credits, is_guest, skill, skill_refund_coins, created_at';

const registerSchema = {
  username: {
    type: 'string', required: true, pattern: /^[A-Za-z0-9_]{3,24}$/,
    patternMessage: 'must be 3-24 characters: letters, numbers or underscore',
  },
  email: { type: 'string', required: true, max: 254, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, patternMessage: 'must be a valid email' },
  password: { type: 'string', required: true, min: 8, max: 72, trim: false },
  marketing_opt_in: { type: 'boolean' },
  display_name: { type: 'string', max: 40 },
};

/** POST /api/auth/register */
router.post('/register', authLimiter, async (req, res) => {
  const body = validate(req.body, registerSchema);
  const hash = await bcrypt.hash(body.password, config.auth.bcryptRounds);
  try {
    const { rows } = await db.query(
      `INSERT INTO users (username, email, password_hash, display_name, marketing_opt_in, coins)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${PUBLIC_USER_COLUMNS}`,
      [body.username, body.email.toLowerCase(), hash, body.display_name ?? null, body.marketing_opt_in ?? false, economy.economy.startingCoins],
    );
    const user = rows[0];
    await economy.opening(db, user.id, user.coins);
    // Starting marble look. If this fails the look is created on first read instead.
    await ensureAppearance(user.id).catch((err) => console.error('[auth] starting look failed', err.message));
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    if (err.code === '23505') {
      throw conflict(err.constraint?.includes('email') ? 'Email is already registered' : 'Username is taken');
    }
    throw err;
  }
});

/**
 * POST /api/auth/guest — "Play free": a guest account to race with straight
 * away (a made-up name, no email or password the player knows). Saving the
 * marble later (POST /api/auth/claim) keeps everything it has won.
 */
router.post('/guest', authLimiter, async (req, res) => {
  const id = crypto.randomBytes(5).toString('hex');
  const hash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), config.auth.bcryptRounds);
  const { rows } = await db.query(
    `INSERT INTO users (username, email, password_hash, is_guest, coins)
     VALUES ($1, $2, $3, true, $4)
     RETURNING ${PUBLIC_USER_COLUMNS}`,
    [`guest_${id}`, `guest-${id}@guest.marblespins.invalid`, hash, economy.economy.startingCoins],
  );
  const user = rows[0];
  await economy.opening(db, user.id, user.coins);
  await ensureAppearance(user.id).catch((err) => console.error('[auth] starting look failed', err.message));
  res.status(201).json({ token: signToken(user), user });
});

/** POST /api/auth/claim — a guest saves their marble: picks a name, email and password, keeping coins and marbles. */
router.post('/claim', requireAuth, authLimiter, async (req, res) => {
  const body = validate(req.body, registerSchema);
  const hash = await bcrypt.hash(body.password, config.auth.bcryptRounds);
  try {
    const { rows } = await db.query(
      `UPDATE users SET username = $2, email = $3, password_hash = $4, marketing_opt_in = $5, is_guest = false
        WHERE id = $1 AND is_guest
        RETURNING ${PUBLIC_USER_COLUMNS}`,
      [req.user.id, body.username, body.email.toLowerCase(), hash, body.marketing_opt_in ?? false],
    );
    if (!rows[0]) throw conflict('This account is already saved');
    res.json({ token: signToken(rows[0]), user: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      throw conflict(err.constraint?.includes('email') ? 'Email is already registered' : 'Username is taken');
    }
    throw err;
  }
});

/** POST /api/auth/login  { login: username-or-email, password } */
router.post('/login', authLimiter, async (req, res) => {
  const body = validate(req.body, {
    login: { type: 'string', required: true, max: 254 },
    password: { type: 'string', required: true, max: 72, trim: false },
  });

  const { rows } = await db.query(
    `SELECT ${PUBLIC_USER_COLUMNS}, password_hash FROM users WHERE username = $1 OR email = $1`,
    [body.login],
  );
  const found = rows[0];
  // Always run bcrypt so response time doesn't reveal whether the account exists.
  const ok = await bcrypt.compare(body.password, found?.password_hash ?? '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
  if (!found || !ok) throw unauthorized('Invalid credentials');

  await db.query('UPDATE users SET last_login_at = now() WHERE id = $1', [found.id]);
  const { password_hash: _omit, ...user } = found;
  res.json({ token: signToken(user), user });
});

/** GET /api/auth/me */
router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await db.query(`SELECT ${PUBLIC_USER_COLUMNS} FROM users WHERE id = $1`, [req.user.id]);
  res.json({ user: rows[0] });
});

module.exports = router;
module.exports.PUBLIC_USER_COLUMNS = PUBLIC_USER_COLUMNS;
