'use strict';

/**
 * The back office Dashboard (Moses, 2 Nov 2026): read-only numbers for a period, in Swedish time.
 * Only counts and country codes, never a player. Staff (users.is_staff, and every admin) are
 * left out of every number; computer players are never counted (race_entries.is_bot).
 *
 * - players: new guests (made when they tapped Play, from 2 Nov 2026), new saved accounts (signed
 *   up, or a guest saved), players who finished at least one race, returning players (finished a
 *   race on a later Swedish day than the day they joined);
 * - races: races finished (with at least one counted player), average finished races per active player;
 * - the funnel of the new guests whose first tap falls in the period: tapped Play → joined a race →
 *   saw GO → finished a race (first_steps and race_entries), with the tap's source;
 * - new players (guests and direct sign-ups) by the country detected at their first visit;
 * - a chart: new guests and players who finished a race, per hour (6 and 24 hours) or per day.
 */
const TZ = 'Europe/Stockholm';

const NOW = 'now()';
const MONTH_START = `(date_trunc('month', now() AT TIME ZONE '${TZ}') AT TIME ZONE '${TZ}')`;
const PERIODS = {
  '6h': { label: 'Last 6 hours', from: "now() - interval '6 hours'", to: NOW, bucket: 'hour' },
  '24h': { label: 'Last 24 hours', from: "now() - interval '24 hours'", to: NOW, bucket: 'hour' },
  '7d': { label: 'Last 7 days', from: "now() - interval '7 days'", to: NOW, bucket: 'day' },
  '30d': { label: 'Last 30 days', from: "now() - interval '30 days'", to: NOW, bucket: 'day' },
  mtd: { label: 'Month to date', from: MONTH_START, to: NOW, bucket: 'day' },
  lastmonth: {
    label: 'Last month',
    from: `((date_trunc('month', now() AT TIME ZONE '${TZ}') - interval '1 month') AT TIME ZONE '${TZ}')`,
    to: MONTH_START,
    bucket: 'day',
  },
};

/** Not staff: neither marked staff nor an admin (admins are staff automatically). */
const COUNTED = "NOT (u.is_staff OR u.role = 'admin')";

const one = async (db, sql, params) => (await db.query(sql, params)).rows[0];

