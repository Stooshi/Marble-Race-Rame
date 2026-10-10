'use strict';

// The track kit: a track file becomes a finished track, built from proven
// parts, and a file that breaks the track recipe is refused with a plain reason.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const kit = require('../src/trackKit');
const { physicsTrack, PHYSICS_TRACKS } = require('../src/game/physicsTracks');
const { ALL_SOLID_TYPES } = require('../src/game/trackFeatures');
const { simulatePhysicsRace } = require('../src/game/physicsSimulator');
const { houseField } = require('../scripts/race-fingerprints');

const {
  track, plunge, straight, climb, sBends, sweep, spiral, hairpin, splitter,
  block, pileUp, curtain, swipe, parked, slalom, peg, bump, boost, moguls, steps, waterfall,
} = kit;

const proving = physicsTrack('kit-proving-ground');
const bob = physicsTrack('bobsleigh-run');
const tm = physicsTrack('table-mountain-run');

// A small valid track to break one rule at a time.
const base = () => ({
  slug: 'recipe-check', name: 'Recipe Check',
  sections: [
    { name: 'Plunge', shape: plunge(80, { grade: 0.8 }) },
    { name: 'Bends', shape: sBends() },
    { name: 'Sweep', shape: sweep({ side: 'right' }), billboards: 2 },
    { name: 'Run to the hairpin', shape: straight(45, { grade: 0.2 }), billboards: 2 },
    { name: 'Hairpin', shape: hairpin({ side: 'left' }) },
    { name: 'Final plunge', shape: plunge(60, { grade: 0.28 }) },
  ],
});
const refused = (spec, words) => assert.throws(() => track(spec), (err) => {
  assert.match(err.message, words);
  return true;
});

test('a valid track file builds, and ends with a run-in to the finish', () => {
  const t = track(base());
  assert.equal(t.physics.kit.sections.at(-1).name, 'Finish');
  assert.equal(t.physics.kit.sections.at(-1).shape, 'runIn');
  assert.ok(t.waypoints.length > 50);
});

test('every kit track opens with Bobsleigh Run\'s starting ramp, gate, channel and collisions', () => {
  for (const t of PHYSICS_TRACKS.filter((x) => x.physics.kit)) {
    assert.equal(t.sections[0].name, 'Starting ramp');
    assert.deepEqual(t.physics.channel, tm.physics.channel);
    assert.deepEqual(t.physics.gate, bob.physics.gate);
    assert.equal(t.physics.collisions, true);
    assert.equal(t.physics.surface, 'ice', 'every surface races as fast as ice');
    assert.deepEqual(t.physics.runout, tm.physics.runout);
  }
});

test('kit obstacles race as proven types, with the proven footprints; costumes are looks only', () => {
  const proven = new Set([...ALL_SOLID_TYPES, 'boost', 'bump', 'cobbles']);
  for (const f of proving.physics.features) assert.ok(proven.has(f.type), `${f.type} is a proven type`);
  const panda = proving.physics.features.filter((f) => f.look === 'panda');
  const baboons = tm.physics.features.filter((f) => f.look === 'baboon');
  assert.deepEqual(panda.map((f) => [f.type, f.l, f.radius, f.height]), baboons.map((f) => [f.type, f.l, f.radius, f.height]));
  const cat = proving.physics.features.find((f) => f.look === 'elephant');
  const elephant = tm.physics.features.find((f) => f.look === 'elephant');
  for (const k of ['type', 'l', 'reach', 'radius', 'height', 'parked', 'loss']) assert.equal(cat[k], elephant[k], k);
  const zebras = proving.physics.features.find((f) => f.look === 'zebras');
  const tmZebras = tm.physics.features.find((f) => f.look === 'zebras');
  for (const k of ['type', 'l', 'l2', 'radius', 'parked', 'loss']) assert.equal(zebras[k], tmZebras[k], k);
});

test('the race engine never reads the looks: a kit track races identically without them', () => {
  const plain = JSON.parse(JSON.stringify(proving));
  delete plain.physics.kit;
  delete plain.physics.look;
  for (const f of plain.physics.features) delete f.look;
  for (const seed of [11, 222]) {
    const entries = houseField(seed);
    assert.equal(JSON.stringify(simulatePhysicsRace({ seed, track: proving, entries })), JSON.stringify(simulatePhysicsRace({ seed, track: plain, entries })));
  }
});

test('positions are per section: an obstacle at 0.37 of the hairpin stands 37% of the way round it', () => {
  const s = proving.physics.kit.sections.find((x) => x.name === 'Hairpin');
  const cat = proving.physics.features.find((f) => f.look === 'elephant');
  assert.ok(Math.abs(cat.at - (s.from + 0.37 * (s.to - s.from))) < 1e-4);
});

