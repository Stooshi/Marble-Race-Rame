'use strict';

/**
 * Seasons and the season pass (the seasons, season_passes and tracks.season_key tables).
 *
 * A season's tracks are raced, by the season's own dates:
 *   before starts_at              by nobody (the tracks may be switched on already);
 *   from starts_at to free_from   by pass holders, and by everyone in a friend room whose host has the pass;
 *   from free_from                by everyone, free (they join the random pick like any track).
 * The server checks this on every request that puts a marble on a track (trackAccess), not only in
 * the pickers. The random pick for public races never picks a locked season track; pass holders get
 * "Holiday races" (pickSeasonTrack) instead.
 *
 * The Track of the Day: seasons.featured maps the season's calendar days (in its time zone) to a
 * track slug. On it, a pass holder's full-pay races pay featured_bonus × the race's coins as an
 * extra ledger line ('featured-bonus'), which never counts on the scoreboards (bonusLine).
 *
 * The pass is bought with real money only (src/payments: Stripe, Google Play; Apple later), once per
 * player and season; a full refund or a chargeback revokes it (revokeForPayment).
 */

const { HttpError } = require('../utils/httpError');
const reminders = require('./reminders');
const reminderMail = require('./reminderMail');

const CACHE_MS = 60_000;
let cache = null; // { at, seasons }

/** Every season (cached for a minute: they change by data update only). */
async function all(db, { fresh = false } = {}) {
  if (!fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.seasons;
  const { rows } = await db.query(
    `SELECT key, name, starts_at, ends_at, free_from, time_zone, pass_product_id, pass_name, price_cents, currency,
            pass_sale_starts_at, pass_sale_ends_at, featured, featured_bonus::float AS featured_bonus,
            badge_top, badges_awarded_at
       FROM seasons ORDER BY starts_at`,
  );
  cache = { at: Date.now(), seasons: rows };
  return rows;
}

/** Tests: forget the cached seasons. */
function forget() { cache = null; }

const at = (v) => new Date(v).getTime();

/** Where a season is at `now`: 'before' (locked for all), 'on' (pass holders), 'free' (everyone). */
function stateOf(season, now = new Date()) {
  const t = at(now);
  if (t < at(season.starts_at)) return 'before';
  if (t < at(season.free_from)) return 'on';
  return 'free';
}

/** The season's calendar day at `now`, in its own time zone: 'YYYY-MM-DD'. */
function dayOf(season, now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: season.time_zone || 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
}

/** The Track of the Day's slug (null outside the season, or on a day without one). */
function featuredSlug(season, now = new Date()) {
  if (stateOf(season, now) !== 'on') return null;
  return season.featured?.[dayOf(season, now)] ?? null;
}

/**
 * Whether the pass is on sale at `now` (a season without a pass never is). `early`: a test purchase
 * (Apple sandbox or TestFlight, a Google Play licence tester, Stripe in test mode) by a tester, which
 * may come before the sale starts, so App Review and our testers can buy it; never after it ends.
 */
function passOnSale(season, now = new Date(), { early = false } = {}) {
  if (!season.pass_product_id) return false;
  const t = at(now);
  if (!early && season.pass_sale_starts_at && t < at(season.pass_sale_starts_at)) return false;
  return t < at(season.pass_sale_ends_at ?? season.free_from);
}

/**
 * The pass's pre-sale: on sale before the season starts (from pass_sale_starts_at to starts_at). A
 * pre-sale pass is the player's at once (and its season marble), but its tracks, the Track of the Day
 * and holiday rooms open only at starts_at, as for everyone; until then a refund is given on request.
 */
function inPreSale(season, now = new Date()) {
  return passOnSale(season, now) && stateOf(season, now) === 'before';
}

/** "1 December": the season's first day, in its own time zone (the pass's "Activates 1 December"). */
function activatesText(season) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: season.time_zone || 'Europe/Stockholm', day: 'numeric', month: 'long' }).format(new Date(season.starts_at));
}

/** The accounts that may make test purchases of a pass before its sale starts: PASS_TESTERS, emails, comma-separated. */
function passTesters() {
  return new Set(String(process.env.PASS_TESTERS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean));
}

/** Is this account one of the pass's testers (PASS_TESTERS)? */
async function isPassTester(db, userId) {
  if (!userId) return false;
  const list = passTesters();
  if (!list.size) return false;
  const { rows: [u] } = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
  return Boolean(u?.email && list.has(String(u.email).toLowerCase()));
}

