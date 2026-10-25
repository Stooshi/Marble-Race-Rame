'use strict';

// Public rooms and Quick race (Moses, 25 Oct 2026; src/routes/rooms.js). A room is private (link or code,
// the default) or public (listed under "Join a race"); Quick race puts a player into a public quick race
// starting soon with a free place, else a new one that starts by itself in 15 s. Against a real database
// when ROOMS_TEST_DATABASE_URL is set.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';

test('the routes: public list, Quick race (15 s), visibility, the host only; the schema only adds', () => {
  const routes = fs.readFileSync(path.join(__dirname, '../src/routes/rooms.js'), 'utf8');
  assert.match(routes, /const QUICK_START_S = 15;/);
  assert.match(routes, /router\.get\('\/public', optionalAuth/);
  assert.match(routes, /router\.post\('\/quick', requireAuth, quickLimiter/);
  assert.match(routes, /router\.post\('\/:code\/join', requireAuth, joinLimiter/);
  assert.match(routes, /router\.post\('\/:code\/visibility', requireAuth/);
  assert.match(routes, /if \(room\.kind === 'quick'\) throw forbidden/);
  const schema = fs.readFileSync(path.join(__dirname, '../docs/database_schema.sql'), 'utf8');
  assert.match(schema, /ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;/);
  assert.match(schema, /ALTER TABLE rooms ADD COLUMN IF NOT EXISTS kind varchar\(10\) NOT NULL DEFAULT 'friends'/);
});

test('public rooms and Quick race on a real database', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const raceManager = require('../src/game/raceManager');
  const rooms = require('../src/routes/rooms');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (p, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + p, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const guest = async () => (await call('/auth/guest', { method: 'POST' })).body;
  const listed = async (code) => (await call('/rooms/public')).body.rooms.find((r) => r.code === code);
  const raceOf = async (code) => (await db.query('SELECT r.* FROM rooms ro JOIN races r ON r.id = ro.current_race_id WHERE ro.code = $1', [code])).rows[0];
  try {
    // Private by default: not listed. Public: listed (track, 1/20, no countdown); back to private: gone.
    const host = await guest();
    const made = await call('/rooms', { method: 'POST', body: {}, token: host.token });
    assert.equal(made.status, 201);
    const { code } = made.body.room;
    assert.equal(made.body.room.public, false);
    assert.equal(await listed(code), undefined);
    const friend = await guest();
    assert.equal((await call(`/rooms/${code}/visibility`, { method: 'POST', body: { public: true }, token: friend.token })).status, 403);
    const pub = await call(`/rooms/${code}/visibility`, { method: 'POST', body: { public: true }, token: host.token });
    assert.equal(pub.body.room.public, true);
    let row = await listed(code);
    assert.equal(row.players, 1);
    assert.equal(row.size, 20);
    assert.equal(row.startsAt, null);
    assert.ok(row.track.name);
    // A public room made public from the start, with its start timer: listed with its countdown.
    const made2 = await call('/rooms', { method: 'POST', body: { public: true }, token: (await guest()).token });
    assert.equal(made2.body.room.public, true);

    // Anyone joins (a guest too); the host takes a player out: they can't join that room again.
    assert.equal((await call(`/rooms/${code}/join`, { method: 'POST', token: friend.token })).status, 200);
    row = await listed(code);
    assert.equal(row.players, 2);
    assert.equal((await call(`/rooms/${code}/remove`, { method: 'POST', body: { user_id: friend.user.id }, token: host.token })).status, 200);
    const again = await call(`/rooms/${code}/join`, { method: 'POST', token: friend.token });
    assert.equal(again.status, 403);
    assert.equal(again.body.details.code, 'removed');
    assert.equal((await call(`/rooms/${code}`, { token: friend.token })).body.me.removed, true);
    await call(`/rooms/${code}/visibility`, { method: 'POST', body: { public: false }, token: host.token });
    assert.equal(await listed(code), undefined);

    // Quick race: a new public quick race that starts by itself in 15 s; the next players tap into the same one.
    const a = await guest();
    const q1 = await call('/rooms/quick', { method: 'POST', token: a.token });
    assert.equal(q1.status, 200);
    assert.equal(q1.body.room.kind, 'quick');
    assert.equal(q1.body.room.public, true);
    assert.equal(q1.body.room.host, null);
    assert.equal(q1.body.me.isHost, false);
    assert.equal(q1.body.me.inRace, true);
    const left = new Date(q1.body.race.startsAt) - new Date(q1.body.race.serverNow);
    assert.ok(left > 13_000 && left <= 15_000, `starts in about 15 s (${left} ms)`);
    assert.ok(raceManager.startTimers.has(q1.body.race.id), 'the server starts it');
    const qCode = q1.body.room.code;
    // Several players tapping at once: all into the same race.
    const others = await Promise.all([guest(), guest(), guest(), guest()]);
    const taps = await Promise.all(others.map((g) => call('/rooms/quick', { method: 'POST', token: g.token })));
    for (const t of taps) assert.equal(t.body.room.code, qCode);
    assert.equal((await call(`/rooms/${qCode}`, { token: a.token })).body.players.length, 5); // (after every tap: they finish in any order)
    // Tapping again while waiting: the same race, not a second one.
    assert.equal((await call('/rooms/quick', { method: 'POST', token: a.token })).body.room.code, qCode);
    // Listed as a quick race with its countdown.
    row = await listed(qCode);
    assert.equal(row.kind, 'quick');
    assert.equal(row.players, 5);
    assert.ok(row.startsAt);
    // No host: nobody changes the track, starts it or takes players out.
    assert.equal((await call(`/rooms/${qCode}/start`, { method: 'POST', token: a.token })).status, 403);
    assert.equal((await call(`/rooms/${qCode}/track`, { method: 'POST', body: { random: true }, token: a.token })).status, 403);
    assert.equal((await call(`/rooms/${qCode}/remove`, { method: 'POST', body: { user_id: others[0].user.id }, token: a.token })).status, 403);
    // In its last seconds it takes nobody new: they get a new quick race instead.
    const qRace = await raceOf(qCode);
    raceManager.unscheduleStart(qRace.id);
    await db.query(`UPDATE races SET scheduled_at = now() + interval '2 seconds' WHERE id = $1`, [qRace.id]);
    const late = await guest();
    const lateJoin = await call(`/rooms/${qCode}/join`, { method: 'POST', token: late.token });
    assert.equal(lateJoin.status, 409);
    assert.equal(lateJoin.body.details.code, 'quick_starting');
    const q2 = await call('/rooms/quick', { method: 'POST', token: late.token });
    assert.notEqual(q2.body.room.code, qCode);
    raceManager.unscheduleStart(q2.body.race.id);
    assert.equal(await listed(qCode), undefined);

    // A quick race is one race: after it the room closes (the results offer Quick race again).
    await rooms.afterRace(qRace.id);
    assert.equal((await db.query('SELECT status FROM rooms WHERE code = $1', [qCode])).rows[0].status, 'closed');
    // Everyone left before it started: not run for computer players alone; its room closes.
    const q2Code = q2.body.room.code;
    await call(`/rooms/${q2Code}/leave`, { method: 'POST', token: late.token });
    await db.query(`UPDATE races SET scheduled_at = now() - interval '1 second' WHERE id = $1`, [q2.body.race.id]);
    assert.equal(await raceManager.startScheduled(q2.body.race.id), false);
    assert.equal((await db.query('SELECT status FROM races WHERE id = $1', [q2.body.race.id])).rows[0].status, 'cancelled');
    assert.equal((await db.query('SELECT status FROM rooms WHERE code = $1', [q2Code])).rows[0].status, 'closed');
  } finally {
    raceManager.shutdown();
    server.close();
    await db.pool?.end?.();
  }
});
