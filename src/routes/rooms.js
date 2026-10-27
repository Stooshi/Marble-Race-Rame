'use strict';

/**
 * Friend rooms: private races with friends, joined by a short code.
 *
 *   POST /api/rooms                    { track_id?, public? }  create a room (and its first race); the host is in it.
 *                                      Private (the default: link or code only) or public (listed, anyone may join)
 *   GET  /api/rooms/public             the public rooms waiting at the start with free places, quick races too:
 *                                      [{ code, kind, track, players, size, startsAt }] (full or started ones drop off)
 *   POST /api/rooms/quick              Quick race: into a public quick race starting soon with a free place, else a
 *                                      new one (random track, starts by itself in 15 s; others tapping Quick race
 *                                      join it until then). → the room. No host: nobody changes it or removes players
 *   GET  /api/rooms/:code              the room: host, track, the current race and who is in it
 *   POST /api/rooms/:code/visibility   host: { public } a private room public or back (between races too)
 *   POST /api/rooms/:code/join         join the current race with your Shooter (again: re-enter with
 *                                      your current Shooter, e.g. after changing it)
 *   POST /api/rooms/:code/leave        leave the current race (while it waits at the start)
 *   POST /api/rooms/:code/track        host: { track_id } or { random: true } for the race waiting to start
 *   POST /api/rooms/:code/remove       host: { user_id } takes a player out of the waiting race
 *   POST /api/rooms/:code/start        host: start the race (empty places fill with CPU players)
 *   POST /api/rooms/:code/start-in     host: { seconds: 30 | 60 | 120 } start the waiting race then, on the
 *                                      server (it starts even if the host's app closes); again: a new time
 *   POST /api/rooms/:code/start-in/cancel  host: no timed start (the race waits for Start again)
 *   POST /api/rooms/:code/close        host: close the room
 *   GET  /api/rooms/:code/invitable    host: friends to invite (who raced in a friend room with them in the last
 *                                      30 days) → { friends: [{ userId, name }], pushOn }
 *   POST /api/rooms/:code/invite       host: { user_id } a push to that friend's phones (src/push; their switch
 *                                      decides; at most one per friend and room every 10 minutes)
 *
 * A room's races are ordinary races (races.room_id) that never show in the public race
 * lists (a public room shows in its own list) and never start by themselves, unless the host sets a start timer (races.scheduled_at:
 * the race manager starts it to the second, its 5-second poll the safety net). When one finishes, the next is set up at
 * once with everyone who raced (rooms.afterRace, called by the race manager), so
 * the group moves on together. Socket: 'room:watch' { code } → 'room:updated' { code }.
 */
const { shownName } = require('../names/shown');
const crypto = require('crypto');
const express = require('express');
const config = require('../config');
const db = require('../db');
const { optionalAuth, requireAuth } = require('../middleware/auth');
const { validate } = require('../utils/validate');
const { HttpError, badRequest, conflict, forbidden, notFound } = require('../utils/httpError');
const raceManager = require('../game/raceManager');
const { joinRace } = require('./races');
// (League Night's rooms: src/leagues/night.js, loaded when first needed.)
const leagueNight = () => require('../leagues/night');
const seasons = require('../seasons');

const router = express.Router();

// No 0/O or 1/I: easy to read out and type.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const IDLE_HOURS = 2;
const ROOMS_PER_HOUR = 10;
const PLAYERS = 20; // a room race: up to 20 marbles, CPU players fill the rest
const START_IN = [30, 60, 120]; // the host's "Start in…" choices, in seconds
const QUICK_START_S = 15;        // a quick race starts this long after it opens (Moses, 25 Oct 2026)
const QUICK_JOIN_BEFORE_S = 3;   // …and takes no more players in its last seconds (they get a new one)
const QUICK_LOCK = 772_501;      // (pg_advisory_xact_lock key: one quick-race lookup at a time, so taps meet)

