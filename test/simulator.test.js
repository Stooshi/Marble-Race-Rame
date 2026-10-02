'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
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
