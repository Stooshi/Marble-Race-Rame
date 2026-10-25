'use strict';

const crypto = require('crypto');
const express = require('express');
const names = require('../names');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const db = require('../db');
const { signToken } = require('../utils/jwt');
const starters = require('../marbles/starters');
const emailConfirm = require('../account/emailConfirm');
const retention = require('../account/retention');
const { validate } = require('../utils/validate');
const { HttpError, badRequest, unauthorized, conflict, forbidden } = require('../utils/httpError');
const { requireAuth } = require('../middleware/auth');
const { ensureAppearance } = require('../game/appearance');
const economy = require('../economy');
const security = require('../security');
const passwordReset = require('../account/passwordReset');
const email = require('../email');

const country = require('../country');
const router = express.Router();

const limiter = (windowMs, limit, error = 'Too many attempts, please try again later') => rateLimit({
  windowMs,
  limit: config.isTest ? 1000 : limit,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error },
});
// Per address (Moses, 21 Oct 2026): a class, a pilot group or League Night in a bar share one Wi-Fi,
// so starting to play doesn't count toward the sign-in limit. Each kind of request has its own:
//   log in, password reset, email confirmation: strict (guessing passwords)  20 / 15 min
//   saving an account (sign-up, saving a guest):                              60 / 15 min
//   starting as a guest ("Play free"):                                       300 / hour
//   suggested player names (the sign-up form asks once when it opens):      300 / 15 min
const authLimiter = limiter(15 * 60 * 1000, 20);
const signupLimiter = limiter(15 * 60 * 1000, 60);
const guestLimiter = limiter(60 * 60 * 1000, 300, 'Too many new players from this address right now, please try again in a few minutes');
const nameLimiter = limiter(15 * 60 * 1000, 300);

