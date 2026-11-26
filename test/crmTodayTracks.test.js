'use strict';

// The CRM's start page and Races & tracks (Moses, 17 Nov 2026): GET /admin/today, GET /admin/tracks and
// POST /admin/tracks/:slug/active (owner only, a reason, audited). Against a real database (ROOMS_TEST_DATABASE_URL).
const test = require('node:test');
const assert = require('node:assert/strict');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
const totp = require('../src/admin/totp');

test('today\'s cards, the track list, and switching a track on and off (owner only, audited)', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const tag = `t_ctt_${Date.now() % 1e6}`;
  const reg = async (n) => (await call('/auth/register', { method: 'POST', body: { username: n, email: `${n}@test.invalid`, password: 'password123', age_group: '18+' } })).body;
  const adminAs = async (n, role) => {
    const a = await reg(n);
    await db.query(`UPDATE users SET role = 'admin', admin_role = $2 WHERE id = $1`, [a.user.id, role]);
    const setup = (await call('/admin/session/start', { method: 'POST', token: a.token })).body.setup;
    return (await call('/admin/session/verify', { method: 'POST', token: a.token, body: { code: totp.codeAt(setup.secret, totp.stepNow()) } })).body.token;
  };
  try {
    const owner = await adminAs(`${tag}o`, 'owner');
    const finance = await adminAs(`${tag}f`, 'finance');
    const ro = await adminAs(`${tag}r`, 'read-only');

    // Today: the cards for every role; who bought what only for a role that may see payments.
    const t1 = (await call('/admin/today', { token: owner })).body;
    for (const k of ['sales', 'newPlayers', 'signUps', 'openSupport']) assert.ok(k in t1, k);
    assert.ok(Array.isArray(t1.latest));
    const t2 = await call('/admin/today', { token: ro });
    assert.equal(t2.status, 200);
    assert.equal(t2.body.latest, null);
    // The Today period on the Dashboard.
    assert.equal((await call('/admin/dashboard?period=today', { token: ro })).body.period, 'today');

    // The track list: every track, with whether the server has its code.
    const { tracks } = (await call('/admin/tracks', { token: ro })).body;
    assert.ok(tracks.length > 10);
    const off = tracks.find((t) => !t.is_active && t.built);
    assert.ok(off, 'a built track that is switched off');

    // Switching: the owner only, with a reason; audited; not twice; never a track without code.
    assert.equal((await call(`/admin/tracks/${off.slug}/active`, { method: 'POST', token: finance, body: { active: true, reason: 'testing the switch' } })).status, 403);
    assert.equal((await call(`/admin/tracks/${off.slug}/active`, { method: 'POST', token: owner, body: { active: true, reason: 'x' } })).status, 400);
    const on = await call(`/admin/tracks/${off.slug}/active`, { method: 'POST', token: owner, body: { active: true, reason: 'testing the switch' } });
    assert.equal(on.status, 200);
    assert.equal(on.body.track.is_active, true);
    assert.equal((await db.query('SELECT is_active FROM tracks WHERE slug = $1', [off.slug])).rows[0].is_active, true);
    assert.equal((await call(`/admin/tracks/${off.slug}/active`, { method: 'POST', token: owner, body: { active: true, reason: 'testing the switch' } })).status, 409);
    const back = await call(`/admin/tracks/${off.slug}/active`, { method: 'POST', token: owner, body: { active: false, reason: 'testing the switch, back off' } });
    assert.equal(back.status, 200);
    const { rows: log } = await db.query(`SELECT action, reason, details FROM admin_audit WHERE action IN ('track-on', 'track-off') AND details->>'slug' = $1 ORDER BY created_at DESC LIMIT 2`, [off.slug]);
    assert.deepEqual(log.map((l) => l.action), ['track-off', 'track-on']);
    assert.equal(log[1].reason, 'testing the switch');
    const nocode = `zz-no-code-${Date.now() % 1e6}`;
    await db.query(`INSERT INTO tracks (slug, name, difficulty, length_m, is_active, physics) VALUES ($1, 'No code', 'easy', 100, false, '{}')`, [nocode]);
    assert.equal((await call(`/admin/tracks/${nocode}/active`, { method: 'POST', token: owner, body: { active: true, reason: 'testing the switch' } })).status, 409);
    await db.query('DELETE FROM tracks WHERE slug = $1', [nocode]);
  } finally {
    server.close();
    await db.pool?.end?.();
  }
});