// Per player (after login): joining rooms and Quick race, so nobody floods the public lists.
const rateLimit = require('express-rate-limit');
const perPlayer = (windowMs, limit, error) => rateLimit({
  windowMs,
  limit: config.isTest ? 1000 : limit,
  keyGenerator: (req) => req.user?.id ?? req.ip,
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error },
});
const joinLimiter = perPlayer(10 * 60 * 1000, 60, 'You have joined a lot of rooms just now. Try again in a few minutes.');
const quickLimiter = perPlayer(10 * 60 * 1000, 30, 'That\'s a lot of quick races in a row. Try again in a few minutes.');

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

const roomChannel = (code) => `room:${code}`;
function emitRoom(code) {
  raceManager.io?.to(roomChannel(code)).emit('room:updated', { code });
}

/**
 * The room's track: the one asked for (a season track only if the host may race it: a host with the
 * pass opens it to everyone in the room), or a random one (never a locked season track).
 */
async function pickTrack(client, trackId, hostId) {
  if (!trackId) {
    const id = await seasons.pickOpenTrack(client);
    if (!id) throw badRequest('No active tracks');
    return id;
  }
  const { rows: [track] } = await client.query('SELECT id, slug, season_key FROM tracks WHERE id = $1 AND is_active', [trackId]);
  if (!track) throw badRequest('Track not found or not active');
  await seasons.assertTrackAccess(client, track, { userId: hostId });
  return track.id;
}

/**
 * A new race waiting at the start for the room (on its track, or a random one). If the room's track
 * is a season track the host may no longer race (their pass was refunded), the room goes back to
 * random free tracks.
 */
async function newRoomRace(client, room) {
  let trackId;
  try {
    trackId = await pickTrack(client, room.track_id, room.host_id);
  } catch (err) {
    if (err.status !== 403 || !room.track_id) throw err;
    await client.query('UPDATE rooms SET track_id = NULL WHERE id = $1', [room.id]);
    trackId = await pickTrack(client, null, room.host_id);
  }
  const { rows } = await client.query(
    `INSERT INTO races (track_id, min_marbles, max_marbles, fill_with_bots, created_by, tick_rate_hz, countdown_ms, room_id)
     VALUES ($1, $2, $2, true, $3, $4, $5, $6) RETURNING id`,
    // (A room's race counts down longer: the start show's flyover, in sync for everyone, then the countdown.)
    [trackId, PLAYERS, room.host_id, config.game.tickRateHz, config.game.countdownMs + config.game.startShowMs, room.id],
  );
  await client.query('UPDATE rooms SET current_race_id = $2, last_active_at = now() WHERE id = $1', [room.id, rows[0].id]);
  return rows[0].id;
}

/** The room, locked; closed rooms and rooms idle for two hours (no race running) are closed. */
async function lockRoom(client, code) {
  const c = normaliseCode(code);
  if (!c) throw notFound('No room with that code');
  const { rows } = await client.query('SELECT * FROM rooms WHERE code = $1 FOR UPDATE', [c]);
  const room = rows[0];
  if (!room) throw notFound('No room with that code');
  if (room.status === 'open' && Date.now() - new Date(room.last_active_at).getTime() > IDLE_HOURS * 3600_000) {
    const { rows: r } = await client.query('SELECT status FROM races WHERE id = $1', [room.current_race_id]);
    if (!['countdown', 'running'].includes(r[0]?.status)) {
      await client.query(`UPDATE rooms SET status = 'closed' WHERE id = $1`, [room.id]);
      room.status = 'closed';
    }
  }
  return room;
}

function assertOpen(room) {
  if (room.status !== 'open') throw new HttpError(410, 'This room has closed. Ask your friend for a new link.');
}
function assertHost(room, user) {
  if (room.kind === 'quick') throw forbidden('A quick race has no host: it starts by itself');
  if (room.host_id !== user.id && user.role !== 'admin') throw forbidden('Only the host can do that');
}
function assertNotRemoved(room, user) {
  if ((room.removed ?? []).includes(user.id)) throw new HttpError(403, 'The host took you out of this room', { code: 'removed' });
}

