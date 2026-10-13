'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { assertUuid } = require('../utils/validate');
const economy = require('../economy');
const { PACKS } = require('../payments');

const router = express.Router();

/** GET /api/economy — the coin economy's numbers (what races pay, the daily goal, the daily limit, bags) and the coin packs. */
router.get('/', (req, res) => {
  res.json({ ...economy.economy, coinPacks: [...PACKS.values()] });
});

/** GET /api/economy/me — today's races, the daily goal, the streak and the balances. */
router.get('/me', requireAuth, async (req, res) => {
  res.json(await economy.today(db, req.user.id));
});

/** GET /api/economy/races/:id — what the signed-in player earned in one race, line by line. */
router.get('/races/:id', requireAuth, async (req, res) => {
  const id = assertUuid(req.params.id);
  const { rows } = await db.query(
    `SELECT kind, amount, note FROM coin_ledger WHERE user_id = $1 AND race_id = $2 AND amount > 0 ORDER BY id`,
    [req.user.id, id],
  );
  res.json({ lines: rows, total: rows.reduce((n, r) => n + r.amount, 0) });
});

/** GET /api/economy/ledger — the signed-in player's own coin history, newest first. */
router.get('/ledger', requireAuth, async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, amount, kind, race_id, item_slug, note, balance_after, created_at
       FROM coin_ledger WHERE user_id = $1 ORDER BY id DESC LIMIT 100`,
    [req.user.id],
  );
  res.json({ lines: rows });
});

module.exports = router;
