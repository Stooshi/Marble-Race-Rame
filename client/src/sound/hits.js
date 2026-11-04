/**
 * The player's own marble hitting another (Moses, 30 Oct 2026): worked out from the race's own frames,
 * shown on the race clock, never for other marbles' hits.
 *
 * The frames carry each marble's progress (p) and where it is across the channel (l, -1 to 1). Laid out
 * flat ("straightened", as the server keeps marbles apart), two marbles touch when their centres are
 * about two radii apart. A hit is the moment the own marble comes into touch with another, at a closing
 * speed of HIT.minSpeed or more (light rubbing and riding side by side make no sound); the harder it
 * closes, the louder (strength 0 to 1, full at HIT.fullSpeed). At most one every HIT.gapMs of race time.
 * Scrubbing back or a jump in time starts afresh.
 */
export const HIT = {
  radius: 0.55,     // metres (the marble's)
  touch: 1.1,       // centres within touch × 2 radii: touching
  minSpeed: 1.5,    // m/s closing: below this, no sound
  fullSpeed: 6,     // m/s closing: the loudest
  gapMs: 1000,      // at most one a second
  maxStepMs: 250,   // frames further apart than this: no speed measured
};

/** A detector for one race: `arc` (metres of track), `room` (metres across from the middle to a wall). */
export function createHitDetector({ arc, room }) {
  let prev = null;
  let lastAt = -Infinity;
  const touchAt = 2 * HIT.radius * HIT.touch;
  const dist = (f, a, b) => Math.hypot((f.p[a] - f.p[b]) * arc, ((f.l?.[a] ?? 0) - (f.l?.[b] ?? 0)) * room);
  return {
    /** The next frame (as shown) and the own marbles' indexes → a hit's strength (0 to 1) or null. */
    step(frame, own) {
      const before = prev;
      prev = frame;
      if (!before || !frame || !(frame.t >= 0)) return null;
      const dt = frame.t - before.t;
      if (dt <= 0 || dt > HIT.maxStepMs) { if (dt < 0) lastAt = -Infinity; return null; }
      if (frame.t - lastAt < HIT.gapMs) return null;
      let best = 0;
      for (const o of own ?? []) {
        if (!(frame.p[o] < 1) || !Number.isFinite(before.p[o])) continue;
        for (let j = 0; j < frame.p.length; j += 1) {
          if (j === o || !(frame.p[j] < 1) || !Number.isFinite(before.p[j])) continue;
          if (Math.abs(frame.p[j] - frame.p[o]) * arc > 3 * touchAt) continue;
          const now = dist(frame, o, j);
          if (now > touchAt) continue;
          const was = dist(before, o, j);
          if (was <= touchAt) continue; // (already touching: rubbing, no new hit)
          const closing = ((was - now) / dt) * 1000;
          if (closing < HIT.minSpeed) continue;
          best = Math.max(best, Math.min(1, (closing - HIT.minSpeed) / (HIT.fullSpeed - HIT.minSpeed)));
          if (best === 0) best = 0.001; // (just over the threshold: the softest)
        }
      }
      if (!best) return null;
      lastAt = frame.t;
      return best;
    },
    reset() { prev = null; lastAt = -Infinity; },
  };
}

/**
 * The player's own marble hitting an obstacle (Moses, 31 Oct 2026): pegs, slalom gates, paddles and
 * other moving obstacles, bumpers and blocks, parked pieces, pinball pieces. Never another marble's hit,
 * and never the ordinary track (its walls, rails or floor), the splitter's divider or a hanging curtain
 * (passed through, not hit).
 *
 * Worked out on this screen from the race's own frames (Moses, 4 Nov 2026: no longer from the race's
 * events, which carry at most one obstacle hit per marble every 3 s, about half of them), like the speed
 * pad: every streamed frame (20 a second, ahead of what is shown) is checked against the obstacles'
 * footprints as the physics has them (`solidsAt`, ../three/trackFeatures.js, the same the marbles are
 * drawn round). A hit is where the own marble's path from one frame, carried on at the speed it came in
 * with, would run into an obstacle before the next frame: the race's own rule for an obstacle hit (a
 * fresh hit coming into it at more than BUMP.minSpeed; any fresh touch of a parked piece). Played when
 * the race as shown reaches it, louder the harder it came in (full at BUMP.fullSpeed). At most one every
 * BUMP.gapMs of race time; never played late. Scrubbing back or a jump in time starts afresh.
 */
export const BUMP = {
  minSpeed: 4,      // m/s into the obstacle: the race's own threshold for an obstacle hit (src/game/physicsSimulator.js hitSolids)
  fullSpeed: 14,    // m/s into it: the loudest
  freshMs: 300,     // the same marble against an obstacle again within this: the same hit (as the race has it)
  steps: 16,        // points checked along each frame's carried-on path
  touch: 0.1,       // m: within reach plus this of an obstacle on the carried-on path: into it (the frames' rounding)
  deflect: 0.08,    // m: the next frame at least this far from where the marble would have been without the hit (it was thrown off)
  maxStepMs: 120,   // frames further apart than this: no hit measured (a frame dropped, a jump in time)
  gapMs: 1000,      // at most one a second
  late: 400,        // a hit already this far behind the race as shown is let go (never played late)
};
/** What makes no bump: the ordinary track, other marbles, the divider, curtains, and the loop (a track piece, not an obstacle). */
export const NOT_OBSTACLES = new Set(['wall', 'marble', 'splitter', 'jump_catch', 'icicles', 'loop']);
const PARKED = new Set(['bus']);

