'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const config = require('../config');
const db = require('../db');
const starters = require('../marbles/starters');
const { requireAuth } = require('../middleware/auth');
const { validate, assertUuid, pagination } = require('../utils/validate');
const { badRequest, notFound, unauthorized } = require('../utils/httpError');
const { PUBLIC_USER_COLUMNS } = require('./auth');
const { MARBLE_COLUMNS, HISTORY } = require('./marbles');
const appearance = require('../game/appearance');
const unsubscribe = require('../email/unsubscribe');
const account = require('../account');

const seasons = require('../seasons');
const names = require('../names');
const country = require('../country');
const security = require('../security');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const STATS_COLUMNS = 'races_played, wins, podiums, best_win_time_ms, avg_position, coins_won, best_split_ms, best_finish_time_ms';

async function getStats(userId) {
  const { rows } = await db.query(`SELECT ${STATS_COLUMNS} FROM user_stats WHERE user_id = $1`, [userId]);
  return rows[0] || null;
}

/**
 * POST /api/users/me/cookie-consent { version, statistics, marketing, decided_at } — the player's
 * choice in the website's cookie banner, kept as a record of the consent (see /cookies).
 */
router.post('/me/cookie-consent', requireAuth, async (req, res) => {
  const body = validate(req.body ?? {}, {
    version: { type: 'int', required: true, min: 1, max: 1000 },
    statistics: { type: 'boolean', required: true },
    marketing: { type: 'boolean', required: true },
    decided_at: { type: 'date' },
  });
  // (A time from the browser is kept only if it is plausible: not in the future, not older than a year.)
  const now = Date.now();
  const at = body.decided_at && body.decided_at.getTime() <= now + 60_000 && body.decided_at.getTime() > now - 365 * 86400_000 ? body.decided_at : new Date(now);
  await db.query(
    'INSERT INTO cookie_consents (user_id, version, statistics, marketing, decided_at) VALUES ($1, $2, $3, $4, $5)',
    [req.user.id, body.version, body.statistics, body.marketing, at],
  );
  res.status(201).json({ ok: true });
});

/** GET /api/users/me — full private profile with stats */
router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await db.query(`SELECT ${PUBLIC_USER_COLUMNS}, last_login_at FROM users WHERE id = $1`, [req.user.id]);
  res.json({ user: rows[0], stats: await getStats(req.user.id), badges: await seasons.badgesOf(db, req.user.id) });
});

/**
 * PUT /api/users/me/settings { sound: { music, effects, muted } } — the player's own settings
 * (kept with the account so they follow the player to another device). Merged into what is saved.
 */
router.put('/me/settings', requireAuth, async (req, res) => {
  const sound = req.body?.sound;
  if (!sound || typeof sound !== 'object') throw badRequest('Provide sound: { music, effects, muted }');
  const level = (v, name) => {
    if (v === undefined) return undefined;
    if (typeof v !== 'number' || !(v >= 0 && v <= 1)) throw badRequest(`sound.${name} must be a number from 0 to 1`);
    return Math.round(v * 100) / 100;
  };
  const clean = {};
  for (const k of ['music', 'effects']) { const v = level(sound[k], k); if (v !== undefined) clean[k] = v; }
  if (sound.muted !== undefined) {
    if (typeof sound.muted !== 'boolean') throw badRequest('sound.muted must be true or false');
    clean.muted = sound.muted;
  }
  const { rows } = await db.query(
    `UPDATE users SET settings = jsonb_set(settings, '{sound}', COALESCE(settings->'sound', '{}'::jsonb) || $2::jsonb)
      WHERE id = $1 RETURNING settings`,
    [req.user.id, JSON.stringify(clean)],
  );
  res.json({ settings: rows[0].settings });
});

/**
 * GET /api/users/me/country — the country the player races for and the change rule's state
 * (src/country), plus `suggested`: the country of this request's IP address, only to pre-fill the
 * picker (looked up, never stored for this).
 */
