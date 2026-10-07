'use strict';

/**
 * Works out races in a worker thread. A race on the new physics takes the
 * engine a second or more (more on a small server); run on the main thread,
 * that held up every live race being streamed, and every viewer's marbles
 * froze. Off the main thread the frames keep flowing.
 *
 * One worker, started on first use and kept; jobs queue in it. If a worker
 * can't be started (or dies), the job runs here instead, as before.
 */
const path = require('node:path');
const { Worker } = require('node:worker_threads');
const { runSimulation, packReplay } = require('./runSimulation');
const { simulatePhysicsRace } = require('./physicsSimulator');

let worker = null;
let nextId = 1;
const pending = new Map();

function failAll(err) {
  for (const { reject } of pending.values()) reject(err);
  pending.clear();
}

function getWorker() {
  if (worker) return worker;
  const w = new Worker(path.join(__dirname, 'simulationWorker.js'));
  w.on('message', ({ id, error, ...result }) => {
    const job = pending.get(id);
    if (!job) return;
    pending.delete(id);
    if (!pending.size) w.unref(); // idle: never keeps the process alive on its own (tests, shutdown)
    if (error) {
      const err = new Error(error.message);
      err.stack = error.stack;
      job.reject(err);
    } else job.resolve(result);
  });
  w.on('error', (err) => {
    if (worker === w) worker = null;
    failAll(err);
  });
  w.on('exit', (code) => {
    if (worker === w) worker = null;
    if (pending.size) failAll(new Error(`Simulation worker stopped (exit code ${code})`));
  });
  worker = w;
  return w;
}

function run(message) {
  return new Promise((resolve, reject) => {
    const id = nextId;
    nextId += 1;
    pending.set(id, { resolve, reject });
    const w = getWorker();
    w.ref(); // (busy: keep going until it answers)
    w.postMessage({ id, ...message });
  });
}

/** Works out a race (as raceService.runSimulation): { sim, replay } — replay, the packed replay for the new physics, else null. */
async function simulate(race, entries) {
  try {
    const { sim, replay } = await run({ kind: 'race', race, entries });
    return { sim, replay: replay ? Buffer.from(replay.buffer, replay.byteOffset, replay.byteLength) : null };
  } catch (err) {
    console.error('[simulation] worker failed, running on the main thread', err.message);
    const sim = runSimulation(race, entries);
    return { sim, replay: race.physics ? packReplay(sim) : null };
  }
}

/** simulatePhysicsRace(input), in the worker (the physics preview page). */
async function simulatePhysics(input) {
  try {
    return (await run({ kind: 'physics', input })).sim;
  } catch (err) {
    console.error('[simulation] worker failed, running on the main thread', err.message);
    return simulatePhysicsRace(input);
  }
}

module.exports = { simulate, simulatePhysics };
