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
    // (The funnel-drop and staggered-drop openings change the gate's funnel, a half-pipe widens its stretch; everything else is Table Mountain Run's.)
    const { funnel, wides, ...channel } = t.physics.channel;
    const { funnel: tmFunnel, ...tmChannel } = tm.physics.channel;
    assert.deepEqual(channel, tmChannel);
    // (The staggered drop and the varied starts let the field go in waves: their funnel has that one setting more.)
    const { waves, ...rest } = funnel;
    if (waves) assert.ok(['staggered-drop', 'clean-drop', 'peg-drop', 'pipe-drop'].includes(t.physics.kit.opening), `${t.slug}: waves at the gate`);
    if (!['funnel-drop', 'staggered-drop'].includes(t.physics.kit.opening)) assert.deepEqual(rest, tmFunnel);
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

test('refused: a start that is neither a library opening nor a big steep plunge', () => {
  const s = base();
  s.sections[0] = { name: 'Plunge', shape: straight(80) };
  refused(s, /must open with a proven opening from the library/);
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
  const script = path.join(__dirname, '..', 'scripts', 'physics-track-sql.js');
  assert.match(sql, /is_active|false/);
  // Later data updates (already run live, so the add is never edited): the latest gives the track in code.
  const dir = path.join(__dirname, '..', 'docs', 'data_updates');
  const later = fs.readdirSync(dir).filter((f) => f > '2026-10-15-add-are-run.sql' && f.slice(11).startsWith('are-run-')).sort();
  if (!later.length) {
    assert.equal(sql, execFileSync(process.execPath, [script, 'are-run', '--add-hidden', note], { encoding: 'utf8' }));
    return;
  }
  const body = (x) => x.slice(x.indexOf('UPDATE tracks'));
  assert.equal(body(fs.readFileSync(path.join(dir, later.at(-1)), 'utf8')), body(execFileSync(process.execPath, [script, 'are-run', '--retune'], { encoding: 'utf8' })), `${later.at(-1)} no longer gives the track in code`);
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
  ['dubai-marble-grand-prix', '2026-10-25-add-dubai-marble-grand-prix.sql', 'Dubai Marble Grand Prix: a night race through downtown Dubai under floodlights, from beside the Burj Khalifa past the dancing fountain and round the Museum of the Future to the Marina, the first Grand Prix track.'],
  ['sydney-marble-grand-prix', '2026-10-26-add-sydney-marble-grand-prix.sql', 'Sydney Marble Grand Prix: a harbour race from the top of the Harbour Bridge arch, through The Rocks and round a stylised Opera House to a grandstand finish at Circular Quay.'],
  ['istanbul-marble-grand-prix', '2026-10-27-add-istanbul-marble-grand-prix.sql', 'Istanbul Marble Grand Prix: from the Galata Tower down to the Golden Horn, round a tulip garden, past Hagia Sophia and the Blue Mosque and through the Grand Bazaar\'s vaulted halls to the Bosphorus.'],
  ['lagos-marble-grand-prix', '2026-10-28-add-lagos-marble-grand-prix.sql', 'Lagos Marble Grand Prix: a loud, colourful race across Lagos, through a busy market and over the lagoon on a long bridge to the National Theatre.'],
  ['nairobi-marble-grand-prix', '2026-10-29-add-nairobi-marble-grand-prix.sql', 'Nairobi Marble Grand Prix: from the KICC tower through Uhuru Park and downtown, along the national park fence with giraffes and zebras grazing, to a grandstand finish on the plains.'],
  ['stockholm-marble-grand-prix', '2026-10-30-add-stockholm-marble-grand-prix.sql', 'Stockholm Marble Grand Prix: a home race across the islands and bridges, down the Sodermalm cliffs, through Gamla Stan, over the water past City Hall and round Djurgarden to the steamboats on Strandvagen.'],
  ['delhi-red-fort-marble-grand-prix', '2026-10-31-add-delhi-red-fort-marble-grand-prix.sql', 'Delhi Red Fort Marble Grand Prix: from the ramparts of the Red Fort and out under its great gateway, through Chandni Chowk and past the Jama Masjid, down the ceremonial avenue to India Gate.'],
  ['sahara-marble-grand-prix', '2026-11-01-add-sahara-marble-grand-prix.sql', 'Sahara Marble Grand Prix: a desert circuit from a kasbah down through dunes, an oasis splitter and a canyon to a mud mosque finish'],
  ['elderglade-marble-grand-prix', '2026-11-02-add-elderglade-marble-grand-prix.sql', 'Elderglade Marble Grand Prix: an enchanted elven forest from a tree platform through ferns and a waterfall, round the Great Tree to a clearing of glowing flowers'],
  ['frostmere-marble-grand-prix', '2026-11-03-add-frostmere-marble-grand-prix.sql', 'Frostmere Marble Grand Prix: a snowy fairy-tale kingdom by night, from the castle bridge across a frozen lake and through the ice palace hall into its courtyard under the northern lights'],
  ['wyrmwood-hollow-marble-grand-prix', '2026-11-04-add-wyrmwood-hollow-marble-grand-prix.sql', 'Wyrmwood Hollow Marble Grand Prix: a valley of ancient ruins where an old dragon sleeps, from a ruined castle wall over a chasm bridge and past the dragon to a ruined amphitheatre'],
  ['sognefjord', '2026-11-05-add-sognefjord.sql', 'Sognefjord Coaster, the first Coaster Series track'],
  ['phantom-peak', '2026-11-06-add-phantom-peak.sql', 'Phantom Peak Coaster, a spooky theme park mountain at dusk'],
  ['collserola-run', '2026-11-07-add-collserola-run.sql', 'Collserola Run Coaster, from Tibidabo down to the sea at Barcelona'],
  ['whistler-spins', '2026-11-08-add-whistler-spins.sql', 'Whistler Spins Coaster, a winter coaster spinning down to Whistler Village'],
  ['pyramid-run', '2026-11-09-add-pyramid-run.sql', 'Pyramid Run Coaster, racing between the pyramids of Giza at golden hour'],
  ['ha-long-bay-spins', '2026-11-10-add-ha-long-bay-spins.sql', 'Ha Long Bay Spins Coaster, spinning between the limestone islands of Ha Long Bay'],
  ['hong-kong-crossing', '2026-11-11-add-hong-kong-crossing.sql', 'Hong Kong Crossing Coaster, from Victoria Peak across the sea to the mainland'],
  ['redwood-forest-run', '2026-11-12-add-redwood-forest-run.sql', 'Redwood Forest Run Coaster, weaving between giant redwoods down to the Pacific'],
  ['chiang-mai', '2026-11-21-add-chiang-mai.sql', 'Chiang Mai Coaster, from the golden mountain temple down to the old city'],
  ['okavango-park', '2026-11-22-add-okavango-park.sql', 'Okavango Park Coaster, over the flooded Okavango Delta to a safari lodge on stilts'],
  ['kopaonik-spins', '2026-11-23-add-kopaonik-spins.sql', 'Kopaonik Spins Coaster, spinning down the Kopaonik mountain to a village kolo'],
  ['nanjing', '2026-11-24-add-nanjing.sql', 'Nanjing Coaster, from Purple Mountain past the old city wall to the Yangtze'],
  ['multiball-manor', '2026-11-26-add-multiball-manor.sql', 'Multiball Manor, the first Pinball Series table: a gothic manor at midnight'],
  ['wizard-mode', '2026-11-27-add-wizard-mode.sql', 'Wizard Mode, Pinball Series table 2: a castle under siege'],
  ['flipper-spins', '2026-11-28-add-flipper-spins.sql', 'Flipper Spins, Pinball Series table 3: a stage-magic table in a grand old theatre'],
  ['slingshot-spins', '2026-11-29-add-slingshot-spins.sql', 'Slingshot Spins, Pinball Series table 4: a flying-saucer invasion'],
  ['tilt', '2026-11-30-add-tilt.sql', 'Tilt, Pinball Series table 5: a 1970s diner and pinball parlour.'],
  ['replay', '2026-12-01-add-replay.sql', 'Replay, Pinball Series table 6: a time-warp clocktower table.'],
  ['grand-champion', '2026-12-02-add-grand-champion.sql', 'Grand Champion, Pinball Series table 7: a stadium rock-concert table.'],
  ['joystick-spins', '2026-12-03-add-joystick-spins.sql', 'Joystick Spins, Arcade Series track 2 and the arcade kit\'s proof track: a 1980s arcade hall at night.'],
  ['kill-screen', '2026-12-04-add-kill-screen.sql', 'Kill Screen, Arcade Series track 1: a neon maze at level 256.'],
  ['grand-canyon-burst', '2027-01-06-add-grand-canyon-burst.sql', 'Grand Canyon Burst, the first Canyon Series track: over the South Rim and down through the Grand Canyon, round the horseshoe bend under a glass skywalk.'],
  ['yarlung-tsangpo-spins', '2027-01-07-add-yarlung-tsangpo-spins.sql', 'Yarlung Tsangpo Spins, Canyon Series track 2: down the deepest gorge on Earth, under prayer flags and round the great bend about a snow peak.'],
  ['colca-spin', '2027-01-08-add-colca-spin.sql', 'Colca Spin, Canyon Series track 3: through the Colca Canyon in the Andes, where condors circle, down its ancient terraces.'],
  ['tara-river-spins', '2027-01-09-add-tara-river-spins.sql', 'Tara River Spins, Canyon Series track 4: down the deepest canyon in Europe, on the turquoise Tara under its great arch bridge.'],
  ['copper-spins', '2027-01-10-add-copper-spins.sql', 'Copper Spins, Canyon Series track 5: through Mexico\'s Copper Canyon, hopping from canyon to canyon on timber trestles under a railway trestle.'],
  ['hells-burst', '2027-01-11-add-hells-burst.sql', 'Hells Burst, Canyon Series track 6: through Hells Canyon, the deepest in North America, on timber trestles over dark basalt and down to the whitewater.'],
  ['kali-gandaki-burst', '2027-01-12-add-kali-gandaki-burst.sql', 'Kali Gandaki Burst, Canyon Series track 7: down the Kali Gandaki gorge in Nepal, between two giant snow peaks, under a swaying footbridge.'],
  ['indus-spins', '2027-01-13-add-indus-spins.sql', 'Indus Spins, Canyon Series track 8: along the Indus gorge below Nanga Parbat, out along a ledge high on the cliff face, then a plunge to the river.'],
  ['cotahuasi-free-fall', '2027-01-14-add-cotahuasi-free-fall.sql', 'Cotahuasi Free Fall, Canyon Series track 9: through the Cotahuasi Canyon in Peru, with a free fall beside a tall waterfall.'],
  ['fish-river-burst', '2027-01-15-add-fish-river-burst.sql', 'Fish River Burst, Canyon Series track 10: through the Fish River Canyon in Namibia, down its tight meanders to steaming hot springs.'],
  ['spawn-point', '2027-01-16-add-spawn-point.sql', 'Spawn Point, Block Series track 1: a calm meadow of cubes at dawn, from the spawn beacon past a windmill and over the brook on block pillars to the cottage.'],
  ['speedrun-valley', '2027-01-17-add-speedrun-valley.sql', 'Speedrun Valley, Block Series track 2: long fast straights through a valley of cube hills, over the valley on block pillars and down a long back straight to the line under the split-time board.'],
  ['voxel-peaks', '2027-01-18-add-voxel-peaks.sql', 'Voxel Peaks, Block Series track 3: snowy mountains of cubes, out on tall block pillars over the cube cliffs and down a spiral round a cube peak to a cabin in the snow.'],
  ['deep-mine', '2027-01-19-add-deep-mine.sql', 'Deep Mine, Block Series track 4: underground in a mine of stone blocks, lit by lamps and glowing gem seams, along the cart rails and down the shaft to the cart depot.'],
  ['magma-core', '2027-01-20-add-magma-core.sql', 'Magma Core, Block Series track 5: a dark cave of basalt blocks over glowing magma, lit only by the lava, past lava falls and round a basalt spire.'],
  ['line-clear', '2027-01-21-add-line-clear.sql', 'Line Clear, Block Series track 6: a calm plain of coloured blocks, where walls of block rows beside the track clear their full rows with a flash as the pack passes.'],
  ['combo-drop', '2027-01-22-add-combo-drop.sql', 'Combo Drop, Block Series track 7: step drops down a world of blocks beside stands of lamp rows that light one after another as the pack lands, to the well.'],
  ['the-stack', '2027-01-23-add-the-stack.sql', 'The Stack, Block Series track 8: a spiral high on block pillars round a towering stack of blocks, where new blocks keep dropping onto the top and settling.'],
  ['block-fortress', '2027-01-24-add-block-fortress.sql', 'Block Fortress, Block Series track 9: a castle of stone blocks in green hills, over a drawbridge as it lowers and through a gate whose blocks drop into place as the pack comes.'],
  ['final-level', '2027-01-25-add-final-level.sql', 'Final Level, Block Series track 10: a dusk-blue world of blocks, through a glowing block portal and round the loop to a clean GG that lights once the winner is home.'],
  ['antelope-slot-spins', '2027-01-26-add-antelope-slot-spins.sql', 'Antelope Slot Spins, Canyon Series track 11: down a slot canyon in Arizona, through wavy orange sandstone past shafts of light falling from the rim, round a corkscrew out over the slot to the sandy wash.'],
  ['verdon-burst', '2027-01-27-add-verdon-burst.sql', 'Verdon Burst, Canyon Series track 12: through the Verdon Gorge in Provence, along the cliff road high on the white limestone rim past lavender fields, down beside the turquoise river to the lake.'],
  ['tiger-leaping-spins', '2027-01-28-add-tiger-leaping-spins.sql', 'Tiger Leaping Spins, Canyon Series track 13: down Tiger Leaping Gorge in Yunnan, along roaring rapids under snow peaks, past the great rock in the river, down a white-water cascade and out along the high trail.'],
  ['wadi-mujib-burst', '2027-01-29-add-wadi-mujib-burst.sql', 'Wadi Mujib Burst, Canyon Series track 15: through Wadi Mujib in Jordan, a narrow passage of deep red sandstone filled with a clear stream, past the ladders, round the pool and out to the Dead Sea.'],
  ['waimea-free-fall', '2027-01-30-add-waimea-free-fall.sql', 'Waimea Free Fall, Canyon Series track 14: through Waimea Canyon on Kauai, over green ridges and between walls of red earth, a free fall beside a long waterfall with a rainbow, down to palms by the sea.'],
  ['sky-islands', '2027-01-31-add-sky-islands.sql', 'Sky Islands, Block Series track 11: islands of cubes floating over a sea of cloud, over block bridges from island to island, round a spin and down a waterfall off the last island to a garden.'],
  ['voxel-harbor', '2027-02-01-add-voxel-harbor.sql', 'Voxel Harbor, Block Series track 12: a harbour of blocks at sunset, along the quay past stacked containers, round a spin under a block crane, out along the pier past moored boats and round the basin to the lighthouse.'],
  ['sunstone-temple', '2027-02-02-add-sunstone-temple.sql', 'Sunstone Temple, Block Series track 13: a desert temple of sand-coloured cubes, through a tunnel into its halls, past colonnades, down two long flights of stairs round the courtyard, past the golden sun disc and out through the temple gate.'],
  ['chain-reaction', '2027-02-03-add-chain-reaction.sql', 'Chain Reaction, Block Series track 14: a plain of coloured blocks at night, where long walls of block rows clear in a cascade as the pack passes, each wall setting off the next.'],
  ['bonus-round', '2027-02-04-add-bonus-round.sql', 'Bonus Round, Block Series track 15: a stage world of blocks at night, under checkpoint arches that flash as the leader passes, beside a score wall that fills with lit blocks, round a spin and a long last sweep to a bright final stage.'],
  ['marble-stadium-sprint', '2027-02-05-add-marble-stadium-sprint.sql', 'Marble Stadium Sprint, Track and Field track 1: through the white marble stadium in Athens, in at its open end, down the home straight, round the hairpin at the marble end and back up the far straight.'],
  ['berlin-blue-lanes', '2027-02-07-add-berlin-blue-lanes.sql', 'Track and Field track 2: Berlin Blue Lanes (the blue tartan of Berlin\'s 1936 stadium), added switched off.'],
  ['bislett-mile', '2027-02-08-add-bislett-mile.sql', 'Track and Field track 3: Bislett Mile (the laps on a long spiral, then Bislett\'s tight, steep stadium in Oslo and the bell lap), added switched off.'],
  ['eugene-hurdles', '2027-02-09-add-eugene-hurdles.sql', 'Track and Field track 4: Eugene Hurdles (Hayward Field in Oregon: the hurdles straight, rows of hurdles across the lanes), added switched off.'],
  ['beijing-nest-200', '2027-02-10-add-beijing-nest-200.sql', 'Track and Field track 5: Beijing Nest 200 (under the woven steel nest at night: one long sweeping bend into the home straight), added switched off.'],
  ['tokyo-photo-finish', '2027-02-11-add-tokyo-photo-finish.sql', 'Track and Field track 6: Tokyo Photo Finish (to the National Stadium under its timber roof, down the long straight to a photo finish), added switched off.'],
  ['stockholm-1912-relay', '2027-02-12-add-stockholm-1912-relay.sql', 'Track and Field track 7: Stockholm 1912 Relay (Stockholms Stadion\'s red-brown brick: four legs with their exchange zones), added switched off.'],
  ['london-steeplechase', '2027-02-13-add-london-steeplechase.sql', 'Track and Field track 8: London Steeplechase (under the white steel roof ring at sunset: the barriers and the water jump), added switched off.'],
  ['coliseum-anchor-leg', '2027-02-14-add-coliseum-anchor-leg.sql', 'Track and Field track 9: Coliseum Anchor Leg (the Los Angeles Coliseum\'s arches at sunset and the final sprint), added switched off.'],
  ['zurich-golden-lap', '2027-02-15-add-zurich-golden-lap.sql', 'Track and Field track 10: Zurich Golden Lap (a night meeting under the floodlights of Letzigrund, the golden finish), added switched off.'],
  ['tromso-aurora-grand-prix', '2027-02-17-add-tromso-aurora-grand-prix.sql', 'Holiday Season 2026 track: Tromsø Aurora Grand Prix (the polar night under the northern lights: past the harbour\'s wooden houses, over the fjord bridge, down a half-pipe beneath it, round a white peaked church to the line), added switched off and in the Holiday Season pass (season holiday-2026).'],
  ['zermatt-marble-grand-prix', '2027-02-18-add-zermatt-marble-grand-prix.sql', 'Holiday Season 2026 track: Zermatt Marble Grand Prix (a car-free Alpine village at dusk under the pyramid peak: a table top along the village street past the horse sleighs, round the church, over the river to a floodlit finish), added switched off and in the Holiday Season pass (season holiday-2026).'],
  ['gamla-stan-christmas-run', '2027-02-19-add-gamla-stan-christmas-run.sql', 'Holiday Season 2026 track: Gamla Stan Christmas Run (Stockholm\'s old town on Christmas Eve at dusk: a box line down a narrow lane, the Christmas market on the old square, the church spiral and the waterfront), added switched off and in the Holiday Season pass (season holiday-2026).'],
  ['outback-christmas-burst', '2027-02-20-add-outback-christmas-burst.sql', 'Holiday Season 2026 track: Outback Christmas Burst (a red desert gorge in the Australian summer: a jib line along the dry floor past a mob of kangaroos, the red rock meanders, over the ridge, to a homestead hung with Christmas lights), added switched off and in the Holiday Season pass (season holiday-2026).'],
  ['cape-town-summer-christmas', '2027-02-21-add-cape-town-summer-christmas.sql', 'Holiday Season 2026 track: Cape Town Summer Christmas (Christmas in high summer at the foot of a table-shaped mountain: a jib line along the beachfront promenade hung with Christmas lights, round the waterfront clock tower and along the sea through the braai smoke), added switched off and in the Holiday Season pass (season holiday-2026).'],
  ['quebec-old-town-spins', '2027-02-22-add-quebec-old-town-spins.sql', 'Holiday Season 2026 track: Québec Old Town Spins (a snowy night in the old walled town: along the terrace under the castle-like hotel, down a toboggan run, through the stone lanes of the lower town and round the frozen river), added switched off and in the Holiday Season pass (season holiday-2026).'],
  ['medellin-lights', '2027-02-23-add-medellin-lights.sql', 'Holiday Season 2026 track: Medellín Lights (the valley city at night in its Christmas lights: along the river under arches of lights, through a tunnel of lights, up through the hillside barrios and down to a river bank lined with lit flowers and birds), added switched off and in the Holiday Season pass (season holiday-2026).'],
  ['oaxaca-posadas-run', '2027-02-24-add-oaxaca-posadas-run.sql', 'Holiday Season 2026 track: Oaxaca Posadas Run (a warm December night in the old colonial town: a jib line along the market under strings of papel picado, past a candlelit posada procession, round the bell tower and through the coloured streets to a plaza of star piñatas), added switched off and in the Holiday Season pass (season holiday-2026).'],
  ['nuremberg-christmas-market-run', '2027-02-25-add-nuremberg-christmas-market-run.sql', 'Holiday Season 2026 track: Nuremberg Christmas Market Run (the old town at the blue hour with snow falling: down the castle hill, a table top across the Christmas market between the red-and-white stalls and the gingerbread stands, round a Gothic church front and over the river to the line), added switched off and in the Holiday Season pass (season holiday-2026).'],
  ['belgrade-badnjak-run', '2027-02-26-add-belgrade-badnjak-run.sql', 'Holiday Season 2026 track: Belgrade Badnjak Run (christmas Eve night by the fortress over the meeting of two rivers: a half-pipe along the fortress moat, past the churchyard bonfires of oak logs, through the old town and down to the riverbank), added switched off and in the Holiday Season pass (season holiday-2026).'],
  ['coptic-cairo-lights', '2027-02-27-add-coptic-cairo-lights.sql', 'Holiday Season 2026 track: Coptic Cairo Lights (a warm evening in Cairo\'s old quarter before Coptic Christmas: through the old gate\'s tunnel, a box line through lanes hung with coloured lanterns, past an old church courtyard and the palms, out to the river), added switched off and in the Holiday Season pass (season holiday-2026).'],
  ['veliky-ustyug-frost-run', '2027-02-28-add-veliky-ustyug-frost-run.sql', 'Holiday Season 2026 track: Veliky Ustyug Frost Run (a deep-frost day under a low sun in an old wooden town: a jib line along the frozen river, past troikas and a white church\'s onion domes, to a carved wooden residence with tall towers), added switched off and in the Holiday Season pass (season holiday-2026).'],
  ['sleigh-bell-forest', '2027-03-21-add-sleigh-bell-forest.sql', 'Holiday Season 2026 track: Sleigh Bell Forest (a moonlit fir forest: along the lantern-lit sleigh path beside a reindeer herd crossing the snow, through the owl wood, round the moonlit sweep and down the bell drop to the clearing), added switched off and in the Holiday Season pass (season holiday-2026).'],
  ['night-train-north', '2027-03-18-add-night-train-north.sql', 'Holiday Season 2026 track: Night Train North (racing a steam train north through a snowy forest at night: beside the train with its lit carriages, over the viaduct bends, round the tunnel spiral and up to the lit station at the top of the world), added switched off and in the Holiday Season pass (season holiday-2026).'],
  ['ice-palace', '2027-03-17-add-ice-palace.sql', 'Holiday Season 2026 track: Ice Palace (a palace of clear ice at night: down through an ice tunnel, under ice chandeliers, through the ice halls in a half-pipe, past the frozen throne and down the icicle drop to the palace gate), added switched off and in the Holiday Season pass (season holiday-2026).'],
  ['rio-new-year-burst', '2027-03-16-add-rio-new-year-burst.sql', 'Holiday Season 2026 track: Rio New Year Burst (a beach pinball table on a summer New Year\'s night under the fireworks: past little boats of flowers floating out to sea, round the seafront spiral, round the shore past the crowd in white and down the fireworks lane to the flippers), added switched off and in the Holiday Season pass (season holiday-2026).'],
  ['sydney-harbour-new-year', '2027-03-15-add-sydney-harbour-new-year.sql', 'Holiday Season 2026 track: Sydney Harbour New Year (a summer New Year\'s Eve, fireworks bursting over the harbour all race long: off a lighthouse on the headland, down round the harbour\'s edge, past a sail-roofed hall and under a great arch bridge, among the boats to the line), added switched off and in the Holiday Season pass (season holiday-2026).'],
  ['gingerbread-village', '2027-03-14-add-gingerbread-village.sql', 'Holiday Season 2026 track: Gingerbread Village (a snowy evening in a village baked of gingerbread: over a table top of icing between gingerbread houses, round the lollipop trees, down a candy-cane slalom and past gumdrop bumpers to the line), added switched off and in the Holiday Season pass (season holiday-2026).'],
  ['seoul-winter-lights', '2027-03-13-add-seoul-winter-lights.sql', 'Holiday Season 2026 track: Seoul Winter Lights (the city stream on a snowy night as a glowing light-tunnel world: along the bank, past snowy stepping stones, along the stream beside a lantern-lit bridge, through a tunnel of lights and round the hairpin to the line), added switched off and in the Holiday Season pass (season holiday-2026).'],
  ['goa-star-lanterns', '2027-03-12-add-goa-star-lanterns.sql', 'Holiday Season 2026 track: Goa Star Lanterns (a bright 8-bit lantern world on a warm night: down a palm lane, round a long sweep under strings of paper star lanterns, past a white church front and through the lantern splitter to the line), added switched off and in the Holiday Season pass (season holiday-2026).'],
  ['trinidad-parang-run', '2027-03-11-add-trinidad-parang-run.sql', 'Holiday Season 2026 track: Trinidad Parang Run (a parang band\'s pinball table on a warm Caribbean night: through maraca posts, round a hillside of wooden houses strung with lights, down the steel-pan lane past steel-pan bumpers and past the band on its stage to the flippers), added switched off and in the Holiday Season pass (season holiday-2026).'],
  ['san-fernando-lantern-spins', '2027-03-10-add-san-fernando-lantern-spins.sql', 'Holiday Season 2026 track: San Fernando Lantern Spins (the giant lantern festival at night, in blocks: a table top under giant star lanterns of glowing cubes, past the festival crowds and round the plaza to the line), added switched off and in the Holiday Season pass (season holiday-2026).'],
  ['lalibela-genna-spins', '2027-03-09-add-lalibela-genna-spins.sql', 'Holiday Season 2026 track: Lalibela Genna Spins (a clear dawn over the highland town at Genna: through trenches and passages cut down into the red rock, past churches hewn in it, pilgrims in white gathered above, to the line), added switched off and in the Holiday Season pass (season holiday-2026).'],
  ['reykjavik-yule-lights', '2027-03-08-add-reykjavik-yule-lights.sql', 'Holiday Season 2026 track: Reykjavik Yule Lights (a polar evening in a snowy town of blocks under the northern lights: a jib line down the harbour street past coloured block houses with candles in their windows, round the bay and back to the line), added switched off and in the Holiday Season pass (season holiday-2026).'],
  ['edinburgh-hogmanay-grand-prix', '2027-03-07-add-edinburgh-hogmanay-grand-prix.sql', 'Holiday Season 2026 track: Edinburgh Hogmanay Grand Prix (new Year\'s Eve night under the castle on its crag, fireworks bursting over it all race long: through the old town\'s narrow wynds of tall stone houses, round the castle rock and down the long street to a finish under the fireworks), added switched off and in the Holiday Season pass (season holiday-2026).'],
  ['buenos-aires-summer-christmas', '2027-03-06-add-buenos-aires-summer-christmas.sql', 'Holiday Season 2026 track: Buenos Aires Summer Christmas (a warm summer evening turning to midnight, fireworks bursting over the rooftops all race long: along wide avenues lined with flowering jacaranda trees, round the obelisk at the hairpin and past the fountains and the coloured houses to the line), added switched off and in the Holiday Season pass (season holiday-2026).'],
  ['queenstown-pohutukawa-run', '2027-03-05-add-queenstown-pohutukawa-run.sql', 'Holiday Season 2026 track: Queenstown Pōhutukawa Run (a summer Christmas day by a mountain lake: off a ski jump, down into the gorge, a half-pipe along its walls, out over the rock and along the lake shore under red-flowering pōhutukawa trees), added switched off and in the Holiday Season pass (season holiday-2026).'],
  ['sapporo-snow-sculptures', '2027-03-04-add-sapporo-snow-sculptures.sql', 'Holiday Season 2026 track: Sapporo Snow Sculptures (a snowy day in a northern city: off the top of a ski jump, a box line through the long park past giant snow sculptures (a castle, an owl, a bear, a whale\'s tail), under the lattice TV tower and along the snow lanterns to the line), added switched off and in the Holiday Season pass (season holiday-2026).'],
  ['harbin-ice-city', '2027-03-03-add-harbin-ice-city.sql', 'Holiday Season 2026 track: Harbin Ice City (a frozen night among huge castles of ice lit blue, red, green and gold: a half-pipe of ice through the castles, past the snow sculptures and over the frozen river, and back past the glowing towers to the line), added switched off and in the Holiday Season pass (season holiday-2026).'],
  ['accra-december-beats', '2027-03-02-add-accra-december-beats.sql', 'Holiday Season 2026 track: Accra December Beats (a summer December evening under the floodlights: past drummers and dancers outside the stadium, round the hairpin and a spiral, a lap of the stadium in kente colours and a table top on the home straight, the beach beyond), added switched off and in the Holiday Season pass (season holiday-2026).'],
  ['new-york-winter-run', '2027-03-01-add-new-york-winter-run.sql', 'Holiday Season 2026 track: New York Winter Run (a floodlit winter night among the skyscrapers: down an avenue, a box line between the avenues, past a sunken ice rink under a giant lit tree, round the towers and down the long avenue to the line), added switched off and in the Holiday Season pass (season holiday-2026).'],
];
for (const [slug, file, note] of HIDDEN_KIT_TRACKS) {
  test(`${slug} is added by its data update, switched off, exactly as its track file builds it`, () => {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'docs', 'data_updates', file), 'utf8');
    const script = path.join(__dirname, '..', 'scripts', 'physics-track-sql.js');
    assert.match(sql, /is_active|false/);
    // A later data update for the track (already run live, so the add is never edited): the latest
    // sets everything as the track file builds it now (the add then matches it as it was).
    const dir = path.join(__dirname, '..', 'docs', 'data_updates');
    const later = fs.readdirSync(dir).filter((f) => f > file && f.slice(11).startsWith(`${slug}-`) && f.endsWith('.sql')).sort();
    if (!later.length) {
      assert.equal(sql, execFileSync(process.execPath, [script, slug, '--add-hidden', note], { encoding: 'utf8' }));
      return;
    }
    const body = (x) => x.slice(x.indexOf('UPDATE tracks'));
    const latest = fs.readFileSync(path.join(dir, later.at(-1)), 'utf8');
    assert.match(latest, new RegExp(`^ WHERE slug = '${slug}';$`, 'm'));
    assert.equal(body(latest), body(execFileSync(process.execPath, [script, slug, '--retune'], { encoding: 'utf8' })), `${later.at(-1)} no longer gives the track in code`);
  });
}

