'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { simulatePhysicsRace } = require('../src/game/physicsSimulator');
const { physicsTrack } = require('../src/game/physicsTracks');
const { buildCenterline, trackProfile } = require('../src/game/trackGeometry');
const { realTracks, realMarbles } = require('./helpers/realTracks');

const catalog = realMarbles();
const field = (seed) => Array.from({ length: 20 }, (_, i) => {
  const m = catalog[(i + seed) % catalog.length];
  return { id: `m${i}`, lane: (i * 7 + seed) % 20, topSpeed: m.topSpeed, acceleration: m.acceleration, handling: m.handling, luck: m.luck };
});
const bob = physicsTrack('bobsleigh-run');
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

test('Bobsleigh Run is added by its data update, then re-tuned, exactly as defined in code, and is always downhill', () => {
  const dir = path.join(__dirname, '..', 'docs', 'data_updates');
  const added = fs.readFileSync(path.join(dir, '2026-10-06-add-bobsleigh-run.sql'), 'utf8');
  const generated = execFileSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'physics-track-sql.js'), 'bobsleigh-run'], { encoding: 'utf8' });
  // The data update that added it (already run, so never edited) plus the
  // later ones (the clean start's stagger, then the boost pads, bumps and
  // obstacles) give the track in code.
  const physicsOf = (sql) => JSON.parse(sql.match(/'(\{"surface".*?\})'\)/)[1]);
  const physics = physicsOf(added);
  const retune = fs.readFileSync(path.join(dir, '2026-10-06-bobsleigh-clean-start.sql'), 'utf8');
  physics.channel.funnel.stagger = Number(retune.match(/'\{channel,funnel,stagger\}', '([\d.]+)'::jsonb/)[1]);
  const featuresSql = fs.readFileSync(path.join(dir, '2026-10-06-bobsleigh-features.sql'), 'utf8');
  physics.features = JSON.parse(featuresSql.match(/'\{features\}', '(\[.*?\])'::jsonb/)[1]);
  physics.fork.tipOffset = Number(featuresSql.match(/'\{fork,tipOffset\}', '(-?[\d.]+)'::jsonb/)[1]);
  physics.fork.insideScrub = Number(featuresSql.match(/'\{fork,insideScrub\}', '(-?[\d.]+)'::jsonb/)[1]);
  assert.deepEqual(physics, bob.physics, 'the data updates no longer give the track in code');
  // Everything else in the add update is as generated from the code.
  assert.equal(generated.replace(JSON.stringify(bob.physics), JSON.stringify(physicsOf(added))), added);
  assert.equal(bob.name, 'Bobsleigh Run');
  assert.ok(!/olympic|ring/i.test(JSON.stringify(bob)), 'no Olympic name or rings');
  assert.ok(!realTracks().some((t) => t.slug === bob.slug), 'not one of the classic tracks');
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

test('a clean start: marbles roll down the starting slope, moving sideways only when they knock into each other', () => {
  const { radius, maxAngle, funnel } = bob.physics.channel;
  // Metres across the channel (its radius shrinks down the funnel).
  const across = (s, l) => {
    const k = Math.min(1, Math.max(0, s) / funnel.length);
    const R = radius + (funnel.radius - radius) * (1 - k * k * (3 - 2 * k));
    return R * Math.sin((l * maxAngle * Math.PI) / 180);
  };
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const sim = race(seed);
    const total = sim.stats.trackMetres;
    // Sideways direction changes in the first 3 s (a jittering field had over 120 a race).
    let flips = 0;
    for (let i = 0; i < 20; i += 1) {
      let last = null;
      for (let f = 1; f < sim.frames.length && sim.frames[f].t <= 3000; f += 1) {
        const a = sim.frames[f - 1];
        const b = sim.frames[f];
        const v = (across(b.p[i] * total, b.l[i]) - across(a.p[i] * total, a.l[i])) / ((b.t - a.t) / 1000);
        if (last !== null && Math.sign(v) !== Math.sign(last) && Math.abs(v) > 0.3 && Math.abs(last) > 0.3) flips += 1;
        last = v;
      }
    }
    assert.ok(flips < 45, `race ${seed}: ${flips} sideways jiggles in the first 3 s`);
  }
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
  // Nearly all at rest, race after race (one race alone can catch a pile still shifting).
  const rests = [777, 778, 779, 780, 781, 782, 783, 784, 785, 786].map((seed) => routeRace(seed).sim.frames.at(-1).v.filter((v) => v < 0.3).length);
  assert.ok(rests.reduce((a, b) => a + b, 0) / rests.length >= 18.5, `on average ${rests.join(', ')} of 20 at rest`);
  assert.ok(Math.min(...rests) >= 15, `only ${Math.min(...rests)} of 20 at rest`);
  // The finishing order is still decided at the line.
  const times = sim.results.map((r) => r.finishTimeMs);
  assert.deepEqual(times, [...times].sort((x, y) => x - y));
});

// --- step 5: the starting gate ------------------------------------------------

test('the starting gate holds every marble until its own paddle drops, in a quick random ripple', () => {
  const { gate, channel } = bob.physics;
  const orders = new Set();
  for (const seed of [11, 12, 13]) {
    const { sim } = routeRace(seed);
    assert.equal(sim.start.countdownMs, gate.countdownMs);
    const rel = sim.start.releaseMs;
    assert.equal(rel.length, 20);
    assert.ok(rel.every((t) => t >= 0 && t <= channel.funnel.release * 1000), 'all gone within the ripple');
    orders.add(JSON.stringify(rel.map((t, i) => i).sort((a, b) => rel[a] - rel[b])));
    for (const f of sim.frames) {
      for (let i = 0; i < 20; i += 1) {
        if (f.t < rel[i]) assert.equal(f.p[i], sim.frames[0].p[i], `marble ${i} moved before its paddle dropped`);
      }
    }
  }
  assert.equal(orders.size, 3, 'a different order each race');
});