router.get('/me/country', requireAuth, async (req, res) => {
  const { rows: [u] } = await db.query('SELECT country, country_chosen_at, is_guest FROM users WHERE id = $1', [req.user.id]);
  if (!u) throw notFound('No such player');
  const ip = security.countryOf(security.clientIp(req));
  res.set('Cache-Control', 'no-store');
  res.json({ ...country.status(u), saved: !u.is_guest, suggested: country.isCountry(ip) ? ip : null, changeDays: country.CHANGE_DAYS });
});

/** GET /api/users/country-suggestion — the country of this request's IP address, only to pre-fill the sign-up form's picker (nothing stored). */
router.get('/country-suggestion', async (req, res) => {
  const ip = security.countryOf(security.clientIp(req));
  res.set('Cache-Control', 'no-store');
  res.json({ suggested: country.isCountry(ip) ? ip : null });
});

/** PUT /api/users/me/country { country: 'SE' | null } — choose, correct, change or remove it (the change rule: src/country). */
router.put('/me/country', requireAuth, async (req, res) => {
  if (!req.body || !('country' in req.body)) throw badRequest('Provide country: a two-letter code, or null to remove it');
  const body = validate(req.body, { country: { type: 'string', max: 2, nullable: true } });
  res.json(await country.choose(db, req.user.id, body.country ?? null));
});