test('the high line is the outside of the bend: a left hairpin\'s swipe stands on the right wall', () => {
  const cat = proving.physics.features.find((f) => f.look === 'elephant');
  assert.ok(cat.l < 0 && cat.reach < 0);
});

test('the one sharp bend gets its braking zone on the straight before it, automatically', () => {
  const run = proving.physics.kit.sections.find((x) => x.name === 'Drop to the hairpin');
  const zone = proving.physics.features.find((f) => f.type === 'cobbles' && f.at > run.from && f.at < run.to);
  assert.ok(zone, 'braking zone placed');
  assert.equal(zone.drag, 0.004);
  assert.equal(zone.length, 35);
});

test('a splitter carries proven channel settings, wedge on the straight in, rejoining on the merge', () => {
  // A splitter starts from Table Mountain Run's proven settings…
  const { fork: proven } = kit.splitter({ side: 'left' });
  const t0 = tm.physics.forks[0];
  assert.deepEqual(
    proven,
    { radius: t0.radius, apart: t0.apart, tipOffset: t0.tipOffset, left: { drag: 1, scrub: t0.insideScrub }, right: { drag: t0.outsideDrag, scrub: 1 } },
  );
  // …and `balance` tunes each channel once the track report says so (Kit Proving Ground's).
  const [fork] = proving.physics.forks;
  assert.deepEqual(fork.left, { drag: 2.5, scrub: 2.5 });
  assert.deepEqual(fork.right, { drag: 0.3, scrub: 0.5 });
  assert.equal(fork.tipOffset, t0.tipOffset);
  const s = proving.physics.kit.sections.find((x) => x.name === 'Rock splitter');
  assert.ok(fork.from > s.from && fork.to < s.to && fork.from < fork.to);
});

test('Kit Proving Ground races within the recipe\'s limits, every marble home, the same seed the same race', () => {
  const seed = 4242;
  assert.equal(JSON.stringify(simulatePhysicsRace({ seed, track: proving, entries: houseField(seed) })), JSON.stringify(simulatePhysicsRace({ seed, track: proving, entries: houseField(seed) })));
  for (let k = 0; k < 8; k += 1) {
    const s = 80_000 + k * 7919;
    const sim = simulatePhysicsRace({ seed: s, track: proving, entries: houseField(s) });
    assert.ok(sim.stats.winnerMs / 1000 > 40 && sim.stats.winnerMs / 1000 < 60, `winner ${sim.stats.winnerMs / 1000} s`);
    assert.ok(sim.stats.lastMs / 1000 < 85, `last ${sim.stats.lastMs / 1000} s`);
    assert.ok(sim.results.every((r) => Number.isFinite(r.finishTimeMs)), 'every marble finishes');
  }
});

test('Kit Proving Ground is never raceable: no data update adds it, so only the preview shows it', () => {
  const dir = path.resolve(__dirname, '../docs/data_updates');
  for (const f of fs.readdirSync(dir)) assert.ok(!fs.readFileSync(path.join(dir, f), 'utf8').includes('kit-proving-ground'), f);
});

test('the database-update generator works for kit tracks', () => {
  const sql = execFileSync(process.execPath, [path.resolve(__dirname, '../scripts/physics-track-sql.js'), 'kit-proving-ground', '--add-hidden', 'A test.'], { encoding: 'utf8' });
  assert.match(sql, /kit-proving-ground/);
  assert.match(sql, /is_active/);
});

// ── The recipe, refused rule by rule ───────────────────────────────────────

test('refused: a start without a big steep plunge', () => {
  const s = base();
  s.sections[0] = { name: 'Plunge', shape: straight(80) };
  refused(s, /first section must be a big steep plunge/);
});

test('refused: a second sharp bend', () => {
  const s = base();
  s.sections.splice(5, 0, { name: 'Run on', shape: straight(50, { grade: 0.2 }) }, { name: 'Second hairpin', shape: hairpin({ side: 'right' }) });
  refused(s, /"Second hairpin": a second sharp bend/);
});

test('refused: a sharp bend with no straight before it for the braking zone', () => {
  const s = base();
  s.sections.splice(3, 1);
  s.sections[2].billboards = 4;
  refused(s, /"Hairpin": the section before the sharp bend must be a straight/);
});

