'use strict';

// Wildness and track packs (Moses, 11 Nov 2026; src/packs, scripts/wildness.js, docs/04-game-rules.md).
// Always: the TRACK_PACKS switch (off unless set), the score's levels and ranks, the packs and the free set.
// Against a real database (ROOMS_TEST_DATABASE_URL): with the switch off nothing is locked; with it on a pack
// track is refused unless the player owns the pack or races in a friend room whose host owns it, the
// random pick keeps to free tracks, and the track list says which pack; the list carries wildness.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
delete process.env.TRACK_PACKS;

const packs = require('../src/packs');
const { PACKS, FREE, BLOCKS_2, packFor, isFree } = require('../src/packs/list');
const { score, levelOf } = require('../scripts/wildness');

test('the TRACK_PACKS switch is off unless set: nothing is locked', async () => {
  assert.equal(packs.mode({}), 'off');
  assert.equal(packs.mode({ TRACK_PACKS: 'yes' }), 'off');
  assert.equal(packs.mode({ TRACK_PACKS: ' ON ' }), 'on');
  assert.equal(packs.lockingFor('admin', {}), false);
  assert.equal(packs.lockingFor('player', { TRACK_PACKS: 'admins' }), false);
  assert.equal(packs.lockingFor('admin', { TRACK_PACKS: 'admins' }), true);
  assert.equal(packs.lockingOn({ TRACK_PACKS: 'admins' }), false);
  // (Off: no query at all, whatever the track.)
  const db = { query: () => { throw new Error('no query with the switch off'); } };
  assert.deepEqual(await packs.trackAccess(db, { slug: 'grand-champion', pack_key: 'pinball', is_free: false }, { userId: 'u', env: {} }), { ok: true });
});

test('the levels: Easy 0–32, Wild 33–46, Extreme 47 and up', () => {
  assert.equal(levelOf(0), 'easy');
  assert.equal(levelOf(32), 'easy');
  assert.equal(levelOf(33), 'wild');
  assert.equal(levelOf(46), 'wild');
  assert.equal(levelOf(47), 'extreme');
  assert.equal(levelOf(100), 'extreme');
});

test('the score: ranks among the tracks (60) plus features (up to 40)', () => {
  const t = (slug, v, f = {}) => ({ slug, overtakes: v, leadChanges: v, hits: v, gapS: v, favouriteGroupShare: 100 - v, loops: 0, jumps: 0, splitters: 0, drops: 0, ...f });
  const [low, mid, high] = score([t('low', 1), t('mid', 2), t('high', 3, { loops: 2, jumps: 1, splitters: 3, drops: 9 })]);
  assert.equal(low.score, 0);
  assert.equal(mid.score, 30);
  assert.equal(high.race, 60);
  assert.equal(high.features, 39); // (loop 10 + jump 8 + 2 splitters 12 + 3 drops 9: each capped)
  assert.equal(high.score, 99);
  assert.equal(high.wildness, 'extreme');
});

test('the packs: one per series, Pinball and Arcade separate, Blocks 1 and Blocks 2', () => {
  assert.deepEqual(PACKS.map((p) => p.key), ['grand-prix', 'world-tour', 'coasters', 'canyons', 'blocks-1', 'blocks-2', 'track-and-field', 'rivers', 'peaks', 'pinball', 'arcade']);
  assert.equal(packFor('tilt', 'Pinball'), 'pinball');
  assert.equal(packFor('kill-screen', 'Arcade'), 'arcade');
  assert.equal(packFor('spawn-point', 'Blocks'), 'blocks-1');
  assert.equal(packFor('venice-cube-canals', 'Blocks'), 'blocks-2');
  assert.equal(BLOCKS_2.length, 20);
  assert.equal(packFor('x', 'Classic'), null);
});

