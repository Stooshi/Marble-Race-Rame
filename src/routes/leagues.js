'use strict';

/**
 * Leagues (src/leagues; Leagues v1 part 1, 27 Oct 2026). Behind LEAGUES (off: every address here but
 * /status answers 404).
 *
 *   GET    /api/leagues/status              { enabled } for this player (the site shows leagues only then)
 *   GET    /api/leagues/mine                my open and recently ended leagues, my place and tracks done
 *   POST   /api/leagues                     { name, track_ids[5], days 1-7, attempts null|3|5|10 } create
 *   GET    /api/leagues/:code               the league: tracks, scoreboard, my bests and tries left
 *   PATCH  /api/leagues/:code               creator: { name } rename it (the player-name filter)
 *   POST   /api/leagues/:code/join          join (by its link or code)
 *   DELETE /api/leagues/:code/join          leave
 *   POST   /api/leagues/:code/members       creator: { username } add a player by name
 *   DELETE /api/leagues/:code/members/:id   creator: remove a player (they can't come back)
 *   POST   /api/leagues/:code/race          { track_id, marble_id? } a league race on one of its tracks
 *                                           (a solo race, house marbles fill the field; the page starts it)
 *   POST   /api/leagues/:code/again         creator: Run again (a new league with the same settings)
 *   POST   /api/leagues/:code/night         creator: { starts_at, races 3-5 } set (or move) League Night
 *   DELETE /api/leagues/:code/night         creator: call it off (before its first race has started)
 */
const express = require('express');
const config = require('../config');
const db = require('../db');
const leagues = require('../leagues');
const night = require('../leagues/night');
const { optionalAuth, requireAuth } = require('../middleware/auth');
const { validate } = require('../utils/validate');
const { badRequest, conflict, forbidden, notFound } = require('../utils/httpError');
const { shownName } = require('../names/shown');
const raceManager = require('../game/raceManager');
const { joinRace } = require('./races');

const router = express.Router();

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
const createLimiter = perPlayer(60 * 60 * 1000, 10, 'That\'s a lot of new leagues. Try again in a while.');
const addLimiter = perPlayer(10 * 60 * 1000, 40, 'That\'s a lot of players added just now. Try again in a few minutes.');

/** Leagues open to this player, or 404 (switched off, the API isn't there). */
const open = (req, _res, next) => { leagues.assertOpen(req.user); next(); };

router.get('/status', optionalAuth, (req, res) => {
  res.json({ enabled: leagues.openFor(req.user), tracks: leagues.TRACKS, days: leagues.DAYS, attempts: leagues.CAPS });
});

const TRACK_SQL = `SELECT t.id, t.slug, t.name, t.difficulty, t.season_key FROM tracks t WHERE t.id = ANY($1::uuid[])`;

/** The league as the page shows it, for this player. */
async function view(league, userId) {
  const { rows: tracks } = await db.query(TRACK_SQL, [league.track_ids]);
  const byId = new Map(tracks.map((t) => [t.id, t]));
  const board = await leagues.scoreboard(db, league);
  const member = userId ? await leagues.isMember(db, league.id, userId) : false;
  const used = member ? await leagues.triesUsed(db, league.id, userId) : new Map();
  const { rows: [creator] } = await db.query('SELECT id, username, display_name FROM users WHERE id = $1', [league.created_by]);
  const mine = board.find((r) => r.user_id === userId) ?? null;
  // League Night: the one planned or on, else the last one, with its scoreboard.
  const n = await night.current(db, league.id);
  const nightView = n && {
    starts_at: n.starts_at, races: n.races, status: n.status,
    room_code: n.status === 'open' ? n.room_code : null,
    ...(await night.standings(db, n, league)),
  };
  return {
    night: nightView,
    league: {
      code: league.code,
      kind: league.kind,
      name: league.name,
      status: league.status,
      starts_at: league.starts_at,
      ends_at: league.ends_at,
      attempts: league.attempt_cap,
      creator: creator ? { id: creator.id, name: shownName(creator) } : null,
      mine_to_run: userId === league.created_by,
    },
    tracks: league.track_ids.map((id) => {
      const t = byId.get(id);
      return t && {
        id: t.id, slug: t.slug, name: t.name, difficulty: t.difficulty,
        ...(member && { best_ms: mine?.bests[id] ?? null, tries: used.get(id) ?? 0, tries_left: league.attempt_cap ? Math.max(0, league.attempt_cap - (used.get(id) ?? 0)) : null }),
      };
    }).filter(Boolean),
    scoreboard: board.map((r) => ({
      user_id: r.user_id, name: shownName(r), country: r.country, place: r.place, total_ms: r.total_ms, done: r.done,
      bests: league.track_ids.map((t) => r.bests[t] ?? null), set_at: r.set_at,
    })),
    member,
    me: mine ? { place: mine.place, total_ms: mine.total_ms, done: mine.done } : null,
    serverNow: new Date().toISOString(),
  };
}

