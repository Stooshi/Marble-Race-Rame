'use strict';

/**
 * The view checks (ground, camera, clear track) on many tracks at once, without
 * the race batches: what the full report's "drawn track" part runs, per track.
 *
 *   node scripts/clear-check.js [slug ...] [--all] [--out <file>]
 *
 * --all: every race track (not the test layouts). Writes one JSON with each
 * track's clear-track result (scenery inside the track, scenery near the follow
 * camera) and prints a line per track.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { physicsTrack, PHYSICS_TRACKS } = require('../src/game/physicsTracks');
const { simulatePhysicsRace } = require('../src/game/physicsSimulator');
const { houseField } = require('./race-fingerprints');
const { batchSeeds } = require('../src/report/batch');

const ROOT = path.resolve(__dirname, '..');
const CLIENT = path.join(ROOT, 'client');
const args = process.argv.slice(2);
const outFile = args.includes('--out') ? args[args.indexOf('--out') + 1] : path.join(ROOT, 'reports', 'clear-check.json');
const RACE_TRACK = (slug) => !/^variety-|^kit-proving-ground/.test(slug);
const slugs = args.includes('--all')
  ? PHYSICS_TRACKS.map((t) => t.slug ?? t).filter(RACE_TRACK)
  : args.filter((a) => !a.startsWith('--') && a !== outFile);

const dev = path.join(CLIENT, 'dev', '.tracks');
const tmp = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'clear-'));
fs.mkdirSync(dev, { recursive: true });
fs.mkdirSync(path.dirname(outFile), { recursive: true });
const all = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};

for (const slug of slugs) {
  const track = physicsTrack(slug);
  const trackFile = path.join(dev, `${slug}.json`);
  fs.writeFileSync(trackFile, JSON.stringify(track));
  const sims = batchSeeds(0, 2).map((s) => simulatePhysicsRace({ seed: s, track, entries: houseField(s), level: 3 }));
  const racesFile = path.join(tmp, `${slug}.races.json`);
  fs.writeFileSync(racesFile, JSON.stringify(sims.map((s) => ({ frames: s.frames, tickMs: s.tickMs, durationMs: s.durationMs }))));
  const viewFile = path.join(tmp, `${slug}.view.json`);
  execFileSync('npx', ['vitest', 'run', '--config', 'report/vitest.config.js'], {
    cwd: CLIENT, stdio: 'pipe', env: { ...process.env, REPORT_TRACK: trackFile, REPORT_RACES: racesFile, REPORT_OUT: viewFile },
  });
  const view = JSON.parse(fs.readFileSync(viewFile, 'utf8'));
  all[slug] = { name: track.name, clear: view.clear };
  fs.writeFileSync(outFile, JSON.stringify(all, null, 1));
  const inTrack = [...view.clear.computer.stretches, ...view.clear.phone.stretches];
  const near = view.clear.camera.reduce((n, c) => n + c.near.length, 0);
  const inside = view.clear.camera.reduce((n, c) => n + c.inside.length, 0);
  const looks = view.clear.camera.reduce((n, c) => n + c.looks, 0);
  console.log(`${slug.padEnd(36)} inside the track: computer ${view.clear.computer.stretches.length} / phone ${view.clear.phone.stretches.length} stretches (${inTrack.reduce((n, r) => n + r.metres, 0)} m) · near the camera: ${near} of ${looks} · camera in the land: ${inside}`);
}
fs.rmSync(tmp, { recursive: true, force: true });
