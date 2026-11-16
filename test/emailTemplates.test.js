'use strict';

// Editable email templates and the email log (Moses, 16 Nov 2026, CRM phase 5): placeholders and the locked part
// checked on save; nothing changes until a version is published; every email logged. The rules always; the flow
// against a real database when ROOMS_TEST_DATABASE_URL is set.
const test = require('node:test');
const assert = require('node:assert/strict');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
const library = require('../src/email/library');
const templates = require('../src/email/templates');

test('saving checks placeholders, the locked part and links', () => {
  const ok = library.validate('purchase-confirmation', library.KINDS['purchase-confirmation'].defaults);
  assert.equal(ok.blocks.filter((b) => b.type === 'core').length, 1);
  const bad = (kind, t, re) => assert.throws(() => library.validate(kind, t), re);
  const base = library.KINDS['purchase-confirmation'].defaults;
  bad('purchase-confirmation', { ...base, subject: 'Hi {{nmae}}' }, /unknown placeholder \{\{nmae\}\}/);
  bad('purchase-confirmation', { ...base, blocks: base.blocks.filter((b) => b.type !== 'core') }, /locked part/);
  bad('onboarding-1', { ...library.KINDS['onboarding-1'].defaults, blocks: [{ type: 'core' }] }, /no locked part/);
  bad('onboarding-1', { ...library.KINDS['onboarding-1'].defaults, blocks: [{ type: 'button', text: 'Go', href: 'http://evil.example' }] }, /https/);
  bad('no-such-kind', base, /Unknown email kind/);
  for (const [kind, k] of Object.entries(library.KINDS)) assert.doesNotThrow(() => library.validate(kind, k.defaults), kind);
});

test('rendering: placeholders filled and escaped, the core in its place, the unsubscribe line on marketing only', () => {
  const t = library.validate('purchase-confirmation', library.KINDS['purchase-confirmation'].defaults);
  const m = library.render('purchase-confirmation', t, { values: { name: '<Ada>', order_no: 'MS-1', item: 'x' }, core: '<p>CORE</p>' });
  assert.equal(m.subject, 'Your Marble Spins order MS-1');
  assert.match(m.html, /Hi &lt;Ada&gt;,/);
  assert.match(m.html, /<p>CORE<\/p>/);
  assert.doesNotMatch(m.html, /Unsubscribe/);
  const o = library.render('onboarding-1', library.validate('onboarding-1', library.KINDS['onboarding-1'].defaults), { values: library.samples('onboarding-1'), unsubscribeUrl: 'https://marblespins.test/u/x' });
  assert.match(o.html, /https:\/\/marblespins.test\/u\/x/);
  assert.match(o.html, /Race now/);
  // The sample locked parts come from the same code as the real ones.
  for (const kind of Object.keys(library.KINDS)) if (library.KINDS[kind].group === 'service') assert.ok(library.sampleCore(kind).length > 50, kind);
  assert.ok(templates.cores.purchaseCore);
});

test('the flow on a real database: nothing changes until published; publish, use, unpublish; every email logged', { skip: !DB }, async () => {
  const db = require('../src/db');
  const email = require('../src/email');
  const sent = [];
  email.setTransport(async (m) => { sent.push(m); return { messageId: `<m${sent.length}@test>` }; });
  try {
    const kind = 'credit-note';
    await db.query('DELETE FROM email_templates WHERE kind = $1', [kind]);
    const fallback = () => ({ subject: 'CODE', html: '<p>code</p>' });
    const before = await library.compose(db, kind, { values: { name: 'Ada', number: 'KR-1', order_no: 'MS-1' }, core: '<p>core</p>', fallback });
    assert.deepEqual(before, { subject: 'CODE', html: '<p>code</p>', templateVersion: null });
    const t = library.validate(kind, { ...library.KINDS[kind].defaults, subject: 'Credit {{number}} for {{name}}' });
    await db.query(`INSERT INTO email_templates (kind, version, subject, preheader, title, blocks) VALUES ($1, 1, $2, NULL, $3, $4)`, [kind, t.subject, t.title, JSON.stringify(t.blocks)]);
    assert.equal((await library.compose(db, kind, { values: { name: 'Ada', number: 'KR-1' }, core: '', fallback })).subject, 'CODE'); // (saved, not published)
    await db.query('UPDATE email_templates SET published_at = now() WHERE kind = $1 AND version = 1', [kind]);
    const after = await library.compose(db, kind, { values: { name: 'Ada', number: 'KR-1', order_no: 'MS-1' }, core: '<p>core</p>', fallback });
    assert.equal(after.subject, 'Credit KR-1 for Ada');
    assert.equal(after.templateVersion, 1);
    assert.match(after.html, /<p>core<\/p>/);
    await db.query('UPDATE email_templates SET published_at = NULL WHERE kind = $1', [kind]);
    assert.equal((await library.compose(db, kind, { values: {}, core: '', fallback })).subject, 'CODE');

    // The log: kind, the player (found by the address), the version, the provider's id; a failure logged too.
    const name = `t_log_${Date.now() % 1e6}`;
    const { rows: [u] } = await db.query(`INSERT INTO users (username, email, password_hash, is_guest) VALUES ($1, $2, 'x', false) RETURNING id`, [name, `${name}@test.invalid`]);
    await email.send({ to: `${name}@test.invalid`, subject: 'Hello', html: '<p>x</p>', tags: ['credit-note'], templateVersion: 3 });
    email.setTransport(async () => { throw new Error('Brevo 500: down'); });
    await assert.rejects(email.send({ to: `${name}@test.invalid`, subject: 'Again', html: '<p>x</p>', kind: 'support-reply' }));
    const log = await require('../src/email/log').ofPlayer(db, u.id);
    assert.deepEqual(log.map((l) => [l.kind, l.status, l.template_version]), [['support-reply', 'failed', null], ['credit-note', 'sent', 3]]);
    assert.match(log[0].error, /Brevo 500/);
  } finally {
    email.setTransport(null);
    await db.pool?.end?.();
  }
});
