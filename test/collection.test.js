'use strict';

// The collection catalogue's shape. It is going to be swapped for a new
// collection, so these check structure, never particular designs or counts.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { catalog, items, bySlug, marbleCode, onSale } = require('../src/marbles/catalog');

test('every design has a story, a race note, a material and its shades (5, or 1 for a limited edition)', () => {
  assert.ok(catalog.designs.length > 0);
  for (const d of catalog.designs) {
    assert.ok(d.story && d.inRaces && d.material && d.code, d.key);
    assert.ok(catalog.rarities[d.rarity], `${d.key}: unknown rarity ${d.rarity}`);
    assert.equal(d.shades.length, d.limited ? 1 : 5, d.key);
    assert.ok(d.shades[0].original, `${d.key}: the first shade is the original`);
  }
  assert.equal(items.length, catalog.designs.reduce((n, d) => n + d.shades.length, 0));
});

test('every shade has a name, a description and one named colour per material slot', () => {
  for (const d of catalog.designs) {
    for (const s of d.shades) {
      assert.ok(s.name && s.description && s.code, `${d.key}-${s.key}`);
      assert.equal(s.colours.length, d.slots.length, `${d.key}-${s.key}`);
      for (const c of s.colours) {
        assert.ok(c.name, `${d.key}-${s.key}`);
        assert.match(c.hex, /^#[0-9A-F]{6}$/i);
      }
    }
  }
});

test('marble IDs are unique per item and look like the certificate', () => {
  const prefixes = items.map((i) => marbleCode(i, { copyNo: 1 }).slice(0, -7));
  assert.equal(new Set(prefixes).size, items.length);
  const first = items[0];
  assert.match(marbleCode(first, { copyNo: 37 }), /^MS-[A-Z0-9]{3}-[A-Z0-9]{3}-000037$/);
  assert.match(marbleCode(first, { giftNo: 12 }), /^MS-[A-Z0-9]{3}-[A-Z0-9]{3}-G00012$/);
});

test('prices come from the rarity; regular marbles stay on sale after the First Edition; a limited edition ends', () => {
  for (const i of items) assert.deepEqual(i.price, catalog.rarities[i.rarity].price);
  const regular = items.find((i) => !i.design.limited);
  assert.ok(onSale(regular, new Date('2030-01-01'), 5000));
  const limited = items.find((i) => i.design.limited);
  if (limited) {
    assert.ok(!onSale(limited, new Date(new Date(limited.saleEndsAt).getTime() + 1000), 0));
    assert.ok(!onSale(limited, new Date(0), limited.editionSize));
  }
  assert.equal(bySlug.get(regular.slug), regular);
});

test('no one-off data update retires the plain marbles or hands out collection marbles', () => {
  const dir = path.join(__dirname, '..', 'docs', 'data_updates');
  for (const f of fs.readdirSync(dir)) {
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    assert.doesNotMatch(sql, /on_sale|user_collection|early_player/, f);
  }
});

test('collection code never touches the race engine', () => {
  for (const f of ['src/game/simulator.js', 'src/game/physicsSimulator.js', 'src/game/simulationWorker.js', 'src/game/runSimulation.js']) {
    const code = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    assert.doesNotMatch(code, /user_collection|marbles\/catalog|collection_counters|house_looks|showcase/, f);
  }
});
