'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { simulatePhysicsRace } = require('../src/game/physicsSimulator');
const { realTracks, realMarbles } = require('./helpers/realTracks');

const tracks = realTracks();
const catalog = realMarbles();
// 20 real catalog marbles (rotating with the seed) in shuffled lanes.
const field = (n, seed = 0) => Array.from({ length: n }, (_, i) => {
  const m = catalog[(i + seed) % catalog.length];
  return { id: `m${i}`, lane: (i * 7 + seed) % n, topSpeed: m.topSpeed, acceleration: m.acceleration, handling: m.handling, luck: m.luck };
});
const speeds = (sim, i, from, to) => {
  // Average speed (progress per second) of marble i between two progress marks.
  const a = sim.frames.find((f) => f.p[i] >= from);
  const b = sim.frames.find((f) => f.p[i] >= to);
  return (to - from) / ((b.t - a.t) / 1000);
};

test('physics races are repeatable: same seed, same race', () => {
  const t = tracks.find((x) => x.slug === 'canyon-drop');
  assert.deepEqual(simulatePhysicsRace({ seed: 42, track: t, entries: field(20) }), simulatePhysicsRace({ seed: 42, track: t, entries: field(20) }));
});

for (const t of tracks) {
  test(`${t.slug}: every marble finishes inside the 90 s cap, stays on the track and only moves forwards`, () => {
    for (const level of [2, 3]) {
      for (let seed = 0; seed < 4; seed += 1) {
        const sim = simulatePhysicsRace({ seed: seed * 7919 + 3, track: t, entries: field(20, seed), level });
        assert.equal(sim.stats.unfinished, 0, `level ${level} seed ${seed}: ${sim.stats.unfinished} marbles not home by 90 s`);
        assert.ok(sim.durationMs <= 90_000);
        assert.ok(sim.results.every((r, i) => r.position === i + 1 && (i === 0 || r.finishTimeMs > sim.results[i - 1].finishTimeMs)));
        for (let k = 0; k < sim.frames.length; k += 1) {
          const f = sim.frames[k];
          for (let i = 0; i < 20; i += 1) {
            assert.ok(Math.abs(f.l[i]) <= 1, 'between the walls');
            assert.ok(f.h[i] >= 0, 'never below the floor');
            if (level === 2) assert.equal(f.h[i], 0, 'rolling only: never in the air');
            if (k > 0) assert.ok(f.p[i] >= sim.frames[k - 1].p[i], 'never rolls backwards');
          }
        }
      }
    }
  });
}

test('marbles roll straight: no sideways wiggle on a straight, level, empty track', () => {
  const straight = { length_m: 300, lane_count: 4, waypoints: [{ x: 0, y: 0, z: 0 }, { x: 300, y: 0, z: 0 }], obstacles: [] };
  const sim = simulatePhysicsRace({ seed: 7, track: straight, entries: [{ id: 'solo', lane: 0, topSpeed: 50, acceleration: 50, handling: 50, luck: 50 }] });
  assert.ok(sim.frames.every((f) => f.l[0] === 0), 'a marble started in the middle stays exactly in the middle');
});

test('marbles speed up downhill and slow down (but never stall) uphill', () => {
  // Flat, then a steep drop, then a gentle climb, then flat.
  const track = {
    length_m: 600, lane_count: 4, obstacles: [],
    // A point every 50 m so each section is really flat, downhill or uphill.
    waypoints: [[0, 40], [50, 40], [100, 40], [150, 40], [200, 27], [250, 13], [300, 0], [350, 2], [400, 4], [450, 6], [500, 6], [550, 6], [600, 6]]
      .map(([x, z]) => ({ x, y: 0, z })),
  };
  const sim = simulatePhysicsRace({ seed: 3, track, entries: [{ id: 'solo', lane: 0 }], level: 2 });
  const flat = speeds(sim, 0, 0.1, 0.2);
  const downhill = speeds(sim, 0, 0.4, 0.47);
  const uphill = speeds(sim, 0, 0.64, 0.72);
  assert.ok(downhill > flat * 1.3, `downhill ${downhill} vs flat ${flat}`);
  assert.ok(uphill < downhill * 0.85, `uphill ${uphill} vs downhill ${downhill}`);
  assert.equal(sim.stats.unfinished, 0, 'the push carries it over the climb');
});

test('air and bounce: San Francisco\'s crests and ramps make marbles fly; rolling only never does', () => {
  const sf = tracks.find((x) => x.slug === 'san-francisco');
  const air = simulatePhysicsRace({ seed: 11, track: sf, entries: field(20), level: 3 });
  const ground = simulatePhysicsRace({ seed: 11, track: sf, entries: field(20), level: 2 });
  assert.ok(air.stats.jumps > 5, `jumps: ${air.stats.jumps}`);
  assert.ok(air.frames.some((f) => f.h.some((h) => h > 0.3)), 'some marble gets well off the floor');
  assert.equal(ground.stats.jumps, 0);
  assert.ok(air.events.some((e) => e.type === 'jump'));
});

test('better stats still win more often', () => {
  const t = tracks.find((x) => x.slug === 'canyon-drop');
  let wins = 0;
  for (let seed = 0; seed < 12; seed += 1) {
    const entries = Array.from({ length: 10 }, (_, i) => ({ id: `m${i}`, lane: (i + seed) % 10, topSpeed: 50, acceleration: 50, handling: 50, luck: 50 }));
    entries[0] = { ...entries[0], topSpeed: 90, acceleration: 85, handling: 80, luck: 80 };
    if (simulatePhysicsRace({ seed: seed * 31 + 1, track: t, entries, level: 3 }).results[0].index === 0) wins += 1;
  }
  assert.ok(wins >= 3, `strong marble won ${wins}/12 (fair share would be 1.2)`);
});
