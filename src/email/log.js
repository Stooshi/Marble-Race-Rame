'use strict';

/**
 * The email log (Moses, 16 Nov 2026, CRM phase 5): every email sent through ./index.js send(), with its kind, the
 * template version (when an edited template made it), the subject and Brevo's message id; shown on the customer
 * page. Kept 24 months (trim(), daily). Logging never stops an email: a failed insert is only reported.
 */
const KEEP_MONTHS = 24;

let db = null;
const dbOf = () => (db ??= require('../db'));

/** Records one send. `user`: the player's id, else the player with that address (if any). */
async function record({ to, userId = null, kind, templateVersion = null, subject, providerId = null, status = 'sent', error = null }) {
  try {
    await dbOf().query(
      `INSERT INTO email_log (user_id, to_email, kind, template_version, subject, provider_id, status, error)
       VALUES (COALESCE($1::uuid, (SELECT id FROM users WHERE lower(email) = lower($2) AND deleted_at IS NULL ORDER BY created_at LIMIT 1)), $2, $3, $4, $5, $6, $7, $8)`,
      [userId, to, String(kind).slice(0, 40), templateVersion, String(subject).slice(0, 500), providerId, status, error ? String(error).slice(0, 500) : null],
    );
  } catch (err) {
    console.error(`[email] log failed: ${err.message}`);
  }
}

/** A player's emails, newest first. */
async function ofPlayer(client, userId, limit = 100) {
  const { rows } = await client.query(
    `SELECT id, kind, template_version, subject, status, error, created_at FROM email_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit],
  );
  return rows;
}

const trim = (client) => client.query(`DELETE FROM email_log WHERE created_at < now() - make_interval(months => $1)`, [KEEP_MONTHS]);

function startJobs(client) {
  const run = () => trim(client).catch((err) => console.error(`[email] log trim: ${err.message}`));
  const timer = setInterval(run, 24 * 3600_000);
  timer.unref?.();
  return timer;
}

/** Tests only. */
const useDb = (client) => { db = client; };

module.exports = { KEEP_MONTHS, record, ofPlayer, trim, startJobs, useDb };
