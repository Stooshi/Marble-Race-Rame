'use strict';

/**
 * Payments for coin packs behind one interface, whichever store takes the money:
 *
 *   stripe  the website (Stripe Checkout, src/payments/stripe.js; coins only from its webhook)
 *   apple   the iPhone app (App Store in-app purchase) [placeholder until the app exists]
 *   google  the Android app (Google Play Billing, src/payments/google.js: verified with Google before coins)
 *   test    local development only: pays at once      (PAYMENTS_TEST=true, never in production)
 *
 * Every provider ends in the same place: grant(), which marks the payment paid
 * and adds the pack's coins exactly once, counted as bought coins (never
 * earned, so they don't count on the scoreboards). Coins are spent in the shop
 * (src/marbles/collection.js) and never cashed out. Looks only, never speed.
 *
 * A provider is { name, configured(), start(payment, ctx) → next, verify?(input) → { ref, productId } }:
 *   start: begins a web checkout and says what the client does next,
 *          { kind: 'redirect', url } or { kind: 'done' } or { kind: 'unavailable', message };
 *   verify: checks a store receipt from an app and returns its transaction id and product.
 */

const packsFile = require('../../client/src/shared/payments/packs.json');
const config = require('../config');
const { HttpError, badRequest, notFound } = require('../utils/httpError');
const economy = require('../economy');
const stripe = require('./stripe');
const google = require('./google');
const consent = require('../../client/src/shared/payments/consent.json');

const PACKS = new Map(packsFile.packs.map((p) => [p.id, p]));

const notYet = (what) => ({ kind: 'unavailable', message: `${what} isn't connected yet. [Placeholder]` });

const PROVIDERS = {
  stripe: {
    name: 'stripe',
    // Test keys only until STRIPE_ALLOW_LIVE=true.
    configured: () => stripe.configured(),
    start: (payment, ctx) => (payment ? stripe.start(payment, ctx) : notYet('Card payment')),
  },
  apple: {
    name: 'apple',
    configured: () => false,
    start: async () => notYet('App Store purchase'),
    verify: async () => { throw new HttpError(501, 'App Store receipts are not checked yet. [Placeholder]'); },
  },
  google: {
    name: 'google',
    // On once GOOGLE_PLAY_SERVICE_ACCOUNT is set on the server (the app buys through Google Play
    // Billing and sends the purchase to /api/payments/google/verify; see googlePurchase below).
    configured: () => google.configured(),
    start: async () => ({ kind: 'unavailable', message: 'Coins in the Android app are bought through Google Play.' }),
  },
  test: {
    name: 'test',
    configured: () => !config.isProduction && process.env.PAYMENTS_TEST === 'true',
    start: async () => ({ kind: 'done' }),
  },
};

function pack(productId) {
  const p = PACKS.get(productId);
  if (!p) throw notFound('No such coin pack');
  return p;
}

/** Which providers can take money right now (the client shows the others as placeholders). */
function available() {
  return Object.fromEntries(Object.values(PROVIDERS).map((p) => [p.name, p.configured()]));
}

/** Adds a paid payment's coins, once. Returns the player's new coin balance (or null if it was already granted). */
async function grant(client, paymentId, providerRef = null) {
  const { rows: [pay] } = await client.query(
    `UPDATE payments SET status = 'paid', paid_at = now(), provider_ref = COALESCE($2, provider_ref)
      WHERE id = $1 AND status = 'pending' RETURNING id, user_id, coins, product_id`,
    [paymentId, providerRef],
  );
  if (!pay) return null;
  const done = await economy.change(client, { userId: pay.user_id, amount: pay.coins, kind: 'coin-pack', paymentId: pay.id, note: pay.product_id });
  return done.balance;
}

/** The consent a player gave at checkout, stored with the payment (EU withdrawal-right waiver + terms). */
const CONSENT_TEXT = `[${consent.version}] ${consent.withdrawal} / ${consent.terms}`;

/**
 * Starts buying a coin pack with a provider. The player must have agreed to immediate delivery
 * (losing the 14-day withdrawal right) and the terms (`consent: true`). Each payment gets an
 * order number (MS-1001…). Stripe returns a Checkout page to go to; its coins come only from
 * the webhook. The test provider pays at once.
 */
