'use strict';

const express = require('express');
const config = require('../config');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { validate, assertUuid, pagination } = require('../utils/validate');
const { badRequest, conflict, notFound } = require('../utils/httpError');
const raceManager = require('../game/raceManager');
const raceService = require('../game/raceService');
const { RACE_STATUSES } = require('../game/raceStatus');

const router = express.Router();

const { minMarbles, maxMarbles, defaultMarbles } = config.game;

const RACE_LIST_SQL = `
  SELECT r.id, r.name, r.status, r.min_marbles, r.max_marbles, r.entry_fee_coins, r.fill_with_bots,
         r.scheduled_at, r.started_at, r.finished_at, r.created_at, r.created_by, r.next_race_id,
         CASE WHEN r.status = 'finished' THEN r.target_duration_ms END AS duration_ms,
         t.id AS track_id, t.slug AS track_slug, t.name AS track_name, t.difficulty,
         (SELECT COUNT(*)::int FROM race_entries e WHERE e.race_id = r.id) AS entry_count,
         (SELECT COUNT(*)::int FROM race_entries e WHERE e.race_id = r.id AND NOT e.is_bot) AS player_count
    FROM races r JOIN tracks t ON t.id = r.track_id`;

async function getRaceRow(id) {
  const { rows } = await db.query(`${RACE_LIST_SQL} WHERE r.id = $1`, [id]);
  if (!rows[0]) throw notFound('Race not found');
  return rows[0];
}

/**
 * Entries for a race. Finish data is withheld until the race is finished so
 * the pre-computed outcome can't be read ahead of the broadcast.
 */
async function getEntries(raceId, revealResults) {
  const { rows } = await db.query(
    `SELECT e.id, e.lane, e.is_bot, e.joined_at, e.coins_awarded,
            e.finish_position, e.finish_time_ms, e.split_time_ms,
            m.id AS marble_id, m.slug AS marble_slug, m.name AS marble_name,
            m.color_primary, m.color_secondary, m.pattern, m.rarity,
            u.id AS user_id, u.username, u.display_name
       FROM race_entries e
       JOIN marbles m ON m.id = e.marble_id
       LEFT JOIN users u ON u.id = e.user_id
      WHERE e.race_id = $1
      ORDER BY ${revealResults ? 'e.finish_position' : 'e.lane NULLS LAST, e.joined_at'}`,
    [raceId],
  );
  return rows.map(({ finish_position, finish_time_ms, split_time_ms, coins_awarded, ...rest }) => (
    revealResults ? { ...rest, finish_position, finish_time_ms, split_time_ms, coins_awarded } : rest
  ));
}

/** Throws unless the user may race the marble (starter or owned). */
async function assertCanUseMarble(client, userId, marbleId) {
  const { rows } = await client.query(
    `SELECT m.id FROM marbles m
      WHERE m.id = $2 AND m.is_active
        AND (m.is_starter OR EXISTS (SELECT 1 FROM user_marbles um WHERE um.user_id = $1 AND um.marble_id = m.id))`,
    [userId, marbleId],
  );
  if (!rows[0]) throw badRequest('You do not own that marble or it is not available');
}

