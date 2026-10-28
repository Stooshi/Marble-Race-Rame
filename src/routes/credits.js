'use strict';

/**
 * Credits (Leagues part 2, src/credits; behind LEAGUES_PRO: off, every address here answers 404).
 *
 *   GET  /api/credits          the wallet: credits, the Pro pass (running or waiting), the latest credits
 *                              changes, the prices, the credit packs and when a pass bought now would start
 *   POST /api/credits/swap     { credits, confirm: true } credits into coins, one way (1,000 coins each);
 *                              the player has seen "Swapped credits can't be refunded"
 *   POST /api/credits/pass     { confirm: true } the 30-day Pro pass for 5 credits (queued after a running one)
 *
 * Credit packs are bought with POST /api/payments/checkout (productId credits-5 / -10 / -25) on the
 * website, and through the stores in the apps.
 */
const express = require('express');
const config = require('../config');
const db = require('../db');
const credits = require('../credits');
const pro = require('../leagues/pro');
const payments = require('../payments');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../utils/validate');
const { HttpError, badRequest, notFound } = require('../utils/httpError');

const router = express.Router();

const rateLimit = require('express-rate-limit');
const spendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: config.isTest ? 1000 : 30,
  keyGenerator: (req) => req.user?.id ?? rateLimit.ipKeyGenerator(req.ip ?? ''),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'That\'s a lot at once. Try again in a few minutes.' },
});

/** Pro Leagues and credits open to this player, or 404 (switched off, the API isn't there). */
const open = (req, _res, next) => { if (!pro.openFor(req.user)) throw notFound('Not found'); next(); };

/** Saved accounts only (credits are bought with real money and must stay the player's on every device). */
async function saved(userId) {
  const { rows: [u] } = await db.query('SELECT is_guest FROM users WHERE id = $1 AND deleted_at IS NULL', [userId]);
  if (!u || u.is_guest) throw new HttpError(401, 'Save your marble first, so your credits stay yours on every device', { code: 'save_first' });
}

async function wallet(userId) {
  const [s, { rows: [u] }] = await Promise.all([
    credits.summary(db, userId),
    db.query('SELECT coins FROM users WHERE id = $1', [userId]),
  ]);
  return { ...s, coins: u?.coins ?? 0, packs: [...payments.CREDIT_PACKS.values()].map(({ coins, ...p }) => p), serverNow: new Date().toISOString() };
}

router.get('/', requireAuth, open, async (req, res) => {
  res.json(await wallet(req.user.id));
});

router.post('/swap', requireAuth, open, spendLimiter, async (req, res) => {
  const body = validate(req.body ?? {}, { credits: { type: 'int', required: true }, confirm: { type: 'boolean' } });
  if (body.confirm !== true) throw badRequest('Confirm the swap first: swapped credits can\'t be refunded');
  await saved(req.user.id);
  await db.withTransaction(async (client) => {
    await client.query('SELECT 1 FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
    return credits.swapToCoins(client, req.user.id, body.credits);
  });
  res.json(await wallet(req.user.id));
});

router.post('/pass', requireAuth, open, spendLimiter, async (req, res) => {
  const body = validate(req.body ?? {}, { confirm: { type: 'boolean' } });
  if (body.confirm !== true) throw badRequest(`Confirm first: the Pro pass costs ${credits.PRO_PASS} credits`);
  await saved(req.user.id);
  const { pass } = await db.withTransaction((client) => credits.buyPass(client, req.user.id));
  res.json({ ...(await wallet(req.user.id)), bought: pass });
});

module.exports = router;
