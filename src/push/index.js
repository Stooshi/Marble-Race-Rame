'use strict';

/**
 * Push notifications in the iPhone and Android apps (Moses, 21 Oct 2026; app plan step 5).
 *
 * Built switched off:
 *   - the apps ask for permission only once client/src/shared/push.json is on, and then only after
 *     the player's first finished race (never at first launch: client/src/app/push.js);
 *   - the server sends only with PUSH_SENDING=on and the store keys set (./transports.js); until then
 *     every send is a dry run that logs what it would have sent and records nothing.
 *
 * The messages (./messages below):
 *   - pass-sale      the season pass on sale (28 Nov)      season news: marketing
 *   - season-start   the season starts (1 Dec)             season news: marketing
 *   - room-invite    a friend invites you to their room    on by default, from someone you've raced in a room with
 *   - daily-goal     your daily goal isn't done yet        off by default; once a day
 * Marketing (season news) is off until the player turns it on (Settings → Notifications, or the
 * question after the first race), and is never sent to guests or under-13s, whatever is stored.
 */
const { shownName } = require('../names/shown');
const settings = require('../../client/src/shared/push.json');
const transports = require('./transports');

const sendingOn = () => process.env.PUSH_SENDING === 'on';

const dayMonth = (t, tz = 'Europe/Stockholm') => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: tz });

const MESSAGES = {
  'pass-sale': ({ season }) => ({ title: `The ${season.pass_name || `${season.name} pass`} is on sale`, body: `Get it now: it unlocks on ${dayMonth(season.starts_at, season.time_zone || undefined)} with every season track and the season marble.`, url: `/pass?season=${season.key}`, channel: 'news' }),
  'season-start': ({ season }) => ({ title: `${season.name} has started`, body: 'The season tracks are open. Race today\'s Track of the Day!', url: '/home', channel: 'news' }),
  'room-invite': ({ host, code }) => ({ title: `${host} invites you to race`, body: `Join their friend room ${code} now.`, url: `/r/${code}`, channel: 'friends', urgent: true, ttlSeconds: 1800, collapse: `room-${code}` }),
  'daily-goal': ({ left }) => ({ title: 'Your daily goal is waiting', body: `${left} more race${left === 1 ? '' : 's'} today for your daily goal coins.`, url: '/home', channel: 'reminders', collapse: 'daily-goal' }),
};
const MARKETING = new Set(['pass-sale', 'season-start']);
const PREF_OF = { 'pass-sale': 'season_news', 'season-start': 'season_news', 'room-invite': 'room_invites', 'daily-goal': 'daily_goal' };

/** Whether a player may get marketing pushes at all: a saved account, not under 13. */
const marketingAllowed = (u) => Boolean(u && !u.is_guest && u.age_group !== 'under-13' && !u.deleted_at);

async function preferencesOf(db, userId) {
  const { rows: [u] } = await db.query(
    `SELECT u.is_guest, u.age_group, u.deleted_at, p.room_invites, p.season_news, p.daily_goal,
            (SELECT COUNT(*)::int FROM push_devices d WHERE d.user_id = u.id AND d.disabled_at IS NULL) AS devices
       FROM users u LEFT JOIN push_preferences p ON p.user_id = u.id WHERE u.id = $1`,
    [userId],
  );
  if (!u) return null;
  const allowed = marketingAllowed(u);
  return {
    roomInvites: u.room_invites ?? true,
    seasonNews: allowed && (u.season_news ?? false),
    dailyGoal: u.daily_goal ?? false,
    seasonNewsAllowed: allowed,
    devices: u.devices,
  };
}

/** Changes the player's switches (only those given). Season news can't be turned on by a guest or an under-13. */
async function setPreferences(db, userId, { roomInvites, seasonNews, dailyGoal }) {
  const now = await preferencesOf(db, userId);
  if (!now) return null;
  const next = {
    room_invites: roomInvites ?? now.roomInvites,
    season_news: now.seasonNewsAllowed ? (seasonNews ?? now.seasonNews) : false,
    daily_goal: dailyGoal ?? now.dailyGoal,
  };
  await db.query(
    `INSERT INTO push_preferences (user_id, room_invites, season_news, daily_goal, season_news_at, updated_at)
     VALUES ($1, $2, $3, $4, CASE WHEN $3 THEN now() END, now())
     ON CONFLICT (user_id) DO UPDATE SET room_invites = $2, season_news = $3, daily_goal = $4, updated_at = now(),
       season_news_at = CASE WHEN $3 AND NOT push_preferences.season_news THEN now() WHEN $3 THEN push_preferences.season_news_at END`,
    [userId, next.room_invites, next.season_news, next.daily_goal],
  );
  return preferencesOf(db, userId);
}

