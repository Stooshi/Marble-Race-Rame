'use strict';

// Stripe on the website, in test mode: the key rules always; the whole flow (checkout → signed
// webhook → coins once → refund takes them back) against a real database when
// ROOMS_TEST_DATABASE_URL is set. Stripe's API is a fake here; the webhook signatures are real.
const test = require('node:test');
const assert = require('node:assert/strict');
const Stripe = require('stripe');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_for_tests';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fake_for_tests';
process.env.PUBLIC_SITE_URL = 'https://marblespins.test';
delete process.env.STRIPE_ALLOW_LIVE;

const config = require('../src/config');
const stripe = require('../src/payments/stripe');

test('test keys work; a live key is refused until STRIPE_ALLOW_LIVE=true', () => {
  const was = { ...config.stripe };
  try {
    assert.equal(stripe.configured(), true);
    assert.equal(stripe.mode(), 'test');
    config.stripe.secretKey = 'sk_live_abc';
    assert.equal(stripe.configured(), false);
    assert.equal(stripe.mode(), 'live-blocked');
    config.stripe.allowLive = true;
    assert.equal(stripe.configured(), true);
    config.stripe.secretKey = null;
    assert.equal(stripe.configured(), false);
  } finally {
    Object.assign(config.stripe, was);
  }
});

test('a webhook without Stripe\'s signature is refused', () => {
  const body = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed', data: { object: {} } });
  assert.throws(() => stripe.verify(Buffer.from(body), 't=1,v1=bad'), /signature/);
  const good = Stripe.webhooks.generateTestHeaderString({ payload: body, secret: 'whsec_fake_for_tests' });
  assert.equal(stripe.verify(Buffer.from(body), good).id, 'evt_1');
  const forged = Stripe.webhooks.generateTestHeaderString({ payload: body, secret: 'whsec_someone_else' });
  assert.throws(() => stripe.verify(Buffer.from(body), forged), /signature/);
});

/** A pretend Stripe API: remembers the Checkout sessions and refunds asked for. */
function fakeStripe() {
  const made = { sessions: [], refunds: [] };
  const run = Date.now().toString(36);
  return {
    made,
    checkout: { sessions: { create: async (params, opts) => { const id = `cs_test_${run}_${made.sessions.length + 1}`; made.sessions.push({ params, opts, id }); return { id, url: `https://checkout.stripe.com/c/pay/${id}` }; } } },
    paymentIntents: { retrieve: async (id) => ({ id, latest_charge: { receipt_url: `https://pay.stripe.com/receipts/${id}` } }) },
    refunds: { create: async (params, opts) => { made.refunds.push({ params, opts }); return { id: `re_test_${run}_${made.refunds.length}`, status: 'pending', amount: params.amount ?? 1000 }; } },
  };
}

