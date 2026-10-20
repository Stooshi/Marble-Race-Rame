'use strict';

// "Forgot your password?": off until Brevo's key is set; a one-time emailed link, valid 60 minutes;
// the answer never reveals whether an account exists; a reset ends every older login.
const test = require('node:test');
const assert = require('node:assert/strict');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
delete process.env.BREVO_API_KEY;
const email = require('../src/email');
const templates = require('../src/email/templates');

test('email is off without BREVO_API_KEY; the reset email escapes the name and carries the link', async () => {
  email.setTransport(null);
  assert.equal(email.enabled(), false);
  await assert.rejects(email.send({ to: 'a@b.c', subject: 's', html: 'h' }), /BREVO_API_KEY/);
  const m = templates.passwordReset({ username: '<b>x</b>', link: 'https://marblespins.com/reset-password?token=abc', minutes: 60 });
  assert.match(m.html, /&lt;b&gt;x&lt;\/b&gt;/);
  assert.match(m.html, /reset-password\?token=abc/);
  assert.match(m.html, /60 minutes/);
});

test('the reset flow on a real database', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token, headers = {} } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...headers, ...(token && { authorization: `Bearer ${token}` }) }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const sent = [];
  try {
    // Off: the page hides the link and the server refuses.
    email.setTransport(null);
    assert.equal((await call('/auth/password-reset')).body.enabled, false);
    assert.equal((await call('/auth/forgot', { method: 'POST', body: { email: 'x@test.invalid' } })).status, 503);

    email.setTransport(async (m) => { sent.push(m); return { messageId: `m${sent.length}` }; });
    assert.equal((await call('/auth/password-reset')).body.enabled, true);
    const name = `t_pw_${Date.now() % 1e6}`;
    const me = (await call('/auth/register', { method: 'POST', body: { username: name, email: `${name}@test.invalid`, password: 'oldpassword1', age_group: '18+' } })).body;
    assert.match(sent.splice(0)[0]?.subject ?? '', /Confirm your email/); // (the sign-up's confirmation email, since 20 Oct 2026)

    // Unknown address: the same answer, no email.
    const unknown = await call('/auth/forgot', { method: 'POST', body: { email: `nobody_${name}@test.invalid` } });
    assert.deepEqual([unknown.status, unknown.body.ok, sent.length], [200, true, 0]);

    // Known address (any capitals): one email, to the player, with a link to the site they asked from.
    assert.equal((await call('/auth/forgot', { method: 'POST', body: { email: `${name.toUpperCase()}@TEST.INVALID` }, headers: { origin: 'https://www.marblespins.com' } })).status, 200);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to[0].email, `${name}@test.invalid`);
    assert.equal(sent[0].sender.email, 'no-reply@marblespins.com');
    const token = sent[0].htmlContent.match(/reset-password\?token=([\w-]+)/)[1];
    assert.match(sent[0].htmlContent, /https:\/\/www\.marblespins\.com\/reset-password\?token=/);
    const { rows: stored } = await db.query('SELECT token_hash FROM password_resets WHERE user_id = $1', [me.user.id]);
    assert.ok(!stored.some((r) => r.token_hash.includes(token))); // (only a hash is kept)

    // Bad links and short passwords are refused; the old login still works until the reset.
    assert.equal((await call('/auth/reset', { method: 'POST', body: { token: 'x'.repeat(43), password: 'newpassword1' } })).status, 400);
    assert.equal((await call('/auth/reset', { method: 'POST', body: { token, password: 'short' } })).status, 400);
    assert.equal((await call('/auth/me', { token: me.token })).status, 200);

    await new Promise((r) => setTimeout(r, 1100)); // (the old login is from an earlier second than the reset)
    const done = await call('/auth/reset', { method: 'POST', body: { token, password: 'newpassword1' } });
    assert.equal(done.status, 200);
    assert.ok(done.body.token);
    assert.equal((await call('/auth/me', { token: done.body.token })).status, 200);
    assert.equal((await call('/auth/me', { token: me.token })).status, 401); // (older logins end)
    assert.equal((await call('/auth/login', { method: 'POST', body: { login: name, password: 'oldpassword1' } })).status, 401);
    assert.equal((await call('/auth/login', { method: 'POST', body: { login: name, password: 'newpassword1' } })).status, 200);
    assert.equal((await call('/auth/reset', { method: 'POST', body: { token, password: 'another12' } })).status, 400); // (once only)

    // A newer link replaces an older one; expired links fail; at most 3 emails an hour.
    await call('/auth/forgot', { method: 'POST', body: { email: `${name}@test.invalid` } });
    const first = sent.at(-1).htmlContent.match(/token=([\w-]+)/)[1];
    await call('/auth/forgot', { method: 'POST', body: { email: `${name}@test.invalid` } });
    const second = sent.at(-1).htmlContent.match(/token=([\w-]+)/)[1];
    assert.equal((await call('/auth/reset', { method: 'POST', body: { token: first, password: 'another12' } })).status, 400);
    await db.query(`UPDATE password_resets SET expires_at = now() - interval '1 minute' WHERE user_id = $1`, [me.user.id]);
    assert.equal((await call('/auth/reset', { method: 'POST', body: { token: second, password: 'another12' } })).status, 400);
    const before = sent.length;
    await call('/auth/forgot', { method: 'POST', body: { email: `${name}@test.invalid` } });
    assert.equal(sent.length, before); // (3 in the last hour already)

    // Guests have no email to reset.
    const guest = (await call('/auth/guest', { method: 'POST', body: {} })).body;
    const { rows: [g] } = await db.query('SELECT email FROM users WHERE id = $1', [guest.user.id]);
    await call('/auth/forgot', { method: 'POST', body: { email: g.email } });
    assert.equal(sent.length, before);
  } finally {
    email.setTransport(null);
    server.close();
    await db.pool?.end?.();
  }
});
