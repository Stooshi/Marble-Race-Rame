'use strict';

/**
 * Payments for coin packs behind one interface, whichever store takes the money:
 *
 *   stripe  the website (Stripe Checkout, src/payments/stripe.js; coins only from its webhook)
 *   apple   the iPhone app (App Store in-app purchases, StoreKit 2: src/payments/apple.js, Apple's signature checked before coins)
 *   google  the Android app (Google Play Billing, src/payments/google.js: verified with Google before coins)
 *   test    local development only: pays at once      (PAYMENTS_TEST=true, never in production)
 *
 * Every provider ends in the same place: grant(), which marks the payment paid
 * and adds the pack's coins exactly once (or, for a season pass, gives the player the pass once:
 * a pass payment has no coins and its season in payments.season_key; src/seasons), counted as bought coins (never
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
const { HttpError, badRequest, conflict, notFound } = require('../utils/httpError');
const economy = require('../economy');
const stripe = require('./stripe');
const google = require('./google');
const apple = require('./apple');
const consent = require('../../client/src/shared/payments/consent.json');
const seasons = require('../seasons');

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
    // On once APPLE_IAP_ENABLED=true on the server (the app buys through StoreKit 2 and sends the
    // signed transaction to /api/payments/apple/verify; see applePurchase below).
    configured: () => apple.configured(),
    start: async () => ({ kind: 'unavailable', message: 'Coins in the iPhone app are bought through the App Store.' }),
    verify: async () => { throw badRequest('App Store purchases go to /api/payments/apple/verify'); },
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

/**
 * A season pass as a store product, or null: { id, coins: 0, amountCents, currency, seasonKey,
 * name, keep: true } (kept, never consumed: Google Play acknowledges it).
 */
async function passProduct(db, productId) {
  const season = await seasons.byPassProduct(db, productId);
  if (!season) return null;
  return { id: season.pass_product_id, coins: 0, amountCents: season.price_cents, currency: season.currency, seasonKey: season.key, name: season.pass_name, keep: true, season };
}

/**
 * Adds a paid payment's coins, once. Returns the player's new coin balance (or null if it was
 * already granted). A season pass payment gives the pass instead: → 'pass-granted' or
 * 'pass-already-held' (a second pass paid for: flagged in the audit log for a refund).
 */
async function grant(client, paymentId, providerRef = null) {
  const { rows: [pay] } = await client.query(
    `UPDATE payments SET status = 'paid', paid_at = now(), provider_ref = COALESCE($2, provider_ref)
      WHERE id = $1 AND status = 'pending' RETURNING id, user_id, coins, product_id, season_key, provider, order_no`,
    [paymentId, providerRef],
  );
  if (!pay) return null;
  if (pay.season_key) return `pass-${await seasons.grantForPayment(client, pay)}`;
  const done = await economy.change(client, { userId: pay.user_id, amount: pay.coins, kind: 'coin-pack', paymentId: pay.id, note: pay.product_id });
  return done.balance;
}

/** The consent a player gave at checkout, stored with the payment (EU withdrawal-right waiver + terms). */
const CONSENT_TEXT = `[${consent.version}] ${consent.withdrawal} / ${consent.terms}`;
/** …and for the season pass. */
/** The pass's consent as stored with the payment: in its pre-sale (before the season starts), the "activates on 1 December" one. */
const passConsentText = (season, now = new Date()) => `[${consent.version}] ${seasons.stateOf(season, now) === 'before'
  ? consent.passPreSaleWithdrawal.replace('{activates}', seasons.activatesText(season))
  : consent.passWithdrawal} / ${consent.terms}`;

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

/**
 * Starts buying a season's pass on the website (Stripe; the test provider in development). Real
 * money only. Refused when the pass isn't on sale (before its sale starts or after the season's
 * end: 409 / 410) or when the player already has it (409). The pass comes only from Stripe's webhook.
 */
