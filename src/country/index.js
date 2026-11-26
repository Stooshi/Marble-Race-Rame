'use strict';

/**
 * The country a player races for (Moses, 22 Oct 2026): optional, chosen by the player (it needn't be
 * where they live), shown with their country records and, later, used for national leagues. Never
 * taken from the IP address: that country is kept for security and fraud only (src/security); the
 * picker is only pre-filled with it, as a suggestion, without storing anything.
 *
 * The change rule:
 *   - the first choice is free;
 *   - for 24 hours after a choice, changes are corrections (free, and the clock below doesn't restart);
 *   - after that, at most one change every 90 days, counted from the last choice;
 *   - removing the country is allowed at any time, but doesn't restart the clock (choosing again
 *     follows the same rule, so removing can't be used to change sooner).
 *
 *   status(row, now)                 → { country, chosenAt, correctionUntil, nextChangeAt, canChange }
 *   choose(db, userId, code, opts)   → status; refuses a change too early (409, with nextChangeAt)
 *   countryAt(db, userId, when)      → the player's country at a moment (national leagues: the start of the month)
 */
const { HttpError, badRequest, notFound } = require('../utils/httpError');
const { countries } = require('../../client/src/shared/countries.json');

const CORRECTION_MS = 24 * 3600 * 1000;
const CHANGE_DAYS = 90;
const CHANGE_MS = CHANGE_DAYS * 24 * 3600 * 1000;

const isCountry = (code) => typeof code === 'string' && Object.prototype.hasOwnProperty.call(countries, code);
const nameOf = (code) => (isCountry(code) ? countries[code] : null);

/** The rule's state for a player (`row`: { country, country_chosen_at }) at `now`. */
function status(row, now = new Date()) {
  const chosen = row?.country_chosen_at ? new Date(row.country_chosen_at) : null;
  const t = now.getTime();
  const correctionUntil = chosen ? new Date(chosen.getTime() + CORRECTION_MS) : null;
  const nextChangeAt = chosen ? new Date(chosen.getTime() + CHANGE_MS) : null;
  const canChange = !chosen || t < correctionUntil.getTime() || t >= nextChangeAt.getTime();
  return {
    country: row?.country ?? null,
    name: nameOf(row?.country ?? null),
    chosenAt: chosen?.toISOString() ?? null,
    correctionUntil: correctionUntil && t < correctionUntil.getTime() ? correctionUntil.toISOString() : null,
    nextChangeAt: canChange ? null : nextChangeAt.toISOString(),
    canChange,
  };
}

/**
 * Sets (or with null, removes) the player's country under the change rule. `db`: the db module (its own transaction) or a client already inside one (it locks the player's row). → the new status.
 */
async function choose(db, userId, code, { now = new Date() } = {}) {
  const want = code === null || code === '' || code === undefined ? null : String(code).toUpperCase();
  if (want !== null && !isCountry(want)) throw badRequest('Choose a country from the list');
  const run = async (client) => {
    const { rows: [u] } = await client.query(
      'SELECT country, country_chosen_at, is_guest FROM users WHERE id = $1 AND deleted_at IS NULL FOR UPDATE',
      [userId],
    );
    if (!u) throw notFound('No such player');
    if (u.is_guest) throw badRequest('Save your account first to choose a country');
    if ((u.country ?? null) === want) return status(u, now);
    const before = status(u, now);
    let kind;
    let chosenAt = u.country_chosen_at;
    if (want === null) kind = 'removed';
    else if (!u.country_chosen_at) { kind = 'first'; chosenAt = now; }
    else if (before.correctionUntil) kind = 'correction';
    else if (before.canChange) { kind = 'change'; chosenAt = now; }
    else {
      throw new HttpError(409, `You can change your country once every ${CHANGE_DAYS} days. Your next change is possible from ${before.nextChangeAt.slice(0, 10)}.`, { code: 'country_locked', nextChangeAt: before.nextChangeAt });
    }
    const { rows: [after] } = await client.query(
      'UPDATE users SET country = $2, country_chosen_at = $3 WHERE id = $1 RETURNING country, country_chosen_at',
      [userId, want, chosenAt],
    );
    await client.query('INSERT INTO user_country_history (user_id, country, kind, created_at) VALUES ($1, $2, $3, $4)', [userId, want, kind, now]);
    return status(after, now);
  };
  return typeof db.withTransaction === 'function' ? db.withTransaction(run) : run(db);
}

/** The player's country at `when` (the last choice made by then), or null. */
async function countryAt(db, userId, when) {
  const { rows: [h] } = await db.query(
    'SELECT country FROM user_country_history WHERE user_id = $1 AND created_at <= $2 ORDER BY created_at DESC, id DESC LIMIT 1',
    [userId, when],
  );
  return h ? h.country : null;
}

module.exports = { CORRECTION_MS, CHANGE_DAYS, isCountry, nameOf, status, choose, countryAt };
