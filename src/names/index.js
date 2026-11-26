'use strict';

/**
 * Player names (Moses, 22 Oct 2026; Apple guideline 1.2 for anything players see of each other):
 *   - the filter: client/src/shared/nameFilter.js (the word list and how names are read), the same
 *     file the forms use; checked whenever a name is chosen or changed (src/routes/auth.js register
 *     and claim, src/routes/users.js PATCH /me);
 *   - reports: any player can report another player's name from the scoreboards and race results
 *     (POST /api/users/:id/report-name); the back office lists them (src/routes/admin.js
 *     /name-reports) and can rename the player or dismiss the reports;
 *   - auto-hide (Moses, 25 Oct 2026): a name with open reports from 3 different players on 3 different
 *     addresses is hidden at once (`hideIfReported`): guest_<number> or Player_<number> shows instead,
 *     the player is told and chooses a new one; the back office restores it, keeps it hidden or
 *     renames. At most 10 reports a day per player; reports on computer players don't exist (they
 *     have no account).
 */
const crypto = require('crypto');
const { HttpError } = require('../utils/httpError');
const config = require('../config');
const { shownName, hiddenPlaceholder, isStandIn } = require('./shown');

/** Reports that hide a name: from this many different players, on as many different addresses. */
const HIDE_AT = 3;
/** Reports one player may make in 24 hours. */
const REPORTS_PER_DAY = 10;

/** A keyed hash of an address (the address itself is never stored with a report). */
function ipHash(ip) {
  if (!ip) return null;
  return crypto.createHmac('sha256', String(config.auth.jwtSecret)).update(`name-report:${ip}`).digest('hex').slice(0, 32);
}

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
 * A player reports another player's name. Once per reporter and player while it's open; at most
 * REPORTS_PER_DAY a day per reporter (429). The name reported is the one the server shows now (not
 * what the page sent). Then, if HIDE_AT different players on different addresses have reported the
 * name now shown, it is hidden (hideIfReported).
 * → { reported: true } (also when they had already reported it: nothing to tell them apart).
 */
async function report(db, { reporterId, userId, where, ip = null }) {
  if (reporterId === userId) throw new HttpError(400, "That's your own name: change it in Settings");
  const { rows: [u] } = await db.query('SELECT id, username, display_name, is_guest FROM users WHERE id = $1 AND deleted_at IS NULL', [userId]);
  if (!u) throw new HttpError(404, 'No such player');
  const { rows: [{ n }] } = await db.query(
    "SELECT COUNT(*)::int AS n FROM name_reports WHERE reporter_id = $1 AND created_at > now() - interval '24 hours'", [reporterId]);
  if (n >= REPORTS_PER_DAY) throw new HttpError(429, "Thanks: that's a lot of reports for one day. Try again tomorrow.", { code: 'report_limit' });
  const name = shownName(u);
  // (A stand-in, guest_12345 or Player_12345, isn't anyone's choice: nothing to report.)
  if (isStandIn(name)) return { reported: true };
  await db.query(
    `INSERT INTO name_reports (reported_user_id, reporter_id, place, name_shown, reporter_ip_hash)
     SELECT $1, $2, $3, $4, $5
      WHERE NOT EXISTS (SELECT 1 FROM name_reports WHERE reported_user_id = $1 AND reporter_id = $2 AND resolved_at IS NULL)`,
    [userId, reporterId, WHERE.includes(where) ? where : 'scoreboard', String(name).slice(0, 64), ipHash(ip)],
  );
  await hideIfReported(db, userId);
  return { reported: true };
}

/**
 * Hides the player's shown name if HIDE_AT different players on different addresses have open reports
 * on it (a report without an address counts by its reporter). A guest then shows guest_<number>, a
 * saved account Player_<number>. → true if it hid the name now.
 */
async function hideIfReported(db, userId) {
  const run = async (client) => {
    const { rows: [u] } = await client.query(
      'SELECT id, username, display_name, is_guest, name_hidden_at FROM users WHERE id = $1 AND deleted_at IS NULL FOR UPDATE', [userId]);
    if (!u || u.name_hidden_at) return false;
    const name = shownName(u);
    if (isStandIn(name)) return false;
    const { rows: [{ reporters, places }] } = await client.query(
      `SELECT COUNT(DISTINCT reporter_id)::int AS reporters,
              COUNT(DISTINCT COALESCE(reporter_ip_hash, reporter_id::text))::int AS places
         FROM name_reports
        WHERE reported_user_id = $1 AND resolved_at IS NULL AND lower(name_shown) = lower($2)`,
      [userId, name],
    );
    if (Math.min(reporters, places) < HIDE_AT) return false;
    await client.query(
      'UPDATE users SET display_name = $2, name_hidden_at = now(), name_hidden_name = $3, updated_at = now() WHERE id = $1',
      [userId, u.is_guest ? null : hiddenPlaceholder(u.id), String(name).slice(0, 64)],
    );
    console.log(`[names] hid a reported name (${reporters} reporters) for player ${userId}`);
    return true;
  };
  return db.withTransaction ? db.withTransaction(run) : run(db);
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
  if (/^(guest|player)[_ -]?\d/i.test(name)) throw new HttpError(400, 'Choose a name of your own', { code: 'name_invalid', field: 'display_name' });
  await assertAllowed({ display_name: name });
  // (A name hidden after reports can't simply be chosen again.)
  if (userId) await assertNotHiddenName(db, userId, name);
  const { rows } = await db.query(
    `SELECT 1 FROM users WHERE ($1::uuid IS NULL OR id <> $1) AND deleted_at IS NULL AND (username = $2::citext OR lower(display_name) = lower($2)) LIMIT 1`,
    [userId ?? null, name],
  );
  if (rows.length) throw new HttpError(409, 'That name is taken: try another', { code: 'name_taken', field: 'display_name' });
  return name;
}

/** Player names that look like the stand-ins (guest_12345, Player_12345) can't be taken. Throws 400. */
function assertNotStandIn(username) {
  if (isStandIn(username)) throw new HttpError(400, 'Choose a name of your own', { code: 'name_invalid', field: 'username' });
}

/** The player's own hidden name (after reports) can't come back as a new name. Throws 400. */
async function assertNotHiddenName(db, userId, name, field = 'display_name') {
  const { rows: [me] } = await db.query('SELECT name_hidden_name FROM users WHERE id = $1', [userId]);
  if (me?.name_hidden_name && me.name_hidden_name.toLowerCase() === String(name ?? '').trim().toLowerCase()) {
    throw new HttpError(400, 'That name was reported and is hidden: choose a new one', { code: 'name_hidden', field });
  }
}

/** A new player name may not be another player's chosen name either (case ignored). Throws 409. */
async function assertNotSomeonesShownName(db, userId, username) {
  const { rows } = await db.query(
    'SELECT 1 FROM users WHERE ($1::uuid IS NULL OR id <> $1) AND deleted_at IS NULL AND lower(display_name) = lower($2) LIMIT 1',
    [userId ?? null, String(username ?? '')],
  );
  if (rows.length) throw new HttpError(409, 'Username is taken', { code: 'name_taken', field: 'username' });
}

module.exports = { load, check, assertAllowed, assertShownName, assertNotSomeonesShownName, assertNotStandIn, assertNotHiddenName, report, hideIfReported, neutralName, ipHash, WHERE, HIDE_AT, REPORTS_PER_DAY };
