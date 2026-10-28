'use strict';

/**
 * League Night (Leagues v1 part 1, slim; plan: project doc claude/leagues-v1-build-plan.md): the league
 * racing live, together. The creator sets a date and time inside the league's days and how many races
 * (3 to 5). OPEN_BEFORE_MIN before it, a league room opens: a friend room (rooms.league_night_id) that
 * only the league's players can join, the creator its host. Its races run one after another on the
 * league's tracks in order (the first race at the set time, each next one GAP_S after the one before
 * finishes), each starting by itself. Points for each place among the league's players: POINTS
 * (10-8-6-5-4-3-2-1 for the first eight), computer players score nothing. The night's scoreboard: most
 * points; on the same points, most race wins, then the better place in the last race.
 * League Night never uses tries (its races are room races, not league races) and never changes the
 * league's own scoreboard. Its races pay coins like any race.
 */
const { badRequest, conflict, forbidden, notFound } = require('../utils/httpError');

const RACES = [3, 5];
const POINTS = [10, 8, 6, 5, 4, 3, 2, 1];
const OPEN_BEFORE_MIN = 15;
const GAP_S = 90;            // from one race's finish to the next race's start: the results, then the start show
const RACE_ROOM_MIN = 4;     // the time a race takes with its start show and results, for "it must fit in the league"
const SOONEST_MIN = 5;       // a night is set at least this far ahead…
const NOW_LEAD_S = 120;      // …or started now: its room opens at once and race 1 starts by itself 2 minutes later (the host may start it sooner)

/** The night (scheduled or on, else the last one) of a league, or null. */
async function current(db, leagueId) {
  const { rows } = await db.query(
    `SELECT n.*, ro.code AS room_code FROM league_nights n LEFT JOIN rooms ro ON ro.id = n.room_id
      WHERE n.league_id = $1 ORDER BY (n.status IN ('scheduled', 'open')) DESC, n.created_at DESC LIMIT 1`,
    [leagueId],
  );
  return rows[0] ?? null;
}

/** The creator sets (or moves) the league's night: { starts_at, races } → the night row. */
async function schedule(client, league, userId, body, now = new Date()) {
  if (league.created_by !== userId) throw forbidden('Only the league\'s creator can set its League Night');
  if (league.status !== 'open') throw conflict('This league has ended');
  // `now: true`: League Night now (the creator's "Start League Night now"), else at `starts_at`.
  const at = body.now ? new Date(now.getTime() + NOW_LEAD_S * 1000) : new Date(body.starts_at);
  if (Number.isNaN(at.getTime())) throw badRequest('Pick a date and time for League Night');
  const races = Number(body.races);
  if (!Number.isInteger(races) || races < RACES[0] || races > RACES[1]) throw badRequest('League Night is 3 to 5 races');
  if (!body.now && at.getTime() < now.getTime() + SOONEST_MIN * 60_000) throw badRequest(`Set League Night at least ${SOONEST_MIN} minutes from now, or start it now`);
  if (at.getTime() + races * RACE_ROOM_MIN * 60_000 > new Date(league.ends_at).getTime()) throw badRequest('League Night has to finish before the league ends');
  const { rows: [live] } = await client.query("SELECT * FROM league_nights WHERE league_id = $1 AND status IN ('scheduled', 'open') FOR UPDATE", [league.id]);
  if (live?.status === 'open') throw conflict('League Night is already on');
  if (live) {
    const { rows: [n] } = await client.query('UPDATE league_nights SET starts_at = $2, races = $3 WHERE id = $1 RETURNING *', [live.id, at, races]);
    return n;
  }
  const { rows: [n] } = await client.query('INSERT INTO league_nights (league_id, starts_at, races) VALUES ($1, $2, $3) RETURNING *', [league.id, at, races]);
  return n;
}

/** The creator calls it off (before its first race has started). */
async function cancelNight(client, league, userId) {
  if (league.created_by !== userId) throw forbidden('Only the league\'s creator can call off League Night');
  const { rows: [n] } = await client.query("SELECT * FROM league_nights WHERE league_id = $1 AND status IN ('scheduled', 'open') FOR UPDATE", [league.id]);
  if (!n) throw notFound('No League Night is set');
  if (n.status === 'open') {
    const { rows: started } = await client.query("SELECT 1 FROM races WHERE league_night_id = $1 AND status <> 'lobby' AND status <> 'cancelled'", [n.id]);
    if (started.length) throw conflict('League Night has started: it ends after its last race');
    const { rows: lobby } = await client.query("UPDATE races SET status = 'cancelled', updated_at = now() WHERE league_night_id = $1 AND status = 'lobby' RETURNING id", [n.id]);
    for (const r of lobby) require('../game/raceManager').unscheduleStart(r.id);
    if (n.room_id) await client.query("UPDATE rooms SET status = 'closed' WHERE id = $1", [n.room_id]);
  }
  await client.query("UPDATE league_nights SET status = 'cancelled', ended_at = now() WHERE id = $1", [n.id]);
  return n;
}

