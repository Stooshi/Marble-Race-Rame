'use strict';

// The start show in rooms and Quick race (Moses, 26 Oct 2026): a room's race counts down
// RACE_COUNTDOWN_MS + RACE_START_SHOW_MS (5 s + 3.5 s), so everyone sees the flyover in sync, then the
// countdown. "Start now" in a quick race when the player is the only real one. Solo races are unchanged
// (their show plays on the player's own screen). Against a real database when ROOMS_TEST_DATABASE_URL is set.
const test = require('node:test');
const assert = require('node:assert/strict');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';

test('the timings: 3.5 s of show before a room race\'s 5 s countdown', () => {
  const config = require('../src/config');
  assert.equal(config.game.countdownMs, 5000);
  assert.equal(config.game.startShowMs, 4000);
});

test('room races count down longer; solo races don\'t; Start now only alone in a quick race', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (p, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + p, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const guest = async () => (await call('/auth/guest', { method: 'POST' })).body;
  const raceOf = async (code) => (await db.query('SELECT r.* FROM rooms ro JOIN races r ON r.id = ro.current_race_id WHERE ro.code = $1', [code])).rows[0];
  try {
    // A friend room's race: 9 s from start to GO.
    const host = await guest();
    const made = await call('/rooms', { method: 'POST', body: {}, token: host.token });
    const roomRace = await raceOf(made.body.room.code);
    assert.equal(roomRace.countdown_ms, 9000);

    // A solo race: the usual 5 s (the show is the player's own).
    const solo = await guest();
    const created = await call('/races', { method: 'POST', token: solo.token, body: { random_track: true, enter: true, min_marbles: 20, max_marbles: 20 } });
    const started = await call(`/races/${created.body.race.id}/start`, { method: 'POST', token: solo.token });
    assert.equal(started.body.race.countdown_ms, 5000);

    // Quick race, alone: Start now starts it at once; with a second real player it can't.
    const a = await guest();
    const q = await call('/rooms/quick', { method: 'POST', token: a.token });
    const qCode = q.body.room.code;
    const b = await guest();
    const joined = await call('/rooms/quick', { method: 'POST', token: b.token });
    assert.equal(joined.body.room.code, qCode);
    assert.equal((await call(`/rooms/${qCode}/start-now`, { method: 'POST', token: a.token })).status, 409);
    const c = await guest();
    const own = (await db.query(
      `INSERT INTO rooms (code, host_id, track_id, is_public, kind) VALUES ($1, $2, NULL, true, 'quick') RETURNING code`,
      [`T${Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('')}`, c.user.id], // (room code letters only: no 0/O, 1/I)
    )).rows[0];
    // (Its race comes from the quick route; this room is only for the "not in it" check.)
    assert.equal((await call(`/rooms/${own.code}/start-now`, { method: 'POST', token: c.token })).status, 409);
    await call(`/rooms/${qCode}/leave`, { method: 'POST', token: b.token });
    const now = await call(`/rooms/${qCode}/start-now`, { method: 'POST', token: a.token });
    assert.equal(now.status, 200);
    let qRace;
    for (let i = 0; i < 40; i += 1) {
      qRace = await raceOf(qCode);
      if (qRace.status !== 'lobby') break;
      await new Promise((ok) => setTimeout(ok, 100));
    }
    assert.equal(qRace.status, 'countdown');
    assert.equal(qRace.countdown_ms, 9000);
    // A friend room isn't started this way.
    assert.equal((await call(`/rooms/${made.body.room.code}/start-now`, { method: 'POST', token: host.token })).status, 400);
  } finally {
    server.close();
    await db.pool?.end?.();
  }
});