test('a Grand Prix track: up to 8 billboards (other tracks 4 to 6), its crowd and barriers by name, rumble strips race as moguls', () => {
  const gp = () => ({ ...base(), surface: 'asphalt', grandPrix: true });
  const eight = gp();
  eight.sections[2].billboards = 5;
  eight.sections[3].billboards = 3;
  const built = track(eight);
  assert.equal(built.physics.kit.billboards.length, 8);
  assert.deepEqual(built.physics.kit.grandPrix, { crowd: 'fans', barrier: 'tyres' });
  assert.equal(built.physics.look, 'asphalt');
  const nine = gp();
  nine.sections[2].billboards = 6;
  nine.sections[3].billboards = 3;
  refused(nine, /9 billboards; every Grand Prix track has 4 to 8/);
  const notGp = base();
  notGp.sections[2].billboards = 5;
  notGp.sections[3].billboards = 3;
  refused(notGp, /8 billboards; every track has 4 to 6/);
  refused({ ...gp(), grandPrix: { crowd: 'robots' } }, /unknown Grand Prix crowd "robots"/);
  refused({ ...gp(), grandPrix: { barrier: 'hay' } }, /unknown Grand Prix barrier "hay"/);
  assert.equal(track({ ...gp(), grandPrix: { crowd: 'elves', barrier: 'logs' } }).physics.kit.grandPrix.crowd, 'elves');
  assert.equal(track(base()).physics.kit.grandPrix, undefined);
  // Fewer small groups of spectators along the way, where a track's drawing budget needs it.
  assert.equal(track({ ...gp(), grandPrix: { groupsEvery: 700 } }).physics.kit.grandPrix.groupsEvery, 700);
  refused({ ...gp(), grandPrix: { groupsEvery: 100 } }, /groupsEvery is the metres between the small groups/);
  // Rumble strips: a row of low bumps, painted (the look rides along; the race sees bumps).
  const strips = gp();
  strips.sections[3].features = [kit.rumble({ from: 0.7, to: 0.95, count: 3 })];
  const bumps = track(strips).physics.features.filter((f) => f.type === 'bump');
  assert.equal(bumps.length, 3);
  assert.ok(bumps.every((b) => b.look === 'rumble'));
  const onBend = gp();
  onBend.sections[2].features = [kit.rumble({ from: 0.3, to: 0.6, count: 3 })];
  refused(onBend, /moguls on a bend/);
});

