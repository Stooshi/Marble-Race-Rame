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

// --- step 4: collisions ------------------------------------------------------

const { createRng } = require('../src/game/rng');
const { subSeed } = require('../src/game/simulator');

/** A preview race exactly as the preview route builds it: 20 of the catalog, lanes from the seed. */
const sorted = [...catalog].sort((a, b) => (a.slug < b.slug ? -1 : 1));
function routeRace(seed) {
  const rng = createRng(subSeed(seed, 3));
  const picked = rng.shuffle([...sorted]).slice(0, 20);
  const lanes = rng.shuffle(picked.map((_, i) => i));
  const entries = picked.map((m, i) => ({ id: m.slug, lane: lanes[i], topSpeed: m.topSpeed, acceleration: m.acceleration, handling: m.handling, luck: m.luck }));
  return { entries, sim: simulatePhysicsRace({ seed, track: bob, entries, level: 3 }) };
}
let batch = null;
const fairnessBatch = () => {
  batch ??= Array.from({ length: 60 }, (_, k) => routeRace(20_000 + k * 7919));
  return batch;
};

test('bobsleigh marbles bump into each other, and the same seed gives the same race', () => {
  const a = routeRace(4242).sim;
  assert.ok(a.stats.bumps > 100, `only ${a.stats.bumps} bumps`);
  assert.ok(a.stats.bigBumps > 10, `only ${a.stats.bigBumps} hard bumps`);
  const b = routeRace(4242).sim;
  assert.equal(JSON.stringify(b), JSON.stringify(a));
});

test('no starting place has an edge: the field starts side by side and every part of the line finishes alike', () => {
  const groups = Array.from({ length: 5 }, () => ({ n: 0, pos: 0 }));
  for (const { entries, sim } of fairnessBatch()) {
    // Everyone starts in one row (bar the running-track stagger for the outer places).
    const start = sim.frames[0].p;
    const stagger = bob.physics.channel.funnel.stagger;
    assert.ok((Math.max(...start) - Math.min(...start)) * sim.stats.trackMetres < stagger + 0.1, 'one row');
    for (const r of sim.results) {
      const g = groups[Math.floor(entries[r.index].lane / 4)];
      g.n += 1;
      g.pos += r.position;
    }
  }
  for (const [k, g] of groups.entries()) {
    const avg = g.pos / g.n;
    assert.ok(avg > 9 && avg < 12, `starting places ${k * 4 + 1}-${k * 4 + 4} finish ${avg.toFixed(2)} on average (fair is 10.5)`);
  }
});

test('better marbles win more often without dominating', () => {
  const total = (e) => e.topSpeed + e.acceleration + e.handling + e.luck;
  let strongWins = 0;
  let weakWins = 0;
  for (const { entries, sim } of fairnessBatch()) {
    const order = entries.map((e, i) => i).sort((a, b) => total(entries[b]) - total(entries[a]) || (entries[a].id < entries[b].id ? -1 : 1));
    const winner = sim.results[0].index;
    if (order.slice(0, 5).includes(winner)) strongWins += 1;
    if (order.slice(15).includes(winner)) weakWins += 1;
  }
  const n = fairnessBatch().length;
  assert.ok(strongWins / n > 0.25 && strongWins / n < 0.7, `strongest five won ${strongWins} of ${n}`);
  assert.ok(strongWins > weakWins * 2, `strongest five ${strongWins} wins, weakest five ${weakWins}`);
});

test('finishers roll into the catch area, bump the ones ahead and settle without overlapping', () => {
  const { sim } = routeRace(777);
  assert.ok(sim.durationMs > sim.stats.lastMs, 'the replay runs on while they settle');
  assert.ok(sim.stats.penBumps > 0);
  const last = sim.frames[sim.frames.length - 1];
  const { radius, maxAngle } = bob.physics.channel;
  const pts = last.a.map((a, i) => [a, radius * Math.sin((last.l[i] * maxAngle * Math.PI) / 180)]);
  for (const [a] of pts) assert.ok(a >= 0.5 && a <= bob.physics.runout.length, `parked ${a} m past the line`);
  for (let i = 0; i < pts.length; i += 1) {
    for (let j = i + 1; j < pts.length; j += 1) {
      const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
      assert.ok(d > 1.0, `marbles ${i} and ${j} only ${d.toFixed(2)} m apart`);
    }
  }
  // Settled: nearly all at rest (one may still be rolling slowly into a gap in the pile).
  assert.ok(last.v.every((v) => v < 1.5), `still rolling at ${Math.max(...last.v)} m/s`);
  assert.ok(last.v.filter((v) => v < 0.3).length >= 18, 'come to rest');
  // The finishing order is still decided at the line.
  const times = sim.results.map((r) => r.finishTimeMs);
  assert.deepEqual(times, [...times].sort((x, y) => x - y));
});
