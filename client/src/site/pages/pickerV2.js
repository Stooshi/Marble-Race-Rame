/**
 * The track picker's new order (Moses, 16 Nov 2026, preview at /preview/picker-v2): while pack tracks lock for the
 * player (TRACK_PACKS on for them), the tracks they can race come first (free tracks, packs they own, packs not yet
 * complete), then every locked track, mixed across the series rather than grouped, with a track-pack banner where
 * the locked tracks start, another 7 rows later, another 7 rows after that, and one at the very end (each for a
 * different complete pack the player doesn't own). With locking off nothing changes: these functions aren't used.
 */

/** The preview only: a track as the server would send it with TRACK_PACKS on for this player. */
export function asLocked(t, owned) {
  if (t.locked || t.is_free || !t.pack?.complete || owned.has(t.pack.key)) return t;
  return { ...t, locked: true, lockedBy: t.season ? undefined : 'pack' };
}

/**
 * Locked tracks mixed across their packs: one from each pack in turn (each pack's own tracks in `sort` order), so
 * no series sits in a block. Packs take turns in the order their first track comes in `sort`.
 */
export function mixLocked(locked, sort) {
  const byPack = new Map();
  for (const t of [...locked].sort(sort)) {
    const k = t.pack?.key ?? t.season?.key ?? 'other';
    if (!byPack.has(k)) byPack.set(k, []);
    byPack.get(k).push(t);
  }
  const queues = [...byPack.values()];
  const out = [];
  for (let round = 0; out.length < locked.length; round += 1) for (const q of queues) if (q[round]) out.push(q[round]);
  return out;
}

/** The picker's list: racable first (in `sort` order), then the locked ones mixed. */
export function orderTracks(tracks, sort) {
  const free = tracks.filter((t) => !t.locked).sort(sort);
  return { free, locked: mixLocked(tracks.filter((t) => t.locked), sort) };
}

export const BANNER_EVERY_ROWS = 7;

/**
 * Where the banners go among `count` locked cards in a grid of `cols` columns: before the first, after 7 rows,
 * after 14 rows, and after the last (`count`); at most `packs` banners, and never two with no row between them.
 * → indices into the locked list (a banner goes before the card at that index; `count` = after the last).
 */
export function bannerSlots(count, cols, packs) {
  if (!count || !packs) return [];
  const step = BANNER_EVERY_ROWS * Math.max(1, cols);
  const slots = [0, step, 2 * step].filter((i) => i < count);
  if (count - slots[slots.length - 1] >= Math.max(1, cols)) slots.push(count);
  return slots.slice(0, packs);
}

/**
 * The packs for the banners: complete packs the player doesn't own, each once. The pack of the first locked card
 * leads; the rest follow in the order their tracks first appear among the locked cards, then any others.
 */
export function bannerPacks(packs, locked) {
  const buyable = packs.filter((p) => p.complete && !p.owned);
  const seen = [];
  for (const t of locked) if (t.pack && !seen.includes(t.pack.key)) seen.push(t.pack.key);
  const rank = (p) => { const i = seen.indexOf(p.key); return i < 0 ? seen.length : i; };
  return buyable.map((p, i) => [p, i]).sort(([a, i], [b, j]) => rank(a) - rank(b) || i - j).map(([p]) => p);
}
