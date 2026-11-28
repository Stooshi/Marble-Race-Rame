'use strict';

// Records the on-screen look of tracks' starts (src/report/startLook.js) into
// src/report/startLooks.json, for the report's "first 3 seconds" check. The report
// records each track it checks; this records tracks all at once (after a change to
// how starts are drawn, or the first time).
//   node scripts/start-looks.js [slug,slug]      (default: every track but the test tracks)
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { PHYSICS_TRACKS } = require('../src/game/physicsTracks');
const { simulatePhysicsRace } = require('../src/game/physicsSimulator');
const { batchSeeds } = require('../src/report/batch');
const { houseField } = require('./race-fingerprints');
const { profile } = require('../src/report/variety');
const { lookVector, saveLook, startLookCheck } = require('../src/report/startLook');

const ROOT = path.resolve(__dirname, '..');
const CLIENT = path.join(ROOT, 'client');
const LOOKS = ['#e23b3b', '#3f7fd8', '#ffd21f', '#2fb3a0', '#7a3fd0', '#f2a23a', '#ffffff', '#1b1b1b', '#e05aa8', '#7fd34a'];
const withLooks = (entries) => entries.map((e, index) => ({ index, entryId: e.id, lane: e.lane, isBot: true, user: null,
  marble: { id: e.id, slug: e.id, name: e.id, color_primary: LOOKS[index % LOOKS.length], color_secondary: LOOKS[(index * 3 + 1) % LOOKS.length], pattern: index % 3 ? 'swirl' : 'solid' } }));

const only = process.argv[2] ? process.argv[2].split(',') : null;
const tracks = PHYSICS_TRACKS.filter((t) => (only ? only.includes(t.slug) : profile(t)?.family !== 'test' && !/^variety-|kit-proving/.test(t.slug)));
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'start-looks-'));
const dev = path.join(CLIENT, 'dev', '.tracks');
fs.mkdirSync(dev, { recursive: true });
const plan = tracks.map((track) => {
  fs.writeFileSync(path.join(dev, `${track.slug}.json`), JSON.stringify(track));
  const seed = batchSeeds(0, 1)[0];
  const sim = simulatePhysicsRace({ seed, track, entries: houseField(seed), level: 3 });
  const race = `${track.slug}.looks-race`;
  fs.writeFileSync(path.join(dev, `${race}.json`), JSON.stringify({ entries: withLooks(houseField(seed)), frames: sim.frames, results: sim.results, start: sim.start, tickMs: sim.tickMs, durationMs: sim.durationMs }));
  const countdown = Math.max(5000, sim.start?.countdownMs ?? 0);
  return { slug: track.slug, race, shots: [-countdown + 300, -1500, 1000, 3000].map((t, k) => ({ name: 'abcd'[k], t })) };
});
const planFile = path.join(work, 'plan.json');
fs.writeFileSync(planFile, JSON.stringify(plan));
execFileSync('node', ['report/starts.mjs', planFile, '-', 'looks'], { cwd: CLIENT, stdio: 'inherit' });
const grabbed = JSON.parse(fs.readFileSync(path.join(work, 'looks.json'), 'utf8'));
for (const track of tracks) {
  if (!grabbed[track.slug]) continue;
  saveLook(track, lookVector(grabbed[track.slug]));
  fs.rmSync(path.join(dev, `${track.slug}.looks-race.json`), { force: true });
}
for (const track of tracks) {
  if (!grabbed[track.slug]) { console.log(`${track.slug}: not drawn`); continue; }
  const line = startLookCheck(track, lookVector(grabbed[track.slug]), PHYSICS_TRACKS);
  console.log(`${line.pass === false ? 'FAIL' : line.pass ? 'pass' : '  - '} ${track.slug}: ${line.value}`);
}
fs.rmSync(work, { recursive: true, force: true });
