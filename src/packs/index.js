'use strict';

/**
 * Track packs (Moses, 11 Nov 2026; docs/04-game-rules.md "Track packs"). Every series has a free set
 * (tracks.is_free) and a pack with the rest (tracks.pack_key → track_packs): one pack per series, Pinball
 * and Arcade separate, Blocks as two packs (Blocks 1: the first fifteen, Blocks 2: Blocks Series 2).
 * A player owns a pack through a row in pack_owners (nothing grants one yet: no prices, no store products).
 *
 * Locking is behind the TRACK_PACKS switch on Railway, which stays OFF until Moses says go:
 *   off     (the default) nobody is locked out of any track: every track races as today;
 *   admins  pack tracks are locked for admins only (to try it out), as `on` for them;
 *   on      a pack track (pack_key set, is_free false) is raced only by the pack's owners, and by
 *           everyone in a friend room (or a league) whose host owns the pack, as with the season pass.
 * Only a pack that is on sale locks (Moses, 12 Nov 2026): one that is complete, with `fullAt` (20) live
 * tracks besides its free ones (client/src/shared/payments/trackPacks.json). The tracks of a Coming soon
 * pack stay open to everyone until it is complete.
 * The server checks this with the season check (src/seasons trackAccess) on every request that puts a
 * marble on a track. The public random pick never picks a locked pack track while locking is on.
 * Watching races and replays stays open to everyone. Season (holiday) tracks are in no pack.
 */

const MODES = ['off', 'admins', 'on'];

/** A pack is complete (on sale, so its tracks lock) at this many live tracks besides its free ones. */
const FULL_AT = require('../../client/src/shared/payments/trackPacks.json').fullAt;

/** SQL: the keys of the complete packs (as a subquery). */
const COMPLETE_PACKS_SQL = `SELECT pack_key FROM tracks WHERE is_active AND NOT is_free AND pack_key IS NOT NULL
  GROUP BY pack_key HAVING count(*) >= ${Number(FULL_AT)}`;

/** The keys of the complete packs: Set. */
async function completePacks(db) {
  const { rows } = await db.query(COMPLETE_PACKS_SQL);
  return new Set(rows.map((r) => r.pack_key));
}

/** The TRACK_PACKS switch: 'off' (default), 'admins' or 'on'. */
function mode(env = process.env) {
  const m = String(env.TRACK_PACKS ?? 'off').trim().toLowerCase();
  return MODES.includes(m) ? m : 'off';
}

/** Whether pack tracks are locked for this player (`role`: their role, null for nobody signed in). */
function lockingFor(role, env = process.env) {
  const m = mode(env);
  return m === 'on' || (m === 'admins' && role === 'admin');
}

/** Whether locking is on for anybody (the random pick for public races keeps to free tracks then). */
const lockingOn = (env = process.env) => mode(env) === 'on';

const LOCKED_MESSAGE = (pack) => `This track is in the ${pack.name} pack`;

/** The pack keys a player owns: Set. */
async function packsOf(db, userId) {
  if (!userId) return new Set();
  const { rows } = await db.query('SELECT pack_key FROM pack_owners WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
  return new Set(rows.map((r) => r.pack_key));
}

async function owns(db, userId, packKey) {
  if (!userId || !packKey) return false;
  const { rows } = await db.query('SELECT 1 FROM pack_owners WHERE user_id = $1 AND pack_key = $2 AND revoked_at IS NULL', [userId, packKey]);
  return Boolean(rows[0]);
}

async function roleOf(db, userId) {
  if (!userId) return null;
  const { rows } = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
  return rows[0]?.role ?? null;
}

/** The track's pack, from the row if it has it, else from the database: { key, name } or null. */
async function packOfTrack(db, track) {
  let key = track.pack_key;
  let free = track.is_free;
  if (key === undefined || free === undefined) {
    if (!track.slug && !track.id) return null;
    const { rows } = await db.query(
      `SELECT pack_key, is_free FROM tracks WHERE ${track.id ? 'id = $1' : 'slug = $1'}`,
      [track.id ?? track.slug],
    );
    if (!rows[0]) return null;
    ({ pack_key: key, is_free: free } = rows[0]);
  }
  if (!key || free) return null;
  const { rows } = await db.query('SELECT key, name FROM track_packs WHERE key = $1', [key]);
  return rows[0] ?? null;
}

/** The track's pack if it locks: a pack track (not free) of a complete pack → { key, name } or null. */
async function lockingPackOf(db, track) {
  const pack = await packOfTrack(db, track);
  if (!pack) return null;
  return (await completePacks(db)).has(pack.key) ? pack : null;
}

/**
 * May `userId` race on a pack track? (With the switch off: always, with no query at all.)
 * `roomHostId`: the host of the friend room (or the league's creator) the race is in; a host who owns
 * the pack opens its tracks to everyone racing with them.
 * → { ok: true [, viaHost] } or { ok: false, reason: 'pack', message, pack }.
 */
async function trackAccess(db, track, { userId = null, roomHostId = null, env = process.env } = {}) {
  const m = mode(env);
  if (m === 'off' || !track) return { ok: true };
  if (m === 'admins' && await roleOf(db, userId) !== 'admin') return { ok: true };
  const pack = await lockingPackOf(db, track); // (a Coming soon pack locks nothing)
  if (!pack) return { ok: true };
  if (await owns(db, userId, pack.key)) return { ok: true };
  if (roomHostId && roomHostId !== userId && await owns(db, roomHostId, pack.key)) return { ok: true, viaHost: true };
  return { ok: false, reason: 'pack', message: LOCKED_MESSAGE(pack), pack: pack.key };
}

/** SQL for "a track the public random pick may choose" while locking is on: free, in no pack, or in a pack not complete yet. */
const FREE_TRACK_SQL = (alias = '') => `(${alias}is_free OR ${alias}pack_key IS NULL OR ${alias}pack_key NOT IN (${COMPLETE_PACKS_SQL}))`;

/**
 * Each track's pack for the player asking (the track lists): pack { key, name, complete } on a pack track,
 * and locked: true when locking is on for them, the pack is complete (on sale) and they don't own it.
 * `rows` carry pack_key, is_free.
 */
async function withPacks(db, rows, { userId = null, role = null, env = process.env } = {}) {
  if (!rows.some((t) => t.pack_key)) return rows.map(({ pack_key: _k, ...t }) => t);
  const packs = new Map((await db.query('SELECT key, name FROM track_packs')).rows.map((p) => [p.key, p]));
  const locking = lockingFor(role, env);
  const held = locking ? await packsOf(db, userId) : new Set();
  const complete = await completePacks(db);
  return rows.map(({ pack_key: key, ...t }) => {
    const p = key ? packs.get(key) : null;
    if (!p) return t;
    const out = { ...t, pack: { key: p.key, name: p.name, complete: complete.has(p.key) } };
    if (locking && !t.is_free && complete.has(p.key) && !held.has(p.key) && !t.locked) out.locked = true;
    if (out.locked && !t.season) out.lockedBy = 'pack';
    return out;
  });
}

module.exports = { MODES, FULL_AT, COMPLETE_PACKS_SQL, completePacks, lockingPackOf, mode, lockingFor, lockingOn, packsOf, owns, packOfTrack, trackAccess, withPacks, FREE_TRACK_SQL, LOCKED_MESSAGE };
