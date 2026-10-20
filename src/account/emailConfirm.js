'use strict';

/**
 * "Confirm your email" after sign-up (double opt-in; Moses, 20 Oct 2026). Sent only once email is set
 * up (BREVO_API_KEY); until then an account is saved without it. The link works for LINK_DAYS and
 * once; opening it sets users.email_verified_at. News emails (and an account's pass reminder email)
 * go only to a confirmed address. Texts in English and Swedish (the browser's language at sign-up),
 * for Moses's review in the project doc claude/signup-confirm-email.md.
 */
const crypto = require('crypto');
const config = require('../config');
const email = require('../email');
const company = require('../../client/src/shared/company.json');
const { badRequest } = require('../utils/httpError');

const LINK_DAYS = 7;
const MAX_PER_HOUR = 3;
const hash = (token) => crypto.createHash('sha256').update(token).digest('hex');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const TEXTS = {
  en: {
    subject: 'Confirm your email for Marble Spins',
    title: 'Confirm your email',
    hello: 'Hi {name},',
    body: 'Thanks for saving your marble. Tap the button to confirm that this is your email address, so your account is yours for good and you can get a new password if you ever forget it.',
    button: 'Confirm my email',
    later: 'The link works for 7 days. Didn\'t sign up for Marble Spins? Then ignore this email: nothing more will be sent.',
    raw: 'If the button doesn\'t work, copy this address into your browser:',
    footer: 'Marble Spins is operated by',
  },
  sv: {
    subject: 'Bekräfta din e-post för Marble Spins',
    title: 'Bekräfta din e-post',
    hello: 'Hej {name}!',
    body: 'Tack för att du sparade din kula. Tryck på knappen för att bekräfta att det här är din e-postadress, så att kontot är ditt för gott och du kan få ett nytt lösenord om du glömmer det.',
    button: 'Bekräfta min e-post',
    later: 'Länken fungerar i 7 dagar. Har du inte skapat något konto på Marble Spins? Strunta i mejlet, så skickas inget mer.',
    raw: 'Fungerar inte knappen? Kopiera den här adressen till din webbläsare:',
    footer: 'Marble Spins drivs av',
  },
};

/** The email: { subject, html }. */
function message({ lang = 'en', name, link }) {
  const t = TEXTS[lang] ?? TEXTS.en;
  const L = TEXTS[lang] ? lang : 'en';
  return {
    subject: t.subject,
    html: `<!doctype html><html lang="${L}"><body style="margin:0;padding:0;background:#f2f4f8">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f4f8;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;font-family:Arial,Helvetica,sans-serif;color:#1b1f2a">
<tr><td style="background:#0e1320;border-radius:14px 14px 0 0;padding:18px 24px;color:#f2f4f8;font-size:22px;font-weight:bold">marblespins</td></tr>
<tr><td style="padding:24px;font-size:15px;line-height:1.55">
<h1 style="font-size:20px;margin:0 0 12px">${esc(t.title)}</h1>
<p style="margin:0 0 12px">${esc(t.hello.replace('{name}', name))}</p>
<p style="margin:0 0 12px">${esc(t.body)}</p>
<p style="margin:24px 0"><a href="${esc(link)}" style="background:#ffd21f;color:#0e1320;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px;display:inline-block">${esc(t.button)}</a></p>
<p style="margin:0 0 12px;color:#4b5563">${esc(t.later)}</p>
<p style="margin:16px 0 0;font-size:12px;color:#6b7280">${esc(t.raw)}<br><span style="word-break:break-all">${esc(link)}</span></p>
</td></tr>
<tr><td style="padding:0 24px 20px;font-size:12px;color:#6b7280">${esc(t.footer)} ${esc(company.name)}, org.nr ${esc(company.orgNo)}, ${esc(company.street)}, ${esc(company.postcode)} ${esc(company.city)}, ${esc(company.country)}.</td></tr>
</table></td></tr></table></body></html>`,
  };
}

/** Is sending on (email set up)? */
const on = () => email.enabled();

/** Sends the confirmation link to a saved account's address. → 'sent' | 'off' (email not set up) | 'limit'. */
async function send(db, user, { lang = 'en', siteUrl = config.publicSiteUrl } = {}) {
  if (!on()) return 'off';
  const { rows: [{ recent }] } = await db.query(
    `SELECT count(*)::int AS recent FROM email_confirmations WHERE user_id = $1 AND created_at > now() - interval '1 hour'`,
    [user.id],
  );
  if (recent >= MAX_PER_HOUR) return 'limit';
  const token = crypto.randomBytes(32).toString('base64url');
  const language = lang === 'sv' ? 'sv' : 'en';
  await db.query(
    `INSERT INTO email_confirmations (user_id, email, token_hash, lang, expires_at) VALUES ($1, $2, $3, $4, now() + make_interval(days => $5))`,
    [user.id, user.email, hash(token), language, LINK_DAYS],
  );
  const link = `${siteUrl.replace(/\/+$/, '')}/confirm-email?t=${encodeURIComponent(token)}`;
  const m = message({ lang: language, name: user.username, link });
  await email.send({ to: user.email, toName: user.username, subject: m.subject, html: m.html, tags: ['confirm-email'] });
  return 'sent';
}

/** Opens a confirmation link: confirms the address it was sent to (if it is still the account's). → { confirmed: true }. */
async function confirm(db, token) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 100) throw badRequest('This confirmation link is not valid');
  const { rows: [row] } = await db.query(
    `UPDATE email_confirmations c SET used_at = COALESCE(c.used_at, now())
       FROM users u
      WHERE c.token_hash = $1 AND c.expires_at > now() AND u.id = c.user_id AND u.deleted_at IS NULL AND lower(u.email) = lower(c.email)
      RETURNING c.user_id`,
    [hash(token)],
  );
  if (!row) throw badRequest('This confirmation link has expired. Log in and ask for a new one in Settings.');
  await db.query('UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()) WHERE id = $1', [row.user_id]);
  return { confirmed: true };
}

module.exports = { send, confirm, message, on, TEXTS, LINK_DAYS, MAX_PER_HOUR, hash };
