'use strict';

/**
 * Race readiness (Moses, 28 Oct 2026): each screen says, once per race, whether it had everything
 * loaded (the track and its scenery, the marbles, the sound) by GO, and if not what was missing and
 * how late it caught up. So we can see the pattern (which devices, which pieces, how slow).
 *
 * - Nothing waits for it: the server never holds a race for one player (rooms, Quick race, League
 *   Night). A solo race already waits on the player's own screen before its countdown.
 * - Kept 30 days (KEEP_DAYS), then deleted. No IP address; the device is the browser's own short
 *   description (user agent, cut to 200 characters) and the platform the app says (web, ios, android).
 * - Each report is also one log line on Railway: `[readiness] race … NOT READY …`.
 */

const KEEP_DAYS = 30;
const PLATFORMS = ['web', 'ios', 'android'];
const KINDS = ['solo', 'room'];
const PIECES = ['track', 'marbles', 'sound'];
const MAX_MISSING = 12;

/** A report from the client, checked and trimmed. → the row's fields, or throws a message. */
function clean(body = {}) {
  const platform = PLATFORMS.includes(body.platform) ? body.platform : 'web';
  const kind = KINDS.includes(body.kind) ? body.kind : 'room';
  const missing = (Array.isArray(body.missing) ? body.missing : [])
    .filter((m) => typeof m === 'string' && m.length > 0)
    .map((m) => m.slice(0, 40).replace(/[^\w .:-]/g, ''))
    .slice(0, MAX_MISSING);
  const lateMs = Number.isFinite(Number(body.lateMs)) ? Math.max(0, Math.min(10 * 60_000, Math.round(Number(body.lateMs)))) : 0;
  const d = body.details && typeof body.details === 'object' && !Array.isArray(body.details) ? body.details : {};
  // (Only these, each a short value: nothing else a client sends is kept.)
  const details = {};
  for (const k of ['backend', 'started', 'running', 'connection', 'memoryGb', 'heldMs', 'waitedMs', 'sound']) {
    const v = d[k];
    if (typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v))) details[k] = v;
    else if (typeof v === 'string') details[k] = v.slice(0, 40);
    else if (Array.isArray(v)) details[k] = v.filter((x) => typeof x === 'string').map((x) => x.slice(0, 40)).slice(0, MAX_MISSING);
  }
  return { platform, kind, ready: missing.length === 0, missing, lateMs, details };
}

/** The piece a missing item belongs to: 'track', 'marbles', or 'sound' (a sound file's name). */
const pieceOf = (m) => (PIECES.includes(m) ? m : m.startsWith('track') ? 'track' : 'sound');

/** Records one screen's report (each screen sends it once per race). */
async function record(db, { raceId, userId = null, device = null, report }) {
  const r = report;
  await db.query(
    `INSERT INTO race_readiness (race_id, user_id, platform, kind, device, ready, missing, late_ms, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [raceId, userId, r.platform, r.kind, device ? String(device).slice(0, 200) : null, r.ready, r.missing, r.lateMs, r.details],
  );
  console.log(`[readiness] race ${raceId} ${r.kind} ${r.platform} ${r.ready ? 'ready' : `NOT READY, missing ${r.missing.join(', ')}; caught up ${r.lateMs} ms after GO`}${r.details.backend ? ` (sound: ${r.details.backend})` : ''}`);
}

/**
 * The pattern over the last `days` days: per platform how many screens were ready by GO, and how
 * often each piece was missing; plus the latest screens that weren't.
 */
async function summary(db, { days = 7, limit = 50 } = {}) {
  const { rows: byPlatform } = await db.query(
    `SELECT platform, kind, count(*)::int AS screens, count(*) FILTER (WHERE ready)::int AS ready,
            round(avg(late_ms) FILTER (WHERE NOT ready))::int AS avg_late_ms
       FROM race_readiness WHERE created_at > now() - make_interval(days => $1)
      GROUP BY platform, kind ORDER BY platform, kind`,
    [days],
  );
  const { rows: missingRows } = await db.query(
    `SELECT platform, m AS missing, count(*)::int AS times
       FROM race_readiness, unnest(missing) AS m
      WHERE created_at > now() - make_interval(days => $1)
      GROUP BY platform, m ORDER BY times DESC LIMIT 40`,
    [days],
  );
  const { rows: latest } = await db.query(
    `SELECT race_id, platform, kind, device, missing, late_ms, details, created_at
       FROM race_readiness WHERE NOT ready AND created_at > now() - make_interval(days => $1)
      ORDER BY created_at DESC LIMIT $2`,
    [days, limit],
  );
  return { days, byPlatform, missing: missingRows.map((m) => ({ ...m, piece: pieceOf(m.missing) })), latest };
}

/** Deletes reports over KEEP_DAYS old. → how many. */
async function trim(db, { days = KEEP_DAYS } = {}) {
  const { rowCount } = await db.query('DELETE FROM race_readiness WHERE created_at < now() - make_interval(days => $1)', [days]);
  return rowCount;
}

function startJobs(db) {
  const run = () => trim(db).then((n) => { if (n) console.log(`[readiness] deleted ${n} reports over ${KEEP_DAYS} days old`); })
    .catch((err) => console.error('[readiness] trim failed', err.message));
  run();
  const timer = setInterval(run, 24 * 3600_000);
  timer.unref?.();
  return timer;
}

module.exports = { KEEP_DAYS, clean, record, summary, trim, startJobs, pieceOf };
