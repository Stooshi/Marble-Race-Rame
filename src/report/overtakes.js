'use strict';

/**
 * Racing overtakes (track recipe: at least 60 per race): two marbles at similar
 * speeds swapping places, from 5 s after the start. Read from the race's frames:
 * every quarter second, the field's order by distance down the track; a pair
 * that swaps counts once if they were within 4.5 m/s of each other when they
 * swapped (a marble flying past one stopped dead by an obstacle is not a race)
 * and the new order still holds a quarter second later (no flicker side by side).
 * Calibrated on 200 races of each of today's tracks to the recipe's figures
 * (Bobsleigh Run 60, San Francisco 79, Table Mountain Run 60): with these
 * settings the medians come out 64, 80 and 60.
 */
const FROM_MS = 5000;
const DEFAULTS = { stepMs: 250, similar: 4.5, holdMs: 250 };

function frameAt(frames, tickMs, t) {
  return frames[Math.min(frames.length - 1, Math.max(0, Math.round(t / tickMs)))];
}

function countOvertakes(sim, opts = {}) {
  const { stepMs, similar, holdMs } = { ...DEFAULTS, ...opts };
  const { frames, tickMs } = sim;
  const finished = (f, i) => f.p[i] >= 1;
  let count = 0;
  let leadChanges = 0;
  const end = frames[frames.length - 1].t;
  let prev = frameAt(frames, tickMs, FROM_MS - stepMs);
  let prevLeader = null;
  for (let t = FROM_MS; t <= end - holdMs; t += stepMs) {
    const f = frameAt(frames, tickMs, t);
    const later = frameAt(frames, tickMs, t + holdMs);
    const n = f.p.length;
    for (let i = 0; i < n; i += 1) {
      if (finished(f, i)) continue;
      for (let j = 0; j < n; j += 1) {
        if (i === j || finished(f, j)) continue;
        // i was behind j, is now ahead, and stays ahead: i overtook j.
        if (prev.p[i] < prev.p[j] && f.p[i] > f.p[j] && later.p[i] > later.p[j]
          && Math.abs(f.v[i] - f.v[j]) <= similar) count += 1;
      }
    }
    // Lead changes: the leader (of those still racing) changes and stays changed.
    let leader = 0;
    for (let i = 1; i < f.p.length; i += 1) if (f.p[i] > f.p[leader]) leader = i;
    let leaderLater = 0;
    for (let i = 1; i < later.p.length; i += 1) if (later.p[i] > later.p[leaderLater]) leaderLater = i;
    if (prevLeader !== null && leader !== prevLeader && leaderLater === leader && f.p[leader] < 1) leadChanges += 1;
    prevLeader = leader;
    prev = f;
  }
  return { overtakes: count, leadChanges };
}

module.exports = { countOvertakes, DEFAULTS, FROM_MS };
