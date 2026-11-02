'use strict';

// The back office: its 2-step codes always; its API against a real database when
// ROOMS_TEST_DATABASE_URL (any test database) is set.
const test = require('node:test');
const assert = require('node:assert/strict');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
const totp = require('../src/admin/totp');

test('2-step codes: the RFC 6238 test values; a code works once, in its 30 s (one step of slack)', () => {
  const secret = totp.base32(Buffer.from('12345678901234567890'));
  assert.equal(totp.codeAt(secret, Math.floor(59 / 30)), '287082');
  assert.equal(totp.codeAt(secret, Math.floor(1111111109 / 30)), '081804');
  const now = 1_800_000_000_000;
  const step = totp.stepNow(now);
  const code = totp.codeAt(secret, step);
  assert.equal(totp.verify(secret, code, { now }), step);
  assert.equal(totp.verify(secret, code, { now: now + 30_000 }), step); // (a slow clock)
  assert.equal(totp.verify(secret, code, { now: now + 90_000 }), null); // too late
  assert.equal(totp.verify(secret, code, { now, lastStep: step }), null); // already used
  assert.equal(totp.verify(secret, '12345', { now }), null);
  assert.equal(totp.decrypt(totp.encrypt(secret)), secret);
  assert.notEqual(totp.encrypt(secret), totp.encrypt(secret)); // (a fresh IV each time)
});

