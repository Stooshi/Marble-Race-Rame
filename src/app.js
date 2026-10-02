'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const db = require('./db');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin, credentials: config.corsOrigin !== '*' }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', async (_req, res) => {
    try {
      await db.query('SELECT 1');
      res.json({ status: 'ok', db: 'ok', uptime: process.uptime() });
    } catch {
      res.status(503).json({ status: 'degraded', db: 'unreachable' });
    }
  });

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/users', require('./routes/users'));
  app.use('/api/races', require('./routes/races'));
  app.use('/api/tracks', require('./routes/tracks'));
  app.use('/api/marbles', require('./routes/marbles'));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