test('refused: a spiral or sweep too tight to flow', () => {
  const s = base();
  s.sections.splice(5, 0, { name: 'Tight spiral', shape: spiral({ side: 'right', radius: 30 }) });
  refused(s, /spiral needs a radius of at least 40 m/);
  const w = base();
  w.sections[2].shape = sweep({ side: 'right', radius: 40 });
  refused(w, /sweep needs a radius of at least 45 m/);
});

test('refused: a dead-flat stretch, and climbs beyond what is proven', () => {
  const s = base();
  s.sections.splice(1, 0, { name: 'Flat', shape: straight(30, { grade: 0 }) });
  refused(s, /"Flat": a dead-flat stretch/);
  const c = base();
  c.sections.splice(1, 0, { name: 'Wall', shape: climb(30, { grade: -0.2 }) });
  refused(c, /"Wall": a climb steeper than any proven one/);
  const l = base();
  l.sections.splice(1, 0, { name: 'Long climb', shape: climb(60) });
  refused(l, /"Long climb": a climb longer than any proven one/);
});

test('a climb rounds off over the top, and its single level crest step is allowed', () => {
  const s = base();
  s.sections.splice(2, 0, { name: 'Climb', shape: climb(30, { grade: -0.12, after: 0.3 }) });
  assert.doesNotThrow(() => track(s));
});

test('refused: too few or too many billboards, or billboards at the sharp bend', () => {
  const few = base();
  few.sections[2].billboards = 1;
  refused(few, /3 billboards; every track has 4 to 6/);
  const many = base();
  many.sections[2].billboards = 5;
  refused(many, /7 billboards/);
  const bend = base();
  bend.sections[4].billboards = 1;
  bend.sections[3].billboards = 1;
  refused(bend, /no billboards at the sharp bend or the finish/);
});

test('refused: an obstacle just before the finish line or right at the gate', () => {
  const s = base();
  s.sections.push({ name: 'Finish', shape: kit.runIn(), obstacles: [block({ costume: 'camel', at: 0.5 })] });
  refused(s, /"Finish": a block within 25 m of the finish line/);
  const g = base();
  g.sections[0].obstacles = [pileUp({ costume: 'panda', at: 0.1 })];
  refused(g, /within 25 m of the gate/);
});

test('refused: obstacles and features not made with the kit, and an unclear high line', () => {
  const s = base();
  s.sections[1].obstacles = [{ type: 'ice_block', at: 0.5 }];
  refused(s, /obstacles must come from the kit/);
  const h = base();
  h.sections[1].obstacles = [curtain({ costume: 'surfer' })];
  refused(h, /"Bends": say which side/);
});

test('refused: two sections with the same name', () => {
  const s = base();
  s.sections[1].name = 'Plunge';
  refused(s, /two sections share this name/);
});

test('every problem is reported at once, each naming its section', () => {
  const s = base();
  s.sections[0] = { name: 'Plunge', shape: straight(80) };
  s.sections[2].billboards = 0;
  assert.throws(() => track(s), (err) => err.problems.length >= 2);
});

test('the other kit obstacles build: block lines, curtain and parked sides', () => {
  const s = base();
  s.sections[5].obstacles = [block({ costume: 'cow', at: 0.3, line: 'left' })];
  [s.sections[2].billboards, s.sections[3].billboards] = [4, 0]; // (no room beside three obstacles)
  s.sections[3].obstacles = [curtain({ costume: 'easel', side: 'left' }), swipe({ costume: 'falcon', side: 'right' }), parked({ costume: 'vespa', at: 0.1, side: 'right' })];
  s.sections[1].features = [bump(), boost()];
  s.sections.splice(2, 0, { name: 'Split', shape: splitter({ side: 'right' }) });
  const t = track(s);
  const by = (look) => t.physics.features.find((f) => f.look === look);
  assert.equal(by('cow').l, 0.35);
  assert.equal(by('vespa').type, 'bus');
  assert.ok(by('vespa').l < 0);
  assert.equal(by('easel').l, 1);
  assert.ok(by('falcon').l < 0);
  const t1 = tm.physics.forks[1];
  assert.deepEqual(t.physics.forks[0].left, { drag: 1, scrub: t1.insideScrub });
  assert.deepEqual(t.physics.forks[0].right, { drag: t1.outsideDrag, scrub: 1 });
  assert.equal(t.physics.forks[0].tipOffset, t1.tipOffset);
});

// ── Step 2: per-channel splitters, slalom gates, parked objects, hops ─────