/** A player's name in the room: the name they gave, else their username (a guest's short and readable). */
const nameOf = (u) => shownName(u); // (src/names/shown.js: the chosen name, the username, or guest_<number>)

/** What the room page shows. */
async function roomView(code, user) {
  const c = normaliseCode(code);
  if (!c) throw notFound('No room with that code');
  // (Closes an idle room on the way.)
  const room = await db.withTransaction((client) => lockRoom(client, c));
  const { rows: host } = await db.query('SELECT id, username, display_name, is_guest FROM users WHERE id = $1', [room.host_id]);
  const { rows: race } = await db.query(
    `SELECT r.id, r.status, r.started_at, r.countdown_ms, r.finished_at, r.scheduled_at, t.id AS track_id, t.slug AS track_slug, t.name AS track_name, t.season_key
       FROM races r JOIN tracks t ON t.id = r.track_id WHERE r.id = $1`,
    [room.current_race_id],
  );
  // A season track the room races while the season is on: open to everyone here through the host's pass.
  const season = race[0]?.season_key ? await seasons.byKey(db, race[0].season_key) : null;
  const hostedSeason = season && seasons.stateOf(season) === 'on' ? { key: season.key, name: season.name } : null;
  const { rows: players } = race[0] ? await db.query(
    `SELECT u.id AS user_id, u.username, u.display_name, u.is_guest, e.joined_at,
            m.id AS marble_id, m.slug AS marble_slug, m.name AS marble_name, m.color_primary, m.color_secondary, m.pattern,
            c.item_slug AS look
       FROM race_entries e
       JOIN users u ON u.id = e.user_id
       JOIN marbles m ON m.id = e.marble_id
       LEFT JOIN race_entry_looks l ON l.entry_id = e.id
       LEFT JOIN user_collection c ON c.id = l.collection_id
      WHERE e.race_id = $1 AND NOT e.is_bot
      ORDER BY (u.id = $2) DESC, e.joined_at`,
    [race[0].id, room.host_id],
  ) : { rows: [] };
  // The race before this one, for its results link.
  const { rows: last } = await db.query(
    `SELECT id FROM races WHERE room_id = $1 AND status = 'finished' ORDER BY finished_at DESC LIMIT 1`,
    [room.id],
  );
  const quick = room.kind === 'quick';
  // A League Night room: which league, and which race of the night this is.
  let night = null;
  if (room.league_night_id) {
    const { rows: [n] } = await db.query(
      `SELECT n.races, n.status, l.code, l.name, r.league_night_race AS k
         FROM league_nights n JOIN leagues l ON l.id = n.league_id LEFT JOIN races r ON r.id = $2 WHERE n.id = $1`,
      [room.league_night_id, room.current_race_id],
    );
    if (n) night = { league: { code: n.code, name: n.name }, race: n.k ?? null, races: n.races, status: n.status };
  }
  return {
    ...(night && { night }),
    room: {
      code: room.code,
      status: room.status,
      kind: room.kind ?? 'friends',
      public: Boolean(room.is_public),
      host: host[0] && !quick ? { id: host[0].id, name: nameOf(host[0]) } : null,
      randomTrack: !room.track_id,
      lastRaceId: last[0]?.id ?? null,
      size: PLAYERS,
    },
    race: race[0] ? {
      id: race[0].id,
      status: race[0].status,
      startedAt: race[0].started_at,
      // The host's start timer: when the race starts by itself (and the server's clock now, for the countdown).
      startsAt: race[0].status === 'lobby' && race[0].scheduled_at ? new Date(race[0].scheduled_at).toISOString() : null,
      serverNow: new Date().toISOString(),
      track: { id: race[0].track_id, slug: race[0].track_slug, name: race[0].track_name, ...(hostedSeason && { hostedSeason }) },
    } : null,
    players: players.map((p) => ({
      userId: p.user_id,
      name: nameOf(p),
      guest: p.is_guest,
      host: !quick && p.user_id === room.host_id,
      marble: { id: p.marble_id, slug: p.marble_slug, name: p.marble_name, color_primary: p.color_primary, color_secondary: p.color_secondary, pattern: p.pattern, look: p.look ?? undefined },
    })),
    me: user ? { isHost: !quick && user.id === room.host_id, inRace: players.some((p) => p.user_id === user.id), removed: (room.removed ?? []).includes(user.id) } : null,
  };
}