/** PATCH /api/users/me — update profile; changing password requires current_password */
router.patch('/me', requireAuth, async (req, res) => {
  const body = validate(req.body, {
    display_name: { type: 'string', max: 40, nullable: true },
    avatar_url: { type: 'string', max: 500, pattern: /^https?:\/\//, patternMessage: 'must be an http(s) URL', nullable: true },
    email: { type: 'string', max: 254, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, patternMessage: 'must be a valid email' },
    password: { type: 'string', min: 8, max: 72, trim: false },
    current_password: { type: 'string', max: 72, trim: false },
    marketing_opt_in: { type: 'boolean' },
  }, { partial: true });

  const sets = [];
  const params = [req.user.id];
  const set = (column, value) => { params.push(value); sets.push(`${column} = $${params.length}`); };

  if ('display_name' in body) {
    await names.assertAllowed({ display_name: body.display_name });
    set('display_name', body.display_name);
  }
  if ('avatar_url' in body) set('avatar_url', body.avatar_url);
  // News by email: yes or no, with its history (the back office's consent log).
  if ('marketing_opt_in' in body) {
    const { rows: [u] } = await db.query('SELECT age_group, is_guest, marketing_opt_in FROM users WHERE id = $1', [req.user.id]);
    if (body.marketing_opt_in && u.age_group === 'under-13') throw badRequest('Under 13: news by email needs a parent or guardian [parent approval is coming]');
    if (body.marketing_opt_in && u.is_guest) throw badRequest('Save your account with an email address first');
    set('marketing_opt_in', body.marketing_opt_in);
    if (u.marketing_opt_in !== body.marketing_opt_in) {
      await db.query(`INSERT INTO email_consents (user_id, consent, source) VALUES ($1, $2, 'settings')`, [req.user.id, body.marketing_opt_in]);
    }
  }

  if (body.password || body.email) {
    if (!body.current_password) throw badRequest('current_password is required to change email or password');
    const { rows } = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!(await bcrypt.compare(body.current_password, rows[0].password_hash))) {
      throw unauthorized('current_password is incorrect');
    }
    if (body.email) { set('email', body.email.toLowerCase()); set('email_verified_at', null); } // (a new address is confirmed again)
    if (body.password) set('password_hash', await bcrypt.hash(body.password, config.auth.bcryptRounds));
  }

  if (!sets.length) throw badRequest('No updatable fields supplied');
  const { rows } = await db.query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $1 RETURNING ${PUBLIC_USER_COLUMNS}`,
    params,
  );
  res.json({ user: rows[0] });
});

/**
 * GET /api/users/me/email — news by email: the current answer, since when, and whether this
 * player can be asked at all (not under 13, not a guest without an email address).
 */
router.get('/me/email', requireAuth, async (req, res) => {
  const { rows: [u] } = await db.query('SELECT email, is_guest, age_group, marketing_opt_in FROM users WHERE id = $1', [req.user.id]);
  const { rows: [last] } = await db.query('SELECT consent, source, created_at FROM email_consents WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1', [req.user.id]);
  const allowed = u.age_group !== 'under-13' && !u.is_guest;
  res.json({
    news: u.marketing_opt_in && allowed,
    since: last?.created_at ?? null,
    source: last?.source ?? null,
    allowed,
    why: u.age_group === 'under-13' ? 'under-13' : u.is_guest ? 'guest' : null,
    email: u.is_guest ? null : u.email,
  });
});

/**
 * POST /api/users/unsubscribe { u, t } (or ?u=&t=) — the link in a news email: stops news emails
 * without logging in. Mail apps' one-click unsubscribe posts here too (List-Unsubscribe=One-Click).
 * Answers the same whether or not it was already off.
 */
async function unsubscribeHandler(req, res) {
  const u = String(req.body?.u ?? req.query.u ?? '');
  const t = String(req.body?.t ?? req.query.t ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(u) || !unsubscribe.valid(u, t)) throw badRequest('This unsubscribe link is not valid');
  await db.withTransaction(async (client) => {
    const { rows: [was] } = await client.query('SELECT marketing_opt_in FROM users WHERE id = $1 FOR UPDATE', [u]);
    if (!was) throw notFound('No such player');
    if (!was.marketing_opt_in) return;
    await client.query('UPDATE users SET marketing_opt_in = false WHERE id = $1', [u]);
    await client.query(`INSERT INTO email_consents (user_id, consent, source) VALUES ($1, false, 'unsubscribe')`, [u]);
  });
  res.json({ ok: true, news: false });
}
router.post('/unsubscribe', express.urlencoded({ extended: false, limit: '4kb' }), unsubscribeHandler);

/** GET /api/users/me/export — "Download my data": everything stored about the player, as a JSON file. */
router.get('/me/export', requireAuth, async (req, res) => {
  const data = await account.exportData(db, req.user.id);
  if (!data) throw notFound('No such player');
  res.set('Cache-Control', 'no-store');
  res.set('Content-Disposition', `attachment; filename="marble-spins-data-${data.account.username}.json"`);
  res.type('application/json').send(JSON.stringify(data, null, 2));
});

/**
 * DELETE /api/users/me { confirm: 'DELETE', password? } — the player deletes their account. Saved
 * accounts confirm with their password; guests (no password) by typing DELETE. See src/account.
 */
router.delete('/me', requireAuth, async (req, res) => {
  const body = validate(req.body ?? {}, { confirm: { type: 'string', max: 20 }, password: { type: 'string', max: 72, trim: false } }, { partial: true });
  if (String(body.confirm ?? '').trim().toUpperCase() !== 'DELETE') throw badRequest('Type DELETE to confirm');
  const { rows: [u] } = await db.query('SELECT is_guest, password_hash FROM users WHERE id = $1', [req.user.id]);
  if (!u.is_guest && !(body.password && await bcrypt.compare(body.password, u.password_hash))) throw unauthorized('Wrong password');
  const done = await db.withTransaction((client) => account.deleteAccount(client, req.user.id));
  if (!done) throw notFound('No such player');
  res.json({ deleted: true });
});

/** GET /api/users/me/appearance — your marble's look (cosmetic only) */
router.get('/me/appearance', requireAuth, async (req, res) => {
  res.json({ appearance: await appearance.getAppearance(req.user.id) });
});

/**
 * PUT /api/users/me/appearance  { color?, surface?, effect? }
 * Curated keys only (see GET /api/appearance/options). Custom labels are refused for now.
 */
router.put('/me/appearance', requireAuth, async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  for (const f of ['color', 'surface', 'effect']) {
    if (body[f] !== undefined && typeof body[f] !== 'string') throw badRequest(`${f} must be a string key`);
  }
  res.json({ appearance: await appearance.updateAppearance(req.user.id, body) });
});

/** POST /api/users/me/refund-note/seen — the one-time note about the marble refund has been read */
router.post('/me/refund-note/seen', requireAuth, async (req, res) => {
  await db.query('UPDATE users SET skill_refund_coins = NULL WHERE id = $1', [req.user.id]);
  res.status(204).end();
});

/** GET /api/users/me/marbles — the caller's Marble Bag (their own 4 starters + bought), each with its history with them */
router.get('/me/marbles', requireAuth, async (req, res) => {
  await starters.ensure(db, req.user.id); // (players from before 20 Oct 2026 get their own 4 here)
  const { rows } = await db.query(
    `SELECT ${MARBLE_COLUMNS}, ${HISTORY}, (um.user_id IS NOT NULL OR m.owner_id = $1) AS owned, COALESCE(um.is_favorite, false) AS is_favorite, um.acquired_at
       FROM marbles m
       LEFT JOIN user_marbles um ON um.marble_id = m.id AND um.user_id = $1
      WHERE m.is_active AND (m.owner_id = $1 OR um.user_id IS NOT NULL)
      ORDER BY is_favorite DESC, m.starter_no NULLS LAST, m.rarity DESC, m.name`,
    [req.user.id],
  );
  res.json({ marbles: rows });
});

/** PUT /api/users/me/marbles/:marbleId/favorite  { is_favorite } */
router.put('/me/marbles/:marbleId/favorite', requireAuth, async (req, res) => {
  const marbleId = assertUuid(req.params.marbleId, 'marbleId');
  const { is_favorite: isFavorite } = validate(req.body, { is_favorite: { type: 'boolean', required: true } });

  // Starter marbles get an ownership row on first favourite.
  const { rows } = await db.query(
    `INSERT INTO user_marbles (user_id, marble_id, is_favorite)
     SELECT $1, m.id, $3 FROM marbles m
      WHERE m.id = $2 AND (m.owner_id = $1 OR EXISTS (SELECT 1 FROM user_marbles WHERE user_id = $1 AND marble_id = $2))
     ON CONFLICT (user_id, marble_id) DO UPDATE SET is_favorite = EXCLUDED.is_favorite
     RETURNING marble_id, is_favorite`,
    [req.user.id, marbleId, isFavorite],
  );
  if (!rows[0]) throw notFound('You do not own that marble');
  res.json(rows[0]);
});

/** GET /api/users/leaderboard?sort=wins|podiums|races_played|coins_won */
router.get('/leaderboard', async (req, res) => {
  const { sort } = validate(req.query, {
    sort: { type: 'enum', values: ['wins', 'podiums', 'races_played', 'coins_won'] },
  });
  const { limit, offset } = pagination(req.query, { defaultLimit: 25 });
  const column = sort || 'wins';
  const { rows } = await db.query(
    `SELECT s.user_id, s.username, u.display_name, u.avatar_url, ${STATS_COLUMNS}
       FROM user_stats s JOIN users u ON u.id = s.user_id
      WHERE s.races_played > 0
      ORDER BY s.${column} DESC, s.wins DESC, s.avg_position ASC NULLS LAST, s.username
      LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
  res.json({ leaderboard: rows.map((r, i) => ({ rank: offset + i + 1, ...r })), limit, offset });
});

