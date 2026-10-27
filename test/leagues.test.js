'use strict';

// Leagues v1, part 1 (27 Oct 2026; src/leagues, src/routes/leagues.js). Against a real database when
// ROOMS_TEST_DATABASE_URL is set; the rules that need none run always.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
const leagues = require('../src/leagues');

test('the LEAGUES switch: off by default, admins, on; anything else is off', () => {
  assert.equal(leagues.mode({}), 'off');
  assert.equal(leagues.mode({ LEAGUES: 'on' }), 'on');
  assert.equal(leagues.mode({ LEAGUES: ' Admins ' }), 'admins');
  assert.equal(leagues.mode({ LEAGUES: 'yes' }), 'off');
  assert.equal(leagues.openFor({ role: 'player' }, { LEAGUES: 'admins' }), false);
  assert.equal(leagues.openFor({ role: 'admin' }, { LEAGUES: 'admins' }), true);
  assert.equal(leagues.openFor(null, { LEAGUES: 'on' }), true);
  assert.equal(leagues.openFor({ role: 'admin' }, {}), false);
  assert.throws(() => leagues.assertOpen({ role: 'admin' }, {}), (e) => e.status === 404);
});

test('the rules in the code: 5 tracks, 1-7 days, unlimited/3/5/10 tries, 5 open per creator, codes', () => {
  assert.equal(leagues.TRACKS, 5);
  assert.deepEqual(leagues.DAYS, [1, 7]);
  assert.deepEqual(leagues.CAPS, [null, 3, 5, 10]);
  assert.equal(leagues.OPEN_PER_CREATOR, 5);
  assert.equal(leagues.normaliseCode(' k7q-f2m '), 'K7QF2M');
  assert.equal(leagues.normaliseCode('K7QF2'), null);
  assert.equal(leagues.normaliseCode('K7QF2O'), null); // (no O)
  // League races pay like any race: the ordinary payout runs before the league's time is written.
  const service = fs.readFileSync(path.join(__dirname, '../src/game/raceService.js'), 'utf8');
  assert.match(service, /await economy\.payRace\(client, raceId\);\n {4}\/\/ A league race[^\n]*\n {4}await require\('\.\.\/leagues'\)\.recordRace\(client, raceId\);/);
  // Holiday tracks: members race the creator's pass-holder tracks inside the league, as in a room.
  const races = fs.readFileSync(path.join(__dirname, '../src/routes/races.js'), 'utf8');
  assert.match(races, /roomHostId: track\?\.room_host_id \?\? track\?\.league_creator \?\? null/);
  const lib = fs.readFileSync(path.join(__dirname, '../src/leagues/index.js'), 'utf8');
  assert.match(lib, /for \(const t of tracks\) await seasons\.assertTrackAccess\(db, t, \{ userId \}\);/);
  // Part 1 never writes league_results (Pro Leagues only, part 2), and nothing sets feeds_major.
  const code = ['../src/leagues/index.js', '../src/routes/leagues.js'].map((f) => fs.readFileSync(path.join(__dirname, f), 'utf8')).join('\n');
  assert.doesNotMatch(code, /INSERT INTO league_results/);
  assert.doesNotMatch(code, /feeds_major\s*=\s*true|'pro'\s*,\s*\$/);
});

