'use strict';

const { Pool } = require('pg');
const config = require('../config');

// BIGINT (int8) columns come back as strings by default; race seeds fit in a
// JS number (we keep them below 2^53) so parse them for convenience.
require('pg').types.setTypeParser(20, (value) => Number.parseInt(value, 10));

const pool = new Pool({
  connectionString: config.db.connectionString,
  ssl: config.db.ssl,
  max: config.db.max,
});

pool.on('error', (err) => {
  console.error('[db] idle client error', err);
});

function query(text, params) {
  return pool.query(text, params);
}

/**
 * Runs `fn(client)` inside a transaction. Commits on success, rolls back and
 * re-throws on failure.
 */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