/** Whole days left to buy the pass, counted from 1 Jan (the countdown, "ends in N days"); null before then. */
function saleDaysLeft(season, now = new Date(), countdownFrom = null) {
  if (!passOnSale(season, now)) return null;
  const end = at(season.pass_sale_ends_at ?? season.free_from);
  if (countdownFrom && at(now) < at(countdownFrom)) return null;
  return Math.max(0, Math.ceil((end - at(now)) / 86400_000));
}

async function byKey(db, key) {
  return (await all(db)).find((s) => s.key === key) ?? null;
}

/** The season whose pass is this store product (null if none). */
async function byPassProduct(db, productId) {
  return (await all(db)).find((s) => s.pass_product_id === productId) ?? null;
}

/** Whether a player holds a season's pass (a live one: not revoked). */
async function hasPass(db, userId, seasonKey) {
  if (!userId || !seasonKey) return false;
  const { rows } = await db.query('SELECT 1 FROM season_passes WHERE user_id = $1 AND season_key = $2 AND revoked_at IS NULL', [userId, seasonKey]);
  return Boolean(rows[0]);
}

/** The seasons a player holds a live pass for: Set of keys. */
async function passesOf(db, userId) {
  if (!userId) return new Set();
  const { rows } = await db.query('SELECT season_key FROM season_passes WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
  return new Set(rows.map((r) => r.season_key));
}

const LOCKED_MESSAGE = (season) => `This track is in the ${season.name.replace(/ \d{4}$/, '')} pass`;
const BEFORE_MESSAGE = (season) => `This track opens with the ${season.name.replace(/ \d{4}$/, '')} on ${new Intl.DateTimeFormat('en-GB', { timeZone: season.time_zone, day: 'numeric', month: 'long' }).format(new Date(season.starts_at))}`;

/**
 * May `userId` race on a track? `track`: { season_key }. `roomHostId`: the host of the friend room the
 * race is in (a host with the pass opens the room's pass track to everyone in it).
 * → { ok: true } or { ok: false, reason: 'before'|'pass', message, season }.
 */
async function trackAccess(db, track, { userId = null, roomHostId = null, now = new Date() } = {}) {
  if (!track?.season_key) return { ok: true };
  const season = await byKey(db, track.season_key);
  if (!season) return { ok: true };
  const state = stateOf(season, now);
  if (state === 'free') return { ok: true };
  if (state === 'before') return { ok: false, reason: 'before', message: BEFORE_MESSAGE(season), season: season.key };
  if (await hasPass(db, userId, season.key)) return { ok: true };
  if (roomHostId && roomHostId !== userId && await hasPass(db, roomHostId, season.key)) return { ok: true, viaHost: true };
  return { ok: false, reason: 'pass', message: LOCKED_MESSAGE(season), season: season.key };
}

/** Throws 403 unless trackAccess allows it. */
async function assertTrackAccess(db, track, opts) {
  const access = await trackAccess(db, track, opts);
  if (!access.ok) {
    throw new HttpError(403, access.message, { code: access.reason === 'pass' ? 'season_pass_required' : 'season_not_started', season: access.season });
  }
  return access;
}

/** Season keys whose tracks the public random pick may use now (seasons that have gone free). */
async function freeSeasonKeys(db, now = new Date()) {
  return (await all(db)).filter((s) => stateOf(s, now) === 'free').map((s) => s.key);
}

/**
 * SQL for "an active track the public random pick may choose": ordinary tracks and the tracks of
 * seasons that have gone free. `param` is the placeholder holding freeSeasonKeys().
 */
const OPEN_TRACK_SQL = (param, alias = '') => `(${alias}season_key IS NULL OR ${alias}season_key = ANY(${param}::text[]))`;

/** An active track for the public random pick (never a locked season track) → id, or null. */
async function pickOpenTrack(client, now = new Date()) {
  const free = await freeSeasonKeys(client, now);
  const { rows } = await client.query(`SELECT id FROM tracks WHERE is_active AND ${OPEN_TRACK_SQL('$1')} ORDER BY random() LIMIT 1`, [free]);
  return rows[0]?.id ?? null;
}

/**
 * Holiday races: a random active track of the season (pass holders only; the caller checks). The
 * Track of the Day comes up one race in three. `random`: 0..1 (tests). → id, or null.
 */
async function pickSeasonTrack(client, season, { now = new Date(), random = Math.random } = {}) {
  const featured = featuredSlug(season, now);
  if (featured && random() < 1 / 3) {
    const { rows } = await client.query('SELECT id FROM tracks WHERE is_active AND season_key = $1 AND slug = $2', [season.key, featured]);
    if (rows[0]) return rows[0].id;
  }
  const { rows } = await client.query('SELECT id FROM tracks WHERE is_active AND season_key = $1 ORDER BY random() LIMIT 1', [season.key]);
  return rows[0]?.id ?? null;
}

/**
 * The Track of the Day bonus for one player's race: { kind: 'featured-bonus', amount, note } or null.
 * Only on the featured track, on a full-pay race (`lines`: the race's own coin lines, which after the
 * day's full races are the reduced rate, and then no bonus), for a pass holder.
 */
async function bonusLine(db, { userId, track, lines, fullPay, now = new Date() }) {
  if (!fullPay || !track?.season_key || !userId) return null;
  const season = await byKey(db, track.season_key);
  if (!season || featuredSlug(season, now) !== track.slug) return null;
  if (!(await hasPass(db, userId, season.key))) return null;
  const raceCoins = lines.filter((l) => l.kind === 'race' || l.kind === 'finish-bonus').reduce((n, l) => n + l.amount, 0);
  const amount = Math.round(raceCoins * season.featured_bonus);
  return amount > 0 ? { kind: 'featured-bonus', amount, note: `+${Math.round(season.featured_bonus * 100)}%, ${season.name} pass` } : null;
}

/**
 * A paid pass payment → the player's pass, once. A player who already holds the season's pass (bought
 * on another platform) keeps the one they have; the second payment is flagged in the audit log for
 * the back office to refund. → 'granted' | 'already-held'.
 */
async function grantForPayment(client, payment) {
  const { rows: [pass] } = await client.query(
    `INSERT INTO season_passes (user_id, season_key, payment_id, provider) VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, season_key) WHERE revoked_at IS NULL DO NOTHING RETURNING id`,
    [payment.user_id, payment.season_key, payment.id, payment.provider],
  );
  if (pass) {
    // The season's own marble comes with the pass (numbered in order: src/marbles/collection.js).
    await require('../marbles/collection').grantSeasonMarble(client, payment.user_id, payment.season_key);
    return 'granted';
  }
  await client.query(
    'INSERT INTO admin_audit (admin_id, action, target_user_id, reason, details) VALUES (NULL, $1, $2, $3, $4)',
    ['pass-duplicate', payment.user_id, 'A second season pass was paid for: refund it', JSON.stringify({ order_no: payment.order_no, payment_id: payment.id, season: payment.season_key })],
  );
  return 'already-held';
}

/** A pass payment refunded in full or disputed → its pass revoked (the tracks lock again until the season goes free). */
async function revokeForPayment(client, payment, reason) {
  const { rowCount } = await client.query(
    'UPDATE season_passes SET revoked_at = now(), revoke_reason = $2 WHERE payment_id = $1 AND revoked_at IS NULL',
    [payment.id, reason],
  );
  // The season marble goes with it, unless the player still holds the season's pass another way.
  if (rowCount > 0 && !(await hasPass(client, payment.user_id, payment.season_key))) {
    await require('../marbles/collection').takeBackSeasonMarble(client, payment.user_id, payment.season_key);
  }
  return rowCount > 0;
}

/**
 * Pass holders who have no season marble yet (passes granted before the marble was built) get it:
 * only for passes granted before the marble's edition closed (the season's end). → how many.
 */
async function grantMissingMarbles(db, now = new Date()) {
  const { passMarbleOf } = require('../marbles/catalog');
  const collection = require('../marbles/collection');
  let n = 0;
  for (const s of await all(db)) {
    const item = passMarbleOf(s.key);
    if (!item) continue;
    const { rows } = await db.query(
      `SELECT p.user_id FROM season_passes p
        WHERE p.season_key = $1 AND p.revoked_at IS NULL AND p.granted_at < $3
          AND NOT EXISTS (SELECT 1 FROM user_collection c WHERE c.user_id = p.user_id AND c.item_slug = $2)
        ORDER BY p.granted_at`,
      [s.key, item.slug, item.saleEndsAt ? new Date(item.saleEndsAt) : now],
    );
    for (const r of rows) {
      await db.withTransaction((client) => collection.grantSeasonMarble(client, r.user_id, s.key));
      n += 1;
    }
  }
  return n;
}

/** How many of a season's tracks are switched on. */
async function trackCount(db, key) {
  const { rows: [r] } = await db.query('SELECT COUNT(*)::int AS n FROM tracks WHERE season_key = $1 AND is_active', [key]);
  return r.n;
}

/** What the client shows about a season, for `userId` (null: signed out). */
async function view(db, season, userId = null, now = new Date()) {
  const state = stateOf(season, now);
  const featured = featuredSlug(season, now);
  const open = passOnSale(season, now);
  // A tester sees the pass on sale before its sale starts (a test purchase only: the server refuses a real one).
  const testerEarly = Boolean(season.pass_product_id) && !open && passOnSale(season, now, { early: true }) && await isPassTester(db, userId);
  return {
    key: season.key,
    name: season.name,
    startsAt: season.starts_at,
    endsAt: season.ends_at,
    freeFrom: season.free_from,
    state,
    today: state === 'on' ? dayOf(season, now) : null,
    // How many of its tracks are switched on (the pass page's "31 holiday tracks").
    trackCount: await trackCount(db, season.key),
    featured: featured ? { slug: featured, bonus: season.featured_bonus } : null,
    pass: season.pass_product_id ? {
      productId: season.pass_product_id,
      name: season.pass_name,
      priceCents: season.price_cents,
      currency: season.currency.toUpperCase(),
      onSale: open || testerEarly,
      testPurchaseOnly: testerEarly,
      saleStartsAt: season.pass_sale_starts_at,
      // Bought before the season starts, it activates then ("Activates 1 December", with a countdown).
      activatesAt: season.starts_at,
      preSale: state === 'before',
      saleEndsAt: season.pass_sale_ends_at ?? season.free_from,
      // The "ends in N days" countdown, shown from the start of the season's last month (1 Jan).
      endsInDays: saleDaysLeft(season, now, lastMonthStart(season)),
      owned: await hasPass(db, userId, season.key),
      // "Remind me when sales open" (before the sale only): may one be asked for, and this player's.
      remindersOpen: reminders.open(season, now),
      reminder: await reminders.ofPlayer(db, userId, season.key),
      // The in-game "on sale now" notice for a player who asked to be reminded (only once sending is on).
      onSaleNotice: await reminderMail.noticeFor(db, season, userId, now),
    } : null,
  };
}

/** The first day of the month the pass sale ends in, at midnight in the season's time zone (1 Jan 2027). */
function lastMonthStart(season) {
  const zone = season.time_zone || 'Europe/Stockholm';
  const [y, m] = dayOf(season, new Date(season.pass_sale_ends_at ?? season.free_from)).split('-').map(Number);
  // Midnight in the zone: UTC midnight less the zone's offset at that moment.
  const utc = Date.UTC(y, m - 1, 1);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })
    .formatToParts(new Date(utc)).map((p) => [p.type, Number(p.value)]));
  const offset = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute) - utc;
  return new Date(utc - offset);
}

