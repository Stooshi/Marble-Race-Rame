'use strict';

// Logins last 180 days after the LAST visit (Moses, 20 Oct 2026): GET /api/auth/me renews a login
// older than a day. Before, every login ended 7 days after it was made, and a guest (no password)
// was lost then. Against a real database when ROOMS_TEST_DATABASE_URL is set.
const test = require('node:test');
const assert = require('node:assert/strict');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
const jwt = require('jsonwebtoken');
const config = require('../src/config');

test('a login lasts 180 days by default', () => {
  if (!process.env.JWT_EXPIRES_IN) assert.equal(config.auth.jwtExpiresIn, '180d');
});

test('a visit renews a guest\'s and a saved player\'s login (sliding expiry), once a day', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const me = async (token) => {
    const res = await fetch(`${base}/auth/me`, { headers: { authorization: `Bearer ${token}` } });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const day = 86400;
  const now = () => Math.floor(Date.now() / 1000);
  try {
    const guest = (await (await fetch(`${base}/auth/guest`, { method: 'POST' })).json());
    // A fresh login: nothing to renew.
    const fresh = await me(guest.token);
    assert.equal(fresh.status, 200);
    assert.equal(fresh.body.token, undefined);
    const exp = jwt.decode(guest.token).exp;
    assert.ok(Math.abs(exp - (now() + 180 * day)) < 60, 'a new login lasts 180 days');

    // A guest back after 170 days (the login made then, still valid): renewed for another 180 days.
    const old = jwt.sign({ sub: guest.user.id, username: guest.user.username, role: 'player', iat: now() - 170 * day }, config.auth.jwtSecret, { expiresIn: '180d', algorithm: 'HS256' });
    const back = await me(old);
    assert.equal(back.status, 200);
    assert.ok(back.body.token, 'a fresh token');
    assert.ok(Math.abs(jwt.decode(back.body.token).exp - (now() + 180 * day)) < 60);
    assert.equal((await me(back.body.token)).body.user.id, guest.user.id);

    // Gone longer than 180 days: the login has ended (a guest can't come back; a saved player logs in).
    const expired = jwt.sign({ sub: guest.user.id, username: guest.user.username, role: 'player', iat: now() - 181 * day, exp: now() - day }, config.auth.jwtSecret, { algorithm: 'HS256' });
    assert.equal((await me(expired)).status, 401);
  } finally {
    server.close();
  }
});
