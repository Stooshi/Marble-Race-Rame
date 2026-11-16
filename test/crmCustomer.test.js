'use strict';

// The CRM's customer page (Moses, 16 Nov 2026, CRM phase 3): an exact order, receipt, support reference, Marble ID or
// account id opens its customer; the Overview: spend, packs, passes. Against a real database (ROOMS_TEST_DATABASE_URL).
const test = require('node:test');
const assert = require('node:assert/strict');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
const totp = require('../src/admin/totp');

test('customer search and overview', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  try {
    const tag = `t_crm_${Date.now() % 1e6}`;
    const reg = async (n) => (await call('/auth/register', { method: 'POST', body: { username: n, email: `${n}@test.invalid`, password: 'password123', age_group: '18+' } })).body;
    const admin = await reg(`${tag}a`);
    const player = await reg(`${tag}p`);
    await db.query(`UPDATE users SET role = 'admin', admin_role = 'owner' WHERE id = $1`, [admin.user.id]);
    const setup = (await call('/admin/session/start', { method: 'POST', token: admin.token })).body.setup;
    const { token } = (await call('/admin/session/verify', { method: 'POST', token: admin.token, body: { code: totp.codeAt(setup.secret, totp.stepNow()) } })).body;
    const order = `MS-${900000 + (Date.now() % 99999)}`;
    await db.query(
      `INSERT INTO payments (user_id, provider, product_id, coins, amount_cents, currency, charged_cents, charged_currency, status, paid_at, order_no)
       VALUES ($1, 'test', 'coins-1000', 1000, 499, 'usd', 499, 'eur', 'paid', now(), $2)`,
      [player.user.id, order],
    );
    const byOrder = (await call(`/admin/players?q=${order}`, { token })).body;
    assert.equal(byOrder.exact, true);
    assert.equal(byOrder.players[0].id, player.user.id);
    assert.equal((await call(`/admin/players?q=${tag}`, { token })).body.exact, false); // (a name: a list to choose from)
    const detail = (await call(`/admin/players/${player.user.id}`, { token })).body;
    assert.deepEqual(detail.overview.spend.map((x) => [x.currency, x.purchases, x.cents]), [['EUR', 1, 499]]);
    assert.deepEqual(detail.overview.packs, []);
    assert.ok(Array.isArray(detail.emails));
  } finally {
    server.close();
    await db.pool?.end?.();
  }
});