/** Is this player in the league of this night (not removed)? */
async function isNightMember(db, nightId, userId) {
  const { rows } = await db.query(
    `SELECT 1 FROM league_nights n JOIN league_members m ON m.league_id = n.league_id AND m.user_id = $2 AND m.removed_at IS NULL
      WHERE n.id = $1`,
    [nightId, userId],
  );
  return rows.length > 0;
}

/** The track of race k (1-based) of a night: the league's tracks in order. */
const trackFor = (league, k) => league.track_ids[(k - 1) % league.track_ids.length];

/**
 * A night race waiting at the start in the night's room, starting by itself at `at` → the race id.
 * (Room races count down longer: the start show's flyover, in sync for everyone.)
 */
async function newNightRace(client, room, night, league, k, at) {
  const config = require('../config');
  const { rows: [r] } = await client.query(
    `INSERT INTO races (track_id, name, min_marbles, max_marbles, fill_with_bots, created_by, tick_rate_hz, countdown_ms, room_id, scheduled_at, league_night_id, league_night_race)
     VALUES ($1, $2, 20, 20, true, $3, $4, $5, $6, $7, $8, $9) RETURNING id, scheduled_at`,
    [trackFor(league, k), `${league.name}: League Night, race ${k} of ${night.races}`, league.created_by, config.game.tickRateHz,
      config.game.countdownMs + config.game.startShowMs, room.id, at, night.id, k],
  );
  await client.query('UPDATE rooms SET current_race_id = $2, track_id = $3, last_active_at = now() WHERE id = $1', [room.id, r.id, trackFor(league, k)]);
  return r;
}

/**
 * Opens the nights due within OPEN_BEFORE_MIN: their room and the first race, starting by itself at the
 * night's time. → the rooms opened [{ code, raceId, at, nightId, leagueId }].
 */
async function openDue(db, now = new Date()) {
  const { newCode } = require('../routes/rooms');
  const opened = [];
  const { rows: due } = await db.query(
    `SELECT n.id FROM league_nights n JOIN leagues l ON l.id = n.league_id
      WHERE n.status = 'scheduled' AND n.starts_at <= $1::timestamptz + make_interval(mins => $2::int) ORDER BY n.starts_at LIMIT 50`,
    [now, OPEN_BEFORE_MIN],
  );
  for (const { id } of due) {
    const made = await db.withTransaction(async (client) => {
      const { rows: [night] } = await client.query("SELECT * FROM league_nights WHERE id = $1 AND status = 'scheduled' FOR UPDATE", [id]);
      if (!night) return null;
      const { rows: [league] } = await client.query('SELECT * FROM leagues WHERE id = $1', [night.league_id]);
      if (league.status !== 'open') {
        await client.query("UPDATE league_nights SET status = 'cancelled', ended_at = now() WHERE id = $1", [id]);
        return null;
      }
      let room = null;
      for (let tries = 0; !room && tries < 8; tries += 1) {
        const { rows } = await client.query(
          `INSERT INTO rooms (code, host_id, track_id, is_public, kind, league_night_id) VALUES ($1, $2, $3, false, 'friends', $4)
           ON CONFLICT (code) DO NOTHING RETURNING *`,
          [newCode(), league.created_by, trackFor(league, 1), night.id],
        );
        room = rows[0] ?? null;
      }
      if (!room) throw new Error('Could not find a free room code');
      // (Opened late, e.g. after a restart: the first race no sooner than a minute from now.)
      const at = new Date(Math.max(new Date(night.starts_at).getTime(), now.getTime() + 60_000));
      const race = await newNightRace(client, room, night, league, 1, at);
      await client.query("UPDATE league_nights SET status = 'open', room_id = $2, opened_at = now() WHERE id = $1", [id, room.id]);
      return { code: room.code, raceId: race.id, at: race.scheduled_at, nightId: night.id, leagueId: league.id };
    });
    if (made) opened.push(made);
  }
  const raceManager = require('../game/raceManager');
  for (const o of opened) raceManager.scheduleStart(o.raceId, o.at);
  return opened;
}

/**
 * After a night race has finished (from the rooms' afterRace, in its transaction): the next race on the
 * next track, starting by itself GAP_S from now, or, after the last, the night is over and the room
 * closes. → { raceId, at } of the next race, or null.
 */
async function afterNightRace(client, room, finishedRaceId, now = new Date()) {
  const { rows: [night] } = await client.query('SELECT * FROM league_nights WHERE id = $1 FOR UPDATE', [room.league_night_id]);
  if (!night || night.status !== 'open') return null;
  const { rows: [{ k }] } = await client.query('SELECT league_night_race AS k FROM races WHERE id = $1', [finishedRaceId]);
  if (!k || k >= night.races) {
    await client.query("UPDATE league_nights SET status = 'done', ended_at = now() WHERE id = $1", [night.id]);
    await client.query("UPDATE rooms SET status = 'closed' WHERE id = $1", [room.id]);
    await writeResults(client, night.id);
    return null;
  }
  const { rows: [league] } = await client.query('SELECT * FROM leagues WHERE id = $1', [night.league_id]);
  return newNightRace(client, room, night, league, k + 1, new Date(now.getTime() + GAP_S * 1000));
}

