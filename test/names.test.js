'use strict';

// Player names (Moses, 22 Oct 2026; src/names): offensive names are refused when chosen or changed
// (sign-up, saving a guest, the shown name); any player can report a name; the back office lists the
// reports and the names the filter would block, and renames (PlayerNNNN) or dismisses, audited.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';

const names = require('../src/names');

test('the server uses the shared filter', async () => {
  assert.ok(await names.check('Sh1tHead'));
  assert.equal(await names.check('Scunthorpe'), null);
  await assert.rejects(names.assertAllowed({ username: 'fuuuck_99' }), (e) => e.status === 400 && e.details.code === 'name_not_allowed' && e.details.field === 'username');
  await names.assertAllowed({ username: 'SwiftComet42', display_name: null });
});

test('names on a real database: refused at sign-up, saving and renaming; reports; the back office', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const totp = require('../src/admin/totp');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const run = crypto.randomBytes(3).toString('hex');
  try {
    const reg = (username, extra = {}) => call('/auth/register', { method: 'POST', body: { username, email: `${username.toLowerCase()}_${run}@test.invalid`, password: 'password123', birth_year: 1990, birth_month: 5, ...extra } });
    // Refused when chosen.
    const bad = await reg(`B1tch_${run}`);
    assert.equal(bad.status, 400);
    assert.equal(bad.body.details.code, 'name_not_allowed');
    assert.equal((await reg(`Racer_${run}`, { display_name: 'Big a$$' })).status, 400);
    const ok = (await reg(`Nova_${run}`)).body;
    assert.ok(ok.token);
    assert.equal((await call('/users/me', { method: 'PATCH', token: ok.token, body: { display_name: 'Kurw4' } })).status, 400);
    assert.equal((await call('/users/me', { method: 'PATCH', token: ok.token, body: { display_name: `Nova the Great ${run}` } })).status, 200);
    const guest = (await call('/auth/guest', { method: 'POST', body: {} })).body;
    const claim = await call('/auth/claim', { method: 'POST', token: guest.token, body: { username: `Fuck_${run}`, email: `g_${run}@test.invalid`, password: 'password123', birth_year: 1990, birth_month: 5 } });
    assert.equal(claim.status, 400);

    // A name taken before the filter (inserted directly), reported by two players.
    const old = (await reg(`Old_${run}`)).body;
    await db.query('UPDATE users SET username = $2 WHERE id = $1', [old.user.id, `Sh1t_${run}`]);
    const r1 = await call(`/users/${old.user.id}/report-name`, { method: 'POST', token: ok.token, body: { where: 'scoreboard' } });
    assert.deepEqual(r1.body, { reported: true });
    await call(`/users/${old.user.id}/report-name`, { method: 'POST', token: ok.token, body: { where: 'results' } }); // (again: no second open report)
    await call(`/users/${old.user.id}/report-name`, { method: 'POST', token: guest.token, body: { where: 'results' } });
    assert.equal((await call(`/users/${ok.user.id}/report-name`, { method: 'POST', token: ok.token, body: {} })).status, 400); // (yourself)
    assert.equal((await call(`/users/${old.user.id}/report-name`, { method: 'POST', body: {} })).status, 401); // (logged out)
    const { rows: [cnt] } = await db.query('SELECT COUNT(*)::int AS n FROM name_reports WHERE reported_user_id = $1', [old.user.id]);
    assert.equal(cnt.n, 2);

    // The back office.
    const admin = (await reg(`Boss_${run}`)).body;
    await db.query(`UPDATE users SET role = 'admin' WHERE id = $1`, [admin.user.id]);
    const setup = (await call('/admin/session/start', { method: 'POST', token: admin.token })).body.setup;
    const { token: adm } = (await call('/admin/session/verify', { method: 'POST', token: admin.token, body: { code: totp.codeAt(setup.secret, totp.stepNow()) } })).body;
    const list = (await call('/admin/name-reports', { token: adm })).body;
    const mine = list.open.find((r) => r.player_id === old.user.id);
    assert.equal(mine.reporters, 2);
    assert.deepEqual(mine.places.sort(), ['results', 'scoreboard']);
    assert.ok(list.flagged.some((f) => f.player_id === old.user.id && f.word === 'shit'));
    assert.equal((await call(`/admin/name-reports/${old.user.id}/resolve`, { method: 'POST', token: adm, body: { action: 'rename', reason: 'x' } })).status, 400); // (a reason)
    const done = (await call(`/admin/name-reports/${old.user.id}/resolve`, { method: 'POST', token: adm, body: { action: 'rename', reason: 'Offensive name, reported twice' } })).body;
    assert.match(done.username, /^Player\d{4,6}$/);
    assert.equal(done.closed, 2);
    assert.equal((await db.query('SELECT username, display_name FROM users WHERE id = $1', [old.user.id])).rows[0].username, done.username);
    const after = (await call('/admin/name-reports', { token: adm })).body;
    assert.ok(!after.open.some((r) => r.player_id === old.user.id));
    assert.ok(after.resolved.some((r) => r.player_id === old.user.id && r.resolution === 'renamed'));
    await call(`/users/${ok.user.id}/report-name`, { method: 'POST', token: guest.token, body: { where: 'room' } });
    assert.equal((await call(`/admin/name-reports/${ok.user.id}/resolve`, { method: 'POST', token: adm, body: { action: 'dismiss', reason: 'Name is fine' } })).body.username, `Nova_${run}`);
    const { rows: audits } = await db.query(`SELECT action FROM admin_audit WHERE admin_id = $1 AND action LIKE 'name%'`, [admin.user.id]);
    assert.deepEqual(audits.map((a) => a.action).sort(), ['name-reports-dismissed', 'name-reset']);
  } finally {
    server.close();
    await db.pool?.end?.();
  }
});
