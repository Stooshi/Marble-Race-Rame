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
