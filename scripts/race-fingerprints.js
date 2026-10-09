'use strict';

// Race fingerprints: the safety net that proves today's tracks race exactly as
// before while the track kit is built around them. For every track it runs a
// fixed list of seeded races and keeps a hash of each whole race (every frame,
// every finishing time, every event). test/raceFingerprints.test.js re-runs
// them and fails on any difference.
//   node scripts/race-fingerprints.js            prints the fingerprints (JSON)
//   node scripts/race-fingerprints.js --write    rewrites test/fingerprints/races.json
//   node scripts/race-fingerprints.js --check    re-runs ALL seeds and compares (slow: a few minutes)
// Only rewrite the file when a change to an old track is meant to happen, and
// say so in the commit.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { simulatePhysicsRace } = require('../src/game/physicsSimulator');
const { physicsTrack } = require('../src/game/physicsTracks');
const { simulateRace, subSeed } = require('../src/game/simulator');
const { createRng } = require('../src/game/rng');
const { HOUSE_SKILLS, skillStats } = require('../src/game/skill');
const { realTracks } = require('../test/helpers/realTracks');

const FILE = path.resolve(__dirname, '../test/fingerprints/races.json');
const PHYSICS_SLUGS = ['bobsleigh-run', 'san-francisco', 'table-mountain-run'];
const PHYSICS_SEEDS = 200;
const CLASSIC_SEEDS = 200;
const seedAt = (k) => 50_000 + k * 7919;

/** A field of house marbles and their lanes, from the seed (as the tests and the preview draw them). */
function houseField(seed) {
  const rng = createRng(subSeed(seed, 3));
  const picked = rng.shuffle(HOUSE_SKILLS.map((skill, i) => ({ id: `h${String(i).padStart(2, '0')}`, skill })));
  const lanes = rng.shuffle(picked.map((_, i) => i));
  return picked.map((h, i) => ({ id: h.id, lane: lanes[i], ...skillStats(h.skill) }));
}

const hash = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 24);

/** The tracks fingerprinted: each with how to run one of its races. */
function fingerprintTracks() {
  const physics = PHYSICS_SLUGS.map((slug) => {
    const track = physicsTrack(slug);
    return { key: `physics:${slug}`, seeds: PHYSICS_SEEDS, race: (seed) => simulatePhysicsRace({ seed, track, entries: houseField(seed), level: 3 }) };
  });
  // The classic tracks, as their old races ran (still replayed and still raceable).
  const classic = realTracks().map((track) => ({
    key: `classic:${track.slug}`,
    seeds: CLASSIC_SEEDS,
    race: (seed) => simulateRace({ seed, track, entries: houseField(seed).slice(0, 12 + (seed % 9)) }),
  }));
  return [...physics, ...classic];
}

/** Fingerprints of the first `limit` seeds of each track (all of them by default). */
function computeFingerprints({ limit = Infinity, only } = {}) {
  const out = {};
  for (const t of fingerprintTracks()) {
    if (only && !only.includes(t.key)) continue;
    const n = Math.min(t.seeds, limit);
    out[t.key] = Array.from({ length: n }, (_, k) => hash(t.race(seedAt(k))));
  }
  return out;
}

function readFingerprints() {
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}

module.exports = { computeFingerprints, readFingerprints, fingerprintTracks, seedAt, houseField, FILE };

if (require.main === module) {
  const mode = process.argv[2];
  if (mode === '--check') {
    const want = readFingerprints();
    const got = computeFingerprints();
    let bad = 0;
    for (const key of Object.keys(want)) {
      const diff = want[key].filter((h, k) => got[key]?.[k] !== h).length;
      if (diff) bad += 1;
      console.log(`${diff ? 'CHANGED' : 'same   '} ${key}: ${want[key].length - diff} of ${want[key].length} races identical`);
    }
    process.exit(bad ? 1 : 0);
  }
  const prints = computeFingerprints();
  const json = `${JSON.stringify(prints, null, 1)}\n`;
  if (mode === '--write') {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, json);
    console.log(`Wrote ${Object.keys(prints).length} tracks to ${path.relative(process.cwd(), FILE)}`);
  } else {
    process.stdout.write(json);
  }
}
