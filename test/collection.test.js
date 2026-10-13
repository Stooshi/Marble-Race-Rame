'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { catalog, items, bySlug, marbleCode, onSale } = require('../src/marbles/catalog');

test('Grand Opening: 15 designs in 5 shades plus Northern Lights = 76 items', () => {
  assert.equal(catalog.designs.length, 16);
  assert.equal(items.length, 76);
  for (const d of catalog.designs) {
    assert.equal(d.shades.length, d.rarity === 'limited' ? 1 : 5, d.key);
    assert.ok(d.story && d.inRaces && d.material, d.key);
    assert.ok(d.shades[0].original, `${d.key}: the first shade is the original`);
  }
  const perRarity = {};
  for (const d of catalog.designs) perRarity[d.rarity] = (perRarity[d.rarity] ?? 0) + 1;
  assert.deepEqual(perRarity, { common: 4, uncommon: 4, rare: 3, epic: 2, legendary: 2, limited: 1 });
});

test('every shade has a name, a description and one named colour per material slot', () => {
  for (const d of catalog.designs) {
    for (const s of d.shades) {
      assert.ok(s.name && s.description, `${d.key}-${s.key}`);
      assert.equal(s.colours.length, d.slots.length, `${d.key}-${s.key}`);
      for (const c of s.colours) {
        assert.ok(c.name, `${d.key}-${s.key}`);
        assert.match(c.hex, /^#[0-9A-F]{6}$/i);
      }
    }
  }
});

test('shade texts written for review are marked: 70 of them', () => {
  const review = items.filter((i) => i.shade.text === 'review');
  assert.equal(review.length, 70);
  assert.ok(items.filter((i) => i.design.key === 'candy').every((i) => i.shade.text === 'design'));
});

test('marble IDs are unique per item and look like the certificate', () => {
  const prefixes = items.map((i) => marbleCode(i, { copyNo: 1 }).slice(0, -7));
  assert.equal(new Set(prefixes).size, items.length);
  assert.equal(marbleCode(bySlug.get('sun-solar'), { copyNo: 37 }), 'MS-SUN-SOL-000037');
  assert.equal(marbleCode(bySlug.get('candy-pink'), { giftNo: 12 }), 'MS-CAN-PNK-G00012');
});

test('prices follow the rarity; the limited edition is credits only, numbered to 1,000 and ends with its month', () => {
  assert.deepEqual(bySlug.get('candy-pink').price, { coins: 100 });
  assert.deepEqual(bySlug.get('hole-quasar').price, { coins: 2500 });
  const nl = bySlug.get('aurora-aurora');
  assert.equal(nl.price.coins, undefined);
  assert.equal(nl.editionSize, 1000);
  assert.ok(onSale(nl, new Date('2026-10-20'), 0));
  assert.ok(!onSale(nl, new Date('2026-11-02'), 0));
  assert.ok(!onSale(nl, new Date('2026-10-20'), 1000));
  assert.ok(onSale(bySlug.get('candy-pink'), new Date('2030-01-01'), 5000), 'regular marbles stay on sale after the First Edition');
});

test('every old plain marble maps to a Common shade, and the launch data update uses the same map', () => {
  const map = catalog.legacyGift.map;
  assert.equal(Object.keys(map).length, 22);
  for (const slug of Object.values(map)) assert.equal(bySlug.get(slug)?.rarity, 'common', slug);
  const sql = fs.readFileSync(path.join(__dirname, '..', 'docs', 'data_updates', '2026-12-29-grand-opening-collection.sql'), 'utf8');
  const rows = [...sql.matchAll(/\('([a-z-]+)', '([a-z-]+)', '(MS-[A-Z0-9]{3}-[A-Z0-9]{3})'\)/g)];
  assert.equal(rows.length, 22);
  for (const [, old, item, prefix] of rows) {
    assert.equal(map[old], item);
    assert.equal(marbleCode(bySlug.get(item), { giftNo: 1 }), `${prefix}-G00001`);
  }
});

test('collection code never touches the race engine', () => {
  for (const f of ['src/game/simulator.js', 'src/game/physicsSimulator.js', 'src/game/simulationWorker.js', 'src/game/runSimulation.js']) {
    const code = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    assert.doesNotMatch(code, /user_collection|marbles\/catalog|collection_counters/, f);
  }
});
