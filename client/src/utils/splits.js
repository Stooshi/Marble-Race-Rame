export const HALFWAY = 0.5;

/**
 * Given two consecutive frames, returns the interpolated time at which each
 * marble crossed `mark` (keyed by marble index) for marbles that crossed it
 * between the frames. Marbles in `already` are skipped.
 *
 * A marble that was already past the mark when we first saw it (a late
 * joiner) gets `null`: its split is unknown until the official results.
 */
export function detectCrossings(prev, curr, already = {}, mark = HALFWAY) {
  const found = {};
  if (!curr) return found;
  curr.p.forEach((p, i) => {
    if (already[i] !== undefined || p < mark) return;
    const before = prev?.p[i];
    if (before === undefined || before >= mark) {
      found[i] = null;
      return;
    }
    const f = (mark - before) / (p - before || 1);
    found[i] = Math.round(prev.t + (curr.t - prev.t) * f);
  });
  return found;
}

/** Entry indexes ordered by split time (fastest first). */
export function splitOrder(splits) {
  return Object.entries(splits)
    .filter(([, t]) => t !== null && t !== undefined)
    .sort(([, a], [, b]) => a - b)
    .map(([i]) => Number(i));
}

/** Linear interpolation between two frames (progress, lateral, and height/speed when present), f in [0, 1]. */
export function lerpFrame(a, b, f) {
  if (!a) return b;
  if (!b) return a;
  return {
    t: a.t + (b.t - a.t) * f,
    p: b.p.map((p, i) => a.p[i] + (p - a.p[i]) * f),
    l: b.l.map((l, i) => a.l[i] + (l - a.l[i]) * f),
    ...(a.h && b.h && { h: b.h.map((h, i) => a.h[i] + (h - a.h[i]) * f) }),
    ...(a.v && b.v && { v: b.v.map((v, i) => a.v[i] + (v - a.v[i]) * f) }),
    ...(b.b && { b: f < 0.5 && a.b ? a.b : b.b }), // splitter channel: switches at the nearer frame
    s: b.s,
  };
}

/** Frame at an arbitrary time from a full frame list (used for replays). */
export function frameAtTime(frames, tickMs, t) {
  if (!frames.length) return null;
  const pos = Math.max(0, Math.min(frames.length - 1, t / tickMs));
  const i = Math.floor(pos);
  const j = Math.min(frames.length - 1, i + 1);
  // The final frame sits on the race end, which may not be a tick multiple.
  const span = frames[j].t - frames[i].t || 1;
  const f = Math.max(0, Math.min(1, (t - frames[i].t) / span));
  return lerpFrame(frames[i], frames[j], f);
}
