'use strict';

/**
 * Country records (Moses, 22 Oct 2026): on each live track, the fastest finishing time set by a player
 * of each country. Counted: finished races only (the races table: no previews), a player's own marble
 * (never a computer player), saved accounts only, with the country the player had when they joined the
 * race (race_entries.country, filled in at the start by a trigger; so a later change of country never
 * moves an old record, and records start from when a player chose their country). Deleted and
 * suspended players drop out. A tie goes to the earlier race.
 *
 *   byTrack(db, slug)      → { track: { slug, name }, records: [{ country, name, ms, userId, username, at }] } fastest first, or null
 *   byCountry(db, code)    → { country, name, records: [{ slug, track, ms, userId, username, at }] } by track name
 * Both cached for a minute (they're shown on public pages).
 */
const { nameOf, isCountry } = require('.');

const CACHE_MS = 60_000;
const cache = new Map();
async function cached(key, load) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 2000) cache.delete(cache.keys().next().value);
  return value;
}

// Live tracks: switched on, and a season's tracks only once the season has started.
const LIVE = `t.is_active AND (t.season_key IS NULL OR EXISTS (SELECT 1 FROM seasons s WHERE s.key = t.season_key AND s.starts_at <= now()))`;
const COUNTED = `e.country IS NOT NULL AND NOT e.is_bot AND e.finish_time_ms IS NOT NULL
                 AND u.deleted_at IS NULL AND u.suspended_at IS NULL AND NOT u.is_guest`;

async function byTrack(db, slug) {
  return cached(`t:${slug}`, async () => {
    const { rows: [track] } = await db.query(`SELECT t.id, t.slug, t.name FROM tracks t WHERE t.slug = $1 AND ${LIVE}`, [slug]);
    if (!track) return null;
    const { rows } = await db.query(
      `SELECT * FROM (
         SELECT DISTINCT ON (e.country) e.country, e.finish_time_ms AS ms, u.id AS user_id, u.username, r.finished_at AS at
           FROM race_entries e
           JOIN races r ON r.id = e.race_id AND r.status = 'finished'
           JOIN users u ON u.id = e.user_id
          WHERE r.track_id = $1 AND ${COUNTED}
          ORDER BY e.country, e.finish_time_ms, r.finished_at
       ) best ORDER BY ms, at`,
      [track.id],
    );
    return {
      track: { slug: track.slug, name: track.name },
      records: rows.map((r) => ({ country: r.country, name: nameOf(r.country), ms: r.ms, userId: r.user_id, username: r.username, at: r.at })),
    };
  });
}

async function byCountry(db, code) {
  if (!isCountry(code)) return null;
  return cached(`c:${code}`, async () => {
    const { rows } = await db.query(
      `SELECT * FROM (
         SELECT DISTINCT ON (t.id) t.slug, t.name AS track, e.finish_time_ms AS ms, u.id AS user_id, u.username, r.finished_at AS at
           FROM race_entries e
           JOIN races r ON r.id = e.race_id AND r.status = 'finished'
           JOIN tracks t ON t.id = r.track_id AND ${LIVE}
           JOIN users u ON u.id = e.user_id
          WHERE e.country = $1 AND ${COUNTED}
          ORDER BY t.id, e.finish_time_ms, r.finished_at
       ) best ORDER BY track`,
      [code],
    );
    return { country: code, name: nameOf(code), records: rows.map((r) => ({ slug: r.slug, track: r.track, ms: r.ms, userId: r.user_id, username: r.username, at: r.at })) };
  });
}

/** (tests) */
function clearCache() { cache.clear(); }

module.exports = { byTrack, byCountry, clearCache };
