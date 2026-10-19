'use strict';

/**
 * "Remind me when sales open" on the pass page, before a season pass goes on sale (the
 * pass_reminders table). Sending is src/seasons/reminderMail.js, off until BREVO_API_KEY is set and
 * PASS_REMINDERS_SENDING=on (Moses says go). Then:
 *   1. a confirmation email with the reminder's link to each unconfirmed email reminder
 *      (confirm_sent_at); the link confirms it (confirm(), confirmed_at). Double opt-in (Moses, 19 Oct);
 *   2. on the sale's first day one in-game notice (players) and one email to each CONFIRMED address,
 *      then sent_at.
 *   Unconfirmed 7 days after its confirmation email: a visitor's reminder is deleted, a player's
 *   keeps only the in-game reminder (purge()).
 *
 * - A player (an account with an email, not a guest): always a reminder in the game; also by email
 *   to their account's address only if they tick it (email_wanted). A verified account email counts
 *   as confirmed; an unverified one (every account today: there is no email check yet) is confirmed
 *   like a visitor's.
 * - A visitor (or a guest): by email only, to the address they give, with their consent ticked.
 * - The exact consent text they agreed to is stored with the reminder (GDPR: what, when).
 * - One live reminder per player or address and season; asking again updates or keeps it, and the
 *   answer never tells a visitor whether an address was already on the list.
 * - Cancelled by the player on the pass page, or with the reminder's own link (its token, for the
 *   email); deleted with the account, and by the hourly job once cancelled or 30 days after the
 *   sale opened, sent or not.
 */
const crypto = require('crypto');
const consent = require('../../client/src/shared/payments/consent.json');
const { HttpError, badRequest } = require('../utils/httpError');

const KEEP_AFTER_SALE_DAYS = 30;
const CONFIRM_DAYS = 7;
const at = (v) => new Date(v).getTime();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "28 November": the day the pass goes on sale, in the season's time zone. */
function opensText(season) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: season.time_zone || 'Europe/Stockholm', day: 'numeric', month: 'long' })
    .format(new Date(season.pass_sale_starts_at ?? season.starts_at));
}

const fill = (text, season, extra = {}) => Object.entries({ pass: season.pass_name, opens: opensText(season), ...extra })
  .reduce((t, [k, v]) => t.split(`{${k}}`).join(v), text);

/** May reminders be asked for now? Only for a season with a pass, before its sale opens. */
function open(season, now = new Date()) {
  return Boolean(season?.pass_product_id && season.pass_sale_starts_at && at(now) < at(season.pass_sale_starts_at));
}

function assertOpen(season, now) {
  if (!season?.pass_product_id) throw new HttpError(404, 'No such season pass');
  if (!open(season, now)) throw new HttpError(409, `The ${season.pass_name} is on sale already: no reminder needed`);
}

/**
 * Is the account's email address verified (then it counts as confirmed)? There is no email check
 * for accounts yet, so never; when one is built, read it here.
 */
const accountEmailVerified = (_user) => false;

/** A player's live reminder for a season (null if none): { email: bool, address, confirmed }. */
async function ofPlayer(db, userId, seasonKey) {
  if (!userId) return null;
  const { rows: [r] } = await db.query(
    `SELECT r.email_wanted, r.confirmed_at, u.email FROM pass_reminders r JOIN users u ON u.id = r.user_id
      WHERE r.user_id = $1 AND r.season_key = $2 AND r.cancelled_at IS NULL`,
    [userId, seasonKey],
  );
  return r ? { email: r.email_wanted, address: r.email_wanted ? r.email : null, confirmed: r.email_wanted ? Boolean(r.confirmed_at) : null } : null;
}

/**
 * Sets a reminder. `user`: { id, email, is_guest } or null. A player: { emailToo }. A visitor or a
 * guest: { email, consent: true }. → { reminder: { inGame, email } }.
 */