/** POST /api/rooms { track_id?, public? } */
router.post('/', requireAuth, async (req, res) => {
  const body = validate(req.body ?? {}, { track_id: { type: 'uuid' }, public: { type: 'boolean' } });
  const code = await db.withTransaction(async (client) => {
    const { rows: recent } = await client.query(
      `SELECT COUNT(*)::int AS n FROM rooms WHERE host_id = $1 AND created_at > now() - interval '1 hour'`,
      [req.user.id],
    );
    if (recent[0].n >= ROOMS_PER_HOUR) throw new HttpError(429, 'You have made a lot of rooms in the last hour. Try again a little later.');
    if (body.track_id) await pickTrack(client, body.track_id, req.user.id);
    // A fresh code (retrying the rare clash).
    let room = null;
    for (let tries = 0; !room && tries < 8; tries += 1) {
      const { rows } = await client.query(
        `INSERT INTO rooms (code, host_id, track_id, is_public) VALUES ($1, $2, $3, $4) ON CONFLICT (code) DO NOTHING RETURNING *`,
        [newCode(), req.user.id, body.track_id ?? null, body.public === true],
      );
      room = rows[0] ?? null;
    }
    if (!room) throw new HttpError(503, 'Could not make a room code, try again');
    const raceId = await newRoomRace(client, room);
    await joinRace(client, raceId, req.user.id, null);
    return room.code;
  });
  res.status(201).json(await roomView(code, req.user));
});

/**
 * The public rooms waiting at the start with free places (quick races too), soonest start first, then
 * the fullest. → { rooms: [{ code, kind, track: { name, slug }, players, size, startsAt, serverNow }] }
 */
async function publicRooms(client, limit = 20) {
  const { rows } = await client.query(
    `SELECT ro.code, ro.kind, t.name AS track_name, t.slug AS track_slug, r.scheduled_at,
            (SELECT COUNT(*)::int FROM race_entries e WHERE e.race_id = r.id AND NOT e.is_bot) AS players
       FROM rooms ro
       JOIN races r ON r.id = ro.current_race_id
       JOIN tracks t ON t.id = r.track_id
      WHERE ro.is_public AND ro.status = 'open' AND r.status = 'lobby'
        AND ro.last_active_at > now() - make_interval(hours => $1)
        AND (r.scheduled_at IS NULL OR r.scheduled_at > now() + make_interval(secs => $2))
      ORDER BY r.scheduled_at NULLS LAST, ro.last_active_at DESC
      LIMIT 60`,
    [IDLE_HOURS, QUICK_JOIN_BEFORE_S],
  );
  const now = new Date().toISOString();
  return rows
    .filter((r) => r.players > 0 && r.players < PLAYERS)
    .sort((a, b) => (a.scheduled_at && b.scheduled_at ? a.scheduled_at - b.scheduled_at : a.scheduled_at ? -1 : b.scheduled_at ? 1 : b.players - a.players))
    .slice(0, limit)
    .map((r) => ({ code: r.code, kind: r.kind, track: { name: r.track_name, slug: r.track_slug }, players: r.players, size: PLAYERS, startsAt: r.scheduled_at ? new Date(r.scheduled_at).toISOString() : null, serverNow: now }));
}

/** GET /api/rooms/public */
router.get('/public', optionalAuth, async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ rooms: await publicRooms(db) });
});

/**
 * POST /api/rooms/quick: one tap, racing within seconds (Moses, 25 Oct 2026). The player goes into a
 * public quick race that starts soon with a free place (or the one they're already in), else a new one
 * on a random track that starts by itself in QUICK_START_S seconds; computer players fill it to 20.
 */
