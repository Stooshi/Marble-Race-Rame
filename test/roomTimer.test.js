'use strict';

// A friend room's start timer (Moses, 24 Oct 2026; src/routes/rooms.js "start-in", src/game/raceManager.js
// scheduleStart / startScheduled). Against a real database when ROOMS_TEST_DATABASE_URL is set.
const test = require('node:test');
const assert = require('node:assert/strict');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
const fs = require('fs');
const path = require('path');

test("the start timer is the server's: routes, timer and its 5-second safety net", () => {
  const routes = fs.readFileSync(path.join(__dirname, '../src/routes/rooms.js'), 'utf8');
  assert.match(routes, /const START_IN = \[30, 60, 120\];/);
  assert.match(routes, /router\.post\('\/:code\/start-in', requireAuth/);
  assert.match(routes, /router\.post\('\/:code\/start-in\/cancel', requireAuth/);
  assert.match(routes, /raceManager\.unscheduleStart\(raceId\);\n  await raceManager\.start\(raceId, req\.user\);/);
  const manager = fs.readFileSync(path.join(__dirname, '../src/game/raceManager.js'), 'utf8');
  assert.match(manager, /for \(const \{ id \} of rows\) await this\.startScheduled\(id\);/);
});

// The host's start timer (Moses, 24 Oct 2026): "Start in…" 30 s, 1 min or 2 min, on the server.
test('a room\'s start timer: host only, the three times, cancel, start early, started by the server once', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const raceManager = require('../src/game/raceManager');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  try {
    const host = (await call('/auth/guest', { method: 'POST' })).body.token;
    const friend = (await call('/auth/guest', { method: 'POST' })).body.token;
    const { code } = (await call('/rooms', { method: 'POST', body: {}, token: host })).body.room;
    await call(`/rooms/${code}/join`, { method: 'POST', token: friend });

    // Only the host, and only 30, 60 or 120 seconds.
    assert.equal((await call(`/rooms/${code}/start-in`, { method: 'POST', body: { seconds: 60 }, token: friend })).status, 403);
    assert.equal((await call(`/rooms/${code}/start-in`, { method: 'POST', body: { seconds: 45 }, token: host })).status, 400);
    assert.equal((await call(`/rooms/${code}/start-in`, { method: 'POST', body: { seconds: 5 }, token: host })).status, 400);

    // Set: everyone sees when it starts (and the server's clock), also someone opening the link.
    const set = await call(`/rooms/${code}/start-in`, { method: 'POST', body: { seconds: 60 }, token: host });
    assert.equal(set.status, 200);
    const left = new Date(set.body.race.startsAt) - new Date(set.body.race.serverNow);
    assert.ok(left > 55_000 && left <= 60_000, `starts in about a minute (${left} ms)`);
    const seen = await call(`/rooms/${code}`);
    assert.equal(seen.body.race.startsAt, set.body.race.startsAt);
    assert.ok(raceManager.startTimers.has(set.body.race.id), 'the server keeps the timer');

    // Cancelled: no start time, no timer; the race waits for Start.
    const cancelled = await call(`/rooms/${code}/start-in/cancel`, { method: 'POST', token: host });
    assert.equal(cancelled.body.race.startsAt, null);
    assert.ok(!raceManager.startTimers.has(set.body.race.id));
    assert.equal(await raceManager.startScheduled(set.body.race.id), false, 'nothing starts after a cancel');

    // Set again, then the time comes with nobody connected: the server starts it, once.
    await call(`/rooms/${code}/start-in`, { method: 'POST', body: { seconds: 30 }, token: host });
    const raceId = set.body.race.id;
    await db.query(`UPDATE races SET scheduled_at = now() - interval '1 second' WHERE id = $1`, [raceId]);
    const [a, b] = await Promise.all([raceManager.startScheduled(raceId), raceManager.startScheduled(raceId)]);
    assert.deepEqual([a, b].sort(), [false, true], 'started exactly once');
    const started = await call(`/rooms/${code}`, { token: friend });
    assert.ok(['countdown', 'running'].includes(started.body.race.status));
    assert.equal(started.body.race.startsAt, null);
    const { rows: field } = await db.query('SELECT COUNT(*)::int AS n FROM race_entries WHERE race_id = $1', [raceId]);
    assert.equal(field[0].n, 20, 'empty places filled with computer players');
    assert.equal((await call(`/rooms/${code}/start-in`, { method: 'POST', body: { seconds: 30 }, token: host })).status, 409);

    // Start early: a second room, timer set, the host presses Start; the timer goes.
    const r2 = (await call('/rooms', { method: 'POST', body: {}, token: friend })).body;
    const timed = await call(`/rooms/${r2.room.code}/start-in`, { method: 'POST', body: { seconds: 120 }, token: friend });
    assert.ok(raceManager.startTimers.has(timed.body.race.id));
    const early = await call(`/rooms/${r2.room.code}/start`, { method: 'POST', token: friend });
    assert.equal(early.status, 202);
    assert.ok(!raceManager.startTimers.has(timed.body.race.id));
    assert.equal(await raceManager.startScheduled(timed.body.race.id), false, 'no second start');
  } finally {
    raceManager.shutdown();
    server.close();
    await db.pool?.end?.();
  }
});
