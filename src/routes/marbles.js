'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth, optionalAuth, requireAdmin } = require('../middleware/auth');
const { validate, assertUuid } = require('../utils/validate');
const { badRequest, conflict, notFound } = require('../utils/httpError');

const router = express.Router();

const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const COLOR = { type: 'string', pattern: /^#[0-9A-Fa-f]{6}$/, patternMessage: 'must be a hex colour like #AABBCC' };
const STAT = { type: 'int', min: 1, max: 100 };

const marbleSchema = {
  slug: { type: 'string', required: true, pattern: /^[a-z0-9-]{2,64}$/, patternMessage: 'must be lowercase letters, numbers and dashes' },
  name: { type: 'string', required: true, max: 60 },
  description: { type: 'string', max: 500, nullable: true },
  color_primary: { ...COLOR, required: true },
  color_secondary: { ...COLOR, nullable: true },
  pattern: { type: 'string', max: 24 },
  rarity: { type: 'enum', values: RARITIES },
  top_speed: STAT,
  acceleration: STAT,
  handling: STAT,
  luck: STAT,
  price_coins: { type: 'int', min: 0 },
  is_starter: { type: 'boolean' },
  is_active: { type: 'boolean' },
};

/** GET /api/marbles?rarity=&include_inactive=  (adds `owned` when authenticated) */
router.get('/', optionalAuth, async (req, res) => {
  const q = validate(req.query, {
    rarity: { type: 'enum', values: RARITIES },
    include_inactive: { type: 'boolean' },
  });
  const params = [req.user?.id ?? null];
  const where = [];
  if (!(q.include_inactive && req.user?.role === 'admin')) where.push('m.is_active');
  if (q.rarity) { params.push(q.rarity); where.push(`m.rarity = $${params.length}`); }

  const { rows } = await db.query(
    `SELECT m.*,
            CASE WHEN $1::uuid IS NULL THEN NULL
                 ELSE m.is_starter OR EXISTS (SELECT 1 FROM user_marbles um WHERE um.user_id = $1 AND um.marble_id = m.id)
            END AS owned
       FROM marbles m
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY m.rarity, m.price_coins, m.name`,
    params,
  );
  res.json({ marbles: rows });
});

/** GET /api/marbles/:id — marble with lifetime race stats */
router.get('/:id', async (req, res) => {
  const id = assertUuid(req.params.id);
  const { rows } = await db.query(
    `SELECT m.*, s.races_run, s.wins, s.avg_position
       FROM marbles m JOIN marble_stats s ON s.marble_id = m.id
      WHERE m.id = $1`,
    [id],
  );
  if (!rows[0]) throw notFound('Marble not found');
  res.json({ marble: rows[0] });
});

/** POST /api/marbles/:id/purchase — buy a marble with coins */
router.post('/:id/purchase', requireAuth, async (req, res) => {
  const id = assertUuid(req.params.id);
  const result = await db.withTransaction(async (client) => {
    const { rows } = await client.query('SELECT * FROM marbles WHERE id = $1 AND is_active', [id]);
    const marble = rows[0];
    if (!marble) throw notFound('Marble not found');
    if (marble.is_starter) throw badRequest('Starter marbles are free for everyone');

    const owned = await client.query('SELECT 1 FROM user_marbles WHERE user_id = $1 AND marble_id = $2', [req.user.id, id]);
    if (owned.rowCount) throw conflict('You already own this marble');

    const paid = await client.query(
      'UPDATE users SET coins = coins - $2 WHERE id = $1 AND coins >= $2 RETURNING coins',
      [req.user.id, marble.price_coins],
    );
    if (!paid.rowCount) throw badRequest('Not enough coins');

    await client.query('INSERT INTO user_marbles (user_id, marble_id) VALUES ($1, $2)', [req.user.id, id]);
    return { marble, coins: paid.rows[0].coins };
  });
  res.status(201).json(result);
});

/** POST /api/marbles (admin) */
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const body = validate(req.body, marbleSchema);
  const columns = Object.keys(body);
  const { rows } = await db.query(
    `INSERT INTO marbles (${columns.join(', ')})
     VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})
     RETURNING *`,
    columns.map((c) => body[c]),
  );
  res.status(201).json({ marble: rows[0] });
});

/** PATCH /api/marbles/:id (admin) — stat changes never affect already-decided races */
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = assertUuid(req.params.id);
  const body = validate(req.body, marbleSchema, { partial: true });
  const columns = Object.keys(body);
  if (!columns.length) throw badRequest('No updatable fields supplied');
  const { rows } = await db.query(
    `UPDATE marbles SET ${columns.map((c, i) => `${c} = $${i + 2}`).join(', ')} WHERE id = $1 RETURNING *`,
    [id, ...columns.map((c) => body[c])],
  );
  if (!rows[0]) throw notFound('Marble not found');
  res.json({ marble: rows[0] });
});

/** DELETE /api/marbles/:id (admin) — soft delete so race history stays intact */
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = assertUuid(req.params.id);
  const { rowCount } = await db.query('UPDATE marbles SET is_active = false WHERE id = $1', [id]);
  if (!rowCount) throw notFound('Marble not found');
  res.status(204).end();
});

module.exports = router;
