'use strict';

// Where new guests stop before their first race (Moses, 9 Nov 2026): the kind of browser at the tap
// (a short class, never the User-Agent or the address), 'error' and 'left' once each before the first
// GO, a log line for refused guest and quick-race requests; and 'login-failed' (an event, never the
// password); the save form's "That email already has an account" (code email_taken).
const test = require('node:test');
const assert = require('node:assert/strict');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
const { browserClass } = require('../src/firstSteps/browser');
const firstSteps = require('../src/firstSteps');

test('the kind of browser: in-app browsers, the usual ones, the app and bots; nothing else kept', () => {
  const ua = {
    tiktok: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_35.1.0 JsSdk/2.0',
    instagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21F90 Instagram 330.0.0.40.92',
    facebook: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21F90 [FBAN/FBIOS;FBAV/470.0]',
    safari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    chromeAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
    webview: 'Mozilla/5.0 (Linux; Android 14; SM-S918B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36',
    desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    headless: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/130.0.0.0 Safari/537.36',
  };
  assert.equal(browserClass(ua.tiktok), 'tiktok/phone');
  assert.equal(browserClass(ua.instagram), 'instagram/phone');
  assert.equal(browserClass(ua.facebook), 'facebook/phone');
  assert.equal(browserClass(ua.safari), 'safari/phone');
  assert.equal(browserClass(ua.chromeAndroid), 'chrome/phone');
  assert.equal(browserClass(ua.webview), 'webview/phone');
  assert.equal(browserClass(ua.desktop), 'chrome/desktop');
  assert.equal(browserClass(ua.headless), 'bot');
  assert.equal(browserClass(ua.webview, { app: true }), 'app/phone');
  assert.equal(browserClass(''), 'unknown');
  for (const v of Object.values(ua)) assert.ok(browserClass(v).length <= 24);
});

test('details are cleaned: no messages or typed text, a known place for left', () => {
  assert.equal(firstSteps.cleanDetail('error', 'quick:409:quick_starting'), 'quick:409:quick_starting');
  assert.equal(firstSteps.cleanDetail('error', 'quick: <b>x</b> 500!'), 'quick:bxb500'); // (the website sends only "<what>:<status>[:<code>]", never a message)
  assert.equal(firstSteps.cleanDetail('error', 'x'.repeat(200)).length, 64);
  assert.equal(firstSteps.cleanDetail('left', 'loading'), 'loading');
  assert.equal(firstSteps.cleanDetail('left', 'somewhere'), 'other');
});

test('a log line for a refused guest or quick-race request: path, status and code only', () => {
  const lines = [];
  const warn = console.warn;
  console.warn = (l) => lines.push(l);
  try {
    for (const [status, code] of [[200, null], [409, 'quick_starting'], [429, null]]) {
      const handlers = {};
      const res = { statusCode: status, locals: code ? { errorCode: code } : {}, on: (e, f) => { handlers[e] = f; } };
      firstSteps.logRefused({ method: 'POST', baseUrl: '/api/rooms/quick', path: '/', ip: '203.0.113.9', headers: { 'user-agent': 'x' } }, res, () => {});
      handlers.finish();
    }
  } finally {
    console.warn = warn;
  }
  assert.deepEqual(lines, ['[first-steps] refused POST /api/rooms/quick 409 quick_starting', '[first-steps] refused POST /api/rooms/quick 429']);
  assert.ok(!lines.join(' ').includes('203.0.113.9'));
});

test('the security event kinds include login-failed; the login records it, never the password', () => {
  const fs = require('node:fs');
  const src = fs.readFileSync(require.resolve('../src/security'), 'utf8');
  assert.match(src, /'login-failed'/);
  const auth = fs.readFileSync(require.resolve('../src/routes/auth'), 'utf8');
  assert.match(auth, /if \(found\) await security\.record\(req, found\.id, 'login-failed'\);/);
  assert.match(auth, /code: 'email_taken'/);
  const schema = fs.readFileSync(require.resolve('../docs/database_schema.sql'), 'utf8');
  assert.match(schema, /ALTER TABLE first_steps ADD COLUMN IF NOT EXISTS browser varchar\(24\);/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS first_step_events/);
});