/** Adds the user's marble to a lobby race, charging the entry fee. */
async function joinRace(client, raceId, userId, marbleId) {
  const { rows } = await client.query('SELECT * FROM races WHERE id = $1 FOR UPDATE', [raceId]);
  const race = rows[0];
  if (!race) throw notFound('Race not found');
  if (race.status !== 'lobby') throw conflict('Race is no longer accepting entries');

  await assertCanUseMarble(client, userId, marbleId);

  const { rows: counts } = await client.query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE user_id = $2)::int AS mine,
            COUNT(*) FILTER (WHERE marble_id = $3)::int AS same_marble
       FROM race_entries WHERE race_id = $1`,
    [raceId, userId, marbleId],
  );
  if (counts[0].mine) throw conflict('You have already entered this race');
  if (counts[0].same_marble) throw conflict('That marble is already in this race');
  if (counts[0].total >= race.max_marbles) throw conflict('Race is full');

  if (race.entry_fee_coins > 0) {
    const paid = await client.query(
      'UPDATE users SET coins = coins - $2 WHERE id = $1 AND coins >= $2',
      [userId, race.entry_fee_coins],
    );
    if (!paid.rowCount) throw badRequest('Not enough coins for the entry fee');
  }

  const { rows: entry } = await client.query(
    'INSERT INTO race_entries (race_id, marble_id, user_id, is_bot) VALUES ($1, $2, $3, false) RETURNING *',
    [raceId, marbleId, userId],
  );
  return { race, entry: entry[0], entryCount: counts[0].total + 1 };
}

/** GET /api/races?status=lobby&track_id=&limit=&offset= */
router.get('/', async (req, res) => {
  const q = validate(req.query, {
    status: { type: 'enum', values: RACE_STATUSES },
    track_id: { type: 'uuid' },
  });
  const { limit, offset } = pagination(req.query);
  const params = [];
  const where = [];
  if (q.status) { params.push(q.status); where.push(`r.status = $${params.length}`); }
  if (q.track_id) { params.push(q.track_id); where.push(`r.track_id = $${params.length}`); }
  params.push(limit, offset);
  const { rows } = await db.query(
    `${RACE_LIST_SQL}
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY r.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  res.json({ races: rows, limit, offset });
});

/**
 * POST /api/races — create a lobby
 * { track_id | random_track: true, name?, min_marbles?, max_marbles?, entry_fee_coins?,
 *   fill_with_bots?, scheduled_at?, marble_id? }
 * With random_track the server picks an active track at random.
 * If marble_id is supplied the creator is entered immediately.
 */