/**
 * The scoreboard's season at `now`: the season that is on, or else the one that ended last (its
 * final standings stay on the board until the next season starts); null before the first one.
 * → { key, name, startsAt, endsAt, badgeTop, ended } or null.
 */
async function scoreboardSeason(db, now = new Date()) {
  const t = at(now);
  const list = await all(db);
  const on = list.find((s) => at(s.starts_at) <= t && t < at(s.ends_at));
  const last = list.filter((s) => at(s.ends_at) <= t).sort((a, b) => at(b.ends_at) - at(a.ends_at))[0];
  const s = on ?? last;
  if (!s) return null;
  return { key: s.key, name: s.name, startsAt: new Date(s.starts_at).toISOString(), endsAt: new Date(s.ends_at).toISOString(), badgeTop: s.badge_top ?? 100, ended: !on };
}

/**
 * The season's final standings: players ranked by coins earned in the season (the earned ledger
 * kinds only; money never buys a place), ties to who reached their total first. Deleted and
 * suspended accounts are left out. → [{ userId, coins, reachedAt, rank }].
 */
async function standings(db, season, { limit = null, earned }) {
  const { rows } = await db.query(
    `SELECT l.user_id, SUM(l.amount)::int AS coins, MAX(l.created_at) AS reached_at
       FROM coin_ledger l JOIN users u ON u.id = l.user_id AND u.deleted_at IS NULL AND u.suspended_at IS NULL
      WHERE l.kind = ANY($1::text[]) AND l.created_at >= $2 AND l.created_at < $3
      GROUP BY l.user_id
     HAVING SUM(l.amount) > 0
      ORDER BY coins DESC, reached_at ASC, l.user_id
      ${limit ? 'LIMIT $4' : ''}`,
    [earned, season.starts_at, season.ends_at, ...(limit ? [limit] : [])],
  );
  return rows.map((r, i) => ({ userId: r.user_id, coins: r.coins, reachedAt: r.reached_at, rank: i + 1 }));
}