test('a League from start to end: create, join, tries, best times, the total, the tie-break, frozen at the end', { skip: !DB }, async () => {
  process.env.LEAGUES = 'on';
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const raceManager = require('../src/game/raceManager');
  const raceService = require('../src/game/raceService');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (p, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + p, {
      method,
      headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const register = async (name) => (await call('/auth/register', { method: 'POST', body: { username: name, email: `${name}@test.invalid`, password: 'password123', age_group: '18+' } })).body;
  const stamp = Date.now().toString(36).slice(-5);
  try {
    // Switched off: only /status answers, with enabled false.
    process.env.LEAGUES = 'off';
    assert.equal((await call('/leagues/status')).body.enabled, false);
    const a = await register(`lgA${stamp}`);
    assert.equal((await call('/leagues/mine', { token: a.token })).status, 404);
    process.env.LEAGUES = 'on';
    assert.equal((await call('/leagues/status')).body.enabled, true);

    const b = await register(`lgB${stamp}`);
    const c = await register(`lgC${stamp}`);
    const guest = (await call('/auth/guest', { method: 'POST' })).body;
    const { rows: tracks } = await db.query('SELECT id FROM tracks WHERE is_active AND season_key IS NULL ORDER BY physics IS NULL, slug LIMIT 5');
    assert.equal(tracks.length, 5, 'five active tracks in the test database');
    const five = tracks.map((t) => t.id);

    // Create: checked settings; a guest is asked to save first.
    assert.equal((await call('/leagues', { method: 'POST', token: a.token, body: { name: 'Office', track_ids: five.slice(0, 4), days: 3 } })).status, 400);
    assert.equal((await call('/leagues', { method: 'POST', token: a.token, body: { name: 'Office', track_ids: five, days: 8 } })).status, 400);
    assert.equal((await call('/leagues', { method: 'POST', token: a.token, body: { name: 'Office', track_ids: five, days: 3, attempts: 4 } })).status, 400);
    const asGuest = await call('/leagues', { method: 'POST', token: guest.token, body: { name: 'Office', track_ids: five, days: 3 } });
    assert.equal(asGuest.status, 403);
    assert.equal(asGuest.body.details.code, 'save_account');
    const made = await call('/leagues', { method: 'POST', token: a.token, body: { name: 'Office league', track_ids: five, days: 3, attempts: 3 } });
    assert.equal(made.status, 201, JSON.stringify(made.body));
    const { code } = made.body.league;
    assert.match(code, /^[A-Z2-9]{6}$/);
    assert.equal(made.body.tracks.length, 5);
    assert.deepEqual(made.body.tracks.map((t) => t.tries_left), [3, 3, 3, 3, 3]);

    // The name: the player-name filter, at creation and when the creator renames it (Moses, 27 Oct 2026).
    const rude = await call('/leagues', { method: 'POST', token: a.token, body: { name: 'Fuuuck league', track_ids: five, days: 3 } });
    assert.equal(rude.status, 400);
    assert.equal(rude.body.details.code, 'name_not_allowed');
    assert.equal((await call(`/leagues/${code}`, { method: 'PATCH', token: b.token, body: { name: 'Mine now' } })).status, 403);
    const rudeRename = await call(`/leagues/${code}`, { method: 'PATCH', token: a.token, body: { name: 'Fuuuck league' } });
    assert.equal(rudeRename.status, 400);
    assert.equal(rudeRename.body.details.code, 'name_not_allowed');
    assert.equal((await call(`/leagues/${code}`, { method: 'PATCH', token: a.token, body: { name: 'x' } })).status, 400);
    const renamed = await call(`/leagues/${code}`, { method: 'PATCH', token: a.token, body: { name: '  Office   Cup  ' } });
    assert.equal(renamed.status, 200, JSON.stringify(renamed.body));
    assert.equal(renamed.body.league.name, 'Office Cup');
    await call(`/leagues/${code}`, { method: 'PATCH', token: a.token, body: { name: 'Office league' } });

    // Join by link; a guest can't; the creator adds C by name, then removes them (they can't come back).
    assert.equal((await call(`/leagues/${code}/join`, { method: 'POST', token: guest.token })).status, 403);
    assert.equal((await call(`/leagues/${code}/join`, { method: 'POST', token: b.token })).status, 200);
    assert.equal((await call(`/leagues/${code}/members`, { method: 'POST', token: b.token, body: { username: `lgC${stamp}` } })).status, 403);
    const added = await call(`/leagues/${code}/members`, { method: 'POST', token: a.token, body: { username: `lgC${stamp}` } });
    assert.equal(added.body.scoreboard.length, 3);
    const removed = await call(`/leagues/${code}/members/${c.user.id}`, { method: 'DELETE', token: a.token });
    assert.equal(removed.body.scoreboard.length, 2);
    assert.equal((await call(`/leagues/${code}/join`, { method: 'POST', token: c.token })).status, 403);

    // A league race: one of its tracks, a member, a try each; run to the end here (no waiting).
    const raceOn = async (who, trackId) => {
      const r = await call(`/leagues/${code}/race`, { method: 'POST', token: who.token, body: { track_id: trackId } });
      assert.equal(r.status, 201, JSON.stringify(r.body));
      await raceManager.start(r.body.race.id, { id: who.user.id, role: 'player' });
      raceManager.stop(r.body.race.id); // (no streaming here: finished at once)
      await raceService.finalize(r.body.race.id);
      const { rows: [e] } = await db.query('SELECT finish_time_ms FROM race_entries WHERE race_id = $1 AND user_id = $2', [r.body.race.id, who.user.id]);
      return e.finish_time_ms;
    };
    assert.equal((await call(`/leagues/${code}/race`, { method: 'POST', token: a.token, body: { track_id: '00000000-0000-4000-8000-000000000000' } })).status, 400); // (not a league track)
    assert.equal((await call(`/leagues/${code}/race`, { method: 'POST', token: c.token, body: { track_id: five[0] } })).status, 403); // (removed)

    const timesA = [];
    for (const t of five) timesA.push(await raceOn(a, t));
    // The race's results name the league, and whether it was a new best there.
    const { rows: [firstRun] } = await db.query('SELECT race_id FROM league_runs WHERE user_id = $1 ORDER BY created_at LIMIT 1', [a.user.id]);
    const res1 = (await call(`/races/${firstRun.race_id}/results`)).body;
    assert.equal(res1.league.code, code);
    assert.equal(res1.league.new_best, true);
    // (Race again on a league race goes through the league, so the try counts there: never a plain rematch.)
    const rematch = await call(`/races/${firstRun.race_id}/next`, { method: 'POST', token: a.token, body: {} });
    assert.equal(rematch.status, 409);
    assert.equal(rematch.body.details.code, 'league_race');
    const again = await raceOn(a, five[0]); // a second try on the first track: the better one counts
    const { rows: [secondRun] } = await db.query('SELECT race_id FROM league_runs WHERE user_id = $1 AND track_id = $2 ORDER BY created_at DESC LIMIT 1', [a.user.id, five[0]]);
    assert.equal((await call(`/races/${secondRun.race_id}/results`)).body.league.new_best, again < timesA[0]);
    const bestA0 = Math.min(timesA[0], again);
    let view = (await call(`/leagues/${code}`, { token: a.token })).body;
    assert.equal(view.me.done, 5);
    assert.equal(view.me.place, 1);
    assert.equal(view.me.total_ms, bestA0 + timesA.slice(1).reduce((s, x) => s + x, 0));
    assert.equal(view.tracks[0].tries_left, 1);
    assert.equal(view.tracks[0].best_ms, bestA0);

    // The tries cap: the third try is the last.
    await raceOn(a, five[0]);
    const capped = await call(`/leagues/${code}/race`, { method: 'POST', token: a.token, body: { track_id: five[0] } });
    assert.equal(capped.status, 409);

    // B: four tracks done is not ranked yet (listed below the ranked players).
    for (const t of five.slice(0, 4)) await raceOn(b, t);
    view = (await call(`/leagues/${code}`, { token: b.token })).body;
    assert.equal(view.me.done, 4);
    assert.equal(view.me.place, null);
    assert.equal(view.scoreboard[0].user_id, a.user.id);

    // Tie-break: on the same total, the one who set it first ranks higher.
    const { rows: [lg] } = await db.query('SELECT * FROM leagues WHERE code = $1', [code]);
    await raceOn(b, five[4]);
    const boardNow = await leagues.scoreboard(db, lg);
    const [ra, rb] = [boardNow.find((r) => r.user_id === a.user.id), boardNow.find((r) => r.user_id === b.user.id)];
    // (Make the totals equal: B's runs set later than A's.)
    await db.query('UPDATE league_runs SET time_ms = time_ms + $3 WHERE league_id = $1 AND user_id = $2 AND track_id = $4 AND time_ms = (SELECT MIN(time_ms) FROM league_runs WHERE league_id = $1 AND user_id = $2 AND track_id = $4)', [lg.id, b.user.id, ra.total_ms - rb.total_ms, five[4]]);
    const tied = await leagues.scoreboard(db, lg);
    assert.equal(tied[0].total_ms, tied[1].total_ms);
    assert.equal(tied[0].user_id, a.user.id, 'A set the total first');
    assert.deepEqual(tied.map((r) => r.place), [1, 2]);

    // My leagues.
    const mine = (await call('/leagues/mine', { token: b.token })).body.leagues;
    assert.equal(mine.length, 1);
    assert.equal(mine[0].code, code);
    assert.equal(mine[0].done, 5);

    // The end: frozen places; no more races; Run again keeps the group (the creator only).
    await db.query('UPDATE leagues SET ends_at = now() WHERE id = $1', [lg.id]);
    assert.ok(await leagues.endDue(db, new Date(Date.now() + 1000)) >= 1);
    view = (await call(`/leagues/${code}`, { token: a.token })).body;
    assert.equal(view.league.status, 'ended');
    assert.deepEqual(view.scoreboard.map((r) => r.place), [1, 2]);
    assert.equal((await call(`/leagues/${code}/race`, { method: 'POST', token: b.token, body: { track_id: five[1] } })).status, 409);
    assert.equal((await call(`/leagues/${code}/again`, { method: 'POST', token: b.token })).status, 403);
    const fresh = await call(`/leagues/${code}/again`, { method: 'POST', token: a.token });
    assert.equal(fresh.status, 201);
    assert.notEqual(fresh.body.league.code, code);
    assert.deepEqual(fresh.body.tracks.map((t) => t.id), five);
    assert.equal(fresh.body.scoreboard.length, 2);

    // At most 5 open leagues per creator (the Run again above is one).
    for (let k = 0; k < 4; k += 1) assert.equal((await call('/leagues', { method: 'POST', token: a.token, body: { name: `L${k}`, track_ids: five, days: 1 } })).status, 201);
    assert.equal((await call('/leagues', { method: 'POST', token: a.token, body: { name: 'One too many', track_ids: five, days: 1 } })).status, 409);

    // League races never wrote league_results (Pro Leagues only, part 2).
    const { rows: [{ n }] } = await db.query('SELECT COUNT(*)::int AS n FROM league_results WHERE league_id = $1', [lg.id]);
    assert.equal(n, 0);
  } finally {
    process.env.LEAGUES = 'off';
    raceManager.shutdown();
    server.close();
  }
});

test('League Night: set by the creator, its room opens 15 minutes before, races in order, points, never a try', { skip: !DB }, async () => {
  process.env.LEAGUES = 'on';
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const raceManager = require('../src/game/raceManager');
  const raceService = require('../src/game/raceService');
  const rooms = require('../src/routes/rooms');
  const night = require('../src/leagues/night');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (p, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + p, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const register = async (name) => (await call('/auth/register', { method: 'POST', body: { username: name, email: `${name}@test.invalid`, password: 'password123', age_group: '18+' } })).body;
  const stamp = Date.now().toString(36).slice(-5);
  try {
    const [a, b, c, outsider] = [await register(`lnA${stamp}`), await register(`lnB${stamp}`), await register(`lnC${stamp}`), await register(`lnX${stamp}`)];
    const { rows: tracks } = await db.query('SELECT id FROM tracks WHERE is_active AND season_key IS NULL ORDER BY physics IS NULL, slug LIMIT 5');
    const five = tracks.map((t) => t.id);
    const { code } = (await call('/leagues', { method: 'POST', token: a.token, body: { name: 'Night league', track_ids: five, days: 2 } })).body.league;
    for (const p of [b, c]) await call(`/leagues/${code}/join`, { method: 'POST', token: p.token });
    const { rows: [lg] } = await db.query('SELECT * FROM leagues WHERE code = $1', [code]);

    // Set: the creator only, 3 to 5 races, at least 5 minutes ahead, finished before the league ends.
    const at = new Date(Date.now() + 60 * 60_000);
    assert.equal((await call(`/leagues/${code}/night`, { method: 'POST', token: b.token, body: { starts_at: at.toISOString(), races: 3 } })).status, 403);
    assert.equal((await call(`/leagues/${code}/night`, { method: 'POST', token: a.token, body: { starts_at: at.toISOString(), races: 6 } })).status, 400);
    assert.equal((await call(`/leagues/${code}/night`, { method: 'POST', token: a.token, body: { starts_at: new Date(Date.now() + 60_000).toISOString(), races: 3 } })).status, 400);
    assert.equal((await call(`/leagues/${code}/night`, { method: 'POST', token: a.token, body: { starts_at: new Date(Date.now() + 3 * 86_400_000).toISOString(), races: 3 } })).status, 400);
    const set = await call(`/leagues/${code}/night`, { method: 'POST', token: a.token, body: { starts_at: at.toISOString(), races: 3 } });
    assert.equal(set.status, 200, JSON.stringify(set.body));
    assert.equal(set.body.night.status, 'scheduled');
    assert.equal(set.body.night.races, 3);
    assert.equal(set.body.night.room_code, null);
    assert.equal((await call('/leagues/mine', { token: b.token })).body.leagues[0].night.status, 'scheduled');

    // 15 minutes before: the room opens with the first race on the league's first track, starting by itself at the time set.
    assert.equal((await night.openDue(db, new Date(at.getTime() - 16 * 60_000))).some((o) => o.leagueId === lg.id), false);
    const opened = (await night.openDue(db, new Date(at.getTime() - 14 * 60_000))).find((o) => o.leagueId === lg.id);
    raceManager.unscheduleStart(opened.raceId); // (run by hand below)
    let view = (await call(`/leagues/${code}`, { token: b.token })).body;
    assert.equal(view.night.status, 'open');
    assert.equal(view.night.room_code, opened.code);
    const room = (await call(`/rooms/${opened.code}`, { token: b.token })).body;
    assert.equal(room.night.league.code, code);
    assert.equal(room.night.race, 1);
    assert.equal(room.night.races, 3);
    assert.equal(room.room.public, false);
    const { rows: [r1] } = await db.query('SELECT * FROM races WHERE id = $1', [opened.raceId]);
    assert.equal(r1.track_id, five[0]);
    assert.equal(new Date(r1.scheduled_at).getTime(), at.getTime());
    assert.equal(r1.league_id, null); // (never a league race: no try used)

    // The league's players join; anyone else can't; the host can't change the track or make it public.
    for (const p of [a, b, c]) assert.equal((await call(`/rooms/${opened.code}/join`, { method: 'POST', token: p.token })).status, 200);
    const out = await call(`/rooms/${opened.code}/join`, { method: 'POST', token: outsider.token });
    assert.equal(out.status, 403);
    assert.equal(out.body.details.code, 'league_only');
    assert.equal((await call(`/rooms/${opened.code}/track`, { method: 'POST', token: a.token, body: { random: true } })).status, 409);
    assert.equal((await call(`/rooms/${opened.code}/visibility`, { method: 'POST', token: a.token, body: { public: true } })).status, 409);

    // The three races, one after another on the league's tracks in order; each next one starts by itself.
    const runNightRace = async (raceId) => {
      await raceManager.start(raceId, null);
      raceManager.stop(raceId);
      await raceService.finalize(raceId);
      await rooms.afterRace(raceId);
    };
    await runNightRace(opened.raceId);
    let { rows: [r2] } = await db.query('SELECT * FROM races WHERE league_night_race = 2 AND room_id = (SELECT id FROM rooms WHERE code = $1)', [opened.code]);
    assert.equal(r2.track_id, five[1]);
    assert.ok(new Date(r2.scheduled_at) > new Date(Date.now() + 60_000));
    raceManager.unscheduleStart(r2.id);
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM race_entries WHERE race_id = $1 AND NOT is_bot', [r2.id])).rows[0].n, 3);
    await runNightRace(r2.id);
    const { rows: [r3] } = await db.query('SELECT * FROM races WHERE league_night_race = 3 AND room_id = (SELECT id FROM rooms WHERE code = $1)', [opened.code]);
    assert.equal(r3.track_id, five[2]);
    raceManager.unscheduleStart(r3.id);
    await runNightRace(r3.id);

    // Over: the room closes; the night's scoreboard from the places among the league's players.
    view = (await call(`/leagues/${code}`, { token: a.token })).body;
    assert.equal(view.night.status, 'done');
    assert.equal((await db.query('SELECT status FROM rooms WHERE code = $1', [opened.code])).rows[0].status, 'closed');
    assert.equal(view.night.race_list.length, 3);
    assert.equal(view.night.standings.length, 3);
    const { rows: places } = await db.query(
      `SELECT e.race_id, e.user_id, e.finish_position FROM race_entries e WHERE e.race_id = ANY($1::uuid[]) AND NOT e.is_bot ORDER BY e.race_id, e.finish_position`,
      [[opened.raceId, r2.id, r3.id]],
    );
    const want = new Map();
    for (const id of [opened.raceId, r2.id, r3.id]) places.filter((p) => p.race_id === id).forEach((p, rank) => want.set(p.user_id, (want.get(p.user_id) ?? 0) + night.POINTS[rank]));
    for (const s of view.night.standings) assert.equal(s.points, want.get(s.user_id), s.name);
    assert.deepEqual(view.night.standings.map((s) => s.place), [1, 2, 3]);
    assert.ok(view.night.standings[0].points >= view.night.standings[1].points);
    assert.equal(view.night.standings.reduce((n, s) => n + s.wins, 0), 3);
    // Never a try: the league's own scoreboard has no times from it.
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM league_runs WHERE league_id = $1', [lg.id])).rows[0].n, 0);
    assert.ok(view.scoreboard.every((r) => r.done === 0));

    // A night nobody comes to: called off at its time, its room closed. And one called off before.
    const at2 = new Date(Date.now() + 30 * 60_000);
    await call(`/leagues/${code}/night`, { method: 'POST', token: a.token, body: { starts_at: at2.toISOString(), races: 3 } });
    const o2 = (await night.openDue(db, new Date(at2.getTime() - 10 * 60_000))).find((o) => o.leagueId === lg.id);
    raceManager.unscheduleStart(o2.raceId);
    await db.query('UPDATE races SET scheduled_at = now() WHERE id = $1', [o2.raceId]);
    assert.equal(await raceManager.startScheduled(o2.raceId), false);
    view = (await call(`/leagues/${code}`, { token: a.token })).body;
    assert.equal(view.night.status, 'cancelled');
    await call(`/leagues/${code}/night`, { method: 'POST', token: a.token, body: { starts_at: at2.toISOString(), races: 4 } });
    assert.equal((await call(`/leagues/${code}/night`, { method: 'DELETE', token: b.token })).status, 403);
    view = (await call(`/leagues/${code}/night`, { method: 'DELETE', token: a.token })).body;
    assert.equal(view.night.status, 'cancelled');

    // "Start League Night now": the creator only; the room opens at once, race 1 two minutes later.
    assert.equal((await call(`/leagues/${code}/night`, { method: 'POST', token: b.token, body: { now: true, races: 3 } })).status, 403);
    assert.equal((await call(`/leagues/${code}/night`, { method: 'POST', token: a.token, body: { races: 3 } })).status, 400);
    const t0 = Date.now();
    const nowSet = await call(`/leagues/${code}/night`, { method: 'POST', token: a.token, body: { now: true, races: 3 } });
    assert.equal(nowSet.status, 200, JSON.stringify(nowSet.body));
    assert.equal(nowSet.body.night.status, 'open');
    assert.ok(nowSet.body.night.room_code);
    const lead = new Date(nowSet.body.night.starts_at).getTime() - t0;
    assert.ok(lead > 100_000 && lead < 125_000, `starts ${lead} ms after`);
    const { rows: [first] } = await db.query('SELECT scheduled_at FROM races WHERE league_night_race = 1 AND room_id = (SELECT id FROM rooms WHERE code = $1)', [nowSet.body.night.room_code]);
    assert.equal(new Date(first.scheduled_at).getTime(), new Date(nowSet.body.night.starts_at).getTime());
    assert.equal((await call(`/leagues/${code}/night`, { method: 'POST', token: a.token, body: { now: true, races: 3 } })).status, 409);
    view = (await call(`/leagues/${code}/night`, { method: 'DELETE', token: a.token })).body;
    assert.equal(view.night.status, 'cancelled');
  } finally {
    process.env.LEAGUES = 'off';
    raceManager.shutdown();
    server.close();
    await db.pool?.end?.();
  }
});
