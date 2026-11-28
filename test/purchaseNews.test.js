'use strict';

// The box at a purchase (Moses approved 19 Nov 2026): "Don't send me news about new tracks and marbles". Ticked, it
// records a no (source 'purchase') before the purchase, which keeps the buyer out of soft opt-in; and a buyer under
// soft opt-in (who never ticked yes) is stopped by the unsubscribe link. Against a real database.
const test = require('node:test');
const assert = require('node:assert/strict');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
delete process.env.MARKETING_SENDING;

test('a ticked box is a no; a soft opt-in buyer can unsubscribe', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const audience = require('../src/marketing/audience');
  const unsubscribe = require('../src/email/unsubscribe');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  process.env.MARKETING_SOFT_OPT_IN_FROM = '2020-01-01';
  try {
    const tag = `t_pnw_${Date.now() % 1e6}`;
    const reg = async (n) => (await call('/auth/register', { method: 'POST', body: { username: n, email: `${n}@test.invalid`, password: 'password123', age_group: '18+' } })).body;
    const paid = (id) => db.query(`INSERT INTO payments (user_id, provider, product_id, coins, amount_cents, currency, status, paid_at) VALUES ($1, 'stripe', 'coins-5000', 5000, 500, 'usd', 'paid', now())`, [id]);
    const a = await reg(`${tag}a`);
    const b = await reg(`${tag}b`);
    await paid(a.user.id);
    await paid(b.user.id);
    assert.equal(await audience.allowed(db, a.user.id), true); // (a buyer, box unticked: soft opt-in)
    assert.equal(await audience.allowed(db, b.user.id), true);

    // Unticked: nothing recorded.
    assert.deepEqual((await call('/users/me/purchase-news', { method: 'POST', token: a.token, body: { optOut: false } })).body, { ok: true, news: null });
    assert.equal(await audience.allowed(db, a.user.id), true);
    // Ticked: a no, from the purchase.
    assert.deepEqual((await call('/users/me/purchase-news', { method: 'POST', token: a.token, body: { optOut: true } })).body, { ok: true, news: false });
    assert.equal(await audience.allowed(db, a.user.id), false);
    const { rows } = await db.query('SELECT consent, source FROM email_consents WHERE user_id = $1 ORDER BY id DESC LIMIT 1', [a.user.id]);
    assert.deepEqual(rows[0], { consent: false, source: 'purchase' });
    // Ticked again: no second row.
    await call('/users/me/purchase-news', { method: 'POST', token: a.token, body: { optOut: true } });
    assert.equal((await db.query(`SELECT count(*)::int AS n FROM email_consents WHERE user_id = $1 AND source = 'purchase'`, [a.user.id])).rows[0].n, 1);
    // Saying yes in Settings later brings news back.
    await call('/users/me', { method: 'PATCH', token: a.token, body: { marketing_opt_in: true } });
    assert.equal(await audience.allowed(db, a.user.id), true);

    // A soft opt-in buyer (never ticked yes) clicks unsubscribe: stopped.
    const u = b.user.id;
    assert.equal((await call('/users/unsubscribe', { method: 'POST', body: { u, t: unsubscribe.token(u) } })).status, 200);
    assert.equal(await audience.allowed(db, u), false);
    assert.equal((await call('/users/purchase-news', { method: 'POST', body: { optOut: true } })).status >= 400, true); // (no route without /me)
    assert.equal((await call('/users/me/purchase-news', { method: 'POST', body: { optOut: true } })).status, 401); // (logged in only)
  } finally {
    delete process.env.MARKETING_SOFT_OPT_IN_FROM;
    server.close();
  }
});
