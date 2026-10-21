'use strict';

// Gift codes (Moses, 21 Oct 2026; src/giftCodes), against a real database (ROOMS_TEST_DATABASE_URL):
//   - codes for coins or a season's pass, single-use or multi-use with a limit, with an expiry;
//   - redeemed on the website by a saved account only (a guest: 401 save_first), once per account;
//   - gifted coins are bought coins (ledger kind 'gift-code'), never on the scoreboards;
//   - the back office makes codes (one, a custom one, or a batch), tags them, sees redemptions,
//     switches them off; every action audited;
//   - redeeming is off until client/src/shared/giftCodes.json says enabled (404).
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';

const settings = require('../client/src/shared/giftCodes.json');
const giftCodes = require('../src/giftCodes');

test('off in the repository; gifted coins are a bought kind, which the scoreboards never count', () => {
  assert.equal(settings.enabled, false);
  assert.equal(giftCodes.enabled(), false);
  const { EARNED, BOUGHT } = require('../src/economy');
  assert.ok(BOUGHT.includes('gift-code'));
  assert.ok(!EARNED.includes('gift-code'));
});

test('codes: unambiguous letters, shown in groups of four, typed any way', () => {
  for (let i = 0; i < 200; i++) {
    const c = giftCodes.generate();
    assert.match(c, /^[A-HJKMNP-Z2-9]{12}$/);
  }
  assert.equal(giftCodes.display('ABCDEFGH2345'), 'ABCD-EFGH-2345');
  assert.equal(giftCodes.display('MARBLEJOE'), 'MARBLEJOE');
  assert.equal(giftCodes.normalise(' abcd-efgh 2345 '), 'ABCDEFGH2345');
  const now = new Date('2026-11-01T00:00:00Z');
  assert.equal(giftCodes.stateOf({ uses: 0, max_uses: 1, expires_at: '2026-12-01', disabled_at: null }, now), 'active');
  assert.equal(giftCodes.stateOf({ uses: 1, max_uses: 1, expires_at: '2026-12-01', disabled_at: null }, now), 'used-up');
  assert.equal(giftCodes.stateOf({ uses: 0, max_uses: 1, expires_at: '2026-10-01', disabled_at: null }, now), 'expired');
  assert.equal(giftCodes.stateOf({ uses: 0, max_uses: 1, expires_at: '2026-12-01', disabled_at: '2026-10-30' }, now), 'disabled');
});

