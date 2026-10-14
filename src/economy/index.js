'use strict';

/**
 * The coin economy (client/src/shared/economy.json holds every number).
 *
 * One currency: coins. Coins are earned in races (for taking part, a finishing
 * bonus for the top 10 and the daily goal) or bought in coin packs with real
 * money, and spent in the shop; they are never cashed out. Every change to a
 * player's coins goes through change() below, which moves the balance, keeps
 * the earned and bought counts, and writes a line in the coin ledger, so the
 * ledger always adds up to the balance.
 */
const economy = require('../../client/src/shared/economy.json');
const { badRequest, notFound } = require('../utils/httpError');

const { race: RACE, dailyGoal: GOAL, dailyLimit: LIMIT } = economy;

// What a ledger line can be. Earned kinds count towards the scoreboards and
// users.coins_earned; bought kinds count towards users.coins_bought.
const EARNED = ['race', 'finish-bonus', 'daily-goal'];
const BOUGHT = ['coin-pack', 'credit-conversion'];
const KINDS = ['start', 'opening-balance', ...EARNED, ...BOUGHT, 'purchase', 'bag', 'entry-fee', 'entry-refund', 'refund', 'skill-refund', 'admin', 'pack-refund'];

/**
 * Coin entry fees are switched off (14 Oct 2026: no paying coins to enter a race, so a race is never
 * a bet). A race entered before that may still hold a fee a player paid: this gives back exactly what
 * the ledger shows they paid for `raceId` and haven't had back yet. → coins returned (0 if none).
 */
async function refundEntryFee(client, userId, raceId) {
  const { rows: [{ owed }] } = await client.query(
    `SELECT COALESCE(-SUM(amount), 0)::int AS owed FROM coin_ledger
      WHERE user_id = $1 AND race_id = $2 AND kind IN ('entry-fee', 'entry-refund')`,
    [userId, raceId],
  );
  if (owed <= 0) return 0;
  await change(client, { userId, amount: owed, kind: 'entry-refund', raceId });
  return owed;
}

/** The finishing bonus for `place` (1 = the winner; nothing after 10th). */
function placeCoins(place) {
  if (!Number.isInteger(place) || place < 1) return 0;
  return RACE.places.find((p) => place <= p.upTo)?.coins ?? 0;
}

/** The day a moment belongs to (the economy's days run midnight to midnight UTC): 'YYYY-MM-DD'. */
function dayKey(at = new Date()) {
  return new Date(at).toISOString().slice(0, 10);
}

function dayBefore(day) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return dayKey(d);
}

/**
 * The streak after meeting the daily goal on `today`: one more day if the goal
 * was met yesterday, the same if already met today, otherwise day 1. (Shown to
 * the player; it pays no coins.)
 */
function streakAfter({ days = 0, lastDay = null } = {}, today) {
  if (lastDay === today) return days;
  if (lastDay && lastDay === dayBefore(today)) return days + 1;
  return 1;
}

/**
 * One race's coins for a player: `place`, and how many races they have
 * finished today including this one. The first fullRaces a day pay for taking
 * part plus the finishing bonus; after that a race pays coinsAfter.
 * → [{ kind, amount, note? }] (empty lines left out).
 */
function raceLines({ place, racesToday = 1 }) {
  if (racesToday > LIMIT.fullRaces) return [{ kind: 'race', amount: LIMIT.coinsAfter, note: `after ${LIMIT.fullRaces} races today` }].filter((l) => l.amount > 0);
  return [{ kind: 'race', amount: RACE.takingPart }, { kind: 'finish-bonus', amount: placeCoins(place) }].filter((l) => l.amount > 0);
}

/**
 * Moves a player's coins and writes the ledger line, in one go. `amount` is
 * signed. Earned and bought coins are also added to the player's running
 * counts. With `mustCover` a spend that the balance can't cover changes
 * nothing and returns null. → { balance, ledgerId }.
 */
