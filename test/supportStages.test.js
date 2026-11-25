'use strict';

// Support's four stages, assignment, saved replies and the 14-day close (Moses, 16 Nov 2026, CRM phase 4). Against a
// real database (ROOMS_TEST_DATABASE_URL).
const test = require('node:test');
const assert = require('node:assert/strict');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
const support = require('../src/support');
const totp = require('../src/admin/totp');

test('the stages and the old status in step', () => {
  assert.deepEqual(support.STAGES, ['new', 'open', 'answered', 'closed']);
  assert.deepEqual(support.STATUS_OF, { new: 'new', open: 'open', answered: 'open', closed: 'done' });
  assert.equal(support.AUTO_CLOSE_DAYS, 14);
});

test('stages, views, assignment, saved replies, the 14-day close', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  try {
    const tag = `t_sup_${Date.now() % 1e6}`;
    const reg = (await call('/auth/register', { method: 'POST', body: { username: tag, email: `${tag}@test.invalid`, password: 'password123', age_group: '18+' } })).body;
    await db.query(`UPDATE users SET role = 'admin', admin_role = 'support' WHERE id = $1`, [reg.user.id]);
    const setup = (await call('/admin/session/start', { method: 'POST', token: reg.token })).body.setup;
    const { token } = (await call('/admin/session/verify', { method: 'POST', token: reg.token, body: { code: totp.codeAt(setup.secret, totp.stepNow()) } })).body;
    const cat = require('../client/src/shared/support.json').categories[0];
    const { rows: [m] } = await db.query(
      `INSERT INTO support_messages (ref, name, email, category, message, stage, stage_at) VALUES ('S-' || nextval('support_message_seq'), 'Ada', $1, $2, 'Where are my coins please', 'new', now()) RETURNING id, ref`,
      [`${tag}x@test.invalid`, cat],
    );
    // Assign to me: in "Mine"; a player can't be assigned.
    assert.equal((await call(`/admin/support/${m.id}/assign`, { method: 'POST', token, body: { adminId: reg.user.id } })).body.message.assigned, tag);
    assert.ok((await call('/admin/support?view=mine', { token })).body.messages.some((x) => x.id === m.id));
    const plain = (await call('/auth/register', { method: 'POST', body: { username: `${tag}p`, email: `${tag}p@test.invalid`, password: 'password123', age_group: '18+' } })).body;
    assert.equal((await call(`/admin/support/${m.id}/assign`, { method: 'POST', token, body: { adminId: plain.user.id } })).status, 400);
    // Stages: Answered is "waiting on player"; Closed; each audited.
    assert.equal((await call(`/admin/support/${m.id}/stage`, { method: 'POST', token, body: { stage: 'answered' } })).body.message.stage, 'answered');
    assert.ok((await call('/admin/support?view=waiting-player', { token })).body.messages.some((x) => x.id === m.id));
    assert.ok(!(await call('/admin/support?view=waiting-us', { token })).body.messages.some((x) => x.id === m.id));
    assert.equal((await call(`/admin/support/${m.id}/stage`, { method: 'POST', token, body: { stage: 'bananas' } })).status, 400);
    // Saved replies: add, edit, archive (audited).
    const { id } = (await call('/admin/support-replies', { method: 'POST', token, body: { title: `${tag} reply`, body: 'Hi {{name}}, done ({{ref}}).' } })).body;
    assert.equal((await call(`/admin/support-replies/${id}`, { method: 'POST', token, body: { title: `${tag} reply`, body: 'Hi {{name}}, all done.' } })).status, 200);
    assert.ok((await call('/admin/support-replies', { token })).body.replies.some((r) => r.id === id && /all done/.test(r.body)));
    await call(`/admin/support-replies/${id}/archive`, { method: 'POST', token });
    assert.ok(!(await call('/admin/support-replies', { token })).body.replies.some((r) => r.id === id));
    // Answered for 14 days: closed by itself.
    await db.query(`UPDATE support_messages SET stage_at = now() - interval '15 days' WHERE id = $1`, [m.id]);
    assert.ok(await support.autoClose(db) >= 1);
    const { rows: [after] } = await db.query('SELECT stage, status FROM support_messages WHERE id = $1', [m.id]);
    assert.deepEqual({ ...after }, { stage: 'closed', status: 'done' });
    const { rows: trail } = await db.query(`SELECT action FROM admin_audit WHERE admin_id = $1 ORDER BY id`, [reg.user.id]);
    assert.deepEqual(trail.map((t) => t.action), ['support-assign', 'support-status', 'saved-reply-add', 'saved-reply-edit', 'saved-reply-archive']);
  } finally {
    server.close();
    await db.pool?.end?.();
  }
});