/** A phone's token for this account (a token moves to whoever logged in on that phone last). */
async function registerDevice(db, userId, { token, platform, appId = null, appVersion = null }) {
  await db.query(
    `INSERT INTO push_devices (user_id, platform, token, app_id, app_version) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (token) DO UPDATE SET user_id = $1, platform = $2, app_id = $4, app_version = $5, last_seen_at = now(), disabled_at = NULL, disabled_why = NULL`,
    [userId, platform, token, appId, appVersion],
  );
}

/** Logging out on a phone: its token stops getting this account's messages. */
async function forgetDevice(db, userId, token) {
  const { rowCount } = await db.query('DELETE FROM push_devices WHERE user_id = $1 AND token = $2', [userId, token]);
  return rowCount > 0;
}

/**
 * Sends one message to one player's phones, once per `key`, if their switch allows it.
 * → { sent: bool, why?, devices, delivered, dryRun? }.
 */
async function sendTo(db, userId, kind, vars, key) {
  const make = MESSAGES[kind];
  if (!make) throw new Error(`unknown push ${kind}`);
  const prefs = await preferencesOf(db, userId);
  if (!prefs) return { sent: false, why: 'no-user' };
  if (MARKETING.has(kind) && !prefs.seasonNewsAllowed) return { sent: false, why: 'marketing-not-allowed' };
  const pref = { season_news: prefs.seasonNews, room_invites: prefs.roomInvites, daily_goal: prefs.dailyGoal }[PREF_OF[kind]];
  if (!pref) return { sent: false, why: 'switched-off' };
  const { rows: devices } = await db.query('SELECT id, platform, token, app_id FROM push_devices WHERE user_id = $1 AND disabled_at IS NULL', [userId]);
  if (!devices.length) return { sent: false, why: 'no-device' };
  const msg = { ...make(vars), kind };
  if (!sendingOn()) {
    console.log(`[push] DRY RUN ${kind} → ${userId} (${devices.length} device${devices.length === 1 ? '' : 's'}): ${msg.title}`);
    return { sent: false, why: 'dry-run', dryRun: true, devices: devices.length, delivered: 0 };
  }
  // Claimed first, so two servers or a retry never send it twice.
  const { rows: [claim] } = await db.query(
    'INSERT INTO push_sends (user_id, kind, key, devices) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, key) DO NOTHING RETURNING id',
    [userId, kind, key, devices.length],
  );
  if (!claim) return { sent: false, why: 'already-sent' };
  let delivered = 0;
  for (const d of devices) {
    let r;
    try { r = await transports.send(d, msg); } catch (e) { r = { ok: false, error: e.message }; }
    if (r.ok) delivered += 1;
    else if (r.gone) await db.query('UPDATE push_devices SET disabled_at = now(), disabled_why = $2 WHERE id = $1', [d.id, String(r.error).slice(0, 64)]);
    else console.error(`[push] ${kind} to device ${d.id} failed: ${r.error}`);
  }
  await db.query('UPDATE push_sends SET delivered = $2 WHERE id = $1', [claim.id, delivered]);
  return { sent: true, devices: devices.length, delivered };
}

// ── Friend room invites ───────────────────────────────────────────────────

/**
 * Players the host may invite: anyone who has raced in a friend room with them in the last 30 days
 * (they joined with a code, so they know each other), with saved names only. → [{ userId, username }].
 */
async function invitable(db, hostId) {
  const { rows } = await db.query(
    `SELECT DISTINCT u.id AS user_id, u.username, u.display_name, u.is_guest
       FROM race_entries mine
       JOIN races r ON r.id = mine.race_id AND r.room_id IS NOT NULL AND r.created_at > now() - interval '30 days'
       JOIN race_entries other ON other.race_id = mine.race_id AND other.user_id IS NOT NULL AND other.user_id <> mine.user_id
       JOIN users u ON u.id = other.user_id AND u.deleted_at IS NULL AND u.suspended_at IS NULL
      WHERE mine.user_id = $1
      ORDER BY u.username LIMIT 50`,
    [hostId],
  );
  // (The name the room shows: the one they gave, else the username; a guest's short and readable.)
  const name = (u) => shownName(u);
  return rows.map((r) => ({ userId: r.user_id, name: name(r) }));
}