test('checkout → Stripe\'s signed "paid" webhook adds the coins once; a refund takes them back (ledger + audit)', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const totp = require('../src/admin/totp');
  const fake = fakeStripe();
  stripe.setClient(fake);
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token, headers = {} } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...headers, ...(token && { authorization: `Bearer ${token}` }) }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  let n = 0;
  const send = (type, object) => {
    const payload = JSON.stringify({ id: `evt_test_${Date.now()}_${++n}`, object: 'event', type, data: { object } });
    return { payload, go: () => call('/payments/stripe/webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': Stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_fake_for_tests' }) } }) };
  };
  try {
    const name = `t_str_${Date.now() % 1e6}`;
    const me = (await call('/auth/register', { method: 'POST', body: { username: name, email: `${name}@test.invalid`, password: 'password123', age_group: '18+' } })).body;
    const start = me.user.coins;
    assert.equal((await call('/payments')).body.stripeMode, 'test');

    // No consent, no checkout.
    assert.equal((await call('/payments/checkout', { method: 'POST', token: me.token, body: { productId: 'coins-10500', provider: 'stripe' } })).status, 400);
    const out = (await call('/payments/checkout', { method: 'POST', token: me.token, body: { productId: 'coins-10500', provider: 'stripe', consent: true } })).body;
    assert.equal(out.next.kind, 'redirect');
    assert.match(out.next.url, /^https:\/\/checkout\.stripe\.com\//);
    assert.match(out.payment.order_no, /^MS-\d{4,}$/);
    const { params, opts } = fake.made.sessions[0];
    assert.equal(params.line_items[0].price_data.unit_amount, 1000);
    assert.equal(params.line_items[0].price_data.currency, 'usd');
    assert.equal(params.line_items[0].price_data.tax_behavior, 'inclusive');
    assert.deepEqual(params.automatic_tax, { enabled: true });
    assert.deepEqual(params.adaptive_pricing, { enabled: true });
    assert.equal(params.customer_email, `${name}@test.invalid`);
    assert.equal(params.payment_method_types, undefined); // (card, Apple Pay, Google Pay: as the dashboard allows)
    assert.match(params.custom_text.submit.message, /14-day right of withdrawal/);
    assert.ok(params.success_url.startsWith(`https://marblespins.test/purchases?paid=${out.payment.order_no}`));
    assert.match(opts.idempotencyKey, /^checkout-/);
    const { rows: [pay] } = await db.query('SELECT * FROM payments WHERE order_no = $1', [out.payment.order_no]);
    assert.equal(pay.status, 'pending');
    assert.match(pay.consent_text, /14-day right of withdrawal/);
    assert.ok(pay.consent_at);

    // Stripe sends the player back to the address they bought from, if it's one of the site's own.
    const fromWww = (await call('/payments/checkout', { method: 'POST', token: me.token, headers: { origin: 'https://www.marblespins.com' }, body: { productId: 'coins-5000', provider: 'stripe', consent: true } })).body;
    assert.ok(fake.made.sessions.at(-1).params.success_url.startsWith(`https://www.marblespins.com/purchases?paid=${fromWww.payment.order_no}`));
    const fromElsewhere = (await call('/payments/checkout', { method: 'POST', token: me.token, headers: { origin: 'https://evil.example' }, body: { productId: 'coins-5000', provider: 'stripe', consent: true } })).body;
    assert.ok(fake.made.sessions.at(-1).params.cancel_url.startsWith('https://marblespins.test/checkout'));
    fake.made.sessions.splice(1); // (keep the numbering below)
    await db.query(`UPDATE payments SET status = 'failed' WHERE order_no IN ($1, $2)`, [fromWww.payment.order_no, fromElsewhere.payment.order_no]);

    // Coming back from Stripe alone adds nothing.
    assert.equal((await call('/auth/me', { token: me.token })).body.user.coins, start);

    // A forged webhook is refused and adds nothing.
    const session = {
      id: fake.made.sessions[0].id, object: 'checkout.session', mode: 'payment', payment_status: 'paid', client_reference_id: pay.id,
      metadata: { payment_id: pay.id }, amount_total: 1099, currency: 'eur', total_details: { amount_tax: 191 }, payment_intent: `pi_test_${pay.id.slice(0, 8)}`,
    };
    const forged = JSON.stringify({ id: 'evt_forged', type: 'checkout.session.completed', data: { object: session } });
    assert.equal((await call('/payments/stripe/webhook', { method: 'POST', body: forged, headers: { 'stripe-signature': 't=1,v1=00' } })).status, 400);
    assert.equal((await call('/auth/me', { token: me.token })).body.user.coins, start);

    // Stripe's real (signed) "paid": the coins, once — the same event again, or a second event, adds nothing more.
    const paid = send('checkout.session.completed', session);
    assert.equal((await paid.go()).body.outcome, 'granted');
    assert.equal((await paid.go()).body.outcome, 'duplicate');
    assert.equal((await send('checkout.session.async_payment_succeeded', session).go()).body.outcome, 'already-granted');
    assert.equal((await call('/auth/me', { token: me.token })).body.user.coins, start + 10500);
    const { rows: ledger } = await db.query(`SELECT amount, kind FROM coin_ledger WHERE payment_id = $1`, [pay.id]);
    assert.deepEqual(ledger, [{ amount: 10500, kind: 'coin-pack' }]);

    // The Purchases page: the order number, what was charged in the player's currency, the receipt.
    const order = (await call(`/payments/orders/${pay.order_no}`, { token: me.token })).body.order;
    assert.equal(order.status, 'paid');
    assert.equal(order.charged_cents, 1099);
    assert.equal(order.charged_currency, 'EUR');
    assert.equal(order.tax_cents, 191);
    assert.match(order.receipt_url, /receipts/);
    assert.equal((await call('/payments/mine', { token: me.token })).body.orders[0].order_no, pay.order_no);

    // The back office asks Stripe for a refund; the coins go only when Stripe's refund event arrives.
    await db.query(`UPDATE users SET role = 'admin' WHERE id = $1`, [me.user.id]);
    const setup = (await call('/admin/session/start', { method: 'POST', token: me.token })).body.setup;
    const admin = (await call('/admin/session/verify', { method: 'POST', token: me.token, body: { code: totp.codeAt(setup.secret, totp.stepNow()) } })).body.token;
    assert.equal((await call(`/admin/payments/${pay.id}/refund`, { method: 'POST', token: admin, body: {} })).status, 400); // (a reason is needed)
    const asked = (await call(`/admin/payments/${pay.id}/refund`, { method: 'POST', token: admin, body: { reason: 'Bought the wrong pack', amount_cents: 549 } })).body;
    assert.equal(asked.waiting, true);
    assert.equal(fake.made.refunds[0].params.amount, 549);
    assert.equal(fake.made.refunds[0].params.metadata.admin_id, me.user.id);
    assert.equal((await call('/auth/me', { token: me.token })).body.user.coins, start + 10500);

    const refund = { id: `re_${pay.id}`, object: 'refund', status: 'succeeded', amount: 549, currency: 'eur', payment_intent: session.payment_intent, metadata: fake.made.refunds[0].params.metadata };
    assert.equal((await send('refund.created', refund).go()).body.outcome, 'revoked');
    assert.equal((await send('refund.updated', refund).go()).body.outcome, 'already-revoked'); // (same refund, once)
    const half = Math.round(10500 * 549 / 1099);
    assert.equal((await call('/auth/me', { token: me.token })).body.user.coins, start + 10500 - half);

    // The rest refunded in the Stripe dashboard (no back-office reason): the remaining coins, exactly.
    await send('refund.created', { id: `re_dash_${pay.id}`, object: 'refund', status: 'succeeded', amount: 550, currency: 'eur', payment_intent: session.payment_intent, metadata: {} }).go();
    assert.equal((await call('/auth/me', { token: me.token })).body.user.coins, start);
    const { rows: [after] } = await db.query('SELECT status, refunded_cents FROM payments WHERE id = $1', [pay.id]);
    assert.deepEqual(after, { status: 'refunded', refunded_cents: 1099 });
    const { rows: lines } = await db.query(`SELECT amount, kind FROM coin_ledger WHERE payment_id = $1 ORDER BY id`, [pay.id]);
    assert.deepEqual(lines.map((l) => [l.kind, l.amount]), [['coin-pack', 10500], ['pack-refund', -half], ['pack-refund', -(10500 - half)]]);
    const { rows: audit } = await db.query(`SELECT action, reason, admin_id FROM admin_audit WHERE target_user_id = $1 ORDER BY id`, [me.user.id]);
    assert.deepEqual(audit.map((a) => [a.action, a.reason, a.admin_id]), [
      ['refund-request', 'Bought the wrong pack', me.user.id],
      ['refund', 'Bought the wrong pack', me.user.id],
      ['refund', 'Refunded in the Stripe dashboard', null],
    ]);
    const { rows: [{ coins_bought: bought }] } = await db.query('SELECT coins_bought FROM users WHERE id = $1', [me.user.id]);
    assert.equal(bought, 0);

    // Spent coins can't be taken twice over: a second order, spent, then disputed → the rest taken, the shortfall recorded.
    const second = (await call('/payments/checkout', { method: 'POST', token: me.token, body: { productId: 'coins-5000', provider: 'stripe', consent: true } })).body;
    const { rows: [pay2] } = await db.query('SELECT id FROM payments WHERE order_no = $1', [second.payment.order_no]);
    const s2 = { ...session, id: fake.made.sessions[1].id, client_reference_id: pay2.id, metadata: { payment_id: pay2.id }, amount_total: 500, currency: 'usd', payment_intent: `pi_second_${pay2.id}` };
    await send('checkout.session.completed', s2).go();
    await db.query(`UPDATE users SET coins = 1200 WHERE id = $1`, [me.user.id]); // (as if spent in the shop)
    assert.equal((await send('charge.dispute.created', { id: `dp_${pay2.id}`, object: 'dispute', amount: 500, payment_intent: s2.payment_intent, reason: 'fraudulent' }).go()).body.outcome, 'revoked');
    assert.equal((await call('/auth/me', { token: me.token })).body.user.coins, 0);
    const { rows: [short] } = await db.query('SELECT coins_removed, coins_short FROM payment_refunds WHERE id = $1', [`dp_${pay2.id}`]);
    assert.deepEqual(short, { coins_removed: 1200, coins_short: 3800 });

    // An expired checkout is marked failed and drops off the Purchases page.
    const third = (await call('/payments/checkout', { method: 'POST', token: me.token, body: { productId: 'coins-5000', provider: 'stripe', consent: true } })).body;
    const { rows: [pay3] } = await db.query('SELECT id FROM payments WHERE order_no = $1', [third.payment.order_no]);
    assert.equal((await send('checkout.session.expired', { id: fake.made.sessions[2].id, object: 'checkout.session', mode: 'payment', payment_status: 'unpaid', client_reference_id: pay3.id, metadata: { payment_id: pay3.id } }).go()).body.outcome, 'failed');
    assert.ok(!(await call('/payments/mine', { token: me.token })).body.orders.some((o) => o.order_no === third.payment.order_no));
  } finally {
    stripe.setClient(null);
    server.close();
    await db.pool?.end?.();
  }
});
