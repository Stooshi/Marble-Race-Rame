'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { simulateRace } = require('../src/game/simulator');

const track = {
  length_m: 750,
  lane_count: 5,
  obstacles: [
    { type: 'ramp', at: 0.1, span: 0.05, intensity: 0.6 },
    { type: 'funnel', at: 0.3, span: 0.04, intensity: 0.6 },
    { type: 'bumper', at: 0.48, span: 0.05, intensity: 0.5 },
    { type: 'spinner', at: 0.66, span: 0.04, intensity: 0.6 },
    { type: 'sand', at: 0.86, span: 0.04, intensity: 0.5 },
  ],
};

function entries(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `entry-${i}`, lane: i, topSpeed: 40 + (i % 7) * 5, acceleration: 50, handling: 45 + (i % 3) * 10, luck: 50,
  }));
}

test('same seed produces an identical race', () => {
  const a = simulateRace({ seed: 1234, track, entries: entries(15) });
  const b = simulateRace({ seed: 1234, track, entries: entries(15) });
  assert.deepEqual(a, b);
});

test('different seeds produce different races', () => {
  const a = simulateRace({ seed: 1, track, entries: entries(15) });
  const b = simulateRace({ seed: 2, track, entries: entries(15) });
  assert.notDeepEqual(a.results, b.results);
});

test('every race lasts 50-90 seconds for 10 to 20 marbles', () => {
  for (let seed = 0; seed < 40; seed += 1) {
    const n = 10 + (seed % 11);
    const sim = simulateRace({ seed: seed * 7919, track, entries: entries(n) });
    assert.ok(sim.durationMs >= 50_000 && sim.durationMs <= 90_000, `duration ${sim.durationMs}`);
    assert.equal(sim.results.length, n);
    assert.equal(sim.results.at(-1).finishTimeMs, sim.durationMs, 'last marble finishes at the race end');
  }
});

test('results have unique, ordered positions and times', () => {
  const sim = simulateRace({ seed: 99, track, entries: entries(20) });
  sim.results.forEach((r, i) => {
    assert.equal(r.position, i + 1);
    if (i > 0) assert.ok(r.finishTimeMs > sim.results[i - 1].finishTimeMs);
  });
  assert.equal(new Set(sim.results.map((r) => r.entryId)).size, 20);
});

test('frames cover the race and agree with the results', () => {
  const sim = simulateRace({ seed: 5, track, entries: entries(12), tickRateHz: 10 });
  assert.equal(sim.tickMs, 100);
  assert.equal(sim.frames[0].t, 0);
  const last = sim.frames.at(-1);
  assert.equal(last.t, sim.durationMs);
  assert.ok(last.p.every((p) => p === 1), 'everyone has finished in the final frame');
  assert.deepEqual(last.s, sim.results.map((r) => r.index), 'final standings match results');

  // Progress never goes backwards and stays within bounds.
  for (let m = 0; m < 12; m += 1) {
    for (let k = 1; k < sim.frames.length; k += 1) {
      assert.ok(sim.frames[k].p[m] >= sim.frames[k - 1].p[m] - 1e-9);
      assert.ok(Math.abs(sim.frames[k].l[m]) <= 1);
    }
  }
  // A marble is shown as finished exactly from its finish time onwards.
  const winner = sim.results[0];
  const firstDone = sim.frames.find((f) => f.p[winner.index] === 1);
  assert.ok(firstDone.t >= winner.finishTimeMs && firstDone.t - winner.finishTimeMs < sim.tickMs);
});

test('better stats win more often', () => {
  const field = entries(10).map((e) => ({ ...e, topSpeed: 50, acceleration: 50, handling: 50, luck: 50 }));
  field[0] = { ...field[0], topSpeed: 90, acceleration: 80, handling: 80, luck: 80 };
  let wins = 0;
  for (let seed = 0; seed < 30; seed += 1) {
    if (simulateRace({ seed, track, entries: field }).results[0].index === 0) wins += 1;
  }
  assert.ok(wins > 3, `strong marble won ${wins}/30`);
});

test('fixed-length races last exactly the configured duration', () => {
  for (let seed = 0; seed < 20; seed += 1) {
    const sim = simulateRace({ seed, track, entries: entries(20), minDurationMs: 90_000, maxDurationMs: 90_000 });
    assert.equal(sim.durationMs, 90_000);
    assert.equal(sim.results.at(-1).finishTimeMs, 90_000);
  }
});

test('halfway split times are recorded and agree with the frames', () => {
  const sim = simulateRace({ seed: 77, track, entries: entries(20), minDurationMs: 90_000, maxDurationMs: 90_000 });
  for (const r of sim.results) {
    assert.ok(r.splitTimeMs > 0 && r.splitTimeMs < r.finishTimeMs, `split ${r.splitTimeMs} < finish ${r.finishTimeMs}`);
    // The frame just before the split is short of halfway; the one after is past it.
    const before = sim.frames[Math.floor(r.splitTimeMs / sim.tickMs)];
    const after = sim.frames[Math.ceil(r.splitTimeMs / sim.tickMs)];
    assert.ok(before.p[r.index] <= 0.5 + 1e-3, `before ${before.p[r.index]}`);
    assert.ok(after.p[r.index] >= 0.5 - 1e-3, `after ${after.p[r.index]}`);
  }
});

