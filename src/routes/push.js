'use strict';

/**
 * Push notifications in the apps (src/push):
 *   GET  /api/push/settings            the player's switches → { roomInvites, seasonNews, dailyGoal, seasonNewsAllowed, devices, sending }
 *   PUT  /api/push/settings            { roomInvites?, seasonNews?, dailyGoal? } (season news: saved accounts 13+ only)
 *   POST /api/push/devices             { token, platform: 'ios'|'android', appId?, appVersion? } this phone's push token
 *   POST /api/push/devices/forget      { token } logging out on this phone
 */
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../utils/validate');
const push = require('../push');

const router = express.Router();
router.use(requireAuth);

router.get('/settings', async (req, res) => {
  res.json({ ...(await push.preferencesOf(db, req.user.id)), sending: push.sendingOn() });
});

router.put('/settings', async (req, res) => {
  const body = validate(req.body, { roomInvites: { type: 'boolean' }, seasonNews: { type: 'boolean' }, dailyGoal: { type: 'boolean' } });
  res.json(await push.setPreferences(db, req.user.id, body));
});

router.post('/devices', async (req, res) => {
  const body = validate(req.body, {
    token: { type: 'string', required: true, min: 20, max: 4096, pattern: /^[A-Za-z0-9:_\-.]+$/ },
    platform: { type: 'enum', values: ['ios', 'android'], required: true },
    appId: { type: 'string', max: 64, pattern: /^[a-z0-9.]+$/ },
    appVersion: { type: 'string', max: 16 },
  });
  await push.registerDevice(db, req.user.id, body);
  res.status(204).end();
});

router.post('/devices/forget', async (req, res) => {
  const body = validate(req.body, { token: { type: 'string', required: true, max: 4096 } });
  await push.forgetDevice(db, req.user.id, body.token);
  res.status(204).end();
});

module.exports = router;
