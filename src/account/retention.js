'use strict';

/**
 * Guest accounts are deleted after 180 days without a visit (Moses, 21 Oct 2026; the privacy
 * policy's retention rule). A guest can't log in again after that anyway: the login ends 180 days
 * after the last visit (JWT_EXPIRES_IN, renewed on each visit by GET /auth/me). Deleting is the same
 * as a player deleting their account (./index.js deleteAccount): name and settings go, race results
 * stay under an anonymous name, and payment records stay for bookkeeping (7 years).
 *
 * A visit is users.last_seen_at: set when the account is made, and on a visit at most once a day.
 * Saved accounts are never deleted here: they stay until the player deletes them.
 */
const { deleteAccount } = require('./index');

const GUEST_DAYS = 180;
const BATCH = 500;

/** Deletes guests not seen for `days` days. → how many. */
async function deleteIdleGuests(db, { days = GUEST_DAYS, now = new Date() } = {}) {
  let total = 0;
  for (;;) {
    const { rows } = await db.query(
      `SELECT id FROM users
        WHERE is_guest AND deleted_at IS NULL AND role = 'player'
          AND COALESCE(last_seen_at, created_at) < $1::timestamptz - make_interval(days => $2)
        ORDER BY COALESCE(last_seen_at, created_at) LIMIT $3`,
      [now, days, BATCH],
    );
    for (const { id } of rows) {
      await db.withTransaction((client) => deleteAccount(client, id, { by: 'retention' }));
      total += 1;
    }
    if (rows.length < BATCH) return total;
  }
}

/** Once at start and then daily. */
function startJobs(db) {
  const run = () => deleteIdleGuests(db)
    .then((n) => { if (n) console.log(`[retention] deleted ${n} guest accounts not seen for ${GUEST_DAYS} days`); })
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

module.exports = { GUEST_DAYS, deleteIdleGuests, startJobs, seen };
