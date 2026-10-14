'use strict';

/**
 * Stripe on the website: Checkout for the coin packs, the webhook that adds the
 * coins, and refunds that take them back.
 *
 *   start()        makes a Stripe Checkout page for a pending payment: the pack's price,
 *                  shown in the player's own currency (Adaptive Pricing) with VAT included
 *                  (Stripe Tax), card / Apple Pay / Google Pay as the dashboard allows.
 *   verify()       checks a webhook's signature (STRIPE_WEBHOOK_SECRET) → the event.
 *   handleEvent()  the ONLY place Stripe coins are added: "checkout.session.completed"
 *                  (paid) → grant(), once. Refunds and disputes take the coins back.
 *   requestRefund() the back office asks Stripe for a refund; the coins go when Stripe's
 *                  refund event arrives (the same path as a refund made in the Stripe dashboard).
 *
 * Test keys only (sk_test_…) unless STRIPE_ALLOW_LIVE=true: live money waits for Moses.
 */
const Stripe = require('stripe');
const config = require('../config');
const consent = require('../../client/src/shared/payments/consent.json');
const economy = require('../economy');
const { HttpError, badRequest } = require('../utils/httpError');

let injected = null; // (tests: a fake Stripe client)
let real = null;

function client() {
  if (injected) return injected;
  if (!real) real = new Stripe(config.stripe.secretKey);
  return real;
}

/** Tests only: use a fake Stripe client (null to go back to the real one). */
function setClient(fake) { injected = fake; }

function isLiveKey(key) { return /^(sk|rk)_live_/.test(key || ''); }

/** Stripe can take money once there's a secret key — a test key, or a live one only when live is allowed. */
function configured() {
  const key = config.stripe.secretKey;
  if (!key) return false;
  return isLiveKey(key) ? config.stripe.allowLive : /^(sk|rk)_test_/.test(key);
}

function mode() {
  if (!config.stripe.secretKey) return 'off';
  if (isLiveKey(config.stripe.secretKey)) return config.stripe.allowLive ? 'live' : 'live-blocked';
  return 'test';
}

/** A Stripe Checkout page for a pending payment → { kind: 'redirect', url }. */
async function start(payment, { pack, email, locale, siteUrl }) {
  const site = siteUrl || config.stripe.siteUrl;
  const params = {
    mode: 'payment',
    client_reference_id: payment.id,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: pack.currency,
        unit_amount: pack.amountCents,
        tax_behavior: 'inclusive', // (the price already includes VAT)
        product_data: {
          name: `${pack.coins.toLocaleString('en-US')} Marble Spins coins`,
          description: 'Coins for the Marble Spins shop: looks only, never speed. Delivered right away; no cash value.',
          tax_code: config.stripe.taxCode,
          metadata: { product_id: pack.id },
        },
      },
    }],
    automatic_tax: { enabled: config.stripe.tax },
    adaptive_pricing: { enabled: true }, // (the price in the player's own currency)
    metadata: { payment_id: payment.id, user_id: payment.user_id, order_no: payment.order_no, product_id: pack.id },
    payment_intent_data: {
      description: `Marble Spins ${payment.order_no}: ${pack.coins} coins`,
      metadata: { payment_id: payment.id, order_no: payment.order_no, product_id: pack.id },
    },
    success_url: `${site}/purchases?paid=${encodeURIComponent(payment.order_no)}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/checkout?pack=${encodeURIComponent(pack.id)}&cancelled=1`,
    custom_text: { submit: { message: consent.stripeSubmit } },
    locale: locale || 'auto',
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // (an hour, then the order lapses)
  };
  if (email) params.customer_email = email; // (the receipt goes here; otherwise Stripe asks for one)
  else params.customer_creation = 'if_required';
  if (config.stripe.tosInCheckout) params.consent_collection = { terms_of_service: 'required' };
  const session = await client().checkout.sessions.create(params, { idempotencyKey: `checkout-${payment.id}` });
  return { kind: 'redirect', url: session.url, sessionId: session.id };
}

