'use strict';

const http = require('http');
const config = require('./config');
const db = require('./db');
const { createApp } = require('./app');
const { createSocketServer } = require('./sockets');
const raceManager = require('./game/raceManager');
const { migrate } = require('./db/migrate');

async function start() {
  const app = createApp();
  const server = http.createServer(app);
  const io = createSocketServer(server);

  await db.query('SELECT 1'); // fail fast if the database is unreachable
  // Create anything missing from docs/database_schema.sql. Safe on every boot.
  await migrate();
  await raceManager.recover();
  raceManager.startScheduler();

  await new Promise((resolve) => server.listen(config.port, resolve));
  console.log(`Marble Race backend listening on :${server.address().port} (${config.env})`);

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received, shutting down`);
    raceManager.shutdown();
    io.close();
    await db.pool.end().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  return { app, server, io };
}

if (require.main === module) {
  start().catch((err) => {
    console.error('Failed to start server', err);
    process.exit(1);
  });
}

module.exports = { start };