// --- real races: which engine, and protecting the old ones ---------------------

process.env.DATABASE_URL ||= 'postgres://localhost:1/unused';
const raceService = require('../src/game/raceService');

test('a race runs on the engine its own snapshot names: old races stay classic even if their track gains physics', () => {
  const classicSnapshot = { length_m: 600, lane_count: 4, waypoints: [], obstacles: [] };
  const old = raceService.withSnapshot({ physics: bob.physics, track_snapshot: classicSnapshot });
  assert.equal(old.physics, null, 'decided before the track had physics: classic');
  const fresh = raceService.withSnapshot({ physics: null, track_snapshot: { ...classicSnapshot, physics: bob.physics, engine: 'physics-preview-1' } });
  assert.deepEqual(fresh.physics, bob.physics);
  const lobby = raceService.withSnapshot({ physics: bob.physics, track_snapshot: null });
  assert.deepEqual(lobby.physics, bob.physics, 'not decided yet: the track as it is now');

  const entries = Array.from({ length: 20 }, (_, i) => ({ id: `e${i}`, lane: i, snap_top_speed: 50, snap_acceleration: 50, snap_handling: 50, snap_luck: 50 }));
  const base = { seed: 7, tick_rate_hz: 20, track_slug: bob.slug, length_m: bob.length_m, lane_count: 4, waypoints: bob.waypoints, obstacles: [] };
  const physicsRun = raceService.runSimulation({ ...base, physics: bob.physics }, entries);
  assert.ok(physicsRun.start && physicsRun.stats.bumps > 0, 'new physics: gate and bumps');
  assert.ok(physicsRun.durationMs >= 20_000 && physicsRun.durationMs <= 90_000, 'within the race length rule');
  assert.ok(physicsRun.results.every((r) => r.entryId.startsWith('e')));
  const classicRun = raceService.runSimulation({ ...base, physics: null, length_m: 600, tick_rate_hz: 10 }, entries);
  assert.equal(classicRun.start, undefined);
  assert.equal(classicRun.durationMs, 90_000, 'classic races keep their fixed 90 s');
});

// --- track features: boost pads, speed bumps, obstacles ----------------------

const { bearPaw, SOLID_TYPES } = require('../src/game/trackFeatures');

test('boost pads give marbles on their line a burst of speed', () => {
  const { sim } = routeRace(4242);
  const total = sim.stats.trackMetres;
  assert.ok(sim.stats.features.boost >= 10, `only ${sim.stats.features.boost} boosts`);
  // Over the last pad (into the corkscrew, which nearly everyone takes): speed in
  // and out, compared with the stretch just before it with no pad.
  const pad = bob.physics.features.filter((f) => f.type === 'boost').at(-1);
  const speedAt = (i, at) => sim.frames.find((f) => f.p[i] >= at)?.v[i];
  let gain = 0;
  let before = 0;
  let n = 0;
  for (let i = 0; i < 20; i += 1) {
    const a = speedAt(i, pad.at);
    const b = speedAt(i, pad.at + 10 / total);
    const c = speedAt(i, pad.at - 10 / total);
    if (a === undefined || b === undefined || c === undefined) continue;
    gain += b - a;
    before += a - c;
    n += 1;
  }
  assert.ok(gain / n > before / n + 1.5, `on the pad +${(gain / n).toFixed(2)} m/s, the same distance before it ${(before / n).toFixed(2)} m/s`);
});

test('speed bumps make the field hop', () => {
  const { sim } = routeRace(4242);
  const total = sim.stats.trackMetres;
  for (const bump of bob.physics.features.filter((f) => f.type === 'bump')) {
    let hopped = 0;
    for (let i = 0; i < 20; i += 1) {
      const over = sim.frames.filter((f) => f.p[i] > bump.at && f.p[i] < bump.at + 12 / total);
      if (over.some((f) => f.h[i] > 0.1)) hopped += 1;
    }
    assert.ok(hopped >= 15, `only ${hopped} of 20 hopped over the bump at ${bump.at}`);
  }
});

test('the obstacles give a few strong moments a race, and never stop anyone', () => {
  const hits = Object.fromEntries(SOLID_TYPES.map((t) => [t, 0]));
  let news = 0;
  const races = 30;
  for (let k = 0; k < races; k += 1) {
    const { sim } = routeRace(30_000 + k * 101);
    for (const t of SOLID_TYPES) hits[t] += sim.stats.features[t];
    news += sim.events.filter((e) => SOLID_TYPES.includes(e.obstacle)).length;
    assert.equal(sim.stats.unfinished, 0, 'every marble finishes');
    assert.ok(sim.stats.winnerMs > 40_000 && sim.stats.winnerMs < 60_000, `winner in ${sim.stats.winnerMs} ms`);
    assert.ok(sim.stats.lastMs < 75_000, `last home in ${sim.stats.lastMs} ms`);
  }
  for (const [t, n] of Object.entries(hits)) {
    const each = n / races / bob.physics.features.filter((f) => f.type === t).length;
    assert.ok(each >= 0.8 && each <= 8, `${t}: ${each.toFixed(1)} hits a race`);
  }
  assert.ok(news / races >= 5, 'the hits make the commentary');
});

test('the polar bear swipes on a fixed timetable, the same for everyone', () => {
  assert.equal(bearPaw(0), 0);
  assert.ok(bearPaw(0.45) > 0.99); // full stretch halfway through a swipe
  assert.equal(bearPaw(1.5), 0); // resting between swipes
  assert.equal(bearPaw(0.3), bearPaw(0.3 + 2.6)); // every 2.6 s
});
