'use strict';

const crypto = require('crypto');
const zlib = require('zlib');
const db = require('../db');
const config = require('../config');
const { createRng } = require('./rng');
const { subSeed } = require('./simulator');
const { PHYSICS_VERSION } = require('./physicsSimulator');
const { runSimulation } = require('./runSimulation');
const simulationPool = require('./simulationPool');
const { HOUSE_SKILLS, skillStats } = require('./skill');
const { raceSession } = require('./raceSession');
const { withLighting } = require('../trackKit/lighting');

// Races on tracks with physics settings run on the new physics engine, at a
// smoother frame rate, and are stored as they were decided (race_replays).
const PHYSICS_TICK_HZ = 20;
const { badRequest, conflict, forbidden, notFound } = require('../utils/httpError');

/**
 * Database side of the race lifecycle:
 *   lobby --decide()--> countdown --markRunning()--> running --finalize()--> finished
 *   lobby --cancel()--> cancelled
 */

/**
 * Decided races use the track exactly as it was when the outcome was computed,
 * including which engine ran them: a snapshot without physics settings is a
 * classic race, whatever the track has since become.
 */
function withSnapshot(race) {
  if (race.track_snapshot) {
    Object.assign(race, race.track_snapshot);
    race.physics = race.track_snapshot.physics ?? null;
  }
  return race;
}

/** Loads everything the simulator needs, in a stable order, from persisted state. */
async function loadSimulationInput(client, raceId) {
  const { rows: raceRows } = await client.query(
    `SELECT r.*, t.length_m, t.lane_count, t.obstacles, t.waypoints, t.physics, t.name AS track_name, t.slug AS track_slug
       FROM races r JOIN tracks t ON t.id = r.track_id
      WHERE r.id = $1`,
    [raceId],
  );
  const race = raceRows[0];
  if (!race) throw notFound('Race not found');
  withSnapshot(race);

  const { rows: entries } = await client.query(
    `SELECT e.id, e.lane, e.user_id, e.is_bot, e.marble_id,
            e.snap_top_speed, e.snap_acceleration, e.snap_handling, e.snap_luck,
            e.finish_position, e.finish_time_ms,
            m.name AS marble_name, m.slug AS marble_slug, m.color_primary, m.color_secondary, m.pattern,
            u.username
       FROM race_entries e
       JOIN marbles m ON m.id = e.marble_id
       LEFT JOIN users u ON u.id = e.user_id
      WHERE e.race_id = $1
      ORDER BY e.lane ASC, e.id ASC`,
    [raceId],
  );
  return { race, entries };
}

/**
 * The race as it runs and replays: for the new physics, the replay stored when
 * it was decided (so later physics tuning never changes it); for classic races,
 * regenerated from the seed, exactly as always.
 */
async function loadRun(client, race, entries) {
  if (!race.physics) return runSimulation(race, entries);
  const { rows } = await client.query('SELECT data FROM race_replays WHERE race_id = $1', [race.id]);
  if (!rows[0]) throw new Error(`Race ${race.id} has no stored replay`);
  return JSON.parse(zlib.gunzipSync(rows[0].data).toString('utf8'));
}

/** Public, result-free description of a race used for the stream header. */
function describeForClients(race, entries) {
  return {
    raceId: race.id,
    name: race.name,
    session: raceSession(entries), // solo or group: who may skip to the results

    track: {
      id: race.track_id,
      slug: race.track_slug,
      name: race.track_name,
      length_m: Number(race.length_m),
      lane_count: race.lane_count,
      waypoints: race.waypoints,
      obstacles: race.obstacles,
      ...(race.physics && { physics: race.physics }),
    },
    entries: entries.map((e, index) => ({
      index,
      entryId: e.id,
      lane: e.lane,
      isBot: e.is_bot,
      user: e.user_id ? { id: e.user_id, username: e.username } : null,
      marble: {
        id: e.marble_id,
        slug: e.marble_slug,
        name: e.marble_name,
        color_primary: e.color_primary,
        color_secondary: e.color_secondary,
        pattern: e.pattern,
      },
    })),
  };
}

