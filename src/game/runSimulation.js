'use strict';

// Running a race's engine, apart from the database: the main server calls it
// through simulationPool (in a worker thread, so working out a race never
// holds up the live races being streamed), and the tests call it directly.
const zlib = require('zlib');
const config = require('../config');
const { simulateRace } = require('./simulator');
const { simulatePhysicsRace } = require('./physicsSimulator');

/** Runs the race's engine: the new physics for tracks with physics settings, else the classic simulator. */
function runSimulation(race, entries) {
  if (race.physics) {
    return simulatePhysicsRace({
      seed: Number(race.seed),
      level: 3,
      tickRateHz: race.tick_rate_hz,
      track: {
        slug: race.track_slug,
        length_m: Number(race.length_m),
        lane_count: race.lane_count,
        waypoints: race.waypoints,
        obstacles: race.obstacles,
        physics: race.physics,
      },
      entries: entries.map((e) => ({
        id: e.id,
        lane: e.lane,
        topSpeed: e.snap_top_speed,
        acceleration: e.snap_acceleration,
        handling: e.snap_handling,
        luck: e.snap_luck,
      })),
    });
  }
  return simulateRace({
    seed: Number(race.seed),
    track: { length_m: Number(race.length_m), lane_count: race.lane_count, obstacles: race.obstacles },
    entries: entries.map((e) => ({
      id: e.id,
      lane: e.lane,
      topSpeed: e.snap_top_speed,
      acceleration: e.snap_acceleration,
      handling: e.snap_handling,
      luck: e.snap_luck,
    })),
    tickRateHz: race.tick_rate_hz,
    minDurationMs: config.game.minDurationMs,
    maxDurationMs: config.game.maxDurationMs,
  });
}

/** What is stored for a race on the new physics: everything its replay needs. */
function packReplay(sim) {
  const { durationMs, tickMs, tickRateHz, results, events, frames, start, stats } = sim;
  return zlib.gzipSync(Buffer.from(JSON.stringify({ durationMs, tickMs, tickRateHz, results, events, frames, start, stats })));
}


module.exports = { runSimulation, packReplay };