const W = path.join(__dirname, '..', 'src', 'tracks', 'wildness.json');
test('the free set: 3 per series, 30 in all, mostly Easy and Wild, at most 2 Extreme (12 Nov 2026)', () => {
  const free = Object.values(FREE).flat();
  assert.equal(free.length, 30);
  assert.equal(new Set(free).size, 30);
  for (const [series, list] of Object.entries(FREE)) assert.equal(list.length, 3, series);
  assert.ok(isFree('tilt') && !isFree('grand-champion') && !isFree('nairobi-marble-grand-prix'));
  if (!fs.existsSync(W)) return;
  const { tracks } = JSON.parse(fs.readFileSync(W, 'utf8'));
  const by = new Map(tracks.map((t) => [t.slug, t]));
  for (const [series, list] of Object.entries(FREE)) for (const s of list) assert.equal(by.get(s)?.series, series, s);
  assert.ok(free.filter((s) => by.get(s).wildness === 'extreme').length <= 2);
  // (Each series' landing-page picture is among its free three.)
  const landing = fs.readFileSync(path.join(__dirname, '..', 'client', 'src', 'site', 'landing', 'LandingPage.jsx'), 'utf8');
  for (const [, series, slug] of landing.matchAll(/\['([A-Za-z ]+)', '[^']*', '[^']*', '([a-z0-9-]+)'/g)) if (FREE[series]) assert.ok(FREE[series].includes(slug), `${series}: ${slug}`);
});

const UPDATES = path.join(__dirname, '..', 'docs', 'data_updates');
test('wildness.json: every live track scored from the full report races; the data updates', () => {
  if (!fs.existsSync(W)) return;
  const data = JSON.parse(fs.readFileSync(W, 'utf8'));
  assert.ok(data.racesPerTrack >= 1000);
  assert.equal(data.tracks.length, 143);
  for (const t of data.tracks) assert.equal(levelOf(t.score), t.wildness, t.slug);
  // 2027-06-10 has run on the live server (12 Nov 2026): its scores are wildness.json's, never edited.
  const first = fs.readFileSync(path.join(UPDATES, '2027-06-10-wildness-and-track-packs.sql'), 'utf8');
  for (const t of data.tracks) assert.ok(first.includes(`('${t.slug}', ${t.score}, '${t.wildness}', `), t.slug);
  assert.equal((first.match(/, true\)/g) ?? []).length, 45); // (the first free set)
  // 2027-06-11: the free set of 30, exactly src/packs/list.js.
  const second = fs.readFileSync(path.join(UPDATES, '2027-06-11-free-set-of-30.sql'), 'utf8');
  const inSql = [...second.replace(/--.*$/gm, '').matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]);
  assert.deepEqual(inSql.sort(), Object.values(FREE).flat().sort());
  assert.match(second, /WHERE pack_key IS NOT NULL/); // (season tracks untouched)
  for (const sql of [first, second]) assert.doesNotMatch(sql.replace(/--.*$/gm, ''), /is_active|product_id|price/); // (switches nothing on, sells nothing)
  // (The newest data update sorts last.)
  assert.equal(fs.readdirSync(UPDATES).filter((f) => f.endsWith('.sql')).sort().at(-1), '2027-06-11-free-set-of-30.sql');
});

