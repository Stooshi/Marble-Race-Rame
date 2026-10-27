'use strict';

/**
 * How long stored replays are kept (Moses, 27 Oct 2026, option 3 before launch): **30 days**. Results
 * are kept for ever (races, race_entries: nothing here touches them); only the replay a race can be
 * watched again from (race_replays) goes after 30 days, except the replays something still shows or
 * will want to:
 *   - the latest 200 finished races (the landing page's "closest finish" replay picks from them);
 *   - each track's record: the fastest time on it by anyone, and the fastest by a player;
 *   - the country records: each country's fastest player on each track (as src/country/records.js counts them);
 *   - each collection marble's first win (its certificate's race).
 * A race older than 30 days without its replay still has its results; "Watch replay" then says the
 * replay is no longer kept (GET /api/races/:id/replay: 410 `replay_gone`).
 *
 * Every day at 04:30 UTC, in batches. Behind REPLAY_TRIM on Railway: unset (the default) it only
 * logs what it would delete ("[replays] DRY RUN …"); `on` deletes. (Freed space is reused by the
 * database; the daily backup is smaller at once, since it only holds the rows that are left.)
 */

const KEEP_DAYS = 30;
const KEEP_RECENT = 200;
const BATCH = 500;

const mode = (env = process.env) => (String(env.REPLAY_TRIM ?? '').trim().toLowerCase() === 'on' ? 'on' : 'dry-run');

// The replays kept whatever their age.
const keepSql = (recent = KEEP_RECENT) => `
  SELECT race_id FROM (
    SELECT r.id AS race_id FROM races r
     WHERE r.status = 'finished' AND EXISTS (SELECT 1 FROM race_replays rp WHERE rp.race_id = r.id)
     ORDER BY r.finished_at DESC LIMIT ${Math.max(0, Math.floor(recent))}
  ) recent
  UNION
  SELECT race_id FROM (
    SELECT DISTINCT ON (r.track_id) e.race_id
      FROM race_entries e JOIN races r ON r.id = e.race_id AND r.status = 'finished'
     WHERE e.finish_time_ms IS NOT NULL
     ORDER BY r.track_id, e.finish_time_ms, r.finished_at
  ) track_record
  UNION
  SELECT race_id FROM (
    SELECT DISTINCT ON (r.track_id) e.race_id
      FROM race_entries e JOIN races r ON r.id = e.race_id AND r.status = 'finished'
     WHERE e.finish_time_ms IS NOT NULL AND NOT e.is_bot
     ORDER BY r.track_id, e.finish_time_ms, r.finished_at
  ) player_record
  UNION
  SELECT race_id FROM (
    SELECT DISTINCT ON (r.track_id, e.country) e.race_id
      FROM race_entries e JOIN races r ON r.id = e.race_id AND r.status = 'finished' JOIN users u ON u.id = e.user_id
     WHERE e.country IS NOT NULL AND NOT e.is_bot AND e.finish_time_ms IS NOT NULL
       AND u.deleted_at IS NULL AND u.suspended_at IS NULL AND NOT u.is_guest
     ORDER BY r.track_id, e.country, e.finish_time_ms, r.finished_at
  ) country_record
  UNION
  SELECT race_id FROM (
    SELECT DISTINCT ON (l.collection_id) e.race_id
      FROM race_entry_looks l JOIN race_entries e ON e.id = l.entry_id JOIN races r ON r.id = e.race_id AND r.status = 'finished'
     WHERE e.finish_position = 1
     ORDER BY l.collection_id, r.finished_at
  ) first_win`;

// Replays of races over KEEP_DAYS old (finished or cancelled; a race still running is never touched).
const dueSql = (recent) => `
  SELECT rp.race_id FROM race_replays rp JOIN races r ON r.id = rp.race_id
   WHERE r.status IN ('finished', 'cancelled')
     AND COALESCE(r.finished_at, r.updated_at, rp.created_at) < $1
     AND rp.race_id NOT IN (${keepSql(recent)})
   LIMIT $2`;

/** One run: → { due, deleted, bytes } (bytes: what the deleted replays took). `dryRun`: count only. */
async function trimReplays(db, { now = new Date(), dryRun = mode() !== 'on', batches = 40, keepRecent = KEEP_RECENT } = {}) {
  const before = new Date(now.getTime() - KEEP_DAYS * 86_400_000);
  if (dryRun) {
    const { rows: [r] } = await db.query(
      `SELECT COUNT(*)::int AS due, COALESCE(SUM(length(rp.data)), 0)::bigint AS bytes
         FROM race_replays rp WHERE rp.race_id IN (${dueSql(keepRecent).replace('LIMIT $2', '')})`,
      [before],
    );
    return { due: r.due, deleted: 0, bytes: Number(r.bytes) };
  }
  let deleted = 0;
  let bytes = 0;
  for (let k = 0; k < batches; k += 1) {
    const { rows } = await db.query(
      `DELETE FROM race_replays WHERE race_id IN (${dueSql(keepRecent)}) RETURNING length(data) AS n`,
      [before, BATCH],
    );
    deleted += rows.length;
    bytes += rows.reduce((s, r) => s + Number(r.n), 0);
    if (rows.length < BATCH) break;
  }
  return { due: deleted, deleted, bytes };
}

/** Every day at 04:30 UTC (and once a few minutes after the server starts). */
function startJobs(db, { log = console.log } = {}) {
  const run = async () => {
    try {
      const dryRun = mode() !== 'on';
      const r = await trimReplays(db, { dryRun });
      const mb = (r.bytes / 1e6).toFixed(1);
      if (dryRun) log(`[replays] DRY RUN: ${r.due} replays over ${KEEP_DAYS} days old would be deleted (${mb} MB); set REPLAY_TRIM=on to delete them`);
      else if (r.deleted) log(`[replays] deleted ${r.deleted} replays over ${KEEP_DAYS} days old (${mb} MB)`);
    } catch (err) {
      console.error('[replays] trimming failed', err);
    }
  };
  const first = setTimeout(run, 5 * 60_000);
  first.unref?.();
  const next = () => {
    const now = new Date();
    const at = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 4, 30));
    if (at <= now) at.setUTCDate(at.getUTCDate() + 1);
    const t = setTimeout(async () => { await run(); next(); }, at - now);
    t.unref?.();
  };
  next();
}

module.exports = { KEEP_DAYS, KEEP_RECENT, mode, trimReplays, startJobs, KEEP_SQL: keepSql() };
