'use strict';

// Records start again on a new layout (Moses, 6 Nov 2026; src/game/recordsSince.js, tracks.records_since):
// the track record, the country records and the players' personal bests on the track count only races
// since; past results stay, and the record replays of both layouts are kept. Against a real database
// when ROOMS_TEST_DATABASE_URL is set.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
const { counts } = require('../src/game/recordsSince');

test('the condition: every race counts until a track has records_since', () => {
  assert.equal(counts(), '(t.records_since IS NULL OR r.finished_at >= t.records_since)');
  assert.equal(counts('y', 'tr'), '(tr.records_since IS NULL OR y.finished_at >= tr.records_since)');
});

test('the SQL for a new layout sets records_since', () => {
  const { execFileSync } = require('node:child_process');
  const sql = execFileSync(process.execPath, [require.resolve('../scripts/physics-track-sql.js'), 'stockholm-marble-grand-prix', '--relayout', 'A test.'], { encoding: 'utf8', maxBuffer: 64e6 });
  assert.match(sql, /gets a new layout/);
  assert.match(sql, /records_since = now\(\),\n {7}physics = /);
  assert.match(sql, /WHERE slug = 'stockholm-marble-grand-prix';/);
});

test('a new layout: records and personal bests start again, results stay, both layouts\' record replays kept', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const records = require('../src/country/records');
  const raceService = require('../src/game/raceService');
  const retention = require('../src/game/replayRetention');
  const { packReplay } = require('../src/game/replayPack');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const run = crypto.randomBytes(3).toString('hex');
  const slug = `relayout-${run}`;
  let trackId;
  try {
    const reg = async (name) => (await call('/auth/register', { method: 'POST', body: { username: `${name}_${run}`, email: `${name.toLowerCase()}_${run}@test.invalid`, password: 'password123', birth_year: 1990, birth_month: 5, country: 'SE' } })).body;
    const anna = await reg('Anna');
    const bo = await reg('Bo');
    const { rows: [t] } = await db.query(`INSERT INTO tracks (slug, name, length_m, is_active) VALUES ($1, $1, 1000, true) RETURNING id`, [slug]);
    trackId = t.id;
    const marbleOf = async (userId) => (await db.query('SELECT id FROM marbles WHERE owner_id = $1 ORDER BY starter_no LIMIT 1', [userId])).rows[0].id;
    const { rows: [bot] } = await db.query('SELECT id FROM marbles WHERE owner_id IS NULL LIMIT 1');
    const replay = packReplay({ durationMs: 30000, tickMs: 50, tickRateHz: 20, results: [], events: [], frames: [{ t: 0, p: [0] }], start: null, stats: {} });
    const race = async (daysAgo, entries) => {
      const { rows: [r] } = await db.query(
        `INSERT INTO races (track_id, name, status, seed, target_duration_ms, track_snapshot, decided_at, started_at, finished_at, created_at)
         VALUES ($1, 'relayout-test', 'finished', 1, 60000, '{"physics":{}}'::jsonb, now() - make_interval(days => $2), now() - make_interval(days => $2), now() - make_interval(days => $2), now() - make_interval(days => $2))
         RETURNING id`,
        [trackId, daysAgo],
      );
      const ids = [];
      for (const [k, e] of entries.entries()) {
        const { rows: [x] } = await db.query(
          'INSERT INTO race_entries (race_id, marble_id, user_id, is_bot, lane, finish_position, finish_time_ms, split_time_ms) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
          [r.id, e.user ? await marbleOf(e.user) : bot.id, e.user ?? null, !e.user, k, k + 1, e.ms, Math.round(e.ms / 2)],
        );
        ids.push(x.id);
      }
      await db.query('INSERT INTO race_replays (race_id, engine, data) VALUES ($1, $2, $3)', [r.id, 'test', replay]);
      return { id: r.id, entries: ids };
    };
    const A = anna.user.id;
    const B = bo.user.id;
    // The old layout: a computer player's 45.0 s record, Anna's 50.0 s best; a slower race.
    const old0 = await race(61, [{ ms: 47000 }, { user: A, ms: 51000 }]);
    const old1 = await race(60, [{ ms: 45000 }, { user: A, ms: 50000 }, { user: B, ms: 52000 }]);
    const sweden = async () => { records.clearCache(); return (await records.byTrack(db, slug)).records.find((r) => r.country === 'SE'); };
    assert.deepEqual([(await sweden()).ms, (await sweden()).userId], [50000, A]);

    // The new layout goes in: its records start again.
    await db.query(`UPDATE tracks SET records_since = now() - interval '50 days' WHERE id = $1`, [trackId]);
    assert.equal(await sweden(), undefined);
    const new1 = await race(45, [{ ms: 54000 }, { user: A, ms: 55000 }, { user: B, ms: 56000 }]);
    const new2 = await race(41, [{ ms: 58000 }, { user: A, ms: 57000 }]);
    const new3 = await race(40, [{ user: A, ms: 53000 }]);

    // Country records (by track and by country).
    assert.deepEqual([(await sweden()).ms, (await sweden()).userId], [53000, A]);
    const se = await records.byCountry(db, 'SE');
    assert.equal(se.records.find((r) => r.slug === slug).ms, 53000);

    // The comparisons on the results: the first race on the new layout is a first finish there.
    const c1 = await raceService.getComparisons(db, new1.id);
    assert.equal(c1[new1.entries[1]].previous_best_time_ms, null);
    assert.equal(c1[new1.entries[1]].previous_track_record_ms, null);
    assert.equal(c1[new1.entries[1]].previous_races_on_track, 0);
    const c3 = await raceService.getComparisons(db, new3.id);
    assert.equal(c3[new3.entries[0]].previous_best_time_ms, 55000);
    assert.equal(c3[new3.entries[0]].previous_best_split_ms, 27500);
    assert.equal(c3[new3.entries[0]].previous_track_record_ms, 54000);
    assert.equal(c3[new3.entries[0]].previous_races_on_track, 2);

    // The player's page: bests since the new layout; races, wins and podiums all of them.
    const mine = (await call(`/users/${A}/track-records`)).body.records.find((r) => r.slug === slug);
    assert.equal(mine.races, 5);
    assert.equal(mine.wins, 1);
    assert.equal(mine.best_time_ms, 53000);
    assert.equal(mine.best_split_ms, 26500);
    assert.equal(mine.best_position, 1);
    assert.equal(mine.track_record_ms, 53000);
    // Bo hasn't finished since: no best on the new layout yet.
    const bos = (await call(`/users/${B}/track-records`)).body.records.find((r) => r.slug === slug);
    assert.equal(bos.races, 2);
    assert.equal(bos.best_time_ms, 56000);

    // The track's page.
    const page = (await call(`/tracks/${slug}`)).body.stats;
    assert.equal(page.races_finished, 5);
    assert.equal(page.record_ms, 53000);
    assert.equal(page.best_split_ms, 26500);

    // Results stay.
    const { rows: [n] } = await db.query('SELECT count(*)::int AS n FROM race_entries e JOIN races r ON r.id = e.race_id WHERE r.track_id = $1', [trackId]);
    assert.equal(n.n, 11);

    // Replays: both layouts' records are kept (the old layout's: race old1; the new layout's track,
    // player and Sweden's record: race new3); the others go after 30 days.
    await retention.trimReplays(db, { dryRun: false, keepRecent: 0 });
    const { rows: kept } = await db.query('SELECT rp.race_id FROM race_replays rp JOIN races r ON r.id = rp.race_id WHERE r.track_id = $1', [trackId]);
    const keptIds = new Set(kept.map((k) => k.race_id));
    assert.ok(keptIds.has(old1.id), 'the old layout\'s record replay is kept');
    assert.ok(keptIds.has(new3.id), 'the new layout\'s player and country record replay is kept');
    assert.ok(!keptIds.has(old0.id) && !keptIds.has(new1.id) && !keptIds.has(new2.id), 'replays of no record go');
  } finally {
    if (trackId) {
      await db.query(`DELETE FROM race_entries WHERE race_id IN (SELECT id FROM races WHERE track_id = $1)`, [trackId]);
      await db.query(`DELETE FROM races WHERE track_id = $1`, [trackId]);
      await db.query(`DELETE FROM tracks WHERE id = $1`, [trackId]);
    }
    server.close();
    await db.end?.();
  }
});