router.post('/quick', requireAuth, quickLimiter, async (req, res) => {
  let schedule = null;
  const code = await db.withTransaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock($1)', [QUICK_LOCK]);
    // Already waiting in one: back to it.
    const { rows: mine } = await client.query(
      `SELECT ro.code FROM rooms ro JOIN races r ON r.id = ro.current_race_id
         JOIN race_entries e ON e.race_id = r.id AND e.user_id = $1
        WHERE ro.kind = 'quick' AND ro.status = 'open' AND r.status = 'lobby' LIMIT 1`,
      [req.user.id],
    );
    if (mine[0]) return mine[0].code;
    const { rows: open } = await client.query(
      `SELECT ro.*, r.id AS race_id FROM rooms ro JOIN races r ON r.id = ro.current_race_id
        WHERE ro.kind = 'quick' AND ro.status = 'open' AND r.status = 'lobby'
          AND r.scheduled_at > now() + make_interval(secs => $1)
          AND (SELECT COUNT(*) FROM race_entries e WHERE e.race_id = r.id AND NOT e.is_bot) < $2
          AND NOT ($3 = ANY(ro.removed))
        ORDER BY r.scheduled_at LIMIT 1`,
      [QUICK_JOIN_BEFORE_S, PLAYERS, req.user.id],
    );
    if (open[0]) {
      await joinRace(client, open[0].race_id, req.user.id, null);
      await client.query('UPDATE rooms SET last_active_at = now() WHERE id = $1', [open[0].id]);
      return open[0].code;
    }
    let room = null;
    for (let tries = 0; !room && tries < 8; tries += 1) {
      const { rows } = await client.query(
        `INSERT INTO rooms (code, host_id, track_id, is_public, kind) VALUES ($1, $2, NULL, true, 'quick') ON CONFLICT (code) DO NOTHING RETURNING *`,
        [newCode(), req.user.id],
      );
      room = rows[0] ?? null;
    }
    if (!room) throw new HttpError(503, 'Could not start a quick race, try again');
    const raceId = await newRoomRace(client, room);
    await joinRace(client, raceId, req.user.id, null);
    const { rows: [r] } = await client.query(
      'UPDATE races SET scheduled_at = now() + make_interval(secs => $2), updated_at = now() WHERE id = $1 RETURNING scheduled_at',
      [raceId, QUICK_START_S],
    );
    schedule = { raceId, at: r.scheduled_at };
    return room.code;
  });
  if (schedule) raceManager.scheduleStart(schedule.raceId, schedule.at);
  emitRoom(code);
  res.json(await roomView(code, req.user));
});

/** GET /api/rooms/:code */
router.get('/:code', optionalAuth, async (req, res) => {
  res.json(await roomView(req.params.code, req.user ?? null));
});

/** Runs fn on the locked room and its current race (also locked), then tells the room. */
async function onRoom(req, fn) {
  const code = await db.withTransaction(async (client) => {
    const room = await lockRoom(client, req.params.code);
    assertOpen(room);
    const { rows } = await client.query('SELECT * FROM races WHERE id = $1 FOR UPDATE', [room.current_race_id]);
    await fn(client, room, rows[0] ?? null);
    await client.query('UPDATE rooms SET last_active_at = now() WHERE id = $1', [room.id]);
    return room.code;
  });
  emitRoom(code);
  return code;
}

/** POST /api/rooms/:code/join */
router.post('/:code/join', requireAuth, joinLimiter, async (req, res) => {
  const code = await onRoom(req, async (client, room, race) => {
    assertNotRemoved(room, req.user);
    // A League Night room: the league's players only (saved accounts in the league).
    if (room.league_night_id && !(await leagueNight().isNightMember(client, room.league_night_id, req.user.id))) {
      throw new HttpError(403, 'This is a League Night room: only the league\'s players can join', { code: 'league_only' });
    }
    if (!race || race.status !== 'lobby') throw conflict('A race is on: you can join the next one as soon as it finishes');
    // (A quick race takes nobody new in its last seconds.)
    if (room.kind === 'quick' && race.scheduled_at && new Date(race.scheduled_at) - Date.now() < QUICK_JOIN_BEFORE_S * 1000) {
      const { rows: inIt } = await client.query('SELECT 1 FROM race_entries WHERE race_id = $1 AND user_id = $2', [race.id, req.user.id]);
      if (!inIt.length) throw new HttpError(409, 'This quick race is starting: tap Quick race for the next one', { code: 'quick_starting' });
    }
    // Already in: re-enter with the current Shooter (it may have changed).
    await client.query('DELETE FROM race_entries WHERE race_id = $1 AND user_id = $2', [race.id, req.user.id]);
    await joinRace(client, race.id, req.user.id, null);
  });
  res.json(await roomView(code, req.user));
});

