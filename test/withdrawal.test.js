'use strict';

// Pre-launch decisions of 21 Oct 2026 (Moses), against a real database (ROOMS_TEST_DATABASE_URL):
//   - coin packs and the pass are for saved accounts only (a guest gets 401 "save your marble first");
//   - the online withdrawal function: a pass bought in its pre-sale can be withdrawn from on the
//     Purchases page until it activates (full refund, the pass goes); coin packs can't (delivered at once);
//   - the purchase confirmation email (with the words agreed to at checkout) and the withdrawal
//     acknowledgement, each once, only while email is on;
//   - guests not seen for 180 days are deleted (anonymised); saved accounts never are.
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

const { withdrawalOf } = require('../src/payments/withdrawal');
const { agreedOf } = require('../src/payments/emails');
const templates = require('../src/email/templates');

const SEASON = { key: 's', starts_at: '2026-12-01T00:00:00+01:00', free_from: '2027-01-07T23:59:59+01:00' };
const PRE = new Date('2026-11-29T12:00:00Z');

test('which purchases can still be withdrawn from: a pass bought in its pre-sale, until it activates', () => {
  const pass = { season_key: 's', status: 'paid', paid_at: '2026-11-28T10:00:00Z', refunded_cents: 0, withdrawn_at: null, provider: 'stripe' };
  assert.deepEqual(withdrawalOf(pass, SEASON, PRE), { until: '2026-11-30T23:00:00.000Z', via: 'here' });
  assert.equal(withdrawalOf(pass, SEASON, new Date('2026-11-30T23:00:00Z')), null); // (activated: 1 Dec 00:00 Swedish time)
  assert.equal(withdrawalOf({ ...pass, provider: 'apple' }, SEASON, PRE).via, 'apple');
  assert.equal(withdrawalOf({ ...pass, provider: 'google' }, SEASON, PRE).via, 'here');
  assert.equal(withdrawalOf({ ...pass, withdrawn_at: '2026-11-29T00:00:00Z' }, SEASON, PRE), null);
  assert.equal(withdrawalOf({ ...pass, refunded_cents: 999 }, SEASON, PRE), null);
  assert.equal(withdrawalOf({ ...pass, status: 'pending' }, SEASON, PRE), null);
  assert.equal(withdrawalOf({ ...pass, season_key: null, coins: 5000 }, null, PRE), null); // (coin packs: delivered at once)
});

test('the emails\' texts: the confirmation quotes what was agreed; the acknowledgement names the order', () => {
  const agreed = agreedOf('[2026-10-19] I want my pass to activate on 1 December. Until then I can cancel it for a full refund; once it activates, my 14-day right of withdrawal ends. / I\'m 18 or older, or a parent or guardian has agreed to this purchase. I accept the terms of sale.');
  assert.equal(agreed.length, 2);
  assert.match(agreed[0], /^I want my pass to activate on 1 December/);
  const c = templates.purchaseConfirmation({ username: 'Nova', orderNo: 'MS-1001', item: 'Holiday Season Pass 2026', price: '$9.99 incl. VAT', paidAt: '28 November 2026 at 10:00 (Swedish time)', kind: 'pre-sale-pass', activates: '1 December 2026 at 00:00 (Swedish time)', agreed, purchasesUrl: 'https://marblespins.test/purchases', termsUrl: 'https://marblespins.test/legal#sale' });
  assert.equal(c.subject, 'Your Marble Spins order MS-1001');
  for (const s of ['MS-1001', 'Holiday Season Pass 2026', '$9.99 incl. VAT', 'Withdraw from this purchase', 'I want my pass to activate on 1 December', 'Voltron Robotics AB']) assert.ok(c.html.includes(s), s);
  const w = templates.withdrawalReceived({ username: 'Nova', orderNo: 'MS-1001', item: 'Holiday Season Pass 2026', price: '$9.99', receivedAt: '29 November 2026 at 13:00 (Swedish time)' });
  assert.equal(w.subject, "We've received your withdrawal (order MS-1001)");
  assert.ok(w.html.includes('within 14 days'));
});

function fakeStripe() {
  const made = { sessions: [], refunds: [] };
  const run = Date.now().toString(36);
  return {
    made,
    checkout: { sessions: { create: async (params, opts) => { const id = `cs_test_${run}_${made.sessions.length + 1}`; made.sessions.push({ params, opts, id }); return { id, url: `https://checkout.stripe.com/c/pay/${id}` }; } } },
    paymentIntents: { retrieve: async (id) => ({ id, latest_charge: { receipt_url: `https://pay.stripe.com/receipts/${id}` } }) },
    refunds: { create: async (params) => { made.refunds.push({ params }); return { id: `re_test_${run}_${made.refunds.length}`, status: 'pending', amount: params.amount ?? 999 }; } },
  };
}