/**
 * The season-end job for one season: once it has ended, the top badge_top players by its final
 * standings get its badge (user_badges, badge_key = the season's key, with their rank), once.
 * → how many badges were given (0 if not ended or done before).
 */
async function awardBadges(db, seasonKey, { now = new Date(), earned } = {}) {
  const given = await db.withTransaction(async (client) => {
    const { rows: [s] } = await client.query('SELECT * FROM seasons WHERE key = $1 FOR UPDATE', [seasonKey]);
    if (!s || s.badges_awarded_at || at(now) < at(s.ends_at)) return 0;
    const top = s.badge_top > 0 ? await standings(client, s, { limit: s.badge_top, earned }) : [];
    for (const r of top) {
      await client.query(
        'INSERT INTO user_badges (user_id, badge_key, rank, awarded_at) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, badge_key) DO NOTHING',
        [r.userId, s.key, r.rank, now],
      );
    }
    await client.query('UPDATE seasons SET badges_awarded_at = $2 WHERE key = $1', [s.key, now]);
    return top.length;
  });
  if (given) forget();
  return given;
}

/** A player's badges (newest first): [{ key, name, rank, awardedAt }]. */
async function badgesOf(db, userId) {
  const { rows } = await db.query(
    `SELECT b.badge_key AS key, COALESCE(s.name, b.badge_key) AS name, b.rank, b.awarded_at
       FROM user_badges b LEFT JOIN seasons s ON s.key = b.badge_key
      WHERE b.user_id = $1 ORDER BY b.awarded_at DESC`,
    [userId],
  );
  return rows.map((r) => ({ key: r.key, name: r.name, rank: r.rank, awardedAt: r.awarded_at }));
}

