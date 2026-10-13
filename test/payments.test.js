'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const payments = require('../src/payments');

/** A pretend database client that records queries and answers a few. */
function fakeClient() {
  const calls = [];
  return {
    calls,
    async query(sql, params) {
      calls.push({ sql, params });
      if (/INSERT INTO payments/.test(sql)) return { rows: [{ id: 'p1', status: 'pending', product_id: params[2], coins: params[3] }] };
      if (/UPDATE payments SET status = 'paid'/.test(sql)) return { rows: [{ user_id: 'u1', coins: 10500 }] };
      if (/UPDATE users SET coins/.test(sql)) return { rows: [{ balance: 11150 }] };
      if (/INSERT INTO coin_ledger/.test(sql)) return { rows: [{ id: 1 }] };
      return { rows: [] };
    },
  };
}

test('coin packs: 5,000 / 10,500 / 27,500 / 57,500 coins for $5 / $10 / $25 / $50', () => {
  assert.deepEqual([...payments.PACKS.values()].map((p) => [p.coins, p.amountCents]), [[5000, 500], [10500, 1000], [27500, 2500], [57500, 5000]]);
});

test('Stripe, App Store and Google Play are placeholders: nothing is charged or recorded', async () => {
  const client = fakeClient();
  for (const provider of ['stripe', 'apple', 'google']) {
    const r = await payments.checkout(client, 'u1', { productId: 'coins-10500', provider });
    assert.equal(r.next.kind, 'unavailable');
    assert.equal(r.payment, null);
  }
  assert.equal(client.calls.length, 0);
  await assert.rejects(payments.redeemReceipt(client, 'u1', { provider: 'apple', receipt: 'x' }), /not checked yet/);
});

test('every provider ends in the same grant: paid once, coins added as bought coins and written to the coin ledger', async () => {
  const client = fakeClient();
  assert.equal(await payments.grant(client, 'p1', 'ref'), 11150);
  assert.match(client.calls[0].sql, /WHERE id = \$1 AND status = 'pending'/);
  const line = client.calls.find((c) => /INSERT INTO coin_ledger/.test(c.sql));
  assert.deepEqual(line.params.slice(1, 3), [10500, 'coin-pack']);
  const user = client.calls.find((c) => /UPDATE users SET coins/.test(c.sql));
  assert.deepEqual(user.params.slice(1), [10500, 0, 10500]); // bought, not earned
});

test('the test provider never runs in production', () => {
  const was = process.env.PAYMENTS_TEST;
  process.env.PAYMENTS_TEST = 'true';
  assert.equal(payments.available().test, !require('../src/config').isProduction);
  process.env.PAYMENTS_TEST = was;
});

test('unknown packs and providers are refused', async () => {
  await assert.rejects(payments.checkout(fakeClient(), 'u1', { productId: 'coins-7', provider: 'stripe' }), /No such coin pack/);
  await assert.rejects(payments.checkout(fakeClient(), 'u1', { productId: 'coins-10500', provider: 'paypal' }), /Unknown payment provider/);
});