router.get('/mine', requireAuth, open, async (req, res) => {
  const { rows } = await db.query(
    `SELECT l.* FROM leagues l JOIN league_members m ON m.league_id = l.id AND m.user_id = $1 AND m.removed_at IS NULL
      WHERE l.status = 'open' OR l.ended_at > now() - interval '7 days'
      ORDER BY (l.status = 'open') DESC, l.ends_at ASC LIMIT 30`,
    [req.user.id],
  );
  const out = [];
  for (const l of rows) {
    const board = await leagues.scoreboard(db, l);
    const me = board.find((r) => r.user_id === req.user.id);
    const n = await night.current(db, l.id);
    out.push({
      code: l.code, kind: l.kind, name: l.name, status: l.status, ends_at: l.ends_at,
      tracks: l.track_ids.length, players: board.length, place: me?.place ?? null, done: me?.done ?? 0,
      night: n && ['scheduled', 'open'].includes(n.status) ? { starts_at: n.starts_at, status: n.status, room_code: n.status === 'open' ? n.room_code : null } : null,
    });
  }
  res.json({ leagues: out, serverNow: new Date().toISOString() });
});

router.post('/', requireAuth, open, createLimiter, async (req, res) => {
  const league = await db.withTransaction((client) => leagues.create(client, req.user.id, req.body ?? {}));
  res.status(201).json(await view(league, req.user.id));
});

router.get('/:code', optionalAuth, open, async (req, res) => {
  const league = await leagues.byCode(db, req.params.code);
  res.json(await view(league, req.user?.id ?? null));
});

router.patch('/:code', requireAuth, open, async (req, res) => {
  const { name } = validate(req.body ?? {}, { name: { type: 'string', required: true, max: 80 } });
  const league = await db.withTransaction(async (client) => {
    const l = await leagues.byCode(client, req.params.code, { lock: true });
    return leagues.rename(client, l, req.user.id, name);
  });
  res.json(await view(league, req.user.id));
});

router.post('/:code/join', requireAuth, open, async (req, res) => {
  const league = await db.withTransaction(async (client) => {
    const l = await leagues.byCode(client, req.params.code, { lock: true });
    await leagues.join(client, l, req.user.id);
    return l;
  });
  res.json(await view(league, req.user.id));
});

router.delete('/:code/join', requireAuth, open, async (req, res) => {
  const league = await leagues.byCode(db, req.params.code);
  if (league.created_by === req.user.id) throw badRequest('You run this league: it ends by itself when its time is up');
  await db.query('DELETE FROM league_members WHERE league_id = $1 AND user_id = $2 AND removed_at IS NULL', [league.id, req.user.id]);
  res.status(204).end();
});

/** The creator only. */
async function asCreator(client, req) {
  const league = await leagues.byCode(client, req.params.code, { lock: true });
  if (league.created_by !== req.user.id) throw forbidden('Only the league\'s creator can do that');
  if (league.status !== 'open') throw conflict('This league has ended');
  return league;
}

router.post('/:code/members', requireAuth, open, addLimiter, async (req, res) => {
  const { username } = validate(req.body, { username: { type: 'string', required: true, max: 64 } });
  const league = await db.withTransaction(async (client) => {
    const l = await asCreator(client, req);
    const { rows: [u] } = await client.query(
      'SELECT id FROM users WHERE (lower(username) = lower($1) OR lower(display_name) = lower($1)) AND deleted_at IS NULL AND NOT is_guest LIMIT 1',
      [username.trim()],
    );
    if (!u) throw notFound('No player with that name (saved accounts only)');
    await leagues.join(client, l, u.id);
    return l;
  });
  res.json(await view(league, req.user.id));
});

