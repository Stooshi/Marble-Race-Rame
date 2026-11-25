'use strict';

/**
 * Sending the pass reminders ("Remind me when sales open", src/seasons/reminders.js), built but OFF
 * until both are true: email is set up (BREVO_API_KEY) and Moses says go (PASS_REMINDERS_SENDING=on
 * on Railway). Off, nothing is sent and no in-game notice shows.
 *
 * Every 5 minutes, while on:
 *   1. Confirmation emails (double opt-in), before the sale opens: to every email reminder not yet
 *      confirmed and not yet asked (confirm_sent_at), with a confirm link and a cancel link.
 *   2. The reminder, once the sale has opened (while the pass is on sale): one email to every
 *      CONFIRMED address, with a cancel link; then sent_at. Players also see an in-game notice
 *      ("on sale now", until they close it: notice_seen_at), whether or not they wanted the email.
 * Each row is claimed before its email goes (so two runs never send it twice) and released again
 * if Brevo refuses it, to be tried at the next run. At most BATCH emails a run (Brevo's free plan
 * allows 300 a day).
 *
 * Links (on the website, page /pass/reminder): ?confirm=<token>, ?cancel=<token>. Mail apps' own
 * unsubscribe button: List-Unsubscribe → POST /api/seasons/reminders/unsubscribe?t=<token>.
 */
const config = require('../config');
const email = require('../email');
const { confirmEmail, reminderEmail } = require('./reminderEmails');

const BATCH = 50;
const EVERY_MS = 5 * 60_000;
const at = (v) => new Date(v).getTime();

/** Is sending switched on? Both BREVO_API_KEY and PASS_REMINDERS_SENDING=on. */
function sendingOn() {
  return email.enabled() && String(process.env.PASS_REMINDERS_SENDING || '').toLowerCase() === 'on';
}

const site = () => config.publicSiteUrl;
const links = (token, seasonKey) => ({
  confirmLink: `${site()}/pass/reminder?confirm=${encodeURIComponent(token)}`,
  cancelLink: `${site()}/pass/reminder?cancel=${encodeURIComponent(token)}`,
  passLink: `${site()}/pass?season=${encodeURIComponent(seasonKey)}`,
});
const headers = (token, apiUrl) => ({
  'List-Unsubscribe': `<${apiUrl.replace(/\/+$/, '')}/api/seasons/reminders/unsubscribe?t=${encodeURIComponent(token)}>`,
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
});
const apiUrl = () => process.env.PUBLIC_API_URL || process.env.RAILWAY_PUBLIC_DOMAIN && `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` || site();

/** Claims a row by setting `column` (null → now), runs `send`, and releases it again if that fails. → sent? */
async function claimAndSend(db, id, column, send) {
  const { rowCount } = await db.query(`UPDATE pass_reminders SET ${column} = now() WHERE id = $1 AND ${column} IS NULL AND cancelled_at IS NULL`, [id]);
  if (!rowCount) return false;
  try {
    await send();
    return true;
  } catch (err) {
    await db.query(`UPDATE pass_reminders SET ${column} = NULL WHERE id = $1`, [id]);
    console.error(`[pass-reminders] ${column === 'sent_at' ? 'reminder' : 'confirmation'} email failed: ${err.message}`);
    return false;
  }
}

/** 1. Confirmation emails for one season (before its sale opens). → how many were sent. */
async function sendConfirmations(db, season, now = new Date()) {
  if (!(season.pass_sale_starts_at && at(now) < at(season.pass_sale_starts_at))) return 0;
  const { rows } = await db.query(
    `SELECT r.id, r.token, r.lang, COALESCE(r.email, u.email) AS address
       FROM pass_reminders r LEFT JOIN users u ON u.id = r.user_id AND u.deleted_at IS NULL AND NOT u.is_guest
      WHERE r.season_key = $1 AND r.email_wanted AND r.confirmed_at IS NULL AND r.confirm_sent_at IS NULL AND r.cancelled_at IS NULL
      ORDER BY r.created_at LIMIT $2`,
    [season.key, BATCH],
  );
  let n = 0;
  for (const r of rows) {
    if (!r.address) continue;
    const l = links(r.token, season.key);
    const m = confirmEmail({ lang: r.lang, season, confirmLink: l.confirmLink, cancelLink: l.cancelLink });
    if (await claimAndSend(db, r.id, 'confirm_sent_at', () => email.send({ to: r.address, subject: m.subject, html: m.html, tags: ['pass-reminder-confirm'], headers: headers(r.token, apiUrl()) }))) n += 1;
  }
  return n;
}

