'use strict';

/**
 * Database setup, run on every backend start.
 *
 * Applies docs/database_schema.sql — the single source of truth for the
 * schema and seed data — inside one transaction. The file is idempotent and
 * only ever adds missing things, so running it against a database that already
 * holds users, marbles and races changes none of their rows.
 *
 * Every line it logs starts with "[db-setup]" so it is easy to find in the
 * deploy logs. If applying the file fails, the transaction is rolled back (the
 * database is left exactly as it was), the error is logged, and the server
 * carries on with the existing database — unless the core tables are missing
 * entirely, in which case the server cannot run and startup fails.
 */

const fs = require('fs');
const path = require('path');
const db = require('./index');
const { RACE_STATUSES } = require('../game/raceStatus');

const SCHEMA_PATH = path.join(__dirname, '..', '..', 'docs', 'database_schema.sql');
const COUNTED_TABLES = ['users', 'marbles', 'tracks', 'user_marbles', 'races', 'race_entries'];
const CORE_TABLES = ['users', 'marbles', 'tracks', 'races', 'race_entries'];
const TAG = '[db-setup]';

/** Columns each table should have, read from the schema file's CREATE TABLE / ADD COLUMN statements. */
function expectedColumns(sql) {
  const tables = {};
  const createRe = /CREATE TABLE IF NOT EXISTS (\w+) \(\n([\s\S]*?)\n\);/g;
  for (const [, table, body] of sql.matchAll(createRe)) {
    tables[table] = body
      .split('\n')
      .map((line) => /^ {4}([a-z_][a-z0-9_]*)\s/.exec(line)?.[1])
      .filter((name) => name && !['constraint', 'primary', 'unique', 'check', 'foreign'].includes(name));
  }
  for (const [, table, column] of sql.matchAll(/ALTER TABLE (\w+)\s+ADD COLUMN IF NOT EXISTS (\w+)/g)) {
    tables[table] = [...new Set([...(tables[table] || []), column])];
  }
  return tables;
}

/** 1-based line number in the schema file for a Postgres error position (a character offset). */
function lineOf(sql, position) {
  const offset = Number(position);
  if (!offset) return null;
  return sql.slice(0, offset).split('\n').length;
}

async function tablesPresent(client) {
  const { rows } = await client.query(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
  );
  return new Set(rows.map((r) => r.table_name));
}

async function rowCounts(client) {
  const present = await tablesPresent(client);
  const counts = {};
  for (const table of COUNTED_TABLES) {
    if (!present.has(table)) continue;
    // Table names come from the fixed list above, never from input.
    const { rows } = await client.query(`SELECT COUNT(*)::int AS n FROM ${table}`);
    counts[table] = rows[0].n;
  }
  return counts;
}

/** Status values the database accepts (enum labels), or the values in use if the column isn't an enum. */
async function databaseStatuses(client) {
  const { rows: col } = await client.query(
    `SELECT data_type, udt_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'races' AND column_name = 'status'`,
  );
  if (!col[0]) return null;
  if (col[0].data_type === 'USER-DEFINED') {
    const { rows } = await client.query(
      `SELECT e.enumlabel AS v FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = $1 ORDER BY e.enumsortorder`,
      [col[0].udt_name],
    );
    return { kind: `enum ${col[0].udt_name}`, values: rows.map((r) => r.v) };
  }
  const { rows } = await client.query('SELECT DISTINCT status::text AS v FROM races ORDER BY 1');
  return { kind: `${col[0].data_type} column (values in use)`, values: rows.map((r) => r.v) };
}

async function report(client, sql, before, log) {
  const after = await rowCounts(client);
  const counts = COUNTED_TABLES.map((t) => {
    if (after[t] === undefined) return `${t} MISSING`;
    const added = after[t] - (before[t] ?? 0);
    return `${t} ${after[t]}${added > 0 ? ` (+${added})` : ''}`;
  });
  log.info(`${TAG} Rows: ${counts.join(', ')}`);

  const want = expectedColumns(sql);
  const { rows } = await client.query(
    `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`,
  );
  const have = new Set(rows.map((r) => `${r.table_name}.${r.column_name}`));
  const missing = Object.entries(want).flatMap(([t, cols]) => cols.map((c) => `${t}.${c}`)).filter((c) => !have.has(c));
  if (missing.length) log.warn(`${TAG} WARNING missing columns: ${missing.join(', ')}`);
  else log.info(`${TAG} Columns: all ${Object.values(want).flat().length} expected columns present`);

  const statuses = await databaseStatuses(client);
  if (!statuses) {
    log.warn(`${TAG} WARNING races.status column not found`);
  } else {
    const extra = statuses.values.filter((v) => !RACE_STATUSES.includes(v));
    const lacking = statuses.kind.startsWith('enum') ? RACE_STATUSES.filter((v) => !statuses.values.includes(v)) : [];
    const summary = `${statuses.values.join(', ') || '(none)'} [${statuses.kind}]`;
    if (extra.length || lacking.length) {
      log.warn(`${TAG} WARNING race statuses differ from the code: ${summary}`
        + `${extra.length ? `; not used by the code: ${extra.join(', ')}` : ''}`
        + `${lacking.length ? `; missing: ${lacking.join(', ')}` : ''}`);
    } else {
      log.info(`${TAG} Race statuses: ${summary} — match the code`);
    }
  }
  return { after, missing };
}

/**
 * Applies the schema file. Resolves with a summary; rejects only when the
 * database is unusable (core tables missing after a failed attempt).
 */
async function migrate({ log = console, schemaPath = SCHEMA_PATH } = {}) {
  const started = Date.now();
  const sql = fs.readFileSync(schemaPath, 'utf8');
  log.info(`${TAG} Applying ${path.relative(path.join(__dirname, '..', '..'), schemaPath)}`);

  const client = await db.pool.connect();
  try {
    const before = await rowCounts(client);
    try {
      await client.query('BEGIN');
      // Serialise concurrent boots (e.g. two instances during a deploy) and
      // give up rather than hang if a live query holds a table lock.
      await client.query("SET LOCAL lock_timeout = '15s'");
      await client.query("SELECT pg_advisory_xact_lock(hashtext('marble-race-schema'))");
      await client.query(sql);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      const line = lineOf(sql, err.position);
      log.error(`${TAG} FAILED, rolled back, no changes were made: ${err.message}`);
      log.error(`${TAG} Detail: code ${err.code || '?'}${line ? `, schema file line ${line}` : ''}${err.where ? `, ${err.where.split('\n')[0]}` : ''}`);
      const present = await tablesPresent(client);
      const absent = CORE_TABLES.filter((t) => !present.has(t));
      if (absent.length) {
        log.error(`${TAG} Core tables missing (${absent.join(', ')}); the server cannot start`);
        throw err;
      }
      log.warn(`${TAG} Continuing with the existing database`);
      await report(client, sql, before, log).catch(() => {});
      return { ok: false, error: err };
    }
    log.info(`${TAG} OK in ${Date.now() - started} ms`);
    const { after, missing } = await report(client, sql, before, log);
    return { ok: true, before, after, missing };
  } finally {
    client.release();
  }
}

module.exports = { migrate, expectedColumns, SCHEMA_PATH };
