'use strict';

// Records what the field races through in its first 20 seconds on every track
// (src/report/firstSeconds.js) into src/report/startSequences.json, for the report's
// "first 20 seconds" check. The report records each track it checks; this records
// tracks all at once (after a change to the check, or the first time).
//   node scripts/start-sequences.js [slug,slug]      (default: every track but the test tracks)
const { PHYSICS_TRACKS } = require('../src/game/physicsTracks');
const { simulatePhysicsRace } = require('../src/game/physicsSimulator');
const { batchSeeds } = require('../src/report/batch');
const { houseField } = require('./race-fingerprints');
const { profile } = require('../src/report/variety');
const { reachOf, startSequence, saveSequence } = require('../src/report/firstSeconds');

const only = process.argv[2] ? process.argv[2].split(',') : null;
const tracks = PHYSICS_TRACKS.filter((t) => (only ? only.includes(t.slug) : t.variety && profile(t)?.family !== 'test' && !/^variety-|kit-proving/.test(t.slug)));
for (const track of tracks) {
  const seed = batchSeeds(0, 1)[0];
  const sim = simulatePhysicsRace({ seed, track, entries: houseField(seed), level: 3 });
  const reach = reachOf(sim);
  const seq = startSequence(track, reach);
  if (!seq) continue;
  saveSequence(track, reach, seq);
  console.log(track.slug.padEnd(34), reach.toFixed(3), seq.length);
}