/** Checks a webhook's signature against the raw body → the Stripe event (throws 400 if it isn't Stripe's). */
function verify(rawBody, signature) {
  if (!config.stripe.webhookSecret) throw new HttpError(503, 'Stripe webhook secret is not set');
  try {
    // (Verification needs no API key; a placeholder key builds the helper when none is set.)
    const verifier = injected?.webhooks ? injected : (real ?? new Stripe(config.stripe.secretKey || 'sk_test_unused'));
    return verifier.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
  } catch (err) {
    throw badRequest(`Webhook signature check failed: ${err.message}`);
  }
}

/** The receipt link for a payment (best effort: the coins never wait for it). */
async function receiptUrl(paymentIntentId) {
  if (!paymentIntentId) return null;
  try {
    const pi = await client().paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] });
    return pi.latest_charge?.receipt_url ?? null;
  } catch (err) {
    console.warn('[stripe] receipt link not found', err.message);
    return null;
  }
}

/** Facts to look up from Stripe before the database transaction (network calls stay outside it). */
async function prefetch(event) {
  const o = event.data.object;
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    return { receiptUrl: await receiptUrl(typeof o.payment_intent === 'string' ? o.payment_intent : o.payment_intent?.id) };
  }
  return {};
}

const idOf = (v) => (typeof v === 'string' ? v : v?.id ?? null);

async function paymentForSession(db, session) {
  // Our payment id rides along in the session (metadata + client_reference_id); the session id is the fallback.
  const id = session.metadata?.payment_id || session.client_reference_id || null;
  const { rows: [pay] } = id && /^[0-9a-f-]{36}$/i.test(id)
    ? await db.query(`SELECT * FROM payments WHERE provider = 'stripe' AND id = $1 FOR UPDATE`, [id])
    : await db.query(`SELECT * FROM payments WHERE provider = 'stripe' AND stripe_session_id = $1 FOR UPDATE`, [session.id]);
  if (pay?.stripe_session_id && pay.stripe_session_id !== session.id) return null; // (another checkout's session: not this payment)
  return pay ?? null;
}

/**
 * Takes a refunded (or disputed) part of a payment's coins back, once per `refundId`:
 * coins in proportion to the money returned, never more than the pack gave; if the player
 * has already spent them, what's left is taken and the rest recorded as short.
 * Logged in the coin ledger ('pack-refund') and the back office's audit log.
 */