router.delete('/:code/members/:userId', requireAuth, open, async (req, res) => {
  const league = await db.withTransaction(async (client) => {
    const l = await asCreator(client, req);
    if (req.params.userId === req.user.id) throw badRequest('You can\'t remove yourself');
    const { rowCount } = await client.query('UPDATE league_members SET removed_at = now() WHERE league_id = $1 AND user_id = $2 AND removed_at IS NULL', [l.id, req.params.userId]);
    if (!rowCount) throw notFound('That player is not in this league');
    return l;
  });
  res.json(await view(league, req.user.id));
});

router.post('/:code/race', requireAuth, open, async (req, res) => {
  const body = validate(req.body, { track_id: { type: 'uuid', required: true }, marble_id: { type: 'uuid' } });
  const raceId = await db.withTransaction(async (client) => {
    const league = await leagues.byCode(client, req.params.code, { lock: true });
    await leagues.assertCanRace(client, league, req.user.id, body.track_id);
    const { rows: [track] } = await client.query('SELECT id FROM tracks WHERE id = $1 AND is_active', [body.track_id]);
    if (!track) throw badRequest('That track is not available right now');
    const { rows } = await client.query(
      `INSERT INTO races (track_id, name, min_marbles, max_marbles, entry_fee_coins, fill_with_bots,
                          created_by, tick_rate_hz, countdown_ms, league_id)
       VALUES ($1, $2, 20, 20, 0, true, $3, $4, $5, $6) RETURNING id`,
      [track.id, league.name, req.user.id, config.game.tickRateHz, config.game.countdownMs, league.id],
    );
    await joinRace(client, rows[0].id, req.user.id, body.marble_id ?? null);
    await leagues.recordStart(client, league, req.user.id, track.id, rows[0].id);
    return rows[0].id;
  });
  const { rows: [race] } = await db.query('SELECT * FROM races WHERE id = $1', [raceId]);
  raceManager.emitLobby('lobby:race_created', race);
  res.status(201).json({ race });
});

router.post('/:code/night', requireAuth, open, async (req, res) => {
  const body = validate(req.body ?? {}, { starts_at: { type: 'string', required: true, max: 40 }, races: { type: 'int', required: true } });
  const league = await db.withTransaction(async (client) => {
    const l = await leagues.byCode(client, req.params.code, { lock: true });
    await night.schedule(client, l, req.user.id, body);
    return l;
  });
  // (Due within 15 minutes: its room opens now.)
  await night.openDue(db);
  res.json(await view(league, req.user.id));
});

router.delete('/:code/night', requireAuth, open, async (req, res) => {
  const league = await db.withTransaction(async (client) => {
    const l = await leagues.byCode(client, req.params.code, { lock: true });
    await night.cancelNight(client, l, req.user.id);
    return l;
  });
  res.json(await view(league, req.user.id));
});

router.post('/:code/again', requireAuth, open, createLimiter, async (req, res) => {
  const league = await db.withTransaction(async (client) => {
    const old = await leagues.byCode(client, req.params.code);
    if (old.created_by !== req.user.id) throw forbidden('Only the league\'s creator can run it again');
    const days = Math.max(leagues.DAYS[0], Math.min(leagues.DAYS[1], Math.round((new Date(old.ends_at) - new Date(old.starts_at)) / 86_400_000)));
    const fresh = await leagues.create(client, req.user.id, { name: old.name, track_ids: old.track_ids, days, attempts: old.attempt_cap }, { againOf: old.id });
    // (The old league's members are in the new one too: Run again keeps the group together.)
    await client.query(
      `INSERT INTO league_members (league_id, user_id)
       SELECT $2, m.user_id FROM league_members m JOIN users u ON u.id = m.user_id
        WHERE m.league_id = $1 AND m.removed_at IS NULL AND m.user_id <> $3 AND NOT u.is_guest AND u.deleted_at IS NULL
       ON CONFLICT DO NOTHING`,
      [old.id, fresh.id, req.user.id],
    );
    return fresh;
  });
  res.status(201).json(await view(league, req.user.id));
});

module.exports = router;