// `streak`: days in a row with the daily goal met, alive while the goal was met today or yesterday
// (UTC days, as in src/economy/index.js today()); 0 otherwise.
const PUBLIC_USER_COLUMNS = `id, username, email, display_name, avatar_url, role, coins, coins_earned, coins_bought, is_guest, skill, skill_refund_coins, settings, age_group, marketing_opt_in, email_verified_at, country, created_at,
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
  // Since 20 Oct 2026: birth year and month (the age group is worked out from them; older apps send age_group).
  birth_year: { type: 'int', min: 1900, max: 2100 },
  birth_month: { type: 'int', min: 1, max: 12 },
  lang: { type: 'enum', values: ['en', 'sv'] }, // (the confirmation email's language)
  country: { type: 'string', max: 2, nullable: true }, // (optional: the country the player races for, src/country)
};

/**
 * Age in whole years from a birth year and month, counting the birth month as not yet reached (no
 * day is asked: so nobody is taken for 13 before they are).
 */
function ageFrom(year, month, now = new Date()) {
  const y = now.getUTCFullYear(); const m = now.getUTCMonth() + 1;
  return y - year - (m <= month ? 1 : 0);
}
const ageGroupOf = (age) => (age < 13 ? 'under-13' : age < 18 ? '13-17' : '18+');

/** The sign-up's age: from birth year and month (both or neither), else the old age group. Throws on a birth date in the future. */
function ageOf(body, now = new Date()) {
  if ((body.birth_year == null) !== (body.birth_month == null)) throw badRequest('Give both your birth year and month');
  if (body.birth_year == null) return { ageGroup: body.age_group ?? null, birthMonth: null };
  const age = ageFrom(body.birth_year, body.birth_month, now);
  if (age < 0 || age > 120) throw badRequest('Please check your birth year and month');
  return { ageGroup: ageGroupOf(age), birthMonth: `${body.birth_year}-${String(body.birth_month).padStart(2, '0')}-01` };
}

/** The email consent's history: a line each time the answer is given or changes. */
async function logConsent(client, userId, consent, source) {
  await client.query('INSERT INTO email_consents (user_id, consent, source) VALUES ($1, $2, $3)', [userId, consent, source]);
}

/**
 * Under-13s can't make an account until parental approval exists (the sign-up page says so too):
 * refused here as well, so the rule doesn't depend on the website. They can still play as guests.
 */
function refuseUnder13(ageGroup) {
  if (ageGroup === 'under-13') {
    // (nothing is stored: the player keeps racing as a guest; the sign-up form says so kindly)
    throw new HttpError(403, "Saving an account is for players 13 and older, so we haven't made one. You can keep racing as a guest as much as you like.", { code: 'under_13' });
  }
}

/** POST /api/auth/register */
router.post('/register', signupLimiter, async (req, res) => {
  const body = validate(req.body, registerSchema);
  const { ageGroup, birthMonth } = ageOf(body);
  refuseUnder13(ageGroup);
  await names.assertAllowed({ username: body.username, display_name: body.display_name });
  await names.assertNotSomeonesShownName(db, null, body.username);
  const hash = await bcrypt.hash(body.password, config.auth.bcryptRounds);
  try {
    const { rows } = await db.query(
      `INSERT INTO users (username, email, password_hash, display_name, marketing_opt_in, coins, age_group, birth_month)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${PUBLIC_USER_COLUMNS}`,
      [body.username, body.email.toLowerCase(), hash, body.display_name ?? null, body.marketing_opt_in ?? false, economy.economy.startingCoins, ageGroup, birthMonth],
    );
    const user = rows[0];
    if (body.country) user.country = (await country.choose(db, user.id, body.country)).country;
    await logConsent(db, user.id, body.marketing_opt_in ?? false, 'signup');
    await security.record(req, user.id, 'signup');
    await economy.opening(db, user.id, user.coins);
    // Starting marble look. If this fails the look is created on first read instead.
    await ensureAppearance(user.id).catch((err) => console.error('[auth] starting look failed', err.message));
    // Their own 4 starter marbles (if this fails, they are made the first time they're needed).
    await starters.ensure(db, user.id).catch((err) => console.error('[auth] starter marbles failed', err.message));
    const confirm = await emailConfirm.send(db, user, { lang: body.lang }).catch((err) => { console.error('[auth] confirmation email failed', err.message); return 'failed'; });
    res.status(201).json({ token: signToken(user), user, confirm });
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
router.post('/guest', guestLimiter, async (req, res) => {
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
  await starters.ensure(db, user.id).catch((err) => console.error('[auth] starter marbles failed', err.message));
  await security.record(req, user.id, 'guest');
  res.status(201).json({ token: signToken(user), user });
});

/** POST /api/auth/claim — a guest saves their marble: picks a name, email and password, keeping coins and marbles. */
router.post('/claim', requireAuth, signupLimiter, async (req, res) => {
  const body = validate(req.body, registerSchema);
  const { ageGroup, birthMonth } = ageOf(body);
  refuseUnder13(ageGroup);
  await names.assertAllowed({ username: body.username });
  await names.assertNotSomeonesShownName(db, req.user.id, body.username);
  const hash = await bcrypt.hash(body.password, config.auth.bcryptRounds);
  try {
    const { rows } = await db.query(
      `UPDATE users SET username = $2, email = $3, password_hash = $4, marketing_opt_in = $5, is_guest = false,
                        age_group = COALESCE($6, age_group), birth_month = COALESCE($7::date, birth_month),
                        -- (A name the guest chose stays, unless it's now their player name anyway.)
                        display_name = CASE WHEN lower(display_name) = lower($8) THEN NULL ELSE display_name END
        WHERE id = $1 AND is_guest
        RETURNING ${PUBLIC_USER_COLUMNS}`,
      [req.user.id, body.username, body.email.toLowerCase(), hash, body.marketing_opt_in ?? false, ageGroup, birthMonth, String(body.username)],
    );
    if (!rows[0]) throw conflict('This account is already saved');
    if (body.country) rows[0].country = (await country.choose(db, rows[0].id, body.country)).country;
    await logConsent(db, rows[0].id, body.marketing_opt_in ?? false, 'claim');
    await security.record(req, rows[0].id, 'claim');
    // Everything the guest won stays: it's the same account (coins, marbles, starters, races).
    const confirm = await emailConfirm.send(db, rows[0], { lang: body.lang }).catch((err) => { console.error('[auth] confirmation email failed', err.message); return 'failed'; });
    res.json({ token: signToken(rows[0]), user: rows[0], confirm });
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
  await retention.seen(db, req.user.id); // (guests: deleted after 90 days without a visit)
  // A visit renews the login (sliding expiry): a login older than a day gets a fresh token, valid
  // config.auth.jwtExpiresIn from now. The app stores it; the old one stays valid until it expires.
  const age = Math.floor(Date.now() / 1000) - (req.user.tokenPayload?.iat ?? 0);
  const token = age >= config.auth.renewAfterSeconds ? signToken(rows[0]) : undefined;
  // A guest's finished races (the save pop-up comes after every 3rd: client SavePrompt).
  let racesFinished;
  if (rows[0].is_guest) {
    const { rows: [n] } = await db.query(
      `SELECT count(*)::int AS n FROM race_entries e JOIN races r ON r.id = e.race_id AND r.status = 'finished' WHERE e.user_id = $1`,
      [req.user.id],
    );
    racesFinished = n.n;
  }
  res.json({ user: rows[0], ...(token && { token }), ...(racesFinished != null && { racesFinished }) });
});

// Suggested player names for the quick sign-up ("SwiftComet42"): free ones, the player may change it.
const NAME_A = ['Swift', 'Lucky', 'Rapid', 'Bouncy', 'Shiny', 'Rolling', 'Cosmic', 'Golden', 'Turbo', 'Zippy', 'Mighty', 'Brave', 'Clever', 'Sunny', 'Frosty', 'Speedy', 'Jolly', 'Daring', 'Bright', 'Nimble'];
const NAME_B = ['Comet', 'Rocket', 'Racer', 'Spinner', 'Pebble', 'Bolt', 'Glider', 'Orbit', 'Flash', 'Marble', 'Shooter', 'Roller', 'Dash', 'Spark', 'Meteor', 'Swirl', 'Zoom', 'Breeze', 'Arrow', 'Drift'];
/** GET /api/auth/suggest-name — a free player name to start from. */
router.get('/suggest-name', nameLimiter, async (_req, res) => {
  for (let tries = 0; tries < 12; tries += 1) {
    const name = `${NAME_A[crypto.randomInt(NAME_A.length)]}${NAME_B[crypto.randomInt(NAME_B.length)]}${crypto.randomInt(10, 100)}`;
    const { rows } = await db.query('SELECT 1 FROM users WHERE lower(username) = lower($1)', [name]);
    if (!rows.length) return res.json({ name });
  }
  res.json({ name: null });
});

/** POST /api/auth/confirm-email { token } — the link in the confirmation email. */
router.post('/confirm-email', authLimiter, async (req, res) => {
  const { token } = validate(req.body, { token: { type: 'string', required: true, max: 100, trim: false } });
  res.json(await emailConfirm.confirm(db, token));
});

/** POST /api/auth/confirm-email/resend — a new confirmation link (logged in, saved account, not yet confirmed). */
router.post('/confirm-email/resend', requireAuth, authLimiter, async (req, res) => {
  const { lang } = validate(req.body ?? {}, { lang: { type: 'enum', values: ['en', 'sv'] } });
  const { rows: [u] } = await db.query('SELECT id, username, email, is_guest, email_verified_at FROM users WHERE id = $1', [req.user.id]);
  if (u.is_guest) throw badRequest('Save your account first');
  if (u.email_verified_at) return res.json({ confirm: 'confirmed' });
  res.json({ confirm: await emailConfirm.send(db, u, { lang }) });
});

module.exports = router;
module.exports.PUBLIC_USER_COLUMNS = PUBLIC_USER_COLUMNS;
