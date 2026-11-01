/**
 * The back office's Players list: the last finished race of each player and the list's sorting.
 *
 * The list's server answer (GET /api/admin/players) has no last race (nor, before the server of
 * 1 Nov 2026, the first country), so the website reads it from
 * each player's details (GET /api/admin/players/:id, its 50 latest races), a few at a time. This
 * needs no server change (Moses, 1 Nov 2026: website only).
 */

/** When the player's latest finished race finished (ISO text), or null if they never finished one. */
export function lastFinishedRace(details) {
  let last = null;
  for (const r of details?.races?.recent ?? []) {
    if (r.finished_at && (!last || new Date(r.finished_at) > new Date(last))) last = r.finished_at;
  }
  return last;
}

/**
 * The player's first recorded country (first visit or sign-up), two letters, or null. The server
 * sends it as player.first_country; until the server with it is deployed, the oldest of the
 * security events the details list (their 50 latest), which is the first one for most players.
 * Only the stored country is used, never the IP address.
 */
export function firstCountry(details) {
  if (details?.player && 'first_country' in details.player) return details.player.first_country ?? null;
  const events = (details?.security?.events ?? []).filter((e) => e.country);
  if (!events.length) return null;
  return events.reduce((a, b) => (new Date(b.created_at) < new Date(a.created_at) ? b : a)).country;
}

/** The columns the list sorts by: what each compares. */
export const SORTS = {
  lastRace: (p) => (p.last_race_at ? new Date(p.last_race_at).getTime() : null),
  joined: (p) => (p.created_at ? new Date(p.created_at).getTime() : null),
  races: (p) => (p.races ?? null),
};

/**
 * The players sorted by `key` ('lastRace' | 'joined' | 'races'), newest/most first with dir 'desc'.
 * Players without a value (never finished a race, or not loaded yet) always go last. With no key,
 * the server's order (last login first). Ties keep the server's order.
 */
export function sortPlayers(players, key, dir = 'desc') {
  const get = SORTS[key];
  if (!get) return players;
  const sign = dir === 'asc' ? 1 : -1;
  return players
    .map((p, i) => ({ p, i, v: get(p) }))
    .sort((a, b) => {
      if (a.v === null && b.v === null) return a.i - b.i;
      if (a.v === null) return 1;
      if (b.v === null) return -1;
      return (a.v - b.v) * sign || a.i - b.i;
    })
    .map((x) => x.p);
}

/** Runs fn over items, at most `limit` at a time; calls onEach(item, result | undefined) as each one ends. */
export async function eachLimited(items, limit, fn, onEach) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next++];
      let result;
      try { result = await fn(item); } catch { result = undefined; }
      onEach(item, result);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}
