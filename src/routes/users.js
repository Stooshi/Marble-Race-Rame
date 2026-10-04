'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const config = require('../config');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { validate, assertUuid, pagination } = require('../utils/validate');
const { badRequest, notFound, unauthorized } = require('../utils/httpError');
const { PUBLIC_USER_COLUMNS } = require('./auth');

const router = express.Router();

const STATS_COLUMNS = 'races_played, wins, podiums, best_win_time_ms, avg_position, coins_won, best_split_ms, best_finish_time_ms';

async function getStats(userId) {
  const { rows } = await db.query(`SELECT ${STATS_COLUMNS} FROM user_stats WHERE user_id = $1`, [userId]);
  return rows[0] || null;
}

/** GET /api/users/me — full private profile with stats */
router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await db.query(`SELECT ${PUBLIC_USER_COLUMNS}, last_login_at FROM users WHERE id = $1`, [req.user.id]);
  res.json({ user: rows[0], stats: await getStats(req.user.id) });
});

/** PATCH /api/users/me — update profile; changing password requires current_password */
router.patch('/me', requireAuth, async (req, res) => {
  const body = validate(req.body, {
    display_name: { type: 'string', max: 40, nullable: true },
    avatar_url: { type: 'string', max: 500, pattern: /^https?:\/\//, patternMessage: 'must be an http(s) URL', nullable: true },
    email: { type: 'string', max: 254, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, patternMessage: 'must be a valid email' },
    password: { type: 'string', min: 8, max: 72, trim: false },
    current_password: { type: 'string', max: 72, trim: false },
  }, { partial: true });

  const sets = [];
  const params = [req.user.id];
  const set = (column, value) => { params.push(value); sets.push(`${column} = $${params.length}`); };

  if ('display_name' in body) set('display_name', body.display_name);
  if ('avatar_url' in body) set('avatar_url', body.avatar_url);

  if (body.password || body.email) {
    if (!body.current_password) throw badRequest('current_password is required to change email or password');
    const { rows } = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!(await bcrypt.compare(body.current_password, rows[0].password_hash))) {
      throw unauthorized('current_password is incorrect');
    }
    if (body.email) set('email', body.email.toLowerCase());
    if (body.password) set('password_hash', await bcrypt.hash(body.password, config.auth.bcryptRounds));
  }

  if (!sets.length) throw badRequest('No updatable fields supplied');
  const { rows } = await db.query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $1 RETURNING ${PUBLIC_USER_COLUMNS}`,
    params,
  );
  res.json({ user: rows[0] });
});

/** GET /api/users/me/marbles — the caller's collection (owned + free starters) */
router.get('/me/marbles', requireAuth, async (req, res) => {
  const { rows } = await db.query(
    `SELECT m.*, (um.user_id IS NOT NULL) AS owned, COALESCE(um.is_favorite, false) AS is_favorite, um.acquired_at
       FROM marbles m
       LEFT JOIN user_marbles um ON um.marble_id = m.id AND um.user_id = $1
      WHERE m.is_active AND (m.is_starter OR um.user_id IS NOT NULL)
      ORDER BY is_favorite DESC, m.rarity DESC, m.name`,
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
      WHERE m.id = $2 AND (m.is_starter OR EXISTS (SELECT 1 FROM user_marbles WHERE user_id = $1 AND marble_id = $2))
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
router.get('/:id', async (req, res) => {
  const id = assertUuid(req.params.id);
  const { rows } = await db.query(
    'SELECT id, username, display_name, avatar_url, created_at FROM users WHERE id = $1',
    [id],
  );
  if (!rows[0]) throw notFound('User not found');
  res.json({ user: rows[0], stats: await getStats(id) });
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