/**
 * A night race that started with nobody in it (raceManager.startScheduled cancels it): the night is
 * over (done if a race was run, else called off for want of players) and its room closes.
 */
async function nobodyCame(db, nightId) {
  await db.query(
    `UPDATE league_nights SET ended_at = now(),
            status = CASE WHEN EXISTS (SELECT 1 FROM races WHERE league_night_id = $1 AND status = 'finished') THEN 'done' ELSE 'cancelled' END
      WHERE id = $1 AND status = 'open'`,
    [nightId],
  );
  await db.query("UPDATE rooms SET status = 'closed' WHERE league_night_id = $1", [nightId]);
  await writeResults(db, nightId);
}

/**
 * A Pro League's League Night is over (done): one league_results row per player who raced in it
 * (kind 'night'), with its place and points, written once. Never for a League's night.
 */
async function writeResults(db, nightId) {
  const { rows: [night] } = await db.query("SELECT * FROM league_nights WHERE id = $1 AND status = 'done'", [nightId]);
  if (!night) return 0;
  const { rows: [league] } = await db.query('SELECT * FROM leagues WHERE id = $1', [night.league_id]);
  if (league?.kind !== 'pro') return 0;
  const { standings: list } = await standings(db, night, league);
  const { rows: [{ month, from }] } = await db.query(
    `SELECT date_trunc('month', $1::timestamptz AT TIME ZONE 'Europe/Stockholm')::date AS month,
            date_trunc('month', $1::timestamptz AT TIME ZONE 'Europe/Stockholm') AT TIME ZONE 'Europe/Stockholm' AS "from"`,
    [night.ended_at ?? new Date()],
  );
  const { countryAt } = require('../country');
  for (const s of list) {
    await db.query(
      `INSERT INTO league_results (league_id, user_id, kind, night_id, month, place, ranked_humans, points, tracks_finished, counted_runs, racing_days, country)
       VALUES ($1, $2, 'night', $3, $4, $5, $6, $7, $8, $8, 1, $9) ON CONFLICT DO NOTHING`,
      [league.id, s.user_id, night.id, month, s.place, list.length, s.points, s.places.filter((p) => p !== null).length, await countryAt(db, s.user_id, from)],
    );
  }
  return list.length;
}

/**
 * The night's scoreboard → { race_list: [{ k, track_id, race_id, status }], standings: [{ user_id, name,
 * points, wins, last, place, places: [place in race k or null] }] }. Points for the league's players only.
 */
async function standings(db, night, league) {
  const { shownName } = require('../names/shown');
  const { rows: races } = await db.query(
    "SELECT id, league_night_race AS k, track_id, status FROM races WHERE league_night_id = $1 AND status <> 'cancelled' ORDER BY league_night_race",
    [night.id],
  );
  const { rows: members } = await db.query(
    `SELECT m.user_id, u.username, u.display_name FROM league_members m JOIN users u ON u.id = m.user_id
      WHERE m.league_id = $1 AND m.removed_at IS NULL`,
    [league.id],
  );
  const finished = races.filter((r) => r.status === 'finished').map((r) => r.id);
  const { rows: entries } = finished.length ? await db.query(
    `SELECT e.race_id, e.user_id, e.finish_position FROM race_entries e
      WHERE e.race_id = ANY($1::uuid[]) AND NOT e.is_bot AND e.finish_position IS NOT NULL AND e.user_id = ANY($2::uuid[])
      ORDER BY e.race_id, e.finish_position`,
    [finished, members.map((m) => m.user_id)],
  ) : { rows: [] };
  const byUser = new Map(members.map((m) => [m.user_id, { user_id: m.user_id, name: shownName(m), points: 0, wins: 0, places: races.map(() => null), raced: 0 }]));
  for (const [i, race] of races.entries()) {
    const here = entries.filter((e) => e.race_id === race.id);
    here.forEach((e, rank) => {
      const s = byUser.get(e.user_id);
      s.points += POINTS[rank] ?? 0;
      if (rank === 0) s.wins += 1;
      s.places[i] = rank + 1;
      s.raced += 1;
    });
  }
  const lastIdx = races.map((r) => r.status).lastIndexOf('finished');
  const list = [...byUser.values()].filter((s) => s.raced > 0);
  const lastOf = (s) => (lastIdx >= 0 ? s.places[lastIdx] ?? Infinity : Infinity);
  list.sort((a, b) => b.points - a.points || b.wins - a.wins || lastOf(a) - lastOf(b));
  list.forEach((s, i) => { s.place = i + 1; s.last = lastOf(s) === Infinity ? null : lastOf(s); });
  return { race_list: races.map((r) => ({ k: r.k, track_id: r.track_id, race_id: r.id, status: r.status })), standings: list.map(({ raced, ...s }) => s) };
}

module.exports = {
  RACES, POINTS, OPEN_BEFORE_MIN, GAP_S, RACE_ROOM_MIN, SOONEST_MIN, NOW_LEAD_S,
  current, schedule, cancelNight, isNightMember, openDue, afterNightRace, nobodyCame, standings, trackFor, writeResults,
};
