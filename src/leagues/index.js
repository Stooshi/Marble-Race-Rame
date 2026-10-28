'use strict';

/**
 * Leagues (Leagues v1, part 1, 27 Oct 2026; plan: project doc claude/leagues-v1-build-plan.md).
 *
 * A league is a player's own competition with friends: its tracks (5 for a League), how long it runs
 * (1 to 7 days) and how many tries each track allows (unlimited, 3, 5 or 10). Members race the
 * tracks as solo races (a league race: races.league_id); a member's best time on each track counts;
 * their total is the sum of the bests, ranked once every track is done. The fastest total wins; on
 * the same total, the one who set it first ranks higher. When the league ends the scoreboard is
 * frozen (league_members.final_place / final_total_ms).
 *
 * Saved accounts only (guests are offered "Save my marble" first). At most OPEN_PER_CREATOR open
 * leagues per creator; any number joined. Holiday tracks: only a pass holder can add them; members
 * race them inside the league without the pass (as in rooms: the creator is the "host").
 * League races pay coins like any race (they go through the ordinary payout, src/economy) and count
 * toward the daily full-pay races.
 *
 * Behind the LEAGUES switch on Railway: off (the default: the API answers 404 and the site shows
 * nothing), admins (only admin accounts, to test in production) or on (everyone).
 *
 * Pro Leagues (kind 'pro'; Leagues part 2, behind LEAGUES_PRO: ./pro.js): 10 tracks (PRO_TRACKS), paid
 * by the creator only, 2 credits (src/credits PRO_LEAGUE) or nothing with a running Pro pass
 * (leagues.paid_with), taken in the same transaction as the create; members join free; Run again pays
 * again. feeds_major is true for Pro Leagues only. At the end (endDue): with at least MIN_RANKED ranked
 * players (saved accounts that finished every track; computer players are never members) the winner
 * gets the league marble, Racing Stripes, once (src/marbles grantLeagueMarble; every win counts as
 * League wins), else leagues.no_winner_reason = 'too_few_finishers'; and one league_results row per
 * member (Pro only: never a League, solo, Quick race or room races). A Pro League's League Night writes
 * its own rows (kind 'night', ./night.js).
 */

const crypto = require('crypto');
const { HttpError, badRequest, conflict, forbidden, notFound } = require('../utils/httpError');
const seasons = require('../seasons');

const MODES = ['off', 'admins', 'on'];
const TRACKS = 5;            // a League's tracks
const PRO_TRACKS = 10;       // a Pro League's tracks
const KINDS = ['league', 'pro'];
const MIN_RANKED = 3;        // ranked players a Pro League needs for its winner's marble
const tracksFor = (kind) => (kind === 'pro' ? PRO_TRACKS : TRACKS);
const DAYS = [1, 7];         // how long a league runs
const CAPS = [null, 3, 5, 10]; // tries per track: unlimited, 3, 5 or 10
const OPEN_PER_CREATOR = 5;  // open leagues a player may have created at once
const MEMBERS = 50;          // members per league
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // (as rooms: no 0/O or 1/I)
const CODE_LENGTH = 6;

/** The LEAGUES switch: 'off' (default), 'admins' or 'on'. */
function mode(env = process.env) {
  const m = String(env.LEAGUES ?? 'off').trim().toLowerCase();
  return MODES.includes(m) ? m : 'off';
}

/** Whether leagues are open to this player (null: nobody signed in). */
function openFor(user, env = process.env) {
  const m = mode(env);
  if (m === 'on') return true;
  return m === 'admins' && user?.role === 'admin';
}

/** Throws 404 unless leagues are open to this player (switched off, the API isn't there at all). */
function assertOpen(user, env = process.env) {
  if (!openFor(user, env)) throw notFound('Not found');
}

function newCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) code += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return code;
}

