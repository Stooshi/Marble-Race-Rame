'use strict';

/**
 * Player names (Moses, 22 Oct 2026; Apple guideline 1.2 for anything players see of each other):
 *   - the filter: client/src/shared/nameFilter.js (the word list and how names are read), the same
 *     file the forms use; checked whenever a name is chosen or changed (src/routes/auth.js register
 *     and claim, src/routes/users.js PATCH /me);
 *   - reports: any player can report another player's name from the scoreboards and race results
 *     (POST /api/users/:id/report-name); the back office lists them (src/routes/admin.js
 *     /name-reports) and can rename the player or dismiss the reports.
 */
const crypto = require('crypto');
const { HttpError } = require('../utils/httpError');

let filter = null;
/** The shared filter (an ES module: loaded once). */
async function load() {
  if (!filter) filter = await import('../../client/src/shared/nameFilter.js');
  return filter;
}

/** null if fine, else { word, lang }. */
async function check(name) {
  return (await load()).checkName(name);
}

/** Throws 400 name_not_allowed if any of `names` (field → value) is blocked. */
async function assertAllowed(names) {
  const f = await load();
  for (const [field, value] of Object.entries(names)) {
    if (value && f.checkName(value)) throw new HttpError(400, f.NAME_NOT_ALLOWED, { code: 'name_not_allowed', field });
  }
}

const WHERE = ['scoreboard', 'results', 'room'];

/**
 * A player reports another player's name. Once per reporter and player while it's open.
 * → { reported: true } (also when they had already reported it: nothing to tell them apart).
 */
async function report(db, { reporterId, userId, where, nameShown = null }) {
  if (reporterId === userId) throw new HttpError(400, "That's your own name: change it in Settings");
  const { rows: [u] } = await db.query('SELECT id, username, display_name FROM users WHERE id = $1 AND deleted_at IS NULL', [userId]);
  if (!u) throw new HttpError(404, 'No such player');
  await db.query(
    `INSERT INTO name_reports (reported_user_id, reporter_id, place, name_shown)
     SELECT $1, $2, $3, $4
      WHERE NOT EXISTS (SELECT 1 FROM name_reports WHERE reported_user_id = $1 AND reporter_id = $2 AND resolved_at IS NULL)`,
    [userId, reporterId, WHERE.includes(where) ? where : 'scoreboard', String(nameShown ?? u.display_name ?? u.username).slice(0, 64)],
  );
  return { reported: true };
}

/** A neutral new account name, free: "Player4821" style. */
async function neutralName(client) {
  for (let i = 0; i < 20; i++) {
    const name = `Player${crypto.randomInt(1000, 1_000_000)}`;
    if (await check(name)) continue;
    const { rows } = await client.query('SELECT 1 FROM users WHERE lower(username) = lower($1)', [name]);
    if (!rows.length) return name;
  }
  throw new Error('No free neutral name');
}

/**
 * The name a player chooses to be shown by (users.display_name; Moses, 25 Oct 2026: a guest who
 * chooses a name keeps it, and keeps it when they save the account). 3–24 letters, digits, spaces,
 * "_" or "-"; the name filter; never "guest_…" (that is how guests without a name show); and never
 * another player's player name or chosen name (case ignored), so no one shows as someone else.
 * Throws 400; → the name, trimmed.
 */
const SHOWN = /^[\p{L}\p{N}][\p{L}\p{N} _-]{1,22}[\p{L}\p{N}_]$/u;
async function assertShownName(db, userId, raw) {
  const name = String(raw ?? '').trim().replace(/\s+/g, ' ');
  if (!SHOWN.test(name)) throw new HttpError(400, 'A name is 3 to 24 letters, digits, spaces, _ or -', { code: 'name_invalid', field: 'display_name' });
  if (/^guest[_ -]?\d/i.test(name)) throw new HttpError(400, 'Choose a name of your own', { code: 'name_invalid', field: 'display_name' });
  await assertAllowed({ display_name: name });
  const { rows } = await db.query(
    `SELECT 1 FROM users WHERE id <> $1 AND deleted_at IS NULL AND (username = $2::citext OR lower(display_name) = lower($2)) LIMIT 1`,
    [userId, name],
  );
  if (rows.length) throw new HttpError(409, 'That name is taken: try another', { code: 'name_taken', field: 'display_name' });
  return name;
}

/** A new player name may not be another player's chosen name either (case ignored). Throws 409. */
async function assertNotSomeonesShownName(db, userId, username) {
  const { rows } = await db.query(
    'SELECT 1 FROM users WHERE ($1::uuid IS NULL OR id <> $1) AND deleted_at IS NULL AND lower(display_name) = lower($2) LIMIT 1',
    [userId ?? null, String(username ?? '')],
  );
  if (rows.length) throw new HttpError(409, 'Username is taken', { code: 'name_taken', field: 'username' });
}

module.exports = { load, check, assertAllowed, assertShownName, assertNotSomeonesShownName, report, neutralName, WHERE };
