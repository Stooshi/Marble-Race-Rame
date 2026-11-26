/**
 * The live standings' rows over the race (Moses, 25 Oct 2026: the player's own name highlighted): the
 * first `n`, and the viewer's own marble below them at its real place when it isn't among them.
 * → [{ index, pos (0-based place), own (shown below the first n) }]
 */
export function standingsRows(standings, mine = [], n = 5) {
  const rows = standings.slice(0, n).map((index, pos) => ({ index, pos, own: false }));
  for (const m of mine) {
    const pos = standings.indexOf(m);
    if (pos >= n) rows.push({ index: m, pos, own: true });
  }
  return rows;
}

/**
 * The standings appear at GO (Moses, 25 Oct 2026): before the gates open the order is only the
 * starting order, and a list of places 1–5 would look as if the race were already decided. `t` is the
 * race clock as shown (ms; negative during the countdown, null before there is any).
 */
export const standingsShown = (t) => Number.isFinite(t) && t >= 0;

/** The viewer's own gate (1-based, the entry's lane) for "Your gate: 13" during the countdown, or null. */
export function ownGate(entries, mine = []) {
  for (const m of mine) {
    const lane = entries?.[m]?.lane;
    if (Number.isInteger(lane)) return lane + 1;
  }
  return null;
}
