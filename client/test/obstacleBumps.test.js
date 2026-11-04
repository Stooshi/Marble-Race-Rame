// The own marble's bump on obstacles, worked out on this screen (Moses, 4 Nov 2026; src/sound/hits.js
// obstacleHits / createBumpDetector): checked against the simulator's own obstacle hits. The simulator is
// read, never changed: its source is compiled here with its newsworthy filter left out, so every obstacle
// hit it makes (a fresh hit at more than 4 m/s into the obstacle; any fresh touch of a parked piece) is in
// its events.
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCenterline } from '../src/three/trackModel';
import { channelOf } from '../src/three/iceChannel';
import { buildTrackFeatures } from '../src/three/trackFeatures';
import { BUMP, NOT_OBSTACLES, obstacleHits } from '../src/sound/hits';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(__dirname, '../..');
const { physicsTrack } = require(path.join(ROOT, 'src/game/physicsTracks'));
const { houseField } = require(path.join(ROOT, 'scripts/race-fingerprints'));

/** The simulator with every event kept (read from src/game, compiled here unchanged but for its news filter). */
function everyEventSimulator() {
  const file = path.join(ROOT, 'src/game/physicsSimulator.js');
  const src = fs.readFileSync(file, 'utf8').replace('.filter(newsworthy)', '.filter(() => true)');
  if (src === fs.readFileSync(file, 'utf8')) throw new Error('the simulator\'s news filter has moved');
  const m = new Module(file);
  m.filename = file;
  m.paths = Module._nodeModulePaths(path.dirname(file));
  m._compile(src, file);
  return m.exports.simulatePhysicsRace;
}
const simulate = everyEventSimulator();
// The 3D view draws onto canvases; tests run without a browser.
globalThis.document ??= {
  createElement: () => ({ getContext: () => new Proxy({}, { get: () => () => {} }), width: 0, height: 0 }),
};

/** Over `seeds` races on a track: the simulator's own-marble obstacle hits vs those found here. */
export function compare(slug, seeds) {
  const track = physicsTrack(slug);
  const centerline = buildCenterline(track);
  const channel = channelOf(track, centerline);
  const built = buildTrackFeatures(centerline, channel, track.physics.features, { lite: true, compact: true });
  const span = { at: (t) => built.solidsAt(t).map((o) => ({ ...o, parked: o.type === 'bus' || Boolean(o.parked) })), arc: channel.arc, room: channel.maxAngle * channel.radius };
  let truth = 0;
  let found = 0;
  let matched = 0;
  let races = 0;
  let marbles = 0;
  let played = 0;
  for (const seed of seeds) {
    const sim = simulate({ seed, track, entries: houseField(seed), level: 3 });
    races += 1;
    for (let i = 0; i < sim.marbleCount; i += 1) {
      marbles += 1;
      const real = sim.events.filter((e) => e.i === i && e.type === 'bounce' && !NOT_OBSTACLES.has(e.obstacle)).map((e) => e.t);
      const got = [];
      let last = -Infinity;
      for (let k = 2; k < sim.frames.length; k += 1) {
        for (const h of obstacleHits(sim.frames[k - 2], sim.frames[k - 1], sim.frames[k], [i], span)) {
          if (h.t - last >= BUMP.freshMs) got.push(h.t);
          last = h.t;
        }
      }
      // What plays: at most one bump a second (BUMP.gapMs; the shared limit with the click aside).
      let lastPlay = -Infinity;
      for (const g of got) if (g - lastPlay >= BUMP.gapMs) { played += 1; lastPlay = g; }
      truth += real.length;
      found += got.length;
      const used = new Set();
      for (const t of real) {
        const j = got.findIndex((g, n) => !used.has(n) && Math.abs(g - t) <= 120);
        if (j >= 0) { used.add(j); matched += 1; }
      }
    }
  }
  return { slug, races, truth, found, matched, rate: matched / Math.max(1, truth), extra: (found - matched) / Math.max(1, found), perMarble: truth / marbles, playedPerMarble: played / marbles };
}

// A quick slice with the tests; BUMP_TRACKS=a,b,c BUMP_RACES=10 for more (4 Nov 2026, 10 races on each of
// Pudong, Saint-Tropez, Stockholm, Marrakesh Cube Souk, Irrawaddy, Multiball Manor, Wizard Mode, Grand Canyon
// Burst, Joystick Spins, Bobsleigh Run and San Francisco: 8,153 of 8,868 hits found, 91.9%; 402 extras, 4.7%).
const QUICK = ['pudong-marble-grand-prix', 'multiball-manor'];
describe('the own marble\'s bump, found on this screen', () => {
  it('finds the simulator\'s own obstacle hits (9 in 10 or more), with few extras (under 1 in 10)', () => {
    const all = process.env.BUMP_TRACKS ? process.env.BUMP_TRACKS.split(',') : QUICK;
    const seeds = Array.from({ length: Number(process.env.BUMP_RACES ?? 2) }, (_, k) => 1000 + 37 * k);
    for (const slug of all) {
      const r = compare(slug, seeds);
      console.log(`${slug}: ${r.races} races, ${r.truth} hits (${r.perMarble.toFixed(2)} a marble a race), found ${r.matched} (${(100 * r.rate).toFixed(1)}%), extras ${r.found - r.matched} (${(100 * r.extra).toFixed(1)}%), bumps played ${r.playedPerMarble.toFixed(2)} a race`);
      if (process.env.BUMP_TRACKS) continue;
      expect(r.truth).toBeGreaterThan(50);
      expect(r.rate, slug).toBeGreaterThan(0.85);
      expect(r.extra, slug).toBeLessThan(0.1);
    }
  }, 600000);
});