test('guests can\'t buy; a pre-sale pass is withdrawn from online, refunded and confirmed by email; coin packs can\'t be withdrawn from', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const stripe = require('../src/payments/stripe');
  const seasons = require('../src/seasons');
  const email = require('../src/email');
  const purchaseEmails = require('../src/payments/emails');
  const fake = fakeStripe();
  stripe.setClient(fake);
  const sent = [];
  email.setTransport(async (m) => { sent.push(m); return { messageId: `m${sent.length}` }; });
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token, headers = {} } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...headers, ...(token && { authorization: `Bearer ${token}` }) }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  let n = 0;
  const send = (type, object) => {
    const payload = JSON.stringify({ id: `evt_wd_${Date.now()}_${++n}`, object: 'event', type, data: { object } });
    return call('/payments/stripe/webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': Stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_fake_for_tests' }) } });
  };
  const run = crypto.randomBytes(3).toString('hex');
  const key = `test-wd-${run}`;
  try {
    // A guest: no coin packs, no store account ids, no pass.
    const guest = (await call('/auth/guest', { method: 'POST', body: {} })).body;
    const g = await call('/payments/checkout', { method: 'POST', token: guest.token, body: { productId: 'coins-5000', provider: 'stripe', consent: true } });
    assert.equal(g.status, 401);
    assert.equal(g.body.details.code, 'save_first');
    assert.equal((await call('/payments/google/account', { token: guest.token })).status, 401);
    assert.equal((await call('/payments/apple/account', { token: guest.token })).status, 401);

    await db.query(
      `INSERT INTO seasons (key, name, starts_at, ends_at, free_from, pass_product_id, pass_name, price_cents, pass_sale_starts_at, pass_sale_ends_at)
       VALUES ($1, 'Wd Season 2026', now() + interval '2 days', now() + interval '12 days', now() + interval '12 days', $2, 'Wd Season Pass 2026', 999, now() - interval '1 day', now() + interval '12 days')`,
      [key, `wpass-${run}`],
    );
    seasons.forget();
    const name = `t_wd_${run}`;
    const me = (await call('/auth/register', { method: 'POST', body: { username: name, email: `${name}@test.invalid`, password: 'password123', birth_year: 1990, birth_month: 5 } })).body;

    // A coin pack (saved account): paid, confirmed by email, never withdrawable.
    const coins = (await call('/payments/checkout', { method: 'POST', token: me.token, body: { productId: 'coins-5000', provider: 'stripe', consent: true } })).body;
    const { rows: [cp] } = await db.query('SELECT * FROM payments WHERE order_no = $1', [coins.payment.order_no]);
    await send('checkout.session.completed', { id: fake.made.sessions[0].id, object: 'checkout.session', mode: 'payment', payment_status: 'paid', client_reference_id: cp.id, metadata: { payment_id: cp.id }, amount_total: 500, currency: 'usd', total_details: { amount_tax: 100 }, payment_intent: `pi_wd_c_${run}` });

    // The pass in its pre-sale.
    const out = (await call('/payments/pass/checkout', { method: 'POST', token: me.token, body: { season: key, consent: true } })).body;
    const { rows: [pp] } = await db.query('SELECT * FROM payments WHERE order_no = $1', [out.payment.order_no]);
    await send('checkout.session.completed', { id: fake.made.sessions[1].id, object: 'checkout.session', mode: 'payment', payment_status: 'paid', client_reference_id: pp.id, metadata: { payment_id: pp.id }, amount_total: 999, currency: 'usd', total_details: { amount_tax: 200 }, payment_intent: `pi_wd_p_${run}` });
    assert.equal(await seasons.hasPass(db, me.user.id, key), true);

    // Purchases: only the pass can be withdrawn from.
    let orders = (await call('/payments/mine', { token: me.token })).body.orders;
    const byNo = (no) => orders.find((o) => o.order_no === no);
    assert.equal(byNo(coins.payment.order_no).withdraw, null);
    assert.equal(byNo(out.payment.order_no).withdraw.via, 'here');
    assert.equal((await call(`/payments/orders/${coins.payment.order_no}/withdraw`, { method: 'POST', token: me.token, body: { confirm: true } })).status, 400);
    assert.equal((await call(`/payments/orders/${out.payment.order_no}/withdraw`, { method: 'POST', token: me.token, body: {} })).status, 400); // (confirm is required)

    // Confirmation emails: one each, sent once, with the agreed words.
    const due = await purchaseEmails.sendDue(db);
    const mine = sent.filter((m) => m.to[0].email === `${name}@test.invalid`);
    assert.equal(due.confirmations >= 2, true);
    const conf = mine.find((m) => m.subject === `Your Marble Spins order ${out.payment.order_no}`);
    assert.ok(conf.htmlContent.includes('I want my pass to activate on'));
    assert.ok(conf.htmlContent.includes('Withdraw from this purchase'));
    assert.ok(mine.find((m) => m.subject === `Your Marble Spins order ${coins.payment.order_no}`).htmlContent.includes('I want my coins delivered right away'));
    const before = sent.length;
    await purchaseEmails.sendDue(db);
    assert.equal(sent.filter((m) => m.to[0].email === `${name}@test.invalid`).length, mine.length, 'never twice');
    assert.equal(sent.length >= before, true);

    // Withdraw: the refund is asked for at Stripe; when it comes back, the pass goes. Once only.
    const w = await call(`/payments/orders/${out.payment.order_no}/withdraw`, { method: 'POST', token: me.token, body: { confirm: true } });
    assert.equal(w.status, 200);
    assert.equal(w.body.status, 'refund-requested');
    assert.equal(fake.made.refunds.at(-1).params.payment_intent, `pi_wd_p_${run}`);
    assert.equal((await call(`/payments/orders/${out.payment.order_no}/withdraw`, { method: 'POST', token: me.token, body: { confirm: true } })).status, 409);
    orders = (await call('/payments/mine', { token: me.token })).body.orders;
    assert.ok(byNo(out.payment.order_no).withdrawn_at);
    assert.equal(byNo(out.payment.order_no).withdraw, null);
    await send('refund.created', { id: `re_wd_${run}`, object: 'refund', status: 'succeeded', amount: 999, currency: 'usd', payment_intent: `pi_wd_p_${run}`, metadata: {} });
    assert.equal(await seasons.hasPass(db, me.user.id, key), false);
    await purchaseEmails.sendDue(db);
    const ack = sent.find((m) => m.subject === `We've received your withdrawal (order ${out.payment.order_no})`);
    assert.ok(ack && ack.to[0].email === `${name}@test.invalid`);

    // Email off: nothing is sent.
    email.setTransport(null);
    const prevKey = require('../src/config').email.brevoApiKey;
    require('../src/config').email.brevoApiKey = '';
    assert.deepEqual(await purchaseEmails.sendDue(db), { confirmations: 0, withdrawals: 0 });
    require('../src/config').email.brevoApiKey = prevKey;
  } finally {
    email.setTransport(null);
    stripe.setClient(null);
    seasons.forget();
    server.close();
  }
});

