'use strict';

// The player's own settings and data rights: news by email (with its dates), the unsubscribe link,
// "Download my data" and "Delete my account". Against a real database when ROOMS_TEST_DATABASE_URL is set.
const test = require('node:test');
const assert = require('node:assert/strict');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
const unsubscribe = require('../src/email/unsubscribe');

test('unsubscribe links are signed per player and don\'t work for anyone else', () => {
  const a = '11111111-1111-4111-8111-111111111111';
  const b = '22222222-2222-4222-8222-222222222222';
  assert.equal(unsubscribe.valid(a, unsubscribe.token(a)), true);
  assert.equal(unsubscribe.valid(b, unsubscribe.token(a)), false);
  assert.equal(unsubscribe.valid(a, 'x'.repeat(32)), false);
  assert.match(unsubscribe.pageLink(a, 'https://marblespins.com'), /^https:\/\/marblespins\.com\/unsubscribe\?u=1111.*&t=[\w-]{32}$/);
  assert.equal(unsubscribe.headers(a, 'https://api.example')['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
});

test('news by email, unsubscribe, download my data, delete my account', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token, form } = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'content-type': form ? 'application/x-www-form-urlencoded' : 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
      body: form ?? (body ? JSON.stringify(body) : undefined),
    });
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch { /* */ }
    return { status: res.status, body: json, headers: res.headers };
  };
  try {
    const name = `t_acc_${Date.now() % 1e6}`;
    const me = (await call('/auth/register', { method: 'POST', body: { username: name, email: `${name}@test.invalid`, password: 'password123', marketing_opt_in: true, age_group: '18+' } })).body;
    const kid = (await call('/auth/register', { method: 'POST', body: { username: `${name}k`, email: `${name}k@test.invalid`, password: 'password123', marketing_opt_in: true, age_group: 'under-13' } })).body;

    // News by email: on from sign-up, with its date; off in settings; the history is kept.
    let email = (await call('/users/me/email', { token: me.token })).body;
    assert.deepEqual([email.news, email.allowed, email.source], [true, true, 'signup']);
    assert.ok(email.since);
    await call('/users/me', { method: 'PATCH', token: me.token, body: { marketing_opt_in: false } });
    email = (await call('/users/me/email', { token: me.token })).body;
    assert.deepEqual([email.news, email.source], [false, 'settings']);
    await call('/users/me', { method: 'PATCH', token: me.token, body: { marketing_opt_in: true } });

    // Under 13: never offered, and the server refuses.
    const kidEmail = (await call('/users/me/email', { token: kid.token })).body;
    assert.deepEqual([kidEmail.news, kidEmail.allowed, kidEmail.why], [false, false, 'under-13']);
    assert.equal((await call('/users/me', { method: 'PATCH', token: kid.token, body: { marketing_opt_in: true } })).status, 400);

    // The email's unsubscribe link: no login; a wrong token does nothing; one-click (form post) works too.
    const id = me.user.id;
    assert.equal((await call('/users/unsubscribe', { method: 'POST', body: { u: id, t: unsubscribe.token(kid.user.id) } })).status, 400);
    assert.equal((await call('/users/me/email', { token: me.token })).body.news, true);
    assert.equal((await call(`/users/unsubscribe?u=${id}&t=${unsubscribe.token(id)}`, { method: 'POST', form: 'List-Unsubscribe=One-Click' })).status, 200);
    assert.equal((await call('/users/unsubscribe', { method: 'POST', body: { u: id, t: unsubscribe.token(id) } })).status, 200); // (again: fine, logged once)
    const { rows: answers } = await db.query('SELECT consent, source FROM email_consents WHERE user_id = $1 ORDER BY id', [id]);
    assert.deepEqual(answers.map((a) => `${a.source}:${a.consent}`), ['signup:true', 'settings:false', 'settings:true', 'unsubscribe:false']);

    // Download my data: everything, no password.
    const exp = await call('/users/me/export', { token: me.token });
    assert.equal(exp.status, 200);
    assert.match(exp.headers.get('content-disposition'), /attachment/);
    assert.equal(exp.body.account.username, name);
    assert.equal(exp.body.newsByEmail.length, 4);
    assert.ok(Array.isArray(exp.body.coinLedger) && exp.body.coinLedger.length >= 1);
    assert.ok(exp.body.securityLog.some((e) => e.kind === 'signup'));
    assert.ok(!JSON.stringify(exp.body).includes('password_hash'));

    // A payment, kept for bookkeeping after deletion.
    await db.query(`INSERT INTO payments (user_id, provider, product_id, coins, amount_cents, currency, status, order_no) VALUES ($1, 'test', 'coins-5000', 5000, 500, 'usd', 'paid', 'MS-T' || floor(random() * 1e6)::int)`, [id]);

    // Delete my account: confirmation and password needed.
    assert.equal((await call('/users/me', { method: 'DELETE', token: me.token, body: { password: 'password123' } })).status, 400);
    assert.equal((await call('/users/me', { method: 'DELETE', token: me.token, body: { confirm: 'DELETE', password: 'wrong-password' } })).status, 401);
    assert.equal((await call('/users/me', { method: 'DELETE', token: me.token, body: { confirm: 'delete', password: 'password123' } })).body.deleted, true);
    assert.equal((await call('/auth/me', { token: me.token })).status, 401); // (logged out everywhere)
    assert.equal((await call('/auth/login', { method: 'POST', body: { login: name, password: 'password123' } })).status, 401);
    assert.equal((await call('/auth/login', { method: 'POST', body: { login: `${name}@test.invalid`, password: 'password123' } })).status, 401);
    const { rows: [u] } = await db.query('SELECT username, email, display_name, marketing_opt_in, age_group, deleted_at FROM users WHERE id = $1', [id]);
    assert.match(u.username, /^deleted_[0-9a-f]{12}$/);
    assert.match(u.email, /@deleted\.invalid$/);
    assert.equal(u.marketing_opt_in, false);
    assert.equal(u.age_group, null);
    assert.ok(u.deleted_at);
    const count = async (sql) => (await db.query(sql, [id])).rows[0].n;
    assert.equal(await count('SELECT count(*)::int AS n FROM email_consents WHERE user_id = $1'), 0);
    assert.equal(await count('SELECT count(*)::int AS n FROM security_events WHERE user_id = $1'), 0);
    assert.equal(await count('SELECT count(*)::int AS n FROM payments WHERE user_id = $1'), 1);
    assert.ok(await count('SELECT count(*)::int AS n FROM coin_ledger WHERE user_id = $1') >= 1);
    assert.equal(await count(`SELECT count(*)::int AS n FROM admin_audit WHERE target_user_id = $1 AND action = 'account-deleted'`), 1);
    // The name is free again for someone new.
    assert.equal((await call('/auth/register', { method: 'POST', body: { username: name, email: `${name}@test.invalid`, password: 'password123', age_group: '18+' } })).status, 201);

    // A guest confirms by typing DELETE (no password).
    const guest = (await call('/auth/guest', { method: 'POST', body: {} })).body;
    if (guest?.token) {
      assert.equal((await call('/users/me', { method: 'DELETE', token: guest.token, body: { confirm: 'DELETE' } })).body.deleted, true);
    }
  } finally {
    server.close();
    await db.pool?.end?.();
  }
});
