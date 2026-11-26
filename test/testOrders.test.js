'use strict';

// Test orders (Moses, 18 Nov 2026: MS-1001, a sandbox purchase from before Stripe went live). Marked is_test (data
// update 2027-08-29-ms-1001-test-order): "Test · not charged" on /purchases and in the CRM, no receipt number, and
// left out of the sales totals, the VAT summary and the bookkeeping export. Against a real database.
const test = require('node:test');
const assert = require('node:assert/strict');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
const totp = require('../src/admin/totp');

test('a test order: shown as test, no receipt number, in no total, VAT summary or export', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const documents = require('../src/billing/documents');
  const exporting = require('../src/billing/exporting');
  const payments = require('../src/payments');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  try {
    const tag = `t_tor_${Date.now() % 1e6}`;
    const reg = async (n) => (await call('/auth/register', { method: 'POST', body: { username: n, email: `${n}@test.invalid`, password: 'password123', age_group: '18+' } })).body;
    const admin = await reg(`${tag}a`);
    const player = await reg(`${tag}p`);
    await db.query(`UPDATE users SET role = 'admin', admin_role = 'owner' WHERE id = $1`, [admin.user.id]);
    const setup = (await call('/admin/session/start', { method: 'POST', token: admin.token })).body.setup;
    const { token } = (await call('/admin/session/verify', { method: 'POST', token: admin.token, body: { code: totp.codeAt(setup.secret, totp.stepNow()) } })).body;
    const uid = player.user.id;
    const n = Date.now() % 1e7;
    const pay = async (session, order, isTest) => (await db.query(
      `INSERT INTO payments (user_id, provider, product_id, coins, amount_cents, currency, charged_cents, charged_currency, status, paid_at, order_no, stripe_session_id, is_test)
       VALUES ($1, 'stripe', 'coins-5000', 5000, 500, 'usd', 500, 'usd', 'paid', now(), $2, $3, $4) RETURNING id`,
      [uid, order, session, isTest],
    )).rows[0].id;
    // MS-1001's shape: a "live-looking" sandbox order, marked a test order; and a real one beside it.
    const testId = await pay(`cs_live_${n}t`, `MS-T${n}t`, true);
    const realId = await pay(`cs_live_${n}r`, `MS-T${n}r`, false);

    // No receipt number for the test order, ever; the real one gets its K-number.
    assert.equal(await db.withTransaction((c) => documents.issueReceipt(c, testId)), null);
    const real = await db.withTransaction((c) => documents.issueReceipt(c, realId));
    assert.ok(real?.number);
    await documents.issueMissing(db);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM billing_documents WHERE payment_id = $1', [testId])).rows[0].n, 0);

    // The player's /purchases: "Test", no documents. The real one keeps its receipt.
    const orders = await payments.ordersOf(db, uid);
    const byNo = Object.fromEntries(orders.map((o) => [o.order_no, o]));
    assert.equal(byNo[`MS-T${n}t`].test, true);
    assert.deepEqual(byNo[`MS-T${n}t`].documents, []);
    assert.equal(byNo[`MS-T${n}r`].test, false);

    // The CRM: flagged on the customer page, left out of the customer's spend.
    const c = (await call(`/admin/players/${uid}`, { token })).body;
    const flags = Object.fromEntries(c.payments.map((p) => [p.order_no, p.test]));
    assert.deepEqual([flags[`MS-T${n}t`], flags[`MS-T${n}r`]], [true, false]);
    assert.deepEqual(c.overview.spend.map((x) => [x.currency, x.purchases, x.cents]), [['USD', 1, 500]]);

    // A document issued for it before it was marked (as MS-1001 might have had): out of the export, VAT and totals.
    await db.query(
      `INSERT INTO billing_documents (number, kind, payment_id, user_id, issued_at, currency, gross_cents, net_cents, vat_cents, snapshot)
       VALUES ($1, 'receipt', $2, $3, now(), 'USD', 500, 500, 0, '{}')`,
      [`K-T${n}t`, testId, uid],
    );
    const month = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' }).slice(0, 7);
    const docs = await exporting.documentsOf(db, month);
    assert.ok(docs.some((d) => d.number === real.number));
    assert.ok(!docs.some((d) => d.number === `K-T${n}t`));
  } finally {
    server.close();
  }
});