test('the Grand Prix gallery (every Grand Prix piece, never raced) builds within the recipe', () => {
  const { GALLERIES } = require('../scripts/dump-kit-track');
  const g = GALLERIES['grand-prix-gallery']();
  assert.ok(g.physics.kit.grandPrix);
  assert.equal(g.physics.kit.billboards.length, 8);
  assert.ok(!PHYSICS_TRACKS.some((t) => t.slug === g.slug), 'never a raceable track');
});

// A track with a half-pipe after the bends (a straight before it, as the recipe asks).
const withHalfPipe = () => {
  const s = base();
  s.sections.splice(2, 0, { name: 'Run-in', shape: straight(30, { grade: 0.12 }) }, { name: 'Half-pipe', shape: kit.halfPipe({ first: 'left', width: 8, swings: 3, radius: 150, degrees: 18 }) });
  return s;
};

test('a half-pipe widens the channel for the race engine, and the field rocks wall to wall in it', () => {
  const t = track(withHalfPipe());
  const [w] = t.physics.channel.wides;
  assert.equal(w.radius, 8);
  assert.ok(w.to > w.from);
  // Tracks without one keep the plain channel (so every existing race is unchanged).
  assert.equal(track(base()).physics.channel.wides, undefined);
  const sim = simulatePhysicsRace({ seed: 7, track: t, entries: houseField(7), level: 3 });
  assert.equal(sim.results.length, 20);
  let swings = 0;
  for (let i = 0; i < 20; i++) {
    let side = 0;
    for (const fr of sim.frames) {
      if (fr.p[i] < w.from || fr.p[i] > w.to) continue;
      const sd = fr.l[i] > 0.3 ? 1 : fr.l[i] < -0.3 ? -1 : 0;
      if (sd && sd !== side) { if (side) swings++; side = sd; }
    }
  }
  assert.ok(swings / 20 >= 1, `the field swings from wall to wall (${(swings / 20).toFixed(2)} a marble)`);
});

