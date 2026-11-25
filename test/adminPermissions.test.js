'use strict';

// Back-office roles (Moses, 16 Nov 2026, CRM phase 2): every endpoint names its permission; the role matrix;
// against a real database (ROOMS_TEST_DATABASE_URL), a support admin refused a refund and an owner managing admins.
const test = require('node:test');
const assert = require('node:assert/strict');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
const perms = require('../src/admin/permissions');
const totp = require('../src/admin/totp');

test('every back-office endpoint names the permission it needs', () => {
  const router = require('../src/routes/admin');
  const routes = router.stack.filter((l) => l.route);
  assert.ok(routes.length > 30);
  const missing = routes
    .filter((l) => !l.route.stack.some((h) => h.handle.permission))
    .map((l) => `${Object.keys(l.route.methods).join(',').toUpperCase()} ${l.route.path}`);
  assert.deepEqual(missing, []);
  for (const l of routes) for (const h of l.route.stack) if (h.handle.permission) assert.ok(perms.PERMISSIONS[h.handle.permission], h.handle.permission);
});

test('the role matrix', () => {
  const as = (admin_role) => ({ admin_role });
  assert.equal(perms.roleOf(as(null)), 'read-only');
  assert.equal(perms.roleOf(as('nonsense')), 'read-only');
  for (const p of Object.keys(perms.PERMISSIONS)) assert.ok(perms.can(as('owner'), p), `owner: ${p}`);
  assert.deepEqual(perms.permissionsOf(as(null)), ['reports:read']);
  assert.ok(perms.can(as('finance'), 'payments:refund') && perms.can(as('finance'), 'billing:export'));
  assert.ok(!perms.can(as('finance'), 'customers:edit') && !perms.can(as('finance'), 'coins:adjust'));
  assert.ok(perms.can(as('support'), 'support:answer') && perms.can(as('support'), 'customers:edit'));
  assert.ok(!perms.can(as('support'), 'payments:refund') && !perms.can(as('support'), 'billing:read') && !perms.can(as('support'), 'emails:read'));
  assert.deepEqual(perms.permissionsOf(as('marketing')), ['reports:read', 'gift-codes:read', 'emails:templates', 'marketing:read']);
  for (const r of ['finance', 'support', 'marketing', 'read-only']) assert.ok(!perms.can(as(r), 'admins:manage') && !perms.can(as(r), 'audit:read'));
  assert.throws(() => perms.need('no:such'));
  assert.throws(() => perms.can(as('owner'), 'no:such'));
});

