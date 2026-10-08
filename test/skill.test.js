'use strict';

// Skill belongs to the player, not the marble: every marble in the Marble Bag
// races at the player's skill, and house marbles race at levels from the house
// ladder. Races already run keep their own copy of the stats they ran with.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { HOUSE_SKILLS, STARTING_SKILL, skillStats } = require('../src/game/skill');
const { runSimulation } = require('../src/game/runSimulation');

const SRC = path.join(__dirname, '..', 'src');
const sources = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory()
  ? sources(path.join(dir, d.name))
  : d.name.endsWith('.js') ? [path.join(dir, d.name)] : []));

test('a skill level sets all four engine stats alike, within 1-100', () => {
  assert.deepEqual(skillStats(50), { topSpeed: 50, acceleration: 50, handling: 50, luck: 50 });
  assert.deepEqual(skillStats(120), skillStats(100));
  assert.deepEqual(skillStats(null), skillStats(STARTING_SKILL));
});

test('the house ladder fills a race, centred on the starting skill, so a new player is exactly average', () => {
  assert.equal(HOUSE_SKILLS.length, 20);
  assert.equal(HOUSE_SKILLS.reduce((a, b) => a + b, 0) / HOUSE_SKILLS.length, STARTING_SKILL);
  assert.equal(STARTING_SKILL, 50);
  assert.ok(Math.min(...HOUSE_SKILLS) >= 40 && Math.max(...HOUSE_SKILLS) <= 60, 'close in strength: anyone can win');
});

test('no race reads a marble\'s stats any more: only each entry\'s own snapshot', () => {
  for (const file of sources(SRC)) {
    const code = fs.readFileSync(file, 'utf8');
    // The catalog's stat columns (top_speed and co.) are read nowhere; entries' snap_* copies are.
    assert.doesNotMatch(code, /\btop_speed\b/, `${path.relative(SRC, file)} reads a marble's stats`);
  }
});

test('old races replay exactly: a race runs from its entries\' snapshots, whatever the marbles are now', () => {
  // An old classic race, run with each marble's own stats as they were then.
  const race = { seed: 99, tick_rate_hz: 10, length_m: 600, lane_count: 4, obstacles: [], physics: null };
  const entries = Array.from({ length: 20 }, (_, i) => ({
    id: `e${i}`, lane: i, snap_top_speed: 44 + (i % 9), snap_acceleration: 50 + (i % 5), snap_handling: 46 + (i % 7), snap_luck: 48 + (i % 4),
  }));
  const a = runSimulation(race, entries);
  // Same snapshot, same race (the marble catalog plays no part).
  assert.equal(JSON.stringify(runSimulation(race, entries.map((e) => ({ ...e, marble: { top_speed: 1 } })))), JSON.stringify(a));
});

test('the refund gives back exactly what was spent on bought marbles, once, and keeps every marble', () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'docs', 'data_updates', '2026-10-12-skill-belongs-to-the-player.sql'), 'utf8');
  assert.match(sql, /SUM\(m\.price_coins\)/);
  assert.match(sql, /NOT m\.is_starter/);
  assert.match(sql, /skill_refund_coins = p\.coins/);
  assert.doesNotMatch(sql, /DELETE|user_marbles\s+SET/i, 'nobody loses a marble');
});