/** "k7q-f2m", " K7QF2M " → "K7QF2M" (or null if it can't be a code). */
function normaliseCode(text) {
  const code = String(text ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return code.length === CODE_LENGTH && [...code].every((c) => ALPHABET.includes(c)) ? code : null;
}

/** Saved accounts only: a guest gets the "Save my marble" offer. */
async function assertSaved(db, userId) {
  const { rows: [u] } = await db.query('SELECT is_guest FROM users WHERE id = $1', [userId]);
  if (!u || u.is_guest) throw new HttpError(403, 'Leagues are for saved accounts. Save your marble first: it\'s free.', { code: 'save_account' });
}

/** The league by code (any status), or 404. */
async function byCode(db, code, { lock = false } = {}) {
  const c = normaliseCode(code);
  if (!c) throw notFound('No league with that code');
  const { rows: [league] } = await db.query(`SELECT * FROM leagues WHERE code = $1${lock ? ' FOR UPDATE' : ''}`, [c]);
  if (!league) throw notFound('No league with that code');
  return league;
}

/** Is this player a member (not removed)? */
async function isMember(db, leagueId, userId) {
  if (!userId) return false;
  const { rows } = await db.query('SELECT 1 FROM league_members WHERE league_id = $1 AND user_id = $2 AND removed_at IS NULL', [leagueId, userId]);
  return rows.length > 0;
}

/**
 * Checks a new league's settings → { trackIds, days, attemptCap, name }. Every track active and one
 * the creator may race now (a holiday track: the creator has the pass and the season is on).
 */
async function checkSettings(db, userId, body, kind = 'league') {
  const name = await checkName(body.name);
  const n = tracksFor(kind);
  const trackIds = Array.isArray(body.track_ids) ? body.track_ids : [];
  if (trackIds.length !== n) throw badRequest(`Pick ${n} tracks`);
  if (new Set(trackIds).size !== n) throw badRequest(`Pick ${n} different tracks`);
  if (!trackIds.every((t) => typeof t === 'string' && /^[0-9a-f-]{36}$/i.test(t))) throw badRequest(`Pick ${n} tracks`);
  const days = Number(body.days);
  if (!Number.isInteger(days) || days < DAYS[0] || days > DAYS[1]) throw badRequest('A league runs 1 to 7 days');
  const attemptCap = body.attempts === undefined || body.attempts === null ? null : Number(body.attempts);
  if (!CAPS.includes(attemptCap)) throw badRequest('Tries per track: unlimited, 3, 5 or 10');
  const { rows: tracks } = await db.query('SELECT id, slug, season_key FROM tracks WHERE id = ANY($1::uuid[]) AND is_active', [trackIds]);
  if (tracks.length !== n) throw badRequest('One of those tracks is not available');
  for (const t of tracks) await seasons.assertTrackAccess(db, t, { userId });
  return { trackIds, days, attemptCap, name };
}

/**
 * A league's name: 2 to 40 characters, spaces tidied, through the same filter as player names
 * (client/src/shared/nameFilter.js: 400 name_not_allowed). → the name.
 */
async function checkName(text) {
  const name = String(text ?? '').trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 40) throw badRequest('Give the league a name (2 to 40 characters)');
  await require('../names').assertAllowed({ name });
  return name;
}

/** The creator renames their league (Moses, 27 Oct 2026) → the league row. */
async function rename(client, league, userId, text) {
  if (league.created_by !== userId) throw forbidden('Only the league\'s creator can rename it');
  const name = await checkName(text);
  const { rows: [l] } = await client.query('UPDATE leagues SET name = $2 WHERE id = $1 RETURNING *', [league.id, name]);
  return l;
}

/**
 * Creates a League (5 tracks) or a Pro League (10 tracks, `kind: 'pro'`) with its creator as its first
 * member → the league row. A Pro League is paid here, in the caller's transaction: nothing with a
 * running Pro pass, else PRO_LEAGUE credits (402 not_enough_credits: nothing is created). The caller
 * checks Pro is open to the player (./pro.js).
 */