/** 2. The reminder emails for one season (once its sale has opened, while the pass is on sale). → how many were sent. */
async function sendReminders(db, season, now = new Date()) {
  const t = at(now);
  if (!(season.pass_sale_starts_at && t >= at(season.pass_sale_starts_at) && t < at(season.pass_sale_ends_at ?? season.free_from))) return 0;
  const { rows } = await db.query(
    `SELECT r.id, r.token, r.lang, COALESCE(r.email, u.email) AS address
       FROM pass_reminders r LEFT JOIN users u ON u.id = r.user_id AND u.deleted_at IS NULL AND NOT u.is_guest
      WHERE r.season_key = $1 AND r.email_wanted AND r.confirmed_at IS NOT NULL AND r.sent_at IS NULL AND r.cancelled_at IS NULL
      ORDER BY r.confirmed_at LIMIT $2`,
    [season.key, BATCH],
  );
  let n = 0;
  for (const r of rows) {
    if (!r.address) continue;
    const l = links(r.token, season.key);
    const m = reminderEmail({ lang: r.lang, season, passLink: l.passLink, cancelLink: l.cancelLink });
    if (await claimAndSend(db, r.id, 'sent_at', () => email.send({ to: r.address, subject: m.subject, html: m.html, tags: ['pass-reminder'], headers: headers(r.token, apiUrl()) }))) n += 1;
  }
  return n;
}

/**
 * The in-game notice for a player: true when sending is on, the season's pass is on sale, the player
 * asked for a reminder and hasn't closed the notice.
 */
async function noticeFor(db, season, userId, now = new Date()) {
  if (!userId || !sendingOn()) return false;
  const t = at(now);
  if (!(season.pass_sale_starts_at && t >= at(season.pass_sale_starts_at) && t < at(season.pass_sale_ends_at ?? season.free_from))) return false;
  const { rows } = await db.query(
    'SELECT 1 FROM pass_reminders WHERE season_key = $1 AND user_id = $2 AND cancelled_at IS NULL AND notice_seen_at IS NULL',
    [season.key, userId],
  );
  return rows.length > 0;
}

/** The player closed the notice. */
async function noticeSeen(db, seasonKey, userId) {
  await db.query('UPDATE pass_reminders SET notice_seen_at = now() WHERE season_key = $1 AND user_id = $2 AND notice_seen_at IS NULL', [seasonKey, userId]);
}

/** One run over every season (the 5-minute job). → { confirmations, reminders } */
async function run(db, seasonsList, now = new Date()) {
  if (!sendingOn()) return { confirmations: 0, reminders: 0, off: true };
  let confirmations = 0;
  let reminders = 0;
  for (const s of seasonsList) {
    if (!s.pass_product_id) continue;
    confirmations += await sendConfirmations(db, s, now);
    reminders += await sendReminders(db, s, now);
  }
  return { confirmations, reminders };
}

/** Starts the 5-minute job (src/seasons startJobs). Says in the log whether sending is on. */
function start(db, allSeasons) {
  console.log(`[pass-reminders] sending is ${sendingOn() ? 'ON' : 'off'} (needs BREVO_API_KEY and PASS_REMINDERS_SENDING=on)`);
  let busy = false;
  const tick = async () => {
    if (busy || !sendingOn()) return;
    busy = true;
    try {
      const out = await run(db, await allSeasons());
      if (out.confirmations || out.reminders) console.log(`[pass-reminders] sent ${out.confirmations} confirmation(s), ${out.reminders} reminder(s)`);
    } catch (err) {
      console.error(`[pass-reminders] ${err.message}`);
    } finally {
      busy = false;
    }
  };
  const timer = setInterval(tick, EVERY_MS);
  timer.unref?.();
  return timer;
}

module.exports = { sendingOn, sendConfirmations, sendReminders, noticeFor, noticeSeen, run, start, BATCH };