test('on a real database: the tap keeps the kind of browser; error and left once, before the first GO; login-failed; email_taken', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token, headers = {} } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...headers, ...(token && { authorization: `Bearer ${token}` }) }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  try {
    const tiktok = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_35.1.0';
    const g = (await call('/auth/guest', { method: 'POST', body: { source: 'quick' }, headers: { 'user-agent': tiktok } })).body;
    const { rows: [tap] } = await db.query("SELECT source, browser FROM first_steps WHERE user_id = $1 AND step = 'tap'", [g.user.id]);
    assert.deepEqual(tap, { source: 'quick', browser: 'tiktok/phone' });
    const app = (await call('/auth/guest', { method: 'POST', body: { source: 'solo', app: true }, headers: { 'user-agent': 'Mozilla/5.0 (Linux; Android 14; wv) Mobile' } })).body;
    assert.equal((await db.query("SELECT browser FROM first_steps WHERE user_id = $1 AND step = 'tap'", [app.user.id])).rows[0].browser, 'app/phone');

    // error and left: kept once each, cleaned.
    await call('/users/me/first-step', { method: 'POST', token: g.token, body: { step: 'error', detail: 'quick:409:quick_starting' } });
    await call('/users/me/first-step', { method: 'POST', token: g.token, body: { step: 'error', detail: 'start:500' } });
    await call('/users/me/first-step', { method: 'POST', token: g.token, body: { step: 'left', detail: 'quick-wait', seconds: 7.4 } });
    const { rows: ev } = await db.query('SELECT kind, detail, seconds FROM first_step_events WHERE user_id = $1 ORDER BY kind', [g.user.id]);
    assert.deepEqual(ev, [{ kind: 'error', detail: 'quick:409:quick_starting', seconds: null }, { kind: 'left', detail: 'quick-wait', seconds: 7 }]);

    // After the first GO: nothing more is kept.
    await call('/users/me/first-step', { method: 'POST', token: app.token, body: { step: 'go' } });
    await call('/users/me/first-step', { method: 'POST', token: app.token, body: { step: 'left', detail: 'loading', seconds: 3 } });
    assert.equal((await db.query('SELECT count(*)::int AS n FROM first_step_events WHERE user_id = $1', [app.user.id])).rows[0].n, 0);
    assert.equal((await call('/users/me/first-step', { method: 'POST', token: g.token, body: { step: 'nope' } })).status, 400);

    // A wrong password for an account that exists: login-failed (no password anywhere); unknown accounts: nothing.
    const name = `t_lf_${Date.now() % 1e6}`;
    const me = (await call('/auth/register', { method: 'POST', body: { username: name, email: `${name}@test.invalid`, password: 'rightpassword1', age_group: '18+' } })).body;
    assert.equal((await call('/auth/login', { method: 'POST', body: { login: name, password: 'wrongpassword' } })).status, 401);
    assert.equal((await call('/auth/login', { method: 'POST', body: { login: `${name}_nobody`, password: 'wrongpassword' } })).status, 401);
    const { rows: sec } = await db.query("SELECT kind FROM security_events WHERE user_id = $1 AND kind = 'login-failed'", [me.user.id]);
    assert.equal(sec.length, 1);

    // The same email again (any capitals): email_taken, for the save form's "Log in instead".
    const again = await call('/auth/claim', { method: 'POST', token: g.token, body: { username: `${name}_2`, email: `${name.toUpperCase()}@TEST.INVALID`, password: 'anotherpass1', birth_year: 1990, birth_month: 5 } });
    assert.equal(again.status, 409);
    assert.equal(again.body.details?.code, 'email_taken');
  } finally {
    server.close();
    await db.pool?.end?.();
  }
});
