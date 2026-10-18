'use strict';

// Support messages: the Help Centre's contact form (spam checks, screenshots, linking to the
// player's account, the notification email) and the back office's inbox (statuses, replies, the
// audit log, the player's Messages tab), against a real database when ROOMS_TEST_DATABASE_URL is set.
const test = require('node:test');
const assert = require('node:assert/strict');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
delete process.env.BREVO_API_KEY;
process.env.NODE_ENV = 'test'; // (the contact form's rate limit is 6 an hour otherwise)
process.env.SUPPORT_EMAIL = 'support@test.invalid';
const support = require('../src/support');
const templates = require('../src/email/templates');
const email = require('../src/email');
const totp = require('../src/admin/totp');

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40, 7)]);
const dataUrl = (bytes, type = 'image/png') => `data:${type};base64,${bytes.toString('base64')}`;

test('the form token: too fast is a bot, a forged or old one asks for a fresh form', () => {
  const now = 1_800_000_000_000;
  const token = support.formToken(now);
  assert.equal(support.checkFormToken(token, now + 1_000), 'fast');
  assert.equal(support.checkFormToken(token, now + 60_000), 'ok');
  assert.equal(support.checkFormToken(token, now + support.MAX_FORM_AGE_MS + 1), 'stale');
  assert.equal(support.checkFormToken(`${now - 60_000}.${token.split('.')[1]}`, now), 'stale'); // (time changed, signature not)
  assert.equal(support.checkFormToken('', now), 'stale');
  assert.equal(support.checkFormToken('abc.def', now), 'stale');
});

test('screenshots: known image types by their first bytes, at most 4 MB', () => {
  assert.equal(support.readScreenshot(dataUrl(PNG)).type, 'image/png');
  assert.equal(support.readScreenshot(dataUrl(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2]), 'image/jpeg')).type, 'image/jpeg');
  assert.equal(support.readScreenshot(dataUrl(Buffer.from('RIFF0000WEBPVP8 ', 'latin1'), 'image/webp')).type, 'image/webp');
  assert.throws(() => support.readScreenshot(dataUrl(Buffer.from('<svg onload=alert(1)>'), 'image/png')), /PNG, JPEG, WebP or GIF/);
  assert.throws(() => support.readScreenshot('https://example.com/x.png'), /could not be read/);
  assert.throws(() => support.readScreenshot(dataUrl(Buffer.concat([PNG, Buffer.alloc(4 * 1048576)]))), /too big/);
});

test('the emails escape what players type', () => {
  const n = templates.supportNotification({ ref: 'S-1001', name: '<b>Ann</b>', email: 'a@b.c', category: 'Refunds', order_no: 'MS-1', message: 'Hi <script>\n\nline 2', account: '@ann', linkedBy: 'email', hasScreenshot: true, link: 'https://marblespins.com/admin/support/x' });
  assert.equal(n.subject, '[S-1001] Refunds: <b>Ann</b>'); // (subjects are plain text)
  assert.equal(templates.supportNotification({ ref: 'S-1', name: 'A\r\nBcc: x@y.z', email: 'a@b.c', category: 'Coins', message: 'm', link: 'l' }).subject, '[S-1] Coins: A Bcc: x@y.z');
  assert.match(n.html, /&lt;b&gt;Ann&lt;\/b&gt;/);
  assert.match(n.html, /Hi &lt;script&gt;/);
  assert.match(n.html, /matched by the email typed/);
  assert.match(n.html, /admin\/support\/x/);
  const r = templates.supportReply({ name: 'Ann', ref: 'S-1001', body: 'Sorted <3', original: 'help' });
  assert.match(r.subject, /S-1001/);
  assert.match(r.html, /Sorted &lt;3/);
});