test('a splitter with each channel\'s ice set on its own races exactly like the inside/outside form', () => {
  const conv = JSON.parse(JSON.stringify(tm));
  conv.physics.forks = conv.physics.forks.map(({ insideScrub, outsideDrag, ...f }) => ({ ...f, left: { drag: 1, scrub: insideScrub }, right: { drag: outsideDrag, scrub: 1 } }));
  for (const seed of [5, 77]) {
    const entries = houseField(seed);
    assert.equal(JSON.stringify(simulatePhysicsRace({ seed, track: tm, entries })), JSON.stringify(simulatePhysicsRace({ seed, track: conv, entries })));
  }
});

test('a balance setting overrides one channel\'s ice and keeps the rest proven', () => {
  const s = base();
  s.sections.splice(2, 0, { name: 'Split', shape: splitter({ side: 'left', balance: { tipOffset: 0.4, right: { drag: 0.9 } } }) });
  const [fork] = track(s).physics.forks;
  assert.equal(fork.tipOffset, 0.4);
  assert.deepEqual(fork.right, { drag: 0.9, scrub: 1 });
  assert.deepEqual(fork.left, { drag: 1, scrub: 1 });
});

test('slalom gates: poles alternating either side of the middle, evenly along the stretch', () => {
  const poles = proving.physics.features.filter((f) => f.type === 'slalom_gate' && f.look === 'slalom-gate');
  assert.equal(poles.length, 4);
  assert.deepEqual(poles.map((p) => p.l), [0.3, -0.3, 0.3, -0.3]);
  const gaps = poles.slice(1).map((p, k) => p.at - poles[k].at);
  assert.ok(Math.max(...gaps) - Math.min(...gaps) < 2e-4);
  for (const p of poles) assert.equal(p.sweep, true);
});

test('slalom gates and pegs glance marbles aside: about a tenth of their speed per hit, never a stop', () => {
  let hits = 0;
  const lost = [];
  for (let k = 0; k < 6; k += 1) {
    const seed = 60_000 + k * 7919;
    const sim = simulatePhysicsRace({ seed, track: proving, entries: houseField(seed) });
    hits += sim.stats.features.slalom_gate;
    for (const ev of sim.events.filter((e) => e.obstacle === 'slalom_gate')) {
      const i = sim.frames.findIndex((f) => f.t > ev.t);
      if (i > 0) lost.push(1 - sim.frames[i].v[ev.i] / sim.frames[i - 1].v[ev.i]);
    }
  }
  assert.ok(hits > 20, `${hits} pole hits in 6 races`);
  lost.sort((a, b) => a - b);
  assert.ok(lost[lost.length >> 1] < 0.12, `median ${lost[lost.length >> 1]}`);
  assert.ok(lost.at(-1) < 0.3, `worst ${lost.at(-1)}`);
});

test('a race only lists the kit\'s new obstacles on tracks that have them', () => {
  const seed = 9;
  assert.ok(!('slalom_gate' in simulatePhysicsRace({ seed, track: bob, entries: houseField(seed) }).stats.features));
  assert.ok('slalom_gate' in simulatePhysicsRace({ seed, track: proving, entries: houseField(seed) }).stats.features);
});

test('a parked object knocks marbles aside, one hit per marble however much of its flank they scrape', () => {
  const cart = proving.physics.features.find((f) => f.look === 'ore-cart');
  assert.equal(cart.type, 'bus');
  assert.equal(cart.parked, true);
  assert.equal(cart.onePiece, true);
});

test('refused: a parked object on a steep section', () => {
  const s = base();
  s.sections[5].obstacles = [parked({ costume: 'ore-cart', at: 0.4, side: 'left' })];
  refused(s, /"Final plunge": a parked object needs a gentle section/);
  const b = base();
  b.sections[1].obstacles = [parked({ costume: 'dune-buggy', at: 0.4, side: 'left' })];
  refused(b, /a parked object needs a straight/);
});

test('hops stay low on Kit Proving Ground: about 1 m at most, no flying', () => {
  for (let k = 0; k < 6; k += 1) {
    const seed = 90_000 + k * 7919;
    const sim = simulatePhysicsRace({ seed, track: proving, entries: houseField(seed) });
    assert.ok(sim.stats.highestAirMetres <= 1.2, `race ${k + 1}: highest hop ${sim.stats.highestAirMetres} m`);
  }
});

// ── Step 3: waterfalls, moguls, steps, tunnels, bridges ───────────────────

test('refused: a sudden steepening, which throws marbles into the air at speed', () => {
  const s = base();
  s.sections[5].shape = plunge(60, { grade: 0.34 });
  refused(s, /"Final plunge": steepens too suddenly \(from a grade of 0.16 to 0.34\)/);
});

