'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { simulatePhysicsRace } = require('../src/game/physicsSimulator');
const { previewTrack, PREVIEW_TRACKS } = require('../src/game/previewTracks');
const { buildCenterline, trackProfile } = require('../src/game/trackGeometry');
const { realTracks, realMarbles } = require('./helpers/realTracks');

const catalog = realMarbles();
const field = (seed) => Array.from({ length: 20 }, (_, i) => {
  const m = catalog[(i + seed) % catalog.length];
  return { id: `m${i}`, lane: (i * 7 + seed) % 20, topSpeed: m.topSpeed, acceleration: m.acceleration, handling: m.handling, luck: m.luck };
});
const bob = previewTrack('bobsleigh-olympics');
const race = (seed) => simulatePhysicsRace({ seed: seed * 104729 + 11, track: bob, entries: field(seed), level: 3 });
const pathOf = (sim) => {
  const path = new Array(20).fill(null);
  for (const f of sim.frames) f.b?.forEach((b, i) => { if (b && !path[i]) path[i] = b > 0 ? 'inside' : 'outside'; });
  return path;
};

test('the four real tracks are untouched by the bobsleigh physics (same physics-preview output as before)', () => {
  // Fingerprint taken before ice channels were added (commit db07e6d).
  const h = crypto.createHash('sha256');
  for (const t of realTracks()) {
    for (const level of [2, 3]) {
      for (let seed = 0; seed < 3; seed += 1) {
        const entries = Array.from({ length: 20 }, (_, i) => {
          const m = catalog[(i + seed) % catalog.length];
          return { id: `m${i}`, lane: (i * 7 + seed) % 20, topSpeed: m.topSpeed, acceleration: m.acceleration, handling: m.handling, luck: m.luck };
        });
        const r = simulatePhysicsRace({ seed: seed * 977 + 1, track: t, entries, level });
        h.update(JSON.stringify([r.results, r.events, r.durationMs, r.frames.map((f) => [f.t, f.p, f.l, f.h, f.s])]));
      }
    }
  }
  assert.equal(h.digest('hex').slice(0, 24), '4b9853463d4d5f3751587f0a');
});

test('the bobsleigh run is preview-only and always downhill', () => {
  assert.ok(PREVIEW_TRACKS.every((t) => t.preview));
  assert.ok(!realTracks().some((t) => t.slug === bob.slug), 'not in the database seed');
  const profile = trackProfile(buildCenterline(bob));
  assert.ok(Math.max(...profile.slope) < -0.02, 'never flat, never uphill');
});

test('bobsleigh races are fast, finish well inside the cap and pull the field apart', () => {
  let spread = 0;
  for (let seed = 0; seed < 8; seed += 1) {
    const sim = race(seed);
    assert.equal(sim.stats.unfinished, 0);
    assert.ok(sim.durationMs < 70_000, `last home at ${sim.durationMs} ms`);
    assert.ok(sim.stats.topSpeed * 3.6 > 120, `top speed ${sim.stats.topSpeed * 3.6} km/h`);
    spread += (sim.stats.lastMs - sim.stats.winnerMs) / 1000;
    for (const f of sim.frames) {
      assert.ok(f.l.every((l) => Math.abs(l) <= 1) && f.v.every((v) => v >= 0) && f.b.every((b) => [-1, 0, 1].includes(b)));
    }
  }
  assert.ok(spread / 8 > 2, `first to last only ${(spread / 8).toFixed(1)} s apart`);
});

test('the splitter is used both ways and neither channel wins more often', () => {
  const by = { inside: { n: 0, pos: 0 }, outside: { n: 0, pos: 0 } };
  for (let seed = 0; seed < 60; seed += 1) {
    const sim = race(seed + 500);
    const path = pathOf(sim);
    for (const r of sim.results) {
      if (!path[r.index]) continue;
      by[path[r.index]].n += 1;
      by[path[r.index]].pos += r.position;
    }
  }
  const share = by.inside.n / (by.inside.n + by.outside.n);
  assert.ok(share > 0.35 && share < 0.65, `inside share ${share.toFixed(2)}`);
  const gap = Math.abs(by.inside.pos / by.inside.n - by.outside.pos / by.outside.n);
  assert.ok(gap < 0.8, `average finishing positions differ by ${gap.toFixed(2)} places`);
});
