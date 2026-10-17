'use strict';

/**
 * Seasons (src/seasons):
 *   GET /api/seasons            every season as the player sees it: dates, state, today's Track of
 *                               the Day, the pass (price, on sale, "ends in N days", owned)
 *   GET /api/seasons/:key       one season
 */
const express = require('express');
const db = require('../db');
const { optionalAuth } = require('../middleware/auth');
const { notFound } = require('../utils/httpError');
const seasons = require('../seasons');

const router = express.Router();

router.get('/', optionalAuth, async (req, res) => {
  const all = await seasons.all(db);
  res.json({ seasons: await Promise.all(all.map((s) => seasons.view(db, s, req.user?.id ?? null))) });
});

router.get('/:key', optionalAuth, async (req, res) => {
  const season = await seasons.byKey(db, String(req.params.key).slice(0, 32));
  if (!season) throw notFound('No such season');
  res.json({ season: await seasons.view(db, season, req.user?.id ?? null) });
});

module.exports = router;