test('refused: steepening twice within 30 m', () => {
  const s = base();
  s.sections.splice(5, 0, { name: 'Short drop', shape: plunge(16, { grade: 0.27 }) });
  s.sections[6].shape = plunge(60, { grade: 0.38 });
  refused(s, /"Final plunge": steepens again only 16 m after the last time/);
});

test('a waterfall\'s lip eases in by itself, a step at a time, and a waterfall can open the track', () => {
  const after = base();
  after.sections.splice(3, 0, { name: 'Falls', shape: waterfall(40, { grade: 0.6 }) });
  refused(after, /"Falls": a waterfall needs a straight of at least 30 m before it/);
  const s = base();
  s.sections.splice(3, 0, { name: 'Pool', shape: kit.straight(30, { grade: 0.12 }) }, { name: 'Falls', shape: waterfall(40, { grade: 0.6, curtain: true }) });
  const t = track(s);
  const falls = t.sections.filter((x) => x.name.startsWith('Falls'));
  assert.ok(falls.length >= 4, 'lip steps before the fall');
  const meta = t.physics.kit.sections.find((x) => x.name === 'Falls');
  assert.deepEqual(meta.waterfall, { curtain: true });
  const open = base();
  open.sections[0] = { name: 'First falls', shape: waterfall(80, { grade: 0.8 }) };
  assert.doesNotThrow(() => track(open));
});

test('moguls and steps: rows of low bumps, steps over a rough, slowing stretch', () => {
  const s = base();
  s.sections.splice(3, 0, { name: 'Mogul straight', shape: kit.straight(70, { grade: 0.18 }), features: [moguls({ from: 0.6, to: 0.95, count: 4 })] });
  s.sections[6].features = [steps({ from: 0.55, to: 0.95, count: 4 })];
  const t = track(s);
  const field = t.physics.kit.sections.find((x) => x.name === 'Mogul straight');
  const fin = t.physics.kit.sections.find((x) => x.name === 'Final plunge');
  assert.equal(t.physics.features.filter((f) => f.type === 'bump' && f.at > field.from && f.at < field.to).length, 4);
  assert.equal(t.physics.features.filter((f) => f.type === 'bump' && f.at > fin.from && f.at < fin.to).length, 4);
  assert.ok(t.physics.features.some((f) => f.type === 'cobbles' && f.look === 'steps'));
});

test('refused: moguls on a bend, or too soon after one', () => {
  const s = base();
  s.sections[1].features = [moguls({ count: 4 })];
  refused(s, /"Bends": moguls on a bend/);
  const soon = base();
  soon.sections[3].features = [steps({ from: 0.1, to: 0.9, count: 5 })];
  refused(soon, /"Run to the hairpin": steps only \d+ m after a bend/);
});

test('refused: a bump just after a block', () => {
  const s = base();
  s.sections[5].obstacles = [block({ costume: 'camel', at: 0.5 })];
  s.sections[5].features = [bump({ at: 0.6 })];
  refused(s, /a bump only \d+ m after a block/);
});

test('refused: moguls too close together, or too many in a row', () => {
  const s = base();
  s.sections[5].features = [moguls({ from: 0.6, to: 0.8, count: 4 })];
  refused(s, /moguls .* m apart; at least 5 m/);
  const m = base();
  m.sections[5].features = [moguls({ from: 0.5, to: 1, count: 9 })];
  refused(m, /9 moguls in a row; at most 8/);
});

test('tunnels and bridges ride along for the 3D view, and are refused where they can\'t go', () => {
  const s = base();
  s.sections[1].tunnel = 'dragon';
  s.sections[2].bridge = 'ice';
  [s.sections[2].billboards, s.sections[5].billboards] = [0, 2]; // (nowhere to stand them on a bridge)
  const t = track(s);
  assert.equal(t.physics.kit.sections[1].tunnel, 'dragon');
  assert.equal(t.physics.kit.sections[2].bridge, 'ice');
  const bad = base();
  bad.sections[1].tunnel = 'castle';
  refused(bad, /unknown tunnel "castle"/);
  const start = base();
  start.sections[0].tunnel = 'mine';
  refused(start, /no tunnel at the start or the finish/);
  const split = base();
  split.sections.splice(2, 0, { name: 'Split', shape: kit.splitter({ side: 'left' }), tunnel: 'rock' });
  refused(split, /no tunnel over a splitter/);
});

