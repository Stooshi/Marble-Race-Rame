'use strict';

const { createRng } = require('./rng');

/**
 * Deterministic marble race simulator.
 *
 * The whole race is computed up front from a seed. The server then streams the
 * resulting frames to clients in real time, so every player sees exactly the
 * same race and the outcome can never be influenced by a client.
 *
 * Pipeline:
 *   1. Integrate a simple 1-D physics model (speed along the track plus a
 *      lateral offset) at a fixed internal step until every marble finishes.
 *   2. Pick a total race duration in [minDurationMs, maxDurationMs] and scale
 *      the timeline so the last marble crosses the line exactly then. Each
 *      marble's halfway split time is recorded on the same timeline.
 *   3. Resample to the requested tick rate for streaming.
 *
 * Inputs never include wall-clock time or Math.random, so
 * simulateRace(sameInput) always returns identical output.
 */

const SIM_DT = 0.05;              // internal integration step, seconds
const BASE_SPEED = 10;            // m/s for a 50/50/50/50 marble on open track
const MAX_SIM_SECONDS = 600;      // safety net against a pathological track

// How each obstacle type affects a marble while it is inside the obstacle.
//  drag:     fraction of speed lost per second (scaled by intensity, reduced by handling)
//  bounce:   chance per second of a "bad bounce" (scaled by intensity, reduced by luck)
//  boost:    chance per second of a speed boost (scaled by intensity, increased by luck)
//  squeeze:  pull of the lateral position towards the centre line
//  passing:  for moving obstacles, the effect while the obstacle is in the way
//            (the base values then apply while it is clear)
const OBSTACLE_EFFECTS = {
  bumper:  { drag: 0.35, bounce: 1.4, boost: 0.2, squeeze: 0 },
  ramp:    { drag: -0.25, bounce: 0.3, boost: 1.0, squeeze: 0 },
  sand:    { drag: 0.9, bounce: 0.2, boost: 0.0, squeeze: 0 },
  spinner: { drag: 0.4, bounce: 1.8, boost: 0.6, squeeze: 0 },
  funnel:  { drag: 0.5, bounce: 0.8, boost: 0.1, squeeze: 3.0 },
  // A cable car crossing the street on a timetable. Between cars marbles just
  // bump over the rails; while a car is passing they are blocked and knocked
  // about. Timing comes from the obstacle: period (seconds of simulated time
  // between cars, default 10) and duty (share of each period a car blocks the
  // road, default 0.4). Where in its timetable the car is when the race starts
  // is drawn from the race seed, so every race times it differently.
  cable_car: {
    drag: 0.05, bounce: 0, boost: 0, squeeze: 0,
    passing: { drag: 1.2, bounce: 2.0, boost: 0, squeeze: 0 },
  },
};

const MOVING_DEFAULTS = { period: 10, duty: 0.4 };

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

