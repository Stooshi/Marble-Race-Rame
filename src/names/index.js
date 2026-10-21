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

module.exports = { load, check, assertAllowed, report, neutralName, WHERE };