/**
 * Decides the race: fills empty slots with bots, assigns lanes, snapshots
 * marble stats, picks a seed and runs the simulation, persisting the results.
 * Must be called for a race in the lobby. Returns { race, entries, sim }.
 *
 * @param {string} raceId
 * @param {object|null} actor  user requesting the start (null = scheduler)
 */
async function decide(raceId, actor) {
  return db.withTransaction(async (client) => {
    const { rows } = await client.query('SELECT * FROM races WHERE id = $1 FOR UPDATE', [raceId]);
    const race = rows[0];
    if (!race) throw notFound('Race not found');
    if (actor && actor.role !== 'admin' && race.created_by !== actor.id) {
      throw forbidden('Only the race creator can start this race');
    }
    if (race.status !== 'lobby') throw conflict(`Race is already ${race.status}`);

    const seed = crypto.randomInt(0, 2 ** 32);
    const rng = createRng(subSeed(seed, 3));

    const { rows: current } = await client.query(
      'SELECT id, marble_id FROM race_entries WHERE race_id = $1 ORDER BY joined_at, id',
      [raceId],
    );

    // Fill with house bots up to the race minimum.
    let entryIds = current.map((e) => e.id);
    if (entryIds.length < race.min_marbles) {
      if (!race.fill_with_bots) {
        throw badRequest(`Race needs at least ${race.min_marbles} marbles (has ${entryIds.length})`);
      }
      const taken = current.map((e) => e.marble_id);
      const { rows: pool } = await client.query(
        `SELECT id FROM marbles WHERE is_active AND NOT (id = ANY($1::uuid[])) ORDER BY slug`,
        [taken],
      );
      const needed = race.min_marbles - entryIds.length;
      if (pool.length < needed) {
        throw conflict(`Not enough marbles in the catalog to fill the race (need ${needed} more)`);
      }
      const bots = rng.shuffle(pool.map((m) => m.id)).slice(0, needed);
      const { rows: inserted } = await client.query(
        `INSERT INTO race_entries (race_id, marble_id, user_id, is_bot)
         SELECT $1, unnest($2::uuid[]), NULL, true
         RETURNING id`,
        [raceId, bots],
      );
      entryIds = entryIds.concat(inserted.map((r) => r.id));
    }

    // Random lane draw + skill snapshot. Skill belongs to the player, not the
    // marble: players race at their own skill, house marbles at levels drawn
    // from the house ladder. The snapshot is what the engine reads, now and in
    // every replay.
    const lanes = rng.shuffle(entryIds.map((_, i) => i));
    const { rows: who } = await client.query(
      `SELECT e.id, e.is_bot, u.skill
         FROM race_entries e LEFT JOIN users u ON u.id = e.user_id
        WHERE e.race_id = $1`,
      [raceId],
    );
    const byId = new Map(who.map((w) => [w.id, w]));
    const house = rng.shuffle([...HOUSE_SKILLS]);
    let drawn = 0;
    const skills = entryIds.map((id) => {
      const w = byId.get(id);
      if (w && !w.is_bot && w.skill !== null) return w.skill;
      const skill = house[drawn % house.length];
      drawn += 1;
      return skill;
    });
    await client.query(
      `UPDATE race_entries e
          SET lane = l.lane,
              snap_top_speed = l.skill,
              snap_acceleration = l.skill,
              snap_handling = l.skill,
              snap_luck = l.skill
         FROM unnest($1::uuid[], $2::int[], $3::int[]) AS l(entry_id, lane, skill)
        WHERE e.id = l.entry_id`,
      [entryIds, lanes, skills.map((k) => skillStats(k).topSpeed)],
    );

    // Seed and tick rate are only persisted below, together with the duration
    // the simulation picks, so apply them in memory for this run.
    const input = await loadSimulationInput(client, raceId);
    const tickRateHz = input.race.physics ? PHYSICS_TICK_HZ : config.game.tickRateHz;
    input.race.seed = seed;
    input.race.tick_rate_hz = tickRateHz;
    // Kit tracks: this race's lighting and weather, from its seed (looks only), kept in its
    // snapshot so the replay looks the same. Other tracks are left exactly as they are.
    if (input.race.physics?.kit) input.race.physics = withLighting(input.race.physics, seed);
    // (In a worker thread: the live races being streamed meanwhile never freeze.)
    const { sim, replay } = await simulationPool.simulate(input.race, input.entries);

    await client.query(
      `UPDATE race_entries e
          SET finish_position = r.position, finish_time_ms = r.time_ms, split_time_ms = r.split_ms
         FROM unnest($1::uuid[], $2::int[], $3::int[], $4::int[]) AS r(entry_id, position, time_ms, split_ms)
        WHERE e.id = r.entry_id`,
      [
        sim.results.map((r) => r.entryId),
        sim.results.map((r) => r.position),
        sim.results.map((r) => r.finishTimeMs),
        sim.results.map((r) => r.splitTimeMs),
      ],
    );

    const { rows: updated } = await client.query(
      `UPDATE races
          SET status = 'countdown', seed = $2, target_duration_ms = $3, tick_rate_hz = $4,
              countdown_ms = $5::int, decided_at = now(),
              started_at = now() + make_interval(secs => $5::int / 1000.0),
              track_snapshot = $6
        WHERE id = $1
        RETURNING *`,
      [raceId, seed, sim.durationMs, tickRateHz, config.game.countdownMs, JSON.stringify({
        length_m: Number(input.race.length_m),
        lane_count: input.race.lane_count,
        waypoints: input.race.waypoints,
        obstacles: input.race.obstacles,
        // The new physics: its settings and the engine version, so this race always replays as it ran.
        ...(input.race.physics && { physics: input.race.physics, engine: PHYSICS_VERSION }),
      })],
    );
    if (input.race.physics) {
      await client.query(
        'INSERT INTO race_replays (race_id, engine, data) VALUES ($1, $2, $3)',
        [raceId, PHYSICS_VERSION, replay],
      );
    }

    const full = { ...input.race, ...updated[0] };
    return { race: full, entries: input.entries, sim };
  });
}