async function create(client, userId, body, { againOf = null, kind = 'league', now = new Date() } = {}) {
  if (!KINDS.includes(kind)) throw badRequest('A league is a League or a Pro League');
  await assertSaved(client, userId);
  const s = await checkSettings(client, userId, body, kind);
  const { rows: [{ n }] } = await client.query("SELECT COUNT(*)::int AS n FROM leagues WHERE created_by = $1 AND status = 'open'", [userId]);
  if (n >= OPEN_PER_CREATOR) throw conflict(`You can have ${OPEN_PER_CREATOR} leagues open at once. One has to end first.`);
  let league = null;
  for (let tries = 0; !league && tries < 8; tries += 1) {
    const { rows } = await client.query(
      `INSERT INTO leagues (code, kind, name, created_by, track_ids, attempt_cap, ends_at, again_of, feeds_major)
       VALUES ($1, $8::varchar, $2, $3, $4::uuid[], $5, now() + make_interval(days => $6), $7, $8::varchar = 'pro')
       ON CONFLICT (code) DO NOTHING RETURNING *`,
      [newCode(), s.name, userId, s.trackIds, s.attemptCap, s.days, againOf, kind],
    );
    league = rows[0] ?? null;
  }
  if (!league) throw new Error('Could not find a free league code');
  if (kind === 'pro') league = await payForPro(client, league, userId, now);
  await client.query('INSERT INTO league_members (league_id, user_id) VALUES ($1, $2)', [league.id, userId]);
  return league;
}

/**
 * The creator pays for a Pro League: with a running Pro pass nothing, else PRO_LEAGUE credits through
 * the credits ledger (src/credits: never from members, never in coins). → the league with paid_with.
 */
async function payForPro(client, league, userId, now = new Date()) {
  const credits = require('../credits');
  await client.query('SELECT 1 FROM users WHERE id = $1 FOR UPDATE', [userId]);
  const pass = await credits.activePass(client, userId, now);
  if (!pass) await credits.spend(client, { userId, price: credits.PRO_LEAGUE, kind: 'pro-league', leagueId: league.id, note: league.name });
  const { rows: [l] } = await client.query('UPDATE leagues SET paid_with = $2 WHERE id = $1 RETURNING *', [league.id, pass ? 'pass' : 'credits']);
  return l;
}

/** Joins a league (by its link or code). Idempotent for a member; a removed player can't come back. */
async function join(client, league, userId) {
  await assertSaved(client, userId);
  if (league.status !== 'open') throw conflict('This league has ended');
  const { rows: [m] } = await client.query('SELECT removed_at FROM league_members WHERE league_id = $1 AND user_id = $2', [league.id, userId]);
  if (m?.removed_at) throw forbidden('You were removed from this league');
  if (m) return false;
  const { rows: [{ n }] } = await client.query('SELECT COUNT(*)::int AS n FROM league_members WHERE league_id = $1 AND removed_at IS NULL', [league.id]);
  if (n >= MEMBERS) throw conflict(`This league is full (${MEMBERS} players)`);
  await client.query('INSERT INTO league_members (league_id, user_id) VALUES ($1, $2)', [league.id, userId]);
  return true;
}

/**
 * Tries used per track by one member → Map(trackId → count). A league race that was started is a
 * try; one cancelled, or left waiting in the lobby for more than STALE_LOBBY_MIN (the page closed
 * before it started), is not.
 */
const STALE_LOBBY_MIN = 10;
async function triesUsed(db, leagueId, userId) {
  const { rows } = await db.query(
    `SELECT lr.track_id, COUNT(*)::int AS n
       FROM league_runs lr JOIN races r ON r.id = lr.race_id
      WHERE lr.league_id = $1 AND lr.user_id = $2 AND r.status <> 'cancelled'
        AND NOT (r.status = 'lobby' AND r.created_at < now() - make_interval(mins => $3))
      GROUP BY lr.track_id`,
    [leagueId, userId, STALE_LOBBY_MIN],
  );
  return new Map(rows.map((r) => [r.track_id, r.n]));
}

/**
 * Starts a league race for a member: checks the league is running, the track is one of its tracks and
 * a try is left, then records the try (league_runs) for the race the caller has just created.
 */
async function assertCanRace(client, league, userId, trackId) {
  if (league.status !== 'open' || new Date(league.ends_at) <= new Date()) throw conflict('This league has ended');
  if (!(await isMember(client, league.id, userId))) throw forbidden('Join the league first');
  if (!league.track_ids.includes(trackId)) throw badRequest('That track is not in this league');
  if (league.attempt_cap) {
    const used = (await triesUsed(client, league.id, userId)).get(trackId) ?? 0;
    if (used >= league.attempt_cap) throw conflict(`No tries left on this track (${league.attempt_cap} per track)`);
  }
}

async function recordStart(client, league, userId, trackId, raceId) {
  await client.query('INSERT INTO league_runs (league_id, user_id, track_id, race_id) VALUES ($1, $2, $3, $4)', [league.id, userId, trackId, raceId]);
}

