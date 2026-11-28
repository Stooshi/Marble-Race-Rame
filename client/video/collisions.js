// The hits in a collision montage (Moses, 10 Nov 2026; DAILY-ORDER.md "Collision montage"): every marble
// hitting another and every marble hitting an obstacle (pegs, bumpers, flippers, splitter tips, blocks) in a
// stretch of a race, worked out from the race's own frames the way the game's own hit sounds are
// (../src/sound/hits.js), but for every marble in the shot rather than the player's own, and without the
// game's "at most one a second" (the montage clicks on each hit; soundTimes() keeps them from rattling).
// Used by scripts/collision-pick.js (picking the race and the moment) and by the recorder (the clicks'
// times in the finished shot). Looks and sound only: nothing here touches a race.
import { HIT, BUMP, NOT_OBSTACLES, obstacleHits } from '../src/sound/hits.js';

const tOf = (race, k) => race.frames[k].t ?? k * race.tickMs;

/** The frames' indexes from race time `from` to `to` (ms). */
function span(race, from, to) {
  let a = 0;
  while (a < race.frames.length - 1 && tOf(race, a + 1) <= from) a += 1;
  let b = a;
  while (b < race.frames.length - 1 && tOf(race, b) < to) b += 1;
  return [a, b];
}

/**
 * Marbles hitting each other from `from` to `to` (ms): a pair coming into touch at HIT.minSpeed or more
 * (closing), one of them in `own` (entry indexes) → [{ t, kind: 'hit', i, j, k }], t between the frames
 * where the gap closed (interpolated), k how hard (0 to 1, the game's own scale).
 */
export function marbleHits(race, { arc, room, own, from, to }) {
  const out = [];
  const touchAt = 2 * HIT.radius * HIT.touch;
  const mine = new Set(own);
  const [a, b] = span(race, from, to);
  const dist = (f, i, j) => Math.hypot((f.p[i] - f.p[j]) * arc, ((f.l?.[i] ?? 0) - (f.l?.[j] ?? 0)) * room);
  for (let n = Math.max(1, a); n <= b; n += 1) {
    const z = race.frames[n - 1];
    const f = race.frames[n];
    const t0 = tOf(race, n - 1);
    const t1 = tOf(race, n);
    const dt = t1 - t0;
    if (!(dt > 0) || dt > HIT.maxStepMs) continue;
    for (let i = 0; i < f.p.length; i += 1) {
      if (!(f.p[i] < 1)) continue;
      for (let j = i + 1; j < f.p.length; j += 1) {
        if (!(mine.has(i) || mine.has(j)) || !(f.p[j] < 1)) continue;
        if (Math.abs(f.p[j] - f.p[i]) * arc > 3 * touchAt) continue;
        const now = dist(f, i, j);
        const was = dist(z, i, j);
        if (now > touchAt || was <= touchAt) continue;
        const closing = ((was - now) / dt) * 1000;
        if (closing < HIT.minSpeed) continue;
        const t = t0 + dt * Math.min(1, Math.max(0, (was - touchAt) / (was - now)));
        if (t < from || t > to) continue;
        out.push({ t, kind: 'hit', i, j, k: Math.max(0.001, Math.min(1, (closing - HIT.minSpeed) / (HIT.fullSpeed - HIT.minSpeed))) });
      }
    }
  }
  return out;
}

/**
 * Marbles in `own` hitting an obstacle from `from` to `to` (ms), as the game's bump sound finds them
 * (obstacleHits: the obstacles' footprints `at(t)` as the physics has them, the race's own threshold, the
 * marble thrown off its way) → [{ t, kind: 'bump', i, k, type }]. The same marble on the same obstacle
 * within BUMP.freshMs is the same hit.
 */
export function bumpHits(race, { at, arc, room, own, from, to }) {
  const out = [];
  if (!at) return out;
  const [a, b] = span(race, from, to);
  const last = new Map();
  for (let n = Math.max(2, a); n <= b; n += 1) {
    for (const h of obstacleHits(race.frames[n - 2], race.frames[n - 1], race.frames[n], own, { at, arc, room })) {
      if (h.t < from || h.t > to || NOT_OBSTACLES.has(h.type)) continue;
      const key = `${h.i}:${h.type}`;
      const fresh = h.t - (last.get(key) ?? -Infinity) >= BUMP.freshMs;
      last.set(key, h.t);
      if (fresh) out.push({ t: h.t, kind: 'bump', i: h.i, k: h.k, type: h.type });
    }
  }
  return out;
}

/** The obstacles' footprints at race time t as copies (the scene's `solidsAt` reuses its objects). */
// (The splitter's tip: the game plays no sound on the divider, but a marble glancing off its tip is one of the
// montage's hits (Moses, 10 Nov 2026: "splitter tips"), so here it counts as an obstacle.)
export function footprintsOf(solidsAt) {
  return (t) => (solidsAt?.(t) ?? []).map((o) => ({ id: o.id, type: o.type === 'splitter' ? 'splitter-tip' : o.type, s: o.s, xa: o.xa, xb: o.xb, reach: o.reach, parked: o.type === 'bus' || Boolean(o.parked) }));
}

/**
 * The clicks to play, in the shot's own time (s): each hit at (t - from) / speed, the harder one kept when
 * two come closer than `gap` seconds of video (so a pile-up clicks, not rattles).
 */
export function soundTimes(hits, { from, speed = 1, gap = 0.11 }) {
  const all = hits.map((h) => ({ ...h, v: (h.t - from) / 1000 / speed })).sort((x, y) => x.v - y.v);
  const out = [];
  for (const h of all) {
    const prev = out[out.length - 1];
    if (prev && h.v - prev.v < gap) { if (h.k > prev.k) out[out.length - 1] = h; continue; }
    out.push(h);
  }
  return out;
}
