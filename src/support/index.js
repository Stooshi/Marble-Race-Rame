'use strict';

/**
 * Support messages: the Help Centre's contact form (/help#contact) and the back office's inbox.
 *
 *   formToken() / checkFormToken(token)  a signed time stamp handed out with the form: a message
 *                                        sent less than MIN_FILL_MS after it (a bot) is dropped,
 *                                        one older than MAX_FORM_AGE_MS asks for a fresh form
 *   readScreenshot(dataUrl)              a pasted or chosen image → { bytes, type }, checked by its
 *                                        first bytes (PNG, JPEG, WebP, GIF) and its size (≤ 4 MB)
 *   create(req, fields)                  saves one message, linked to the player: their account
 *                                        when logged in (guests too), otherwise the account whose
 *                                        email they typed; emails the support address when email
 *                                        is on and SUPPORT_EMAIL is set → { id, ref }
 *   reply(client, …)                     a reply from the back office, emailed to the player when email is on
 *
 * Spam protection: a hidden field people never fill (the "honeypot"), the form token's timing,
 * a rate limit per address (src/routes/support.js), and the same message from the same email
 * within 10 minutes kept once.
 */
const crypto = require('crypto');
const config = require('../config');
const db = require('../db');
const email = require('../email');
const templates = require('../email/templates');
const library = require('../email/library');
const security = require('../security');
const settings = require('../../client/src/shared/support.json');

const MIN_FILL_MS = 3_000;
const MAX_FORM_AGE_MS = 12 * 3600_000;
const STATUSES = ['new', 'open', 'done'];
// The four stages (Moses, 16 Nov 2026, CRM phase 4; support_messages.stage): New, Open, Answered (waiting for the
// player), Closed. `status`, the column before, is kept in step for older code.
const STAGES = ['new', 'open', 'answered', 'closed'];
const STATUS_OF = { new: 'new', open: 'open', answered: 'open', closed: 'done' };
const AUTO_CLOSE_DAYS = 14;
const { limits } = settings;

const sign = (ts) => crypto.createHmac('sha256', config.auth.jwtSecret).update(`support-form:${ts}`).digest('base64url').slice(0, 32);

function formToken(now = Date.now()) {
  return `${now}.${sign(now)}`;
}

/** 'ok', 'fast' (sent too soon: a bot) or 'stale' (missing, forged or too old). */
function checkFormToken(token, now = Date.now()) {
  const [ts, mac] = String(token ?? '').split('.');
  const t = Number(ts);
  if (!Number.isFinite(t) || !mac || mac.length !== 32) return 'stale';
  const expected = sign(t);
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return 'stale';
  if (now - t < MIN_FILL_MS) return 'fast';
  if (now - t > MAX_FORM_AGE_MS) return 'stale';
  return 'ok';
}

