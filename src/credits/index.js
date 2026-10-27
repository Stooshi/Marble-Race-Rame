'use strict';

/**
 * Credits (Leagues part 2, 27 Oct 2026; plan: project doc claude/leagues-v1-build-plan.md, "Credits").
 *
 * A second currency, bought with real money in credit packs ($1 = 1 credit: 5, 10 or 25), spent on a
 * Pro League (PRO_LEAGUE, 2) and the 30-day Pro pass (PRO_PASS, 5). Credits never expire. Each purchase
 * is fully in one currency. One way only (Moses, 27 Oct 2026): credits can be swapped into coins at
 * SWAP_RATE (1,000 coins a credit), never coins into credits: swapToCoins is the only place the two
 * meet, and it moves coins only through economy.change() (test/credits.test.js reads the code to check).
 * Swapped credits can't be refunded; a refunded credit pack takes back the coins its swapped credits
 * became (takeBack).
 *
 * Every change goes through change() below, which moves the balance (user_credits) and writes a line
 * in credit_ledger, so the ledger always adds up to the balance. Behind LEAGUES_PRO (pro.js).
 */

const { badRequest } = require('../utils/httpError');

const KINDS = ['credit-pack', 'pack-refund', 'pro-league', 'pro-pass', 'swap', 'admin'];
const SWAP_RATE = 1000; // coins for one credit (one way: credits → coins)
const PRO_LEAGUE = 2;   // credits for one Pro League (the creator pays; members join free)
const PRO_PASS = 5;     // credits for the Pro pass
const PASS_DAYS = 30;

/** The player's credits (0 without a row). */
async function balance(db, userId) {
  const { rows: [r] } = await db.query('SELECT balance FROM user_credits WHERE user_id = $1', [userId]);
  return r?.balance ?? 0;
}

/**
 * Moves a player's credits by `amount` (whole, non-zero) and writes its ledger line. With mustCover
 * (the default) a spend that the balance can't cover changes nothing → null. → { balance, ledgerId }.
 */
