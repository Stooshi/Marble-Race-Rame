'use strict';

// The website's cookie choice, kept with the account as a record of consent (POST
// /api/users/me/cookie-consent), shown in "Download my data" and deleted with the account.
// Against a real database when ROOMS_TEST_DATABASE_URL is set.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';

test('the schema has the cookie_consents table', () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'docs', 'database_schema.sql'), 'utf8');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS cookie_consents \(/);
  assert.match(sql, /user_id\s+uuid\s+NOT NULL REFERENCES users\(id\) ON DELETE CASCADE/);
});

test('cookie consent: logged, validated, exported and deleted', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (p, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + p, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: body ? JSON.stringify(body) : undefined });
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch { /* */ }
    return { status: res.status, body: json };
  };
  try {
    const name = `t_ck_${Date.now() % 1e6}`;
    const me = (await call('/auth/register', { method: 'POST', body: { username: name, email: `${name}@test.invalid`, password: 'password123', age_group: '18+' } })).body;
    const consent = { version: 1, statistics: true, marketing: false, decided_at: new Date().toISOString() };

    assert.equal((await call('/users/me/cookie-consent', { method: 'POST', body: consent })).status, 401);
    assert.equal((await call('/users/me/cookie-consent', { method: 'POST', token: me.token, body: { ...consent, marketing: 'yes' } })).status, 400);
    assert.equal((await call('/users/me/cookie-consent', { method: 'POST', token: me.token, body: { statistics: true, marketing: true } })).status, 400);
    assert.equal((await call('/users/me/cookie-consent', { method: 'POST', token: me.token, body: consent })).status, 201);
    // A browser time far in the future is replaced by the server's time.
    assert.equal((await call('/users/me/cookie-consent', { method: 'POST', token: me.token, body: { ...consent, marketing: true, decided_at: '2099-01-01T00:00:00Z' } })).status, 201);

    const { rows } = await db.query('SELECT version, statistics, marketing, decided_at FROM cookie_consents WHERE user_id = $1 ORDER BY id', [me.user.id]);
    assert.deepEqual(rows.map((r) => [r.version, r.statistics, r.marketing]), [[1, true, false], [1, true, true]]);
    assert.ok(rows[1].decided_at.getTime() < Date.now() + 120_000);

    const exp = (await call('/users/me/export', { token: me.token })).body;
    assert.equal(exp.cookieChoices.length, 2);

    assert.equal((await call('/users/me', { method: 'DELETE', token: me.token, body: { confirm: 'delete', password: 'password123' } })).body.deleted, true);
    const left = await db.query('SELECT count(*)::int AS n FROM cookie_consents WHERE user_id = $1', [me.user.id]);
    assert.equal(left.rows[0].n, 0);
  } finally {
    server.close();
    await db.pool?.end?.();
  }
});