function round(value, decimals) {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/** Derives an independent 32-bit sub-seed so separate concerns never share a stream. */
function subSeed(seed, salt) {
  let h = (seed ^ Math.imul(salt, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

function normaliseObstacles(obstacles, timetableRng) {
  return (Array.isArray(obstacles) ? obstacles : [])
    .filter((o) => o && OBSTACLE_EFFECTS[o.type] && Number.isFinite(o.at))
    .map((o) => ({
      type: o.type,
      start: clamp(o.at, 0, 1),
      end: clamp(o.at + (Number.isFinite(o.span) ? o.span : 0.03), 0, 1),
      intensity: clamp(Number.isFinite(o.intensity) ? o.intensity : 0.5, 0, 1),
      effect: OBSTACLE_EFFECTS[o.type],
      ...(OBSTACLE_EFFECTS[o.type].passing && {
        period: clamp(Number.isFinite(o.period) ? o.period : MOVING_DEFAULTS.period, 1, 120),
        duty: clamp(Number.isFinite(o.duty) ? o.duty : MOVING_DEFAULTS.duty, 0, 1),
        phase: timetableRng.next(), // fraction of a period, set below once period is known
      }),
    }))
    .map((o) => (o.period ? { ...o, phase: o.phase * o.period } : o))
    .sort((a, b) => a.start - b.start);
}

/**
 * @param {object} input
 * @param {number} input.seed                    32-bit unsigned integer
 * @param {object} input.track                   { length_m, lane_count, obstacles }
 * @param {Array}  input.entries                 [{ id, topSpeed, acceleration, handling, luck, lane }]
 *                                               in a stable order (index = marble index in frames)
 * @param {number} [input.tickRateHz=10]
 * @param {number} [input.minDurationMs=50000]
 * @param {number} [input.maxDurationMs=90000]
 */
function simulateRace({
  seed,
  track,
  entries,
  tickRateHz = 10,
  minDurationMs = 50_000,
  maxDurationMs = 90_000,
}) {
  if (!Number.isInteger(seed) || seed < 0) throw new Error('seed must be a non-negative integer');
  if (!Array.isArray(entries) || entries.length === 0) throw new Error('entries must be a non-empty array');

  const physicsRng = createRng(subSeed(seed, 1));
  const durationRng = createRng(subSeed(seed, 2));
  // Separate stream so moving obstacles never disturb the physics randomness.
  const timetableRng = createRng(subSeed(seed, 4));

  const length = Number(track.length_m) || 600;
  const laneCount = Math.max(1, Math.min(entries.length, Number(track.lane_count) || 4));
  const obstacles = normaliseObstacles(track.obstacles, timetableRng);

  // --- 1. physics ----------------------------------------------------------
  const marbles = entries.map((entry, index) => {
    const s = (v) => clamp(Number(v) || 50, 1, 100) / 100;
    const lane = Number.isInteger(entry.lane) ? entry.lane : index;
    return {
      index,
      topSpeed: BASE_SPEED * (0.88 + 0.24 * s(entry.topSpeed)),
      accel: 2.5 + 4 * s(entry.acceleration),
      handling: s(entry.handling),
      luck: s(entry.luck),
      form: 1,                 // slow-varying "momentum" multiplier
      speed: 0,
      distance: 0,
      // Spread starting lanes across [-1, 1]; marbles sharing a lane start
      // slightly further back, which the race quickly absorbs.
      lateral: laneCount === 1 ? 0 : -1 + (2 * (lane % laneCount)) / (laneCount - 1),
      startOffset: -Math.floor(lane / laneCount) * 0.8,
      splitAt: null,           // raw time the marble crossed the halfway point
      finishedAt: null,
      trace: [],               // flat [progress, lateral] pairs, one per SIM_DT
    };
  });
  for (const m of marbles) m.distance = m.startOffset;

  const rawEvents = [];
  let time = 0;
  let remaining = marbles.length;

  const record = (m) => m.trace.push(clamp(m.distance / length, 0, 1), m.lateral);
  marbles.forEach(record);

  while (remaining > 0) {
    if (time > MAX_SIM_SECONDS) throw new Error('Simulation did not converge');
    time += SIM_DT;

    for (const m of marbles) {
      if (m.finishedAt !== null) {
        record(m);
        continue;
      }

      // Ornstein–Uhlenbeck drift on form keeps races lively without huge gaps.
      m.form += 0.6 * (1 - m.form) * SIM_DT + 0.05 * physicsRng.gaussian() * Math.sqrt(SIM_DT);
      m.form = clamp(m.form, 0.85, 1.15);

      const progress = m.distance / length;
      let target = m.topSpeed * m.form;
      let squeeze = 0.4;

      for (const o of obstacles) {
        if (progress < o.start) break;
        if (progress > o.end) continue;
        // Moving obstacles switch to their "passing" effect on their timetable.
        const effect = o.period && ((time + o.phase) % o.period) < o.period * o.duty ? o.effect.passing : o.effect;
        const { drag, bounce, boost } = effect;
        const dragFactor = drag > 0 ? drag * (1 - 0.6 * m.handling) : drag;
        target *= 1 - clamp(dragFactor * o.intensity, -0.6, 0.9);
        squeeze += effect.squeeze * o.intensity;

        if (physicsRng.chance(bounce * o.intensity * (1.15 - 0.7 * m.luck) * SIM_DT)) {
          m.speed *= 0.45 + 0.3 * m.handling;
          m.lateral = clamp(m.lateral + physicsRng.range(-0.8, 0.8), -1, 1);
          rawEvents.push({ time, index: m.index, type: 'bounce', obstacle: o.type });
        }
        if (physicsRng.chance(boost * o.intensity * (0.5 + m.luck) * SIM_DT)) {
          m.speed = Math.min(m.speed * 1.35 + 1, m.topSpeed * 1.5);
          rawEvents.push({ time, index: m.index, type: 'boost', obstacle: o.type });
        }
      }

      // Rare open-track events: luck makes the good ones likelier.
      if (physicsRng.chance(0.02 * (1.2 - m.luck) * SIM_DT)) {
        m.speed *= 0.6;
        rawEvents.push({ time, index: m.index, type: 'stumble' });
      }

      // Approach target speed; recovering from a slow-down uses acceleration,
      // shedding excess speed is handled by drag.
      if (m.speed < target) m.speed = Math.min(target, m.speed + m.accel * SIM_DT);
      else m.speed = Math.max(target, m.speed - 3 * SIM_DT);

      m.lateral += (-squeeze * m.lateral + 0.6 * physicsRng.gaussian()) * SIM_DT;
      m.lateral = clamp(m.lateral, -1, 1);

      const before = m.distance;
      m.distance += m.speed * SIM_DT;

      const half = length / 2;
      if (m.splitAt === null && m.distance >= half) {
        m.splitAt = time - SIM_DT + ((half - before) / (m.distance - before)) * SIM_DT;
      }

      if (m.distance >= length) {
        // Interpolate the exact crossing time inside this step.
        const frac = (length - before) / (m.distance - before);
        m.finishedAt = time - SIM_DT + frac * SIM_DT;
        m.distance = length;
        remaining -= 1;
      }
      record(m);
    }
  }

  // --- 2. pick duration and scale -----------------------------------------
  const rawLast = Math.max(...marbles.map((m) => m.finishedAt));
  const durationMs = Math.min(maxDurationMs, Math.floor(durationRng.range(minDurationMs, maxDurationMs + 1)));
  const scale = durationMs / 1000 / rawLast; // seconds of race per raw second
  const rawSteps = marbles[0].trace.length / 2;

  // --- 3. results ----------------------------------------------------------
  const order = [...marbles].sort((a, b) => a.finishedAt - b.finishedAt || a.index - b.index);
  const results = order.map((m, i) => ({
    index: m.index,
    entryId: entries[m.index].id,
    position: i + 1,
    // Never let rounding push a finisher past the official race length.
    finishTimeMs: Math.min(durationMs, Math.max(1, Math.round(m.finishedAt * scale * 1000))),
    splitTimeMs: Math.max(1, Math.round(m.splitAt * scale * 1000)),
  }));
  // Rounding can collide identical times; positions stay strictly ordered.
  for (let i = 1; i < results.length; i += 1) {
    if (results[i].finishTimeMs <= results[i - 1].finishTimeMs) {
      results[i].finishTimeMs = results[i - 1].finishTimeMs + 1;
    }
  }

  // --- 4. resample frames --------------------------------------------------
  const tickMs = Math.round(1000 / tickRateHz);
  const frameCount = Math.ceil(durationMs / tickMs) + 1;

  function sample(m, raw) {
    const pos = clamp(raw / SIM_DT, 0, rawSteps - 1);
    const i0 = Math.floor(pos);
    const i1 = Math.min(rawSteps - 1, i0 + 1);
    const f = pos - i0;
    const p = m.trace[i0 * 2] + (m.trace[i1 * 2] - m.trace[i0 * 2]) * f;
    const l = m.trace[i0 * 2 + 1] + (m.trace[i1 * 2 + 1] - m.trace[i0 * 2 + 1]) * f;
    return [p, l];
  }

  const finishMsByIndex = new Map(results.map((r) => [r.index, r.finishTimeMs]));
  const frames = [];
  for (let k = 0; k < frameCount; k += 1) {
    const t = Math.min(k * tickMs, durationMs);
    const raw = t / 1000 / scale;
    const progress = [];
    const lateral = [];
    for (const m of marbles) {
      const done = t >= finishMsByIndex.get(m.index);
      const [p, l] = sample(m, raw);
      progress.push(done ? 1 : Math.min(round(p, 4), 0.9999));
      lateral.push(round(l, 3));
    }
    // Standings: finished marbles in finish order, then by progress.
    const standings = marbles
      .map((m) => m.index)
      .sort((a, b) => {
        const fa = finishMsByIndex.get(a);
        const fb = finishMsByIndex.get(b);
        const da = t >= fa;
        const db = t >= fb;
        if (da && db) return fa - fb;
        if (da !== db) return da ? -1 : 1;
        return progress[b] - progress[a] || a - b;
      });
    frames.push({ t, p: progress, l: lateral, s: standings });
  }

  const events = rawEvents
    .map((e) => ({ t: Math.round(e.time * scale * 1000), i: e.index, type: e.type, ...(e.obstacle && { obstacle: e.obstacle }) }))
    .filter((e) => e.t <= durationMs);

  return {
    seed,
    durationMs,
    tickMs,
    tickRateHz,
    marbleCount: marbles.length,
    results,
    frames,
    events,
  };
}

module.exports = { simulateRace, subSeed, OBSTACLE_EFFECTS };
