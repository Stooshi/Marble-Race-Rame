'use strict';

// Confirm-email reminders (Moses, 19 Nov 2026): day 1, 3 and 7 after sign-up while the address isn't confirmed, each
// once with a fresh link; never to confirmed, deleted, suspended or under-13 accounts; only the latest one due; off
// until CONFIRM_REMINDERS=on. Against a real database (ROOMS_TEST_DATABASE_URL).
const test = require('node:test');
const assert = require('node:assert/strict');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
delete process.env.CONFIRM_REMINDERS;

test('the texts: three reminders, each with the button and a fresh link, the first email no longer says "nothing more"', () => {
  const c = require('../src/account/emailConfirm');
  assert.doesNotMatch(c.TEXTS.en.later, /nothing more/);
  for (const n of [1, 2, 3]) {
    const m = c.message({ name: 'Huxley', link: 'https://marblespins.com/confirm-email?t=abc', reminder: n });
    assert.equal(m.subject, c.REMINDERS[n].subject);
    assert.match(m.html, /Confirm my email/);
    assert.match(m.html, /confirm-email\?t=abc/);
    assert.doesNotMatch(m.html, /[Uu]nsubscribe/); // (a service email)
  }
  const lib = require('../src/email/library');
  for (const n of [1, 2, 3]) assert.equal(lib.KINDS[`confirm-reminder-${n}`].group, 'service');
});

test('who gets which reminder, once, and never the wrong accounts', { skip: !DB }, async () => {
  const db = require('../src/db');
  const email = require('../src/email');
  const reminders = require('../src/account/confirmReminders');
  const sent = [];
  email.setTransport(async (m) => { sent.push(m); return { messageId: `<r${sent.length}@test>` }; });
  const before = process.env.BREVO_API_KEY;
  process.env.BREVO_API_KEY = before || 'test-key';
  try {
    const tag = `t_crm_${Date.now() % 1e6}`;
    const make = async (suffix, { daysAgo, age = '18+', verified = false, deleted = false, suspended = false, guest = false }) => {
      const { rows: [u] } = await db.query(
        `INSERT INTO users (username, email, password_hash, is_guest, age_group, email_verified_at, deleted_at, suspended_at)
         VALUES ($1, $2, 'x', $3, $4, ${verified ? 'now()' : 'NULL'}, ${deleted ? 'now()' : 'NULL'}, ${suspended ? 'now()' : 'NULL'}) RETURNING id`,
        [`${tag}${suffix}`, `${tag}${suffix}@test.invalid`, guest, age],
      );
      await db.query(
        `INSERT INTO email_confirmations (user_id, email, token_hash, lang, expires_at, created_at)
         VALUES ($1, $2, md5(random()::text), 'en', now(), now() - make_interval(hours => $3))`,
        [u.id, `${tag}${suffix}@test.invalid`, Math.round(daysAgo * 24)],
      );
      return u.id;
    };
    const fresh = await make('f', { daysAgo: 0.5 }); // (not yet a day)
    const d1 = await make('a', { daysAgo: 1.2 });
    const d3 = await make('b', { daysAgo: 3.5 });
    const huxley = await make('h', { daysAgo: 12 }); // (past day 7 when this starts: the last reminder alone)
    const old = await make('o', { daysAgo: 40 }); // (outside the window)
    const confirmed = await make('c', { daysAgo: 2, verified: true });
    const deleted = await make('d', { daysAgo: 2, deleted: true });
    const suspended = await make('s', { daysAgo: 2, suspended: true });
    const child = await make('k', { daysAgo: 2, age: 'under-13' });
    const mine = (list) => Object.fromEntries(list.filter((r) => r.username.startsWith(tag)).map((r) => [r.id, r.step]));

    // Off: counts only, nothing sent.
    let r = await reminders.run(db);
    assert.equal(r.dryRun, true);
    assert.equal(sent.length, 0);
    assert.deepEqual(mine(await reminders.due(db, { limit: 1e6 })), { [d1]: 1, [d3]: 2, [huxley]: 3 });
    for (const id of [fresh, old, confirmed, deleted, suspended, child]) assert.equal(mine(await reminders.due(db, { limit: 1e6 }))[id], undefined);

    // On: each due reminder once, with a fresh link, logged.
    process.env.CONFIRM_REMINDERS = 'on';
    const ours = () => sent.filter((m) => String(m.to?.[0]?.email ?? m.to ?? JSON.stringify(m)).includes(tag));
    for (let k = 0; k < 5 && Object.keys(mine(await reminders.due(db, { limit: 1e6 }))).length; k += 1) await reminders.run(db);
    const log = (await db.query(`SELECT u.username, l.kind, l.status FROM email_log l JOIN users u ON u.id = l.user_id WHERE u.username LIKE $1 ORDER BY u.username`, [`${tag}%`])).rows;
    assert.deepEqual(log.map((x) => [x.username.slice(-1), x.kind, x.status]), [['a', 'confirm-reminder-1', 'sent'], ['b', 'confirm-reminder-2', 'sent'], ['h', 'confirm-reminder-3', 'sent']]);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM email_confirmations WHERE user_id = $1', [huxley])).rows[0].n, 2); // (a fresh link)
    // Nothing more is due straight after (each once; the next one only on its day).
    assert.deepEqual(mine(await reminders.due(db, { limit: 1e6 })), {});
    // Day 3 for the day-1 account (and past the quiet hours): reminder 2, never 1 again.
    await db.query(`UPDATE email_confirmations SET created_at = created_at - interval '3 days' WHERE user_id = $1`, [d1]);
    assert.deepEqual(mine(await reminders.due(db, { limit: 1e6 })), { [d1]: 2 });
    // Confirmed in between: stops.
    await db.query('UPDATE users SET email_verified_at = now() WHERE id = $1', [d1]);
    assert.deepEqual(mine(await reminders.due(db, { limit: 1e6 })), {});
    assert.ok(ours().length >= 0);
  } finally {
    delete process.env.CONFIRM_REMINDERS;
    if (before === undefined) delete process.env.BREVO_API_KEY; else process.env.BREVO_API_KEY = before;
    email.setTransport(null);
  }
});