async function checkout(client, userId, { productId, provider: providerName, consent: agreed, locale, siteUrl = null }) {
  const provider = PROVIDERS[providerName];
  if (!provider) throw badRequest('Unknown payment provider');
  const p = pack(productId);
  // The app stores have no web checkout: the apps buy in the store and send the purchase to be checked.
  if (!provider.configured() || provider.name === 'google' || provider.name === 'apple') {
    return { payment: null, next: await provider.start(null, {}) };
  }
  if (agreed !== true) throw badRequest('Please agree to immediate delivery and the terms of sale first');
  const { rows: [payment] } = await client.query(
    `INSERT INTO payments (user_id, provider, product_id, coins, amount_cents, currency, order_no, consent_at, consent_text)
     VALUES ($1, $2, $3, $4, $5, $6, 'MS-' || nextval('payment_order_seq'), now(), $7)
     RETURNING id, user_id, order_no, status, product_id, coins, amount_cents, currency`,
    [userId, provider.name, p.id, p.coins, p.amountCents, p.currency, CONSENT_TEXT],
  );
  const { rows: [user] } = await client.query('SELECT email, is_guest FROM users WHERE id = $1', [userId]);
  const next = await provider.start(payment, { userId, pack: p, email: user && !user.is_guest ? user.email : null, locale, siteUrl });
  if (next.kind === 'done') {
    const coins = await grant(client, payment.id, `test-${payment.id}`);
    return { payment: { ...payment, status: 'paid' }, next, coins };
  }
  if (next.sessionId) {
    await client.query('UPDATE payments SET stripe_session_id = $2 WHERE id = $1', [payment.id, next.sessionId]);
  }
  const { sessionId, ...shown } = next;
  return { payment: { order_no: payment.order_no, status: payment.status, product_id: payment.product_id, coins: payment.coins }, next: shown };
}

// What a player sees of their own orders (Purchases page).
const ORDER_COLUMNS = `order_no, provider, product_id, coins, amount_cents, upper(currency) AS currency, charged_cents, charged_currency,
  tax_cents, status, refunded_cents, receipt_url, created_at, paid_at, refunded_at`;

/** A player's orders, newest first (lapsed checkouts that were never paid are left out). */
async function ordersOf(client, userId) {
  const { rows } = await client.query(
    `SELECT ${ORDER_COLUMNS} FROM payments WHERE user_id = $1 AND order_no IS NOT NULL AND status <> 'failed'
      ORDER BY created_at DESC LIMIT 200`,
    [userId],
  );
  return rows;
}

/** One of a player's orders by its number (for the page they come back to after paying). */
async function orderOf(client, userId, orderNo) {
  const { rows: [order] } = await client.query(`SELECT ${ORDER_COLUMNS} FROM payments WHERE user_id = $1 AND order_no = $2`, [userId, orderNo]);
  if (!order) throw notFound('No such order');
  return order;
}

/**
 * A verified Stripe webhook event, handled exactly once (Stripe may send it again): the event id
 * is recorded in the same transaction that adds or removes coins.
 */
async function stripeEvent(db, event) {
  const extra = await stripe.prefetch(event);
  return db.withTransaction(async (client) => {
    const { rows } = await client.query('INSERT INTO stripe_events (id, type) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING RETURNING id', [event.id, event.type]);
    if (!rows[0]) return 'duplicate';
    return stripe.handleEvent(client, event, { grant, receiptUrl: extra.receiptUrl });
  });
}

/**
 * The back office refunds a paid payment (all of it, or `amountCents`). Stripe payments: Stripe is
 * asked to refund, and the coins go when its refund event arrives. Test payments: at once.
 */
