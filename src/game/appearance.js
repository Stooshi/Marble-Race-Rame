'use strict';

/**
 * Players' cosmetic marble looks (colour, surface, effect).
 *
 * Purely cosmetic: nothing here is read by the race engine, and a look never
 * changes how a marble moves. The curated options live in the marble_colors,
 * marble_surfaces and marble_effects tables (docs/database_schema.sql).
 */

const db = require('../db');
const { badRequest } = require('../utils/httpError');

const OPTION_TABLES = { color: 'marble_colors', surface: 'marble_surfaces', effect: 'marble_effects' };

/** Active curated options, in display order. */
async function getOptions(client = db) {
  const [colors, surfaces, effects] = await Promise.all([
    client.query('SELECT key, name, hex FROM marble_colors WHERE is_active ORDER BY sort_order, key'),
    client.query('SELECT key, name, description FROM marble_surfaces WHERE is_active ORDER BY sort_order, key'),
    client.query('SELECT key, name, description FROM marble_effects WHERE is_active ORDER BY sort_order, key'),
  ]);
  return { colors: colors.rows, surfaces: surfaces.rows, effects: effects.rows };
}

/** Gives the user a starting look (solid, no effect, colour from their id) if they have none. */
async function ensureAppearance(userId, client = db) {
  await client.query(
    `INSERT INTO marble_appearances (user_id, color_key)
     VALUES ($1, default_marble_color($1))
     ON CONFLICT (user_id) DO NOTHING`,
    [userId],
  );
}

/** The user's look, with the display names of each option. */
async function getAppearance(userId, client = db) {
  await ensureAppearance(userId, client);
  const { rows } = await client.query(
    `SELECT a.color_key, c.name AS color_name, c.hex,
            a.surface_key, s.name AS surface_name,
            a.effect_key, e.name AS effect_name,
            a.label, u.username, a.updated_at
       FROM marble_appearances a
       JOIN users u            ON u.id = a.user_id
       JOIN marble_colors c    ON c.key = a.color_key
       JOIN marble_surfaces s  ON s.key = a.surface_key
       JOIN marble_effects e   ON e.key = a.effect_key
      WHERE a.user_id = $1`,
    [userId],
  );
  const r = rows[0];
  return {
    color: { key: r.color_key, name: r.color_name, hex: r.hex },
    surface: { key: r.surface_key, name: r.surface_name },
    effect: { key: r.effect_key, name: r.effect_name },
    label: r.label,
    // What to show above the marble: custom labels are not enabled yet.
    displayLabel: r.label || r.username,
    updatedAt: r.updated_at,
  };
}

/**
 * Updates any of { color, surface, effect } (curated keys). Rejects keys that
 * are unknown or retired, and any attempt to set a custom label.
 */
async function updateAppearance(userId, changes) {
  if (changes.label !== undefined) {
    throw badRequest('Custom labels are not available yet; your username is shown above your marble');
  }
  const fields = Object.keys(OPTION_TABLES).filter((f) => changes[f] !== undefined);
  if (!fields.length) throw badRequest('Provide at least one of: color, surface, effect');

  const errors = {};
  for (const field of fields) {
    const table = OPTION_TABLES[field];
    // Table names come from the fixed map above, never from input.
    const { rows } = await db.query(`SELECT key FROM ${table} WHERE is_active ORDER BY sort_order, key`);
    const allowed = rows.map((r) => r.key);
    if (!allowed.includes(changes[field])) errors[field] = `must be one of: ${allowed.join(', ')}`;
  }
  if (Object.keys(errors).length) throw badRequest('Invalid appearance', errors);

  await ensureAppearance(userId);
  const sets = fields.map((f, i) => `${f}_key = $${i + 2}`);
  await db.query(`UPDATE marble_appearances SET ${sets.join(', ')} WHERE user_id = $1`, [userId, ...fields.map((f) => changes[f])]);
  return getAppearance(userId);
}

module.exports = { getOptions, ensureAppearance, getAppearance, updateAppearance };