/** POST /api/rooms/:code/leave */
router.post('/:code/leave', requireAuth, async (req, res) => {
  const code = await onRoom(req, async (client, room, race) => {
    if (race?.status === 'lobby') await client.query('DELETE FROM race_entries WHERE race_id = $1 AND user_id = $2', [race.id, req.user.id]);
  });
  res.json(await roomView(code, req.user));
});

/** POST /api/rooms/:code/track { track_id } | { random: true } */
router.post('/:code/track', requireAuth, async (req, res) => {
  const body = validate(req.body ?? {}, { track_id: { type: 'uuid' }, random: { type: 'boolean' } });
  if (!body.track_id && !body.random) throw badRequest('Provide track_id or random: true');
  const code = await onRoom(req, async (client, room, race) => {
    assertHost(room, req.user);
    if (room.league_night_id) throw conflict('League Night races the league\'s tracks in order');
    if (!race || race.status !== 'lobby') throw conflict('The track can change once this race has finished');
    const trackId = await pickTrack(client, body.random ? null : body.track_id, room.host_id);
    await client.query('UPDATE rooms SET track_id = $2 WHERE id = $1', [room.id, body.random ? null : trackId]);
    await client.query('UPDATE races SET track_id = $2, updated_at = now() WHERE id = $1', [race.id, trackId]);
  });
  res.json(await roomView(code, req.user));
});

/** POST /api/rooms/:code/remove { user_id } */
router.post('/:code/remove', requireAuth, async (req, res) => {
  const body = validate(req.body ?? {}, { user_id: { type: 'uuid', required: true } });
  const code = await onRoom(req, async (client, room, race) => {
    assertHost(room, req.user);
    if (body.user_id === room.host_id) throw badRequest('The host stays in the room');
    if (!race || race.status !== 'lobby') throw conflict('Players can be taken out between races');
    await client.query('DELETE FROM race_entries WHERE race_id = $1 AND user_id = $2', [race.id, body.user_id]);
    // (Taken out: they can't join this room again, also not from the public list.)
    await client.query('UPDATE rooms SET removed = array_append(removed, $2::uuid) WHERE id = $1 AND NOT ($2::uuid = ANY(removed))', [room.id, body.user_id]);
  });
  res.json(await roomView(code, req.user));
});

/** POST /api/rooms/:code/start */
router.post('/:code/start', requireAuth, async (req, res) => {
  let raceId = null;
  const code = await onRoom(req, async (client, room, race) => {
    assertHost(room, req.user);
    if (!race || race.status !== 'lobby') throw conflict('This race has already started');
    raceId = race.id;
  });
  // (Decided outside the room's transaction: the race service locks the race itself. A start timer goes.)
  raceManager.unscheduleStart(raceId);
  await raceManager.start(raceId, req.user);
  emitRoom(code);
  res.status(202).json(await roomView(code, req.user));
});

/** POST /api/rooms/:code/start-in { seconds: 30 | 60 | 120 } */
router.post('/:code/start-in', requireAuth, async (req, res) => {
  const body = validate(req.body ?? {}, { seconds: { type: 'int', required: true } });
  if (!START_IN.includes(body.seconds)) throw badRequest('Start in 30 seconds, 1 minute or 2 minutes');
  let raceId = null;
  let at = null;
  const code = await onRoom(req, async (client, room, race) => {
    assertHost(room, req.user);
    if (!race || race.status !== 'lobby') throw conflict('This race has already started');
    const { rows } = await client.query(
      `UPDATE races SET scheduled_at = now() + make_interval(secs => $2), updated_at = now() WHERE id = $1 RETURNING scheduled_at`,
      [race.id, body.seconds],
    );
    raceId = race.id;
    at = rows[0].scheduled_at;
  });
  raceManager.scheduleStart(raceId, at);
  res.json(await roomView(code, req.user));
});

