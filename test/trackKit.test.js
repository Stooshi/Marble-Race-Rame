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
const { SOLID_TYPES } = require('../src/game/trackFeatures');
const { simulatePhysicsRace } = require('../src/game/physicsSimulator');
const { houseField } = require('../scripts/race-fingerprints');

const {
  track, plunge, straight, climb, sBends, sweep, spiral, hairpin, splitter,
  block, pileUp, curtain, swipe, parked, bump, boost,
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
    { name: 'Final plunge', shape: plunge(60) },
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
  const proven = new Set([...SOLID_TYPES, 'boost', 'bump', 'cobbles']);
  for (const f of proving.physics.features) assert.ok(proven.has(f.type), `${f.type} is a proven type`);
  const panda = proving.physics.features.filter((f) => f.look === 'panda');
  const baboons = tm.physics.features.filter((f) => f.look === 'baboon');
  assert.deepEqual(panda.map((f) => [f.type, f.l, f.radius, f.height]), baboons.map((f) => [f.type, f.l, f.radius, f.height]));
  const cat = proving.physics.features.find((f) => f.look === 'fortune-cat');
  const elephant = tm.physics.features.find((f) => f.look === 'elephant');
  for (const k of ['type', 'l', 'reach', 'radius', 'height', 'parked', 'loss']) assert.equal(cat[k], elephant[k], k);
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
  const cat = proving.physics.features.find((f) => f.look === 'fortune-cat');
  assert.ok(Math.abs(cat.at - (s.from + 0.37 * (s.to - s.from))) < 1e-4);
});

test('the high line is the outside of the bend: a left hairpin\'s swipe stands on the right wall', () => {
  const cat = proving.physics.features.find((f) => f.look === 'fortune-cat');
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
  const [fork] = proving.physics.forks;
  assert.deepEqual({ ...fork, from: 0, to: 0 }, { ...tm.physics.forks[0], from: 0, to: 0 });
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
  s.sections[5].obstacles = [block({ costume: 'cow', at: 0.3, line: 'left' }), parked({ costume: 'vespa', at: 0.1, side: 'right' })];
  s.sections[3].obstacles = [curtain({ costume: 'easel', side: 'left' }), swipe({ costume: 'falcon', side: 'right' })];
  s.sections[1].features = [bump(), boost()];
  s.sections.splice(2, 0, { name: 'Split', shape: splitter({ side: 'right' }) });
  const t = track(s);
  const by = (look) => t.physics.features.find((f) => f.look === look);
  assert.equal(by('cow').l, 0.35);
  assert.equal(by('vespa').type, 'bus');
  assert.ok(by('vespa').l < 0);
  assert.equal(by('easel').l, 1);
  assert.ok(by('falcon').l < 0);
  assert.deepEqual({ ...t.physics.forks[0], from: 0, to: 0 }, { ...tm.physics.forks[1], from: 0, to: 0 });
});
