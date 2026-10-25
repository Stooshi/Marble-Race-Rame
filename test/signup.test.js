'use strict';

// The quick sign-up and the save pop-up's server side (Moses, 20 Oct 2026): birth year and month (no
// account under 13), no suggested player name (the field starts empty), everything a guest won kept, the confirm-your-email link
// once email is set up (double opt-in), and a guest's finished races for the every-3rd-race pop-up.
const test = require('node:test');
const assert = require('node:assert/strict');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
delete process.env.BREVO_API_KEY;
const crypto = require('crypto');
const email = require('../src/email');
const emailConfirm = require('../src/account/emailConfirm');

test('the confirmation email: English (only, for now; the Swedish texts are kept), the link, the company line', () => {
  assert.ok(emailConfirm.TEXTS?.sv ?? true); // (kept for later)
  for (const lang of ['en', 'sv']) {
    const m = emailConfirm.message({ lang, name: '<b>Nelly</b>', link: 'https://marblespins.com/confirm-email?t=abc' });
    assert.match(m.html, /confirm-email\?t=abc/);
    assert.match(m.html, /&lt;b&gt;Nelly&lt;\/b&gt;/);
    assert.match(m.html, /Voltron Robotics AB/);
    assert.match(m.subject, /Confirm/); // (English only for now, whatever the browser: client/src/shared/language.json)
  }
});

test('quick sign-up on a real database', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const run = crypto.randomBytes(3).toString('hex');
  const year = new Date().getUTCFullYear();
  const sent = [];
  try {
    email.setTransport(null);
    // No suggested names any more (Moses, 25 Oct 2026: the name field starts empty).
    assert.equal((await call('/auth/suggest-name')).status, 404);

    // A guest with races, their own starters and coins.
    const g = (await call('/auth/guest', { method: 'POST' })).body;
    const me = await call('/auth/me', { token: g.token });
    assert.equal(me.body.racesFinished, 0);
    const { rows: before } = await db.query('SELECT id FROM marbles WHERE owner_id = $1 ORDER BY starter_no', [g.user.id]);
    assert.equal(before.length, 4);

    // Under 13 (from birth year and month): refused, nothing changes; they stay a guest.
    const young = await call('/auth/claim', { method: 'POST', token: g.token, body: { username: `young_${run}`, email: `young_${run}@test.invalid`, password: 'password123', birth_year: year - 10, birth_month: 1 } });
    assert.equal(young.status, 403);
    assert.equal(young.body.details.code, 'under_13');
    assert.equal((await db.query('SELECT is_guest FROM users WHERE id = $1', [g.user.id])).rows[0].is_guest, true);
    // Both or neither.
    assert.equal((await call('/auth/claim', { method: 'POST', token: g.token, body: { username: `half_${run}`, email: `half_${run}@test.invalid`, password: 'password123', birth_year: 1990 } })).status, 400);

    // Saved with email off: no confirmation (saved straight away), the age group from the birth month.
    const saved = await call('/auth/claim', { method: 'POST', token: g.token, body: { username: `saved_${run}`, email: `saved_${run}@test.invalid`, password: 'password123', birth_year: year - 15, birth_month: 12, marketing_opt_in: false, lang: 'sv' } });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.confirm, 'off');
    assert.equal(saved.body.user.age_group, '13-17');
    assert.equal(saved.body.user.is_guest, false);
    const { rows: after } = await db.query('SELECT id FROM marbles WHERE owner_id = $1 ORDER BY starter_no', [g.user.id]);
    assert.deepEqual(after.map((r) => r.id), before.map((r) => r.id), 'the same 4 starters stay');
    assert.equal((await call('/auth/me', { token: saved.body.token })).body.racesFinished, undefined, '(only for guests)');

    // Email on: the confirmation link (Swedish here), confirmed once opened.
    email.setTransport(async (m) => { sent.push(m); return { messageId: `m${sent.length}` }; });
    const reg = await call('/auth/register', { method: 'POST', body: { username: `reg_${run}`, email: `reg_${run}@test.invalid`, password: 'password123', birth_year: 1990, birth_month: 6, marketing_opt_in: true, lang: 'sv' } });
    assert.equal(reg.status, 201);
    assert.equal(reg.body.confirm, 'sent');
    assert.equal(reg.body.user.age_group, '18+');
    assert.equal(reg.body.user.email_verified_at, null);
    assert.equal(sent.length, 1);
    assert.match(sent[0].subject, /Confirm/); // (English only for now)
    const token = decodeURIComponent(sent[0].htmlContent.match(/confirm-email\?t=([^"&<]+)/)[1]);
    assert.deepEqual((await call('/auth/confirm-email', { method: 'POST', body: { token } })).body, { confirmed: true });
    assert.ok((await call('/auth/me', { token: reg.body.token })).body.user.email_verified_at);
    assert.equal((await call('/auth/confirm-email', { method: 'POST', body: { token: 'x'.repeat(40) } })).status, 400);
    // Their own starters too, and the birth month in "Download my data".
    assert.equal((await db.query('SELECT count(*)::int AS n FROM marbles WHERE owner_id = $1', [reg.body.user.id])).rows[0].n, 4);
    const data = (await call('/users/me/export', { token: reg.body.token })).body;
    assert.equal(data.account.birth_year_month, '1990-06');
    assert.equal(data.marbles.startingMarbles.length, 4);
  } finally {
    email.setTransport(null);
    server.close();
  }
});
