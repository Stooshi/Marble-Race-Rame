'use strict';

// Reported names hidden by themselves (Moses, 25 Oct 2026): 3 different players on 3 different
// connections hide a name at once (guest_<number> / Player_<number> shows), the player is told and
// chooses a new one; the back office restores it (3 new reports to hide it again), keeps it hidden or
// renames. At most 10 reports a day per player. And the sign-up name rule fix: a name sent at sign-up
// goes through the same rules as choosing one later.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { hiddenPlaceholder, isStandIn, shownName } = require('../src/names/shown');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
if (DB) process.env.DATABASE_URL = DB;

test('the stand-ins', () => {
  assert.match(hiddenPlaceholder('3f2a9c00-0000-4000-8000-000000000000'), /^Player_\d{5}$/);
  assert.equal(hiddenPlaceholder('3f2a9c00-0000-4000-8000-000000000000'), hiddenPlaceholder('3f2a9c00-0000-4000-8000-000000000000'));
  assert.ok(isStandIn('guest_01234'));
  assert.ok(isStandIn('Player_99999'));
  assert.ok(!isStandIn('Player4821'));
  assert.ok(!isStandIn('Nova'));
  assert.equal(shownName({ username: 'guest_0da1cddb1b', display_name: null }), 'guest_07803');
});