async function refund(db, paymentId, { amountCents = null, adminId, reason }) {
  const { rows: [pay] } = await db.query('SELECT * FROM payments WHERE id = $1', [paymentId]);
  if (!pay) throw notFound('No such payment');
  if (pay.status !== 'paid') throw badRequest(`Only a paid payment can be refunded (this one is ${pay.status})`);
  const left = (pay.charged_cents ?? pay.amount_cents) - pay.refunded_cents;
  if (amountCents != null && (!Number.isInteger(amountCents) || amountCents < 1 || amountCents > left)) throw badRequest(`Refund between 1 and ${left} (in ${pay.charged_currency ?? pay.currency})`);
  if (pay.provider === 'stripe') {
    const r = await stripe.requestRefund(pay, { amountCents, adminId, reason });
    await db.query(
      'INSERT INTO admin_audit (admin_id, action, target_user_id, reason, details) VALUES ($1, $2, $3, $4, $5)',
      [adminId, 'refund-request', pay.user_id, reason, JSON.stringify({ order_no: pay.order_no, payment_id: pay.id, refund_id: r.id, amount_cents: r.amount, status: r.status })],
    );
    return { refund: r, waiting: true };
  }
  if (pay.provider === 'test') {
    const out = await db.withTransaction(async (client) => {
      const { rows: [locked] } = await client.query('SELECT * FROM payments WHERE id = $1 FOR UPDATE', [pay.id]);
      return stripe.revoke(client, { payment: locked, refundId: `test-refund-${pay.id}-${locked.refunded_cents}`, amountCents: amountCents ?? left, adminId, reason });
    });
    return { refund: { status: 'succeeded' }, ...out, waiting: false };
  }
  if (pay.provider === 'google') {
    // Google refunds whole orders only; the coins go when the voided purchase comes back from Google.
    if (amountCents != null && amountCents !== left) throw badRequest('Google Play purchases can only be refunded in full');
    if (!/^GPA\./.test(pay.provider_ref ?? '')) throw badRequest('This Google Play purchase has no order id: refund it in Play Console');
    await google.refundOrder(pay.provider_ref);
    await db.query(
      'INSERT INTO admin_audit (admin_id, action, target_user_id, reason, details) VALUES ($1, $2, $3, $4, $5)',
      [adminId, 'refund-request', pay.user_id, reason, JSON.stringify({ order_no: pay.order_no, payment_id: pay.id, google_order: pay.provider_ref })],
    );
    // Google lists the voided purchase within minutes: check now, and the 6-hourly check catches the rest.
    setTimeout(() => googleSync(db).catch((err) => console.error(`[google-play] voided check: ${err.message}`)), 60_000).unref?.();
    return { refund: { status: 'requested' }, waiting: true };
  }
  throw badRequest(`${pay.provider} purchases are refunded by the store itself`);
}

/** The player's account id for Google Play purchases (the app buys with it). */
const googleAccountId = (db, userId) => google.accountIdFor(db, userId);

/** A Google Play purchase from the app (or from Google's notification): verified with Google, coins once. */
function googlePurchase(db, { userId = null, productId, purchaseToken }) {
  if (!google.configured()) throw new HttpError(503, 'Google Play purchases are not connected yet');
  return google.redeem(db, { userId, productId, purchaseToken }, { grant, pack });
}

/** Google's refunds and chargebacks (voided purchases) taken back, and purchases not yet consumed consumed. */
async function googleSync(db) {
  if (!google.configured()) return { revoked: 0, consumed: 0 };
  const consumed = await google.consumeLeftovers(db);
  const revoked = await google.syncVoided(db, { revoke: stripe.revoke });
  if (revoked || consumed) console.log(`[google-play] ${revoked} voided purchase(s) taken back, ${consumed} consumed`);
  return { revoked, consumed };
}

/** Every hour: consume leftovers; every 6 hours: voided purchases. Started by src/server.js. */
function startGoogleJobs(db) {
  if (!google.configured()) return null;
  let n = 0;
  const run = async () => {
    n += 1;
    try {
      if (n % 6 === 1) await googleSync(db);
      else await google.consumeLeftovers(db);
    } catch (err) { console.error(`[google-play] job: ${err.message}`); }
  };
  setTimeout(run, 30_000).unref?.();
  const timer = setInterval(run, 3600_000);
  timer.unref?.();
  return timer;
}

/** An app's store purchase: check the receipt, record it once, add the coins. */
async function redeemReceipt(client, userId, { provider: providerName, receipt }) {
  const provider = PROVIDERS[providerName];
  if (!provider?.verify) throw badRequest('Unknown store');
  const { ref, productId } = await provider.verify(receipt);
  const p = pack(productId);
  const { rows: [payment] } = await client.query(
    `INSERT INTO payments (user_id, provider, provider_ref, product_id, coins, amount_cents, currency, order_no)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'MS-' || nextval('payment_order_seq'))
     ON CONFLICT (provider, provider_ref) DO NOTHING RETURNING id`,
    [userId, provider.name, ref, p.id, p.coins, p.amountCents, p.currency],
  );
  if (!payment) return { coins: null, duplicate: true };
  return { coins: await grant(client, payment.id) };
}

module.exports = { PROVIDERS, PACKS, CONSENT_TEXT, available, checkout, grant, redeemReceipt, ordersOf, orderOf, stripeEvent, refund, googleAccountId, googlePurchase, googleSync, startGoogleJobs, pack };