test('the contact form and the support inbox on a real database', { skip: !DB }, async () => {
  // (The test database is brought up to date before the test files start: test/helpers/migrateTestDb.js.)
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const security = require('../src/security');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: body ? JSON.stringify(body) : undefined });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not JSON */ }
    return { status: res.status, body: json, raw: text, type: res.headers.get('content-type') };
  };
  const sent = [];
  email.setTransport(async (m) => { sent.push(m); return { messageId: `m${sent.length}` }; });
  const oldToken = support.formToken(Date.now() - 10_000); // (a form opened 10 s ago)
  try {
    const name = `t_sup_${Date.now() % 1e6}`;
    const tag = `run-${Math.random().toString(36).slice(2, 8)}`;
    const player = (await call('/auth/register', { method: 'POST', body: { username: name, email: `${name}@test.invalid`, password: 'password123', age_group: '18+' } })).body;
    const guest = (await call('/auth/guest', { method: 'POST' })).body;
    const form = (await call('/support/form')).body;
    assert.ok(form.token && form.categories.includes('Refunds') && form.limits.screenshotBytes === 4194304);

    const msg = (extra = {}) => ({ token: oldToken, name: 'Ann Player', email: `${name}@test.invalid`, category: 'Buying coins', order_no: 'MS-1001', message: 'My coins did not arrive after paying.', ...extra });

    // Checks: a fresh form is too fast (a bot: looks fine, nothing saved); the honeypot; bad fields.
    // (Counted for this test's address only, and "too fast" made with a form time a minute ahead: on a
    // busy machine, with every test file running at once, the form fetched above may already be over
    // 3 s old by the time it is sent, and the bot check would then rightly let it through.)
    const mineCount = async () => Number((await db.query('SELECT COUNT(*) FROM support_messages WHERE lower(email) = lower($1)', [`${name}@test.invalid`])).rows[0].count);
    const before = await mineCount();
    const fresh = support.formToken(Date.now() + 60_000);
    assert.deepEqual((await call('/support', { method: 'POST', body: msg({ token: fresh, message: 'Bot message number one.' }) })).body, { ref: null });
    assert.deepEqual((await call('/support', { method: 'POST', body: msg({ website: 'http://spam', message: 'Bot message number two.' }) })).body, { ref: null });
    assert.equal(await mineCount(), before);
    assert.equal((await call('/support', { method: 'POST', body: msg({ token: 'nope' }) })).body.details.token, 'expired');
    assert.equal((await call('/support', { method: 'POST', body: msg({ category: 'Bananas' }) })).status, 400);
    assert.equal((await call('/support', { method: 'POST', body: msg({ message: 'short' }) })).status, 400);
    assert.match((await call('/support', { method: 'POST', body: msg({ screenshot: dataUrl(Buffer.from('not an image')) }) })).body.error, /PNG, JPEG/);

    // Not logged in: matched on the email typed (Brevo on: the support address is told).
    const a = await call('/support', { method: 'POST', body: msg({ screenshot: dataUrl(PNG), email: `${name.toUpperCase()}@TEST.invalid` }) });
    assert.equal(a.status, 201);
    assert.match(a.body.ref, /^S-\d{4,}$/);
    const note = sent.at(-1);
    assert.equal(note.to[0].email, 'support@test.invalid');
    assert.equal(note.replyTo.email, `${name}@test.invalid`);
    assert.match(note.subject, new RegExp(`\\[${a.body.ref}\\] Buying coins: Ann Player`));
    assert.match(note.htmlContent, /matched by the email typed/);
    // The same message again within 10 minutes: the same reference, kept once.
    assert.equal((await call('/support', { method: 'POST', body: msg() })).body.ref, a.body.ref);
    // Logged in (a guest too): linked to the account, whatever email is typed.
    const g = await call('/support', { method: 'POST', token: guest.token, body: msg({ email: 'someone.else@test.invalid', category: 'Technical help', order_no: undefined, message: `The game is slow on my phone (${tag}).` }) });
    const p = await call('/support', { method: 'POST', token: player.token, body: msg({ category: 'Refunds', message: 'Please refund my last pack.' }) });
    // No account at all.
    const x = await call('/support', { method: 'POST', body: msg({ email: 'nobody@test.invalid', category: 'Something else', message: 'Just saying hello to the team.' }) });
    const rows = (await db.query('SELECT ref, user_id, linked_by, status, screenshot_type, ip IS NOT NULL AS has_ip FROM support_messages WHERE ref = ANY($1) ORDER BY ref', [[a.body.ref, g.body.ref, p.body.ref, x.body.ref]])).rows;
    const byRef = Object.fromEntries(rows.map((r) => [r.ref, r]));
    assert.deepEqual([byRef[a.body.ref].user_id, byRef[a.body.ref].linked_by, byRef[a.body.ref].screenshot_type], [player.user.id, 'email', 'image/png']);
    assert.deepEqual([byRef[g.body.ref].user_id, byRef[g.body.ref].linked_by], [guest.user.id, 'login']);
    assert.deepEqual([byRef[p.body.ref].user_id, byRef[p.body.ref].linked_by], [player.user.id, 'login']);
    assert.deepEqual([byRef[x.body.ref].user_id, byRef[x.body.ref].linked_by], [null, null]);
    assert.ok(rows.every((r) => r.status === 'new' && r.has_ip));

    // The back office: only for admins with the 2-step login.
    assert.equal((await call('/admin/support', { token: player.token })).status, 401);
    const adminName = `${name}a`;
    const admin = (await call('/auth/register', { method: 'POST', body: { username: adminName, email: `${adminName}@test.invalid`, password: 'password123', age_group: '18+' } })).body;
    await db.query(`UPDATE users SET role = 'admin' WHERE id = $1`, [admin.user.id]);
    const setup = (await call('/admin/session/start', { method: 'POST', token: admin.token })).body.setup;
    const { token } = (await call('/admin/session/verify', { method: 'POST', token: admin.token, body: { code: totp.codeAt(setup.secret, totp.stepNow()) } })).body;

    const list = (await call(`/admin/support?q=${encodeURIComponent(name)}`, { token })).body;
    assert.deepEqual(list.messages.map((m) => m.ref).sort(), [a.body.ref, p.body.ref].sort()); // (the guest typed another email; x has no account)
    assert.ok(list.messages.every((m) => !('screenshot' in m)));
    assert.equal(list.messages.find((m) => m.ref === a.body.ref).has_screenshot, true);
    assert.equal(list.messages.find((m) => m.ref === a.body.ref).player, name);
    assert.ok(list.counts.new >= 3);
    assert.deepEqual((await call(`/admin/support?q=${encodeURIComponent(name)}&category=Refunds`, { token })).body.messages.map((m) => m.ref), [p.body.ref]);
    assert.deepEqual((await call(`/admin/support?q=${encodeURIComponent(`slow on my phone (${tag})`)}`, { token })).body.messages.map((m) => m.ref), [g.body.ref]);
    assert.deepEqual((await call(`/admin/support?q=${encodeURIComponent(a.body.ref)}`, { token })).body.messages.map((m) => m.ref), [a.body.ref]);

    const aid = list.messages.find((m) => m.ref === a.body.ref).id;
    const shot = await call(`/admin/support/${aid}/screenshot`, { token });
    assert.equal(shot.status, 200);
    assert.equal(shot.type, 'image/png');
    assert.equal((await call(`/admin/support/${aid}/screenshot`)).status, 401);

    // Status: New → Open → Done, each in the audit log; a bad status is refused.
    assert.equal((await call(`/admin/support/${aid}/status`, { method: 'POST', token, body: { status: 'closed' } })).status, 400);
    assert.equal((await call(`/admin/support/${aid}/status`, { method: 'POST', token, body: { status: 'open' } })).body.message.status, 'open');
    // A reply: saved, emailed to the player (reply-to: the support address), in the audit log.
    const rep = (await call(`/admin/support/${aid}/reply`, { method: 'POST', token, body: { text: 'Your coins are there now. Sorry for the wait!' } })).body;
    assert.equal(rep.emailed, true);
    assert.equal(sent.at(-1).to[0].email, `${name}@test.invalid`);
    assert.equal(sent.at(-1).replyTo.email, 'support@test.invalid');
    assert.match(sent.at(-1).subject, new RegExp(a.body.ref));
    assert.equal((await call(`/admin/support/${aid}/status`, { method: 'POST', token, body: { status: 'done', reason: 'Coins credited' } })).body.message.status, 'done');
    const detail = (await call(`/admin/support/${aid}`, { token })).body;
    assert.equal(detail.message.status, 'done');
    assert.equal(detail.message.linked_by, 'email');
    assert.equal(detail.replies.length, 1);
    assert.equal(detail.replies[0].admin, adminName);
    assert.deepEqual(detail.audit.map((e) => e.action), ['support-status', 'support-reply', 'support-status']);
    assert.deepEqual(detail.audit.map((e) => e.details.to ?? null), ['done', null, 'open']);
    assert.equal(detail.audit[0].details.from, 'open');

    // The player's profile: a Messages tab with all their messages (linked or sent from their email).
    const prof = (await call(`/admin/players/${player.user.id}`, { token })).body;
    assert.deepEqual(prof.messages.map((m) => m.ref).sort(), [a.body.ref, p.body.ref].sort());
    assert.ok(prof.audit.some((e) => e.action === 'support-reply'));
    // A message sent from the player's email before it was linked shows too.
    await db.query('UPDATE support_messages SET user_id = NULL, linked_by = NULL WHERE ref = $1', [p.body.ref]);
    assert.equal((await call(`/admin/players/${player.user.id}`, { token })).body.messages.length, 2);

    // Download my data includes them; IPs are trimmed after 90 days; deleting the account deletes them.
    const mine = (await call('/users/me/export', { token: player.token })).body;
    assert.ok(mine.supportMessages.some((m) => m.ref === a.body.ref && m.replies.length === 1 && m.screenshot_attached === true));
    await db.query(`UPDATE support_messages SET created_at = now() - interval '91 days', country = 'SE' WHERE ref = $1`, [x.body.ref]);
    await security.trimIps();
    assert.equal((await db.query('SELECT ip, country FROM support_messages WHERE ref = $1', [x.body.ref])).rows[0].ip, null);
    assert.equal((await call('/users/me', { method: 'DELETE', token: player.token, body: { confirm: 'DELETE', password: 'password123' } })).status < 300, true);
    assert.equal(Number((await db.query('SELECT COUNT(*) FROM support_messages WHERE ref = ANY($1)', [[a.body.ref, p.body.ref]])).rows[0].count), 0);
    assert.equal(Number((await db.query('SELECT COUNT(*) FROM support_messages WHERE ref = $1', [x.body.ref])).rows[0].count), 1);
  } finally {
    email.setTransport(null);
    server.close();
    await db.pool.end();
  }
});
