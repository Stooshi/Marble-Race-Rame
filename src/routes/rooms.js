'use strict';

/**
 * Friend rooms: private races with friends, joined by a short code.
 *
 *   POST /api/rooms                    { track_id? }  create a room (and its first race); the host is in it
 *   GET  /api/rooms/:code              the room: host, track, the current race and who is in it
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
 * A room's races are ordinary races (races.room_id) that never show in the public
 * lists and never start by themselves, unless the host sets a start timer (races.scheduled_at:
 * the race manager starts it to the second, its 5-second poll the safety net). When one finishes, the next is set up at
 * once with everyone who raced (rooms.afterRace, called by the race manager), so
 * the group moves on together. Socket: 'room:watch' { code } → 'room:updated' { code }.
 */
const crypto = require('crypto');
const express = require('express');
const config = require('../config');
const db = require('../db');
const { optionalAuth, requireAuth } = require('../middleware/auth');
const { validate } = require('../utils/validate');
const { HttpError, badRequest, conflict, forbidden, notFound } = require('../utils/httpError');
const raceManager = require('../game/raceManager');
const { joinRace } = require('./races');
const seasons = require('../seasons');

const router = express.Router();

// No 0/O or 1/I: easy to read out and type.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const IDLE_HOURS = 2;
const ROOMS_PER_HOUR = 10;
const PLAYERS = 20; // a room race: up to 20 marbles, CPU players fill the rest
const START_IN = [30, 60, 120]; // the host's "Start in…" choices, in seconds

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
    [trackId, PLAYERS, room.host_id, config.game.tickRateHz, config.game.countdownMs, room.id],
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
  if (room.host_id !== user.id && user.role !== 'admin') throw forbidden('Only the host can do that');
}

/** A player's name in the room: the name they gave, else their username (a guest's short and readable). */
const nameOf = (u) => u.display_name || (u.is_guest ? `Guest ${String(u.username).replace(/^guest_/, '').slice(0, 4).toUpperCase()}` : u.username);

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
  return {
    room: {
      code: room.code,
      status: room.status,
      host: host[0] ? { id: host[0].id, name: nameOf(host[0]) } : null,
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
      host: p.user_id === room.host_id,
      marble: { id: p.marble_id, slug: p.marble_slug, name: p.marble_name, color_primary: p.color_primary, color_secondary: p.color_secondary, pattern: p.pattern, look: p.look ?? undefined },
    })),
    me: user ? { isHost: user.id === room.host_id, inRace: players.some((p) => p.user_id === user.id) } : null,
  };
}

/** POST /api/rooms { track_id? } */
router.post('/', requireAuth, async (req, res) => {
  const body = validate(req.body ?? {}, { track_id: { type: 'uuid' } });
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
        `INSERT INTO rooms (code, host_id, track_id) VALUES ($1, $2, $3) ON CONFLICT (code) DO NOTHING RETURNING *`,
        [newCode(), req.user.id, body.track_id ?? null],
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
router.post('/:code/join', requireAuth, async (req, res) => {
  const code = await onRoom(req, async (client, room, race) => {
    if (!race || race.status !== 'lobby') throw conflict('A race is on: you can join the next one as soon as it finishes');
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

/** POST /api/rooms/:code/close */
router.post('/:code/close', requireAuth, async (req, res) => {
  const code = await onRoom(req, async (client, room, race) => {
    assertHost(room, req.user);
    if (race?.status === 'lobby') await client.query(`UPDATE races SET status = 'cancelled' WHERE id = $1`, [race.id]);
    await client.query(`UPDATE rooms SET status = 'closed' WHERE id = $1`, [room.id]);
  });
  res.json(await roomView(code, req.user));
});

/**
 * After a room's race has finished: the next race, on the room's track (or a new
 * random one), with everyone who raced in this one entered again with their Shooter.
 */
async function afterRace(raceId) {
  const code = await db.withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT ro.* FROM rooms ro JOIN races r ON r.room_id = ro.id
        WHERE r.id = $1 AND ro.current_race_id = r.id AND ro.status = 'open' FOR UPDATE OF ro`,
      [raceId],
    );
    const room = rows[0];
    if (!room) return null;
    const nextId = await newRoomRace(client, room);
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
module.exports.ALPHABET = ALPHABET;
