'use strict';

// Solo or group: who may skip to the results and race again before the last marble is home.
const test = require('node:test');
const assert = require('node:assert/strict');
const { raceSession, mayRaceAgain } = require('../src/game/raceSession');

const bots = Array.from({ length: 19 }, () => ({ user_id: null, is_bot: true }));
const me = { user_id: 'u1', is_bot: false };
const friend = { user_id: 'u2', is_bot: false };

test('one real player against house marbles is a solo race: skip and race again early', () => {
  assert.deepEqual(raceSession([me, ...bots]), { players: 1, solo: true, canSkip: true, raceAgainEarly: true });
});

test('two or more real players are a group: no skip, everyone watches to the end', () => {
  assert.deepEqual(raceSession([me, friend, ...bots.slice(1)]), { players: 2, solo: false, canSkip: false, raceAgainEarly: false });
  assert.equal(raceSession([...bots, ...bots]).solo, false); // nobody real: not solo either
});

test('racing again: anyone once the race is over; mid-race only the solo player', () => {
  const running = { status: 'running' };
  assert.equal(mayRaceAgain({ status: 'finished' }, [me, friend], 'u2'), true);
  assert.equal(mayRaceAgain(running, [me, ...bots], 'u1'), true);
  assert.equal(mayRaceAgain(running, [me, ...bots], 'u9'), false, 'not their race');
  assert.equal(mayRaceAgain(running, [me, friend], 'u1'), false, 'a group waits for the last marble');
  assert.equal(mayRaceAgain({ status: 'countdown' }, [me, ...bots], 'u1'), false);
});
