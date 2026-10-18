'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../utils/validate');
const payments = require('../payments');
const stripe = require('../payments/stripe');
const google = require('../payments/google');
const apple = require('../payments/apple');

const security = require('../security');
const config = require('../config');
const router = express.Router();
const PROVIDER = { type: 'enum', values: ['stripe', 'apple', 'google', 'test'], required: true };

/** GET /api/payments — the coin packs and which payment providers are live. */
router.get('/', (req, res) => {
  res.json({ packs: [...payments.PACKS.values()], providers: payments.available(), stripeMode: stripe.mode() === 'live' ? 'live' : stripe.configured() ? 'test' : 'off' });
});

/** POST /api/payments/checkout { productId, provider, consent: true } — start buying a coin pack. */
router.post('/checkout', requireAuth, async (req, res) => {
  const body = validate(req.body, { productId: { type: 'string', required: true, max: 32 }, provider: PROVIDER, consent: { type: 'boolean' }, locale: { type: 'string', max: 12 } });
  // Stripe sends the player back to the address they bought from (www or not, or the Vercel address),
  // where they're logged in — but only to one of the site's own addresses.
  const origin = req.get('origin');
  const siteUrl = config.isSiteOrigin(origin) ? origin.replace(/\/+$/, '') : null;
  const out = await db.withTransaction((client) => payments.checkout(client, req.user.id, { ...body, siteUrl }));
  await security.record(req, req.user.id, 'purchase');
  res.json(out);
});

/**
 * POST /api/payments/pass/checkout { season, provider, consent: true } — start buying a season pass
 * (real money only). The pass comes from Stripe's webhook; refused outside its sale window or when
 * the player has it already.
 */
router.post('/pass/checkout', requireAuth, async (req, res) => {
  const body = validate(req.body, { season: { type: 'string', required: true, max: 32 }, provider: { ...PROVIDER, required: false }, consent: { type: 'boolean' }, locale: { type: 'string', max: 12 } });
  const origin = req.get('origin');
  const siteUrl = config.isSiteOrigin(origin) ? origin.replace(/\/+$/, '') : null;
  const out = await db.withTransaction((client) => payments.passCheckout(client, req.user.id, { seasonKey: body.season, provider: body.provider ?? 'stripe', consent: body.consent, locale: body.locale, siteUrl }));
  await security.record(req, req.user.id, 'purchase');
  res.json(out);
});

/** POST /api/payments/receipt { provider: 'apple'|'google', receipt } — an app's store purchase. */
router.post('/receipt', requireAuth, async (req, res) => {
  const body = validate(req.body, { provider: PROVIDER, receipt: { type: 'string', required: true, max: 20000 } });
  const out = await db.withTransaction((client) => payments.redeemReceipt(client, req.user.id, body));
  await security.record(req, req.user.id, 'purchase');
  res.json(out);
});

/**
 * GET /api/payments/google/account — the player's account id for Google Play (the Android app buys
 * with it as Google's obfuscatedAccountId, so a purchase can only ever be credited to this player).
 */
router.get('/google/account', requireAuth, async (req, res) => {
  res.json({ accountId: await payments.googleAccountId(db, req.user.id), live: google.configured(), packageName: google.packageName() });
});

/**
 * POST /api/payments/google/verify { productId, purchaseToken } — a Google Play purchase from the
 * Android app: checked with Google, then the coins (or the season pass) added once (also safe to
 * send again). → { status: 'paid'|'duplicate'|'pending'|'cancelled'|'not-on-sale'|'already-owned', coins?, pass?, orderNo? }
 */
router.post('/google/verify', requireAuth, async (req, res) => {
  const body = validate(req.body, { productId: { type: 'string', required: true, max: 32 }, purchaseToken: { type: 'string', required: true, max: 2000 } });
  const out = await payments.googlePurchase(db, { userId: req.user.id, productId: body.productId, purchaseToken: body.purchaseToken });
  if (out.status === 'paid') await security.record(req, req.user.id, 'purchase');
  const { paymentId, ...shown } = out;
  res.json(shown);
});

/**
 * POST /api/payments/google/rtdn?token=… — Google Play's real-time developer notifications (a
 * Pub/Sub push subscription). Only a nudge: a voided purchase starts a check with Google's Voided
 * Purchases API; a bought one is checked with Google like the app's own report (for when the app
 * was closed before it could send it). Answers 2xx once handled; Pub/Sub retries otherwise.
 */
