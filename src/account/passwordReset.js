'use strict';

/**
 * "Forgot your password?": a one-time link by email (Brevo, src/email), on only when email is set up.
 *
 *   request(db, { email, siteUrl })  makes a link for a saved, active account with that email and
 *                                    emails it. Says nothing about whether the account exists.
 *   reset(db, { token, password })   sets the new password if the link is valid → the user row.
 *
 * Only the token's SHA-256 is stored (password_resets). A link works once, for LINK_MINUTES; asking
 * again makes the older links stop working, and at most MAX_PER_HOUR links are sent per account an hour.
 * A reset ends every login made before it (users.password_changed_at, checked in middleware/auth).
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const config = require('../config');
const email = require('../email');
const templates = require('../email/templates');
const { HttpError, badRequest } = require('../utils/httpError');

const LINK_MINUTES = 60;
const MAX_PER_HOUR = 3;

const hash = (token) => crypto.createHash('sha256').update(token).digest('hex');

/** Emails a reset link if `address` belongs to a saved, active account. → { sent: boolean } (not shown to the player). */
async function request(db, { email: address, siteUrl = config.publicSiteUrl }) {
  if (!email.enabled()) throw new HttpError(503, 'Password reset by email isn\'t available yet. Contact support.');
  const { rows: [user] } = await db.query(
    `SELECT id, username, email FROM users
      WHERE email = $1 AND NOT is_guest AND deleted_at IS NULL AND suspended_at IS NULL`,
    [String(address).trim().toLowerCase()],
  );
  if (!user) return { sent: false };
  const { rows: [{ recent }] } = await db.query(
    `SELECT count(*)::int AS recent FROM password_resets WHERE user_id = $1 AND created_at > now() - interval '1 hour'`,
    [user.id],
  );
  if (recent >= MAX_PER_HOUR) return { sent: false };
  const token = crypto.randomBytes(32).toString('base64url');
  // (A new link replaces any older one still open.)
  await db.query('UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL', [user.id]);
  await db.query(
    `INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, now() + make_interval(mins => $3))`,
    [user.id, hash(token), LINK_MINUTES],
  );
  const link = `${siteUrl.replace(/\/+$/, '')}/reset-password?token=${token}`;
  const message = templates.passwordReset({ username: user.username, link, minutes: LINK_MINUTES });
  await email.send({ to: user.email, toName: user.username, subject: message.subject, html: message.html, tags: ['password-reset'] });
  return { sent: true, userId: user.id };
}

/** Sets a new password with a link's token. Throws 400 if the link is unknown, used or expired. */
async function reset(db, { token, password }) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 100) throw badRequest('This reset link is not valid');
  return db.withTransaction(async (client) => {
    const { rows: [link] } = await client.query(
      `SELECT r.id, r.user_id FROM password_resets r JOIN users u ON u.id = r.user_id
        WHERE r.token_hash = $1 AND r.used_at IS NULL AND r.expires_at > now()
          AND u.deleted_at IS NULL AND u.suspended_at IS NULL
        FOR UPDATE OF r`,
      [hash(token)],
    );
    if (!link) throw badRequest('This reset link has expired or was already used. Ask for a new one.');
    const passwordHash = await bcrypt.hash(password, config.auth.bcryptRounds);
    await client.query('UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL', [link.user_id]);
    // (Whole seconds, so a login made right after the reset — same second — still counts as after it.)
    const { rows: [user] } = await client.query(
      `UPDATE users SET password_hash = $2, password_changed_at = date_trunc('second', now()) WHERE id = $1 RETURNING id`,
      [link.user_id, passwordHash],
    );
    await client.query('UPDATE admin_sessions SET ended_at = now() WHERE user_id = $1 AND ended_at IS NULL', [link.user_id]);
    return user;
  });
}

module.exports = { request, reset, LINK_MINUTES, MAX_PER_HOUR, hash };