/**
 * Every hour: give the season marble to any pass holder still without it, award the badges of
 * seasons that have ended (nothing to deploy on the night), and delete pass reminders that were
 * cancelled or whose sale opened 30 days ago. Started by src/server.js.
 */
function startJobs(db, { earned }) {
  const run = async () => {
    try {
      const given = await grantMissingMarbles(db);
      if (given) console.log(`[seasons] ${given} season marble(s) given to pass holders`);
    } catch (err) { console.error(`[seasons] marble job: ${err.message}`); }
    try {
      for (const s of await all(db, { fresh: true })) {
        if (!s.badges_awarded_at && Date.now() >= at(s.ends_at)) {
          const n = await awardBadges(db, s.key, { earned });
          console.log(`[seasons] ${s.name} ended: ${n} badge(s) awarded`);
        }
      }
    } catch (err) { console.error(`[seasons] badge job: ${err.message}`); }
    try {
      const gone = await reminders.purge(db);
      if (gone) console.log(`[seasons] ${gone} pass reminder(s) deleted`);
    } catch (err) { console.error(`[seasons] reminder clean-up: ${err.message}`); }
  };
  setTimeout(run, 60_000).unref?.();
  reminderMail.start(db, () => all(db, { fresh: true }));
  const timer = setInterval(run, 3600_000);
  timer.unref?.();
  return timer;
}

module.exports = {
  scoreboardSeason, standings, awardBadges, badgesOf, startJobs,
  all, forget, stateOf, dayOf, featuredSlug, passOnSale, inPreSale, activatesText, isPassTester, saleDaysLeft, lastMonthStart, byKey, byPassProduct, hasPass, passesOf,
  trackAccess, assertTrackAccess, freeSeasonKeys, OPEN_TRACK_SQL, pickOpenTrack, pickSeasonTrack, bonusLine,
  grantForPayment, revokeForPayment, grantMissingMarbles, view,
};
