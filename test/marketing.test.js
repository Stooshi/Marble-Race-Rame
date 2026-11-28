'use strict';

// Marketing email (Moses, 16 Nov 2026, CRM phase 6): who may get it (18+ only, consent, no soft opt-in until the
// purchase box is live, never after a no, asleep after 12 months), onboarding stopping at the first purchase, and
// SENDING OFF unless MARKETING_SENDING=on. Against a real database (ROOMS_TEST_DATABASE_URL).
const test = require('node:test');
const assert = require('node:assert/strict');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
delete process.env.MARKETING_SENDING;
delete process.env.MARKETING_SOFT_OPT_IN_FROM;

test('sending is off by default', () => {
  const audience = require('../src/marketing/audience');
  assert.equal(audience.sendingOn(), false);
  assert.equal(audience.softOptInFrom(), null);
  assert.match(audience.allowedSql(), /age_group = '18\+'/);
  assert.doesNotMatch(audience.allowedSql(), /payments/); // (no soft opt-in until the purchase box is live)
});

test('the rules, onboarding and the switch on a real database', { skip: !DB }, async () => {
  const db = require('../src/db');
  const email = require('../src/email');
  const marketing = require('../src/marketing');
  const { audience } = marketing;
  const sent = [];
  email.setTransport(async (m) => { sent.push(m); return { messageId: `<m${sent.length}@test>` }; });
  try {
    const tag = `t_mkt_${Date.now() % 1e6}`;
    const make = async (suffix, { age = '18+', optIn = true, lastLogin = "now() - interval '1 day'", savedDaysAgo = 1, role = 'player' } = {}) => {
      const { rows: [u] } = await db.query(
        `INSERT INTO users (username, email, password_hash, is_guest, age_group, marketing_opt_in, last_login_at, role)
         VALUES ($1, $2, 'x', false, $3, $4, ${lastLogin}, $5) RETURNING id`,
        [`${tag}${suffix}`, `${tag}${suffix}@test.invalid`, age, optIn, role],
      );
      await db.query(`INSERT INTO email_confirmations (user_id, email, token_hash, lang, expires_at, created_at) VALUES ($1, $2, md5(random()::text), 'en', now() + interval '7 days', now() - make_interval(days => $3) - interval '1 hour')`, [u.id, `${tag}${suffix}@test.invalid`, savedDaysAgo]);
      return u.id;
    };
    const adult = await make('a');
    const teen = await make('t', { age: '13-17' });
    const noConsent = await make('n', { optIn: false });
    const saidNo = await make('s');
    await db.query(`INSERT INTO email_consents (user_id, consent, source) VALUES ($1, false, 'unsubscribe')`, [saidNo]);
    const asleep = await make('z', { lastLogin: "now() - interval '13 months'" });
    const admin = await make('m', { role: 'admin' });
    const buyer = await make('b', { optIn: false });
    await db.query(`INSERT INTO payments (user_id, provider, product_id, coins, amount_cents, currency, status, paid_at) VALUES ($1, 'test', 'coins-1000', 1000, 499, 'usd', 'paid', now())`, [buyer]);
    const allowed = async (id) => audience.allowed(db, id);
    assert.equal(await allowed(adult), true);
    assert.equal(await allowed(teen), false); // (13–17: never)
    assert.equal(await allowed(noConsent), false);
    assert.equal(await allowed(saidNo), false);
    assert.equal(await allowed(asleep), false);
    assert.equal(await allowed(admin), false);
    assert.equal(await allowed(buyer), false); // (no soft opt-in yet)
    process.env.MARKETING_SOFT_OPT_IN_FROM = '2020-01-01';
    assert.equal(await allowed(buyer), true); // (once the purchase box is live, a buyer since that day)
    delete process.env.MARKETING_SOFT_OPT_IN_FROM;

    // Onboarding: day 1 is due for the adult (consent, no purchase); sending off, so nothing is sent.
    const due1 = (await marketing.due(db, marketing.STEPS[0])).map((u) => u.id);
    assert.ok(due1.includes(adult));
    assert.ok(!due1.includes(teen) && !due1.includes(buyer));
    const morning = new Date('2026-11-17T09:30:00+01:00');
    const off = await marketing.runOnboarding(db, { now: morning });
    assert.equal(off.dryRun, true);
    assert.equal(off.steps.reduce((n, s) => n + s.sent, 0), 0);
    assert.equal(sent.length, 0);
    assert.equal(await marketing.runNewsletters(db), 0);

    // Switched on (a test only): sent once, with the unsubscribe link and headers; never twice.
    process.env.MARKETING_SENDING = 'on';
    const on = await marketing.runOnboarding(db, { now: morning });
    assert.ok(on.steps[0].sent >= 1);
    const mine = sent.find((m) => m.to[0].email === `${tag}a@test.invalid`);
    assert.ok(mine);
    assert.match(mine.htmlContent, /unsubscribe\?u=/);
    assert.match(mine.headers['List-Unsubscribe'], /unsubscribe/);
    assert.ok(!sent.some((m) => m.to[0].email === `${tag}t@test.invalid`));
    const n = sent.length;
    await marketing.runOnboarding(db, { now: morning });
    assert.equal(sent.filter((m) => m.to[0].email === `${tag}a@test.invalid`).length, 1);
    assert.ok(sent.length >= n);
    // Outside the Swedish morning: nothing.
    const before = sent.length;
    const late = await make('l');
    await marketing.runOnboarding(db, { now: new Date('2026-11-17T15:00:00+01:00') });
    assert.equal(sent.length, before);
    assert.ok(late);
  } finally {
    delete process.env.MARKETING_SENDING;
    email.setTransport(null);
    await db.pool?.end?.();
  }
});
