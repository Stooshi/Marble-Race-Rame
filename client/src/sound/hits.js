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
