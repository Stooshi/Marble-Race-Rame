'use strict';

const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const db = require('../db');
const { signToken } = require('../utils/jwt');
const { validate } = require('../utils/validate');
const { unauthorized, conflict, forbidden } = require('../utils/httpError');
const { requireAuth } = require('../middleware/auth');
const { ensureAppearance } = require('../game/appearance');
const economy = require('../economy');
const security = require('../security');
const passwordReset = require('../account/passwordReset');
const email = require('../email');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.isTest ? 1000 : 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
});

// `streak`: days in a row with the daily goal met, alive while the goal was met today or yesterday
// (UTC days, as in src/economy/index.js today()); 0 otherwise.
const PUBLIC_USER_COLUMNS = `id, username, email, display_name, avatar_url, role, coins, coins_earned, coins_bought, is_guest, skill, skill_refund_coins, settings, age_group, marketing_opt_in, created_at,
  CASE WHEN streak_last_day >= (now() AT TIME ZONE 'UTC')::date - 1 THEN streak_days ELSE 0 END AS streak`;

const registerSchema = {
  username: {
    type: 'string', required: true, pattern: /^[A-Za-z0-9_]{3,24}$/,
    patternMessage: 'must be 3-24 characters: letters, numbers or underscore',
  },
  email: { type: 'string', required: true, max: 254, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, patternMessage: 'must be a valid email' },
  password: { type: 'string', required: true, min: 8, max: 72, trim: false },
  marketing_opt_in: { type: 'boolean' },
  display_name: { type: 'string', max: 40 },
  age_group: { type: 'enum', values: ['under-13', '13-17', '18+'] },
};

/** The email consent's history: a line each time the answer is given or changes. */
async function logConsent(client, userId, consent, source) {
  await client.query('INSERT INTO email_consents (user_id, consent, source) VALUES ($1, $2, $3)', [userId, consent, source]);
}

/**
 * Under-13s can't make an account until parental approval exists (the sign-up page says so too):
 * refused here as well, so the rule doesn't depend on the website. They can still play as guests.
 */
function refuseUnder13(body) {
  if (body.age_group === 'under-13') {
    throw forbidden('Players under 13 need a parent or guardian to approve their account first. [Parent approval is coming]');
  }
}

/** POST /api/auth/register */
router.post('/register', authLimiter, async (req, res) => {
  const body = validate(req.body, registerSchema);
  refuseUnder13(body);
  const hash = await bcrypt.hash(body.password, config.auth.bcryptRounds);
  try {
    const { rows } = await db.query(
      `INSERT INTO users (username, email, password_hash, display_name, marketing_opt_in, coins, age_group)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${PUBLIC_USER_COLUMNS}`,
      [body.username, body.email.toLowerCase(), hash, body.display_name ?? null, body.marketing_opt_in ?? false, economy.economy.startingCoins, body.age_group ?? null],
    );
    const user = rows[0];
    await logConsent(db, user.id, body.marketing_opt_in ?? false, 'signup');
    await security.record(req, user.id, 'signup');
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
  await security.record(req, user.id, 'guest');
  res.status(201).json({ token: signToken(user), user });
});

/** POST /api/auth/claim — a guest saves their marble: picks a name, email and password, keeping coins and marbles. */
router.post('/claim', requireAuth, authLimiter, async (req, res) => {
  const body = validate(req.body, registerSchema);
  refuseUnder13(body);
  const hash = await bcrypt.hash(body.password, config.auth.bcryptRounds);
  try {
    const { rows } = await db.query(
      `UPDATE users SET username = $2, email = $3, password_hash = $4, marketing_opt_in = $5, is_guest = false,
                        age_group = COALESCE($6, age_group)
        WHERE id = $1 AND is_guest
        RETURNING ${PUBLIC_USER_COLUMNS}`,
      [req.user.id, body.username, body.email.toLowerCase(), hash, body.marketing_opt_in ?? false, body.age_group ?? null],
    );
    if (!rows[0]) throw conflict('This account is already saved');
    await logConsent(db, rows[0].id, body.marketing_opt_in ?? false, 'claim');
    await security.record(req, rows[0].id, 'claim');
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
    `SELECT ${PUBLIC_USER_COLUMNS}, password_hash, suspended_at FROM users WHERE username = $1 OR email = $1`,
    [body.login],
  );
  const found = rows[0];
  // Always run bcrypt so response time doesn't reveal whether the account exists.
  const ok = await bcrypt.compare(body.password, found?.password_hash ?? '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
  if (!found || !ok) throw unauthorized('Invalid credentials');
  if (found.suspended_at) throw forbidden('This account is suspended. Contact support if you think this is a mistake.');

  await db.query('UPDATE users SET last_login_at = now() WHERE id = $1', [found.id]);
  await security.record(req, found.id, 'login');
  const { password_hash: _omit, suspended_at: _s, ...user } = found;
  res.json({ token: signToken(user), user });
});

/** GET /api/auth/password-reset — whether "Forgot your password?" works (email is set up). */
router.get('/password-reset', (_req, res) => {
  res.json({ enabled: email.enabled() });
});

/**
 * POST /api/auth/forgot { email } — emails a reset link if the address belongs to a saved account.
 * The answer is the same either way, so it can't be used to find out who has an account.
 */
router.post('/forgot', authLimiter, async (req, res) => {
  const body = validate(req.body, { email: { type: 'string', required: true, max: 254 } });
  const origin = req.get('origin');
  const siteUrl = config.isSiteOrigin(origin) ? origin : config.publicSiteUrl;
  const out = await passwordReset.request(db, { email: body.email, siteUrl });
  if (out.sent) await security.record(req, out.userId, 'reset-request');
  res.json({ ok: true, minutes: passwordReset.LINK_MINUTES });
});

/** POST /api/auth/reset { token, password } — sets the new password from an emailed link, and logs in. */
router.post('/reset', authLimiter, async (req, res) => {
  const body = validate(req.body, {
    token: { type: 'string', required: true, max: 100, trim: false },
    password: { type: 'string', required: true, min: 8, max: 72, trim: false },
  });
  const { id } = await passwordReset.reset(db, body);
  await security.record(req, id, 'password-reset');
  const { rows: [user] } = await db.query(`SELECT ${PUBLIC_USER_COLUMNS} FROM users WHERE id = $1`, [id]);
  res.json({ token: signToken(user), user });
});

/** GET /api/auth/me */
router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await db.query(`SELECT ${PUBLIC_USER_COLUMNS} FROM users WHERE id = $1`, [req.user.id]);
  // A visit renews the login (sliding expiry): a login older than a day gets a fresh token, valid
  // config.auth.jwtExpiresIn from now. The app stores it; the old one stays valid until it expires.
  const age = Math.floor(Date.now() / 1000) - (req.user.tokenPayload?.iat ?? 0);
  const token = age >= config.auth.renewAfterSeconds ? signToken(rows[0]) : undefined;
  res.json({ user: rows[0], ...(token && { token }) });
});

module.exports = router;
module.exports.PUBLIC_USER_COLUMNS = PUBLIC_USER_COLUMNS;
