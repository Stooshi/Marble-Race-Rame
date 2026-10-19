'use strict';

/**
 * "Remind me when sales open" on the pass page, before a season pass goes on sale (the
 * pass_reminders table). Collected only: nothing is sent yet. When sending is built, on the sale's
 * first day each live reminder gets one in-game notice (players) and one email (visitors, and
 * players who ticked it), then sent_at is set.
 *
 * - A player (an account with an email, not a guest): always a reminder in the game; also by email
 *   to their account's address only if they tick it (email_wanted).
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

/** A player's live reminder for a season (null if none): { email: bool, address }. */
async function ofPlayer(db, userId, seasonKey) {
  if (!userId) return null;
  const { rows: [r] } = await db.query(
    `SELECT r.email_wanted, u.email FROM pass_reminders r JOIN users u ON u.id = r.user_id
      WHERE r.user_id = $1 AND r.season_key = $2 AND r.cancelled_at IS NULL`,
    [userId, seasonKey],
  );
  return r ? { email: r.email_wanted, address: r.email_wanted ? r.email : null } : null;
}

/**
 * Sets a reminder. `user`: { id, email, is_guest } or null. A player: { emailToo }. A visitor or a
 * guest: { email, consent: true }. → { reminder: { inGame, email } }.
 */
async function remind(db, season, user, { email = null, consent: agreed = false, emailToo = false } = {}, now = new Date()) {
  assertOpen(season, now);
  const token = crypto.randomBytes(24).toString('base64url');
  if (user && !user.is_guest && user.email) {
    const text = `[${consent.version}] ${fill(consent.reminderPlayer, season)}${emailToo ? ` / ${fill(consent.reminderPlayerEmail, season, { email: user.email })}` : ''}`;
    await db.query(
      `INSERT INTO pass_reminders (season_key, user_id, email_wanted, consent_text, token) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (season_key, user_id) WHERE user_id IS NOT NULL AND cancelled_at IS NULL
       DO UPDATE SET email_wanted = EXCLUDED.email_wanted, consent_text = EXCLUDED.consent_text, created_at = now()`,
      [season.key, user.id, Boolean(emailToo), text, token],
    );
    return { reminder: { inGame: true, email: Boolean(emailToo) } };
  }
  const address = String(email ?? '').trim().toLowerCase();
  if (!EMAIL.test(address) || address.length > 254) throw badRequest('Please give a valid email address');
  if (agreed !== true) throw badRequest('Please tick the box to agree to the reminder email');
  const text = `[${consent.version}] ${fill(consent.reminderVisitor, season)}`;
  // (Already on the list: kept as it is, and the same answer, so nobody learns whose address is listed.)
  await db.query(
    `INSERT INTO pass_reminders (season_key, email, email_wanted, consent_text, token) VALUES ($1, $2, true, $3, $4)
     ON CONFLICT (season_key, lower(email)) WHERE user_id IS NULL AND cancelled_at IS NULL DO NOTHING`,
    [season.key, address, text, token],
  );
  return { reminder: { inGame: false, email: true } };
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

/** The hourly clean-up: cancelled reminders, and every reminder 30 days after its sale opened. → how many. */
async function purge(db, now = new Date()) {
  const { rowCount } = await db.query(
    `DELETE FROM pass_reminders r USING seasons s
      WHERE s.key = r.season_key
        AND (r.cancelled_at IS NOT NULL OR s.pass_sale_starts_at + make_interval(days => $2) < $1)`,
    [now, KEEP_AFTER_SALE_DAYS],
  );
  return rowCount;
}

/** How many live reminders a season has (the back office and the log): { players, byEmail }. */
async function counts(db, seasonKey) {
  const { rows: [r] } = await db.query(
    `SELECT count(*) FILTER (WHERE user_id IS NOT NULL)::int AS players,
            count(*) FILTER (WHERE email_wanted OR user_id IS NULL)::int AS by_email
       FROM pass_reminders WHERE season_key = $1 AND cancelled_at IS NULL`,
    [seasonKey],
  );
  return { players: r.players, byEmail: r.by_email };
}

module.exports = { open, opensText, ofPlayer, remind, cancelForPlayer, cancelByToken, purge, counts, KEEP_AFTER_SALE_DAYS };
