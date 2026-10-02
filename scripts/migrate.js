'use strict';

// Applies docs/database_schema.sql to DATABASE_URL. Safe to run repeatedly.
const fs = require('fs');
const path = require('path');
const db = require('../src/db');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'docs', 'database_schema.sql'), 'utf8');
  try {
    await db.query(sql);
    console.log('Database schema applied.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await db.pool.end();
  }
})();