const MAGIC = [
  ['image/png', (b) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))],
  ['image/jpeg', (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff],
  ['image/gif', (b) => b.length > 6 && ['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString('latin1'))],
  ['image/webp', (b) => b.length > 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP'],
];

/** A data URL (data:image/png;base64,…) → { bytes, type }, or throws a readable Error. */
function readScreenshot(dataUrl) {
  const m = /^data:([\w/+.-]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(String(dataUrl));
  if (!m) throw new Error('The screenshot could not be read. Try a PNG or JPEG image.');
  const bytes = Buffer.from(m[2], 'base64');
  if (bytes.length > limits.screenshotBytes) throw new Error(`The screenshot is too big (at most ${Math.round(limits.screenshotBytes / 1048576)} MB).`);
  const type = MAGIC.find(([, test]) => test(bytes))?.[0];
  if (!type) throw new Error('The screenshot must be a PNG, JPEG, WebP or GIF image.');
  return { bytes, type };
}

/** The account a message belongs to: the logged-in player's, else a saved account with that email. */
async function linkAccount(client, req, typedEmail) {
  if (req.user?.id) return { userId: req.user.id, linkedBy: 'login' };
  const { rows } = await client.query(
    'SELECT id FROM users WHERE lower(email) = lower($1) AND deleted_at IS NULL AND NOT is_guest LIMIT 1',
    [typedEmail],
  );
  return rows[0] ? { userId: rows[0].id, linkedBy: 'email' } : { userId: null, linkedBy: null };
}

/** Emails the support address about a new message (when email is on and SUPPORT_EMAIL is set). Never throws. */
async function notify(message) {
  if (!email.enabled() || !config.support.email) return false;
  try {
    const t = templates.supportNotification({ ...message, link: `${config.publicSiteUrl}/admin/support/${message.id}` });
    await email.send({ to: config.support.email, subject: t.subject, html: t.html, tags: ['support'], replyTo: message.email });
    await db.query('UPDATE support_messages SET notified_at = now() WHERE id = $1', [message.id]);
    return true;
  } catch (err) {
    console.error(`[support] notification for ${message.ref} failed: ${err.message}`);
    return false;
  }
}

/**
 * Saves a message (fields already validated by the route). Returns { id, ref, duplicate }.
 */
async function create(req, fields, { screenshot = null } = {}) {
  const { userId, linkedBy } = await linkAccount(db, req, fields.email);
  // The same message from the same email and account within 10 minutes (a double tap, a resend): kept once.
  const { rows: [same] } = await db.query(
    `SELECT id, ref FROM support_messages
      WHERE lower(email) = lower($1) AND message = $2 AND user_id IS NOT DISTINCT FROM $3
        AND created_at > now() - interval '10 minutes' LIMIT 1`,
    [fields.email, fields.message, userId],
  );
  if (same) return { ...same, duplicate: true };
  const ip = security.clientIp(req);
  const { rows: [row] } = await db.query(
    `INSERT INTO support_messages (ref, user_id, linked_by, name, email, category, order_no, message, screenshot, screenshot_type, device, ip, country, stage, stage_at)
     VALUES ('S-' || nextval('support_message_seq'), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'new', now())
     RETURNING id, ref, created_at`,
    [userId, linkedBy, fields.name, fields.email.toLowerCase(), fields.category, fields.order_no ?? null, fields.message,
      screenshot?.bytes ?? null, screenshot?.type ?? null, String(req.get('user-agent') ?? '').slice(0, 300) || null, ip, security.countryOf(ip)],
  );
  const message = { ...fields, email: fields.email.toLowerCase(), id: row.id, ref: row.ref, linkedBy, hasScreenshot: Boolean(screenshot) };
  if (userId) {
    const { rows: [u] } = await db.query('SELECT username, is_guest FROM users WHERE id = $1', [userId]);
    message.account = u ? `@${u.username}${u.is_guest ? ' (guest)' : ''}` : null;
  }
  await notify(message);
  return { id: row.id, ref: row.ref, duplicate: false };
}

/**
 * A reply from the back office (inside the caller's transaction): saved, emailed to the player when
 * email is on, and a new message moves to 'open'. → { reply, emailed, emailError, message }, or null
 */
async function reply(client, { messageId, adminId, body }) {
  const { rows: [m] } = await client.query('SELECT id, ref, name, email, message, status FROM support_messages WHERE id = $1 FOR UPDATE', [messageId]);
  if (!m) return null;
  const { rows: [r] } = await client.query(
    'INSERT INTO support_replies (message_id, admin_id, body) VALUES ($1, $2, $3) RETURNING id, body, created_at',
    [messageId, adminId, body],
  );
  // (A reply: Answered, waiting for the player; closes by itself after 14 days without an answer.)
  await setStage(client, messageId, 'answered');
  let emailed = false;
  let emailError = null;
  if (email.enabled()) {
    try {
      const o = { name: m.name, ref: m.ref, body, original: m.message };
      const t = await library.compose(client, 'support-reply', { values: { name: m.name, ref: m.ref }, core: templates.cores.supportReplyCore(o), fallback: () => templates.supportReply(o) });
      await email.send({ to: m.email, toName: m.name, subject: t.subject, html: t.html, tags: ['support-reply'], replyTo: config.support.email || undefined, templateVersion: t.templateVersion });
      await client.query('UPDATE support_replies SET emailed_at = now() WHERE id = $1', [r.id]);
      emailed = true;
    } catch (err) {
      emailError = err.message; // (the reply is still saved; the back office says it wasn't sent)
      console.error(`[support] reply to ${m.ref} not emailed: ${err.message}`);
    }
  }
  return { reply: { ...r, emailed_at: emailed ? new Date() : null }, emailed, emailError, message: m };
}

/** Sets a message's stage (and its old status in step). */
async function setStage(client, id, stage) {
  await client.query('UPDATE support_messages SET stage = $2, stage_at = now(), status = $3, status_at = now() WHERE id = $1', [id, stage, STATUS_OF[stage]]);
}

/** Answered with no answer for 14 days: closed. → how many. */
async function autoClose(db) {
  const { rowCount } = await db.query(
    `UPDATE support_messages SET stage = 'closed', stage_at = now(), status = 'done', status_at = now()
      WHERE stage = 'answered' AND stage_at < now() - make_interval(days => $1)`,
    [AUTO_CLOSE_DAYS],
  );
  return rowCount;
}

function startJobs(db) {
  const run = () => autoClose(db).then((n) => { if (n) console.log(`[support] closed ${n} answered message(s) after ${AUTO_CLOSE_DAYS} days`); }).catch((err) => console.error(`[support] auto-close: ${err.message}`));
  const timer = setInterval(run, 3600_000);
  timer.unref?.();
  return timer;
}

module.exports = { STAGES, STATUS_OF, AUTO_CLOSE_DAYS, setStage, autoClose, startJobs, MIN_FILL_MS, MAX_FORM_AGE_MS, STATUSES, settings, formToken, checkFormToken, readScreenshot, create, reply, notify };