test('hops stay about 1 m over moguls, steps and waterfalls on Kit Proving Ground', () => {
  const where = {};
  for (let k = 0; k < 6; k += 1) {
    const seed = 91_000 + k * 7919;
    const sim = simulatePhysicsRace({ seed, track: proving, entries: houseField(seed) });
    for (const f of sim.frames) {
      f.h.forEach((h, i) => {
        const sec = proving.physics.kit.sections.find((x) => f.p[i] >= x.from && f.p[i] < x.to);
        if (sec) where[sec.name] = Math.max(where[sec.name] ?? 0, h);
      });
    }
  }
  for (const [name, h] of Object.entries(where)) assert.ok(h <= 1.2, `${name}: hops ${h.toFixed(2)} m`);
});

test('scenery names are checked: surfaces, biomes, landmarks and lifts must be known', () => {
  const ok = base();
  ok.surface = 'snow';
  ok.biome = 'alpine';
  ok.start = { landmark: 'mountain-hut' };
  ok.sections[1].surface = 'stone';
  ok.sections[1].landmarks = [{ name: 'church', side: 'left' }];
  ok.sections[1].overhead = ['chairlift'];
  const t = kit.track(ok);
  assert.equal(t.physics.look, 'snow');
  assert.equal(t.physics.kit.sections[1].surface, 'stone');
  for (const [change, message] of [
    [(s) => { s.surface = 'lava'; }, /unknown surface "lava"/],
    [(s) => { s.biome = 'moon'; }, /unknown biome "moon"/],
    [(s) => { s.finish = { landmark: 'castle' }; }, /unknown landmark "castle"/],
    [(s) => { s.sections[1].overhead = ['zeppelin']; }, /unknown lift "zeppelin"/],
  ]) {
    const bad = base();
    change(bad);
    refused(bad, message);
  }
});

test('billboards: numbered slots down the track, on the outside of a sweep, clear of obstacles and the line', () => {
  const t = track(base());
  const boards = t.physics.kit.billboards;
  assert.deepEqual(boards.map((b) => b.slot), [1, 2, 3, 4]);
  assert.deepEqual(boards.map((b) => b.section), ['Sweep', 'Sweep', 'Run to the hairpin', 'Run to the hairpin']);
  assert.ok(boards.every((b, k) => k === 0 || b.at > boards[k - 1].at), 'in order down the track');
  assert.deepEqual(boards.slice(0, 2).map((b) => b.side), [1, 1], 'a right-hand sweep: on its outside, the left');
  assert.ok(boards.every((b) => b.frame === 'plain'));
  // Nudged clear of an obstacle where one would stand beside it.
  const s = base();
  s.sections[3].obstacles = [kit.block({ at: 0.33 })];
  const nudged = track(s).physics.kit.billboards.filter((b) => b.section === 'Run to the hairpin');
  const block = track(s).physics.features.find((f) => f.type === 'ice_block');
  for (const b of nudged) assert.ok(Math.abs(b.at - block.at) * track(s).length_m >= 12);
  // Refused where they can't stand, or with a frame the view can't draw.
  for (const [change, message] of [
    [(x) => { x.sections[1].tunnel = 'mine'; x.sections[1].billboards = 1; x.sections[2].billboards = 1; }, /no billboards in a tunnel or on a bridge/],
    [(x) => { x.sections[4].billboards = 1; x.sections[3].billboards = 1; }, /no billboards at the sharp bend|billboards stand along/],
    [(x) => { x.billboardFrame = 'neon'; }, /unknown billboard frame "neon"/],
    [(x) => { x.sections[3].obstacles = [kit.slalom({ from: 0.05, to: 0.95, count: 9 })]; }, /no room for billboard/],
  ]) {
    const bad = base();
    change(bad);
    refused(bad, message);
  }
});

test('the billboards route picks each slot\'s image: most specific first, then the newest', () => {
  const { pickImages } = require('../src/routes/billboards');
  const row = (track_slug, slot, image_url, starts_at = '2026-10-01') => ({ track_slug, slot, image_url, kind: 'own', starts_at });
  const picked = pickImages([
    row(null, null, 'https://x/everywhere.png'),
    row(null, 2, 'https://x/slot2-all-tracks.png'),
    row('are-run', null, 'https://x/are-old.png', '2026-09-01'),
    row('are-run', null, 'https://x/are-new.png', '2026-10-05'),
    row('are-run', 3, 'https://x/are-3.png'),
    row('are-run', 4, 'http://x/not-https.png'),
  ], 'are-run');
  const bySlot = Object.fromEntries(picked.map((p) => [p.slot, p.image_url]));
  assert.equal(bySlot[1], 'https://x/are-new.png');
  assert.equal(bySlot[2], 'https://x/are-new.png', 'this track beats this slot on every track');
  assert.equal(bySlot[3], 'https://x/are-3.png');
  assert.equal(bySlot[4], 'https://x/are-new.png', 'never an image that is not https');
  assert.deepEqual(pickImages([], 'are-run'), [], 'nothing set: the built-in promotions');
  assert.equal(pickImages([row(null, 2, 'https://x/a.png')], 'other')[0].slot, 2);
});

