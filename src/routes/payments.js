'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../utils/validate');
const payments = require('../payments');
const stripe = require('../payments/stripe');

const security = require('../security');
const router = express.Router();
const PROVIDER = { type: 'enum', values: ['stripe', 'apple', 'google', 'test'], required: true };

/** GET /api/payments — the coin packs and which payment providers are live. */
router.get('/', (req, res) => {
  res.json({ packs: [...payments.PACKS.values()], providers: payments.available(), stripeMode: stripe.mode() === 'live' ? 'live' : stripe.configured() ? 'test' : 'off' });
});

/** POST /api/payments/checkout { productId, provider, consent: true } — start buying a coin pack. */
router.post('/checkout', requireAuth, async (req, res) => {
  const body = validate(req.body, { productId: { type: 'string', required: true, max: 32 }, provider: PROVIDER, consent: { type: 'boolean' }, locale: { type: 'string', max: 12 } });
  const out = await db.withTransaction((client) => payments.checkout(client, req.user.id, body));
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
