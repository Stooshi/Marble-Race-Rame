'use strict';

// The stored replay, smaller from 27 Oct 2026 (src/game/replayPack.js): lossless, so a race plays back
// exactly as it ran; old replays (gzipped JSON) are still read.
const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const { physicsTrack } = require('../src/game/physicsTracks');
const { runSimulation } = require('../src/game/runSimulation');
const { packReplay, unpackReplay } = require('../src/game/replayPack');

const v1 = (sim) => {
  const { durationMs, tickMs, tickRateHz, results, events, frames, start, stats } = sim;
  return zlib.gzipSync(Buffer.from(JSON.stringify({ durationMs, tickMs, tickRateHz, results, events, frames, start, stats })));
};
const asStored = (sim) => {
  const { durationMs, tickMs, tickRateHz, results, events, frames, start, stats } = sim;
  return JSON.stringify({ durationMs, tickMs, tickRateHz, results, events, frames, start, stats });
};

for (const slug of ['san-francisco', 'bobsleigh-run', 'everest-icefall-run', 'danube-night-run', 'marble-stadium-sprint']) {
  test(`${slug}: the packed replay gives back exactly the race, at well under half the old size`, () => {
    const t = physicsTrack(slug);
    const race = { seed: 4242, tick_rate_hz: 20, track_slug: t.slug, length_m: t.length_m, lane_count: t.lane_count, waypoints: t.waypoints, obstacles: t.obstacles, physics: t.physics };
    const entries = Array.from({ length: 20 }, (_, i) => ({ id: `e${i}`, lane: i, snap_top_speed: 30 + i * 3, snap_acceleration: 50, snap_handling: 50, snap_luck: 50 }));
    const sim = runSimulation(race, entries);
    const packed = packReplay(sim);
    assert.equal(packed.subarray(0, 4).toString(), 'MSR2');
    // (Exactly as the old JSON stored it, number for number: -0 as 0.)
    assert.equal(JSON.stringify(unpackReplay(packed)), asStored(sim));
    const old = v1(sim);
    assert.equal(JSON.stringify(unpackReplay(old)), asStored(sim)); // (old replays still read)
    assert.ok(packed.length < old.length * 0.45, `${packed.length} bytes against ${old.length}`);
  });
}

test('frames with lists the engine leaves out, odd numbers and other values come back as they were', () => {
  const sim = {
    durationMs: 1234, tickMs: 50, tickRateHz: 20, results: [{ index: 0, finishTimeMs: 1200 }], events: [{ t: 5, kind: 'x' }],
    frames: [
      { t: 0, p: [0, 0.00001, -0.5], v: [1.5, 2, 3], w: 'a' },
      { t: 50, p: [0.1, 0.2, 0.3], v: [1.5, 2.5, 3], w: null },
      { t: 100, p: [0.2, 0.3, 0.4], tiny: [1e-12, 0.1234567891234] },
      { t: 150, p: [0.3, 0.4], v: [-0, 2, 3.25] },
      { t: 1234, p: [1, 1, 1], v: [0, 0, 0], x: { nested: [1, 2] } },
    ],
    start: { order: [2, 0, 1] },
    stats: { overtakes: 3 },
  };
  assert.equal(JSON.stringify(unpackReplay(packReplay(sim))), asStored(sim));
});
