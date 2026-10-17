'use strict';

// Northern Lights, the launch limited edition: the server sells it only inside its window
// (1–31 December 2026, Swedish time), whatever a screen shows, as numbered copies #001–#500
// at 25,000 coins; before the window it isn't for sale, after it (or once sold out) never again.
// Against a real database when ROOMS_TEST_DATABASE_URL is set; every change is rolled back.
const test = require('node:test');
const assert = require('node:assert/strict');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';

test('Northern Lights: refused before and after its window, a numbered copy at 25,000 coins inside it', { skip: !DB }, async () => {
  const db = require('../src/db');
  const collection = require('../src/marbles/collection');
  const economy = require('../src/economy');
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const run = Date.now() % 1e6;
    const { rows: [user] } = await client.query(
      "INSERT INTO users (username, email, password_hash, age_group) VALUES ($1, $2, 'x', '18+') RETURNING id",
      [`t_nl_${run}`, `t_nl_${run}@test.invalid`],
    );
    const { balance } = await economy.change(client, { userId: user.id, amount: 60000, kind: 'admin', note: 'test' });
    const slug = 'aurora-aurora';
    const buyAt = (iso) => collection.buy(client, user.id, slug, new Date(iso));

    // Before 1 Dec 00:00 Swedish time (30 Nov 23:00 UTC): not on sale yet.
    await assert.rejects(buyAt('2026-11-30T22:59:59Z'), (e) => e.status === 409 && /on sale on 1 December 2026/.test(e.message));
    // After 31 Dec 23:59: sold out, never again.
    await assert.rejects(buyAt('2026-12-31T23:00:00Z'), (e) => e.status === 410 && /never sold again/.test(e.message));
    await assert.rejects(buyAt('2027-03-01T12:00:00Z'), (e) => e.status === 410);

    // Inside the window: the next numbered copy, 25,000 coins.
    const { rows: [before] } = await client.query('SELECT bought FROM collection_counters WHERE item_slug = $1', [slug]);
    const { copy, coins } = await buyAt('2026-12-01T09:00:00Z');
    assert.equal(coins, balance - 25000);
    assert.equal(copy.editionNo, (before?.bought ?? 0) + 1);
    const view = (await collection.listItems(client, new Date('2026-10-17T12:00:00Z'))).find((i) => i.slug === slug);
    assert.equal(view.sale, 'coming');
    assert.equal(view.editionSize, 500);
  } finally {
    await client.query('ROLLBACK');
    client.release();
    await db.pool.end();
  }
});
