'use strict';

// Race readiness (Moses, 28 Oct 2026): each screen's report at GO, checked and trimmed; recorded and
// summed up on a real database when ROOMS_TEST_DATABASE_URL is set.
const test = require('node:test');
const assert = require('node:assert/strict');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
const readiness = require('../src/readiness');

test('a report is checked: known platforms and kinds only, short values, only the listed details', () => {
  const r = readiness.clean({
    platform: 'ios', kind: 'room', missing: ['marbles', 'tune-3', 42, 'x'.repeat(99), '<script>'], lateMs: 1834.6,
    details: { backend: 'native', started: true, connection: '4g', memoryGb: 4, secret: 'no', sound: ['tune-3'] },
  });
  assert.equal(r.platform, 'ios');
  assert.equal(r.ready, false);
  assert.deepEqual(r.missing, ['marbles', 'tune-3', 'x'.repeat(40), 'script']);
  assert.equal(r.lateMs, 1835);
  assert.deepEqual(r.details, { backend: 'native', started: true, connection: '4g', memoryGb: 4, sound: ['tune-3'] });
  const d = readiness.clean({ platform: 'windows', kind: 'x', lateMs: -5 });
  assert.deepEqual([d.platform, d.kind, d.ready, d.lateMs], ['web', 'room', true, 0]);
  assert.equal(readiness.pieceOf('marbles'), 'marbles');
  assert.equal(readiness.pieceOf('tune-2'), 'sound');
  assert.equal(readiness.KEEP_DAYS, 30);
});

test('on a real database: recorded from the race page, summed up for the back office, trimmed after 30 days', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const post = (id, body) => fetch(`${base}/races/${id}/readiness`, { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'TestPhone/1.0' }, body: JSON.stringify(body) });
  try {
    const { rows: [race] } = await db.query('SELECT id FROM races ORDER BY created_at DESC LIMIT 1');
    if (!race) return;
    assert.equal((await post('00000000-0000-4000-8000-000000000000', {})).status, 404);
    assert.equal((await post(race.id, { platform: 'android', kind: 'room', missing: ['marbles', 'tune-1'], lateMs: 2200, details: { backend: 'native' } })).status, 204);
    assert.equal((await post(race.id, { platform: 'web', kind: 'solo', missing: [] })).status, 204);
    const { rows } = await db.query('SELECT * FROM race_readiness WHERE race_id = $1 ORDER BY id DESC LIMIT 2', [race.id]);
    assert.equal(rows[1].device, 'TestPhone/1.0');
    assert.deepEqual(rows[1].missing, ['marbles', 'tune-1']);
    assert.equal(rows[0].ready, true);
    const s = await readiness.summary(db, { days: 1 });
    assert.ok(s.byPlatform.some((p) => p.platform === 'android' && p.screens >= 1 && p.ready < p.screens));
    assert.ok(s.missing.some((m) => m.missing === 'tune-1' && m.piece === 'sound'));
    assert.ok(s.latest.some((l) => l.race_id === race.id));
    await db.query(`UPDATE race_readiness SET created_at = now() - interval '31 days' WHERE id = $1`, [rows[1].id]);
    assert.ok((await readiness.trim(db)) >= 1);
    await db.query('DELETE FROM race_readiness WHERE race_id = $1', [race.id]);
  } finally {
    server.close();
    await db.pool?.end?.().catch?.(() => {});
  }
});
