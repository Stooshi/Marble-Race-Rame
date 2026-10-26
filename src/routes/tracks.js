'use strict';

const { computerPlayers } = require('../marbles/computerPlayers');
const express = require('express');
const db = require('../db');
const { requireAuth, optionalAuth, requireAdmin } = require('../middleware/auth');
const { validate, UUID_RE } = require('../utils/validate');
const { badRequest, notFound } = require('../utils/httpError');
const { OBSTACLE_EFFECTS } = require('../game/simulator');
const seasons = require('../seasons');

const router = express.Router();

const DIFFICULTIES = ['easy', 'medium', 'hard', 'extreme'];
const OBSTACLE_TYPES = Object.keys(OBSTACLE_EFFECTS);

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

function checkWaypoint(p) {
  if (!p || !isNum(p.x) || !isNum(p.y)) return 'waypoints must be objects like {"x": 0, "y": 0, "z": 0}';
  if (p.z !== undefined && !isNum(p.z)) return 'waypoint "z" (height) must be a number';
  return null;
}

function checkObstacle(o) {
  if (!o || !OBSTACLE_TYPES.includes(o.type)) return `obstacle type must be one of: ${OBSTACLE_TYPES.join(', ')}`;
  if (!isNum(o.at) || o.at < 0 || o.at > 1) return 'obstacle "at" must be a number between 0 and 1';
  if (o.span !== undefined && (!isNum(o.span) || o.span <= 0 || o.span > 0.5)) return 'obstacle "span" must be in (0, 0.5]';
  if (o.intensity !== undefined && (!isNum(o.intensity) || o.intensity < 0 || o.intensity > 1)) return 'obstacle "intensity" must be between 0 and 1';
  if (o.period !== undefined && (!isNum(o.period) || o.period < 1 || o.period > 120)) return 'obstacle "period" must be between 1 and 120 seconds';
  if (o.duty !== undefined && (!isNum(o.duty) || o.duty < 0 || o.duty > 1)) return 'obstacle "duty" must be between 0 and 1';
  if (o.phase !== undefined && !isNum(o.phase)) return 'obstacle "phase" must be a number';
  return null;
}

const trackSchema = {
  slug: { type: 'string', required: true, pattern: /^[a-z0-9-]{2,64}$/, patternMessage: 'must be lowercase letters, numbers and dashes' },
  name: { type: 'string', required: true, max: 80 },
  description: { type: 'string', max: 1000, nullable: true },
  difficulty: { type: 'enum', values: DIFFICULTIES },
  length_m: { type: 'number', required: true, min: 100, max: 5000 },
  lane_count: { type: 'int', min: 1, max: 20 },
  waypoints: { type: 'array', max: 500, items: checkWaypoint },
  obstacles: { type: 'array', max: 100, items: checkObstacle },
  thumbnail_url: { type: 'string', max: 500, nullable: true },
  is_active: { type: 'boolean' },
};

function toDbValues(body) {
  // jsonb parameters must be sent as JSON text.
  const out = { ...body };
  if (out.waypoints) out.waypoints = JSON.stringify(out.waypoints);
  if (out.obstacles) out.obstacles = JSON.stringify(out.obstacles);
  return out;
}

/**
 * Each track's season, for the player asking: season { key, name, state, featured } and locked (true:
 * a season track they can't race now; the picker shows it with a lock and "Get the pass"). Watching
 * its races and replays is open to everyone.
 */
async function withSeasons(rows, userId, now = new Date()) {
  if (!rows.some((t) => t.season_key)) return rows;
  const all = new Map((await seasons.all(db)).map((s) => [s.key, s]));
  const held = await seasons.passesOf(db, userId);
  return rows.map(({ season_key: key, ...t }) => {
    const s = key ? all.get(key) : null;
    if (!s) return t;
    const state = seasons.stateOf(s, now);
    return {
      ...t,
      season: { key: s.key, name: s.name, state, featured: seasons.featuredSlug(s, now) === t.slug },
      locked: state === 'before' || (state === 'on' && !held.has(s.key)),
    };
  });
}