/** The host invites someone to their room (one push per room and friend, at most every 10 minutes). */
async function inviteToRoom(db, { host, hostName, room, userId }) {
  const ok = (await invitable(db, host.id)).some((f) => f.userId === userId);
  if (!ok) return { sent: false, why: 'not-a-room-friend' };
  const slot = Math.floor(Date.now() / (10 * 60_000));
  return sendTo(db, userId, 'room-invite', { host: hostName || host.username, code: room.code }, `room-invite:${room.code}:${host.id}:${slot}`);
}

// ── Scheduled messages ────────────────────────────────────────────────────

const AUDIENCE = `SELECT u.id FROM users u JOIN push_preferences p ON p.user_id = u.id
                   WHERE p.season_news AND NOT u.is_guest AND u.deleted_at IS NULL AND u.suspended_at IS NULL
                     AND coalesce(u.age_group, '') <> 'under-13'
                     AND EXISTS (SELECT 1 FROM push_devices d WHERE d.user_id = u.id AND d.disabled_at IS NULL)`;

/** Season news: the pass on sale and the season start, each within 6 hours of its moment. → how many sent. */
async function seasonNews(db, now = new Date()) {
  const seasons = require('../seasons');
  let n = 0;
  for (const s of await seasons.all(db)) {
    const moments = [['pass-sale', s.pass_sale_starts_at], ['season-start', s.starts_at]];
    for (const [kind, at] of moments) {
      if (!at) continue;
      const t = new Date(at).getTime();
      if (now.getTime() < t || now.getTime() > t + 6 * 3600_000) continue;
      if (kind === 'pass-sale' && !s.pass_product_id) continue;
      const { rows } = await db.query(`${AUDIENCE} AND NOT EXISTS (SELECT 1 FROM push_sends x WHERE x.user_id = u.id AND x.key = $1)`, [`${kind}:${s.key}`]);
      for (const r of rows) if ((await sendTo(db, r.id, kind, { season: s }, `${kind}:${s.key}`)).sent) n += 1;
    }
  }
  return n;
}

/** The daily goal reminder (opted in only): players who raced in the last week and haven't met today's goal. */
async function dailyGoal(db, now = new Date()) {
  if (now.getUTCHours() !== settings.dailyGoalHourUtc) return 0;
  const goal = require('../../client/src/shared/economy.json').dailyGoal;
  const day = now.toISOString().slice(0, 10);
  const { rows } = await db.query(
    `SELECT u.id, coalesce(t.races, 0) AS races FROM users u
       JOIN push_preferences p ON p.user_id = u.id AND p.daily_goal
       LEFT JOIN user_days t ON t.user_id = u.id AND t.day = $1::date
      WHERE u.deleted_at IS NULL AND u.suspended_at IS NULL AND t.goal_met_at IS NULL
        AND EXISTS (SELECT 1 FROM user_days w WHERE w.user_id = u.id AND w.day > $1::date - 7)
        AND EXISTS (SELECT 1 FROM push_devices d WHERE d.user_id = u.id AND d.disabled_at IS NULL)`,
    [day],
  );
  let n = 0;
  for (const r of rows) {
    const left = Math.max(1, (goal.races ?? 5) - r.races);
    if ((await sendTo(db, r.id, 'daily-goal', { left }, `daily-goal:${day}`)).sent) n += 1;
  }
  return n;
}

let timer = null;
/** Every 10 minutes: season news and the daily goal reminder (dry runs until PUSH_SENDING=on). */
function startJobs(db) {
  if (timer) return;
  const tick = async () => {
    try {
      const a = await seasonNews(db);
      const b = await dailyGoal(db);
      if (a || b) console.log(`[push] sent: season news ${a}, daily goal ${b}`);
    } catch (e) { console.error(`[push] job failed: ${e.message}`); }
  };
  timer = setInterval(tick, 10 * 60_000);
  timer.unref?.();
  const c = transports.configured();
  console.log(`[push] ${sendingOn() ? 'sending ON' : 'sending off (dry run)'}; Android keys ${c.android ? 'set' : 'missing'}, iPhone keys ${c.ios ? 'set' : 'missing'}`);
}

module.exports = {
  MESSAGES, MARKETING, marketingAllowed, preferencesOf, setPreferences, registerDevice, forgetDevice, sendTo,
  invitable, inviteToRoom, seasonNews, dailyGoal, startJobs, sendingOn,
};