/**
 * A finished race (raceService.finalize, in its transaction): a league race's members get their time
 * on that track (the race counts if it was started before the league ended). Nothing else changes.
 */
async function recordRace(client, raceId) {
  await client.query(
    `UPDATE league_runs lr
        SET time_ms = e.finish_time_ms, finished_at = now()
       FROM race_entries e, races r
      WHERE lr.race_id = $1 AND r.id = lr.race_id AND e.race_id = lr.race_id AND e.user_id = lr.user_id
        AND e.finish_time_ms IS NOT NULL AND lr.time_ms IS NULL`,
    [raceId],
  );
}

/** A cancelled league race gives its try back. */
async function cancelRace(client, raceId) {
  await client.query('DELETE FROM league_runs WHERE race_id = $1 AND time_ms IS NULL', [raceId]);
}

/**
 * The scoreboard → [{ user_id, name, bests: { trackId: ms }, done, total_ms, set_at, place }],
 * ranked members first (by total, then who set it first), then the others by tracks done. An ended
 * league's frozen places are used as they were.
 */
async function scoreboard(db, league) {
  const { rows: members } = await db.query(
    `SELECT m.user_id, m.final_place, m.final_total_ms, u.username, u.display_name, u.country
       FROM league_members m JOIN users u ON u.id = m.user_id
      WHERE m.league_id = $1 AND m.removed_at IS NULL`,
    [league.id],
  );
  const { rows: runs } = await db.query(
    `SELECT lr.user_id, lr.track_id, MIN(lr.time_ms) AS best,
            (ARRAY_AGG(lr.finished_at ORDER BY lr.time_ms, lr.finished_at))[1] AS best_at,
            COUNT(*)::int AS tries
       FROM league_runs lr
       JOIN races r ON r.id = lr.race_id
      WHERE lr.league_id = $1 AND lr.time_ms IS NOT NULL AND r.created_at <= $2
      GROUP BY lr.user_id, lr.track_id`,
    [league.id, league.ends_at],
  );
  const byUser = new Map(members.map((m) => [m.user_id, { ...m, bests: {}, setAt: null }]));
  for (const r of runs) {
    const m = byUser.get(r.user_id);
    if (!m) continue;
    m.bests[r.track_id] = Number(r.best);
    const at = new Date(r.best_at).getTime();
    if (!m.setAt || at > m.setAt) m.setAt = at;
  }
  const list = [...byUser.values()].map((m) => {
    const done = league.track_ids.filter((t) => m.bests[t] !== undefined).length;
    const total = done === league.track_ids.length ? league.track_ids.reduce((s, t) => s + m.bests[t], 0) : null;
    return { user_id: m.user_id, username: m.username, display_name: m.display_name, country: m.country, bests: m.bests, done, total_ms: total, set_at: total !== null && m.setAt ? new Date(m.setAt).toISOString() : null, final_place: m.final_place };
  });
  list.sort((a, b) => {
    if ((a.total_ms === null) !== (b.total_ms === null)) return a.total_ms === null ? 1 : -1;
    if (a.total_ms !== null) return a.total_ms - b.total_ms || (a.set_at < b.set_at ? -1 : a.set_at > b.set_at ? 1 : 0);
    return b.done - a.done;
  });
  let place = 0;
  for (const r of list) r.place = r.total_ms !== null ? (place += 1) : null;
  if (league.status === 'ended') {
    for (const r of list) r.place = r.final_place ?? null;
    list.sort((a, b) => (a.place ?? 1e9) - (b.place ?? 1e9) || b.done - a.done);
  }
  return list;
}

/** Ends every league whose time is up: the scoreboard frozen. → how many ended. */
async function endDue(db, now = new Date()) {
  const { rows: due } = await db.query("SELECT id FROM leagues WHERE status = 'open' AND ends_at <= $1 ORDER BY ends_at LIMIT 100", [now]);
  for (const { id } of due) {
    await db.withTransaction(async (client) => {
      const { rows: [league] } = await client.query("SELECT * FROM leagues WHERE id = $1 AND status = 'open' FOR UPDATE", [id]);
      if (!league) return;
      const board = await scoreboard(client, league);
      for (const r of board) {
        await client.query('UPDATE league_members SET final_place = $3, final_total_ms = $4 WHERE league_id = $1 AND user_id = $2', [id, r.user_id, r.place, r.total_ms]);
      }
      await client.query("UPDATE leagues SET status = 'ended', ended_at = now() WHERE id = $1", [id]);
      if (league.kind === 'pro') await endPro(client, { ...league, ended_at: now }, board);
    });
  }
  return due.length;
}

