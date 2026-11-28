'use strict';

/**
 * Every player's own 4 starter marbles (Moses, 20 Oct 2026; replaced the 4 shared ones, Ruby,
 * Sapphire, Emerald and Topaz, which let only 4 new players into a race).
 *
 * - Made for each player when the account is made (guest or saved; for older players the first time
 *   they need them: ensure()), as their own rows in `marbles` (owner_id, starter_no 1–4, marble_code
 *   "ST" + the player's 5-character code + 1–4, e.g. STLVAS82). Plain glass from 12 clearly different
 *   colours (client/src/shared/marbles/starters.json): one one-colour marble and three half-and-half
 *   two-colour ones, all different. Each has its own Marble ID and certificate.
 * - In a race no two players show the same starter look: lineUp() gives each joining player their
 *   first starter whose look nobody in the race has; only when all 4 are shown already does an
 *   earlier player move to another of theirs (looks only, while the race waits in its lobby).
 * - LOOKS ONLY: a starter's stats are never read by a race (skill belongs to the player); race
 *   results and the race fingerprints don't change.
 */
const crypto = require('crypto');
const config = require('../../client/src/shared/marbles/starters.json');

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // (no 0/O, 1/I)
const PALETTE = config.palette.map(([name, hex]) => ({ name, hex }));

// OKLab distance between two colours (how different they look).
const lin = (c) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
function oklab(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function difference(a, b) { const p = oklab(a); const q = oklab(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); }

/** Every starter look: { pattern: 'solid' | 'half', colours: [{ name, hex }, …], name, key }. */
const LOOKS = (() => {
  const out = PALETTE.map((c) => ({ pattern: 'solid', colours: [c] }));
  for (let i = 0; i < PALETTE.length; i += 1) {
    for (let j = i + 1; j < PALETTE.length; j += 1) {
      if (difference(PALETTE[i].hex, PALETTE[j].hex) >= config.splitMin) out.push({ pattern: 'half', colours: [PALETTE[i], PALETTE[j]] });
    }
  }
  return out.map((l) => ({ ...l, name: l.colours.map((c) => c.name).join(' & '), key: lookKey(l.pattern, l.colours.map((c) => c.hex)) }));
})();

/** The same key for two marbles that look alike: pattern + colours (either order). */
function lookKey(pattern, colours) {
  return `${pattern === 'half' ? 'half' : 'solid'}:${colours.filter(Boolean).map((c) => c.toUpperCase()).sort().join('+')}`;
}
const keyOfRow = (m) => lookKey(m.pattern, [m.color_primary, m.color_secondary]);

const pick = (list) => list[crypto.randomInt(0, list.length)];

/** A new player's 4 looks: one one-colour, three two-colour, all different. */
function chooseLooks() {
  const solids = LOOKS.filter((l) => l.pattern === 'solid');
  const halves = LOOKS.filter((l) => l.pattern === 'half');
  const chosen = [pick(solids)];
  while (chosen.length < config.perPlayer.solid + config.perPlayer.half) {
    const l = pick(halves);
    if (!chosen.some((c) => c.key === l.key)) chosen.push(l);
  }
  return chosen;
}

const newCode = () => Array.from({ length: 5 }, () => CODE_CHARS[crypto.randomInt(0, CODE_CHARS.length)]).join('');

/** Makes a player's 4 starters (in the caller's transaction). → their rows. */
async function create(client, userId) {
  const looks = chooseLooks();
  for (let tries = 0; tries < 8; tries += 1) {
    const code = newCode();
    const { rows: clash } = await client.query('SELECT 1 FROM marbles WHERE marble_code LIKE $1 LIMIT 1', [`${config.idPrefix}${code}_`]);
    if (clash.length) continue;
    const { rows } = await client.query(
      `INSERT INTO marbles (slug, name, description, color_primary, color_secondary, pattern, rarity,
                            price_coins, is_starter, is_active, on_sale, owner_id, starter_no, marble_code)
       SELECT 'st-' || lower($2) || '-' || n, l.name, NULL, l.a, l.b, l.pattern, 'common', 0, true, true, false, $1, n, $3 || $2 || n
         FROM unnest($4::text[], $5::text[], $6::text[], $7::text[]) WITH ORDINALITY AS l(name, a, b, pattern, n)
       RETURNING *`,
      [userId, code, config.idPrefix, looks.map((l) => l.name), looks.map((l) => l.colours[0].hex), looks.map((l) => l.colours[1]?.hex ?? null), looks.map((l) => l.pattern)],
    );
    return rows.sort((a, b) => a.starter_no - b.starter_no);
  }
  throw new Error('Could not make a starter code');
}

/** A player's starters, made first if they have none yet (players from before 20 Oct 2026). */
async function ensure(client, userId) {
  const { rows } = await client.query('SELECT * FROM marbles WHERE owner_id = $1 AND is_starter ORDER BY starter_no', [userId]);
  if (rows.length) return rows;
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`starters:${userId}`]);
  const { rows: again } = await client.query('SELECT * FROM marbles WHERE owner_id = $1 AND is_starter ORDER BY starter_no', [userId]);
  if (again.length) return again;
  try {
    return await create(client, userId);
  } catch (err) {
    // (made at the same moment by another request outside a transaction: theirs stand)
    if (err.code !== '23505') throw err;
    return (await client.query('SELECT * FROM marbles WHERE owner_id = $1 AND is_starter ORDER BY starter_no', [userId])).rows;
  }
}

