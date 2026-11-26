'use strict';

// Applies docs/database_schema.sql to DATABASE_URL, exactly as the server
// does on startup. Safe to run repeatedly.
const db = require('../src/db');
const { migrate } = require('../src/db/migrate');

(async () => {
  try {
    const result = await migrate();
    if (!result.ok) process.exitCode = 1;
  } catch {
    process.exitCode = 1;
  } finally {
    await db.pool.end();
  }
})();
