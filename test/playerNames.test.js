'use strict';

// Player names everywhere (Moses, 25 Oct 2026): a guest may choose a name and keeps it when saving the
// account; until then a guest shows as guest_<number>; the lists show the player's name (the race's
// data carries it), a computer player its marble's. Against a real database when ROOMS_TEST_DATABASE_URL is set.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';

const { shownName, guestNumberName } = require('../src/names/shown');
const raceService = require('../src/game/raceService');

test('the name shown: chosen name, else player name, else guest_<number>', () => {
  assert.equal(shownName({ username: 'guest_0da1cddb1b', display_name: 'Nelly' }), 'Nelly');
  assert.equal(shownName({ username: 'Topaz_Racer' }), 'Topaz_Racer');
  assert.match(shownName({ username: 'guest_0da1cddb1b' }), /^guest_\d{5}$/);
  assert.equal(shownName({ username: 'guest_0da1cddb1b' }), guestNumberName('guest_0da1cddb1b'));
  assert.equal(guestNumberName('guest_star'), null);
});

test("the race's data for viewers carries each player's name (computer players have none)", () => {
  const race = { id: 'r', track_id: 't', track_slug: 's', track_name: 'T', length_m: '100', lane_count: 4, waypoints: [], obstacles: [] };
  const rows = [
    { id: 'e1', lane: 0, is_bot: false, user_id: 'u1', username: 'guest_0da1cddb1b', display_name: 'Nelly', marble_id: 'm1', marble_name: 'Topaz' },
    { id: 'e2', lane: 1, is_bot: false, user_id: 'u2', username: 'guest_ffff000011', display_name: null, marble_id: 'm2', marble_name: 'Ruby' },
    { id: 'e3', lane: 2, is_bot: true, user_id: null, username: null, marble_id: 'm3', marble_name: 'Sunset Swirl' },
  ];
  const { entries } = raceService.describeForClients(race, rows);
  assert.equal(entries[0].user.name, 'Nelly');
  assert.match(entries[1].user.name, /^guest_\d{5}$/);
  assert.equal(entries[2].user, null);
  assert.ok(entries[2].marble.name); // (a computer player's marble name, dressed: src/marbles/computerPlayers)
});

test('a guest chooses a name, keeps it when saving; the rules; nobody shows as someone else', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const run = crypto.randomBytes(3).toString('hex');
  try {
    const g = (await call('/auth/guest', { method: 'POST' })).body;
    const name = `Nelly ${run}`;
    // The rules: 3–24 letters, digits, spaces, _ or -; the filter; never guest_…
    for (const bad of ['ab', 'Nelly!', 'a'.repeat(25), 'guest_12345', 'Guest 7']) {
      assert.equal((await call('/users/me', { method: 'PATCH', token: g.token, body: { display_name: bad } })).status, 400, bad);
    }
    assert.equal((await call('/users/me', { method: 'PATCH', token: g.token, body: { display_name: 'Kurw4 Racer' } })).status, 400);
    const set = await call('/users/me', { method: 'PATCH', token: g.token, body: { display_name: `  ${name}  ` } });
    assert.equal(set.status, 200);
    assert.equal((await db.query('SELECT display_name FROM users WHERE id = $1', [g.user.id])).rows[0].display_name, name);

    // Nobody else may take it (case ignored), as a chosen name or as a new player name.
    const other = (await call('/auth/guest', { method: 'POST' })).body;
    const taken = await call('/users/me', { method: 'PATCH', token: other.token, body: { display_name: name.toUpperCase() } });
    assert.equal(taken.status, 409);
    assert.equal(taken.body.details.code, 'name_taken');
    const asUsername = `Nelly_${run}`;
    await call('/users/me', { method: 'PATCH', token: other.token, body: { display_name: asUsername } });
    const reg = await call('/auth/register', { method: 'POST', body: { username: asUsername, email: `x_${run}@test.invalid`, password: 'password123', birth_year: 1990, birth_month: 5 } });
    assert.equal(reg.status, 409);

    // Saved with another player name: the chosen name stays.
    const claimed = await call('/auth/claim', { method: 'POST', token: g.token, body: { username: `Saved_${run}`, email: `s_${run}@test.invalid`, password: 'password123', birth_year: 1990, birth_month: 5 } });
    assert.equal(claimed.status, 200);
    assert.equal(claimed.body.user.display_name, name);
    assert.equal(claimed.body.user.is_guest, false);
    // Saved with the chosen name as the player name: just the player name (no second copy).
    const claimed2 = await call('/auth/claim', { method: 'POST', token: other.token, body: { username: asUsername, email: `o_${run}@test.invalid`, password: 'password123', birth_year: 1990, birth_month: 5 } });
    assert.equal(claimed2.status, 200);
    assert.equal(claimed2.body.user.username, asUsername);
    assert.equal(claimed2.body.user.display_name, null);
  } finally {
    server.close();
    await db.pool?.end?.().catch?.(() => {});
  }
});
