'use strict';

// Races are worked out in a worker thread: the same race as on the main thread,
// and the server keeps ticking meanwhile (live races never freeze).
const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const { physicsTrack } = require('../src/game/physicsTracks');
const { runSimulation } = require('../src/game/runSimulation');
const { simulate, simulatePhysics } = require('../src/game/simulationPool');
const { simulatePhysicsRace } = require('../src/game/physicsSimulator');

const sf = physicsTrack('san-francisco');
const race = {
  seed: 4242, tick_rate_hz: 20, track_slug: sf.slug, length_m: sf.length_m, lane_count: sf.lane_count,
  waypoints: sf.waypoints, obstacles: sf.obstacles, physics: sf.physics,
};
const entries = Array.from({ length: 20 }, (_, i) => ({
  id: `e${i}`, lane: i, snap_top_speed: 30 + i * 3, snap_acceleration: 50, snap_handling: 50, snap_luck: 50,
}));

test('a race worked out in the worker is exactly the race worked out here, with its packed replay', async () => {
  const { sim, replay } = await simulate(race, entries);
  const here = runSimulation(race, entries);
  assert.equal(JSON.stringify(sim), JSON.stringify(here));
  // (Packed as JSON, as replays always are: -0 is stored as 0.)
  const unpacked = JSON.parse(zlib.gunzipSync(replay).toString('utf8'));
  assert.equal(JSON.stringify(unpacked.frames), JSON.stringify(here.frames));
  assert.equal(JSON.stringify(unpacked.results), JSON.stringify(here.results));
  // The physics preview page too.
  const input = { seed: 7, level: 3, track: sf, entries: entries.map((e) => ({ id: e.id, lane: e.lane, topSpeed: 50, acceleration: 50 })) };
  assert.equal(JSON.stringify(await simulatePhysics(input)), JSON.stringify(simulatePhysicsRace(input)));
});

test('while a race is worked out, the server keeps ticking: frames to live races are never held up', async () => {
  await simulate(race, entries); // (the worker started and warmed up)
  let last = Date.now();
  let worst = 0;
  const timer = setInterval(() => {
    const now = Date.now();
    worst = Math.max(worst, now - last);
    last = now;
  }, 10);
  await Promise.all([simulate({ ...race, seed: 1 }, entries), simulate({ ...race, seed: 2 }, entries)]);
  clearInterval(timer);
  // Two races take the engine over a second; the main thread never stalls for more than a moment
  // (receiving a finished race costs a few tens of milliseconds).
  assert.ok(worst < 150, `the main thread stalled for ${worst} ms`);
});
