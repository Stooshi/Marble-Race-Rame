'use strict';

/**
 * Seasons (src/seasons):
 *   GET /api/seasons            every season as the player sees it: dates, state, today's Track of
 *                               the Day, the pass (price, on sale, "ends in N days", owned)
 *   GET /api/seasons/:key       one season
 *   POST   /api/seasons/:key/remind   "Remind me when sales open" (before the pass's sale only; src/seasons/reminders.js):
 *                                     a player { email_too }: in the game, and by email if ticked; a visitor or
 *                                     a guest { email, consent: true }: by email. → { reminder: { inGame, email } }
 *   DELETE /api/seasons/:key/remind   a player cancels theirs
 *   POST   /api/seasons/reminders/cancel { token }   cancel with the reminder's own link (the email's)
 * Nothing is sent yet: the reminders are only collected.
 */
const express = require('express');
const db = require('../db');
const { optionalAuth, requireAuth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const { validate } = require('../utils/validate');
const { notFound } = require('../utils/httpError');
const reminders = require('../seasons/reminders');
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

// (At most 20 reminder requests an hour from one address without a login: the visitor form.)
const remindLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: config.isTest ? 1000 : 20,
  skip: (req) => /^bearer /i.test(req.headers.authorization ?? ''),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many reminder requests from here. Please try again in an hour.' },
});

const seasonOf = async (key) => {
  const season = await seasons.byKey(db, String(key).slice(0, 32));
  if (!season) throw notFound('No such season');
  return season;
};

router.post('/reminders/cancel', remindLimiter, async (req, res) => {
  const body = validate(req.body, { token: { type: 'string', required: true, max: 64 } });
  res.json({ cancelled: await reminders.cancelByToken(db, body.token) });
});

router.post('/:key/remind', remindLimiter, optionalAuth, async (req, res) => {
  const body = validate(req.body, {
    email: { type: 'string', max: 254 },
    consent: { type: 'boolean' },
    email_too: { type: 'boolean' },
    website: { type: 'string', max: 500 }, // (the field people never see: a bot fills it)
  });
  const season = await seasonOf(req.params.key);
  const user = req.user
    ? (await db.query('SELECT id, email, is_guest FROM users WHERE id = $1', [req.user.id])).rows[0] ?? null
    : null;
  // A bot: the same answer, nothing saved.
  if (body.website) return res.status(201).json({ reminder: { inGame: false, email: true } });
  res.status(201).json(await reminders.remind(db, season, user, { email: body.email, consent: body.consent, emailToo: body.email_too }));
});

router.delete('/:key/remind', requireAuth, async (req, res) => {
  const season = await seasonOf(req.params.key);
  res.json({ cancelled: await reminders.cancelForPlayer(db, season, req.user.id) });
});

module.exports = router;