async function markRunning(raceId) {
  await db.query(`UPDATE races SET status = 'running' WHERE id = $1 AND status = 'countdown'`, [raceId]);
}

/**
 * Marks the race finished and pays out coins. Idempotent: only the first call
 * for a running race has any effect. Returns the public results, or null if the
 * race was not in a finishable state.
 */
async function finalize(raceId) {
  return db.withTransaction(async (client) => {
    const { rows } = await client.query(
      `UPDATE races SET status = 'finished', finished_at = started_at + make_interval(secs => target_duration_ms::double precision / 1000)
        WHERE id = $1 AND status IN ('countdown', 'running')
        RETURNING id`,
      [raceId],
    );
    if (!rows[0]) return null;

    const { podiumRewards, participationReward } = config.game;
    const { rows: humans } = await client.query(
      'SELECT id, user_id, finish_position FROM race_entries WHERE race_id = $1 AND user_id IS NOT NULL',
      [raceId],
    );
    for (const h of humans) {
      const coins = (podiumRewards[h.finish_position - 1] || 0) + participationReward;
      if (coins <= 0) continue;
      await client.query('UPDATE race_entries SET coins_awarded = $2 WHERE id = $1', [h.id, coins]);
      await client.query('UPDATE users SET coins = coins + $2 WHERE id = $1', [h.user_id, coins]);
    }

    return getResults(client, raceId);
  });
}

