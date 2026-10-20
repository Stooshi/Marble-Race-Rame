'use strict';

// Friend rooms (src/routes/rooms.js). The codes always run; the room's whole
// life against a real database runs when ROOMS_TEST_DATABASE_URL is set, e.g.
//   ROOMS_TEST_DATABASE_URL=postgres://mr:mr@localhost/mr_fresh npm test
const test = require('node:test');
const assert = require('node:assert/strict');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.NODE_ENV = process.env.NODE_ENV || 'test'; // (the 20-guest room: past the sign-up rate limit)
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
const rooms = require('../src/routes/rooms');

test('room codes: 6 characters, no 0/O or 1/I; typed any way they are found', () => {
  for (let i = 0; i < 200; i += 1) {
    const code = rooms.newCode();
    assert.match(code, /^[A-HJ-NP-Z2-9]{6}$/);
    assert.equal(rooms.normaliseCode(code.toLowerCase().replace(/(...)/, '$1-')), code);
  }
  assert.equal(rooms.normaliseCode('K7QF2M'), 'K7QF2M');
  assert.equal(rooms.normaliseCode('k7q f2m'), 'K7QF2M');
  assert.equal(rooms.normaliseCode('K7QF2'), null);
  assert.equal(rooms.normaliseCode('K7QF2O'), null); // (no O)
});

test('a room from start to the next race, on a real database', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
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

    const made = await call('/rooms', { method: 'POST', body: {}, token: host });
    assert.equal(made.status, 201);
    const { code } = made.body.room;
    assert.equal(made.body.players.length, 1);
    assert.ok(made.body.me.isHost && made.body.me.inRace);

    // The friend opens the link (any case) and is in, after the host.
    const joined = await call(`/rooms/${code.toLowerCase()}/join`, { method: 'POST', token: friend });
    assert.equal(joined.status, 200);
    assert.equal(joined.body.players.length, 2);
    assert.ok(joined.body.players[0].host);
    assert.match(joined.body.players[1].name, /^Guest [A-Z0-9]{4}$/);

    // Private: not in the public list of races; only the host starts, changes the track, removes players.
    const list = await call('/races?status=lobby&limit=100');
    assert.ok(!list.body.races.some((r) => r.id === joined.body.race.id));
    assert.equal((await call(`/rooms/${code}/start`, { method: 'POST', token: friend })).status, 403);
    assert.equal((await call(`/rooms/${code}/track`, { method: 'POST', body: { random: true }, token: friend })).status, 403);
    const { body: tracks } = await call('/tracks');
    const pick = tracks.tracks.find((t) => t.is_active !== false);
    const moved = await call(`/rooms/${code}/track`, { method: 'POST', body: { track_id: pick.id }, token: host });
    assert.equal(moved.body.race.track.id, pick.id);

    // The race finishes (marked here; in a game the race manager does it): the next one is ready with both.
    const raceId = moved.body.race.id;
    await db.query(`UPDATE races SET status = 'finished', seed = 1, target_duration_ms = 30000, track_snapshot = '{}'::jsonb, finished_at = now() WHERE id = $1`, [raceId]);
    await rooms.afterRace(raceId);
    const next = await call(`/rooms/${code}`, { token: friend });
    assert.notEqual(next.body.race.id, raceId);
    assert.equal(next.body.race.status, 'lobby');
    assert.equal(next.body.race.track.id, pick.id);
    assert.equal(next.body.players.length, 2);
    assert.equal(next.body.room.lastRaceId, raceId);
    assert.ok(next.body.me.inRace);

    // Leaving, removing, closing.
    assert.equal((await call(`/rooms/${code}/leave`, { method: 'POST', token: friend })).body.players.length, 1);
    await call(`/rooms/${code}/join`, { method: 'POST', token: friend });
    const removed = await call(`/rooms/${code}/remove`, { method: 'POST', body: { user_id: next.body.players.find((p) => !p.host).userId }, token: host });
    assert.equal(removed.body.players.length, 1);
    assert.equal((await call(`/rooms/${code}/close`, { method: 'POST', token: host })).body.room.status, 'closed');
    assert.equal((await call(`/rooms/${code}/join`, { method: 'POST', token: friend })).status, 410);
    assert.equal((await call('/rooms/ABCDEF')).status, 404);

    // 20 new guests in one friend room (20 Oct 2026): everyone gets in with one of their own 4 starters,
    // no two showing the same look (before, the 4 shared starters let only 4 new players in).
    const starters = require('../src/marbles/starters');
    const guests = [];
    for (let i = 0; i < 20; i += 1) guests.push((await call('/auth/guest', { method: 'POST' })).body);
    const room20 = (await call('/rooms', { method: 'POST', body: {}, token: guests[0].token })).body;
    for (const g of guests.slice(1)) assert.equal((await call(`/rooms/${room20.room.code}/join`, { method: 'POST', token: g.token })).status, 200);
    const { rows: lined } = await db.query(
      `SELECT e.user_id, m.owner_id, m.is_starter, m.pattern, m.color_primary, m.color_secondary, m.marble_code
         FROM race_entries e JOIN marbles m ON m.id = e.marble_id WHERE e.race_id = $1`,
      [room20.race.id],
    );
    assert.equal(lined.length, 20);
    for (const e of lined) {
      assert.equal(e.owner_id, e.user_id, 'each races one of their own starters');
      assert.ok(e.is_starter);
      assert.match(e.marble_code, /^ST[A-HJ-NP-Z2-9]{5}[1-4]$/);
    }
    assert.equal(new Set(lined.map(starters.keyOfRow)).size, 20, 'all 20 look different');
    // The room's view shows all 20 players.
    assert.equal((await call(`/rooms/${room20.room.code}`, { token: guests[0].token })).body.players.length, 20);
  } finally {
    server.close();
    await db.pool?.end?.();
  }
});