async function passCheckout(client, userId, { seasonKey, provider: providerName = 'stripe', consent: agreed, locale, siteUrl = null, now = new Date() }) {
  const season = await seasons.byKey(client, seasonKey);
  if (!season?.pass_product_id) throw notFound('No such season pass');
  if (!seasons.passOnSale(season, now)) {
    const ended = !seasons.passOnSale(season, now, { early: true });
    // Before the sale starts: only a tester (PASS_TESTERS), and only with Stripe in test mode (no real money).
    const testerEarly = !ended && providerName === 'stripe' && stripe.mode() === 'test' && await seasons.isPassTester(client, userId);
    if (!testerEarly) throw new HttpError(ended ? 410 : 409, ended ? `The ${season.pass_name} is no longer sold` : `The ${season.pass_name} goes on sale on ${new Intl.DateTimeFormat('en-GB', { timeZone: season.time_zone, day: 'numeric', month: 'long' }).format(new Date(season.pass_sale_starts_at))}`);
  }
  if (await seasons.hasPass(client, userId, season.key)) throw conflict(`You already have the ${season.pass_name}`);
  const provider = PROVIDERS[providerName];
  if (!provider || provider.name === 'google' || provider.name === 'apple') throw badRequest('The pass is bought on the website here; in the apps, through the store');
  if (!provider.configured()) return { payment: null, next: await provider.start(null, {}) };
  const user = await client.query('SELECT is_guest, email FROM users WHERE id = $1', [userId]).then((r) => r.rows[0]);
  if (!user || user.is_guest) throw new HttpError(401, 'Make an account first, so your pass stays yours on every device');
  if (agreed !== true) throw badRequest('Please agree to immediate delivery and the terms of sale first');
  const item = await passProduct(client, season.pass_product_id);
  const { rows: [payment] } = await client.query(
    `INSERT INTO payments (user_id, provider, product_id, coins, amount_cents, currency, order_no, consent_at, consent_text, season_key)
     VALUES ($1, $2, $3, 0, $4, $5, 'MS-' || nextval('payment_order_seq'), now(), $6, $7)
     RETURNING id, user_id, order_no, status, product_id, coins, amount_cents, currency, season_key`,
    [userId, provider.name, item.id, item.amountCents, item.currency, passConsentText(season, now), season.key],
  );
  const next = await provider.start(payment, { userId, pack: item, email: user.email, locale, siteUrl });
  if (next.kind === 'done') {
    const pass = await grant(client, payment.id, `test-${payment.id}`);
    return { payment: { order_no: payment.order_no, status: 'paid', product_id: payment.product_id }, next, pass };
  }
  if (next.sessionId) await client.query('UPDATE payments SET stripe_session_id = $2 WHERE id = $1', [payment.id, next.sessionId]);
  const { sessionId, ...shown } = next;
  return { payment: { order_no: payment.order_no, status: payment.status, product_id: payment.product_id }, next: shown };
}

// What a player sees of their own orders (Purchases page).
const ORDER_COLUMNS = `order_no, provider, product_id, season_key, coins, amount_cents, upper(currency) AS currency, charged_cents, charged_currency,
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
  return google.redeem(db, { userId, productId, purchaseToken }, { grant, product: async (id) => PACKS.get(id) ?? (await passProduct(db, id)) ?? pack(id) });
}

/** The player's App Store account token (the iPhone app buys with it as StoreKit's appAccountToken). */
const appleAccountToken = (db, userId) => apple.accountTokenFor(db, userId);

/** An App Store purchase from the iPhone app: Apple's signature checked, then the coins (or the pass) once. */
function applePurchase(db, { userId, signedTransaction }) {
  if (!apple.configured()) throw new HttpError(503, 'App Store purchases are not connected yet');
  return apple.redeem(db, { userId, signedTransaction }, { grant, product: async (id) => PACKS.get(id) ?? (await passProduct(db, id)) ?? pack(id) });
}

/** An App Store Server Notification (v2): refunds and revocations take the coins (or the pass) back. */
function appleNotification(db, signedPayload) {
  return apple.notification(db, signedPayload, { revoke: stripe.revoke });
}

/** Google's refunds and chargebacks (voided purchases) taken back, and purchases not yet consumed consumed. */
async function googleSync(db) {
  if (!google.configured()) return { revoked: 0, consumed: 0 };
  const consumed = await google.consumeLeftovers(db) + await google.acknowledgeLeftovers(db);
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
      else { await google.consumeLeftovers(db); await google.acknowledgeLeftovers(db); }
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

module.exports = { PROVIDERS, PACKS, CONSENT_TEXT, available, checkout, passCheckout, passProduct, grant, redeemReceipt, ordersOf, orderOf, stripeEvent, refund, googleAccountId, googlePurchase, appleAccountToken, applePurchase, appleNotification, googleSync, startGoogleJobs, pack };