async function change(client, { userId, amount, kind, raceId = null, itemSlug = null, paymentId = null, note = null, actorId = null }, { mustCover = true } = {}) {
  if (!KINDS.includes(kind)) throw new Error(`unknown ledger kind ${kind}`);
  if (!Number.isInteger(amount) || amount === 0) throw new Error('a ledger line moves a whole, non-zero amount');
  const earned = EARNED.includes(kind) && amount > 0 ? amount : 0;
  const bought = BOUGHT.includes(kind) && amount > 0 ? amount : 0;
  const { rows: [user] } = await client.query(
    `UPDATE users SET coins = coins + $2, coins_earned = coins_earned + $3, coins_bought = coins_bought + $4
      WHERE id = $1 ${mustCover ? 'AND coins + $2 >= 0' : ''} RETURNING coins AS balance`,
    [userId, amount, earned, bought],
  );
  if (!user) return null;
  const { rows: [line] } = await client.query(
    `INSERT INTO coin_ledger (user_id, amount, kind, race_id, item_slug, payment_id, note, actor_id, balance_after)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [userId, amount, kind, raceId, itemSlug, paymentId, note, actorId, user.balance],
  );
  return { balance: user.balance, ledgerId: line.id };
}

/** Spends coins, or throws 400 when the balance can't cover it. */
async function spend(client, { price, ...line }) {
  if (!(price > 0)) throw new Error('a price is a positive amount');
  const done = await change(client, { ...line, amount: -price });
  if (!done) throw badRequest('Not enough coins');
  return done;
}

/** The first ledger line of a new account: its starting coins. */
async function opening(client, userId, coins) {
  if (coins > 0) await client.query(
    `INSERT INTO coin_ledger (user_id, amount, kind, balance_after) VALUES ($1, $2, 'start', $2)`,
    [userId, coins],
  );
}

/**
 * Pays a finished race's human players: taking part and the finishing bonus
 * (or the reduced rate after the day's full races), and on their goal-th race
 * of the day the daily goal, which also moves the streak on. Writes each line
 * to the ledger and the total to race_entries.coins_awarded.
 * → Map(entryId → lines).
 */
async function payRace(client, raceId, now = new Date()) {
  const today = dayKey(now);
  const { rows: humans } = await client.query(
    `SELECT e.id, e.user_id, e.finish_position FROM race_entries e WHERE e.race_id = $1 AND e.user_id IS NOT NULL`,
    [raceId],
  );
  const paid = new Map();
  for (const h of humans) {
    const { rows: [day] } = await client.query(
      `INSERT INTO user_days (user_id, day, races) VALUES ($1, $2, 1)
       ON CONFLICT (user_id, day) DO UPDATE SET races = user_days.races + 1
       RETURNING races, goal_met_at`,
      [h.user_id, today],
    );
    const lines = raceLines({ place: h.finish_position, racesToday: day.races });
    if (day.races >= GOAL.races && !day.goal_met_at) {
      // (Dates as text: a JS Date would shift the day by the server's time zone.)
      const { rows: [u] } = await client.query('SELECT streak_days, streak_last_day::text AS last_day FROM users WHERE id = $1 FOR UPDATE', [h.user_id]);
      const days = streakAfter({ days: u.streak_days, lastDay: u.last_day }, today);
      await client.query('UPDATE users SET streak_days = $2, streak_last_day = $3 WHERE id = $1', [h.user_id, days, today]);
      await client.query('UPDATE user_days SET goal_met_at = $3 WHERE user_id = $1 AND day = $2', [h.user_id, today, now]);
      lines.push({ kind: 'daily-goal', amount: GOAL.coins, note: `streak day ${days}` });
    }
    for (const l of lines) await change(client, { userId: h.user_id, amount: l.amount, kind: l.kind, raceId, note: l.note ?? null });
    const total = lines.reduce((n, l) => n + l.amount, 0);
    await client.query('UPDATE race_entries SET coins_awarded = $2 WHERE id = $1', [h.id, total]);
    paid.set(h.id, lines);
  }
  return paid;
}

/** A player's day: races today, the goal, the streak (alive if the goal was met today or yesterday), the coins and how many full-pay races are left. */
async function today(db, userId, now = new Date()) {
  const day = dayKey(now);
  const { rows: [u] } = await db.query(
    `SELECT u.coins, u.coins_earned, u.coins_bought, u.streak_days, u.streak_last_day::text AS last_day, d.races, d.goal_met_at
       FROM users u LEFT JOIN user_days d ON d.user_id = u.id AND d.day = $2 WHERE u.id = $1`,
    [userId, day],
  );
  if (!u) throw notFound('No such player');
  const last = u.last_day;
  const alive = last === day || last === dayBefore(day);
  return {
    day,
    coins: u.coins,
    earned: u.coins_earned,
    bought: u.coins_bought,
    races: u.races ?? 0,
    goal: { races: GOAL.races, met: Boolean(u.goal_met_at), coins: GOAL.coins },
    streak: { days: alive ? u.streak_days : 0, metToday: last === day },
    fullRacesLeft: Math.max(0, LIMIT.fullRaces - (u.races ?? 0)),
  };
}

/**
 * A bag's price for the marbles still missing from it: their worth less the
 * bag's discount, rounded to the nearest roundTo (never below roundTo).
 */
function bagPrice(bagKey, worth) {
  const bag = economy.bags[bagKey];
  const step = economy.bagPricesRoundTo;
  return Math.max(step, Math.round((worth * (1 - bag.discount)) / step) * step);
}

module.exports = { economy, KINDS, EARNED, BOUGHT, placeCoins, dayKey, dayBefore, streakAfter, raceLines, change, spend, opening, payRace, today, bagPrice, refundEntryFee };
