'use strict';

/**
 * The Help Centre's contact form (/help#contact). Mounted before the app's 1 MB JSON parser,
 * because a message may carry a screenshot (at most 4 MB, sent as a data URL).
 *
 *   GET  /api/support/form   → { token, categories, limits }   a fresh form token (see src/support)
 *   POST /api/support        { token, name, email, category, order_no?, message, screenshot?, website }
 *                            → 201 { ref }   logged in or not; linked to the player's account
 *
 * "website" is the hidden field people never fill: when it is, or the form came back faster than a
 * person can type, the answer looks the same but nothing is saved.
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const { validate } = require('../utils/validate');
const { badRequest } = require('../utils/httpError');
const { optionalAuth } = require('../middleware/auth');
const support = require('../support');

const router = express.Router();
const { limits, categories } = support.settings;

const sendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: config.isTest ? 1000 : 6,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many messages from here. Please try again in an hour, or email us.' },
});

const schema = {
  token: { type: 'string', max: 200 },
  name: { type: 'string', required: true, max: limits.name },
  email: { type: 'string', required: true, max: limits.email, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, patternMessage: 'must be a valid email' },
  category: { type: 'enum', required: true, values: categories },
  order_no: { type: 'string', max: limits.orderNo },
  message: { type: 'string', required: true, min: limits.messageMin, max: limits.messageMax },
  screenshot: { type: 'string', max: Math.ceil(limits.screenshotBytes * 1.4) },
  website: { type: 'string', max: 500 },
};

router.get('/form', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ token: support.formToken(), categories, limits });
});

router.post('/', sendLimiter, express.json({ limit: '7mb' }), optionalAuth, async (req, res) => {
  const body = validate(req.body, schema);
  const timing = support.checkFormToken(body.token);
  if (timing === 'stale') throw badRequest('This form has been open too long. Please send it again.', { token: 'expired' });
  // A bot: the same answer as a real message, nothing saved.
  if (body.website || timing === 'fast') return res.status(201).json({ ref: null });
  let screenshot = null;
  if (body.screenshot) {
    try {
      screenshot = support.readScreenshot(body.screenshot);
    } catch (err) {
      throw badRequest(err.message);
    }
  }
  const { token: _t, website: _w, screenshot: _s, ...fields } = body;
  const saved = await support.create(req, fields, { screenshot });
  res.status(201).json({ ref: saved.ref });
});

module.exports = router;
