/**
 * The stretch of a race where the field is tightest: the landing page loops
 * it. Scores each `length` ms window (stepping a second) by how spread out
 * the 20 marbles are (leader's progress minus last place's), summed, and
 * returns the tightest { from, to } in race ms. Plain data, no DOM.
 */
export function tightestWindow(frames, tickMs, { length = 14000, skip = 8000 } = {}) {
  if (!frames?.length) return { from: 0, to: length };
  const end = frames[frames.length - 1].t;
  const spreadAt = (t) => {
    const f = frames[Math.min(frames.length - 1, Math.max(0, Math.round(t / tickMs)))];
    if (f.p.some((p) => p >= 1)) return Infinity; // someone has finished: past the pack
    return Math.max(...f.p) - Math.min(...f.p);
  };
  let best = { from: skip, to: Math.min(end, skip + length), score: Infinity };
  for (let from = skip; from + length <= end; from += 1000) {
    let sum = 0;
    for (let t = from; t <= from + length; t += 1000) sum += spreadAt(t);
    if (sum < best.score) best = { from, to: from + length, score: sum };
  }
  return { from: best.from, to: best.to };
}

/** Places at a frame: entry indexes, leader first. */
export function orderAt(frame) {
  if (!frame) return [];
  return frame.p.map((p, i) => [p, i]).sort((a, b) => b[0] - a[0]).map(([, i]) => i);
}
