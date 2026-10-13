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
      if (/INSERT INTO payments/.test(sql)) return { rows: [{ id: 'p1', status: 'pending', product_id: params[2], credits: params[3] }] };
      if (/UPDATE payments SET status = 'paid'/.test(sql)) return { rows: [{ user_id: 'u1', credits: 10 }] };
      if (/UPDATE users SET credits/.test(sql)) return { rows: [{ credits: 12 }] };
      return { rows: [] };
    },
  };
}

test('credit packs: 5, 10, 25 and 50 credits at $1 each', () => {
  assert.deepEqual([...payments.PACKS.values()].map((p) => [p.credits, p.amountCents]), [[5, 500], [10, 1000], [25, 2500], [50, 5000]]);
});

test('Stripe, App Store and Google Play are placeholders: nothing is charged or recorded', async () => {
  const client = fakeClient();
  for (const provider of ['stripe', 'apple', 'google']) {
    const r = await payments.checkout(client, 'u1', { productId: 'credits-10', provider });
    assert.equal(r.next.kind, 'unavailable');
    assert.equal(r.payment, null);
  }
  assert.equal(client.calls.length, 0);
  await assert.rejects(payments.redeemReceipt(client, 'u1', { provider: 'apple', receipt: 'x' }), /not checked yet/);
});

test('every provider ends in the same grant: paid once, credits added', async () => {
  const client = fakeClient();
  assert.equal(await payments.grant(client, 'p1', 'ref'), 12);
  assert.match(client.calls[0].sql, /WHERE id = \$1 AND status = 'pending'/);
});

test('the test provider never runs in production', () => {
  const was = process.env.PAYMENTS_TEST;
  process.env.PAYMENTS_TEST = 'true';
  assert.equal(payments.available().test, !require('../src/config').isProduction);
  process.env.PAYMENTS_TEST = was;
});

test('unknown packs and providers are refused', async () => {
  await assert.rejects(payments.checkout(fakeClient(), 'u1', { productId: 'credits-7', provider: 'stripe' }), /No such credit pack/);
  await assert.rejects(payments.checkout(fakeClient(), 'u1', { productId: 'credits-10', provider: 'paypal' }), /Unknown payment provider/);
});