/** POST /api/rooms/:code/start-in/cancel */
router.post('/:code/start-in/cancel', requireAuth, async (req, res) => {
  let raceId = null;
  const code = await onRoom(req, async (client, room, race) => {
    assertHost(room, req.user);
    if (race?.status === 'lobby') {
      await client.query('UPDATE races SET scheduled_at = NULL, updated_at = now() WHERE id = $1', [race.id]);
      raceId = race.id;
    }
  });
  if (raceId) raceManager.unscheduleStart(raceId);
  res.json(await roomView(code, req.user));
});

/**
 * POST /api/rooms/:code/start-now: a quick race where the player is the only real player (computer
 * players don't count; Moses, 26 Oct 2026): it starts at once instead of waiting out its timer.
 */
router.post('/:code/start-now', requireAuth, async (req, res) => {
  let raceId = null;
  const code = await onRoom(req, async (client, room, race) => {
    if (room.kind !== 'quick') throw badRequest('Only a quick race can be started this way');
    if (!race || race.status !== 'lobby') throw conflict('This race has already started');
    const { rows: humans } = await client.query('SELECT user_id FROM race_entries WHERE race_id = $1 AND NOT is_bot', [race.id]);
    if (!humans.some((h) => h.user_id === req.user.id)) throw forbidden('Join the race first');
    if (humans.length > 1) throw conflict('Other players are in this race: it starts on its timer');
    await client.query('UPDATE races SET scheduled_at = now(), updated_at = now() WHERE id = $1', [race.id]);
    raceId = race.id;
  });
  // Started before answering, so the player's page goes straight to the race (and its start show).
  raceManager.unscheduleStart(raceId);
  await raceManager.startScheduled(raceId);
  res.json(await roomView(code, req.user));
});

/** A room's race started by its timer: everyone in the room is told (they go to the race). */
raceManager.afterScheduledStart = async (raceId) => {
  try {
    const { rows } = await db.query('SELECT ro.code FROM rooms ro JOIN races r ON r.room_id = ro.id WHERE r.id = $1', [raceId]);
    if (rows[0]) emitRoom(rows[0].code);
  } catch (err) {
    console.error(`[room] telling the room about race ${raceId} failed`, err);
  }
};

const pushNotes = require('../push');
const pushSwitch = require('../../client/src/shared/push.json');
const invitesSent = new Map(); // host id → times of their invites in the last hour (at most 30)

/** GET /api/rooms/:code/invitable */
router.get('/:code/invitable', requireAuth, async (req, res) => {
  const room = await db.withTransaction((client) => lockRoom(client, req.params.code));
  assertOpen(room);
  assertHost(room, req.user);
  res.json({ friends: pushSwitch.enabled ? await pushNotes.invitable(db, req.user.id) : [], pushOn: pushSwitch.enabled === true });
});

/** POST /api/rooms/:code/invite { user_id } */
router.post('/:code/invite', requireAuth, async (req, res) => {
  const body = validate(req.body ?? {}, { user_id: { type: 'uuid', required: true } });
  if (!pushSwitch.enabled) throw notFound('Invites are not available yet');
  const room = await db.withTransaction((client) => lockRoom(client, req.params.code));
  assertOpen(room);
  assertHost(room, req.user);
  const recent = (invitesSent.get(req.user.id) ?? []).filter((t) => t > Date.now() - 3600_000);
  if (recent.length >= 30) throw new HttpError(429, 'That\'s a lot of invites. Try again in a while.');
  invitesSent.set(req.user.id, [...recent, Date.now()]);
  const r = await pushNotes.inviteToRoom(db, { host: req.user, hostName: nameOf(req.user), room, userId: body.user_id });
  if (r.why === 'not-a-room-friend') throw forbidden('You can invite players you have raced with in a friend room');
  // (Whether it reached a phone isn't told: their switches are their own business.)
  res.json({ invited: true });
});

