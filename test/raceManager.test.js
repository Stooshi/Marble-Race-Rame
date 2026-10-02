'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

// The manager pulls in the db module; give it a harmless connection string.
process.env.DATABASE_URL ||= 'postgres://localhost:1/unused';
const raceService = require('../src/game/raceService');
const raceManager = require('../src/game/raceManager');
const { simulateRace } = require('../src/game/simulator');

function fakeIo(sink) {
  const room = {
    emit: (event, payload) => sink.push({ event, payload, volatile: false }),
    volatile: { emit: (event, payload) => sink.push({ event, payload, volatile: true }) },
  };
  return { to: () => room };
}

test('tick streams frames by wall clock and always delivers the final frame', async (t) => {
  const sink = [];
  raceManager.init(fakeIo(sink));
  t.mock.method(raceService, 'finalize', async () => [{ position: 1 }]);

  const sim = simulateRace({
    seed: 42,
    track: { length_m: 600, lane_count: 4, obstacles: [] },
    entries: Array.from({ length: 10 }, (_, i) => ({ id: `e${i}`, lane: i })),
  });
  let now = 1_000_000;
  t.mock.method(Date, 'now', () => now);

  const active = { raceId: 'r1', sim, startMs: now, lastFrame: -1, lastEventIdx: 0, finishing: false, meta: {} };
  raceManager.active.set('r1', active);

  raceManager.tick(active);
  now += 2550;
  raceManager.tick(active);
  now += sim.durationMs; // well past the end
  raceManager.tick(active);
  await new Promise((r) => setImmediate(r));

  const frames = sink.filter((e) => e.event === 'race:frame');
  assert.deepEqual(frames.map((f) => f.payload.frame), [0, 25, sim.frames.length - 1]);
  assert.equal(frames.at(-1).payload.t, sim.durationMs);
  assert.equal(frames.at(-1).volatile, false);
  const delivered = frames.reduce((n, f) => n + (f.payload.events?.length || 0), 0);
  assert.equal(delivered, sim.events.length, 'every event is delivered exactly once');
  assert.ok(sink.some((e) => e.event === 'race:finished'));
  assert.equal(raceManager.active.has('r1'), false);
});