/**
 * The starter a joining player races with, so that no two players in the race show the same look.
 * `mine`: the player's starters in their order of preference. The race's other players showing a
 * starter (no collection Shooter: no race_entry_looks row) may be moved to their next starter. → {
 * marbleId, moves: [{ entryId, marbleId }] }. Never fails: if no way out exists (not seen in 20,000
 * simulated 20-player races), the player gets their first choice.
 */
async function lineUp(client, raceId, mine) {
  const { rows: others } = await client.query(
    `SELECT e.id AS entry_id, e.user_id, e.marble_id
       FROM race_entries e JOIN marbles m ON m.id = e.marble_id
      WHERE e.race_id = $1 AND e.user_id IS NOT NULL AND m.owner_id = e.user_id AND m.is_starter
        AND NOT EXISTS (SELECT 1 FROM race_entry_looks l WHERE l.entry_id = e.id)`,
    [raceId],
  );
  const { rows: theirs } = others.length
    ? await client.query('SELECT * FROM marbles WHERE owner_id = ANY($1::uuid[]) AND is_starter ORDER BY owner_id, starter_no', [others.map((o) => o.user_id)])
    : { rows: [] };
  // Players as nodes: their starters in order (an existing player keeps the one they have first).
  const players = others.map((o) => {
    const list = theirs.filter((m) => m.owner_id === o.user_id);
    const current = list.find((m) => m.id === o.marble_id);
    return { entryId: o.entry_id, current: o.marble_id, prefs: [current, ...list.filter((m) => m !== current)].filter(Boolean) };
  });
  const me = { entryId: null, current: null, prefs: mine };
  const all = [...players, me];
  const owner = new Map(); // look key → player
  const assigned = new Map(); // player → marble
  for (const p of players) { const m = p.prefs[0]; owner.set(keyOfRow(m), p); assigned.set(p, m); }
  const tryAssign = (p, seen) => {
    for (const m of p.prefs) {
      const k = keyOfRow(m);
      if (seen.has(k)) continue;
      seen.add(k);
      const holder = owner.get(k);
      if (!holder || (holder !== p && tryAssign(holder, seen))) {
        if (assigned.has(p)) { const old = keyOfRow(assigned.get(p)); if (owner.get(old) === p) owner.delete(old); }
        owner.set(k, p); assigned.set(p, m);
        return true;
      }
      if (holder === p) return true;
    }
    return false;
  };
  // The joining player takes their own next starter when their first is shown already (Moses's
  // rule); only when all 4 are, an earlier player moves to one of theirs.
  const free = mine.find((m) => !owner.has(keyOfRow(m)));
  if (free) return { marbleId: free.id, moves: [] };
  if (!tryAssign(me, new Set())) return { marbleId: mine[0].id, moves: [] };
  const moves = all.filter((p) => p !== me && assigned.get(p).id !== p.current).map((p) => ({ entryId: p.entryId, marbleId: assigned.get(p).id }));
  return { marbleId: assigned.get(me).id, moves };
}

module.exports = { LOOKS, PALETTE, lookKey, keyOfRow, chooseLooks, create, ensure, lineUp, difference, SHARED_BEFORE: config.sharedBefore };
