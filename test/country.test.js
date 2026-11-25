'use strict';

// The country a player races for (Moses, 22 Oct 2026; src/country): optional, chosen by the player,
// the first choice free, corrections for 24 hours, then one change every 90 days; the history for
// "the country at the start of the month"; the country records per track (saved players' own marbles
// in finished races, with the country they had when they joined).
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';

const country = require('../src/country');
const { countries } = require('../client/src/shared/countries.json');

const DAY = 24 * 3600 * 1000;

test('the list: every ISO 3166-1 country, two capital letters, named in English', () => {
  assert.equal(Object.keys(countries).length, 249);
  for (const [code, name] of Object.entries(countries)) {
    assert.match(code, /^[A-Z]{2}$/);
    assert.ok(name && name !== code, code);
  }
  assert.equal(country.nameOf('SE'), 'Sweden');
  assert.ok(country.isCountry('TW') && country.isCountry('PS'));
  assert.ok(!country.isCountry('XX') && !country.isCountry('se') && !country.isCountry('hasOwnProperty'));
});

test('the change rule, worked out from when the player last chose', () => {
  const t0 = new Date('2026-11-01T10:00:00Z');
  assert.deepEqual(country.status({ country: null, country_chosen_at: null }, t0), { country: null, name: null, chosenAt: null, correctionUntil: null, nextChangeAt: null, canChange: true });
  const row = { country: 'SE', country_chosen_at: t0 };
  const at = (ms) => country.status(row, new Date(t0.getTime() + ms));
  assert.equal(at(3600 * 1000).correctionUntil, '2026-11-02T10:00:00.000Z'); // (a correction for 24 hours)
  assert.equal(at(3600 * 1000).canChange, true);
  const locked = at(2 * DAY);
  assert.equal(locked.canChange, false);
  assert.equal(locked.nextChangeAt, '2027-01-30T10:00:00.000Z'); // (90 days after choosing)
  assert.equal(at(90 * DAY).canChange, true);
});

