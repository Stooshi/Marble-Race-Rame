'use strict';

// The safety net: today's tracks race exactly as they did when their
// fingerprints were recorded (scripts/race-fingerprints.js). Every race is
// compared whole: every frame, every finishing time, every event. A quick slice
// runs with the tests; FINGERPRINTS=all checks every recorded race (a few minutes),
// as does `node scripts/race-fingerprints.js --check`.
const test = require('node:test');
const assert = require('node:assert/strict');
const { computeFingerprints, readFingerprints } = require('../scripts/race-fingerprints');

const ALL = process.env.FINGERPRINTS === 'all';
const want = readFingerprints();

test('the recorded fingerprints cover every track that ran before the track kit', () => {
  assert.deepEqual(Object.keys(want).sort(), [
    'classic:canyon-drop', 'classic:meadow-loop', 'classic:san-francisco', 'classic:volcano-run',
    'physics:bobsleigh-run', 'physics:san-francisco', 'physics:table-mountain-run',
  ]);
});

for (const key of Object.keys(want)) {
  const limit = ALL ? Infinity : key.startsWith('physics:') ? 12 : 60;
  test(`${key} races exactly as before (${ALL ? 'all' : `first ${limit}`} recorded races)`, () => {
    const got = computeFingerprints({ limit, only: [key] })[key];
    got.forEach((h, k) => assert.equal(h, want[key][k], `${key}: race ${k + 1} has changed`));
  });
}
