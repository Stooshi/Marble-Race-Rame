'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { NAMES, computerPlayers, dressRows } = require('../src/marbles/computerPlayers');
const { lookKey } = require('../src/marbles/starters');

const bot = (id, extra = {}) => ({ id, is_bot: true, color_primary: '#E0262B', color_secondary: null, pattern: 'solid', ...extra });

test('computer players: friendly names, all different, the same every time a race is shown', () => {
  const entries = Array.from({ length: 19 }, (_, i) => bot(`b${String(i).padStart(2, '0')}`));
  entries.push({ id: 'p1', is_bot: false, color_primary: '#1E44E6', color_secondary: null, pattern: 'solid' });
  const a = computerPlayers('race-1', entries);
  const b = computerPlayers('race-1', [...entries].reverse());
  assert.equal(a.size, 19);
  const names = [...a.values()].map((p) => p.name);
  assert.equal(new Set(names).size, 19);
  for (const n of names) assert.ok(NAMES.includes(n));
  assert.deepEqual([...a.entries()].sort(), [...b.entries()].sort()); // (order of the rows never matters)
  assert.notDeepEqual(names, [...computerPlayers('race-2', entries).values()].map((p) => p.name));
});

test('computer players: plain looks no one else in the race shows; a showcase marble is kept', () => {
  const players = [
    { id: 'p1', is_bot: false, color_primary: '#1E44E6', color_secondary: null, pattern: 'solid' },
    { id: 'p2', is_bot: false, color_primary: '#E0262B', color_secondary: '#FFD21F', pattern: 'half' },
  ];
  const bots = Array.from({ length: 18 }, (_, i) => bot(`b${i}`, i === 3 ? { look: 'some-showcase' } : {}));
  const out = computerPlayers('race-9', [...players, ...bots]);
  assert.equal(out.get('b3').look, null);
  const keys = [...out.values()].filter((p) => p.look).map((p) => lookKey(p.look.pattern, [p.look.color_primary, p.look.color_secondary]));
  assert.equal(keys.length, 17);
  assert.equal(new Set([...keys, ...players.map((p) => lookKey(p.pattern, [p.color_primary, p.color_secondary]))]).size, 19);
  // A name never depends on the looks (a track record looks it up without them).
  const plain = computerPlayers('race-9', [...players, ...bots.map(({ look, ...b }) => b)]);
  for (const [id, p] of out) assert.equal(plain.get(id).name, p.name);
});

test('computer players: dressRows changes only the computer players, and never the rows it is given', () => {
  const rows = [{ entry_id: 'x', is_bot: false, marble_name: 'Mine', color_primary: '#1E44E6', pattern: 'solid' }, { entry_id: 'y', is_bot: true, marble_name: 'Ruby', color_primary: '#E0262B', pattern: 'solid' }];
  const copy = JSON.parse(JSON.stringify(rows));
  const out = dressRows('r', rows, { idField: 'entry_id' });
  assert.deepEqual(rows, copy);
  assert.equal(out[0], rows[0]);
  assert.ok(NAMES.includes(out[1].marble_name));
  assert.equal(out[1].computer_name, out[1].marble_name);
});

test('computer players: no real people or brands in the names (a short list of words to keep out)', () => {
  for (const n of NAMES) assert.doesNotMatch(n, /cpu|bot\b|lego|nintendo|disney|mario|sonic|pikachu/i);
});
