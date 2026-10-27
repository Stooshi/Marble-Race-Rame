'use strict';

// Replays kept 30 days (Moses, 27 Oct 2026; src/game/replayRetention.js): results stay for ever; the
// replays something shows are kept longer. Against a real database when ROOMS_TEST_DATABASE_URL is set.
const test = require('node:test');
const assert = require('node:assert/strict');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
const retention = require('../src/game/replayRetention');

test('the switch: a dry run unless REPLAY_TRIM=on; 30 days; what is kept longer', () => {
  assert.equal(retention.mode({}), 'dry-run');
  assert.equal(retention.mode({ REPLAY_TRIM: 'yes' }), 'dry-run');
  assert.equal(retention.mode({ REPLAY_TRIM: ' On ' }), 'on');
  assert.equal(retention.KEEP_DAYS, 30);
  assert.equal(retention.KEEP_RECENT, 200);
  // (The certificate's race: each collection marble's first win.)
  assert.match(retention.KEEP_SQL, /race_entry_looks l JOIN race_entries e ON e\.id = l\.entry_id[\s\S]*finish_position = 1/);
});

test('old replays go, results stay; track, player and country records, and the latest races, are kept', { skip: !DB }, async () => {
  const db = require('../src/db');
  const raceService = require('../src/game/raceService');
  const { packReplay } = require('../src/game/replayPack');
  const stamp = Date.now().toString(36);
  try {
    // A track of the test's own, so its records are only these races.
    const { rows: [t] } = await db.query(
      `INSERT INTO tracks (slug, name, length_m, is_active) VALUES ($1, $1, 1000, false) RETURNING id`,
      [`retention-${stamp}`],
    );
    const { rows: marbles } = await db.query('SELECT id FROM marbles ORDER BY id LIMIT 3');
    const { rows: [u] } = await db.query(
      `INSERT INTO users (username, email, password_hash, is_guest, country) VALUES ($1, $2, 'x', false, 'SE') RETURNING id`,
      [`ret${stamp}`, `ret${stamp}@test.invalid`],
    );
    const { rows: [u2] } = await db.query(
      `INSERT INTO users (username, email, password_hash, is_guest) VALUES ($1, $2, 'x', false) RETURNING id`,
      [`ret2${stamp}`, `ret2${stamp}@test.invalid`],
    );
    const replay = packReplay({ durationMs: 30000, tickMs: 50, tickRateHz: 20, results: [], events: [], frames: [{ t: 0, p: [0] }], start: null, stats: {} });
    const race = async (daysAgo, entries) => {
      const { rows: [r] } = await db.query(
        `INSERT INTO races (track_id, name, status, seed, target_duration_ms, track_snapshot, decided_at, started_at, finished_at, created_at)
         VALUES ($1, 'r', 'finished', 1, 30000, '{"physics":{}}'::jsonb, now() - make_interval(days => $2), now() - make_interval(days => $2), now() - make_interval(days => $2), now() - make_interval(days => $2))
         RETURNING id`,
        [t.id, daysAgo],
      );
      for (const [k, e] of entries.entries()) {
        await db.query(
          'INSERT INTO race_entries (race_id, marble_id, user_id, is_bot, lane, finish_position, finish_time_ms) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [r.id, marbles[k].id, e.user ?? null, !e.user, k, k + 1, e.ms],
        );
      }
      await db.query('INSERT INTO race_replays (race_id, engine, data) VALUES ($1, $2, $3)', [r.id, 'test', replay]);
      return r.id;
    };
    const record = await race(40, [{ ms: 50000 }, { ms: 54000, user: u2.id }]); // a computer player's track record
    const human = await race(40, [{ ms: 52000, user: u.id }]); // the fastest player (and Sweden's record)
    const old = await race(40, [{ ms: 53000, user: u2.id }]); // nothing special: its replay goes
    const recent = await race(10, [{ ms: 60000, user: u2.id }]); // under 30 days

    const has = async (id) => (await db.query('SELECT 1 FROM race_replays WHERE race_id = $1', [id])).rowCount === 1;
    // (keepRecent 0 here: the test database's own latest races would otherwise keep these.)
    const dry = await retention.trimReplays(db, { dryRun: true, keepRecent: 0 });
    assert.ok(dry.due >= 1);
    assert.equal(dry.deleted, 0);
    assert.ok(await has(old));
    const done = await retention.trimReplays(db, { dryRun: false, keepRecent: 0 });
    assert.ok(done.deleted >= 1);
    assert.equal(await has(old), false);
    for (const id of [record, human, recent]) assert.ok(await has(id), id);
    // The results stay; watching it says the replay is no longer kept.
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM race_entries WHERE race_id = $1', [old])).rows[0].n, 1);
    await assert.rejects(raceService.loadRun(db, { id: old, physics: {}, status: 'finished' }, []), (e) => e.status === 410 && e.details?.code === 'replay_gone');
    // The latest races are kept whatever their age (the landing page's closest finish).
    const { rows: [n] } = await db.query('SELECT COUNT(*)::int AS n FROM race_replays');
    if (n.n <= retention.KEEP_RECENT) {
      const again = await retention.trimReplays(db, { dryRun: true });
      assert.equal(again.due, 0);
    }
  } finally {
    await db.query("DELETE FROM races WHERE track_id IN (SELECT id FROM tracks WHERE slug = $1)", [`retention-${stamp}`]);
    await db.query('DELETE FROM tracks WHERE slug = $1', [`retention-${stamp}`]);
    await db.query('DELETE FROM users WHERE username IN ($1, $2)', [`ret${stamp}`, `ret2${stamp}`]);
    await db.end?.();
  }
});
