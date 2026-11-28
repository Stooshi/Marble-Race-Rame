'use strict';

// The CRM customer Overview's money (17 Nov 2026). Against a real database (ROOMS_TEST_DATABASE_URL).
const test = require('node:test');
const assert = require('node:assert/strict');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
const totp = require('../src/admin/totp');

// The Overview's money (Moses, 17 Nov 2026: MS-1002, a $5.00 website purchase refunded in full, showed "4.54 SEK
// spent on the website"): the headline is the website's net in the charged currency ($0.00 after a full refund);
// the SEK line splits paid, refunded and net as Stripe booked them (a refund converted on its own day can leave a
// small SEK difference); a document whose SEK amount implies an unlikely rate (a 10× slip) is flagged; test-mode
// orders are left out.
test('the Overview: net website spend after refunds, SEK paid / refunded / net, odd rates flagged, test orders out', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  try {
    const tag = `t_crs_${Date.now() % 1e6}`;
    const reg = async (n) => (await call('/auth/register', { method: 'POST', body: { username: n, email: `${n}@test.invalid`, password: 'password123', age_group: '18+' } })).body;
    const admin = await reg(`${tag}a`);
    const player = await reg(`${tag}p`);
    await db.query(`UPDATE users SET role = 'admin', admin_role = 'owner' WHERE id = $1`, [admin.user.id]);
    const setup = (await call('/admin/session/start', { method: 'POST', token: admin.token })).body.setup;
    const { token } = (await call('/admin/session/verify', { method: 'POST', token: admin.token, body: { code: totp.codeAt(setup.secret, totp.stepNow()) } })).body;
    const uid = player.user.id;
    const n = Date.now() % 1e7;
    const pay = async (session, status, refunded, order) => (await db.query(
      `INSERT INTO payments (user_id, provider, product_id, coins, amount_cents, currency, charged_cents, charged_currency, status, paid_at, order_no, stripe_session_id, refunded_cents)
       VALUES ($1, 'stripe', 'coins-5000', 5000, 500, 'usd', 500, 'usd', $2, now(), $3, $4, $5) RETURNING id`,
      [uid, status, order, session, refunded ?? 0],
    )).rows[0].id;
    const doc = (paymentId, number, kind, gross, book, refundId = null) => db.query(
      `INSERT INTO billing_documents (number, kind, payment_id, refund_id, user_id, issued_at, currency, gross_cents, net_cents, vat_cents, book_currency, book_gross_cents, book_fee_cents, book_filled_at, snapshot)
       VALUES ($1, $2, $3, $4, $5, now(), 'USD', $6, $6, 0, 'SEK', $7, $8, now(), '{}')`,
      [number, kind, paymentId, refundId, uid, gross, book, kind === 'receipt' ? 330 : 0],
    );
    // MS-1002's shape: $5.00 paid (49.50 SEK booked), refunded in full (44.96 SEK booked on the refund's day).
    const p1 = await pay(`cs_live_${n}a`, 'refunded', 500, `MS-T${n}1`);
    await db.query(`INSERT INTO payment_refunds (id, payment_id, amount_cents) VALUES ($1, $2, 500)`, [`re_${n}a`, p1]);
    await doc(p1, `K-T${n}1`, 'receipt', 500, 4950);
    await doc(p1, `KR-T${n}1`, 'credit', -500, -4496, `re_${n}a`);
    // A second purchase, kept: $5.00, with a book amount ten times too small (495 öre): flagged.
    const p2 = await pay(`cs_live_${n}b`, 'paid', null, `MS-T${n}2`);
    await doc(p2, `K-T${n}2`, 'receipt', 500, 495);
    // A test-mode order (never charged): left out everywhere.
    await pay(`cs_test_${n}c`, 'paid', null, `MS-T${n}3`);

    const o = (await call(`/admin/players/${uid}`, { token })).body.overview;
    assert.deepEqual(o.website.map((x) => [x.currency, x.purchases, x.paid_cents, x.refunded_cents, x.cents]), [['USD', 2, 1000, 500, 500]]);
    assert.deepEqual(o.spend.map((x) => [x.currency, x.purchases, x.cents]), [['USD', 2, 500]]);
    assert.deepEqual([o.sek.paid, o.sek.refunded, o.sek.cents, o.sek.fees, o.sek.missing], [4950 + 495, 4496, 4950 + 495 - 4496, 660, 0]);
    const byNo = Object.fromEntries(o.sek.documents.map((d) => [d.number, d]));
    assert.deepEqual([byNo[`K-T${n}1`].rate, byNo[`K-T${n}1`].odd], [9.9, false]);
    assert.deepEqual([byNo[`KR-T${n}1`].rate, byNo[`KR-T${n}1`].odd, byNo[`KR-T${n}1`].sekCents], [8.992, false, -4496]);
    assert.deepEqual([byNo[`K-T${n}2`].rate, byNo[`K-T${n}2`].odd], [0.99, true]);
    assert.equal(byNo[`K-T${n}1`].orderNo, `MS-T${n}1`);
  } finally {
    server.close();
    await db.pool?.end?.();
  }
});
