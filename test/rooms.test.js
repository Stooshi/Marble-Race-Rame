'use strict';

// Friend rooms (src/routes/rooms.js). The codes always run; the room's whole
// life against a real database runs when ROOMS_TEST_DATABASE_URL is set, e.g.
//   ROOMS_TEST_DATABASE_URL=postgres://mr:mr@localhost/mr_fresh npm test
const test = require('node:test');
const assert = require('node:assert/strict');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
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

    // No free marble (pre-launch item 18): the message says why and what to do.
    const guests = [];
    for (let i = 0; i < 6; i += 1) guests.push((await call('/auth/guest', { method: 'POST' })).body.token);
    const { code: code6 } = (await call('/rooms', { method: 'POST', body: {}, token: guests[0] })).body.room;
    const results = [];
    for (const g of guests.slice(1)) results.push(await call(`/rooms/${code6}/join`, { method: 'POST', token: g }));
    const refused = results.filter((r) => r.status === 409);
    for (const r of refused) {
      assert.equal(r.body.details?.code, 'no_free_marble');
      assert.match(r.body.error, /taken in this race by other players/);
    }
    console.log(`# room of 6 guests: ${results.filter((r) => r.status === 200).length + 1} in, ${refused.length} refused`);
  } finally {
    server.close();
    await db.pool?.end?.();
  }
});