async function summary(db, period = '24h') {
  const p = PERIODS[period] ?? PERIODS['24h'];
  const { from, to } = await one(db, `SELECT ${p.from} AS from, ${p.to} AS to`);
  const range = [from, to];

  const players = await one(db, `
    WITH fin AS (
      SELECT e.user_id, r.id AS race_id, r.finished_at, u.created_at
        FROM race_entries e JOIN races r ON r.id = e.race_id JOIN users u ON u.id = e.user_id
       WHERE NOT e.is_bot AND r.status = 'finished' AND r.finished_at >= $1 AND r.finished_at < $2 AND ${COUNTED}
    )
    SELECT
      (SELECT COUNT(DISTINCT e.user_id)::int FROM security_events e JOIN users u ON u.id = e.user_id
        WHERE e.kind = 'guest' AND e.created_at >= $1 AND e.created_at < $2 AND ${COUNTED}) AS new_guests,
      (SELECT COUNT(*)::int FROM (
          SELECT e.user_id, MIN(e.created_at) AS at FROM security_events e
           WHERE e.kind IN ('signup', 'claim') GROUP BY e.user_id) s
         JOIN users u ON u.id = s.user_id
        WHERE s.at >= $1 AND s.at < $2 AND ${COUNTED}) AS new_saved,
      (SELECT COUNT(DISTINCT user_id)::int FROM fin) AS finished_players,
      (SELECT COUNT(DISTINCT user_id)::int FROM fin
        WHERE (finished_at AT TIME ZONE '${TZ}')::date > (created_at AT TIME ZONE '${TZ}')::date) AS returning_players,
      (SELECT COUNT(DISTINCT race_id)::int FROM fin) AS races_finished,
      (SELECT COUNT(*)::int FROM fin) AS finished_entries`, range);

  const funnel = await one(db, `
    WITH t AS (
      SELECT f.user_id, f.source FROM first_steps f JOIN users u ON u.id = f.user_id
       WHERE f.step = 'tap' AND f.created_at >= $1 AND f.created_at < $2 AND ${COUNTED}
    ), s AS (
      SELECT
             EXISTS (SELECT 1 FROM race_entries e WHERE e.user_id = t.user_id AND NOT e.is_bot) AS joined,
             EXISTS (SELECT 1 FROM first_steps g WHERE g.user_id = t.user_id AND g.step = 'go') AS saw_go,
             EXISTS (SELECT 1 FROM race_entries e JOIN races r ON r.id = e.race_id
                      WHERE e.user_id = t.user_id AND NOT e.is_bot AND r.status = 'finished') AS finished
        FROM t
    )
    SELECT COUNT(*)::int AS tapped,
           COUNT(*) FILTER (WHERE joined)::int AS joined,
           COUNT(*) FILTER (WHERE saw_go)::int AS saw_go,
           COUNT(*) FILTER (WHERE finished)::int AS finished
      FROM s`, range);
  const { rows: sources } = await db.query(`
    SELECT COALESCE(f.source, 'unknown') AS source, COUNT(*)::int AS n
      FROM first_steps f JOIN users u ON u.id = f.user_id
     WHERE f.step = 'tap' AND f.created_at >= $1 AND f.created_at < $2 AND ${COUNTED}
     GROUP BY 1 ORDER BY 2 DESC`, range);

  const { rows: countries } = await db.query(`
    SELECT COALESCE((SELECT s.country FROM security_events s WHERE s.user_id = n.user_id AND s.country IS NOT NULL
                      ORDER BY s.created_at, s.id LIMIT 1), '–') AS country, COUNT(*)::int AS players
      FROM (SELECT e.user_id, MIN(e.created_at) AS at FROM security_events e
             WHERE e.kind IN ('guest', 'signup') GROUP BY e.user_id) n
      JOIN users u ON u.id = n.user_id
     WHERE n.at >= $1 AND n.at < $2 AND ${COUNTED}
     GROUP BY 1 ORDER BY 2 DESC, 1`, range);

  const unit = p.bucket;
  const { rows: chart } = await db.query(`
    WITH b AS (
      SELECT gs AS at FROM generate_series(date_trunc('${unit}', $1 AT TIME ZONE '${TZ}'),
                                           ($2 AT TIME ZONE '${TZ}') - interval '1 second', interval '1 ${unit}') gs
    ), g AS (
      SELECT date_trunc('${unit}', e.created_at AT TIME ZONE '${TZ}') AS at, COUNT(DISTINCT e.user_id)::int AS n
        FROM security_events e JOIN users u ON u.id = e.user_id
       WHERE e.kind = 'guest' AND e.created_at >= $1 AND e.created_at < $2 AND ${COUNTED} GROUP BY 1
    ), f AS (
      SELECT date_trunc('${unit}', r.finished_at AT TIME ZONE '${TZ}') AS at, COUNT(DISTINCT e.user_id)::int AS n
        FROM race_entries e JOIN races r ON r.id = e.race_id JOIN users u ON u.id = e.user_id
       WHERE NOT e.is_bot AND r.status = 'finished' AND r.finished_at >= $1 AND r.finished_at < $2 AND ${COUNTED} GROUP BY 1
    )
    SELECT to_char(b.at, 'YYYY-MM-DD"T"HH24:MI') AS at, COALESCE(g.n, 0) AS new_guests, COALESCE(f.n, 0) AS finished_players
      FROM b LEFT JOIN g ON g.at = b.at LEFT JOIN f ON f.at = b.at ORDER BY b.at`, range);

  const active = players.finished_players;
  return {
    period: Object.keys(PERIODS).includes(period) ? period : '24h',
    label: p.label,
    from,
    to,
    timeZone: TZ,
    bucket: unit,
    players: {
      newGuests: players.new_guests,
      newSaved: players.new_saved,
      finishedPlayers: active,
      returningPlayers: players.returning_players,
    },
    races: {
      finished: players.races_finished,
      perActivePlayer: active ? Math.round((players.finished_entries / active) * 10) / 10 : 0,
    },
    funnel: {
      tapped: funnel?.tapped ?? 0,
      joined: funnel?.joined ?? 0,
      sawGo: funnel?.saw_go ?? 0,
      finished: funnel?.finished ?? 0,
      bySource: Object.fromEntries(sources.map((r) => [r.source, r.n])),
    },
    countries: countries.map((r) => ({ country: r.country, players: r.players })),
    chart: chart.map((r) => ({ at: r.at, newGuests: r.new_guests, finishedPlayers: r.finished_players })),
  };
}

module.exports = { PERIODS, TZ, summary };