/** Where an obstacle's footprint is at one moment (its numbers copied: `solidsAt` reuses its objects). */
const footprints = (solidsAt, t) => (solidsAt?.(t) ?? []).map((o) => ({ id: o.id, type: o.type, s: o.s, xa: o.xa, xb: o.xb, reach: o.reach, parked: PARKED.has(o.type) || Boolean(o.parked) }));
/** Distance from (s, x) to a footprint at `s0` stretching xa..xb across, with the vector from it. */
const offset = (s, x, o, xa = o.xa, xb = o.xb) => {
  const ds = s - o.s;
  const dx = x - Math.max(xa, Math.min(xb, x));
  return { d: Math.hypot(ds, dx), ds, dx };
};

/**
 * The obstacle hits of the marbles `own` between frames a → b, given the frame before (z): → [{ t, i, k }]
 * (k: how hard, 0 to 1). `at(t)` gives the footprints at race time t.
 */
export function obstacleHits(z, a, b, own, { at, arc, room }) {
  const out = [];
  if (!z || !a || !b) return out;
  const dtA = a.t - z.t;
  const dtB = b.t - a.t;
  if (!(dtA > 0) || !(dtB > 0) || dtA > BUMP.maxStepMs || dtB > BUMP.maxStepMs) return out;
  let then = null;
  let now = null;
  for (const i of own ?? []) {
    const pz = z.p?.[i];
    const pa = a.p?.[i];
    if (!Number.isFinite(pz) || !Number.isFinite(pa) || !Number.isFinite(b.p?.[i]) || pa >= 1 || b.p[i] >= 1) continue;
    const sz = pz * arc;
    const sa = pa * arc;
    const xz = (z.l?.[i] ?? 0) * room;
    const xa = (a.l?.[i] ?? 0) * room;
    const vs = ((sa - sz) / dtA) * 1000; // m/s along, as it came in
    const vx = ((xa - xz) / dtA) * 1000; // m/s across
    if (!then) { then = at(z.t); now = at(a.t); }
    let best = null;
    now.forEach((o, k) => {
      if (NOT_OBSTACLES.has(o.type) || Math.abs(o.xa) > 1e3 || Math.abs(sa - o.s) > 8) return;
      const was = then[k];
      const ou = was && Math.abs(was.xa) < 1e3 ? ((o.xa - was.xa) / dtA) * 1000 : 0; // its own speed across
      if (offset(sa, xa, o).d < o.reach) return; // (already against it: not a fresh hit)
      for (let n = 1; n <= BUMP.steps; n += 1) {
        const u = (n / BUMP.steps) * (dtB / 1000);
        const s = sa + vs * u;
        const x = xa + vx * u;
        const q = offset(s, x, o, o.xa + ou * u, o.xb + ou * u);
        if (q.d >= o.reach + BUMP.touch) continue;
        const ns = q.d > 1e-6 ? q.ds / q.d : -1;
        const nx = q.d > 1e-6 ? q.dx / q.d : 0;
        const into = -(vs * ns + (vx - ou) * nx);
        if ((o.parked || into > BUMP.minSpeed) && (!best || u < best.u)) best = { u, into: Math.max(0, into), type: o.type };
        break;
      }
    });
    if (!best) continue;
    // Confirmed by the next frame: the marble was thrown off its way (a near miss carries straight on).
    const dev = Math.hypot(b.p[i] * arc - (sa + (vs * dtB) / 1000), (b.l?.[i] ?? 0) * room - (xa + (vx * dtB) / 1000));
    if (dev < BUMP.deflect) continue;
    out.push({ t: a.t + best.u * 1000, i, k: Math.max(0.001, Math.min(1, (best.into - BUMP.minSpeed) / (BUMP.fullSpeed - BUMP.minSpeed))), into: best.into, dev, type: best.type });
  }
  return out;
}

