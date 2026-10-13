'use strict';

// The coin economy (client/src/shared/economy.json, src/economy).
const test = require('node:test');
const assert = require('node:assert/strict');
const { economy, placeCoins, dayKey, dayBefore, streakAfter, goalBonus, raceLines, KINDS, EARNED } = require('../src/economy');
const { catalog } = require('../src/marbles/catalog');

test('races pay by place, the winner most and every finisher something', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 10, 11, 20].map(placeCoins), [50, 40, 30, 20, 20, 12, 12, 8, 8]);
  assert.equal(placeCoins(0), 0);
  for (let p = 2; p <= 20; p += 1) assert.ok(placeCoins(p) <= placeCoins(p - 1));
});

test('a race: its place, a personal best on top; past the farm guard only a token', () => {
  assert.deepEqual(raceLines({ place: 3 }), [{ kind: 'race', amount: 30 }]);
  assert.deepEqual(raceLines({ place: 1, personalBest: true }), [{ kind: 'race', amount: 50 }, { kind: 'personal-best', amount: 10 }]);
  const guard = economy.farmGuard.paidRacesPerDay;
  assert.equal(raceLines({ place: 1, personalBest: true, racesToday: guard }).length, 2);
  assert.deepEqual(raceLines({ place: 1, personalBest: true, racesToday: guard + 1 }), [{ kind: 'race', amount: economy.farmGuard.coinsAfter }]);
});

test('the streak: day by day while the goal is met, back to day 1 after a missed day; its bonus capped', () => {
  assert.equal(dayKey('2026-10-13T23:59:59Z'), '2026-10-13');
  assert.equal(dayBefore('2026-03-01'), '2026-02-28');
  assert.equal(streakAfter({ days: 0, lastDay: null }, '2026-10-13'), 1);
  assert.equal(streakAfter({ days: 4, lastDay: '2026-10-12' }, '2026-10-13'), 5);
  assert.equal(streakAfter({ days: 4, lastDay: '2026-10-13' }, '2026-10-13'), 4);
  assert.equal(streakAfter({ days: 9, lastDay: '2026-10-10' }, '2026-10-13'), 1);
  assert.deepEqual(goalBonus(1), { goal: 50, streak: 10 });
  assert.deepEqual(goalBonus(7), { goal: 50, streak: 70 });
  assert.deepEqual(goalBonus(30), { goal: 50, streak: 70 });
});

test('a regular player (10 mid-field races a day, goal met) earns roughly 200–300 coins a day', () => {
  let day = 0;
  for (let i = 1; i <= 10; i += 1) day += raceLines({ place: 8, racesToday: i }).reduce((n, l) => n + l.amount, 0);
  const b = goalBonus(4);
  day += b.goal + b.streak;
  assert.ok(day >= 200 && day <= 300, String(day));
  // So a Common is a day's racing and a Legendary a few weeks.
  assert.ok(catalog.rarities.common.price.coins <= day);
  const weeks = catalog.rarities.legendary.price.coins / day / 7;
  assert.ok(weeks > 1.5 && weeks < 4, String(weeks));
});

test('coin packs give more coins per credit the bigger they are; bags cost less than their marbles', () => {
  const rate = economy.coinPacks.map((p) => p.coins / p.credits);
  for (let i = 1; i < rate.length; i += 1) assert.ok(rate[i] > rate[i - 1]);
  const commons = 3 * catalog.rarities.common.price.coins;
  assert.ok(economy.bags.starter.price.coins < commons);
  assert.ok(economy.bags.full.price.credits > 0);
});

test('every earned kind is a ledger kind; spending kinds are not earned', () => {
  for (const k of EARNED) assert.ok(KINDS.includes(k));
  for (const k of ['purchase', 'coin-pack', 'admin', 'refund', 'start']) assert.ok(!EARNED.includes(k));
});