/** POST /api/rooms/:code/visibility { public } */
router.post('/:code/visibility', requireAuth, async (req, res) => {
  const body = validate(req.body ?? {}, { public: { type: 'boolean', required: true } });
  const code = await onRoom(req, async (client, room) => {
    assertHost(room, req.user);
    if (room.league_night_id) throw conflict('A League Night room is for the league\'s players only');
    await client.query('UPDATE rooms SET is_public = $2 WHERE id = $1', [room.id, body.public]);
  });
  res.json(await roomView(code, req.user));
});

/** POST /api/rooms/:code/close */
router.post('/:code/close', requireAuth, async (req, res) => {
  const code = await onRoom(req, async (client, room, race) => {
    assertHost(room, req.user);
    if (race?.status === 'lobby') await client.query(`UPDATE races SET status = 'cancelled' WHERE id = $1`, [race.id]);
    await client.query(`UPDATE rooms SET status = 'closed' WHERE id = $1`, [room.id]);
    // (A League Night room closed by its host: the night ends with the races run so far.)
    if (room.league_night_id) await leagueNight().nobodyCame(client, room.league_night_id);
  });
  res.json(await roomView(code, req.user));
});

/**
 * After a room's race has finished: the next race, on the room's track (or a new
 * random one), with everyone who raced in this one entered again with their Shooter.
 */
async function afterRace(raceId) {
  let nightStart = null; // (a League Night's next race: it starts by itself)
  const code = await db.withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT ro.* FROM rooms ro JOIN races r ON r.room_id = ro.id
        WHERE r.id = $1 AND ro.current_race_id = r.id AND ro.status = 'open' FOR UPDATE OF ro`,
      [raceId],
    );
    const room = rows[0];
    if (!room) return null;
    // A quick race is one race: its room closes (the results offer the next quick race).
    if (room.kind === 'quick') {
      await client.query(`UPDATE rooms SET status = 'closed' WHERE id = $1`, [room.id]);
      return room.code;
    }
    // A League Night room: the night's next race on the league's next track (or the night is over).
    let nextId;
    if (room.league_night_id) {
      const next = await leagueNight().afterNightRace(client, room, raceId);
      if (!next) return room.code;
      nextId = next.id;
      nightStart = next;
    } else {
      nextId = await newRoomRace(client, room);
    }
    const { rows: players } = await client.query(
      'SELECT user_id FROM race_entries WHERE race_id = $1 AND NOT is_bot AND user_id IS NOT NULL ORDER BY joined_at',
      [raceId],
    );
    for (const p of players) {
      await client.query('SAVEPOINT rejoin');
      try {
        await joinRace(client, nextId, p.user_id, null);
        await client.query('RELEASE SAVEPOINT rejoin');
      } catch {
        await client.query('ROLLBACK TO SAVEPOINT rejoin'); // (e.g. no marble any more: they can join by hand)
      }
    }
    return room.code;
  });
  if (nightStart) raceManager.scheduleStart(nightStart.id, nightStart.scheduled_at);
  if (code) emitRoom(code);
  return code;
}

// The race manager calls this when any race finishes (a room's race moves the room on).
raceManager.afterFinish = (raceId) => afterRace(raceId).catch((err) => console.error(`[room] next race after ${raceId} failed`, err));

module.exports = router;
module.exports.afterRace = afterRace;
module.exports.newRoomRace = newRoomRace;
module.exports.emitRoom = emitRoom;
module.exports.roomChannel = roomChannel;
module.exports.normaliseCode = normaliseCode;
module.exports.newCode = newCode;
module.exports.publicRooms = publicRooms;
module.exports.QUICK_START_S = QUICK_START_S;
module.exports.ALPHABET = ALPHABET;