test('with the switch on: a pack track only for its owners and their friend rooms; off again: open to all', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const seasons = require('../src/seasons');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (p, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + p, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const run = crypto.randomBytes(3).toString('hex');
  const key = `test-pack-${run}`;
  try {
    await db.query(`INSERT INTO track_packs (key, name, series) VALUES ($1, 'Test Pack', 'Test')`, [key]);
    const { rows: [packed] } = await db.query(
      `INSERT INTO tracks (slug, name, difficulty, length_m, lane_count, waypoints, obstacles, is_active, pack_key, is_free, wildness, wildness_score)
       SELECT $1, 'Packed Run', difficulty, length_m, lane_count, waypoints, obstacles, true, $2, false, 'extreme', 61 FROM tracks WHERE slug = 'meadow-loop' RETURNING id, slug`,
      [`${key}-packed`, key],
    );
    const { rows: [freeOne] } = await db.query(
      `INSERT INTO tracks (slug, name, difficulty, length_m, lane_count, waypoints, obstacles, is_active, pack_key, is_free, wildness, wildness_score)
       SELECT $1, 'Free Run', difficulty, length_m, lane_count, waypoints, obstacles, true, $2, true, 'easy', 20 FROM tracks WHERE slug = 'meadow-loop' RETURNING id, slug`,
      [`${key}-free`, key],
    );
    const account = async (tag) => {
      const name = `t_pk_${tag}_${run}`;
      return (await call('/auth/register', { method: 'POST', body: { username: name, email: `${name}@test.invalid`, password: 'password123', age_group: '18+' } })).body;
    };
    const owner = await account('o');
    const friend = await account('f');
    await db.query(`INSERT INTO pack_owners (user_id, pack_key, provider) VALUES ($1, $2, 'test')`, [owner.user.id, key]);

    // Off (the default): the list carries wildness and the pack, nothing locked, anyone races it.
    let row = (await call('/tracks', { token: friend.token })).body.tracks.find((t) => t.id === packed.id);
    assert.equal(row.wildness, 'extreme');
    assert.equal(row.wildness_score, 61);
    assert.deepEqual(row.pack, { key, name: 'Test Pack' });
    assert.equal(row.is_free, false);
    assert.equal(row.locked, undefined);
    assert.equal((await call('/races', { method: 'POST', token: friend.token, body: { track_id: packed.id, enter: true } })).status, 201);

    // On: locked for the friend, refused on every request; free tracks and the owner as before.
    process.env.TRACK_PACKS = 'on';
    row = (await call('/tracks', { token: friend.token })).body.tracks.find((t) => t.id === packed.id);
    assert.equal(row.locked, true);
    assert.equal(row.lockedBy, 'pack');
    assert.equal((await call('/tracks', { token: friend.token })).body.tracks.find((t) => t.id === freeOne.id).locked, undefined);
    const refused = await call('/races', { method: 'POST', token: friend.token, body: { track_id: packed.id, enter: true } });
    assert.equal(refused.status, 403);
    assert.equal(refused.body.error, 'This track is in the Test Pack pack');
    assert.equal(refused.body.details.code, 'pack_required');
    assert.equal((await call('/rooms', { method: 'POST', token: friend.token, body: { track_id: packed.id } })).status, 403);
    assert.equal((await call('/races', { method: 'POST', token: friend.token, body: { track_id: freeOne.id, enter: true } })).status, 201);
    assert.equal((await call('/tracks', { token: owner.token })).body.tracks.find((t) => t.id === packed.id).locked, undefined);
    const mine = await call('/races', { method: 'POST', token: owner.token, body: { track_id: packed.id, enter: true } });
    assert.equal(mine.status, 201);
    assert.equal((await call(`/races/${mine.body.race.id}/join`, { method: 'POST', token: friend.token, body: {} })).status, 403);
    assert.equal((await call(`/races/${mine.body.race.id}`)).status, 200); // (watching is open)
    // A friend room hosted by the owner on the pack track: everyone in it races.
    const room = await call('/rooms', { method: 'POST', token: owner.token, body: { track_id: packed.id } });
    assert.equal(room.status, 201);
    assert.equal((await call(`/rooms/${room.body.room.code}/join`, { method: 'POST', token: friend.token })).status, 200);
    // The public random pick keeps to free tracks.
    for (let i = 0; i < 25; i += 1) assert.notEqual(await seasons.pickOpenTrack(db), packed.id);

    // 'admins': only admins are locked out (to try it); players race as with it off.
    process.env.TRACK_PACKS = 'admins';
    assert.equal((await call('/races', { method: 'POST', token: friend.token, body: { track_id: packed.id, enter: true } })).status, 201);
  } finally {
    delete process.env.TRACK_PACKS;
    server.close();
    await db.query('DELETE FROM tracks WHERE slug LIKE $1', [`${key}-%`]).catch(() => {});
    await db.end?.();
  }
});