router.post('/google/rtdn', async (req, res) => {
  if (!google.rtdnTokenOk(req.query.token)) return res.status(403).json({ error: 'Forbidden' });
  const n = google.decodeRtdn(req.body);
  if (!n || (n.packageName && n.packageName !== google.packageName())) return res.status(204).end();
  if (n.testNotification) { console.log('[google-play] test notification received'); return res.status(204).end(); }
  try {
    if (n.voidedPurchaseNotification) await payments.googleSync(db);
    const o = n.oneTimeProductNotification;
    if (o && Number(o.notificationType) === 1 && o.sku && o.purchaseToken) {
      const out = await payments.googlePurchase(db, { productId: o.sku, purchaseToken: o.purchaseToken });
      if (out.status === 'paid') console.log(`[google-play] ${out.orderNo} credited from Google's notification`);
    }
  } catch (err) {
    // Our own "no" (unknown product, someone else's purchase…) is final: don't make Pub/Sub retry it.
    if (err.status && err.status < 500) { console.error(`[google-play] notification: ${err.message}`); return res.status(204).end(); }
    throw err;
  }
  return res.status(204).end();
});

/**
 * GET /api/payments/apple/account — the player's App Store account token (the iPhone app buys with
 * it as StoreKit's appAccountToken, so a purchase can only ever be credited to this player).
 */
router.get('/apple/account', requireAuth, async (req, res) => {
  res.json({ accountToken: await payments.appleAccountToken(db, req.user.id), live: apple.configured(), bundleId: apple.bundleId() });
});

/**
 * POST /api/payments/apple/verify { signedTransaction } — an App Store purchase from the iPhone app
 * (StoreKit 2's jwsRepresentation): Apple's signature checked, then the coins (or the season pass)
 * added once (also safe to send again). The app finishes the transaction when `finish` is true.
 * → { status: 'paid'|'duplicate'|'revoked'|'not-on-sale'|'already-owned', coins?, pass?, orderNo?, finish }
 */
router.post('/apple/verify', requireAuth, async (req, res) => {
  const body = validate(req.body, { signedTransaction: { type: 'string', required: true, max: 20000 } });
  const out = await payments.applePurchase(db, { userId: req.user.id, signedTransaction: body.signedTransaction });
  if (out.status === 'paid') await security.record(req, req.user.id, 'purchase');
  const { paymentId, ...shown } = out;
  res.json(shown);
});

/**
 * POST /api/payments/apple/notifications { signedPayload } — App Store Server Notifications v2
 * (set as the server URL in App Store Connect). Signed by Apple; refunds and revocations take the
 * coins or the pass back. Answers 200 once handled (Apple retries otherwise).
 */
router.post('/apple/notifications', async (req, res) => {
  const signed = typeof req.body?.signedPayload === 'string' ? req.body.signedPayload : null;
  if (!signed) return res.status(400).json({ error: 'No signed payload' });
  const outcome = await payments.appleNotification(db, signed);
  if (outcome !== 'ignored') console.log(`[app-store] notification: ${outcome}`);
  return res.json({ received: true });
});

/** GET /api/payments/mine — the player's orders (the Purchases page). */
router.get('/mine', requireAuth, async (req, res) => {
  res.json({ orders: await payments.ordersOf(db, req.user.id) });
});

/** GET /api/payments/orders/:orderNo — one order (polled after Stripe sends the player back). */
router.get('/orders/:orderNo', requireAuth, async (req, res) => {
  res.json({ order: await payments.orderOf(db, req.user.id, String(req.params.orderNo).slice(0, 16)) });
});

/**
 * POST /api/payments/stripe/webhook — Stripe's messages (paid, expired, refunded, disputed).
 * Mounted in app.js before the JSON parser: the signature is checked against the raw body.
 */
async function stripeWebhook(req, res) {
  const event = stripe.verify(req.body, req.get('stripe-signature'));
  const outcome = await payments.stripeEvent(db, event);
  if (outcome !== 'ignored' && outcome !== 'duplicate') console.log(`[stripe] ${event.type} ${event.id}: ${outcome}`);
  res.json({ received: true, outcome });
}

module.exports = router;
module.exports.stripeWebhook = stripeWebhook;