/** GET /api/tracks?difficulty= (a season's tracks only from the season's start) */
router.get('/', optionalAuth, async (req, res) => {
  const q = validate(req.query, {
    difficulty: { type: 'enum', values: DIFFICULTIES },
    include_inactive: { type: 'boolean' },
  });
  const params = [];
  const where = [];
  if (!(q.include_inactive && req.user?.role === 'admin')) where.push('is_active');
  if (q.difficulty) { params.push(q.difficulty); where.push(`difficulty = $${params.length}`); }
  const { rows } = await db.query(
    `SELECT id, slug, name, description, difficulty, length_m, lane_count, thumbnail_url, is_active, waypoints,
            jsonb_array_length(obstacles) AS obstacle_count, physics IS NOT NULL AS new_physics, created_at,
            CASE WHEN physics->'kit' ? 'pinball' THEN 'Pinball'
                 WHEN physics->'kit' ? 'river' THEN 'Rivers'
                 WHEN physics->'kit' ? 'peak' THEN 'Peaks'
                 WHEN physics->'kit' ? 'arcade' THEN 'Arcade'
                 WHEN physics->'kit' ? 'canyon' THEN 'Canyons'
                 WHEN physics->'kit' ? 'block' THEN 'Blocks'
                 WHEN physics->'kit' ? 'athletics' THEN 'Track and Field'
                 WHEN physics->'kit' ? 'winterWonders' THEN 'Winter Wonders'
                 WHEN physics->'kit' ? 'coaster' THEN 'Coasters'
                 WHEN physics->'kit' ? 'grandPrix' THEN 'Grand Prix'
                 WHEN physics IS NOT NULL THEN 'World Tour'
                 ELSE 'Classic' END AS series,
            physics->'kit'->>'biome' AS biome, physics->'kit'->>'lighting' AS lighting, season_key
       FROM tracks ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY difficulty, name`,
    params,
  );
  // A season's tracks stay out of the list until the season starts (they may be switched on early:
  // nothing to deploy at midnight); they appear by themselves at its first minute. Admins see all.
  const all = q.include_inactive && req.user?.role === 'admin';
  const tracks = (await withSeasons(rows, req.user?.id ?? null)).filter((t) => all || t.season?.state !== 'before');
  res.json({ tracks });
});

/** GET /api/tracks/:idOrSlug — full track including geometry */
router.get('/:idOrSlug', optionalAuth, async (req, res) => {
  const key = req.params.idOrSlug;
  const column = UUID_RE.test(key) ? 'id' : 'slug';
  const { rows } = await db.query(`SELECT * FROM tracks WHERE ${column} = $1`, [key]);
  if (!rows[0]) throw notFound('Track not found');
  const { rows: stats } = await db.query(
    `SELECT (SELECT COUNT(*)::int FROM races WHERE track_id = $1 AND status = 'finished') AS races_finished,
            rec.finish_time_ms AS record_ms, rec.race_id AS record_race_id,
            rec.marble_name AS record_marble, rec.username AS record_holder, rec.entry_id AS record_entry_id, rec.is_bot AS record_is_bot,
            (SELECT MIN(e.split_time_ms) FROM race_entries e
               JOIN races r ON r.id = e.race_id AND r.status = 'finished'
              WHERE r.track_id = $1) AS best_split_ms
       FROM (SELECT 1) one
       LEFT JOIN LATERAL (
         SELECT e.finish_time_ms, e.race_id, m.name AS marble_name, u.username, e.id AS entry_id, e.is_bot
           FROM race_entries e
           JOIN races r ON r.id = e.race_id AND r.status = 'finished'
           JOIN marbles m ON m.id = e.marble_id
           LEFT JOIN users u ON u.id = e.user_id
          WHERE r.track_id = $1
          ORDER BY e.finish_time_ms ASC, r.finished_at ASC
          LIMIT 1
       ) rec ON true`,
    [rows[0].id],
  );
  // (A record held by a computer player shows its friendly name, as in the race itself.)
  const { record_entry_id: recordEntry, record_is_bot: recordBot, ...stat } = stats[0];
  if (recordBot) {
    const { rows: field } = await db.query(
      'SELECT e.id, e.is_bot, m.color_primary, m.color_secondary, m.pattern FROM race_entries e JOIN marbles m ON m.id = e.marble_id WHERE e.race_id = $1',
      [stat.record_race_id],
    );
    stat.record_marble = computerPlayers(stat.record_race_id, field).get(recordEntry)?.name ?? stat.record_marble;
    stat.record_computer = true;
  }
  const [track] = await withSeasons(rows, req.user?.id ?? null);
  res.json({ track, stats: stat });
});

/** POST /api/tracks (admin) */
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const body = toDbValues(validate(req.body, trackSchema));
  body.created_by = req.user.id;
  const columns = Object.keys(body);
  const { rows } = await db.query(
    `INSERT INTO tracks (${columns.join(', ')})
     VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})
     RETURNING *`,
    columns.map((c) => body[c]),
  );
  res.status(201).json({ track: rows[0] });
});

/** PATCH /api/tracks/:id (admin) */
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  if (!UUID_RE.test(req.params.id)) throw badRequest('id must be a UUID');
  const body = toDbValues(validate(req.body, trackSchema, { partial: true }));
  const columns = Object.keys(body);
  if (!columns.length) throw badRequest('No updatable fields supplied');
  const { rows } = await db.query(
    `UPDATE tracks SET ${columns.map((c, i) => `${c} = $${i + 2}`).join(', ')} WHERE id = $1 RETURNING *`,
    [req.params.id, ...columns.map((c) => body[c])],
  );
  if (!rows[0]) throw notFound('Track not found');
  res.json({ track: rows[0] });
});

/** DELETE /api/tracks/:id (admin) — soft delete */
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  if (!UUID_RE.test(req.params.id)) throw badRequest('id must be a UUID');
  const { rowCount } = await db.query('UPDATE tracks SET is_active = false WHERE id = $1', [req.params.id]);
  if (!rowCount) throw notFound('Track not found');
  res.status(204).end();
});

module.exports = router;
