'use strict';

/**
 * Gift codes for players (src/giftCodes), on the website's "Redeem a code" page:
 *   POST /api/gift-codes/redeem { code }   a saved account redeems a code → { kind, coins?, balance?, season?, code }
 *   GET  /api/gift-codes/mine              the player's redeemed codes → { codes: [{ code, kind, coins, season, redeemedAt, what }] }
 * Both answer 404 while gift codes are switched off (client/src/shared/giftCodes.json).
 * Redeeming is limited to 10 tries per 15 minutes per account and 30 per address, so codes can't be guessed.
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const config = require('../config');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../utils/validate');
const { notFound } = require('../utils/httpError');
const giftCodes = require('../giftCodes');

const router = express.Router();

router.use((_req, _res, next) => {
  if (!giftCodes.enabled()) throw notFound('Gift codes are not available yet');
  next();
});

const tooMany = { error: 'Too many tries. Please wait 15 minutes and try again.' };
const perAccount = rateLimit({ windowMs: 15 * 60 * 1000, limit: config.isTest ? 1000 : 10, keyGenerator: (req) => `u:${req.user.id}`, standardHeaders: 'draft-8', legacyHeaders: false, message: tooMany });
const perAddress = rateLimit({ windowMs: 15 * 60 * 1000, limit: config.isTest ? 1000 : 30, standardHeaders: 'draft-8', legacyHeaders: false, message: tooMany });

router.post('/redeem', perAddress, requireAuth, perAccount, async (req, res) => {
  const body = validate(req.body, { code: { type: 'string', required: true, max: 40 } });
  res.json(await giftCodes.redeem(db, req.user.id, body.code));
});

router.get('/mine', requireAuth, async (req, res) => {
  res.json({ codes: await giftCodes.mine(db, req.user.id) });
});

module.exports = router;
