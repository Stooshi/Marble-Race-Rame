'use strict';

// Every player's own 4 starter marbles (src/marbles/starters.js, 20 Oct 2026).
const test = require('node:test');
const assert = require('node:assert/strict');
const starters = require('../src/marbles/starters');

test('76 looks from 12 clearly different colours: 12 one-colour, the rest half and half', () => {
  assert.equal(starters.PALETTE.length, 12);
  for (let i = 0; i < 12; i += 1) for (let j = i + 1; j < 12; j += 1) assert.ok(starters.difference(starters.PALETTE[i].hex, starters.PALETTE[j].hex) >= 0.138);
  assert.equal(starters.LOOKS.filter((l) => l.pattern === 'solid').length, 12);
  assert.equal(starters.LOOKS.length, 76);
  assert.equal(new Set(starters.LOOKS.map((l) => l.key)).size, 76);
  for (const l of starters.LOOKS.filter((x) => x.pattern === 'half')) assert.ok(starters.difference(l.colours[0].hex, l.colours[1].hex) >= 0.16);
});

test('a player gets one one-colour and three two-colour starters, all different', () => {
  for (let i = 0; i < 200; i += 1) {
    const set = starters.chooseLooks();
    assert.deepEqual(set.map((l) => l.pattern), ['solid', 'half', 'half', 'half']);
    assert.equal(new Set(set.map((l) => l.key)).size, 4);
  }
});

test('the same two colours in either order look alike; one colour never looks like two', () => {
  assert.equal(starters.lookKey('half', ['#E0262B', '#1E44E6']), starters.lookKey('half', ['#1e44e6', '#e0262b']));
  assert.notEqual(starters.lookKey('solid', ['#E0262B']), starters.lookKey('half', ['#E0262B', '#E0262B']));
});

// A race's line-up with a fake database: entries and their owners' starters.
const row = (id, owner, n, a, b = null) => ({ id, owner_id: owner, starter_no: n, pattern: b ? 'half' : 'solid', color_primary: a, color_secondary: b });
function fakeClient(entries, theirs) {
  let call = 0;
  return { query: async () => (call++ === 0 ? { rows: entries } : { rows: theirs }) };
}

test('line-up: a joining player takes their first starter nobody shows', async () => {
  const a1 = row('a1', 'A', 1, '#E0262B');
  const client = fakeClient([{ entry_id: 'eA', user_id: 'A', marble_id: 'a1' }], [a1, row('a2', 'A', 2, '#1E44E6', '#F4F4EF')]);
  const mine = [row('m1', 'M', 1, '#E0262B'), row('m2', 'M', 2, '#FFD21F', '#22252E')];
  assert.deepEqual(await starters.lineUp(client, 'race', mine), { marbleId: 'm2', moves: [] });
});

test('line-up: an earlier player moves to their next starter when that is the only way', async () => {
  // A shows red (has green too), B shows blue (has red too); the newcomer has only red and blue.
  const red = '#E0262B'; const blue = '#1E44E6'; const green = '#1E8A3A';
  const client = fakeClient(
    [{ entry_id: 'eA', user_id: 'A', marble_id: 'a1' }, { entry_id: 'eB', user_id: 'B', marble_id: 'b1' }],
    [row('a1', 'A', 1, red), row('a2', 'A', 2, green), row('b1', 'B', 1, blue), row('b2', 'B', 2, red)],
  );
  const out = await starters.lineUp(client, 'race', [row('m1', 'M', 1, red), row('m2', 'M', 2, blue)]);
  assert.equal(out.marbleId, 'm1');
  assert.deepEqual(out.moves, [{ entryId: 'eA', marbleId: 'a2' }]); // (A to green; nobody else moves)
});

test('line-up: 20,000 random 20-player races, every player gets one of their own, no two alike', async () => {
  let n = 0;
  for (let race = 0; race < 1000; race += 1) {
    const entries = []; const theirs = [];
    for (let p = 0; p < 20; p += 1) {
      const mine = starters.chooseLooks().map((l, i) => row(`p${p}-${i}`, `P${p}`, i + 1, l.colours[0].hex, l.colours[1]?.hex ?? null));
      let k = 0;
      const client = { query: async () => (k++ === 0 ? { rows: entries.map((e) => ({ ...e })) } : { rows: theirs }) };
      const { marbleId, moves } = await starters.lineUp(client, 'race', mine);
      for (const mv of moves) entries.find((e) => e.entry_id === mv.entryId).marble_id = mv.marbleId;
      entries.push({ entry_id: `e${p}`, user_id: `P${p}`, marble_id: marbleId });
      theirs.push(...mine);
      n += 1;
    }
    const byId = new Map(theirs.map((m) => [m.id, m]));
    const keys = entries.map((e) => starters.keyOfRow(byId.get(e.marble_id)));
    assert.equal(new Set(keys).size, 20, `race ${race}`);
    for (const e of entries) assert.equal(byId.get(e.marble_id).owner_id, e.user_id);
  }
  assert.equal(n, 20000);
});
