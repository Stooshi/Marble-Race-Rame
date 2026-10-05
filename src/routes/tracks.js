'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth, optionalAuth, requireAdmin } = require('../middleware/auth');
const { validate, UUID_RE } = require('../utils/validate');
const { badRequest, notFound } = require('../utils/httpError');
const { OBSTACLE_EFFECTS } = require('../game/simulator');

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

/** GET /api/tracks?difficulty= */
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
            jsonb_array_length(obstacles) AS obstacle_count, created_at
       FROM tracks ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY difficulty, name`,
    params,
  );
  res.json({ tracks: rows });
});

/** GET /api/tracks/:idOrSlug — full track including geometry */
router.get('/:idOrSlug', async (req, res) => {
  const key = req.params.idOrSlug;
  const column = UUID_RE.test(key) ? 'id' : 'slug';
  const { rows } = await db.query(`SELECT * FROM tracks WHERE ${column} = $1`, [key]);
  if (!rows[0]) throw notFound('Track not found');
  const { rows: stats } = await db.query(
    `SELECT (SELECT COUNT(*)::int FROM races WHERE track_id = $1 AND status = 'finished') AS races_finished,
            rec.finish_time_ms AS record_ms, rec.race_id AS record_race_id,
            rec.marble_name AS record_marble, rec.username AS record_holder,
            (SELECT MIN(e.split_time_ms) FROM race_entries e
               JOIN races r ON r.id = e.race_id AND r.status = 'finished'
              WHERE r.track_id = $1) AS best_split_ms
       FROM (SELECT 1) one
       LEFT JOIN LATERAL (
         SELECT e.finish_time_ms, e.race_id, m.name AS marble_name, u.username
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
  res.json({ track: rows[0], stats: stats[0] });
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
