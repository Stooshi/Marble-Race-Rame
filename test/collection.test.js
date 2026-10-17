'use strict';

// The collection catalogue's shape. It is going to be swapped for a new
// collection, so these check structure, never particular designs or counts.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { catalog, items, bySlug, byId, normaliseId, marbleCode, saleState, onSale } = require('../src/marbles/catalog');

test('every design has a story, a race note, a material and its shades (5, or 1 for a limited edition)', () => {
  assert.ok(catalog.designs.length > 0);
  for (const d of catalog.designs) {
    assert.ok(d.story && d.inRaces && d.material && Number.isInteger(d.no), d.key);
    assert.ok(catalog.rarities[d.rarity], `${d.key}: unknown rarity ${d.rarity}`);
    assert.equal(d.shades.length, d.limited ? 1 : 5, d.key);
    assert.ok(d.shades[0].original, `${d.key}: the first shade is the original`);
  }
  assert.equal(items.length, catalog.designs.reduce((n, d) => n + d.shades.length, 0));
});

test('every shade has a name, a description and one named colour per material slot', () => {
  for (const d of catalog.designs) {
    for (const s of d.shades) {
      assert.ok(s.name && s.description && Number.isInteger(s.no), `${d.key}-${s.key}`);
      assert.equal(s.colours.length, d.slots.length, `${d.key}-${s.key}`);
      for (const c of s.colours) {
        assert.ok(c.name, `${d.key}-${s.key}`);
        assert.match(c.hex, /^#[0-9A-F]{6}$/i);
      }
    }
  }
});

test('Marble IDs: two letters and three digits, one per item; the collection, the design and the shade', () => {
  assert.equal(new Set(items.map((i) => i.id)).size, items.length);
  for (const i of items) assert.match(i.id, /^[A-Z]{2}\d{3}$/);
  const regular = items.filter((i) => !i.design.limited);
  for (const i of regular) assert.equal(i.id, `${catalog.collection.code}${String(i.design.no).padStart(2, '0')}${i.shade.no}`);
  // The design numbers run 01 to 10 and the shades 1 to 5 (Classic, Ocean, Forest, Berry, Sunset).
  assert.deepEqual([...new Set(regular.map((i) => i.design.no))].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].slice(0, new Set(regular.map((i) => i.design.key)).size));
  assert.equal(byId.get('SC105')?.design.name, 'Champion Shooter');
  assert.equal(byId.get('SC105')?.shade.name, 'Sunset');
  assert.equal(byId.get('SC011')?.design.name, 'Clearie');
  // Typed any way people type it.
  for (const t of ['SC105', 'sc105', 'SC 105', '#SC105', ' #sc-105 ']) assert.equal(normaliseId(t), 'SC105', t);
  for (const t of ['SC10', 'S1050', 'SC1055', '', null]) assert.equal(normaliseId(t), null, String(t));
  // A copy's certificate code: its Marble ID and copy number.
  const champion = byId.get('SC105');
  assert.equal(marbleCode(champion, { copyNo: 37 }), 'SC105-000037');
  assert.equal(marbleCode(champion, { giftNo: 12 }), 'SC105-G00012');
});

test('Schoolyard Classics: 10 designs in 5 shades, the rarities as planned, the next collections dated', () => {
  const regular = catalog.designs.filter((d) => !d.limited);
  assert.equal(catalog.collection.code, 'SC');
  assert.equal(regular.length, 10);
  assert.deepEqual(regular.map((d) => d.rarity), ['common', 'common', 'common', 'uncommon', 'uncommon', 'uncommon', 'rare', 'rare', 'epic', 'legendary']);
  for (const d of regular) assert.deepEqual(d.shades.map((s) => s.name), ['Classic', 'Ocean', 'Forest', 'Berry', 'Sunset']);
  assert.deepEqual(catalog.comingSoon.map((c) => [c.code, c.date]), [['HH', '2026-12-08'], ['MG', '2026-12-15'], ['AG', '2026-12-22']]);
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

test('Northern Lights, the launch limited edition: 500 numbered copies at 25,000 coins, on sale 1–31 December 2026 Swedish time only', () => {
  const nl = bySlug.get('aurora-aurora');
  assert.equal(nl.design.name, 'Northern Lights');
  assert.equal(nl.price.coins, 25000);
  assert.equal(nl.editionSize, 500);
  assert.ok(nl.allNumbered);
  assert.equal(nl.design.material, 'aurora-glow');
  // Not for sale before 1 Dec 00:00 Swedish time (CET, UTC+1), from then until 31 Dec 23:59, then never again.
  assert.equal(saleState(nl, new Date('2026-10-17T12:00:00Z'), 0), 'coming');
  assert.equal(saleState(nl, new Date('2026-11-30T22:59:59Z'), 0), 'coming');
  assert.equal(saleState(nl, new Date('2026-11-30T23:00:00Z'), 0), 'on-sale');
  assert.equal(saleState(nl, new Date('2026-12-31T22:59:59Z'), 499), 'on-sale');
  assert.equal(saleState(nl, new Date('2026-12-31T23:00:00Z'), 0), 'sold-out');
  assert.equal(saleState(nl, new Date('2027-06-01T12:00:00Z'), 0), 'sold-out');
  assert.equal(saleState(nl, new Date('2026-12-10T12:00:00Z'), 500), 'sold-out');
  assert.ok(!onSale(nl, new Date('2026-11-15T12:00:00Z'), 0));
  // Regular marbles have no window.
  assert.equal(saleState(items.find((i) => !i.design.limited), new Date('2026-10-17T12:00:00Z'), 0), 'on-sale');
});

test('no one-off data update retires the plain marbles or hands out collection marbles (retiring a whole collection is allowed)', () => {
  const dir = path.join(__dirname, '..', 'docs', 'data_updates');
  for (const f of fs.readdirSync(dir)) {
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    assert.doesNotMatch(sql, /on_sale|INSERT INTO user_collection|early_player/, f);
  }
});

test('collection code never touches the race engine', () => {
  for (const f of ['src/game/simulator.js', 'src/game/physicsSimulator.js', 'src/game/simulationWorker.js', 'src/game/runSimulation.js']) {
    const code = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    assert.doesNotMatch(code, /user_collection|marbles\/catalog|collection_counters|house_looks|showcase/, f);
  }
});

test('bags: every marble of their rarities in the one shade picked; 30% / 15% off; owning some makes the rest cheaper', () => {
  const { bagOffer } = require('../src/marbles/collection');
  const full = bagOffer('full', 'sunset');
  assert.equal(full.items.length, 10);
  assert.ok(full.items.every((i) => i.slug.endsWith('-sunset')));
  assert.equal(full.price, 41700);
  assert.equal(full.worth, 59500);
  const starter = bagOffer('starter');
  assert.deepEqual(starter.items.map((i) => i.id), ['SC011', 'SC021', 'SC031']);
  assert.equal(starter.price, 2600);
  assert.equal(bagOffer('starter', 'classic', new Set(['clearie-classic'])).price, 1700);
  assert.throws(() => bagOffer('bagPricesRoundTo'), /No such bag/);
  assert.equal(bagOffer('starter', 'classic', new Set(['clearie-classic', 'aggie-classic', 'patch-classic'])).missing, 0);
  assert.throws(() => bagOffer('starter', 'tartan'), /Choose a shade/);
});
