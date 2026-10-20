'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { pickShowcaseLooks, SHOWCASE_MIX, lookTier } = require('../src/marbles/showcase');
const { bySlug } = require('../src/marbles/catalog');
const { simulateRace } = require('../src/game/simulator');
const { realTracks } = require('./helpers/realTracks');
const { houseField } = require('../scripts/race-fingerprints');
const { showcaseFairness } = require('../src/report/summarize');
const { createRng } = require('../src/game/rng');

test('computer players get about 6 Common/Uncommon, 3 Rare/Epic and 1 Legendary; the rest stay plain', () => {
  const looks = pickShowcaseLooks(19);
  assert.equal(looks.length, 19);
  const worn = looks.filter(Boolean);
  assert.equal(worn.length, SHOWCASE_MIX.reduce((n, m) => n + m.count, 0));
  assert.equal(new Set(worn).size, worn.length, 'no two computer players in the same marble');
  SHOWCASE_MIX.forEach((m, t) => assert.equal(worn.filter((s) => lookTier(s) === t).length, m.count));
  for (const s of worn) assert.ok(!bySlug.get(s).design.limited, 'never the limited edition');
});

test('the showcase marbles vary from race to race', () => {
  const seen = new Set();
  for (let k = 0; k < 20; k += 1) seen.add(pickShowcaseLooks(19).filter(Boolean).sort().join());
  assert.ok(seen.size > 15);
});

test('fewer computer players than the mix: they all wear one, in the mix order of priority', () => {
  const looks = pickShowcaseLooks(4);
  assert.equal(looks.filter(Boolean).length, 4);
});

test('a race comes out exactly the same whatever marbles the computer players wear', () => {
  const track = realTracks()[0];
  for (const seed of [11, 222, 3333]) {
    const plain = houseField(seed).slice(0, 16);
    const looks = pickShowcaseLooks(plain.length);
    const dressed = plain.map((e, i) => ({ ...e, look: looks[i] }));
    const a = simulateRace({ seed, track, entries: plain });
    const b = simulateRace({ seed, track, entries: dressed });
    assert.deepEqual(b.results, a.results);
  }
});

test('the server never hands a look to the race engine', () => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'src', 'game', 'raceService.js'), 'utf8');
  assert.match(code, /simulationPool\.simulate\(input\.race, input\.entries\.map\(engineEntry\)\)/);
  assert.match(code, /runSimulation\(race, entries\.map\(engineEntry\)\)/);
  assert.match(code, /const engineEntry = \(\{ look, marble_rarity, marble_starter, marble_code, \.\.\.entry \}\) => entry/);
});

test('the report flags a marble tier that wins more than its share, and passes a fair spread', () => {
  const rng = createRng(7);
  const fair = Array.from({ length: 3000 }, (_, k) => ({ seed: k, field: 20, winner: Math.floor(rng.next() * 20) }));
  assert.equal(showcaseFairness(fair)[0].pass, true);
  // Rig it: always the Legendary marble wins.
  const rigged = fair.map((r) => {
    const g = createRng((r.seed ^ 0x5eed) >>> 0);
    const looks = pickShowcaseLooks(r.field, () => g.next());
    return { ...r, winner: looks.findIndex((s) => s && lookTier(s) === 2) };
  });
  assert.equal(showcaseFairness(rigged)[0].pass, false);
});
