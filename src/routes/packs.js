'use strict';

/**
 * Track packs in the shop (Moses, 12 Nov 2026; src/packs/sale.js). Sold only while pack locking is on for
 * the player (TRACK_PACKS: 'admins' for admin accounts, 'on' for everyone); otherwise the shop shows no
 * packs (onSale: false) and nothing is locked.
 *
 *   GET    /api/packs                     the packs: price, live tracks, wildness mix, owned, complete
 *   GET    /api/packs/:key                one pack's page: every live track with its one line, the planned ones
 *   POST   /api/packs/:key/coin-hold      the apps: set the coins aside before the store's sheet opens
 *   DELETE /api/packs/coin-holds/:id      …and give them back when it closes without a purchase
 * Buying on the website: POST /api/payments/pack/checkout (src/routes/payments.js).
 */
const express = require('express');
const db = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { validate } = require('../utils/validate');
const sale = require('../packs/sale');
const { badRequest } = require('../utils/httpError');

const router = express.Router();
const KEY = /^[a-z0-9-]{1,32}$/;
const who = (req) => ({ userId: req.user?.id ?? null, role: req.user?.role ?? null });

router.get('/', optionalAuth, async (req, res) => {
  res.json(await sale.shopPacks(db, who(req)));
});

router.get('/:key', optionalAuth, async (req, res) => {
  if (!KEY.test(req.params.key)) throw badRequest('Not a track pack');
  res.json(await sale.packPage(db, req.params.key, who(req)));
});

/** { test?: true } — a store test purchase (only an admin may buy a pack that isn't complete yet, and only as a test). */
router.post('/:key/coin-hold', requireAuth, async (req, res) => {
  if (!KEY.test(req.params.key)) throw badRequest('Not a track pack');
  const body = validate(req.body ?? {}, { test: { type: 'boolean' } });
  res.json(await sale.holdCoins(db, req.user.id, req.params.key, { test: body.test === true }));
});

router.delete('/coin-holds/:id', requireAuth, async (req, res) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) throw badRequest('Not a hold');
  const back = await db.withTransaction((client) => sale.releaseHold(client, { holdId: req.params.id, userId: req.user.id, why: 'the store\'s sheet was closed' }));
  res.json({ coinsBack: back });
});

module.exports = router;
