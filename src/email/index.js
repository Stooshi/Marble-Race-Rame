'use strict';

/**
 * Sending email, through Brevo (an EU email provider) — off until BREVO_API_KEY is set.
 *
 *   enabled()            whether email can be sent (the key is set)
 *   send({ to, subject, html, tags, headers, replyTo, attachments: [{ name, content: Buffer }] })
 *                        sends one email through Brevo's transactional API → { messageId }
 *
 * Used for password resets and support (new-message notifications, replies) now; news emails will use the same sender later (their unsubscribe
 * links and headers: ./unsubscribe.js). Tests swap the transport with setTransport().
 */
const config = require('../config');
const log = require('./log');

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

async function brevo(message) {
  const res = await fetch(BREVO_URL, {
    method: 'POST',
    headers: { 'api-key': config.email.brevoApiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(message),
    signal: AbortSignal.timeout(10_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${body.message || body.code || 'send failed'}`);
  return { messageId: body.messageId ?? null };
}

let transport = brevo;

/** Tests only: replace how messages leave (null: back to Brevo). */
function setTransport(fn) { transport = fn || brevo; }

const enabled = () => Boolean(config.email.brevoApiKey) || transport !== brevo;

/**
 * Sends one email. Throws if email is off or the provider refuses it. Every send is logged (./log.js): `kind` (else
 * the first tag), `userId` (else the player with that address), `templateVersion` (an edited template's), `test`
 * (an admin's test-send of a template).
 */
async function send({ to, toName, subject, html, tags = [], headers, replyTo, attachments = [], kind, userId = null, templateVersion = null, test = false }) {
  if (!enabled()) throw new Error('Email is not set up (BREVO_API_KEY)');
  const what = kind ?? tags[0] ?? 'other';
  try {
    const out = await transport({
      sender: { name: config.email.fromName, email: config.email.from },
      to: [{ email: to, ...(toName && { name: toName }) }],
      subject,
      htmlContent: html,
      tags,
      ...(headers && { headers }),
      ...(replyTo && { replyTo: { email: replyTo } }),
      // (Files, e.g. the receipt's PDF: Brevo takes them base64-encoded.)
      ...(attachments.length && { attachment: attachments.map((f) => ({ name: f.name, content: Buffer.from(f.content).toString('base64') })) }),
    });
    await log.record({ to, userId, kind: what, templateVersion, subject, providerId: out?.messageId ?? null, status: test ? 'test' : 'sent' });
    return out;
  } catch (err) {
    await log.record({ to, userId, kind: what, templateVersion, subject, status: 'failed', error: err.message });
    throw err;
  }
}

module.exports = { enabled, send, setTransport };