test('guests not seen for 180 days are deleted (anonymised); saved accounts and recent guests stay', { skip: !DB }, async () => {
  const db = require('../src/db');
  const { deleteIdleGuests } = require('../src/account/retention');
  const run = crypto.randomBytes(3).toString('hex');
  const make = async (tag, guest, seenDaysAgo) => (await db.query(
    `INSERT INTO users (username, email, password_hash, is_guest, last_seen_at) VALUES ($1, $2, 'x', $3, now() - make_interval(days => $4)) RETURNING id`,
    [`t_ret${tag}_${run}`, `t_ret${tag}_${run}@test.invalid`, guest, seenDaysAgo],
  )).rows[0].id;
  const old = await make('a', true, 181);
  const recent = await make('b', true, 179);
  const saved = await make('c', false, 400);
  await deleteIdleGuests(db);
  const state = async (id) => (await db.query('SELECT deleted_at IS NOT NULL AS gone, username FROM users WHERE id = $1', [id])).rows[0];
  assert.equal((await state(old)).gone, true);
  assert.match((await state(old)).username, /^(?!t_reta_)/);
  assert.equal((await state(recent)).gone, false);
  assert.equal((await state(saved)).gone, false);
  const { rows: [audit] } = await db.query(`SELECT reason FROM admin_audit WHERE target_user_id = $1 AND action = 'account-deleted'`, [old]);
  assert.equal(audit.reason, 'Guest account: 180 days without a visit');
});
