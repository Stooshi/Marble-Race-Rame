'use strict';

/**
 * The coin economy (client/src/shared/economy.json holds every number).
 *
 * Coins are earned in races (by place, a personal best, the daily goal and the
 * streak) and spent in the shop; credits are bought with real money. Every
 * change to a player's coins or credits goes through change() below, which
 * moves the balance and writes a line in the coin ledger in one statement
 * pair, so the ledger always adds up to the balance.
 */
const economy = require('../../client/src/shared/economy.json');
const { badRequest, notFound } = require('../utils/httpError');

const { race: RACE, dailyGoal: GOAL, streak: STREAK, farmGuard: GUARD } = economy;

// What a ledger line can be. Earned kinds count towards the scoreboards.
const KINDS = ['start', 'opening-balance', 'race', 'personal-best', 'daily-goal', 'streak', 'purchase', 'bag', 'coin-pack', 'credit-pack',
  'entry-fee', 'entry-refund', 'refund', 'skill-refund', 'admin'];
const EARNED = ['race', 'personal-best', 'daily-goal', 'streak'];

/** Coins for finishing in `place` (1 = the winner). */
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
 * was met yesterday, the same if already met today, otherwise day 1.
 */
function streakAfter({ days = 0, lastDay = null } = {}, today) {
  if (lastDay === today) return days;
  if (lastDay && lastDay === dayBefore(today)) return days + 1;
  return 1;
}

/** The daily bonus on day `streakDays` of a streak: the goal's coins plus the streak's. */
function goalBonus(streakDays) {
  return { goal: GOAL.coins, streak: STREAK.perDay * Math.min(Math.max(streakDays, 1), STREAK.maxDays) };
}

/**
 * One race's coins for a player: `place`, whether it was a personal best, and
 * how many races they have finished today including this one.
 * → [{ kind, amount }] (empty lines left out).
 */
function raceLines({ place, personalBest = false, racesToday = 1 }) {
  if (racesToday > GUARD.paidRacesPerDay) return [{ kind: 'race', amount: GUARD.coinsAfter }].filter((l) => l.amount > 0);
  const lines = [{ kind: 'race', amount: placeCoins(place) }];
  if (personalBest) lines.push({ kind: 'personal-best', amount: RACE.personalBest });
  return lines.filter((l) => l.amount > 0);
}

/**
 * Moves a player's balance and writes the ledger line, in one go. `amount` is
 * signed. With `mustCover` a spend that the balance can't cover changes nothing
 * and returns null. → { balance, ledgerId }.
 */
