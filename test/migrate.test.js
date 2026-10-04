'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { expectedColumns, SCHEMA_PATH } = require('../src/db/migrate');

const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');

test('reads every table and its columns from the schema file', () => {
  const cols = expectedColumns(schema);
  assert.deepEqual(Object.keys(cols).sort(), ['data_updates', 'marble_appearances', 'marble_colors', 'marble_effects', 'marble_surfaces', 'marbles', 'race_entries', 'races', 'tracks', 'user_marbles', 'users']);
  assert.ok(cols.users.includes('password_hash'));
  assert.ok(cols.races.includes('track_snapshot'));
  assert.ok(cols.race_entries.includes('split_time_ms'));
  // Table-level constraints and their continuation lines are not columns.
  for (const list of Object.values(cols)) {
    for (const c of ['constraint', 'primary', 'min_marbles BETWEEN']) assert.ok(!list.includes(c));
  }
  assert.ok(!cols.races.includes('status IN'));
});

test('the schema file never deletes, truncates or updates stored rows', () => {
  const code = schema.replace(/--.*$/gm, '').replace(/ON COMMIT DROP/g, '');
  assert.doesNotMatch(code, /\bDELETE\s+FROM\b|\bTRUNCATE\b|\bDROP\s+TABLE\b|\bDROP\s+COLUMN\b|^\s*UPDATE\s/im);
  // Only views and triggers are dropped (and recreated).
  for (const [, what] of code.matchAll(/\bDROP\s+(\w+)/gi)) assert.match(what, /^(VIEW|TRIGGER)$/i);
});

test('seed rows are skipped when the slug or the name already exists', () => {
  const inserts = schema.match(/INSERT INTO (marbles|tracks)[\s\S]*?;/g);
  assert.equal(inserts.length, 2);
  for (const sql of inserts) assert.match(sql, /WHERE NOT EXISTS[\s\S]*slug = s\.slug OR lower\(\w+\.name\) = lower\(s\.name\)/);
});

test('the seed catalog has 22 marbles and three tracks with heights', () => {
  const marbles = schema.match(/CREATE TEMP TABLE seed_marbles[\s\S]*?\) AS v\(/)[0];
  assert.equal((marbles.match(/^\s{4}\('/gm) || []).length, 22);
  const tracks = schema.match(/CREATE TEMP TABLE seed_tracks[\s\S]*?\) AS v\(/)[0];
  for (const slug of ['meadow-loop', 'canyon-drop', 'volcano-run']) assert.match(tracks, new RegExp(`\\('${slug}'`));
  const layouts = [...tracks.matchAll(/'(\[\{"x".*?\])'/g)].map((m) => JSON.parse(m[1]));
  assert.equal(layouts.length, 3);
  for (const pts of layouts) {
    assert.ok(pts.length >= 20);
    assert.ok(pts.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z) && p.z >= 0));
    assert.equal(pts.at(-1).z, 0, 'the finish line is the lowest point');
  }
});
