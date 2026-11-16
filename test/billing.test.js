'use strict';

// Billing (Moses, 16 Nov 2026, CRM phase 1): receipts (K-) for paid Stripe purchases, credit notes (KR-) for
// their refunds, unbroken number series, frozen documents, SEK book amounts from Stripe, the monthly export.
// The rules always; the whole flow against a real database when ROOMS_TEST_DATABASE_URL is set (Stripe's API a
// fake, its webhook signatures real).
const test = require('node:test');
const assert = require('node:assert/strict');
const Stripe = require('stripe');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_for_tests';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fake_for_tests';
process.env.PUBLIC_SITE_URL = 'https://marblespins.test';
delete process.env.STRIPE_ALLOW_LIVE;

const stripe = require('../src/payments/stripe');
const documents = require('../src/billing/documents');
const exporting = require('../src/billing/exporting');
const layout = require('../src/billing/layout');

test('numbers, dates and VAT rates: K-/KR- per year in Swedish time; the rate from Stripe or the amounts', () => {
  assert.deepEqual(layout.SERIES, { receipt: 'K', credit: 'KR' });
  assert.equal(documents.swedishDate('2026-12-31T23:30:00Z'), '2027-01-01'); // (already New Year in Stockholm)
  assert.equal(documents.swedishDate('2026-11-16T10:00:00Z'), '2026-11-16');
  assert.equal(documents.rateOf({ vat_rate: '25.5', charged_cents: 1000, tax_cents: 203 }), 25.5);
  assert.equal(documents.rateOf({ charged_cents: 10900, tax_cents: 2180 }), 25);
  assert.equal(documents.rateOf({ charged_cents: 999, tax_cents: 0 }), 0);
  assert.deepEqual(exporting.monthRange('2026-12'), { from: '2026-12-01', to: '2027-01-01' });
  assert.equal(exporting.monthRange('2026-13'), null);
  assert.equal(exporting.csv([['A', (r) => r.a], ['B', (r) => r.b]], [{ a: 'x,y', b: 'say "hi"' }]), 'A,B\n"x,y","say ""hi"""\n');
});

test('the seller on every document (D1–D3 pending: the F-skatt line waits for D2)', () => {
  assert.equal(layout.SELLER.name, 'Voltron Robotics AB');
  assert.equal(layout.SELLER.orgNo, '559344-3756');
  assert.equal(layout.SELLER.vatNo, 'SE559344375601');
  assert.match(layout.SELLER.address, /Hägersten/);
  assert.equal(layout.F_SKATT.show, false);
});

function fakeStripe() {
  const made = { sessions: [], refunds: [] };
  const run = Date.now().toString(36);
  return {
    made,
    checkout: {
      sessions: {
        create: async (params, opts) => { const id = `cs_test_${run}_${made.sessions.length + 1}`; made.sessions.push({ params, opts, id }); return { id, url: `https://checkout.stripe.com/c/pay/${id}` }; },
        retrieve: async (id) => ({ id, total_details: { breakdown: { taxes: [{ rate: { percentage: 19, country: 'DE' } }] } } }),
      },
    },
    paymentIntents: {
      retrieve: async (id, opts) => ({
        id,
        latest_charge: { receipt_url: `https://pay.stripe.com/receipts/${id}`, ...(opts?.expand?.includes('latest_charge.balance_transaction') && { balance_transaction: { currency: 'sek', amount: 11420, fee: 520 } }) },
      }),
    },
    refunds: {
      create: async (params, opts) => { made.refunds.push({ params, opts }); return { id: `re_test_${run}_${made.refunds.length}`, status: 'pending', amount: params.amount ?? 1000 }; },
      retrieve: async (id) => ({ id, balance_transaction: { currency: 'sek', amount: -5710, fee: 0 } }),
    },
  };
}