/**
 * A Pro League's end (in endDue's transaction), from its frozen scoreboard: with at least MIN_RANKED
 * ranked players, the winner (place 1) gets the league marble (once: a second win counts as League
 * wins) and leagues.winner_id; else no_winner_reason 'too_few_finishers'. Then one league_results row
 * per member, written once (kind 'challenge'): the month it ended (Swedish time), their country at the
 * start of that month, place (null if not ranked), the ranked count, tracks finished, counted runs and
 * the days they raced in it. → { winnerId, reason, rows }.
 */
async function endPro(client, league, board) {
  const ranked = board.filter((r) => r.place !== null && r.place !== undefined);
  let winnerId = null;
  let reason = null;
  if (ranked.length >= MIN_RANKED) {
    winnerId = ranked.find((r) => r.place === 1)?.user_id ?? null;
    if (winnerId) await require('../marbles/collection').grantLeagueMarble(client, winnerId);
  } else reason = 'too_few_finishers';
  await client.query('UPDATE leagues SET winner_id = $2, no_winner_reason = $3 WHERE id = $1', [league.id, winnerId, reason]);
  const { rows: [{ month, from }] } = await client.query(
    `SELECT date_trunc('month', $1::timestamptz AT TIME ZONE 'Europe/Stockholm')::date AS month,
            date_trunc('month', $1::timestamptz AT TIME ZONE 'Europe/Stockholm') AT TIME ZONE 'Europe/Stockholm' AS "from"`,
    [league.ended_at ?? new Date()],
  );
  const { rows: activity } = await client.query(
    `SELECT lr.user_id, COUNT(*) FILTER (WHERE lr.time_ms IS NOT NULL)::int AS runs,
            COUNT(DISTINCT (lr.finished_at AT TIME ZONE 'Europe/Stockholm')::date) FILTER (WHERE lr.time_ms IS NOT NULL)::int AS days
       FROM league_runs lr JOIN races r ON r.id = lr.race_id
      WHERE lr.league_id = $1 AND r.created_at <= $2
      GROUP BY lr.user_id`,
    [league.id, league.ends_at],
  );
  const act = new Map(activity.map((a) => [a.user_id, a]));
  const { countryAt } = require('../country');
  for (const r of board) {
    const country = await countryAt(client, r.user_id, from);
    await client.query(
      `INSERT INTO league_results (league_id, user_id, kind, month, place, ranked_humans, tracks_finished, counted_runs, racing_days, country)
       VALUES ($1, $2, 'challenge', $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING`,
      [league.id, r.user_id, month, r.place ?? null, ranked.length, r.done, act.get(r.user_id)?.runs ?? 0, act.get(r.user_id)?.days ?? 0, country],
    );
  }
  return { winnerId, reason, rows: board.length };
}

/** Every 30 s: end the leagues whose time is up, and open the League Nights about to start (the switch only hides leagues; these run always). */
function startJobs(db, { everyMs = 30_000 } = {}) {
  const run = async () => {
    await endDue(db).catch((err) => console.error('[leagues] ending leagues failed:', err.message));
    // League Nights due within 15 minutes: their room opens, the first race set to start by itself.
    await require('./night').openDue(db).catch((err) => console.error('[leagues] opening League Night failed:', err.message));
  };
  run();
  const timer = setInterval(run, everyMs);
  timer.unref?.();
  return timer;
}

module.exports = {
  MODES, TRACKS, PRO_TRACKS, KINDS, MIN_RANKED, DAYS, CAPS, OPEN_PER_CREATOR, MEMBERS, tracksFor, payForPro, endPro,
  mode, openFor, assertOpen, normaliseCode, byCode, isMember, assertSaved, checkName, checkSettings, create, rename, join,
  triesUsed, assertCanRace, recordStart, recordRace, cancelRace, scoreboard, endDue, startJobs,
};
