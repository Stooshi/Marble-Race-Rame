'use strict';

/**
 * Confirm-email reminders (Moses, 19 Nov 2026): a saved account whose address isn't confirmed gets a reminder on day
 * 1, day 3 and day 7 after sign-up, each with a fresh confirmation link (./emailConfirm.js `send` with `reminder`).
 *
 * - Sign-up is the account's first confirmation email (email_confirmations): accounts saved before email was on
 *   (1 Nov 2026), which never got one, get none.
 * - Never to a confirmed, deleted, suspended or under-13 account, a guest, or an account whose address changed since
 *   (the first email's address must still be the account's).
 * - Each reminder goes once: the email log (email_log, kind confirm-reminder-1…3, status sent) is the record. A failed
 *   send is tried again on a later run, at most MAX_TRIES times.
 * - Only the latest reminder due is sent, and an earlier one is never sent after a later one: an account that was
 *   already past day 7 when this started (Huxley, 19 Nov 2026) gets the day-7 reminder alone, if it signed up within
 *   the last WINDOW_DAYS.
 * - Not within QUIET_HOURS of another confirmation email (one the player asked for in Settings, say).
 * - A service email, not marketing: it doesn't depend on the news box, and has no unsubscribe line.
 *
 * Off until CONFIRM_REMINDERS=on (the texts wait for Moses's approval: claude/confirm-reminders-draft.md); until then
 * each run only logs how many are due. Needs email (BREVO_API_KEY) too.
 */
const emailConfirm = require('./emailConfirm');

const STEPS = [{ n: 1, day: 1 }, { n: 2, day: 3 }, { n: 3, day: 7 }];
const WINDOW_DAYS = 30;
const QUIET_HOURS = 20;
const MAX_TRIES = 3;
const PER_RUN = 50;
const EVERY_MS = 15 * 60 * 1000;

const sendingOn = () => process.env.CONFIRM_REMINDERS === 'on';

/**
 * The accounts with a reminder due now: [{ id, username, email, step }]. `step`: the latest step due that no sent
 * reminder has reached yet.
 */
async function due(db, { limit = PER_RUN } = {}) {
  const { rows } = await db.query(
    `WITH first AS (
       SELECT DISTINCT ON (c.user_id) c.user_id, c.email, c.created_at AS signed_up
         FROM email_confirmations c ORDER BY c.user_id, c.created_at
     ), sent AS (
       SELECT l.user_id, max(substring(l.kind FROM 'confirm-reminder-([0-9])')::int) FILTER (WHERE l.status = 'sent') AS last_sent,
              count(*) FILTER (WHERE l.status = 'failed') AS failed
         FROM email_log l WHERE l.kind LIKE 'confirm-reminder-%' GROUP BY l.user_id
     )
     SELECT u.id, u.username, u.email, f.signed_up,
            CASE WHEN f.signed_up <= now() - interval '7 days' THEN 3
                 WHEN f.signed_up <= now() - interval '3 days' THEN 2
                 WHEN f.signed_up <= now() - interval '1 day' THEN 1 END AS step,
            COALESCE(s.last_sent, 0) AS last_sent, COALESCE(s.failed, 0) AS failed
       FROM first f
       JOIN users u ON u.id = f.user_id
       LEFT JOIN sent s ON s.user_id = u.id
      WHERE u.email_verified_at IS NULL AND u.deleted_at IS NULL AND u.suspended_at IS NULL AND NOT u.is_guest
        AND u.age_group IS DISTINCT FROM 'under-13'
        AND lower(u.email) = lower(f.email)
        AND f.signed_up > now() - make_interval(days => $1)
        AND f.signed_up <= now() - interval '1 day'
        AND NOT EXISTS (SELECT 1 FROM email_confirmations c WHERE c.user_id = u.id AND c.created_at > now() - make_interval(hours => $2))
      ORDER BY f.signed_up`,
    [WINDOW_DAYS, QUIET_HOURS],
  );
  return rows.filter((r) => r.step > r.last_sent && r.failed < MAX_TRIES).slice(0, limit)
    .map((r) => ({ id: r.id, username: r.username, email: r.email, step: r.step }));
}

/** One run: sends the reminders due (or, while off, counts them). → { due, sent, failed, dryRun } */
async function run(db) {
  const list = await due(db);
  if (!sendingOn() || !emailConfirm.on()) {
    if (list.length) console.log(`[confirm-reminders] DRY RUN (CONFIRM_REMINDERS is not "on"${emailConfirm.on() ? '' : ', email is off'}): ${list.length} due (${STEPS.map((s) => `${list.filter((r) => r.step === s.n).length} × reminder ${s.n}`).join(', ')}). Nothing was sent.`);
    return { due: list.length, sent: 0, failed: 0, dryRun: true };
  }
  let sent = 0; let failed = 0;
  for (const u of list) {
    try {
      const out = await emailConfirm.send(db, u, { reminder: u.step });
      if (out === 'sent') sent += 1;
    } catch (err) {
      failed += 1; // (logged as failed in email_log by email.send; tried again next run, MAX_TRIES at most)
      console.error(`[confirm-reminders] reminder ${u.step} to ${u.id} failed: ${err.message}`);
    }
  }
  if (sent || failed) console.log(`[confirm-reminders] sent ${sent}, failed ${failed}`);
  return { due: list.length, sent, failed, dryRun: false };
}

let timer = null;
/** Every 15 minutes (from server.js). */
function startJobs(db) {
  if (timer) return;
  const tick = () => run(db).catch((err) => console.error('[confirm-reminders]', err.message));
  setTimeout(tick, 60 * 1000).unref?.();
  timer = setInterval(tick, EVERY_MS);
  timer.unref?.();
}

module.exports = { due, run, startJobs, sendingOn, STEPS, WINDOW_DAYS, QUIET_HOURS, MAX_TRIES };