async function revoke(db, { payment, refundId, amountCents, adminId = null, reason, action = 'refund' }) {
  if (!(amountCents > 0)) return null;
  const { rows: [done] } = await db.query('SELECT 1 FROM payment_refunds WHERE id = $1', [refundId]);
  if (done) return null;
  const { rows: [{ taken }] } = await db.query(
    'SELECT COALESCE(sum(coins_removed + coins_short), 0)::int AS taken, COALESCE(sum(amount_cents), 0)::int AS cents FROM payment_refunds WHERE payment_id = $1',
    [payment.id],
  );
  const paidCents = payment.charged_cents ?? payment.amount_cents;
  const refundedAfter = Math.min(paidCents, payment.refunded_cents + amountCents);
  const full = refundedAfter >= paidCents;
  const due = Math.max(0, full ? payment.coins - taken : Math.min(payment.coins - taken, Math.round((payment.coins * amountCents) / paidCents)));

  const { rows: [user] } = await db.query('SELECT coins FROM users WHERE id = $1 FOR UPDATE', [payment.user_id]);
  const removed = Math.min(due, user.coins);
  const short = due - removed;
  if (removed > 0) {
    await economy.change(db, {
      userId: payment.user_id, amount: -removed, kind: 'pack-refund', paymentId: payment.id, actorId: adminId,
      note: `${payment.order_no ?? payment.product_id} refunded${short ? ` (${short} already spent)` : ''}`,
    });
  }
  if (due > 0) await db.query('UPDATE users SET coins_bought = GREATEST(coins_bought - $2, 0) WHERE id = $1', [payment.user_id, due]);
  await db.query(
    `INSERT INTO payment_refunds (id, payment_id, amount_cents, coins_removed, coins_short, admin_id, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [refundId, payment.id, amountCents, removed, short, adminId, reason],
  );
  await db.query(
    `UPDATE payments SET refunded_cents = $2, refunded_at = now(), status = CASE WHEN $3 THEN 'refunded' ELSE status END WHERE id = $1`,
    [payment.id, refundedAfter, full],
  );
  await db.query(
    'INSERT INTO admin_audit (admin_id, action, target_user_id, reason, details) VALUES ($1, $2, $3, $4, $5)',
    [adminId, action, payment.user_id, reason, JSON.stringify({
      order_no: payment.order_no, payment_id: payment.id, refund_id: refundId, amount_cents: amountCents,
      currency: payment.charged_currency ?? payment.currency, coins_removed: removed, coins_short: short, full,
    })],
  );
  return { removed, short, full };
}

async function paymentForIntent(db, intentId) {
  if (!intentId) return null;
  const { rows: [pay] } = await db.query(`SELECT * FROM payments WHERE provider = 'stripe' AND payment_intent = $1 FOR UPDATE`, [intentId]);
  return pay ?? null;
}

/**
 * One verified Stripe event, inside the caller's transaction. `grant` adds a payment's coins once
 * (src/payments → grant). → a short word for the log: what happened.
 */
async function handleEvent(db, event, { grant, receiptUrl: receipt = null } = {}) {
  const o = event.data.object;
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      if (o.mode !== 'payment') return 'ignored';
      const pay = await paymentForSession(db, o);
      if (!pay) return 'unknown-payment';
      await db.query(
        `UPDATE payments SET stripe_session_id = $2, payment_intent = COALESCE($3, payment_intent), charged_cents = $4,
                charged_currency = upper($5), tax_cents = $6, receipt_url = COALESCE($7, receipt_url) WHERE id = $1`,
        [pay.id, o.id, idOf(o.payment_intent), o.amount_total, o.currency, o.total_details?.amount_tax ?? 0, receipt],
      );
      if (o.payment_status !== 'paid') return 'waiting'; // (a slower payment method: its own event follows)
      const balance = await grant(db, pay.id, o.id);
      return balance === null ? 'already-granted' : 'granted';
    }
    case 'checkout.session.async_payment_failed':
    case 'checkout.session.expired': {
      const pay = await paymentForSession(db, o);
      if (!pay) return 'unknown-payment';
      const { rowCount } = await db.query(`UPDATE payments SET status = 'failed' WHERE id = $1 AND status = 'pending'`, [pay.id]);
      return rowCount ? 'failed' : 'ignored';
    }
    case 'refund.created':
    case 'refund.updated': {
      if (o.status !== 'succeeded') return 'waiting';
      const pay = await paymentForIntent(db, idOf(o.payment_intent));
      if (!pay) return 'unknown-payment';
      if (pay.status === 'pending' || pay.status === 'failed') return 'not-paid';
      const meta = o.metadata ?? {};
      const out = await revoke(db, {
        payment: pay, refundId: o.id, amountCents: o.amount,
        adminId: /^[0-9a-f-]{36}$/i.test(meta.admin_id ?? '') ? meta.admin_id : null,
        reason: meta.reason || 'Refunded in the Stripe dashboard',
      });
      return out ? 'revoked' : 'already-revoked';
    }
    case 'charge.dispute.created': {
      const pay = await paymentForIntent(db, idOf(o.payment_intent));
      if (!pay || pay.status !== 'paid') return 'ignored';
      const out = await revoke(db, { payment: pay, refundId: o.id, amountCents: o.amount, reason: `Payment disputed (chargeback): ${o.reason ?? 'no reason given'}`, action: 'dispute' });
      return out ? 'revoked' : 'already-revoked';
    }
    default:
      return 'ignored';
  }
}

/** The back office: ask Stripe to refund (all, or `amountCents` of) a payment. The coins go when Stripe confirms. */
async function requestRefund(payment, { amountCents, adminId, reason }) {
  if (!payment.payment_intent) throw badRequest('This payment has no Stripe payment yet');
  const refund = await client().refunds.create({
    payment_intent: payment.payment_intent,
    ...(amountCents && { amount: amountCents }),
    reason: 'requested_by_customer',
    metadata: { payment_id: payment.id, order_no: payment.order_no ?? '', admin_id: adminId, reason: reason.slice(0, 450) },
  }, { idempotencyKey: `refund-${payment.id}-${payment.refunded_cents}-${amountCents ?? 'all'}` });
  return { id: refund.id, status: refund.status, amount: refund.amount };
}

module.exports = { configured, mode, start, verify, prefetch, handleEvent, revoke, requestRefund, setClient, isLiveKey };
