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
 *   POST   /api/seasons/reminders/confirm { token }  the confirmation email's link (double opt-in)
 *   POST   /api/seasons/reminders/cancel { token }   cancel with the reminder's own link (the email's)
 *   POST   /api/seasons/reminders/unsubscribe?t=      the same, for mail apps' one-click unsubscribe (RFC 8058)
 *   POST   /api/seasons/:key/remind/seen  a player closes the in-game "on sale now" notice
 * Sending (the confirmation and reminder emails, the in-game notice): src/seasons/reminderMail.js, off
 * until BREVO_API_KEY is set and PASS_REMINDERS_SENDING=on.
 */
const express = require('express');
const db = require('../db');
const { optionalAuth, requireAuth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const { validate } = require('../utils/validate');
const { notFound } = require('../utils/httpError');
const reminders = require('../seasons/reminders');
const reminderMail = require('../seasons/reminderMail');
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

router.post('/reminders/confirm', remindLimiter, async (req, res) => {
  const body = validate(req.body, { token: { type: 'string', required: true, max: 64 } });
  res.json({ confirmed: await reminders.confirm(db, body.token) });
});

router.post('/reminders/cancel', remindLimiter, async (req, res) => {
  const body = validate(req.body, { token: { type: 'string', required: true, max: 64 } });
  res.json({ cancelled: await reminders.cancelByToken(db, body.token) });
});

// (Mail apps post "List-Unsubscribe=One-Click" as a form; the token is in the address.)
router.post('/reminders/unsubscribe', remindLimiter, express.urlencoded({ extended: false }), async (req, res) => {
  await reminders.cancelByToken(db, String(req.query.t ?? '').slice(0, 64));
  res.json({ ok: true });
});

router.post('/:key/remind/seen', requireAuth, async (req, res) => {
  const season = await seasonOf(req.params.key);
  await reminderMail.noticeSeen(db, season.key, req.user.id);
  res.json({ ok: true });
});

router.post('/:key/remind', remindLimiter, optionalAuth, async (req, res) => {
  const body = validate(req.body, {
    email: { type: 'string', max: 254 },
    consent: { type: 'boolean' },
    email_too: { type: 'boolean' },
    lang: { type: 'string', max: 5 },
    website: { type: 'string', max: 500 }, // (the field people never see: a bot fills it)
  });
  const season = await seasonOf(req.params.key);
  const user = req.user
    ? (await db.query('SELECT id, email, is_guest, email_verified_at FROM users WHERE id = $1', [req.user.id])).rows[0] ?? null
    : null;
  // A bot: the same answer, nothing saved.
  if (body.website) return res.status(201).json({ reminder: { inGame: false, email: true, confirmed: false } });
  res.status(201).json(await reminders.remind(db, season, user, { email: body.email, consent: body.consent, emailToo: body.email_too, lang: body.lang }));
});

router.delete('/:key/remind', requireAuth, async (req, res) => {
  const season = await seasonOf(req.params.key);
  res.json({ cancelled: await reminders.cancelForPlayer(db, season, req.user.id) });
});

module.exports = router;
