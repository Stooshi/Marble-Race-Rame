'use strict';

// Before the tests: bring the test database (ROOMS_TEST_DATABASE_URL) up to date, once, on its own.
// The test files run in parallel, each against that database; a schema run inside one of them
// (it drops and recreates the views, alters tables) would lock or break the others mid-test.
const DB = process.env.ROOMS_TEST_DATABASE_URL;
if (!DB) process.exit(0);
process.env.DATABASE_URL = DB;
const { migrate } = require('../../src/db/migrate');
const db = require('../../src/db');

migrate({ log: { info() {}, warn: console.warn, error: console.error } })
  .then((r) => { if (r && r.ok === false) throw new Error('migration failed'); })
  .catch((err) => { console.error(`[test-db] ${err.message}`); process.exitCode = 1; })
  .finally(() => db.pool?.end?.());
