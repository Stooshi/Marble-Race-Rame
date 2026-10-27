'use strict';

// Every call the website and the apps make has its route on the server (Moses, 27 Oct 2026: saving a
// guest's marble in the app answered "Route POST /api/auth/claim not found"). Reads each call from
// client/src/api/client.js (and billboards.js), with its method, and sends it to the server built
// here: whatever it answers (401 without a login, 400 without a body, 404 for a thing that isn't
// there), it must never be the server's own "Route … not found". No database needed.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost:1/unused';

const UUID = '00000000-0000-4000-8000-000000000000';

/** Every `request('/path', { method })` in a client file → [{ name, method, path }]. */
function callsIn(file) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'client', 'src', 'api', file), 'utf8');
  const out = [];
  const re = /(\w+):\s*\([^)]*\)\s*=>\s*request\(\s*([`'])(\/[^`']*)\2\s*(?:,\s*\{([^}]*)\})?/g;
  for (const m of src.matchAll(re)) {
    const method = /method:\s*'([A-Z]+)'/.exec(m[4] ?? '')?.[1] ?? 'GET';
    // (A ${…} part of the address: a uuid, which every id and code route accepts or refuses on its own.)
    const p = m[3].replace(/\$\{[^}]*\}/g, UUID);
    out.push({ name: m[1], method, path: p });
  }
  return out;
}

const calls = callsIn('client.js');

test('the client calls are all read (a change in how they are written shows here)', () => {
  assert.ok(calls.length >= 90, `${calls.length} calls`);
  for (const name of ['register', 'login', 'me', 'guest', 'claim', 'confirmEmail', 'resendConfirmEmail', 'forgotPassword', 'resetPassword', 'passwordResetEnabled']) {
    assert.ok(calls.some((c) => c.name === name), `${name} is read`);
  }
  assert.deepEqual(calls.find((c) => c.name === 'claim'), { name: 'claim', method: 'POST', path: '/auth/claim' });
});

test('every call the website and the apps make has its route on the server', async () => {
  const { createApp } = require('../src/app');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const missing = [];
  try {
    for (const c of [...calls, { name: 'billboards', method: 'GET', path: '/billboards?track=x' }]) {
      const res = await fetch(base + c.path, {
        method: c.method,
        headers: { 'content-type': 'application/json' },
        body: ['GET', 'HEAD'].includes(c.method) ? undefined : '{}',
      });
      const body = await res.json().catch(() => null);
      if (res.status === 404 && /^Route [A-Z]+ \S+ not found$/.test(body?.error ?? '')) missing.push(`${c.name}: ${c.method} /api${c.path}`);
    }
  } finally {
    server.close();
    await require('../src/db').pool?.end?.().catch?.(() => {});
  }
  assert.deepEqual(missing, [], `calls without a route on the server:\n${missing.join('\n')}`);
});

test('saving a guest, signing up, logging in, the email link and the password reset: the routes and their checks', async () => {
  const { createApp } = require('../src/app');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const post = async (p, body, token) => {
    const res = await fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: JSON.stringify(body ?? {}) });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  try {
    // Saving a guest needs the guest's own login: without one, 401 (the route is there).
    const claim = await post('/auth/claim', { username: 'someone', email: 'a@b.invalid', password: 'password123' });
    assert.equal(claim.status, 401);
    assert.equal(claim.body.error, 'Invalid or missing token');
    // Sign-up, login, the password reset and the email link check what they're sent before anything else.
    for (const p of ['/auth/register', '/auth/login', '/auth/forgot', '/auth/reset', '/auth/confirm-email']) {
      const r = await post(p, {});
      assert.ok([400, 401, 404, 409, 422].includes(r.status) || r.status === 500, `${p}: ${r.status} ${JSON.stringify(r.body)}`);
      assert.doesNotMatch(r.body?.error ?? '', /^Route /, p);
    }
    assert.equal((await post('/auth/confirm-email/resend', { lang: 'en' })).status, 401);
  } finally {
    server.close();
  }
});
