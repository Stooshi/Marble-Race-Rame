'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { assertUuid } = require('../utils/validate');
const { badRequest } = require('../utils/httpError');
const economy = require('../economy');

const router = express.Router();

/** GET /api/economy — the coin economy's numbers (what races pay, the daily goal, streaks, coin packs, bags). */
router.get('/', (req, res) => {
  res.json(economy.economy);
});

/** GET /api/economy/me — today's races, the daily goal, the streak and the balances. */
router.get('/me', requireAuth, async (req, res) => {
  res.json(await economy.today(db, req.user.id));
});

/** GET /api/economy/races/:id — what the signed-in player earned in one race, line by line. */
router.get('/races/:id', requireAuth, async (req, res) => {
  const id = assertUuid(req.params.id);
  const { rows } = await db.query(
    `SELECT kind, amount, note FROM coin_ledger WHERE user_id = $1 AND race_id = $2 AND currency = 'coins' AND amount > 0 ORDER BY id`,
    [req.user.id, id],
  );
  res.json({ lines: rows, total: rows.reduce((n, r) => n + r.amount, 0) });
});

/** GET /api/economy/ledger — the signed-in player's own coin and credit history, newest first. */
router.get('/ledger', requireAuth, async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, currency, amount, kind, race_id, item_slug, note, balance_after, created_at
       FROM coin_ledger WHERE user_id = $1 ORDER BY id DESC LIMIT 100`,
    [req.user.id],
  );
  res.json({ lines: rows });
});

/** POST /api/economy/coin-packs/:id/buy — swap credits for a coin pack. */
router.post('/coin-packs/:id/buy', requireAuth, async (req, res) => {
  if (!/^[a-z0-9-]{2,32}$/.test(req.params.id)) throw badRequest('Unknown coin pack');
  res.status(201).json(await db.withTransaction((client) => economy.buyCoinPack(client, req.user.id, req.params.id)));
});

module.exports = router;