router.post('/', requireAuth, async (req, res) => {
  const body = validate(req.body, {
    track_id: { type: 'uuid' },
    random_track: { type: 'boolean' },
    name: { type: 'string', max: 80 },
    min_marbles: { type: 'int', min: minMarbles, max: maxMarbles },
    max_marbles: { type: 'int', min: minMarbles, max: maxMarbles },
    entry_fee_coins: { type: 'int', min: 0, max: 100000 },
    fill_with_bots: { type: 'boolean' },
    scheduled_at: { type: 'date' },
    marble_id: { type: 'uuid' },
  });
  if (!body.track_id && !body.random_track) throw badRequest('Provide track_id or set random_track to true');
  if (body.track_id && body.random_track) throw badRequest('Use either track_id or random_track, not both');
  const max = body.max_marbles ?? Math.max(defaultMarbles, body.min_marbles ?? minMarbles);
  const min = body.min_marbles ?? Math.min(defaultMarbles, max);
  if (min > max) throw badRequest('min_marbles cannot exceed max_marbles');
  if (body.scheduled_at && body.scheduled_at.getTime() < Date.now() - 1000) {
    throw badRequest('scheduled_at must be in the future');
  }

  const raceId = await db.withTransaction(async (client) => {
    const { rows: track } = body.random_track
      ? await client.query('SELECT id FROM tracks WHERE is_active ORDER BY random() LIMIT 1')
      : await client.query('SELECT id FROM tracks WHERE id = $1 AND is_active', [body.track_id]);
    if (!track[0]) throw badRequest(body.random_track ? 'No active tracks available' : 'Track not found or inactive');
    const trackId = track[0].id;

    const { rows } = await client.query(
      `INSERT INTO races (track_id, name, min_marbles, max_marbles, entry_fee_coins, fill_with_bots,
                          scheduled_at, created_by, tick_rate_hz, countdown_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [trackId, body.name ?? null, min, max, body.entry_fee_coins ?? 0, body.fill_with_bots ?? true,
        body.scheduled_at ?? null, req.user.id, config.game.tickRateHz, config.game.countdownMs],
    );
    if (body.marble_id) await joinRace(client, rows[0].id, req.user.id, body.marble_id);
    return rows[0].id;
  });

  const race = await getRaceRow(raceId);
  raceManager.emitLobby('lobby:race_created', race);
  res.status(201).json({ race, entries: await getEntries(raceId, false) });
});

/** GET /api/races/:id — race details and entries (results only once finished) */
router.get('/:id', async (req, res) => {
  const id = assertUuid(req.params.id);
  const race = await getRaceRow(id);
  const finished = race.status === 'finished';
  const live = raceManager.snapshot(id);
  res.json({
    race,
    entries: await getEntries(id, finished),
    ...(live && { live: { status: live.status, elapsedMs: live.elapsedMs, durationMs: live.meta.durationMs } }),
  });
});

/** POST /api/races/:id/join  { marble_id } */
router.post('/:id/join', requireAuth, async (req, res) => {
  const id = assertUuid(req.params.id);
  const { marble_id: marbleId } = validate(req.body, { marble_id: { type: 'uuid', required: true } });
  const { race, entry, entryCount } = await db.withTransaction((client) => joinRace(client, id, req.user.id, marbleId));
  raceManager.notifyRaceUpdated(race, { entryCount });
  res.status(201).json({ entry });
});

/**
 * POST /api/races/:id/next  { marble_id? } — race again: the follow-up race on
 * the same track, so a group keeps going together. The first player to ask
 * sets it up (same settings, starting by itself after a short wait) and every
 * later ask lands in that same race; with marble_id the player is entered too.
 * Everyone still watching the finished race hears about it ('race:next').
 * A rematch that has already been run (or was cancelled) is replaced by a fresh one.
 */
router.post('/:id/next', requireAuth, async (req, res) => {
  const id = assertUuid(req.params.id);
  const { marble_id: marbleId } = validate(req.body ?? {}, { marble_id: { type: 'uuid' } });
  const { nextId, created, joined } = await db.withTransaction(async (client) => {
    const { rows } = await client.query('SELECT * FROM races WHERE id = $1 FOR UPDATE', [id]);
    const race = rows[0];
    if (!race) throw notFound('Race not found');
    if (race.status !== 'finished') throw conflict('You can race again once this race has finished');
    let next = null;
    if (race.next_race_id) {
      const { rows: n } = await client.query('SELECT id, status FROM races WHERE id = $1', [race.next_race_id]);
      if (n[0] && !['finished', 'cancelled'].includes(n[0].status)) next = n[0];
    }
    let made = false;
    if (!next) {
      const { rows: n } = await client.query(
        `INSERT INTO races (track_id, name, min_marbles, max_marbles, entry_fee_coins, fill_with_bots,
                            scheduled_at, created_by, tick_rate_hz, countdown_ms)
         VALUES ($1, $2, $3, $4, $5, $6, now() + make_interval(secs => $7::double precision / 1000), $8, $9, $10)
         RETURNING id, status`,
        [race.track_id, race.name, race.min_marbles, race.max_marbles, race.entry_fee_coins, race.fill_with_bots,
          config.game.nextRaceDelayMs, req.user.id, race.tick_rate_hz, race.countdown_ms],
      );
      next = n[0];
      made = true;
      await client.query('UPDATE races SET next_race_id = $2 WHERE id = $1', [id, next.id]);
    }
    let entered = null;
    if (marbleId && next.status === 'lobby') {
      const { rows: mine } = await client.query('SELECT 1 FROM race_entries WHERE race_id = $1 AND user_id = $2', [next.id, req.user.id]);
      if (!mine[0]) entered = await joinRace(client, next.id, req.user.id, marbleId);
    }
    return { nextId: next.id, created: made, joined: entered };
  });

  const next = await getRaceRow(nextId);
  if (created) {
    raceManager.emitLobby('lobby:race_created', next);
    raceManager.emitRace(id, 'race:next', { raceId: id, nextRaceId: nextId, scheduledAt: next.scheduled_at });
  }
  if (joined) raceManager.notifyRaceUpdated(joined.race, { entryCount: joined.entryCount });
  res.status(created ? 201 : 200).json({ race: next, entries: await getEntries(nextId, false) });
});

/** DELETE /api/races/:id/join — leave a lobby race (entry fee refunded) */
router.delete('/:id/join', requireAuth, async (req, res) => {
  const id = assertUuid(req.params.id);
  const race = await db.withTransaction(async (client) => {
    const { rows } = await client.query('SELECT * FROM races WHERE id = $1 FOR UPDATE', [id]);
    if (!rows[0]) throw notFound('Race not found');
    if (rows[0].status !== 'lobby') throw conflict('Cannot leave a race that has already been decided');
    const { rowCount } = await client.query('DELETE FROM race_entries WHERE race_id = $1 AND user_id = $2', [id, req.user.id]);
    if (!rowCount) throw notFound('You are not entered in this race');
    if (rows[0].entry_fee_coins > 0) {
      await client.query('UPDATE users SET coins = coins + $2 WHERE id = $1', [req.user.id, rows[0].entry_fee_coins]);
    }
    return rows[0];
  });
  raceManager.notifyRaceUpdated(race);
  res.status(204).end();
});

/**
 * POST /api/races/:id/start — creator/admin only.
 * Decides the outcome on the server, then streams it to every watcher.
 */
router.post('/:id/start', requireAuth, async (req, res) => {
  const id = assertUuid(req.params.id);
  const race = await raceManager.start(id, req.user);
  res.status(202).json({
    race: { id: race.id, status: race.status, started_at: race.started_at, countdown_ms: race.countdown_ms },
    stream: { room: raceManager.room(id), event: 'race:watch' },
  });
});

/** POST /api/races/:id/cancel — creator/admin, lobby only */
router.post('/:id/cancel', requireAuth, async (req, res) => {
  const id = assertUuid(req.params.id);
  const race = await raceService.cancel(id, req.user);
  raceManager.emitRace(id, 'race:cancelled', { raceId: id });
  raceManager.emitLobby('lobby:race_updated', { raceId: id, status: 'cancelled' });
  res.json({ race });
});

/**
 * GET /api/races/:id/results — official results once the race has finished.
 * Each result carries a `comparison` with the player's previous bests on this
 * track and the track record before this race, plus personal-best flags.
 */
router.get('/:id/results', async (req, res) => {
  const id = assertUuid(req.params.id);
  const race = await getRaceRow(id);
  if (race.status !== 'finished') throw conflict(`Results are not available while the race is ${race.status}`);
  const [results, comparisons] = await Promise.all([
    raceService.getResults(db, id),
    raceService.getComparisons(db, id),
  ]);
  const winner = results[0];
  res.json({
    race,
    results: results.map((r) => {
      const c = comparisons[r.entry_id] || {};
      const beats = (value, previous) => previous === null || previous === undefined || value < previous;
      return {
        ...r,
        gap_to_winner_ms: r.finish_time_ms - winner.finish_time_ms,
        split_gap_to_leader_ms: r.split_time_ms - Math.min(...results.map((x) => x.split_time_ms)),
        comparison: {
          ...c,
          is_personal_best: !r.is_bot && beats(r.finish_time_ms, c.previous_best_time_ms),
          is_split_personal_best: !r.is_bot && beats(r.split_time_ms, c.previous_best_split_ms),
          is_track_record: beats(r.finish_time_ms, c.previous_track_record_ms) && r.position === 1,
        },
      };
    }),
  });
});

/**
 * GET /api/races/:id/replay — full frame data for a finished race: regenerated
 * deterministically from the stored seed and stat snapshots (classic races), or
 * as stored when it was decided (races on the new physics).
 */
router.get('/:id/replay', async (req, res) => {
  const id = assertUuid(req.params.id);
  const { race, entries } = await raceService.loadSimulationInput(db, id);
  if (race.status !== 'finished') throw conflict(`Replay is not available while the race is ${race.status}`);
  const sim = await raceService.loadRun(db, race, entries);
  res.set('Cache-Control', 'public, max-age=86400, immutable');
  res.json({
    ...raceService.describeForClients(race, entries),
    seed: race.seed,
    durationMs: sim.durationMs,
    tickMs: sim.tickMs,
    tickRateHz: sim.tickRateHz,
    results: sim.results,
    events: sim.events,
    frames: sim.frames,
    ...(sim.start && { start: sim.start }),
  });
});

module.exports = router;
