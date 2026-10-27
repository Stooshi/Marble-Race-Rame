'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { expectedColumns, SCHEMA_PATH } = require('../src/db/migrate');

const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');

test('reads every table and its columns from the schema file', () => {
  const cols = expectedColumns(schema);
  assert.deepEqual(Object.keys(cols).sort(), ['admin_2fa', 'admin_audit', 'admin_sessions', 'billboards', 'coin_ledger', 'collection_counters', 'cookie_consents', 'data_updates', 'email_confirmations', 'email_consents', 'gift_code_redemptions', 'gift_codes', 'house_looks', 'league_members', 'league_nights', 'league_results', 'league_runs', 'leagues', 'marble_appearances', 'marble_colors', 'marble_effects', 'marble_surfaces', 'marbles', 'name_reports', 'pass_reminders', 'password_resets', 'payment_refunds', 'payments', 'push_devices', 'push_preferences', 'push_sends', 'race_entries', 'race_entry_looks', 'race_replays', 'races', 'rooms', 'season_passes', 'seasons', 'security_events', 'stripe_events', 'support_messages', 'support_replies', 'tracks', 'user_badges', 'user_collection', 'user_country_history', 'user_days', 'user_marbles', 'user_shooter', 'users']);
  assert.ok(cols.tracks.includes('physics'));
  assert.deepEqual(cols.billboards, ['id', 'track_slug', 'slot', 'image_url', 'kind', 'note', 'starts_at', 'ends_at', 'created_at']);
  assert.ok(cols.race_replays.includes('data'));
  assert.ok(cols.users.includes('password_hash'));
  assert.ok(cols.races.includes('track_snapshot'));
  assert.ok(cols.races.includes('room_id'));
  for (const c of ['order_no', 'consent_at', 'payment_intent', 'charged_cents', 'refunded_cents', 'receipt_url']) assert.ok(cols.payments.includes(c), c);
  assert.deepEqual(cols.rooms, ['id', 'code', 'host_id', 'track_id', 'current_race_id', 'status', 'created_at', 'last_active_at', 'is_public', 'kind', 'removed', 'league_night_id']);
  assert.ok(cols.race_entries.includes('split_time_ms'));
  for (const c of ['owner_id', 'starter_no', 'marble_code']) assert.ok(cols.marbles.includes(c), c); // (every player's own starters)
  for (const c of ['birth_month', 'email_verified_at']) assert.ok(cols.users.includes(c), c);
  assert.ok(cols.tracks.includes('season_key'));
  assert.ok(cols.payments.includes('season_key'));
  assert.deepEqual(cols.season_passes, ['id', 'user_id', 'season_key', 'payment_id', 'provider', 'granted_at', 'revoked_at', 'revoke_reason']);
  assert.deepEqual(cols.pass_reminders, ['id', 'season_key', 'user_id', 'email', 'email_wanted', 'consent_text', 'token', 'created_at', 'confirm_sent_at', 'confirmed_at', 'sent_at', 'cancelled_at', 'lang', 'notice_seen_at']);
  assert.deepEqual(cols.gift_codes, ['id', 'code', 'kind', 'coins', 'season_key', 'max_uses', 'uses', 'expires_at', 'tag', 'note', 'batch_id', 'created_by', 'created_at', 'disabled_at', 'disabled_by']);
  assert.deepEqual(cols.gift_code_redemptions, ['id', 'code_id', 'user_id', 'coins', 'season_pass_id', 'redeemed_at']);
  assert.deepEqual(cols.push_preferences, ['user_id', 'room_invites', 'season_news', 'daily_goal', 'season_news_at', 'updated_at']);
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

test('San Francisco is added by its own data update, with a full layout and a cable car', () => {
  const { OBSTACLE_EFFECTS } = require('../src/game/simulator');
  const sql = fs.readFileSync(require('path').join(__dirname, '..', 'docs', 'data_updates', '2026-10-05-add-san-francisco.sql'), 'utf8');
  assert.match(sql, /WHERE NOT EXISTS[\s\S]*t\.slug = v\.slug OR lower\(t\.name\) = lower\(v\.name\)/);
  assert.match(sql, /\('san-francisco', 'San Francisco'/);
  const [pts, obs] = [...sql.matchAll(/'(\[\{.*?\}\])'/g)].map((m) => JSON.parse(m[1]));
  assert.ok(pts.length >= 30);
  assert.ok(pts.every((p, i) => Number.isFinite(p.z) && (i === 0 || p.z <= pts[i - 1].z)), 'downhill all the way');
  assert.equal(pts.at(-1).z, 0);
  assert.ok(obs.every((o) => OBSTACLE_EFFECTS[o.type]), 'every obstacle type is one the race engine knows');
  assert.ok(obs.every((o, i) => i === 0 || obs[i - 1].at + obs[i - 1].span <= o.at + 1e-9), 'obstacles do not overlap');
  const car = obs.find((o) => o.type === 'cable_car');
  assert.ok(car && car.period > 0 && car.duty > 0, 'has a timed cable car');
  // The older data update must not be edited, or live servers would never re-run it.
  const old = fs.readFileSync(require('path').join(__dirname, '..', 'docs', 'data_updates', '2026-10-04-restore-marbles-tracks.sql'), 'utf8');
  assert.doesNotMatch(old, /san-francisco/);
});