async function change(client, { userId, currency = 'coins', amount, kind, raceId = null, itemSlug = null, paymentId = null, note = null, actorId = null }, { mustCover = true } = {}) {
  if (!['coins', 'credits'].includes(currency)) throw new Error(`unknown currency ${currency}`);
  if (!KINDS.includes(kind)) throw new Error(`unknown ledger kind ${kind}`);
  if (!Number.isInteger(amount) || amount === 0) throw new Error('a ledger line moves a whole, non-zero amount');
  const { rows: [user] } = await client.query(
    `UPDATE users SET ${currency} = ${currency} + $2 WHERE id = $1 ${mustCover ? `AND ${currency} + $2 >= 0` : ''} RETURNING ${currency} AS balance`,
    [userId, amount],
  );
  if (!user) return null;
  const { rows: [line] } = await client.query(
    `INSERT INTO coin_ledger (user_id, currency, amount, kind, race_id, item_slug, payment_id, note, actor_id, balance_after)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [userId, currency, amount, kind, raceId, itemSlug, paymentId, note, actorId, user.balance],
  );
  return { balance: user.balance, ledgerId: line.id };
}

/** Spends coins or credits, or throws 400 when the balance can't cover it. */
async function spend(client, { currency = 'coins', price, ...line }) {
  if (!(price > 0)) throw new Error('a price is a positive amount');
  const done = await change(client, { ...line, currency, amount: -price });
  if (!done) throw badRequest(currency === 'coins' ? 'Not enough coins' : 'Not enough credits');
  return done;
}

/** The first ledger line of a new account: its starting coins. */
async function opening(client, userId, coins) {
  if (coins > 0) await client.query(
    `INSERT INTO coin_ledger (user_id, currency, amount, kind, balance_after) VALUES ($1, 'coins', $2, 'start', $2)`,
    [userId, coins],
  );
}

/**
 * Pays a finished race's human players: place, personal best, and on their
 * goal-th race of the day the daily goal and streak bonus. Writes each line to
 * the ledger and the total to race_entries.coins_awarded. → Map(entryId → lines).
 */
async function payRace(client, raceId, now = new Date()) {
  const today = dayKey(now);
  const { rows: humans } = await client.query(
    `SELECT e.id, e.user_id, e.finish_position, e.finish_time_ms, r.track_id
       FROM race_entries e JOIN races r ON r.id = e.race_id
      WHERE e.race_id = $1 AND e.user_id IS NOT NULL`,
    [raceId],
  );
  const paid = new Map();
  for (const h of humans) {
    const { rows: [best] } = await client.query(
      `SELECT MIN(e.finish_time_ms) AS ms FROM race_entries e JOIN races r ON r.id = e.race_id
        WHERE e.user_id = $1 AND r.track_id = $2 AND r.status = 'finished' AND r.id <> $3 AND e.finish_time_ms IS NOT NULL`,
      [h.user_id, h.track_id, raceId],
    );
    const personalBest = best?.ms != null && h.finish_time_ms != null && h.finish_time_ms < best.ms;
    const { rows: [day] } = await client.query(
      `INSERT INTO user_days (user_id, day, races) VALUES ($1, $2, 1)
       ON CONFLICT (user_id, day) DO UPDATE SET races = user_days.races + 1
       RETURNING races, goal_met_at`,
      [h.user_id, today],
    );
    const lines = raceLines({ place: h.finish_position, personalBest, racesToday: day.races });
    if (day.races >= GOAL.races && !day.goal_met_at) {
      // (Dates as text: a JS Date would shift the day by the server's time zone.)
      const { rows: [u] } = await client.query('SELECT streak_days, streak_last_day::text AS last_day FROM users WHERE id = $1 FOR UPDATE', [h.user_id]);
      const days = streakAfter({ days: u.streak_days, lastDay: u.last_day }, today);
      await client.query('UPDATE users SET streak_days = $2, streak_last_day = $3 WHERE id = $1', [h.user_id, days, today]);
      await client.query('UPDATE user_days SET goal_met_at = $3 WHERE user_id = $1 AND day = $2', [h.user_id, today, now]);
      const bonus = goalBonus(days);
      lines.push({ kind: 'daily-goal', amount: bonus.goal }, { kind: 'streak', amount: bonus.streak, note: `day ${days}` });
    }
    for (const l of lines) await change(client, { userId: h.user_id, amount: l.amount, kind: l.kind, raceId, note: l.note ?? null });
    const total = lines.reduce((n, l) => n + l.amount, 0);
    await client.query('UPDATE race_entries SET coins_awarded = $2 WHERE id = $1', [h.id, total]);
    paid.set(h.id, lines);
  }
  return paid;
}

/** A player's day: races today, the goal, the streak (alive if the goal was met today or yesterday), and the next bonus. */
async function today(db, userId, now = new Date()) {
  const day = dayKey(now);
  const { rows: [u] } = await db.query(
    `SELECT u.coins, u.credits, u.streak_days, u.streak_last_day::text AS last_day, d.races, d.goal_met_at
       FROM users u LEFT JOIN user_days d ON d.user_id = u.id AND d.day = $2 WHERE u.id = $1`,
    [userId, day],
  );
  if (!u) throw notFound('No such player');
  const last = u.last_day;
  const alive = last === day || last === dayBefore(day);
  const streak = alive ? u.streak_days : 0;
  const nextDays = last === day ? streak : streakAfter({ days: u.streak_days, lastDay: last }, day);
  return {
    day,
    coins: u.coins,
    credits: u.credits,
    races: u.races ?? 0,
    goal: { races: GOAL.races, met: Boolean(u.goal_met_at), bonus: goalBonus(nextDays) },
    streak: { days: streak, metToday: last === day, maxDays: STREAK.maxDays },
    paidRacesLeft: Math.max(0, GUARD.paidRacesPerDay - (u.races ?? 0)),
  };
}

/** Buys a coin pack with credits. → { coins, credits }. */
async function buyCoinPack(client, userId, packId) {
  const pack = economy.coinPacks.find((p) => p.id === packId);
  if (!pack) throw notFound('No such coin pack');
  const paid = await spend(client, { userId, currency: 'credits', price: pack.credits, kind: 'coin-pack', note: pack.id });
  const got = await change(client, { userId, currency: 'coins', amount: pack.coins, kind: 'coin-pack', note: pack.id });
  return { credits: paid.balance, coins: got.balance };
}

module.exports = { economy, KINDS, EARNED, placeCoins, dayKey, dayBefore, streakAfter, goalBonus, raceLines, change, spend, opening, payRace, today, buyCoinPack };