/** GET /api/users/:id — public profile */
// (A player can report at most 30 names an hour.)
const reportLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: config.isTest ? 1000 : 30, keyGenerator: (req) => `u:${req.user.id}`, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Thanks: that is a lot of reports. Try again in an hour.' } });

/**
 * POST /api/users/:id/report-name { where: 'scoreboard'|'results'|'room', name? } — "Report this name"
 * (src/names). Logged-in players and guests; once per player while open. → { reported: true }
 */
router.post('/:id/report-name', requireAuth, reportLimiter, async (req, res) => {
  const id = assertUuid(req.params.id);
  const body = validate(req.body ?? {}, { where: { type: 'enum', values: names.WHERE }, name: { type: 'string', max: 64 } });
  res.json(await names.report(db, { reporterId: req.user.id, userId: id, where: body.where, nameShown: body.name }));
});

router.get('/:id', async (req, res) => {
  const id = assertUuid(req.params.id);
  const { rows } = await db.query(
    'SELECT id, username, display_name, avatar_url, skill, created_at FROM users WHERE id = $1',
    [id],
  );
  if (!rows[0]) throw notFound('User not found');
  res.json({ user: rows[0], stats: await getStats(id), badges: await seasons.badgesOf(db, id) });
});

/** GET /api/users/:id/races — finished race history */
router.get('/:id/races', async (req, res) => {
  const id = assertUuid(req.params.id);
  const { limit, offset } = pagination(req.query);
  const { rows } = await db.query(
    `SELECT r.id AS race_id, r.name, r.finished_at, r.target_duration_ms,
            t.id AS track_id, t.name AS track_name,
            e.marble_id, m.name AS marble_name, m.color_primary, m.color_secondary, m.pattern,
            e.finish_position, e.finish_time_ms, e.split_time_ms, e.coins_awarded,
            (SELECT COUNT(*) FROM race_entries x WHERE x.race_id = r.id)::int AS marble_count
       FROM race_entries e
       JOIN races r   ON r.id = e.race_id AND r.status = 'finished'
       JOIN tracks t  ON t.id = r.track_id
       JOIN marbles m ON m.id = e.marble_id
      WHERE e.user_id = $1
      ORDER BY r.finished_at DESC
      LIMIT $2 OFFSET $3`,
    [id, limit, offset],
  );
  res.json({ races: rows, limit, offset });
});

