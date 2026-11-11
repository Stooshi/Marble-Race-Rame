'use strict';

/**
 * The data update for wildness and the track packs (Moses, 11 Nov 2026), from src/tracks/wildness.json
 * (scripts/wildness.js) and src/packs/list.js:
 *   node scripts/wildness-sql.js > docs/data_updates/<date>-wildness-and-track-packs.sql
 * Sets each live track's wildness_score and wildness, its pack and whether it is free; adds the packs.
 * Locks nothing: locking is the TRACK_PACKS switch (off). Safe to run again.
 */
const { tracks } = require('../src/tracks/wildness.json');
const { PACKS, packFor, isFree } = require('../src/packs/list');

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const lines = [
  '-- One-time data update: wildness and the track packs (Moses, 11 Nov 2026; scripts/wildness-sql.js).',
  '--',
  '-- Wildness: each live track\'s score (0-100) and level (easy 0-32, wild 33-46, extreme 47+), worked',
  '-- out by scripts/wildness.js from the track report\'s races (src/tracks/wildness.json). Luck, not skill.',
  '-- Track packs: one per series (Pinball and Arcade separate, Blocks as Blocks 1 and Blocks 2) and the',
  '-- free set (src/packs/list.js). Nothing is locked by this: locking is the TRACK_PACKS switch, off.',
  '-- No prices or store products (track_packs.product_id stays NULL). Season tracks are in no pack.',
  '',
  'BEGIN;',
  '',
  'INSERT INTO track_packs (key, name, series, sort) VALUES',
  PACKS.map((p, i) => `  (${q(p.key)}, ${q(p.name)}, ${q(p.series)}, ${i + 1})`).join(',\n'),
  'ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, series = EXCLUDED.series, sort = EXCLUDED.sort;',
  '',
  'UPDATE tracks t SET wildness_score = v.score, wildness = v.level, pack_key = v.pack, is_free = v.free',
  '  FROM (VALUES',
  tracks.map((t) => `    (${q(t.slug)}, ${t.score}, ${q(t.wildness)}, ${q(packFor(t.slug, t.series))}, ${isFree(t.slug)})`).join(',\n'),
  '  ) AS v(slug, score, level, pack, free)',
  ' WHERE t.slug = v.slug;',
  '',
  'COMMIT;',
  '',
  'SELECT p.name AS pack, count(t.*) FILTER (WHERE t.is_free) AS free, count(t.*) FILTER (WHERE NOT t.is_free) AS in_pack',
  '  FROM track_packs p LEFT JOIN tracks t ON t.pack_key = p.key GROUP BY p.name, p.sort ORDER BY p.sort;',
  'SELECT wildness, count(*) FROM tracks WHERE wildness IS NOT NULL GROUP BY wildness ORDER BY wildness;',
  '',
];
process.stdout.write(lines.join('\n'));
