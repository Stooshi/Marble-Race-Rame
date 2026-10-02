'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const config = require('./config');
const db = require('./db');
const { createApp } = require('./app');
const { createSocketServer } = require('./sockets');
const raceManager = require('./game/raceManager');

async function runMigrations() {
  const { rows } = await db.query("SELECT to_regclass('public.races') AS exists");
  if (rows[0].exists) {
    console.log('Database tables already exist, skipping schema setup');
    return;
  }
  const schemaPath = path.join(__dirname, '..', 'docs', 'database_schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  
  // Split by semicolon and filter out empty statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  console.log(`Creating database tables from database_schema.sql (${statements.length} statements)...`);
  for (const stmt of statements) {
    await db.query(stmt);
  }
  console.log('Database tables created');
}

async function start() {
  const app = createApp();
  const server = http.createServer(app);
  const io = createSocketServer(server);

  await db.query('SELECT 1'); // fail fast if the database is unreachable
  await runMigrations();
  await raceManager.recover();
  raceManager.startScheduler();

  await new Promise((resolve) => server.listen(config.port, resolve));
  console.log(`Marble Race backend listening on :${server.address().port} (${config.env})`);

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received, shutting down`);
    // In-flight races are recovered from the database on the next boot.
    raceManager.shutdown();
    io.close(); // also closes the underlying HTTP server
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