/**
 * GET /api/users/:id/track-records — the player's bests on every track they
 * have raced, alongside the overall track record.
 */
router.get('/:id/track-records', async (req, res) => {
  const id = assertUuid(req.params.id);
  const { rows } = await db.query(
    `SELECT t.id AS track_id, t.slug, t.name AS track_name, t.difficulty,
            COUNT(e.id)::int AS races,
            COUNT(e.id) FILTER (WHERE e.finish_position = 1)::int AS wins,
            COUNT(e.id) FILTER (WHERE e.finish_position <= 3)::int AS podiums,
            MIN(e.finish_position) AS best_position,
            ROUND(AVG(e.finish_position)::numeric, 2) AS avg_position,
            MIN(e.finish_time_ms) AS best_time_ms,
            MIN(e.split_time_ms) AS best_split_ms,
            MAX(r.finished_at) AS last_raced_at,
            rec.record_ms AS track_record_ms,
            rec.record_split_ms AS track_record_split_ms
       FROM race_entries e
       JOIN races r  ON r.id = e.race_id AND r.status = 'finished'
       JOIN tracks t ON t.id = r.track_id
       CROSS JOIN LATERAL (
         SELECT MIN(x.finish_time_ms) AS record_ms, MIN(x.split_time_ms) AS record_split_ms
           FROM race_entries x JOIN races y ON y.id = x.race_id AND y.status = 'finished'
          WHERE y.track_id = t.id
       ) rec
      WHERE e.user_id = $1
      GROUP BY t.id, t.slug, t.name, t.difficulty, rec.record_ms, rec.record_split_ms
      ORDER BY races DESC, t.name`,
    [id],
  );
  res.json({ records: rows });
});

module.exports = router;
