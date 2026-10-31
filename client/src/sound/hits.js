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
 * Read from the race's own events (`{ t, i, type: 'bounce', obstacle }`, which the stream carries on
 * its frames ahead of what is shown) and timed on the race clock: the sound plays when the race as shown
 * reaches the hit. How hard: the own marble's speed lost across it (from the frames, BUMP.before ms
 * before to BUMP.after ms after), silent under BUMP.minDrop, the loudest from BUMP.fullDrop. At most
 * one every BUMP.gapMs of race time. Scrubbing back or a jump in time starts afresh.
 */
export const BUMP = {
  minDrop: 1.5,     // m/s lost: below this, no sound (a graze)
  fullDrop: 8,      // m/s lost: the loudest
  before: 100,      // ms before the hit: its speed going in
  after: 150,       // ms after: its speed coming out
  gapMs: 1000,      // at most one a second
  late: 400,        // a hit already this far behind the race as shown is let go (never played late)
  keepMs: 15000,    // frames kept for the speeds (the view may be held back up to 12 s)
};
/** The event obstacles that make no bump: the ordinary track, other marbles, the divider, curtains. */
export const NOT_OBSTACLES = new Set(['wall', 'marble', 'splitter', 'jump_catch', 'icicles']);

export function createBumpDetector() {
  let pending = [];      // the own marbles' obstacle hits not yet reached, by time
  let frames = [];       // { t, v } as streamed (ahead of what is shown)
  let lastAt = -Infinity;
  let shownAt = null;
  const speedAt = (i, t) => {
    let best = null;
    for (const f of frames) if (Array.isArray(f.v) && Number.isFinite(f.v[i]) && (!best || Math.abs(f.t - t) < Math.abs(best.t - t))) best = f;
    return best && Math.abs(best.t - t) <= 120 ? best.v[i] : null;
  };
  return {
    /** A frame as it arrives (its `events`, and the speeds `v`); `own`: the player's marbles' indexes. */
    add(frame, own) {
      if (!frame || !Number.isFinite(frame.t)) return;
      if (frames.length && frame.t === frames[frames.length - 1].t) return; // (the same frame again)
      if (frames.length && frame.t < frames[frames.length - 1].t) { frames = []; pending = []; }
      frames.push({ t: frame.t, v: frame.v });
      while (frames.length > 2 && frames[0].t < frame.t - BUMP.keepMs) frames.shift();
      for (const e of frame.events ?? []) {
        if (e?.type !== 'bounce' || NOT_OBSTACLES.has(e.obstacle) || !(own ?? []).includes(e.i ?? e.index)) continue;
        pending.push({ t: e.t ?? e.time, i: e.i ?? e.index });
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
        const a = speedAt(h.i, h.t - BUMP.before);
        const b = speedAt(h.i, h.t + BUMP.after);
        if (a === null || b === null) continue;
        const drop = a - b;
        if (drop < BUMP.minDrop) continue;
        best = Math.max(best, Math.min(1, (drop - BUMP.minDrop) / (BUMP.fullDrop - BUMP.minDrop)) || 0.001);
      }
      pending = left;
      if (!best) return null;
      lastAt = t;
      return best;
    },
    reset() { pending = []; frames = []; lastAt = -Infinity; shownAt = null; },
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
