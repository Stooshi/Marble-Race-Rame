'use strict';

/**
 * Sending email, through Brevo (an EU email provider) — off until BREVO_API_KEY is set.
 *
 *   enabled()            whether email can be sent (the key is set)
 *   send({ to, subject, html, tags, headers, replyTo })
 *                        sends one email through Brevo's transactional API → { messageId }
 *
 * Used for password resets and support (new-message notifications, replies) now; news emails will use the same sender later (their unsubscribe
 * links and headers: ./unsubscribe.js). Tests swap the transport with setTransport().
 */
const config = require('../config');

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

/** Sends one email. Throws if email is off or the provider refuses it. */
async function send({ to, toName, subject, html, tags = [], headers, replyTo }) {
  if (!enabled()) throw new Error('Email is not set up (BREVO_API_KEY)');
  return transport({
    sender: { name: config.email.fromName, email: config.email.from },
    to: [{ email: to, ...(toName && { name: toName }) }],
    subject,
    htmlContent: html,
    tags,
    ...(headers && { headers }),
    ...(replyTo && { replyTo: { email: replyTo } }),
  });
}

module.exports = { enabled, send, setTransport };