test('lighting: the track\'s own preset and the variants it allows, picked per race from its seed', () => {
  const lighting = require('../src/trackKit/lighting');
  const s = base();
  s.lighting = 'night-northern-lights';
  s.variants = ['snow', 'fog'];
  const t = track(s);
  assert.equal(t.physics.kit.lighting, 'night-northern-lights');
  assert.deepEqual(lighting.allowedLightings(t.physics.kit), ['night-northern-lights', 'snow', 'fog']);
  const picks = Array.from({ length: 4000 }, (_, k) => lighting.chooseLighting(t.physics.kit, k * 7919 + 13));
  const share = (name) => picks.filter((p) => p === name).length / picks.length;
  assert.ok(Math.abs(share('night-northern-lights') - 0.5) < 0.04, 'its own preset half the time');
  assert.ok(Math.abs(share('snow') - 0.25) < 0.04 && Math.abs(share('fog') - 0.25) < 0.04);
  assert.equal(lighting.chooseLighting(t.physics.kit, 12345), lighting.chooseLighting(t.physics.kit, 12345), 'the same seed, the same look');
  // Written into the race's snapshot; nothing the engine reads changes, and other tracks are untouched.
  const raced = lighting.withLighting(t.physics, 12345);
  assert.deepEqual({ ...raced, kit: undefined }, { ...t.physics, kit: undefined });
  assert.ok(lighting.allowedLightings(t.physics.kit).includes(raced.kit.lighting));
  assert.equal(lighting.withLighting(tm.physics, 1), tm.physics);
  // A track that allows no variants always races in its own preset.
  assert.equal(lighting.chooseLighting(track(base()).physics.kit, 99), 'day');
  for (const [change, message] of [
    [(x) => { x.lighting = 'dusk'; }, /unknown lighting "dusk"/],
    [(x) => { x.variants = ['hail']; }, /unknown lighting variant "hail"/],
    [(x) => { x.variants = ['snow', 'snow']; }, /each lighting variant once/],
    [(x) => { x.variants = ['day']; }, /each lighting variant once, and not the track's own preset/],
  ]) {
    const bad = base();
    change(bad);
    refused(bad, message);
  }
});

test('the mirror tool: every bend the other way, everything across the channel on the other side, splitter ice swapped', () => {
  const original = physicsTrack('kit-proving-ground');
  const m = physicsTrack('kit-proving-ground-mirrored');
  assert.equal(m.physics.kit.mirrorOf, 'kit-proving-ground');
  assert.equal(m.length_m, original.length_m);
  m.waypoints.forEach((p, i) => {
    assert.equal(p.x, original.waypoints[i].x);
    assert.equal(p.y, original.waypoints[i].y === 0 ? 0 : -original.waypoints[i].y);
    assert.equal(p.z, original.waypoints[i].z);
  });
  m.physics.features.forEach((f, i) => {
    const o = original.physics.features[i];
    assert.equal(f.type, o.type);
    assert.equal(f.at, o.at);
    for (const k of ['l', 'l2', 'reach']) if (k in o) assert.equal(f[k], o[k] === 0 ? 0 : -o[k]);
  });
  const [fo, fm] = [original.physics.forks[0], m.physics.forks[0]];
  assert.deepEqual(fm.left, fo.right);
  assert.deepEqual(fm.right, fo.left);
  assert.equal(fm.tipOffset, -fo.tipOffset);
  assert.deepEqual(m.physics.kit.billboards.map((b) => b.side), original.physics.kit.billboards.map((b) => -b.side));
  // Mirrored twice: the original again (apart from its name).
  const back = kit.mirror(m, { slug: original.slug, name: original.name });
  const strip = (t) => ({ ...t, description: null, physics: { ...t.physics, kit: { ...t.physics.kit, mirrorOf: null, mirrored: null } } });
  assert.deepEqual(strip(back), strip(original));
  // Only kit tracks (their scenery is all built from the file), each with a slug of its own.
  assert.throws(() => kit.mirror(tm, { slug: 'x', name: 'X' }), /track kit/);
  assert.throws(() => kit.mirror(original, { slug: original.slug, name: 'X' }), /slug of its own/);
  // Each mirror is its own track: own slug and name, so its own records.
  assert.notEqual(m.slug, original.slug);
  assert.notEqual(m.name, original.name);
});

test('a mirrored track races as a mirror: the field rides the other wall through every bend', () => {
  const sides = (t) => {
    const out = {};
    for (const seed of [3, 4]) {
      const r = simulatePhysicsRace({ seed, track: t, entries: houseField(seed), level: 3 });
      for (const f of r.frames) {
        f.p.forEach((p, i) => {
          for (const name of ['Bay sweep', 'Hairpin', 'Spiral']) {
            const s = t.physics.kit.sections.find((x) => x.name === name);
            if (p >= s.from && p < s.to && !f.b[i]) (out[name] ??= []).push(f.l[i]);
          }
        });
      }
    }
    return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length]));
  };
  const a = sides(physicsTrack('kit-proving-ground'));
  const b = sides(physicsTrack('kit-proving-ground-mirrored'));
  for (const name of Object.keys(a)) {
    assert.ok(Math.abs(a[name]) > 0.3, `${name} rides a wall`);
    assert.ok(Math.sign(a[name]) === -Math.sign(b[name]) && Math.abs(a[name] + b[name]) < 0.15, `${name}: ${a[name].toFixed(2)} vs ${b[name].toFixed(2)}`);
  }
});

