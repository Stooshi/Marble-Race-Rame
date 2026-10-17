'use strict';

// The coin economy (client/src/shared/economy.json, src/economy).
const test = require('node:test');
const assert = require('node:assert/strict');
const { economy, placeCoins, dayKey, dayBefore, streakAfter, raceLines, bagPrice, KINDS, EARNED, BOUGHT } = require('../src/economy');
const packs = require('../client/src/shared/payments/packs.json').packs;
const { catalog } = require('../src/marbles/catalog');

test('one currency: coins only, 650 to start', () => {
  assert.equal(economy.startingCoins, 650);
  assert.doesNotMatch(JSON.stringify(economy), /credit/i);
  assert.doesNotMatch(JSON.stringify(catalog.rarities), /credit/i);
});

test('a race pays 15 for taking part plus a finishing bonus: 50 / 30 / 20, then 5 down to 10th, nothing after', () => {
  assert.deepEqual([1, 2, 3, 4, 7, 10, 11, 20].map(placeCoins), [50, 30, 20, 5, 5, 5, 0, 0]);
  assert.equal(placeCoins(0), 0);
  assert.deepEqual(raceLines({ place: 1 }), [{ kind: 'race', amount: 15 }, { kind: 'finish-bonus', amount: 50 }]);
  assert.deepEqual(raceLines({ place: 15 }), [{ kind: 'race', amount: 15 }]);
});

test('daily limit: full coins for the first 10 races a day, then 5 a race whatever the place', () => {
  assert.equal(raceLines({ place: 1, racesToday: 10 }).reduce((n, l) => n + l.amount, 0), 65);
  assert.deepEqual(raceLines({ place: 1, racesToday: 11 }).map((l) => [l.kind, l.amount]), [['race', 5]]);
  assert.deepEqual(raceLines({ place: 20, racesToday: 40 }).map((l) => [l.kind, l.amount]), [['race', 5]]);
});

test('the daily goal: 5 races for a flat 35; the streak is counted but pays nothing', () => {
  assert.deepEqual(economy.dailyGoal, { races: 5, coins: 35 });
  assert.equal(economy.streak.perDay, undefined);
  assert.equal(dayKey('2026-10-13T23:59:59Z'), '2026-10-13');
  assert.equal(dayBefore('2026-03-01'), '2026-02-28');
  assert.equal(streakAfter({ days: 0, lastDay: null }, '2026-10-13'), 1);
  assert.equal(streakAfter({ days: 4, lastDay: '2026-10-12' }, '2026-10-13'), 5);
  assert.equal(streakAfter({ days: 4, lastDay: '2026-10-13' }, '2026-10-13'), 4);
  assert.equal(streakAfter({ days: 9, lastDay: '2026-10-10' }, '2026-10-13'), 1);
});

test('prices: Common 1,000 · Uncommon 2,500 · Rare 6,000 · Epic 12,000 · Legendary 25,000 coins', () => {
  const r = catalog.rarities;
  assert.deepEqual(['common', 'uncommon', 'rare', 'epic', 'legendary'].map((k) => r[k].price), [1000, 2500, 6000, 12000, 25000].map((coins) => ({ coins })));
  assert.equal(r.limited.price.coins, 25000); // the launch limited edition, Northern Lights
});

test('the target: 5 races a day at an average place buys the first Common on day 2–3, then about one a week', () => {
  // The expected coins of one full-pay race finishing anywhere from 1st to 20th.
  let perRace = 0;
  for (let p = 1; p <= 20; p += 1) perRace += raceLines({ place: p }).reduce((n, l) => n + l.amount, 0) / 20;
  const perDay = 5 * perRace + economy.dailyGoal.coins;
  const common = catalog.rarities.common.price.coins;
  let coins = economy.startingCoins;
  let day = 0;
  while (coins < common) { day += 1; coins += perDay; }
  assert.ok(day >= 2 && day <= 3, `first Common on day ${day}`);
  const days = common / perDay;
  assert.ok(days >= 6 && days <= 8, `then one every ${days.toFixed(1)} days`);
});

test('bags: 30% off the 10 marbles, 15% off the 3 Commons, rounded to the nearest 100', () => {
  assert.equal(bagPrice('full', 3 * 1000 + 3 * 2500 + 2 * 6000 + 12000 + 25000), 41700);
  assert.equal(bagPrice('starter', 3000), 2600);
  assert.equal(bagPrice('starter', 2000), 1700);
});

test('coin packs for real money: $5 = 5,000 · $10 = 10,500 · $25 = 27,500 · $50 = 57,500', () => {
  assert.deepEqual(packs.map((p) => [p.amountCents, p.coins]), [[500, 5000], [1000, 10500], [2500, 27500], [5000, 57500]]);
  assert.ok(packs.every((p) => p.credits === undefined));
});

test('earned and bought coins are counted apart: earned kinds are race coins only', () => {
  for (const k of [...EARNED, ...BOUGHT]) assert.ok(KINDS.includes(k));
  assert.deepEqual(EARNED, ['race', 'finish-bonus', 'daily-goal']);
  for (const k of BOUGHT) assert.ok(!EARNED.includes(k));
  for (const k of ['purchase', 'bag', 'admin', 'refund', 'start', 'opening-balance']) assert.ok(!EARNED.includes(k) && !BOUGHT.includes(k));
});
