'use strict';

// The seasonal collection and the season pass's marble on a real database (ROOMS_TEST_DATABASE_URL):
// Winter 2026 is sold only from 1 Dec to 7 Jan at its own prices, then retired (the server refuses,
// whatever the screen shows); Winter Solstice is never sold, comes with the Holiday Season 2026 pass,
// numbered in the order passes were granted, and goes again with a refund.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';

test('Winter 2026 in its window only; Winter Solstice with the pass, numbered, taken back on a refund', { skip: !DB }, async () => {
  const db = require('../src/db');
  const collection = require('../src/marbles/collection');
  const seasons = require('../src/seasons');
  const economy = require('../src/economy');
  const run = crypto.randomBytes(3).toString('hex');
  try {
    const { rows: [season] } = await db.query(`SELECT key FROM seasons WHERE key = 'holiday-2026'`);
    assert.ok(season, 'the Holiday Season 2026 row (its data update) is in the test database');
    const player = async (tag) => {
      const { rows: [u] } = await db.query(
        `INSERT INTO users (username, email, password_hash, coins, age_group) VALUES ($1, $2, 'x', 0, '18+') RETURNING id`,
        [`t_sm${tag}_${run}`, `t_sm${tag}_${run}@test.invalid`],
      );
      await db.withTransaction((c) => economy.change(c, { userId: u.id, amount: 20000, kind: 'admin', note: 'test' }));
      return u.id;
    };
    const a = await player('a');
    const b = await player('b');
    const coins = async (id) => (await db.query('SELECT coins FROM users WHERE id = $1', [id])).rows[0].coins;
    const buy = (id, slug, at) => db.withTransaction((c) => collection.buy(c, id, slug, new Date(at)));

    // Winter 2026: not before 1 Dec, at its own price in the window, retired after 7 Jan 23:59 (Swedish time).
    await assert.rejects(buy(a, 'candy-cane-winter', '2026-11-30T22:59:00Z'), /goes on sale on 1 December 2026/);
    const got = await buy(a, 'candy-cane-winter', '2026-12-05T12:00:00Z');
    assert.equal(got.coins, 20000 - 2000);
    assert.match(got.copy.marbleCode, /^WI031-\d{6}$/);
    await assert.rejects(buy(b, 'snowball-winter', '2027-01-07T23:00:00Z'), (e) => e.status === 410 && /Retired on 7 January 2027/.test(e.message));
    assert.equal(await coins(b), 20000);
    // Never in a bag.
    assert.ok(collection.bagOffer('full', 'classic').items.every((i) => i.id.startsWith('SC')));

    // The pass marble is never sold.
    await assert.rejects(buy(a, 'winter-solstice-2026', '2026-12-05T12:00:00Z'), /only with the Holiday Season 2026 pass/);

    // The pass → the marble, numbered in order; a second grant changes nothing.
    const pay = async (id) => (await db.query(
      `INSERT INTO payments (user_id, provider, provider_ref, product_id, coins, amount_cents, currency, order_no, status, season_key)
       VALUES ($1, 'test', $2, 'holiday-pass-2026', 0, 999, 'usd', 'MS-' || nextval('payment_order_seq'), 'paid', 'holiday-2026') RETURNING *`,
      [id, `sm-${crypto.randomUUID()}`],
    )).rows[0];
    const pa = await pay(a);
    const pb = await pay(b);
    assert.equal(await db.withTransaction((c) => seasons.grantForPayment(c, pa)), 'granted');
    assert.equal(await db.withTransaction((c) => seasons.grantForPayment(c, pb)), 'granted');
    const marble = async (id) => (await db.query(`SELECT * FROM user_collection WHERE user_id = $1 AND item_slug = 'winter-solstice-2026'`, [id])).rows[0];
    const ma = await marble(a);
    const mb = await marble(b);
    assert.equal(mb.edition_no, ma.edition_no + 1);
    assert.equal(ma.price_paid, 0);
    assert.equal(ma.marble_code, `HS011-${String(ma.copy_no).padStart(6, '0')}`);
    await db.withTransaction((c) => collection.grantSeasonMarble(c, a, 'holiday-2026'));
    assert.equal((await marble(a)).id, ma.id);
    // Its certificate: the pass edition and its number, not a First Edition.
    const cert = await collection.certificate(db, ma.marble_code);
    assert.equal(cert.edition, 'Holiday Season 2026 pass edition');
    assert.equal(cert.number, `Holiday 2026 #${String(ma.edition_no).padStart(4, '0')}`);
    assert.equal(cert.firstEdition, false);
    assert.equal(cert.kind, 'pass');

    // B races in it; then B's pass is refunded: the marble (and the Shooter) go, its number is never reused.
    await db.withTransaction((c) => collection.setShooter(c, b, { item: 'winter-solstice-2026' }));
    assert.equal(await db.withTransaction((c) => seasons.revokeForPayment(c, pb, 'test refund')), true);
    assert.equal(await marble(b), undefined);
    assert.equal((await db.query('SELECT 1 FROM user_shooter WHERE user_id = $1 AND item_slug IS NOT NULL', [b])).rowCount, 0);
    assert.ok(await marble(a));

    // A pass from before the marble existed: the hourly job gives it (once).
    const { rows: [pc] } = await db.query(
      `INSERT INTO season_passes (user_id, season_key, payment_id, provider) VALUES ($1, 'holiday-2026', $2, 'test') RETURNING id`,
      [b, (await pay(b)).id],
    );
    assert.ok(pc);
    assert.ok((await seasons.grantMissingMarbles(db)) >= 1);
    const again = await marble(b);
    assert.ok(again.edition_no > mb.edition_no);
    assert.equal(await seasons.grantMissingMarbles(db), 0);
  } finally {
    await db.pool?.end?.();
  }
});
