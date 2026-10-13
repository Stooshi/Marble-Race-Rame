'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../utils/validate');
const payments = require('../payments');

const router = express.Router();
const PROVIDER = { type: 'enum', values: ['stripe', 'apple', 'google', 'test'], required: true };

/** GET /api/payments — the coin packs and which payment providers are live. */
router.get('/', (req, res) => {
  res.json({ packs: [...payments.PACKS.values()], providers: payments.available() });
});

/** POST /api/payments/checkout { productId, provider } — start buying a coin pack. */
router.post('/checkout', requireAuth, async (req, res) => {
  const body = validate(req.body, { productId: { type: 'string', required: true, max: 32 }, provider: PROVIDER });
  res.json(await db.withTransaction((client) => payments.checkout(client, req.user.id, body)));
});

/** POST /api/payments/receipt { provider: 'apple'|'google', receipt } — an app's store purchase. */
router.post('/receipt', requireAuth, async (req, res) => {
  const body = validate(req.body, { provider: PROVIDER, receipt: { type: 'string', required: true, max: 20000 } });
  res.json(await db.withTransaction((client) => payments.redeemReceipt(client, req.user.id, body)));
});

/** POST /api/payments/stripe/webhook — Stripe's "paid" message (placeholder until there's an account). */
router.post('/stripe/webhook', (req, res) => {
  res.status(501).json({ error: 'Stripe is not connected yet' });
});

module.exports = router;