test('reported names hide themselves; the player chooses a new one; the back office', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const totp = require('../src/admin/totp');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token, ip } = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }), ...(ip && { 'x-forwarded-for': ip }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const run = crypto.randomBytes(3).toString('hex');
  const guest = async () => (await call('/auth/guest', { method: 'POST', body: {} })).body;
  const reg = (username, extra = {}) => call('/auth/register', { method: 'POST', body: { username, email: `${username.toLowerCase()}_${run}@test.invalid`, password: 'password123', birth_year: 1990, birth_month: 5, ...extra } });
  const me = async (token) => (await call('/auth/me', { token })).body.user;
  const report = (id, r, ip) => call(`/users/${id}/report-name`, { method: 'POST', token: r.token, ip, body: { where: 'scoreboard' } });
  try {
    // The sign-up fix: a name sent at sign-up follows the same rules as choosing one later.
    assert.equal((await reg(`Sg1_${run}`, { display_name: `guest_123` })).status, 400);
    assert.equal((await reg(`Sg2_${run}`, { display_name: 'ab' })).status, 400);
    const taken = (await reg(`Taken_${run}`)).body;
    const dup = await reg(`Sg3_${run}`, { display_name: `taken_${run}` });
    assert.equal(dup.status, 409);
    assert.equal(dup.body.details.code, 'name_taken');
    assert.equal((await reg(`Sg4_${run}`, { display_name: `Fine Name ${run}` })).status, 201);
    assert.equal((await reg(`Player_12345`)).status, 400); // (looks like a stand-in)
    assert.ok(taken.token);

    // A guest with a chosen name.
    const g = await guest();
    assert.equal((await call('/users/me', { method: 'PATCH', token: g.token, body: { display_name: `Rude ${run}` } })).status, 200);
    const [a, b, c, d] = [await guest(), await guest(), await guest(), await guest()];
    // Two reporters on one connection count once; a reporter twice counts once.
    await report(g.user.id, a, '10.0.0.1');
    await report(g.user.id, a, '10.0.0.9');
    await report(g.user.id, b, '10.0.0.1');
    assert.equal((await me(g.token)).name_hidden, false);
    await report(g.user.id, c, '10.0.0.2');
    assert.equal((await me(g.token)).name_hidden, false);
    // The third different player on a third connection: hidden at once.
    await report(g.user.id, d, '10.0.0.3');
    let u = await me(g.token);
    assert.equal(u.name_hidden, true);
    assert.equal(u.display_name, null); // (guest_<number> shows)
    // Other players see the stand-in everywhere the server names players.
    const { rows: [row] } = await db.query('SELECT username, display_name, name_hidden_name FROM users WHERE id = $1', [g.user.id]);
    assert.match(shownName(row), /^guest_\d{5}$/);
    assert.equal(row.name_hidden_name, `Rude ${run}`);
    // A stand-in can't be reported.
    const before = (await db.query('SELECT COUNT(*)::int AS n FROM name_reports WHERE reported_user_id = $1', [g.user.id])).rows[0].n;
    const e = await guest();
    await report(g.user.id, e, '10.0.0.4');
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM name_reports WHERE reported_user_id = $1', [g.user.id])).rows[0].n, before);
    // The player can't clear it or take the same name again; a new name ends the hiding.
    assert.equal((await call('/users/me', { method: 'PATCH', token: g.token, body: { display_name: null } })).status, 400);
    const again = await call('/users/me', { method: 'PATCH', token: g.token, body: { display_name: `rude ${run}` } });
    assert.equal(again.status, 400);
    assert.equal(again.body.details.code, 'name_hidden');
    assert.equal((await call('/users/me', { method: 'PATCH', token: g.token, body: { display_name: `Kind ${run}` } })).status, 200);
    u = await me(g.token);
    assert.equal(u.name_hidden, false);
    assert.equal(u.display_name, `Kind ${run}`);
    // The old reports were about the old name: they don't hide the new one.
    await report(g.user.id, a, '10.0.0.1');
    assert.equal((await me(g.token)).name_hidden, false);

    // A saved account whose player name itself is reported: Player_<number> shows.
    const s = (await reg(`Saved_${run}`)).body;
    for (const [r, ip] of [[a, '10.1.0.1'], [b, '10.1.0.2'], [c, '10.1.0.3']]) await report(s.user.id, r, ip);
    u = await me(s.token);
    assert.equal(u.name_hidden, true);
    assert.equal(u.display_name, hiddenPlaceholder(s.user.id));
    assert.equal((await call('/users/me', { method: 'PATCH', token: s.token, body: { display_name: null } })).status, 400);

    // The back office: hidden names first; restore; 3 new reports hide it again; keep hidden; rename.
    const admin = (await reg(`Boss_${run}`)).body;
    await db.query(`UPDATE users SET role = 'admin' WHERE id = $1`, [admin.user.id]);
    const setup = (await call('/admin/session/start', { method: 'POST', token: admin.token })).body.setup;
    const { token: adm } = (await call('/admin/session/verify', { method: 'POST', token: admin.token, body: { code: totp.codeAt(setup.secret, totp.stepNow()) } })).body;
    const list = (await call('/admin/name-reports', { token: adm })).body;
    assert.equal(list.open[0].hidden, true);
    const sRow = list.open.find((r) => r.player_id === s.user.id);
    assert.equal(sRow.hidden_name, `Saved_${run}`);
    assert.equal(sRow.reporters, 3);
    const gRow = list.open.find((r) => r.player_id === g.user.id);
    assert.equal(gRow.changed, true);
    assert.ok(list.open.indexOf(sRow) < list.open.indexOf(gRow));

    const restored = (await call(`/admin/name-reports/${s.user.id}/resolve`, { method: 'POST', token: adm, body: { action: 'restore', reason: 'The name is fine' } })).body;
    assert.equal(restored.display_name, null);
    u = await me(s.token);
    assert.equal(u.name_hidden, false);
    assert.equal(u.display_name, null); // (Saved_… shows again)
    // The same three reporters again: 3 new reports hide it again; fewer don't.
    await report(s.user.id, a, '10.1.0.1');
    await report(s.user.id, b, '10.1.0.2');
    assert.equal((await me(s.token)).name_hidden, false);
    await report(s.user.id, c, '10.1.0.3');
    assert.equal((await me(s.token)).name_hidden, true);
    // Keep hidden: the reports close, the name stays hidden until the player chooses a new one.
    const kept = (await call(`/admin/name-reports/${s.user.id}/resolve`, { method: 'POST', token: adm, body: { action: 'keep-hidden', reason: 'Offensive, keep it hidden' } })).body;
    assert.equal(kept.hidden, true);
    assert.equal((await me(s.token)).name_hidden, true);
    // Rename.
    const t = await guest();
    await call('/users/me', { method: 'PATCH', token: t.token, body: { display_name: `Meanie ${run}` } });
    for (const [r, ip] of [[a, '10.2.0.1'], [b, '10.2.0.2'], [c, '10.2.0.3']]) await report(t.user.id, r, ip);
    assert.equal((await me(t.token)).name_hidden, true);
    await call(`/admin/name-reports/${t.user.id}/resolve`, { method: 'POST', token: adm, body: { action: 'rename', reason: 'Offensive name' } });
    u = await me(t.token);
    assert.equal(u.name_hidden, false);
    assert.equal(u.display_name, null);
    const audits = (await db.query('SELECT action FROM admin_audit WHERE admin_id = $1 ORDER BY id', [admin.user.id])).rows.map((r) => r.action);
    assert.deepEqual(audits, ['name-reports-dismissed', 'name-kept-hidden', 'name-reset']);

    // At most 10 reports a day per player.
    const busy = await guest();
    const targets = [];
    for (let i = 0; i < 11; i++) {
      const x = await guest();
      await call('/users/me', { method: 'PATCH', token: x.token, body: { display_name: `Target ${i} ${run}` } });
      targets.push(x);
    }
    for (let i = 0; i < 10; i++) assert.equal((await report(targets[i].user.id, busy, '10.3.0.1')).status, 200);
    const over = await report(targets[10].user.id, busy, '10.3.0.1');
    assert.equal(over.status, 429);
    assert.equal(over.body.details?.code ?? over.body.code, 'report_limit');
    // A computer player has no account: nothing to report.
    assert.equal((await report(crypto.randomUUID(), busy, '10.3.0.1')).status, 404);
  } finally {
    server.close();
    await db.pool?.end?.();
  }
});
