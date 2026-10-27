'use strict';

// Credits and the Pro pass (Leagues part 2, 27 Oct 2026; src/credits, src/leagues/pro.js). Against a
// real database when ROOMS_TEST_DATABASE_URL is set; the rules that need none run always.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
const credits = require('../src/credits');
const pro = require('../src/leagues/pro');

const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
/** The code without its comments (the comments explain the rule, naming both currencies). */
const code = (f) => read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

test('the prices: a Pro League 2 credits, the Pro pass 5 for 30 days', () => {
  assert.equal(credits.PRO_LEAGUE, 2);
  assert.equal(credits.PRO_PASS, 5);
  assert.equal(credits.PASS_DAYS, 30);
});

test('one way only: credits can become coins (1,000 each), coins never become credits', () => {
  assert.equal(credits.SWAP_RATE, 1000);
  const credit = code('src/credits/index.js');
  const economy = code('src/economy/index.js');
  // economy never knows credits: no way from coins to credits.
  assert.doesNotMatch(economy, /credits\.|credit_ledger|user_credits|require\('\.\.\/credits'\)/);
  // The only coin moves in src/credits: the swap's coins in, and a refunded pack's swapped coins out, both through economy.change().
  const coinMoves = [...credit.matchAll(/require\('\.\.\/economy'\)\.(\w+)\(client, \{ userId, amount: ([^,]+), kind: '([\w-]+)'/g)].map((m) => [m[1], m[2], m[3]]);
  assert.deepEqual(coinMoves, [['change', 'coins', 'credit-swap'], ['change', '-out.coinsTaken', 'pack-refund']]);
  assert.doesNotMatch(credit, /coin_ledger|UPDATE users SET coins/);
  // Credits only ever go up from a credit pack (or the back office), never from coins.
  assert.doesNotMatch(credit, /kind: 'swap'[^}]*amount: [^-]/);
  assert.match(credit, /spend\(client, \{ userId, price: count, kind: 'swap'/);
  // Every credits change is through credits.change(): nothing else writes the balance or the ledger.
  const src = (dir) => fs.readdirSync(path.join(__dirname, '..', dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? src(path.join(dir, e.name)) : e.name.endsWith('.js') ? [path.join(dir, e.name)] : []));
  for (const f of src('src')) {
    if (f === path.join('src', 'credits', 'index.js')) continue;
    assert.doesNotMatch(read(f), /(UPDATE|INSERT INTO)\s+(user_credits|credit_ledger)/, f);
  }
  // (Never the old column names: the run-once data update 2027-01-03-coins-only drops users.credits and payments.credits.)
  const schema = read('docs/database_schema.sql');
  assert.doesNotMatch(schema, /ALTER TABLE (users|payments) ADD COLUMN IF NOT EXISTS credits /);
});

test('the LEAGUES_PRO switch: off by default, never more open than LEAGUES', () => {
  const admin = { role: 'admin' };
  const player = { role: 'player' };
  assert.equal(pro.mode({}), 'off');
  assert.equal(pro.mode({ LEAGUES_PRO: ' ON ' }), 'on');
  assert.equal(pro.openFor(player, { LEAGUES: 'on' }), false);
  assert.equal(pro.openFor(player, { LEAGUES: 'on', LEAGUES_PRO: 'on' }), true);
  assert.equal(pro.openFor(player, { LEAGUES: 'on', LEAGUES_PRO: 'admins' }), false);
  assert.equal(pro.openFor(admin, { LEAGUES: 'on', LEAGUES_PRO: 'admins' }), true);
  assert.equal(pro.openFor(player, { LEAGUES: 'admins', LEAGUES_PRO: 'on' }), false);
  assert.equal(pro.openFor(admin, { LEAGUES: 'admins', LEAGUES_PRO: 'on' }), true);
  assert.equal(pro.openFor(admin, { LEAGUES: 'off', LEAGUES_PRO: 'on' }), false);
});

test('the ledger: change, spend, never below 0, the Pro pass, a refund with credits already spent', { skip: !DB }, async () => {
  const db = require('../src/db');
  try {
    const { rows: [u] } = await db.query(
      "INSERT INTO users (username, email, password_hash, is_guest) VALUES ($1, $2, 'x', false) RETURNING id",
      [`cr_${Date.now().toString(36)}`, `cr_${Date.now().toString(36)}@test.invalid`],
    );
    const userId = u.id;
    assert.equal(await credits.balance(db, userId), 0);
    await db.withTransaction(async (c) => {
      assert.equal(await credits.change(c, { userId, amount: -1, kind: 'pro-league' }), null);
      const add = await credits.change(c, { userId, amount: 10, kind: 'credit-pack', note: 'credits-10' });
      assert.equal(add.balance, 10);
    });
    await assert.rejects(() => db.withTransaction((c) => credits.spend(c, { userId, price: 11, kind: 'pro-league' })), (e) => e.status === 402 && e.details.code === 'not_enough_credits' && e.details.have === 10);
    await db.withTransaction((c) => credits.spend(c, { userId, price: credits.PRO_LEAGUE, kind: 'pro-league' }));
    assert.equal(await credits.balance(db, userId), 8);

    // The Pro pass: 5 credits, 30 days; a second one starts when the first ends.
    const now = new Date();
    const first = await db.withTransaction((c) => credits.buyPass(c, userId, now));
    assert.equal(first.balance, 3);
    assert.equal(new Date(first.pass.ends_at).getTime() - now.getTime(), 30 * 86_400_000);
    assert.ok(await credits.activePass(db, userId, now));
    assert.equal(await credits.activePass(db, userId, new Date(now.getTime() + 31 * 86_400_000)), null);
    await assert.rejects(() => db.withTransaction((c) => credits.buyPass(c, userId, now)), (e) => e.status === 402);
    await db.withTransaction((c) => credits.change(c, { userId, amount: 5, kind: 'admin', note: 'test' }));
    const second = await db.withTransaction((c) => credits.buyPass(c, userId, now));
    assert.equal(new Date(second.pass.starts_at).getTime(), new Date(first.pass.ends_at).getTime());
    assert.ok(await credits.activePass(db, userId, new Date(now.getTime() + 45 * 86_400_000)));

    // A 10-credit pack refunded with 3 credits left: 3 taken back, 7 short (on the payment).
    const { rows: [pay] } = await db.query(
      "INSERT INTO payments (user_id, provider, product_id, coins, credit_amount, amount_cents, currency, status) VALUES ($1, 'test', 'credits-10', 0, 10, 1000, 'usd', 'paid') RETURNING id",
      [userId],
    );
    assert.equal(await credits.balance(db, userId), 3);
    const back = await db.withTransaction((c) => credits.takeBack(c, { userId, paymentId: pay.id, credits: 10 }));
    assert.deepEqual(back, { taken: 3, swappedBack: 0, coinsTaken: 0, coinsShort: 0, short: 7 });
    assert.equal(await credits.balance(db, userId), 0);
    assert.equal((await db.query('SELECT credits_short FROM payments WHERE id = $1', [pay.id])).rows[0].credits_short, 7);

    // The swap: 2 credits → 2,000 coins (bought coins, never earned); coins never back into credits.
    await db.withTransaction((c) => credits.change(c, { userId, amount: 4, kind: 'admin', note: 'test' }));
    const coinsBefore = (await db.query('SELECT coins, coins_bought, coins_earned FROM users WHERE id = $1', [userId])).rows[0];
    const swapped = await db.withTransaction((c) => credits.swapToCoins(c, userId, 2));
    assert.equal(swapped.credits, 2);
    assert.equal(swapped.coins, coinsBefore.coins + 2000);
    const coinsAfter = (await db.query('SELECT coins_bought, coins_earned FROM users WHERE id = $1', [userId])).rows[0];
    assert.equal(coinsAfter.coins_bought, coinsBefore.coins_bought + 2000);
    assert.equal(coinsAfter.coins_earned, coinsBefore.coins_earned);
    await assert.rejects(() => db.withTransaction((c) => credits.swapToCoins(c, userId, 3)), (e) => e.status === 402);
    await assert.rejects(() => db.withTransaction((c) => credits.swapToCoins(c, userId, 0)), (e) => e.status === 400);
    // A 5-credit pack refunded with 2 credits left and 2 swapped (their 2,000 coins spent down to 500):
    // 2 credits back, 2 swapped credits' coins taken (500 there, 1,500 short), 1 credit short (spent).
    await db.query('UPDATE users SET coins = 500 WHERE id = $1', [userId]);
    const { rows: [pay2] } = await db.query(
      "INSERT INTO payments (user_id, provider, product_id, coins, credit_amount, amount_cents, currency, status) VALUES ($1, 'test', 'credits-5', 0, 5, 500, 'usd', 'paid') RETURNING id",
      [userId],
    );
    const back2 = await db.withTransaction((c) => credits.takeBack(c, { userId, paymentId: pay2.id, credits: 5 }));
    assert.deepEqual(back2, { taken: 2, swappedBack: 2, coinsTaken: 500, coinsShort: 1500, short: 1 });
    assert.equal((await db.query('SELECT coins FROM users WHERE id = $1', [userId])).rows[0].coins, 0);
    assert.deepEqual((await db.query('SELECT credits_short, credits_swapped_back, swap_coins_short FROM payments WHERE id = $1', [pay2.id])).rows[0], { credits_short: 1, credits_swapped_back: 2, swap_coins_short: 1500 });
    // (Those 2 swapped credits are claimed: another refund doesn't take their coins again.)
    const { rows: [pay3] } = await db.query(
      "INSERT INTO payments (user_id, provider, product_id, coins, credit_amount, amount_cents, currency, status) VALUES ($1, 'test', 'credits-5', 0, 5, 500, 'usd', 'paid') RETURNING id",
      [userId],
    );
    assert.deepEqual(await db.withTransaction((c) => credits.takeBack(c, { userId, paymentId: pay3.id, credits: 5 })), { taken: 0, swappedBack: 0, coinsTaken: 0, coinsShort: 0, short: 5 });

    // The ledger adds up to the balance, line by line.
    const { rows: lines } = await db.query('SELECT amount, balance_after FROM credit_ledger WHERE user_id = $1 ORDER BY created_at, balance_after', [userId]);
    let run = 0;
    for (const l of lines) { run += l.amount; assert.equal(l.balance_after, run); }
    const s = await credits.summary(db, userId, now);
    assert.equal(s.balance, 0);
    assert.ok(s.pass);
    // A pass bought now waits for the two running/queued ones: "Starts on <date>".
    assert.equal(new Date(s.nextPassStarts).getTime(), new Date(second.pass.ends_at).getTime());
    assert.equal(s.lines.length, lines.length);
  } finally {
    await db.pool?.end?.();
  }
});
