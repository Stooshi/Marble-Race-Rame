'use strict';

// Table Mountain Run (Cape Town): Bobsleigh Run's run and physics through Cape
// Town, with a second splitter round Lion's Head, built to the track recipe.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { simulatePhysicsRace } = require('../src/game/physicsSimulator');
const { physicsTrack, TABLE_MOUNTAIN_SECTIONS } = require('../src/game/physicsTracks');
const { createRng } = require('../src/game/rng');
const { subSeed } = require('../src/game/simulator');
const { HOUSE_SKILLS, skillStats } = require('../src/game/skill');

const tm = physicsTrack('table-mountain-run');
const bob = physicsTrack('bobsleigh-run');

/** A field of house marbles: the house skill ladder, lanes from the seed. */
function routeRace(seed) {
  const rng = createRng(subSeed(seed, 3));
  const picked = rng.shuffle(HOUSE_SKILLS.map((skill, i) => ({ id: `h${String(i).padStart(2, '0')}`, skill })));
  const lanes = rng.shuffle(picked.map((_, i) => i));
  const entries = picked.map((h, i) => ({ id: h.id, lane: lanes[i], ...skillStats(h.skill) }));
  return { entries, sim: simulatePhysicsRace({ seed, track: tm, entries, level: 3 }) };
}
let batch = null;
const races = () => {
  batch ??= Array.from({ length: 60 }, (_, k) => routeRace(30_000 + k * 7919));
  return batch;
};

test('Table Mountain Run is added switched off by its data update, exactly as defined in code', () => {
  const file = path.join(__dirname, '..', 'docs', 'data_updates', '2026-10-13-add-table-mountain-run.sql');
  const script = path.join(__dirname, '..', 'scripts', 'physics-track-sql.js');
  const sql = fs.readFileSync(file, 'utf8');
  const body = (text) => text.slice(text.indexOf('WITH added AS'));
  const generated = execFileSync(process.execPath, [script, 'table-mountain-run', '--add-hidden', 'x'], { encoding: 'utf8' });
  assert.equal(body(sql), body(generated), 'the data update no longer gives the track in code');
  assert.match(sql, /physics, is_active\)/);
  assert.match(sql, /v\.physics::jsonb, false/, 'switched off until it has been watched');
});

test('it is Bobsleigh Run\'s physics: the same channel, gate, start and collisions, dressed as sand', () => {
  for (const k of ['surface', 'pace', 'channel', 'gate', 'collisions', 'runout']) assert.deepEqual(tm.physics[k], bob.physics[k], k);
  assert.equal(tm.physics.look, 'sand');
  assert.equal(tm.difficulty, 'extreme');
});

test('its animals race exactly like the obstacles they stand in for', () => {
  const byLook = (look) => tm.physics.features.filter((f) => f.look === look);
  const strip = ({ at, look, ...rest }) => rest; // same footprint, wherever it stands
  const bobOf = (type) => bob.physics.features.filter((f) => f.type === type).map(strip);
  // (The middle baboon sits a touch off centre, so no starting place has an edge: same size, same hits.)
  const shape = ({ type, radius, height }) => ({ type, radius, height });
  assert.deepEqual(byLook('baboon').map(shape), bob.physics.features.filter((f) => f.type === 'ice_block').map(shape));
  assert.deepEqual(byLook('zebras').map(strip), bobOf('icicles'));
  assert.deepEqual(byLook('giraffe').map(strip), bobOf('snowman'));
  // The elephant swings its trunk on the polar bear's timetable, a little softer (the hairpin comes faster here).
  const [elephant] = byLook('elephant');
  assert.equal(elephant.type, 'polar_bear');
  assert.deepEqual({ ...strip(elephant), loss: undefined }, { ...bobOf('polar_bear')[0], loss: undefined });
  assert.ok(elephant.loss < 1);
});

test('bends flow, per the recipe: the hairpin is the one sharp bend, with a braking zone; the corkscrew is a wide spiral', () => {
  const bends = TABLE_MOUNTAIN_SECTIONS.filter((s) => s.kind !== 'straight');
  assert.deepEqual(bends.filter((b) => b.radius < 40).map((b) => b.name), ['Hairpin']);
  for (const b of bends) assert.ok(b.ease > 0, `${b.name} eases in and out`);
  const cork = TABLE_MOUNTAIN_SECTIONS.find((s) => s.name === 'Corkscrew');
  assert.equal(cork.radius, 40);
  assert.equal(cork.degrees, 360);
  const hairpin = tm.sections.find((s) => s.name === 'Hairpin');
  const braking = tm.physics.features.find((f) => f.type === 'cobbles');
  const before = (hairpin.from - braking.at) * tm.length_m;
  assert.ok(before > 0 && before < 60, `the braking zone ${before.toFixed(0)} m before the hairpin`);
});

test('fast, within the limits, every marble home, and the same seed gives the same race', () => {
  assert.equal(JSON.stringify(routeRace(4242).sim), JSON.stringify(routeRace(4242).sim));
  for (const { sim } of races()) {
    const w = sim.stats.winnerMs / 1000;
    assert.ok(w > 38 && w < 60, `winner ${w} s`); // the recipe's "about 40 to 60 s" (typically 43-44 s here)
    assert.ok(sim.stats.lastMs / 1000 < 88, `last finisher ${sim.stats.lastMs / 1000} s`);
    assert.ok(sim.results.every((r) => Number.isFinite(r.finishTimeMs)), 'every marble finishes');
  }
});

test('both splitters are used both ways, and the route never decides the race', () => {
  // For each splitter: marbles that reach the wedge in the same place finish in
  // the same place on average, whichever channel they take.
  tm.physics.forks.forEach((F, k) => {
    const rows = [];
    for (const { sim } of races()) {
      const tin = sim.results.map((_, i) => sim.frames.find((f) => f.p[i] >= F.from).t);
      const order = tin.map((_, i) => i).sort((a, b) => tin[a] - tin[b]);
      for (let i = 0; i < 20; i += 1) {
        const b = sim.frames.find((f) => f.p[i] >= (F.from + F.to) / 2).b[i];
        rows.push({ place: order.indexOf(i) + 1, finish: sim.results.find((r) => r.index === i).position, b });
      }
    }
    const expected = {};
    for (const r of rows) (expected[r.place] ??= []).push(r.finish);
    for (const p of Object.keys(expected)) expected[p] = expected[p].reduce((a, x) => a + x, 0) / expected[p].length;
    for (const side of [1, -1]) {
      const mine = rows.filter((r) => r.b === side);
      assert.ok(mine.length > rows.length * 0.2, `splitter ${k + 1}: only ${mine.length} of ${rows.length} take the ${side > 0 ? 'left' : 'right'}`);
      const off = mine.reduce((a, r) => a + r.finish - expected[r.place], 0) / mine.length;
      assert.ok(Math.abs(off) < 0.8, `splitter ${k + 1}: the ${side > 0 ? 'left' : 'right'} finishes ${off.toFixed(2)} places from expected`);
    }
  });
});
