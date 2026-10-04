'use strict';

const express = require('express');
const { getOptions } = require('../game/appearance');

const router = express.Router();

/** GET /api/appearance/options — the curated colours, surfaces and effects players can pick */
router.get('/options', async (_req, res) => {
  res.json(await getOptions());
});

module.exports = router;
