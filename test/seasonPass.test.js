'use strict';

// Seasons (src/seasons): the season's dates, the Track of the Day and the pass sale.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const Stripe = require('stripe');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_for_tests';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fake_for_tests';
process.env.PUBLIC_SITE_URL = 'https://marblespins.test';
delete process.env.STRIPE_ALLOW_LIVE;

const seasons = require('../src/seasons');

// The Holiday Season 2026 as its data update sets it.
const HOLIDAY = {
  key: 'holiday-2026', name: 'Holiday Season 2026', time_zone: 'Europe/Stockholm',
  starts_at: '2026-12-01T00:00:00+01:00', ends_at: '2027-01-07T23:59:59+01:00', free_from: '2027-01-07T23:59:59+01:00',
  pass_product_id: 'holiday-pass-2026', pass_name: 'Holiday Season Pass 2026', price_cents: 999, currency: 'usd',
  pass_sale_starts_at: '2026-12-01T00:00:00+01:00', pass_sale_ends_at: '2027-01-07T23:59:59+01:00',
  featured: { '2026-12-01': 'tromso-aurora-grand-prix', '2026-12-24': 'gamla-stan-christmas-run', '2027-01-07': 'lalibela-genna-spins' },
  featured_bonus: 0.5,
};

test('the season by its own dates: locked before 1 Dec, pass holders until 7 Jan 23:59 Swedish time, then free', () => {
  assert.equal(seasons.stateOf(HOLIDAY, new Date('2026-11-30T22:59:59Z')), 'before');
  assert.equal(seasons.stateOf(HOLIDAY, new Date('2026-11-30T23:00:00Z')), 'on'); // (midnight in Stockholm)
  assert.equal(seasons.stateOf(HOLIDAY, new Date('2027-01-07T22:59:58Z')), 'on');
  assert.equal(seasons.stateOf(HOLIDAY, new Date('2027-01-07T22:59:59Z')), 'free');
});

test('the Track of the Day goes by the Swedish calendar day', () => {
  assert.equal(seasons.featuredSlug(HOLIDAY, new Date('2026-11-30T23:30:00Z')), 'tromso-aurora-grand-prix'); // (00:30 on 1 Dec in Stockholm)
  assert.equal(seasons.featuredSlug(HOLIDAY, new Date('2026-12-24T12:00:00Z')), 'gamla-stan-christmas-run');
  assert.equal(seasons.featuredSlug(HOLIDAY, new Date('2026-12-02T12:00:00Z')), null); // (no entry: no Track of the Day)
  assert.equal(seasons.featuredSlug(HOLIDAY, new Date('2027-01-07T20:00:00Z')), 'lalibela-genna-spins');
  assert.equal(seasons.featuredSlug(HOLIDAY, new Date('2027-01-08T12:00:00Z')), null); // (the season is over)
  assert.equal(seasons.dayOf(HOLIDAY, new Date('2026-12-31T23:30:00Z')), '2027-01-01');
});

test('the pass is sold from the season\'s start to its end, with an "ends in N days" countdown from 1 Jan', () => {
  assert.equal(seasons.passOnSale(HOLIDAY, new Date('2026-11-30T12:00:00Z')), false);
  assert.equal(seasons.passOnSale(HOLIDAY, new Date('2026-12-15T12:00:00Z')), true);
  assert.equal(seasons.passOnSale(HOLIDAY, new Date('2027-01-08T00:00:00Z')), false);
  const from = seasons.lastMonthStart(HOLIDAY);
  assert.equal(from.toISOString(), '2026-12-31T23:00:00.000Z'); // (1 Jan 00:00 in Stockholm)
  assert.equal(seasons.saleDaysLeft(HOLIDAY, new Date('2026-12-20T12:00:00Z'), from), null);
  assert.equal(seasons.saleDaysLeft(HOLIDAY, new Date('2027-01-01T08:00:00Z'), from), 7);
  assert.equal(seasons.saleDaysLeft(HOLIDAY, new Date('2027-01-07T20:00:00Z'), from), 1);
});