test('roles on a real database: 403s by role; owners manage admins, never themselves', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: body ? JSON.stringify(body) : undefined });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* CSV */ }
    return { status: res.status, body: json, text };
  };
  const tag = `t_rol_${Date.now() % 1e6}`;
  const register = async (n) => (await call('/auth/register', { method: 'POST', body: { username: n, email: `${n}@test.invalid`, password: 'password123', age_group: '18+' } })).body;
  const backOffice = async (acc, role) => {
    await db.query(`UPDATE users SET role = 'admin', admin_role = $2 WHERE id = $1`, [acc.user.id, role]);
    const setup = (await call('/admin/session/start', { method: 'POST', token: acc.token })).body.setup;
    const r = (await call('/admin/session/verify', { method: 'POST', token: acc.token, body: { code: totp.codeAt(setup.secret, totp.stepNow()) } })).body;
    return r;
  };
  try {
    const ownerAcc = await register(`${tag}o`);
    const supportAcc = await register(`${tag}s`);
    const newcomer = await register(`${tag}n`);
    const owner = await backOffice(ownerAcc, 'owner');
    const support = await backOffice(supportAcc, 'support');
    assert.equal(owner.user.role, 'owner');
    assert.equal(support.user.role, 'support');
    assert.ok(support.user.permissions.includes('support:answer'));
    assert.ok(!support.user.permissions.includes('payments:refund'));

    const fakeId = '00000000-0000-4000-8000-000000000000';
    // Support: customers yes; refunds, billing, coins, admins and the audit log no.
    assert.equal((await call('/admin/players', { token: support.token })).status, 200);
    const refused = await call(`/admin/payments/${fakeId}/refund`, { method: 'POST', token: support.token, body: { reason: 'Customer asked' } });
    assert.equal(refused.status, 403);
    assert.match(refused.body.error ?? refused.text, /support/);
    for (const p of ['/admin/billing/documents', '/admin/billing/summary', '/admin/admins', '/admin/audit']) assert.equal((await call(p, { token: support.token })).status, 403, p);
    assert.equal((await call(`/admin/players/${newcomer.user.id}/coins`, { method: 'POST', token: support.token, body: { amount: 5, reason: 'Not allowed' } })).status, 403);

    // Owner: billing (empty month is fine), the export needs a reason and is audited.
    assert.equal((await call('/admin/billing/summary?month=2020-01', { token: owner.token })).status, 200);
    assert.equal((await call('/admin/billing/documents?kind=receipt&month=2020-01', { token: owner.token })).body.documents.length, 0);
    assert.equal((await call('/admin/billing/export?month=2020-01', { token: owner.token })).status, 400);
    const csv = await call('/admin/billing/export?month=2020-01&file=vat&reason=Accountant%20test', { token: owner.token });
    assert.equal(csv.status, 200);
    assert.ok(csv.text.length > 0);
    assert.equal((await call('/admin/billing/documents/K-2020-99999', { token: owner.token })).status, 404);

    // Owner manages admins.
    const listed = (await call('/admin/admins', { token: owner.token })).body;
    assert.ok(listed.admins.some((a) => a.id === supportAcc.user.id && a.role === 'support'));
    assert.equal((await call('/admin/admins', { method: 'POST', token: owner.token, body: { login: `${tag}n`, role: 'finance' } })).status, 400); // no reason
    assert.equal((await call('/admin/admins', { method: 'POST', token: owner.token, body: { login: `${tag}n`, role: 'boss', reason: 'New staff' } })).status, 400);
    const added = await call('/admin/admins', { method: 'POST', token: owner.token, body: { login: `${tag}n@test.invalid`, role: 'finance', reason: 'New staff' } });
    assert.equal(added.status, 200);
    assert.equal(added.body.admin.role, 'finance');
    assert.equal((await call('/admin/admins', { method: 'POST', token: owner.token, body: { login: `${tag}n`, role: 'finance', reason: 'Again please' } })).status, 409);
    assert.equal((await call(`/admin/admins/${supportAcc.user.id}/role`, { method: 'POST', token: owner.token, body: { role: 'marketing', reason: 'Moved team' } })).status, 200);
    // The support admin's live session now has marketing's rights.
    assert.equal((await call('/admin/players', { token: support.token })).status, 403);
    assert.equal((await call('/admin/gift-codes', { token: support.token })).status === 403, false);

    // Never yourself (so the back office keeps an owner; a second check refuses removing the last one).
    assert.equal((await call(`/admin/admins/${ownerAcc.user.id}/role`, { method: 'POST', token: owner.token, body: { role: 'finance', reason: 'Step down' } })).status, 409);
    assert.equal((await call(`/admin/admins/${ownerAcc.user.id}/remove`, { method: 'POST', token: owner.token, body: { reason: 'Leaving now' } })).status, 409);

    // Removed: back to a player, the back-office session ends at once.
    assert.equal((await call(`/admin/admins/${supportAcc.user.id}/remove`, { method: 'POST', token: owner.token, body: { reason: 'Left the company' } })).status, 200);
    assert.equal((await call('/admin/gift-codes', { token: support.token })).status, 401);
    const { rows: [u] } = await db.query('SELECT role, admin_role FROM users WHERE id = $1', [supportAcc.user.id]);
    assert.deepEqual({ ...u }, { role: 'player', admin_role: null });

    const { rows: trail } = await db.query(
      `SELECT action, details FROM admin_audit WHERE admin_id = $1 AND action IN ('admin-add', 'admin-role', 'admin-remove', 'billing-export') ORDER BY created_at, id`,
      [ownerAcc.user.id],
    );
    assert.deepEqual(trail.map((t) => t.action), ['billing-export', 'admin-add', 'admin-role', 'admin-remove']);
    assert.deepEqual(trail[2].details, { from: 'support', to: 'marketing' });
  } finally {
    server.close();
    await db.pool?.end?.();
  }
});