test('a paid Stripe purchase gets its receipt, a refund its credit note; the player sees their own; the export lists both', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const billing = require('../src/billing');
  const email = require('../src/email');
  const fake = fakeStripe();
  stripe.setClient(fake);
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token, headers = {} } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...headers, ...(token && { authorization: `Bearer ${token}` }) }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  let n = 0;
  const send = (type, object, extra = {}) => {
    const payload = JSON.stringify({ id: `evt_bill_${Date.now()}_${++n}`, object: 'event', type, data: { object }, ...extra });
    return call('/payments/stripe/webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': Stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_fake_for_tests' }) } });
  };
  const buy = async (token, productId = 'coins-10500') => {
    const out = (await call('/payments/checkout', { method: 'POST', token, body: { productId, provider: 'stripe', consent: true } })).body;
    const { rows: [pay] } = await db.query('SELECT * FROM payments WHERE order_no = $1', [out.payment.order_no]);
    return pay;
  };
  const sessionOf = (pay, k) => ({
    id: fake.made.sessions[k].id, object: 'checkout.session', mode: 'payment', payment_status: 'paid', client_reference_id: pay.id,
    metadata: { payment_id: pay.id }, amount_total: 999, currency: 'eur', total_details: { amount_tax: 160 }, payment_intent: `pi_bill_${pay.id.slice(0, 8)}`,
    customer_details: { address: { country: 'DE' } },
  });
  const seq = (number) => Number(number.split('-')[2]);
  try {
    const name = `t_bill_${Date.now() % 1e6}`;
    const me = (await call('/auth/register', { method: 'POST', body: { username: name, email: `${name}@test.invalid`, password: 'password123', age_group: '18+' } })).body;
    const other = (await call('/auth/register', { method: 'POST', body: { username: `${name}o`, email: `${name}o@test.invalid`, password: 'password123', age_group: '18+' } })).body;

    // Two purchases paid: two receipts in a row, frozen with the seller, the buyer, the line and the VAT.
    const p1 = await buy(me.token);
    const p2 = await buy(me.token, 'coins-5000');
    assert.equal((await send('checkout.session.completed', sessionOf(p1, 0))).body.outcome, 'granted');
    assert.equal((await send('checkout.session.completed', sessionOf(p2, 1))).body.outcome, 'granted');
    const { rows: [r1] } = await db.query(`SELECT * FROM billing_documents WHERE payment_id = $1`, [p1.id]);
    const { rows: [r2] } = await db.query(`SELECT * FROM billing_documents WHERE payment_id = $1`, [p2.id]);
    const year = new Date().getFullYear();
    assert.match(r1.number, new RegExp(`^K-${year}-\\d{5}$`));
    assert.equal(seq(r2.number), seq(r1.number) + 1);
    assert.equal(r1.kind, 'receipt');
    assert.deepEqual([r1.currency, r1.gross_cents, r1.vat_cents, r1.net_cents, Number(r1.vat_rate), r1.vat_country], ['EUR', 999, 160, 839, 19, 'DE']);
    assert.equal(r1.snapshot.seller.vatNo, 'SE559344375601');
    assert.equal(r1.snapshot.buyer.email, `${name}@test.invalid`);
    assert.equal(r1.snapshot.lines[0].description, '10,500 coins');
    assert.equal(r1.snapshot.orderNo, p1.order_no);
    assert.equal(r1.snapshot.playerPath, `/purchases/receipt/${r1.number}`);

    // The same event again: no second receipt.
    await send('checkout.session.async_payment_succeeded', sessionOf(p1, 0));
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM billing_documents WHERE payment_id = $1', [p1.id])).rows[0].n, 1);

    // Stripe's test mode (livemode: false): paid, coins given, no receipt.
    const p3 = await buy(me.token, 'coins-5000');
    await send('checkout.session.completed', sessionOf(p3, 2), { livemode: false });
    assert.equal((await db.query('SELECT status FROM payments WHERE id = $1', [p3.id])).rows[0].status, 'paid');
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM billing_documents WHERE payment_id = $1', [p3.id])).rows[0].n, 0);

    // Half refunded: a credit note that credits the receipt, negative, the VAT in proportion.
    const refund = { id: `re_bill_${p1.id}`, object: 'refund', status: 'succeeded', amount: 500, currency: 'eur', payment_intent: sessionOf(p1, 0).payment_intent, metadata: { reason: 'Wrong pack' } };
    assert.equal((await send('refund.created', refund)).body.outcome, 'revoked');
    const { rows: [c1] } = await db.query(`SELECT * FROM billing_documents WHERE refund_id = $1`, [refund.id]);
    assert.match(c1.number, new RegExp(`^KR-${year}-\\d{5}$`));
    assert.equal(c1.credits_document_id, r1.id);
    assert.deepEqual([c1.gross_cents, c1.vat_cents, c1.net_cents], [-500, -80, -420]);
    assert.equal(c1.snapshot.credits.number, r1.number);
    assert.equal(c1.snapshot.reason, 'Wrong pack');
    assert.equal(c1.snapshot.what, 'part refund');

    // The Purchases page lists them; each player opens only their own.
    const order = (await call(`/payments/orders/${p1.order_no}`, { token: me.token })).body.order;
    assert.deepEqual(order.documents.map((d) => d.number), [r1.number, c1.number]);
    const mine = await call(`/payments/documents/${r1.number}`, { token: me.token });
    assert.equal(mine.status, 200);
    assert.equal(mine.body.document.number, r1.number);
    assert.equal(mine.body.document.seller.name, 'Voltron Robotics AB');
    // Another account's receipt: says so (Moses, 16 Nov 2026), and shows nothing of it; an unknown number is a 404.
    const theirs = await call(`/payments/documents/${r1.number}`, { token: other.token });
    assert.equal(theirs.status, 403);
    assert.equal(theirs.body.error, 'This receipt belongs to another account');
    assert.equal(theirs.body.document, undefined);
    assert.equal((await call(`/payments/documents/K-1999-99999`, { token: other.token })).status, 404);
    // A Stripe test-mode order (its session cs_test_…, no K-number): marked test, no Stripe receipt link either.
    await db.query(`UPDATE payments SET receipt_url = 'https://pay.stripe.com/receipts/test' WHERE id = $1`, [p3.id]);
    const testOrder = (await call(`/payments/orders/${p3.order_no}`, { token: me.token })).body.order;
    assert.equal(testOrder.test, true);
    assert.equal(testOrder.receipt_url, null);
    assert.deepEqual(testOrder.documents, []);
    assert.equal((await call(`/payments/documents/${r1.number}`)).status, 401);

    // The book amounts from Stripe's balance transactions (SEK and the fee).
    await billing.fillBook(db, { limit: 500 });
    const { rows: [b1] } = await db.query(`SELECT book_currency, book_gross_cents, book_fee_cents FROM billing_documents WHERE id = $1`, [r1.id]);
    assert.deepEqual(b1, { book_currency: 'SEK', book_gross_cents: 11420, book_fee_cents: 520 });
    const { rows: [bc] } = await db.query(`SELECT book_gross_cents FROM billing_documents WHERE id = $1`, [c1.id]);
    assert.equal(bc.book_gross_cents, -5710);

    // The credit note's email: once.
    const sent = [];
    email.setTransport(async (m) => { sent.push(m); return { messageId: 'x' }; });
    const enabled = email.enabled;
    email.enabled = () => true;
    try {
      await billing.sendCreditNotes(db);
      await billing.sendCreditNotes(db);
    } finally {
      email.enabled = enabled;
      email.setTransport(null);
    }
    const mail = sent.filter((m) => JSON.stringify(m).includes(c1.number));
    assert.equal(mail.length, 1);

    // The month's export: both documents, and the VAT summary.
    const month = documents.swedishDate(new Date()).slice(0, 7);
    const csv = await billing.exportDocuments(db, month);
    assert.match(csv.split('\n')[0], /^Number,Kind,Date,Order/);
    assert.ok(csv.includes(`${r1.number},Receipt,`));
    assert.ok(csv.includes(`${c1.number},Credit note,`));
    assert.match(await billing.exportVat(db, month), /DE,19\.00,EUR/);

    // Live purchases from before billing get their receipts at start-up (a live checkout: cs_live_…), oldest first.
    const p4 = await buy(me.token, 'coins-5000');
    await db.query(`UPDATE payments SET status = 'paid', paid_at = now(), charged_cents = 1099, charged_currency = 'SEK', tax_cents = 220, stripe_session_id = $2 WHERE id = $1`, [p4.id, `cs_live_bill_${p4.id.slice(0, 8)}`]);
    const out = await billing.issueMissing(db);
    assert.ok(out.receipts >= 1);
    const { rows: [r4] } = await db.query(`SELECT number, vat_rate FROM billing_documents WHERE payment_id = $1`, [p4.id]);
    assert.ok(seq(r4.number) > seq(r2.number));
    assert.equal(Number(r4.vat_rate), 25);
  } finally {
    stripe.setClient(null);
    server.close();
    await db.pool.end();
  }
});