async function change(client, { userId, amount, kind, paymentId = null, leagueId = null, note = null, actorId = null }, { mustCover = true } = {}) {
  if (!KINDS.includes(kind)) throw new Error(`unknown credit ledger kind ${kind}`);
  if (!Number.isInteger(amount) || amount === 0) throw new Error('a credit ledger line moves a whole, non-zero amount');
  await client.query('INSERT INTO user_credits (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [userId]);
  const { rows: [row] } = await client.query(
    `UPDATE user_credits SET balance = ${mustCover ? 'balance + $2' : 'GREATEST(balance + $2, 0)'}, updated_at = now()
      WHERE user_id = $1 ${mustCover ? 'AND balance + $2 >= 0' : ''} RETURNING balance`,
    [userId, amount],
  );
  if (!row) return null;
  const { rows: [line] } = await client.query(
    `INSERT INTO credit_ledger (user_id, amount, balance_after, kind, payment_id, league_id, note, actor_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [userId, amount, row.balance, kind, paymentId, leagueId, note, actorId],
  );
  return { balance: row.balance, ledgerId: line.id };
}

/** Spends credits, or throws 402 "Not enough credits" (code not_enough_credits). */
async function spend(client, { price, ...line }) {
  if (!(Number.isInteger(price) && price > 0)) throw new Error('a price is a positive whole number of credits');
  const done = await change(client, { ...line, amount: -price });
  if (!done) {
    const have = await balance(client, line.userId);
    const err = badRequest(`Not enough credits: this needs ${price}, you have ${have}`);
    err.status = 402;
    err.details = { code: 'not_enough_credits', need: price, have };
    throw err;
  }
  return done;
}

/**
 * Swaps `count` credits into coins (SWAP_RATE each), one way: never coins into credits. The player has
 * seen "Swapped credits can't be refunded" and confirmed. → { credits, coins } (the new balances).
 */
async function swapToCoins(client, userId, count) {
  if (!Number.isInteger(count) || count < 1 || count > 1000) throw badRequest('Swap a whole number of credits');
  const coins = count * SWAP_RATE;
  const paid = await spend(client, { userId, price: count, kind: 'swap', note: `${count} credit${count === 1 ? '' : 's'} → ${coins.toLocaleString('en-US')} coins` });
  const got = await require('../economy').change(client, { userId, amount: coins, kind: 'credit-swap', note: `${count} credit${count === 1 ? '' : 's'} swapped` });
  return { credits: paid.balance, coins: got.balance };
}

/** Credits this player swapped into coins and no refund has claimed back yet. */
async function unclaimedSwaps(client, userId) {
  const { rows: [r] } = await client.query(
    `SELECT COALESCE((SELECT -SUM(amount) FROM credit_ledger WHERE user_id = $1 AND kind = 'swap'), 0)::int
          - COALESCE((SELECT SUM(credits_swapped_back) FROM payments WHERE user_id = $1), 0)::int AS n`,
    [userId],
  );
  return Math.max(0, r.n);
}

/**
 * A credit pack refunded or disputed (Moses, 27 Oct 2026): takes back what's left of its credits (never
 * below 0); of the rest, credits that had been swapped into coins have their coins taken back (as far
 * as the player still has them); credits spent on Pro Leagues or the pass stay spent. What can't be
 * taken back is kept on the payment as "short" for the back office (credits_short, swap_coins_short),
 * as with coin packs; what the credits bought keeps running.
 * → { taken, swappedBack, coinsTaken, coinsShort, short }.
 */
async function takeBack(client, { userId, paymentId, credits, note = null }) {
  const out = { taken: 0, swappedBack: 0, coinsTaken: 0, coinsShort: 0, short: 0 };
  if (!(credits > 0)) return out;
  const have = await balance(client, userId);
  out.taken = Math.min(have, credits);
  if (out.taken > 0) await change(client, { userId, amount: -out.taken, kind: 'pack-refund', paymentId, note });
  let rest = credits - out.taken;
  out.swappedBack = Math.min(rest, await unclaimedSwaps(client, userId));
  if (out.swappedBack > 0) {
    const owed = out.swappedBack * SWAP_RATE;
    const { rows: [u] } = await client.query('SELECT coins FROM users WHERE id = $1', [userId]);
    out.coinsTaken = Math.min(owed, Math.max(0, u?.coins ?? 0));
    out.coinsShort = owed - out.coinsTaken;
    if (out.coinsTaken > 0) await require('../economy').change(client, { userId, amount: -out.coinsTaken, kind: 'pack-refund', paymentId, note: `${out.swappedBack} swapped credit${out.swappedBack === 1 ? '' : 's'} of a refunded credit pack` });
    rest -= out.swappedBack;
  }
  out.short = rest;
  await client.query(
    'UPDATE payments SET credits_short = credits_short + $2, credits_swapped_back = credits_swapped_back + $3, swap_coins_short = swap_coins_short + $4 WHERE id = $1',
    [paymentId, out.short, out.swappedBack, out.coinsShort],
  );
  return out;
}

/** The player's Pro pass running at `now` (the one that ends last), or null. */
async function activePass(db, userId, now = new Date()) {
  const { rows: [p] } = await db.query(
    'SELECT id, starts_at, ends_at FROM pro_passes WHERE user_id = $1 AND starts_at <= $2 AND ends_at > $2 ORDER BY ends_at DESC LIMIT 1',
    [userId, now],
  );
  return p ?? null;
}

/**
 * Buys the 30-day Pro pass for PRO_PASS credits. Bought while one runs (or one is waiting), the new
 * 30 days start when the last one ends. → the pass { id, starts_at, ends_at } and the new balance.
 */
async function buyPass(client, userId, now = new Date()) {
  await client.query('SELECT 1 FROM users WHERE id = $1 FOR UPDATE', [userId]);
  const { rows: [last] } = await client.query('SELECT max(ends_at) AS ends_at FROM pro_passes WHERE user_id = $1', [userId]);
  const starts = last?.ends_at && new Date(last.ends_at) > now ? new Date(last.ends_at) : now;
  const ends = new Date(starts.getTime() + PASS_DAYS * 86_400_000);
  const paid = await spend(client, { userId, price: PRO_PASS, kind: 'pro-pass', note: `Pro pass ${starts.toISOString().slice(0, 10)} to ${ends.toISOString().slice(0, 10)}` });
  const { rows: [pass] } = await client.query(
    'INSERT INTO pro_passes (user_id, starts_at, ends_at, ledger_id) VALUES ($1, $2, $3, $4) RETURNING id, starts_at, ends_at',
    [userId, starts, ends, paid.ledgerId],
  );
  return { pass, balance: paid.balance };
}

/** The player's credits page: the balance, the pass (running or waiting) and the latest ledger lines. */
async function summary(db, userId, now = new Date()) {
  const [bal, pass, { rows: lines }, { rows: [until] }] = await Promise.all([
    balance(db, userId),
    activePass(db, userId, now),
    db.query(
      `SELECT l.amount, l.kind, l.balance_after, l.note, l.created_at, p.order_no, lg.code AS league_code, lg.name AS league_name
         FROM credit_ledger l LEFT JOIN payments p ON p.id = l.payment_id LEFT JOIN leagues lg ON lg.id = l.league_id
        WHERE l.user_id = $1 ORDER BY l.created_at DESC LIMIT 50`,
      [userId],
    ),
    db.query('SELECT max(ends_at) AS ends_at FROM pro_passes WHERE user_id = $1 AND ends_at > $2', [userId, now]),
  ]);
  return { balance: bal, pass: pass ? { starts_at: pass.starts_at, ends_at: until?.ends_at ?? pass.ends_at } : null, lines, prices: { proLeague: PRO_LEAGUE, proPass: PRO_PASS, passDays: PASS_DAYS, swapRate: SWAP_RATE },
    // (A pass bought now starts here: now, or when the running/waiting one ends. Shown as "Starts on <date>".)
    nextPassStarts: until?.ends_at ?? now };
}

module.exports = { KINDS, PRO_LEAGUE, PRO_PASS, PASS_DAYS, SWAP_RATE, balance, change, spend, swapToCoins, takeBack, activePass, buyPass, summary };