test('choosing a country on a real database, its history, and the country records', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const records = require('../src/country/records');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const run = crypto.randomBytes(3).toString('hex');
  const reg = async (name, extra = {}) => (await call('/auth/register', { method: 'POST', body: { username: `${name}_${run}`, email: `${name.toLowerCase()}_${run}@test.invalid`, password: 'password123', birth_year: 1990, birth_month: 5, ...extra } })).body;
  try {
    // Chosen when saving the account (optional), or later in Settings.
    const sv = await reg('Sven', { country: 'SE' });
    assert.equal(sv.user.country, 'SE');
    const none = await reg('Nobody');
    assert.equal(none.user.country, null);
    assert.equal((await call('/auth/register', { method: 'POST', body: { username: `Bad_${run}`, email: `bad_${run}@test.invalid`, password: 'password123', birth_year: 1990, birth_month: 5, country: 'XX' } })).status, 400);
    const st = (await call('/users/me/country', { token: none.token })).body;
    assert.equal(st.country, null);
    assert.equal(st.canChange, true);
    assert.equal(st.suggested, null); // (a local address has no country)
    assert.equal(st.changeDays, 90);

    // The first choice, a correction within 24 hours, then locked for 90 days.
    assert.equal((await call('/users/me/country', { method: 'PUT', token: none.token, body: { country: 'NO' } })).body.country, 'NO');
    const corrected = (await call('/users/me/country', { method: 'PUT', token: none.token, body: { country: 'dk' } })).body;
    assert.equal(corrected.country, 'DK');
    assert.ok(corrected.correctionUntil);
    await db.query(`UPDATE users SET country_chosen_at = now() - interval '2 days' WHERE id = $1`, [none.user.id]);
    const early = await call('/users/me/country', { method: 'PUT', token: none.token, body: { country: 'FI' } });
    assert.equal(early.status, 409);
    assert.equal(early.body.details.code, 'country_locked');
    assert.match(early.body.error ?? early.body.message, /once every 90 days/);
    // Removing is always allowed, but choosing again still waits for the 90 days.
    assert.equal((await call('/users/me/country', { method: 'PUT', token: none.token, body: { country: null } })).body.country, null);
    assert.equal((await call('/users/me/country', { method: 'PUT', token: none.token, body: { country: 'FI' } })).status, 409);
    await db.query(`UPDATE users SET country_chosen_at = now() - interval '91 days' WHERE id = $1`, [none.user.id]);
    assert.equal((await call('/users/me/country', { method: 'PUT', token: none.token, body: { country: 'FI' } })).body.country, 'FI');
    assert.equal((await call('/users/me/country', { method: 'PUT', token: none.token, body: {} })).status, 400);
    const { rows: hist } = await db.query('SELECT country, kind FROM user_country_history WHERE user_id = $1 ORDER BY id', [none.user.id]);
    assert.deepEqual(hist.map((h) => `${h.kind}:${h.country}`), ['first:NO', 'correction:DK', 'removed:null', 'change:FI']);

    // The country at a moment (national leagues: the start of the month).
    const { rows: [first] } = await db.query('SELECT created_at FROM user_country_history WHERE user_id = $1 ORDER BY id LIMIT 1', [none.user.id]);
    assert.equal(await country.countryAt(db, none.user.id, new Date(first.created_at.getTime() - 1000)), null);
    assert.equal(await country.countryAt(db, none.user.id, new Date()), 'FI');

    // Guests can't choose one.
    const guest = (await call('/auth/guest', { method: 'POST', body: {} })).body;
    assert.equal((await call('/users/me/country', { method: 'PUT', token: guest.token, body: { country: 'SE' } })).status, 400);

    // Country records: a finished race on a live track, two Swedes, a Finn, a guest and computer players.
    const { rows: [track] } = await db.query(`SELECT id, slug FROM tracks WHERE is_active AND season_key IS NULL ORDER BY slug LIMIT 1`);
    await db.query(`DELETE FROM races WHERE name = 'country-test'`); // (an earlier run's races)
    const sv2 = await reg('Sara', { country: 'SE' });
    const marbleOf = async (userId) => (await db.query('SELECT id FROM marbles WHERE owner_id = $1 ORDER BY starter_no LIMIT 1', [userId])).rows[0].id;
    const { rows: [bot] } = await db.query('SELECT id FROM marbles WHERE owner_id IS NULL LIMIT 1');
    const race = async (entries, finished = true) => {
      const { rows: [r] } = await db.query(`INSERT INTO races (name, track_id, status, seed, target_duration_ms, track_snapshot, decided_at, started_at, finished_at) VALUES ('country-test', $1, $2, 1, 60000, '{}'::jsonb, now(), now(), now()) RETURNING id`, [track.id, finished ? 'finished' : 'cancelled']);
      for (const [k, e] of entries.entries()) {
        await db.query('INSERT INTO race_entries (race_id, marble_id, user_id, is_bot, lane, finish_position, finish_time_ms) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [r.id, e.user ? await marbleOf(e.user) : bot.id, e.user ?? null, !e.user, k, k + 1, e.ms]);
      }
      return r.id;
    };
    const guestMarble = await db.query(`SELECT id FROM marbles WHERE owner_id = $1 LIMIT 1`, [guest.user.id]);
    await race([{ ms: 40000 }, { user: sv.user.id, ms: 51000 }, { user: sv2.user.id, ms: 49500 }, { user: none.user.id, ms: 52000 }]);
    await race([{ user: sv.user.id, ms: 30000 }], false); // (not finished: never counts)
    if (guestMarble.rows[0]) await race([{ user: guest.user.id, ms: 20000 }]); // (a guest: no country, never counts)
    records.clearCache();
    const byTrack = (await call(`/scoreboard/countries?track=${track.slug}`)).body;
    const mine = byTrack.records.filter((r) => [sv.user.id, sv2.user.id, none.user.id].includes(r.userId));
    assert.deepEqual(mine.map((r) => [r.country, r.ms, r.userId]), [['SE', 49500, sv2.user.id], ['FI', 52000, none.user.id]]);
    assert.equal(mine[0].name, 'Sweden');
    assert.ok(!byTrack.records.some((r) => r.ms === 40000 || r.ms === 30000 || r.ms === 20000));

    // A change of country later never moves an old record.
    await db.query(`UPDATE users SET country = 'DE' WHERE id = $1`, [sv2.user.id]);
    records.clearCache();
    const se = (await call('/scoreboard/countries/se')).body;
    assert.equal(se.name, 'Sweden');
    assert.ok(se.records.some((r) => r.slug === track.slug && r.userId === sv2.user.id && r.ms === 49500));
    assert.equal((await call('/scoreboard/countries/XX')).status, 404);
    assert.equal((await call('/scoreboard/countries?track=no-such-track')).status, 404);

    // Download my data has it; deleting the account takes the player off the records.
    const exp = await fetch(`${base}/users/me/export`, { headers: { authorization: `Bearer ${none.token}` } }).then((r) => r.json());
    assert.equal(exp.account.country, 'FI');
    assert.equal(exp.countryYouRaceFor.history.length, 4);
    assert.equal((await call('/users/me', { method: 'DELETE', token: none.token, body: { confirm: 'DELETE', password: 'password123' } })).status, 200);
    records.clearCache();
    const after = (await call(`/scoreboard/countries?track=${track.slug}`)).body;
    assert.ok(!after.records.some((r) => r.userId === none.user.id));
    const { rows: [gone] } = await db.query('SELECT country, country_chosen_at FROM users WHERE id = $1', [none.user.id]);
    assert.deepEqual(gone, { country: null, country_chosen_at: null });
  } finally {
    await db.query(`DELETE FROM races WHERE name = 'country-test'`).catch(() => {});
    server.close();
    await db.pool.end();
  }
});
