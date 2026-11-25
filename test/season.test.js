'use strict';

// The scoreboard season comes from client/src/shared/economy.json → season, and is null (not
// shown anywhere) until its number and both dates are set.
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost:1/unused';
const { seasonFrom } = require('../src/routes/scoreboard');

test('no season until number and dates are set', () => {
  assert.equal(seasonFrom({}), null);
  assert.equal(seasonFrom({ number: null, startsAt: null, endsAt: null }), null);
  assert.equal(seasonFrom({ number: 3, startsAt: '2026-11-01T00:00:00Z', endsAt: null }), null);
  assert.equal(seasonFrom({ number: 3, startsAt: '2026-12-01T00:00:00Z', endsAt: '2026-11-01T00:00:00Z' }), null);
  assert.equal(seasonFrom({ number: '3', startsAt: '2026-11-01T00:00:00Z', endsAt: '2026-11-30T23:59:59Z' }), null);
});

test('a set season gets its name, dates and badge size', () => {
  assert.deepEqual(seasonFrom({ number: 1, startsAt: '2026-11-01T00:00:00Z', endsAt: '2026-11-30T23:59:59Z', badgeTop: 50 }), {
    name: 'Season 1', startsAt: '2026-11-01T00:00:00.000Z', endsAt: '2026-11-30T23:59:59.000Z', badgeTop: 50,
  });
});