test('gift codes end to end: back office, redeeming, coins counted as bought, the pass, limits', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const seasons = require('../src/seasons');
  const totp = require('../src/admin/totp');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const run = crypto.randomBytes(3).toString('hex');
  const key = `test-gc-${run}`;
  const inAWeek = new Date(Date.now() + 7 * 864e5).toISOString();
  try {
    await db.query(
      `INSERT INTO seasons (key, name, starts_at, ends_at, free_from, pass_product_id, pass_name, price_cents, pass_sale_starts_at, pass_sale_ends_at)
       VALUES ($1, 'Gc Season 2026', now() + interval '2 days', now() + interval '12 days', now() + interval '12 days', $2, 'Gc Season Pass 2026', 999, now() - interval '1 day', now() + interval '12 days')`,
      [key, `gcpass-${run}`],
    );
    seasons.forget();
    const reg = async (n) => (await call('/auth/register', { method: 'POST', body: { username: n, email: `${n}@test.invalid`, password: 'password123', birth_year: 1990, birth_month: 5 } })).body;
    const name = `t_gc_${run}`;
    const admin = await reg(`${name}a`);
    const alice = await reg(`${name}b`);
    const bob = await reg(`${name}c`);
    const guest = (await call('/auth/guest', { method: 'POST', body: {} })).body;

    // The back office: an admin with the 2-step login.
    await db.query(`UPDATE users SET role = 'admin' WHERE id = $1`, [admin.user.id]);
    const setup = (await call('/admin/session/start', { method: 'POST', token: admin.token })).body.setup;
    const { token: adm } = (await call('/admin/session/verify', { method: 'POST', token: admin.token, body: { code: totp.codeAt(setup.secret, totp.stepNow()) } })).body;
    assert.equal((await call('/admin/gift-codes', { token: alice.token })).status, 401); // (players can't)
    const make = (body) => call('/admin/gift-codes', { method: 'POST', token: adm, body: { reason: 'Test campaign codes', expires_at: inAWeek, ...body } });
    assert.equal((await make({ kind: 'coins', coins: 5000, max_uses: 1, tag: `creator-${run}` , reason: 'x' })).status, 400); // (a reason is needed)
    assert.equal((await make({ kind: 'coins', coins: 5000, max_uses: 1, tag: `creator-${run}`, expires_at: '2020-01-01' })).status, 400);
    assert.equal((await make({ kind: 'coins', coins: 0, max_uses: 1, tag: `creator-${run}` })).status, 400);
    assert.equal((await make({ kind: 'pass', season_key: 'no-such-season', max_uses: 1, tag: `creator-${run}` })).status, 400);

    const single = (await make({ kind: 'coins', coins: 5000, max_uses: 1, tag: `creator-${run}` })).body.codes[0];
    assert.match(single.code, /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    const custom = `JOE${run.toUpperCase()}`;
    const multi = (await make({ kind: 'coins', coins: 1000, max_uses: 2, tag: `creator-${run}`, code: custom.toLowerCase() })).body.codes[0];
    assert.equal(multi.code, custom);
    assert.equal((await make({ kind: 'coins', coins: 1000, max_uses: 2, tag: `creator-${run}`, code: custom })).status, 409); // (taken)
    const batch = (await make({ kind: 'pass', season_key: key, max_uses: 1, tag: `giveaway-${run}`, count: 3 })).body.codes;
    assert.equal(batch.length, 3);
    assert.equal(new Set(batch.map((c) => c.batch_id)).size, 1);
    assert.equal((await make({ kind: 'coins', coins: 10, max_uses: 2, tag: 'x-batch', count: 2 })).status, 400); // (batches are single-use)

    // Off: nobody can redeem yet.
    assert.equal((await call('/gift-codes/redeem', { method: 'POST', token: alice.token, body: { code: single.code } })).status, 404);
    settings.enabled = true;
    try {
      const redeem = (token, code) => call('/gift-codes/redeem', { method: 'POST', token, body: { code } });
      // Guests and logged-out visitors can't.
      const g = await redeem(guest.token, single.code);
      assert.equal(g.status, 401);
      assert.equal(g.body.details.code, 'save_first');
      assert.equal((await redeem(null, single.code)).status, 401);
      assert.equal((await redeem(alice.token, 'NOPE-NOPE-NOPE')).status, 404);

      // Coins: typed in lower case without dashes still works; bought coins, never on a scoreboard.
      const { rows: [before] } = await db.query('SELECT coins, coins_earned, coins_bought FROM users WHERE id = $1', [alice.user.id]);
      const r1 = await redeem(alice.token, single.code.toLowerCase().replace(/-/g, ''));
      assert.equal(r1.status, 200);
      assert.deepEqual({ kind: r1.body.kind, coins: r1.body.coins, code: r1.body.code }, { kind: 'coins', coins: 5000, code: single.code });
      const { rows: [after] } = await db.query('SELECT coins, coins_earned, coins_bought FROM users WHERE id = $1', [alice.user.id]);
      assert.equal(after.coins, before.coins + 5000);
      assert.equal(after.coins_bought, before.coins_bought + 5000);
      assert.equal(after.coins_earned, before.coins_earned);
      const { rows: [line] } = await db.query(`SELECT * FROM coin_ledger WHERE user_id = $1 AND kind = 'gift-code'`, [alice.user.id]);
      assert.equal(line.amount, 5000);
      assert.match(line.note, new RegExp(`creator-${run}`));
      for (const board of ['all', 'season']) {
        const sb = (await call(`/scoreboard?board=${board}`, { token: alice.token })).body;
        const me = JSON.stringify(sb).includes(`${name}b`) ? (sb.rows ?? sb.entries ?? sb.players ?? []).find((x) => (x.username ?? x.name) === `${name}b`) : null;
        assert.ok(!me || Number(me.coins ?? me.earned ?? 0) === after.coins_earned, `scoreboard ${board} must not count gifted coins`);
      }

      // Single-use: used up for everyone else; once per account.
      assert.equal((await redeem(bob.token, single.code)).status, 409);
      assert.equal((await redeem(alice.token, single.code)).status, 409);
      // Multi-use with a limit of 2.
      assert.equal((await redeem(alice.token, custom)).status, 200);
      assert.equal((await redeem(alice.token, custom)).body.error, "You've already used this code");
      assert.equal((await redeem(bob.token, custom)).status, 200);
      const third = await reg(`${name}d`);
      assert.equal((await redeem(third.token, custom)).body.error, 'This code has been used up');

      // The pass: granted with no payment, holds once.
      const p = await redeem(bob.token, batch[0].code);
      assert.equal(p.status, 200);
      assert.equal(p.body.kind, 'pass');
      assert.equal(p.body.season.key, key);
      assert.equal(await seasons.hasPass(db, bob.user.id, key), true);
      const { rows: [pass] } = await db.query('SELECT provider, payment_id FROM season_passes WHERE user_id = $1 AND season_key = $2', [bob.user.id, key]);
      assert.deepEqual(pass, { provider: 'gift-code', payment_id: null });
      const again = await redeem(bob.token, batch[1].code);
      assert.equal(again.status, 409);
      assert.match(again.body.error, /already have the Gc Season 2026 pass/);
      assert.equal((await db.query('SELECT uses FROM gift_codes WHERE code = $1', [giftCodes.normalise(batch[1].code)])).rows[0].uses, 0, 'a refused code is not used up');

      // Expired, and switched off.
      await db.query(`UPDATE gift_codes SET expires_at = now() - interval '1 minute' WHERE code = $1`, [giftCodes.normalise(batch[1].code)]);
      assert.equal((await redeem(alice.token, batch[1].code)).status, 410);
      assert.equal((await call(`/admin/gift-codes/${batch[2].id}/disable`, { method: 'POST', token: adm, body: { reason: 'Posted publicly by mistake' } })).status, 200);
      assert.equal((await redeem(alice.token, batch[2].code)).status, 404);

      // The player's list, and the data download.
      const mine = (await call('/gift-codes/mine', { token: alice.token })).body.codes;
      assert.deepEqual(mine.map((c) => c.what).sort(), ['1,000 coins', '5,000 coins']);
      const data = (await call('/users/me/export', { token: alice.token }));
      if (data.status === 200) assert.equal(data.body.giftCodesRedeemed.length, 2);

      // The back office: by tag, redemptions, the audit log.
      const list = (await call(`/admin/gift-codes?tag=creator-${run}`, { token: adm })).body;
      assert.equal(list.enabled, true);
      assert.equal(list.codes.length, 2);
      const t = list.tags.find((x) => x.tag === `creator-${run}`);
      assert.deepEqual({ codes: t.codes, redemptions: t.redemptions, coins: t.coins_given }, { codes: 2, redemptions: 3, coins: 7000 });
      assert.equal(list.tags.find((x) => x.tag === `giveaway-${run}`).passes_given, 1);
      const detail = (await call(`/admin/gift-codes/${multi.id}`, { token: adm })).body;
      assert.deepEqual(detail.redemptions.map((r) => r.player).sort(), [`${name}b`, `${name}c`]);
      assert.equal(detail.code.state, 'used-up');
      const { rows: audits } = await db.query(`SELECT action FROM admin_audit WHERE admin_id = $1 AND action LIKE 'gift-code%'`, [admin.user.id]);
      assert.deepEqual([...new Set(audits.map((a) => a.action))].sort(), ['gift-code-disable', 'gift-codes-create']);
      assert.equal((await call('/admin/economy?days=1', { token: adm })).body.daily.at(-1).gifted >= 7000, true);
    } finally {
      settings.enabled = false;
    }
  } finally {
    server.close();
    await db.pool?.end?.();
  }
});