test('Åre Run is added by its data update, switched off, exactly as its track file builds it', () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'docs', 'data_updates', '2026-10-15-add-are-run.sql'), 'utf8');
  const note = 'Åre Run (Sweden): a winter-evening race down Åreskutan under the northern lights, the first track built with the track kit.';
  const generated = execFileSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'physics-track-sql.js'), 'are-run', '--add-hidden', note], { encoding: 'utf8' });
  assert.equal(sql, generated);
  assert.match(sql, /is_active|false/);
});

// The kit tracks after Åre Run, each added switched off by its own data update.
const HIDDEN_KIT_TRACKS = [
  ['portes-du-soleil-run', '2026-10-16-add-portes-du-soleil-run.sql', 'Portes du Soleil Run (France and Switzerland): from Avoriaz across the border and down the Swiss Wall to a Swiss village, built with the track kit.'],
  ['park-city-run', '2026-10-17-add-park-city-run.sql', 'Park City Run (Utah, USA): down the Wasatch past old silver-mine relics and through a timbered mine tunnel to Main Street, built with the track kit.'],
  ['baqueira-beret-run', '2026-10-18-add-baqueira-beret-run.sql', 'Baqueira-Beret Run (Spain): a sunny Pyrenees run round a Romanesque bell tower to a stone village in the Val d\'Aran, built with the track kit.'],
  ['greenland-expedition', '2026-10-19-add-greenland-expedition.sql', 'Greenland Expedition: from a base camp on the ice sheet over a crevasse and through an ice cave to the icefjord harbour of Ilulissat, under the midnight sun, built with the track kit.'],
  ['paris-eiffel-tower-run', '2026-10-20-add-paris-eiffel-tower-run.sql', 'Paris Eiffel Tower Run: from Montmartre through the Arc de Triomphe and round the Concorde obelisk to the Seine and the Eiffel Tower, in daylight only, built with the track kit.'],
  ['dubai-twister', '2026-10-21-add-dubai-twister.sql', 'Dubai Twister: from the red desert dunes past an oasis into futuristic Dubai, round the twisting tower and down to the Palm, built with the track kit.'],
  ['amazon-water-run', '2026-10-22-add-amazon-water-run.sql', 'Amazon Water Run: down a jungle river and over two waterfalls, past a sloth, a river dolphin and a caiman, to a village on stilts, built with the track kit.'],
  ['rio-jungle-rumble', '2026-10-23-add-rio-jungle-rumble.sql', 'Rio Jungle Rumble: from the Tijuca jungle below Corcovado (its figure only a distant, stylised silhouette), past an anaconda and down the Selarón Steps, to Copacabana beach, built with the track kit.'],
  ['china-wall-twister', '2026-10-24-add-china-wall-twister.sql', 'China Wall Twister: along the Great Wall over the ridges, across a Go and Xiangqi board, past a waving fortune cat and through a dragon (in at its tail, out of its mouth), to the Temple of Heaven, built with the track kit.'],
];
for (const [slug, file, note] of HIDDEN_KIT_TRACKS) {
  test(`${slug} is added by its data update, switched off, exactly as its track file builds it`, () => {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'docs', 'data_updates', file), 'utf8');
    const generated = execFileSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'physics-track-sql.js'), slug, '--add-hidden', note], { encoding: 'utf8' });
    assert.equal(sql, generated);
    assert.match(sql, /is_active|false/);
  });
}