export function createBumpDetector({ solidsAt = null, arc = 0, room = 0 } = {}) {
  let track = solidsAt ? { at: (t) => footprints(solidsAt, t), arc, room } : null;
  let pending = [];      // the own marbles' obstacle hits not yet reached, by time
  let recent = [];       // the last three streamed frames
  const lastHit = new Map(); // marble → race time of its last hit (the race's "fresh hit")
  let lastAt = -Infinity;
  let shownAt = null;
  return {
    /** The track's obstacles, once the 3D view has them: `solidsAt(t)` and the race's metres. */
    setTrack({ solidsAt: at, arc: a, room: r }) { track = at ? { at: (t) => footprints(at, t), arc: a, room: r } : null; },
    hasTrack: () => Boolean(track),
    /** A frame as it arrives (streamed, ahead of what is shown); `own`: the player's marbles' indexes. */
    add(frame, own) {
      if (!frame || !Number.isFinite(frame.t)) return;
      const last = recent[recent.length - 1];
      if (last && frame.t === last.t) return; // (the same frame again)
      if (last && frame.t < last.t) { recent = []; pending = []; lastHit.clear(); }
      recent.push({ t: frame.t, p: frame.p, l: frame.l });
      if (recent.length > 3) recent.shift();
      if (!track || recent.length < 3 || frame.t < 0) return;
      for (const h of obstacleHits(recent[0], recent[1], recent[2], own, track)) {
        if (h.t - (lastHit.get(h.i) ?? -Infinity) < BUMP.freshMs) { lastHit.set(h.i, h.t); continue; }
        lastHit.set(h.i, h.t);
        pending.push(h);
      }
    },
    /** The race as shown is at `t` (ms) → a bump's strength (0 to 1) or null. */
    step(t) {
      if (!Number.isFinite(t)) return null;
      if (shownAt !== null && t < shownAt - 50) { lastAt = -Infinity; pending = pending.filter((h) => h.t > t); }
      shownAt = t;
      let best = 0;
      const left = [];
      for (const h of pending) {
        if (h.t > t) { left.push(h); continue; }
        if (t - h.t > BUMP.late || t - lastAt < BUMP.gapMs) continue;
        best = Math.max(best, h.k);
      }
      pending = left;
      if (!best) return null;
      lastAt = t;
      return best;
    },
    reset() { pending = []; recent = []; lastHit.clear(); lastAt = -Infinity; shownAt = null; },
  };
}

/**
 * The player's own marble passing over a speed pad (Moses, 4 Nov 2026: the old overtaking whoosh brought
 * back as the speed pad's sound). Worked out from the race's own frames on the race clock, never for other
 * marbles: the moment the own marble rolls onto a pad (its start, plus PAD.onto metres), inside the pad's
 * width, as the pads' flash does (../three/trackFeatures.js). (Not from the race's events: the stream keeps
 * only some of a marble's pad passes, the newsworthy ones.) Each pass counts once: a marble only crosses a
 * pad's start once per pass. At most one every PAD.gapMs of race time, so two pads close together don't
 * stack. Scrubbing back or a jump in time starts afresh.
 */
export const PAD = {
  onto: 1,          // metres onto the pad: rolled onto it
  gapMs: 800,       // at most one this often
  maxStepMs: 600,   // frames further apart than this: no crossing measured (a jump in time)
};
/** A track's speed pads (`physics.features` of type 'boost'), in the race's own metres. */
export function padsOf(features, { arc, room }) {
  return (features ?? []).filter((f) => f?.type === 'boost' && Number.isFinite(f.at)).map((f) => ({ s0: f.at * arc, x0: (f.l ?? 0) * room, half: f.halfWidth ?? 1.3 }));
}
export function createPadDetector({ pads, arc, room }) {
  let prev = null;
  let lastAt = -Infinity;
  return {
    /** The next frame (as shown) and the own marbles' indexes → whether one of them rolled onto a pad. */
    step(frame, own) {
      const before = prev;
      prev = frame;
      if (!pads?.length || !before || !frame || !(frame.t >= 0)) return false;
      const dt = frame.t - before.t;
      if (dt <= 0 || dt > PAD.maxStepMs) { if (dt < 0) lastAt = -Infinity; return false; }
      let onto = false;
      for (const o of own ?? []) {
        const p0 = before.p?.[o];
        const p1 = frame.p?.[o];
        if (!Number.isFinite(p0) || !Number.isFinite(p1) || p0 >= 1) continue;
        const s0 = p0 * arc;
        const s1 = p1 * arc;
        const x = (frame.l?.[o] ?? 0) * room;
        for (const pad of pads) if (s0 < pad.s0 + PAD.onto && s1 >= pad.s0 + PAD.onto && Math.abs(x - pad.x0) <= pad.half) onto = true;
      }
      if (!onto || frame.t - lastAt < PAD.gapMs) return false;
      lastAt = frame.t;
      return true;
    },
    reset() { prev = null; lastAt = -Infinity; },
  };
}

/**
 * The two hit sounds share one limit (Moses, 31 Oct 2026), so they never stack into a rattle: at most
 * one of either every HIT_GATE.anyMs of race time (each still at most one a second on its own).
 */
export const HIT_GATE = { anyMs: 500 };
export function createHitGate() {
  let lastAt = -Infinity;
  return {
    /** May a hit sound play at race time `t`? (If so, it counts.) */
    allow(t) {
      if (t < lastAt) lastAt = -Infinity; // (scrubbed back)
      if (t - lastAt < HIT_GATE.anyMs) return false;
      lastAt = t;
      return true;
    },
    reset() { lastAt = -Infinity; },
  };
}
