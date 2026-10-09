'use strict';

/**
 * Runs a batch of races for the track report, spread over worker threads (one
 * per core), and returns each race's measurements (./analyze.js), in seed order.
 * The field for each seed is the house field the fingerprints use, so a batch
 * is the same every time it runs.
 */
const os = require('os');
const path = require('path');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

/** The seeds of batch `b` (0, 1, 2…): far apart, so the batches never overlap. */
const batchSeeds = (b, count) => Array.from({ length: count }, (_, k) => 1_000_003 * (b + 1) + k * 7919);

function runHere(slug, seeds, track = null) {
  const { physicsTrack } = require('../game/physicsTracks');
  const { simulatePhysicsRace } = require('../game/physicsSimulator');
  const { houseField } = require('../../scripts/race-fingerprints');
  const { analyzeRace } = require('./analyze');
  const t = track ?? physicsTrack(slug);
  return seeds.map((seed) => {
    const entries = houseField(seed);
    const sim = simulatePhysicsRace({ seed, track: t, entries, level: 3 });
    return analyzeRace(sim, entries, t);
  });
}

/** Races `seeds` on the track (a slug, or a built track), on every core. */
async function runBatch(slugOrTrack, seeds, { threads = Math.max(1, os.cpus().length), onProgress } = {}) {
  const track = typeof slugOrTrack === 'string' ? null : slugOrTrack;
  const slug = track ? track.slug : slugOrTrack;
  const parts = Array.from({ length: threads }, (_, w) => seeds.filter((_, k) => k % threads === w));
  let done = 0;
  const results = await Promise.all(parts.map((part) => new Promise((resolve, reject) => {
    if (!part.length) return resolve([]);
    const worker = new Worker(__filename, { workerData: { slug, track, seeds: part } });
    const out = [];
    worker.on('message', (m) => {
      out.push(m);
      done += 1;
      onProgress?.(done, seeds.length);
    });
    worker.on('error', reject);
    worker.on('exit', (code) => (code === 0 ? resolve(out) : reject(new Error(`report worker stopped (${code})`))));
    return undefined;
  })));
  const bySeed = new Map(results.flat().map((r) => [r.seed, r]));
  return seeds.map((s) => bySeed.get(s));
}

if (!isMainThread && workerData?.seeds) {
  const { slug, track, seeds } = workerData;
  for (const seed of seeds) parentPort.postMessage(runHere(slug, [seed], track)[0]);
}

module.exports = { runBatch, runHere, batchSeeds, BATCH_FILE: path.resolve(__filename) };
