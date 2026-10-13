'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { validate } = require('../utils/validate');
const collection = require('../marbles/collection');

const router = express.Router();
const SLUG = { type: 'string', pattern: /^[a-z0-9-]{2,64}$/, patternMessage: 'must be a marble slug' };

/** GET /api/collection — every item with live First Edition counts (+ `owned` slugs when signed in). */
router.get('/', optionalAuth, async (req, res) => {
  const list = await collection.listItems(db);
  let owned = null;
  if (req.user) {
    const { rows } = await db.query('SELECT item_slug FROM user_collection WHERE user_id = $1', [req.user.id]);
    owned = rows.map((r) => r.item_slug);
  }
  res.json({ items: list, owned });
});

/** GET /api/collection/bag — the signed-in player's Marble Bag. */
router.get('/bag', requireAuth, async (req, res) => {
  res.json(await collection.bag(db, req.user.id));
});

/** PUT /api/collection/shooter { item } | { original } — the look the player races in. */
router.put('/shooter', requireAuth, async (req, res) => {
  const body = validate(req.body, { item: SLUG, original: { type: 'uuid' } });
  res.json({ shooter: await collection.setShooter(db, req.user.id, body) });
});

/** GET /api/collection/bags?shade= — the bags in one shade (Classic if none), what's in them and their price for you. */
router.get('/bags', optionalAuth, async (req, res) => {
  const { shade = 'classic' } = validate(req.query, { shade: { type: 'string', pattern: /^[a-z]{2,20}$/, patternMessage: 'must be a shade' } });
  let owned = new Set();
  if (req.user) {
    const { rows } = await db.query('SELECT item_slug FROM user_collection WHERE user_id = $1', [req.user.id]);
    owned = new Set(rows.map((r) => r.item_slug));
  }
  res.json({ bags: ['starter', 'full'].map((b) => collection.bagOffer(b, shade, owned)) });
});

/** POST /api/collection/bags/:bag/buy { shade } — buy a bag: every marble in it in one shade (default Classic). */
router.post('/bags/:bag/buy', requireAuth, async (req, res) => {
  const { bag } = validate(req.params, { bag: { type: 'enum', values: ['starter', 'full'], required: true } });
  const { shade = 'classic' } = validate(req.body ?? {}, { shade: { type: 'string', pattern: /^[a-z]{2,20}$/, patternMessage: 'must be a shade' } });
  res.status(201).json(await db.withTransaction((client) => collection.buyBag(client, req.user.id, bag, shade)));
});

/** GET /api/collection/id/:id — the marble a Marble ID names: "SC105", "sc105", "SC 105" or "#SC105". */
router.get('/id/:id', (req, res) => {
  res.json({ item: collection.findById(decodeURIComponent(req.params.id)) });
});

/** POST /api/collection/:slug/buy — buy one copy with coins (or credits for a limited edition). */
router.post('/:slug/buy', requireAuth, async (req, res) => {
  const { slug } = validate(req.params, { slug: { ...SLUG, required: true } });
  const result = await db.withTransaction((client) => collection.buy(client, req.user.id, slug));
  res.status(201).json(result);
});

/** GET /api/collection/certificate/:code — a marble's certificate, public (shareable). */
router.get('/certificate/:code', async (req, res) => {
  const { code } = validate(req.params, { code: { type: 'string', required: true, pattern: /^([A-Z]{2}\d{3}|MS-[A-Z0-9]{3}-[A-Z0-9]{3})-G?\d{5,6}$/ } });
  res.json({ certificate: await collection.certificate(db, code) });
});

module.exports = router;
