'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const db = require('./db');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { VERSION } = require('./version');

function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin, credentials: config.corsOrigin !== '*' }));
  // Stripe's webhook needs the exact bytes it signed, so it comes before the JSON parser.
  app.post('/api/payments/stripe/webhook', express.raw({ type: '*/*', limit: '1mb' }), require('./routes/payments').stripeWebhook);
  // The Help Centre's contact form carries a screenshot, so it reads its own (larger) body.
  app.use('/api/support', require('./routes/support'));
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', async (_req, res) => {
    try {
      await db.query('SELECT 1');
      res.json({ status: 'ok', db: 'ok', uptime: process.uptime(), version: VERSION });
    } catch {
      res.status(503).json({ status: 'degraded', db: 'unreachable', version: VERSION });
    }
  });

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/users', require('./routes/users'));
  app.use('/api/races', require('./routes/races'));
  app.use('/api/rooms', require('./routes/rooms'));
  app.use('/api/leagues', require('./routes/leagues'));
  // The back office: every request checked for an admin account, the 2-step login and a live session.
  app.use('/api/admin', require('./routes/admin'));
  app.use('/api/tracks', require('./routes/tracks'));
  app.use('/api/marbles', require('./routes/marbles'));
  app.use('/api/collection', require('./routes/collection'));
  app.use('/api/payments', require('./routes/payments'));
  app.use('/api/scoreboard', require('./routes/scoreboard'));
  app.use('/api/seasons', require('./routes/seasons'));
  app.use('/api/gift-codes', require('./routes/giftCodes'));
  app.use('/api/push', require('./routes/push'));
  app.use('/api/economy', require('./routes/economy'));
  app.use('/api/appearance', require('./routes/appearance'));
  app.use('/api/physics', require('./routes/physics'));
  app.use('/api/billboards', require('./routes/billboards'));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