test('the back office on a real database: admin + 2-step + live session; reasons; audit; IPs trimmed', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const security = require('../src/security');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  try {
    const name = `t_adm_${Date.now() % 1e6}`;
    const admin = (await call('/auth/register', { method: 'POST', body: { username: name, email: `${name}@test.invalid`, password: 'password123', age_group: '18+' } })).body;
    const player = (await call('/auth/register', { method: 'POST', body: { username: `${name}p`, email: `${name}p@test.invalid`, password: 'password123', marketing_opt_in: true, age_group: '13-17' } })).body;
    assert.equal(player.user.age_group, '13-17');
    // A player can't get in, with or without the pages.
    assert.equal((await call('/admin/players', { token: admin.token })).status, 401);
    assert.equal((await call('/admin/session/start', { method: 'POST', token: admin.token })).status, 403);
    await db.query(`UPDATE users SET role = 'admin' WHERE id = $1`, [admin.user.id]);
    const setup = (await call('/admin/session/start', { method: 'POST', token: admin.token })).body.setup;
    const code = totp.codeAt(setup.secret, totp.stepNow());
    const { token } = (await call('/admin/session/verify', { method: 'POST', token: admin.token, body: { code } })).body;
    assert.ok(token);
    assert.equal((await call('/admin/session/verify', { method: 'POST', token: admin.token, body: { code } })).status, 401); // (used)
    assert.equal((await call('/auth/me', { token })).status, 401); // (not a player token)

    const pid = player.user.id;
    assert.equal((await call(`/admin/players/${pid}/coins`, { method: 'POST', token, body: { amount: 100 } })).status, 400); // no reason
    assert.equal((await call(`/admin/players/${pid}/coins`, { method: 'POST', token, body: { amount: 100, reason: 'Support ticket 1' } })).body.balance, 750);
    await call(`/admin/players/${pid}/suspend`, { method: 'POST', token, body: { reason: 'Test suspension' } });
    assert.equal((await call('/auth/me', { token: player.token })).status, 401);
    await call(`/admin/players/${pid}/unsuspend`, { method: 'POST', token, body: { reason: 'Test over' } });
    const detail = (await call(`/admin/players/${pid}`, { token })).body;
    assert.deepEqual(detail.audit.map((a) => a.action), ['unsuspend', 'suspend', 'coins']);
    assert.ok(detail.security.events.some((e) => e.kind === 'signup'));
    // No IP addresses in the details; the Security tab has them, and each opening is audited.
    assert.ok(detail.security.events.every((e) => !('ip' in e)));
    assert.ok(!('sameAddress' in detail.security));
    const sec = (await call(`/admin/players/${pid}/security`, { token })).body;
    assert.ok(sec.events.some((e) => e.kind === 'signup' && 'ip' in e));
    assert.ok(Array.isArray(sec.sameAddress));
    const { rows: views } = await db.query(`SELECT admin_id, reason FROM admin_audit WHERE action = 'security-view' AND target_user_id = $1`, [pid]);
    assert.equal(views.length, 1);
    assert.equal(views[0].admin_id, admin.user.id);
    assert.equal(security.TRIM_EVERY_MS, 3600_000);
    // The first visit's country (never the IP): the oldest event with a country.
    await db.query(`UPDATE security_events SET country = 'NO' WHERE user_id = $1`, [pid]);
    await db.query(`INSERT INTO security_events (user_id, kind, country, created_at) VALUES ($1, 'login', 'DK', now() + interval '1 minute')`, [pid]);
    assert.equal((await call(`/admin/players/${pid}`, { token })).body.player.first_country, 'NO');
    const listed = (await call(`/admin/players?q=${pid}`, { token })).body.players[0];
    assert.equal(listed.first_country, 'NO');
    assert.ok(!('ip' in listed));
    assert.equal(detail.consents[0].consent, true);

    // The Dashboard (2 Nov 2026): read-only counts for a period; staff left out; the first steps.
    const dash = async (period = '24h') => (await call(`/admin/dashboard?period=${period}`, { token })).body;
    const before = await dash();
    const guest = (await call('/auth/guest', { method: 'POST', body: { source: 'quick' } })).body;
    assert.equal((await call('/users/me/first-step', { method: 'POST', token: guest.token, body: { step: 'go' } })).status, 204);
    assert.equal((await call('/users/me/first-step', { method: 'POST', token: guest.token, body: { step: 'go' } })).status, 204); // (kept once)
    assert.equal((await call('/users/me/first-step', { method: 'POST', token: guest.token, body: { step: 'nope' } })).status, 400);
    let now = await dash();
    assert.equal(now.players.newGuests, before.players.newGuests + 1);
    assert.equal(now.funnel.tapped, before.funnel.tapped + 1);
    assert.equal(now.funnel.sawGo, before.funnel.sawGo + 1);
    assert.equal(now.funnel.bySource.quick, (before.funnel.bySource.quick ?? 0) + 1);
    assert.equal(now.timeZone, 'Europe/Stockholm');
    assert.ok(!JSON.stringify(now).includes(guest.user.username)); // (no player in it)
    // Staff: the Dashboard leaves them out; admins are staff and can't be unmarked.
    const gid = guest.user.id;
    assert.equal((await call(`/admin/players/${gid}/staff`, { method: 'POST', token, body: { staff: true } })).status, 400); // no reason
    assert.equal((await call(`/admin/players/${gid}/staff`, { method: 'POST', token, body: { staff: true, reason: 'Test account of the team' } })).status, 200);
    assert.equal((await call(`/admin/players/${gid}/staff`, { method: 'POST', token, body: { staff: true, reason: 'Test account of the team' } })).status, 409);
    assert.equal((await call(`/admin/players/${admin.user.id}/staff`, { method: 'POST', token, body: { staff: false, reason: 'Trying to unmark an admin' } })).status, 409);
    now = await dash();
    assert.equal(now.players.newGuests, before.players.newGuests);
    assert.equal(now.funnel.tapped, before.funnel.tapped);
    assert.equal((await call(`/admin/players?q=${gid}`, { token })).body.players[0].is_staff, true);
    assert.equal((await call(`/admin/players/${gid}`, { token })).body.player.is_staff, true);
    assert.equal((await call(`/admin/players?q=${admin.user.id}`, { token })).body.players[0].is_staff, true);
    const { rows: staffAudit } = await db.query(`SELECT action FROM admin_audit WHERE target_user_id = $1 AND action LIKE 'staff-%'`, [gid]);
    assert.deepEqual(staffAudit.map((r) => r.action), ['staff-on']);
    for (const period of ['6h', '24h', '7d', '30d', 'mtd', 'lastmonth']) {
      const d = await dash(period);
      assert.equal(d.period, period);
      assert.ok(Array.isArray(d.chart) && d.chart.length >= 1, period);
      assert.equal(typeof d.races.perActivePlayer, 'number');
    }
    assert.equal((await dash('6h')).chart.length >= 6, true);
    assert.equal((await dash('nonsense')).period, '24h');

    // IPs: older than 90 days → blanked, the country kept.
    await db.query(`UPDATE security_events SET created_at = now() - interval '91 days', country = 'SE' WHERE user_id = $1`, [pid]);
    assert.ok(await security.trimIps() >= 1);
    const { rows } = await db.query('SELECT ip, country FROM security_events WHERE user_id = $1', [pid]);
    assert.ok(rows.every((r) => r.ip === null && r.country === 'SE'));

    // The session ends after 30 minutes without use.
    await db.query(`UPDATE admin_sessions SET last_seen_at = now() - interval '31 minutes' WHERE user_id = $1`, [admin.user.id]);
    assert.equal((await call('/admin/session', { token })).status, 401);
  } finally {
    server.close();
    await db.pool?.end?.();
  }
});
