'use strict';

// No volume controls (Moses, 28 Oct 2026): an account keeps only sound.muted and sound.music (on/off).
const test = require('node:test');
const assert = require('node:assert/strict');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';

test('sound settings: muted and music on/off only; an old app\'s slider numbers read as on/off and never stored', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (p, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + p, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  try {
    const g = (await call('/auth/guest', { method: 'POST' })).body;
    await db.query(`UPDATE users SET settings = '{"sound":{"music":0.6,"effects":0.8,"muted":false}}' WHERE id = $1`, [g.user.id]);
    let r = await call('/users/me/settings', { method: 'PUT', token: g.token, body: { sound: { muted: true, music: false } } });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.deepEqual(r.body.settings.sound, { muted: true, music: false });
    r = await call('/users/me/settings', { method: 'PUT', token: g.token, body: { sound: { music: 0.4, effects: 0.2 } } }); // (an older app)
    assert.deepEqual(r.body.settings.sound, { muted: true, music: true });
    assert.equal((await call('/users/me/settings', { method: 'PUT', token: g.token, body: { sound: { muted: 'yes' } } })).status, 400);
  } finally {
    server.close();
    await db.pool?.end?.().catch?.(() => {});
  }
});