const crossing = (duty) => ({
  length_m: 600, lane_count: 5,
  obstacles: [{ type: 'cable_car', at: 0.5, span: 0.05, intensity: 0.9, period: 12, duty }],
});

test('the cable car only catches marbles while a car is passing', () => {
  const never = simulateRace({ seed: 5, track: crossing(0), entries: entries(20) });
  const always = simulateRace({ seed: 5, track: crossing(1), entries: entries(20) });
  assert.equal(never.events.filter((e) => e.obstacle === 'cable_car').length, 0);
  assert.ok(always.events.filter((e) => e.obstacle === 'cable_car').length > 20);
});

test('the cable car timetable is repeatable for a seed and differs between races', () => {
  const t = crossing(0.3);
  assert.deepEqual(simulateRace({ seed: 9, track: t, entries: entries(20) }), simulateRace({ seed: 9, track: t, entries: entries(20) }));
  const caught = (seed) => new Set(simulateRace({ seed, track: t, entries: entries(20) }).events
    .filter((e) => e.obstacle === 'cable_car').map((e) => e.i)).size;
  const counts = new Set(Array.from({ length: 12 }, (_, s) => caught(s * 101 + 1)));
  assert.ok(counts.size > 3, `different races should catch different numbers of marbles (got ${[...counts]})`);
});

// --- Solid marbles: what viewers see never overlaps, and outcomes never change ---

const FIXTURES = [
  track,
  {
    length_m: 900, lane_count: 4,
    obstacles: [
      { type: 'bumper', at: 0.2, span: 0.06, intensity: 0.8 },
      { type: 'cable_car', at: 0.45, span: 0.02, intensity: 0.9, period: 18, duty: 0.3 },
      { type: 'spinner', at: 0.7, span: 0.05, intensity: 0.8 },
    ],
  },
  { length_m: 600, lane_count: 6, obstacles: [{ type: 'sand', at: 0.5, span: 0.1, intensity: 0.4 }] },
];

const mixedField = (seed) => Array.from({ length: 20 }, (_, i) => ({
  id: `m${i}`, lane: (i * 7 + seed) % 20,
  topSpeed: 30 + ((i * 13 + seed) % 60), acceleration: 30 + ((i * 29) % 60),
  handling: 30 + ((i * 17) % 60), luck: 30 + ((i * 11 + seed) % 60),
}));

test('race outcomes are exactly those of the simulator before marbles became solid', () => {
  // Fingerprint of durations, results and events from the simulator as of
  // commit e4e4195, before the overlap-free layout was added. Laying marbles
  // out must never change who wins or any time: if this fails, outcomes moved.
  const h = crypto.createHash('sha256');
  for (const t of FIXTURES) {
    for (let seed = 0; seed < 20; seed += 1) {
      const sim = simulateRace({ seed: (seed * 2654435761) % 4294967296, track: t, entries: mixedField(seed) });
      h.update(JSON.stringify([sim.durationMs, sim.results, sim.events]));
    }
  }
  assert.equal(h.digest('hex').slice(0, 24), '0ce35f74fe3d8ddfc1438bbc');
});

test('marbles never overlap in any frame and never move backwards', () => {
  // Same sizes as the 3D view: 1.1 m marbles, 1.6 m lanes, lateral ±1 = centre against a wall.
  const DIAMETER = 1.1;
  for (const t of FIXTURES) {
    const room = (t.lane_count * 1.6) / 2 - DIAMETER / 2;
    for (let seed = 0; seed < 8; seed += 1) {
      const sim = simulateRace({ seed: seed * 7919 + 3, track: t, entries: mixedField(seed), minDurationMs: 90_000, maxDurationMs: 90_000 });
      sim.frames.forEach((f, k) => {
        for (let i = 0; i < f.p.length; i += 1) {
          if (k > 0) assert.ok(f.p[i] >= sim.frames[k - 1].p[i], `marble ${i} moved backwards at ${f.t} ms`);
          if (f.p[i] >= 1) continue; // finished marbles have left the track
          for (let j = i + 1; j < f.p.length; j += 1) {
            if (f.p[j] >= 1) continue;
            const d = Math.hypot((f.p[i] - f.p[j]) * t.length_m, (f.l[i] - f.l[j]) * room);
            assert.ok(d >= DIAMETER, `marbles ${i} and ${j} overlap by ${(DIAMETER - d).toFixed(3)} m at ${f.t} ms (${t.length_m} m track, seed ${seed})`);
          }
        }
      });
    }
  }
});