async function getResults(client, raceId) {
  const { rows } = await client.query(
    `SELECT e.id AS entry_id, e.finish_position AS position, e.finish_time_ms, e.split_time_ms,
            e.lane, e.is_bot, e.coins_awarded,
            e.marble_id, m.name AS marble_name, m.color_primary, m.color_secondary, m.pattern,
            e.user_id, u.username
       FROM race_entries e
       JOIN marbles m ON m.id = e.marble_id
       LEFT JOIN users u ON u.id = e.user_id
      WHERE e.race_id = $1
      ORDER BY e.finish_position ASC NULLS LAST`,
    [raceId],
  );
  return rows;
}

/**
 * For every entry in a finished race, how it compares with what came before on
 * the same track: the player's previous bests (finish time, halfway split,
 * position) and the track record as it stood before this race.
 * Keyed by entry id.
 */
async function getComparisons(client, raceId) {
  const { rows } = await client.query(
    `WITH this_race AS (
       SELECT id, track_id, finished_at FROM races WHERE id = $1 AND status = 'finished'
     ),
     earlier AS (
       SELECT e.user_id, e.finish_time_ms, e.split_time_ms, e.finish_position
         FROM race_entries e
         JOIN races r ON r.id = e.race_id AND r.status = 'finished'
         JOIN this_race t ON r.track_id = t.track_id AND r.finished_at < t.finished_at
     )
     SELECT e.id AS entry_id,
            prev.races AS previous_races_on_track,
            prev.best_time_ms AS previous_best_time_ms,
            prev.best_split_ms AS previous_best_split_ms,
            prev.best_position AS previous_best_position,
            prev.avg_position AS previous_avg_position,
            rec.record_ms AS previous_track_record_ms,
            rec.record_split_ms AS previous_track_record_split_ms
       FROM race_entries e
       CROSS JOIN this_race
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS races,
                MIN(x.finish_time_ms) AS best_time_ms,
                MIN(x.split_time_ms) AS best_split_ms,
                MIN(x.finish_position) AS best_position,
                ROUND(AVG(x.finish_position)::numeric, 2) AS avg_position
           FROM earlier x WHERE x.user_id = e.user_id
       ) prev ON e.user_id IS NOT NULL
       CROSS JOIN LATERAL (
         SELECT MIN(finish_time_ms) AS record_ms, MIN(split_time_ms) AS record_split_ms FROM earlier
       ) rec
      WHERE e.race_id = $1`,
    [raceId],
  );

  const out = {};
  for (const r of rows) {
    const { entry_id: entryId, ...c } = r;
    out[entryId] = c;
  }
  return out;
}

/** Cancels a lobby race and refunds entry fees. */
async function cancel(raceId, actor) {
  return db.withTransaction(async (client) => {
    const { rows } = await client.query('SELECT * FROM races WHERE id = $1 FOR UPDATE', [raceId]);
    const race = rows[0];
    if (!race) throw notFound('Race not found');
    if (actor.role !== 'admin' && race.created_by !== actor.id) {
      throw forbidden('Only the race creator can cancel this race');
    }
    if (race.status !== 'lobby') throw conflict(`Cannot cancel a race that is ${race.status}`);

    if (race.entry_fee_coins > 0) {
      await client.query(
        `UPDATE users u SET coins = coins + $2
           FROM race_entries e WHERE e.race_id = $1 AND e.user_id = u.id`,
        [raceId, race.entry_fee_coins],
      );
    }
    const { rows: updated } = await client.query(
      `UPDATE races SET status = 'cancelled', finished_at = now() WHERE id = $1 RETURNING *`,
      [raceId],
    );
    return updated[0];
  });
}

module.exports = {
  loadSimulationInput,
  withSnapshot,
  runSimulation,
  loadRun,
  describeForClients,
  decide,
  markRunning,
  finalize,
  getResults,
  getComparisons,
  cancel,
};
