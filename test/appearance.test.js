'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { SCHEMA_PATH } = require('../src/db/migrate');

const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('looks are cosmetic only: the race engine never reads appearance data', () => {
  const engine = ['src/game/simulator.js', 'src/game/rng.js', 'src/game/raceService.js', 'src/game/raceManager.js', 'src/game/runSimulation.js', 'src/game/simulationPool.js', 'src/game/simulationWorker.js'];
  for (const file of engine) {
    assert.doesNotMatch(read(file), /appearance|marble_colors|marble_surfaces|marble_effects|color_key|surface_key|effect_key/i,
      `${file} must not use marble looks: appearance never affects racing`);
  }
  // The simulator is fed stats only.
  const feed = read('src/game/runSimulation.js').match(/entries: entries\.map\(\(e\) => \(\{([\s\S]*?)\}\)\)/)[1];
  const keys = [...feed.matchAll(/(\w+):/g)].map((m) => m[1]).sort();
  assert.deepEqual(keys, ['acceleration', 'handling', 'id', 'lane', 'luck', 'topSpeed']);
});

const seeded = (table) => {
  const block = schema.match(new RegExp(`INSERT INTO ${table} \\([^)]*\\) VALUES([\\s\\S]*?)ON CONFLICT`))[1];
  return [...block.matchAll(/\('([a-z0-9-]+)'/g)].map((m) => m[1]);
};

test('curated look options are seeded as agreed', () => {
  assert.equal(seeded('marble_colors').length, 16);
  assert.deepEqual(seeded('marble_surfaces'), ['solid', 'swirl', 'striped', 'dotted', 'spiky', 'bumpy', 'star']);
  assert.deepEqual(seeded('marble_effects'), ['none', 'flaming', 'glowing', 'sparkle', 'galaxy']);
});

test('a new look defaults to solid with no effect, and custom labels stay off', () => {
  const table = schema.match(/CREATE TABLE IF NOT EXISTS marble_appearances \([\s\S]*?\n\);/)[0];
  assert.match(table, /surface_key varchar\(24\) NOT NULL DEFAULT 'solid'/);
  assert.match(table, /effect_key\s+varchar\(24\) NOT NULL DEFAULT 'none'/);
  assert.match(read('src/game/appearance.js'), /Custom labels are not available yet/);
});
