'use strict';

// The worker thread behind simulationPool: works out races off the main
// thread. Each message is one job; the answer goes back with the same id.
const { parentPort } = require('node:worker_threads');
const { runSimulation, packReplay } = require('./runSimulation');
const { simulatePhysicsRace } = require('./physicsSimulator');

parentPort.on('message', ({ id, kind, race, entries, input }) => {
  try {
    if (kind === 'physics') {
      parentPort.postMessage({ id, sim: simulatePhysicsRace(input) });
      return;
    }
    const sim = runSimulation(race, entries);
    // The stored replay (new physics), packed here too: a few hundred KB of JSON to zip.
    const replay = race.physics ? packReplay(sim) : null;
    const bytes = replay ? new Uint8Array(replay.buffer, replay.byteOffset, replay.byteLength).slice() : null;
    parentPort.postMessage({ id, sim, replay: bytes }, bytes ? [bytes.buffer] : []);
  } catch (err) {
    parentPort.postMessage({ id, error: { message: err.message, stack: err.stack } });
  }
});