async function remind(db, season, user, { email = null, consent: agreed = false, emailToo = false, lang = 'en' } = {}, now = new Date()) {
  assertOpen(season, now);
  const language = lang === 'sv' ? 'sv' : 'en'; // (the emails' language: Swedish or English)
  const token = crypto.randomBytes(24).toString('base64url');
  if (user && !user.is_guest && user.email) {
    const text = `[${consent.version}] ${fill(consent.reminderPlayer, season)}${emailToo ? ` / ${fill(consent.reminderPlayerEmail, season, { email: user.email })}` : ''}`;
    const confirmed = Boolean(emailToo) && accountEmailVerified(user);
    await db.query(
      `INSERT INTO pass_reminders (season_key, user_id, email_wanted, consent_text, token, confirmed_at, lang)
       VALUES ($1, $2, $3, $4, $5, CASE WHEN $6 THEN now() END, $7)
       ON CONFLICT (season_key, user_id) WHERE user_id IS NOT NULL AND cancelled_at IS NULL
       DO UPDATE SET email_wanted = EXCLUDED.email_wanted, consent_text = EXCLUDED.consent_text, created_at = now(), lang = EXCLUDED.lang,
                     confirmed_at = CASE WHEN EXCLUDED.email_wanted THEN COALESCE(pass_reminders.confirmed_at, EXCLUDED.confirmed_at) END,
                     confirm_sent_at = CASE WHEN EXCLUDED.email_wanted THEN pass_reminders.confirm_sent_at END`,
      [season.key, user.id, Boolean(emailToo), text, token, confirmed, language],
    );
    return { reminder: { inGame: true, email: Boolean(emailToo), confirmed: Boolean(emailToo) ? confirmed : null } };
  }
  const address = String(email ?? '').trim().toLowerCase();
  if (!EMAIL.test(address) || address.length > 254) throw badRequest('Please give a valid email address');
  if (agreed !== true) throw badRequest('Please tick the box to agree to the reminder email');
  const text = `[${consent.version}] ${fill(consent.reminderVisitor, season)}`;
  // (Already on the list: kept as it is, and the same answer, so nobody learns whose address is listed.)
  await db.query(
    `INSERT INTO pass_reminders (season_key, email, email_wanted, consent_text, token, lang) VALUES ($1, $2, true, $3, $4, $5)
     ON CONFLICT (season_key, lower(email)) WHERE user_id IS NULL AND cancelled_at IS NULL DO NOTHING`,
    [season.key, address, text, token, language],
  );
  return { reminder: { inGame: false, email: true, confirmed: false } };
}

/** A player cancels their reminder. → true if there was one. */
async function cancelForPlayer(db, season, userId) {
  const { rowCount } = await db.query(
    'UPDATE pass_reminders SET cancelled_at = now() WHERE season_key = $1 AND user_id = $2 AND cancelled_at IS NULL',
    [season.key, userId],
  );
  return rowCount > 0;
}

/** Cancel with the reminder's own link (the email's): → true if there was one to cancel. */
async function cancelByToken(db, token) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 64) return false;
  const { rowCount } = await db.query('UPDATE pass_reminders SET cancelled_at = now() WHERE token = $1 AND cancelled_at IS NULL', [token]);
  return rowCount > 0;
}

/** The confirmation link (double opt-in): → true if it confirmed a live email reminder. */
async function confirm(db, token) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 64) return false;
  const { rowCount } = await db.query(
    'UPDATE pass_reminders SET confirmed_at = COALESCE(confirmed_at, now()) WHERE token = $1 AND cancelled_at IS NULL AND email_wanted',
    [token],
  );
  return rowCount > 0;
}

/**
 * The hourly clean-up. Deletes cancelled reminders, every reminder 30 days after its sale opened,
 * and a visitor's reminder still unconfirmed 7 days after its confirmation email; a player's keeps
 * only its in-game reminder then. (Nothing expires before a confirmation email has gone out.)
 * → how many reminders were deleted or lost their email.
 */
async function purge(db, now = new Date()) {
  const gone = await db.query(
    `DELETE FROM pass_reminders r USING seasons s
      WHERE s.key = r.season_key
        AND (r.cancelled_at IS NOT NULL OR s.pass_sale_starts_at + make_interval(days => $2) < $1
             OR (r.user_id IS NULL AND r.confirmed_at IS NULL AND r.confirm_sent_at + make_interval(days => $3) < $1))`,
    [now, KEEP_AFTER_SALE_DAYS, CONFIRM_DAYS],
  );
  const dropped = await db.query(
    `UPDATE pass_reminders SET email_wanted = false, confirm_sent_at = NULL
      WHERE user_id IS NOT NULL AND email_wanted AND confirmed_at IS NULL AND confirm_sent_at + make_interval(days => $2) < $1`,
    [now, CONFIRM_DAYS],
  );
  return gone.rowCount + dropped.rowCount;
}

/** How many live reminders a season has (the back office and the log): { players, byEmail }. */
async function counts(db, seasonKey) {
  const { rows: [r] } = await db.query(
    `SELECT count(*) FILTER (WHERE user_id IS NOT NULL)::int AS players,
            count(*) FILTER (WHERE email_wanted)::int AS by_email,
            count(*) FILTER (WHERE email_wanted AND confirmed_at IS NOT NULL)::int AS confirmed
       FROM pass_reminders WHERE season_key = $1 AND cancelled_at IS NULL`,
    [seasonKey],
  );
  return { players: r.players, byEmail: r.by_email, confirmed: r.confirmed };
}

module.exports = { open, opensText, ofPlayer, remind, confirm, cancelForPlayer, cancelByToken, purge, counts, accountEmailVerified, KEEP_AFTER_SALE_DAYS, CONFIRM_DAYS };
