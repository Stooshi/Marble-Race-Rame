'use strict';

/**
 * Guest accounts are deleted after 90 days without a visit (Moses, 21 Oct 2026; the privacy
 * policy's retention rule). A guest can't log in again after that anyway: a guest's login ends 90 days
 * after the last visit (GUEST_JWT_EXPIRES_IN, renewed on each visit by GET /auth/me; saved accounts 180). Deleting is the same
 * as a player deleting their account (./index.js deleteAccount): name and settings go, race results
 * stay under an anonymous name, and payment records stay for bookkeeping (7 years).
 *
 * A visit is users.last_seen_at: set when the account is made, and on a visit at most once a day.
 * Saved accounts are never deleted here: they stay until the player deletes them.
 */
const { deleteAccount } = require('./index');

const GUEST_DAYS = 90;
const BATCH = 500;

/**
 * Dry run unless GUEST_RETENTION_MODE=delete (Moses, 21 Oct 2026): at first the job only logs how
 * many guests it would delete and why; Moses switches it on in Railway once he has read the log.
 */
const live = () => String(process.env.GUEST_RETENTION_MODE || '').trim().toLowerCase() === 'delete';

/**
 * A guest's last visit: the latest of users.last_seen_at, when the account was made, its last login
 * and its last race. (last_seen_at came with the deploy of 21 Oct 2026: for the accounts that existed
 * then it was set to that moment, so nobody can be deleted for 90 days after it.)
 */
const LAST_VISIT = `GREATEST(u.last_seen_at, u.created_at, u.last_login_at,
  (SELECT max(e.joined_at) FROM race_entries e WHERE e.user_id = u.id))`;

/** Guests whose last visit is more than `days` days before `now`: [{ id, last_visit, created_at }]. */
async function idleGuests(db, { days = GUEST_DAYS, now = new Date(), limit = BATCH } = {}) {
  const { rows } = await db.query(
    `SELECT u.id, ${LAST_VISIT} AS last_visit, u.created_at FROM users u
      WHERE u.is_guest AND u.deleted_at IS NULL AND u.role = 'player'
        AND ${LAST_VISIT} < $1::timestamptz - make_interval(days => $2)
      ORDER BY 2 LIMIT $3`,
    [now, days, limit],
  );
  return rows;
}

/**
 * Deletes guests not seen for `days` days (anonymised like a deleted account), or in a dry run
 * (the default) only counts them. → { mode: 'delete' | 'dry-run', count, oldest (their last visits) }.
 */
async function deleteIdleGuests(db, { days = GUEST_DAYS, now = new Date(), dryRun = !live() } = {}) {
  if (dryRun) {
    const { rows: [n] } = await db.query(
      `SELECT count(*)::int AS count, min(last_visit) AS oldest, max(last_visit) AS newest FROM (
         SELECT ${LAST_VISIT} AS last_visit FROM users u
          WHERE u.is_guest AND u.deleted_at IS NULL AND u.role = 'player') g
        WHERE last_visit < $1::timestamptz - make_interval(days => $2)`,
      [now, days],
    );
    return { mode: 'dry-run', count: n.count, oldest: n.oldest, newest: n.newest };
  }
  let count = 0;
  for (;;) {
    const rows = await idleGuests(db, { days, now });
    for (const { id } of rows) {
      await db.withTransaction((client) => deleteAccount(client, id, { by: 'retention' }));
      count += 1;
    }
    if (rows.length < BATCH) return { mode: 'delete', count };
  }
}

const day = (t) => (t ? new Date(t).toISOString().slice(0, 10) : '—');

/** Once at start and then daily. Every run is logged, also when nothing is due. */
function startJobs(db) {
  const run = () => deleteIdleGuests(db)
    .then((r) => {
      if (r.mode === 'dry-run') {
        console.log(`[retention] DRY RUN (GUEST_RETENTION_MODE is not "delete"): would anonymise ${r.count} guest accounts whose last visit (latest of last seen, created, last login, last race) is more than ${GUEST_DAYS} days ago${r.count ? `; their last visits from ${day(r.oldest)} to ${day(r.newest)}` : ''}. Nothing was changed.`);
      } else {
        console.log(`[retention] anonymised ${r.count} guest accounts not seen for ${GUEST_DAYS} days`);
      }
    })
    .catch((err) => console.error('[retention] failed', err.message));
  run();
  const timer = setInterval(run, 24 * 3600_000);
  timer.unref?.();
  return timer;
}

/** A visit: remembered at most once a day (for the guest rule above). */
async function seen(db, userId) {
  await db.query(`UPDATE users SET last_seen_at = now() WHERE id = $1 AND (last_seen_at IS NULL OR last_seen_at < now() - interval '1 day')`, [userId]);
}

module.exports = { GUEST_DAYS, idleGuests, deleteIdleGuests, startJobs, seen };