test('refused: a half-pipe too narrow or wide, with things in it, first, or with no straight before it', () => {
  const narrow = withHalfPipe();
  narrow.sections[3].shape = kit.halfPipe({ width: 4 });
  refused(narrow, /a half-pipe's width is its radius in metres, 6 to 10/);
  const busy = withHalfPipe();
  busy.sections[3].obstacles = [peg({ at: 0.5 })];
  refused(busy, /nothing in or over a half-pipe/);
  const noRunIn = withHalfPipe();
  noRunIn.sections.splice(2, 1);
  refused(noRunIn, /a half-pipe needs a straight \(at least 20 m\) or a drop before it/);
});

test('TV moments: one or two trackside cameras ride along as looks, at a section, well apart, clear of the start and the line', () => {
  const s = base();
  s.sections[0].shape = plunge(300, { grade: 0.8 });
  const t = track({ ...s, tvCameras: [{ section: 'Sweep', at: 0.5, side: 'right', distance: 8, height: 9 }] });
  assert.deepEqual(Object.keys(t.physics.kit.tv[0]).sort(), ['distance', 'height', 'p', 'section', 'side']);
  assert.equal(t.physics.kit.tv[0].side, -1);
  // Looks only: the race is the same without them.
  const a = simulatePhysicsRace({ seed: 3, track: t, entries: houseField(3), level: 3 });
  const b = simulatePhysicsRace({ seed: 3, track: track(s), entries: houseField(3), level: 3 });
  assert.deepEqual(a.results, b.results);
  refused({ ...s, tvCameras: [] }, /tvCameras is a list of one or two/);
  refused({ ...s, tvCameras: [{ section: 'Nowhere' }] }, /section "Nowhere" is not one of this track's sections/);
  refused({ ...base(), tvCameras: [{ section: 'Bends', at: 0 }] }, /TV moments start 250 m in/);
  refused({ ...s, tvCameras: [{ section: 'Final plunge', at: 1 }] }, /the last 150 m keep the finish shot/);
  refused({ ...s, tvCameras: [{ section: 'Sweep', at: 0.4 }, { section: 'Sweep', at: 0.6 }] }, /at least 300 m, so two cuts never come close together/);
  refused({ ...s, tvCameras: [{ section: 'Sweep', distance: 40 }] }, /distance is metres out from the rim, 6 to 25/);
});

test('jib parts: a box, a rail and a table top are raised flat tops the field rides over or round, and hops stay low', () => {
  const s = base();
  s.sections.splice(2, 0, { name: 'Jibs', shape: straight(120, { grade: 0.13 }), features: kit.jibLine({ from: 0.1 }) }, { name: 'Box run', shape: straight(60, { grade: 0.13 }), features: [kit.box({ at: 0.3, length: 12 })] });
  const t = track(s);
  const tops = t.physics.features.filter((f) => f.type === 'box');
  assert.deepEqual(tops.map((f) => f.look), ['rail', 'box', 'table-top', 'box']);
  let on = 0;
  let seen = 0;
  for (const seed of [3, 4, 5]) {
    const sim = simulatePhysicsRace({ seed, track: t, entries: houseField(seed), level: 3 });
    assert.equal(sim.results.length, 20);
    const box = tops[3];
    for (let i = 0; i < 20; i += 1) {
      const near = sim.frames.filter((f) => f.p[i] > box.at + 0.001 && f.p[i] < box.at + 0.004);
      if (!near.length) continue;
      seen += 1;
      if (near.some((f) => f.h[i] > 0.15)) on += 1;
    }
    for (const f of sim.frames) for (const h of f.h) assert.ok(h < 1.2, `a hop of ${h} m`);
  }
  // Some marbles ride up onto the box; most pass either side of it.
  assert.ok(on > 0 && on < seen, `${on} of ${seen} on the box`);
});

test('refused: a jib part on a bend, too high, too near the gate or crowded by other obstacles', () => {
  const onBend = base();
  onBend.sections[1].features = [kit.box({ at: 0.4 })];
  refused(onBend, /a box needs a straight/);
  const high = base();
  high.sections.splice(2, 0, { name: 'Jibs', shape: straight(60, { grade: 0.13 }), features: [kit.box({ at: 0.3, height: 0.5 })] });
  refused(high, /stands at most 0.35 m high/);
  const crowded = base();
  crowded.sections.splice(2, 0, { name: 'Jibs', shape: straight(60, { grade: 0.13 }), features: [kit.box({ at: 0.3, length: 10 })], obstacles: [peg({ at: 0.45 })] });
  refused(crowded, /a peg too close to a box/);
});

test('the varied starts: an opening without the pile-up and slalom has its luck in its waves, or in the first half of the track', () => {
  const s = { ...base(), opening: kit.opening('clean-drop'), start: { gate: 'stalls', shots: { countdown: 'above', launch: 'overhead' } } };
  s.sections = s.sections.slice(1);
  // Its own waves at the gate are its luck.
  assert.deepEqual(track(s).physics.channel.funnel.waves, { groups: 5, gap: 0.3, jitter: 0.1 });
  // Without them, the first half of the track needs a pile-up or a hard slalom.
  const { waves, ...still } = s.opening;
  s.opening = still;
  refused(s, /the clean-drop opening has no pile-up or slalom/);
  s.sections.splice(0, 0, { name: 'Luck', shape: straight(60, { grade: 0.13 }), obstacles: [slalom({ from: 0.2, to: 0.95, count: 6, loss: 0.3 })] });
  assert.equal(track(s).physics.kit.opening, 'clean-drop');
});
