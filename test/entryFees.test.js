'use strict';

// Coin entry fees are switched off (decided 14 Oct 2026): every race is free to enter, so a race is
// never a bet. A fee paid before the switch is still returned when a player leaves or the race is cancelled.
const test = require('node:test');
const assert = require('node:assert/strict');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
const economy = require('../src/economy');

test('refundEntryFee returns only what the ledger shows was paid and not yet returned', async () => {
  const calls = [];
  const client = (owed) => ({
    async query(sql, params) {
      calls.push(sql);
      if (/AS owed/.test(sql)) return { rows: [{ owed }] };
      if (/UPDATE users SET coins/.test(sql)) return { rows: [{ balance: 1000 }] };
      if (/INSERT INTO coin_ledger/.test(sql)) return { rows: [{ id: 1 }] };
      return { rows: [] };
    },
  });
  assert.equal(await economy.refundEntryFee(client(0), 'u', 'r'), 0); // (nothing paid: nothing given)
  assert.equal(await economy.refundEntryFee(client(-5), 'u', 'r'), 0);
  assert.equal(await economy.refundEntryFee(client(250), 'u', 'r'), 250);
});

test('races are always free to enter, whatever the request asks', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  try {
    const name = `t_fee_${Date.now() % 1e6}`;
    const me = (await call('/auth/register', { method: 'POST', body: { username: name, email: `${name}@test.invalid`, password: 'password123', age_group: '18+' } })).body;
    const made = await call('/races', { method: 'POST', token: me.token, body: { random_track: true, entry_fee_coins: 500, scheduled_at: new Date(Date.now() + 3_600_000).toISOString() } });
    assert.equal(made.status, 201, JSON.stringify(made.body));
    const race = made.body.race;
    assert.equal(race.entry_fee_coins, 0);
    const { rows: [m] } = await db.query('SELECT id FROM marbles WHERE is_starter AND is_active LIMIT 1');
    const before = (await call('/auth/me', { token: me.token })).body.user.coins;
    const joined = await call(`/races/${race.id}/join`, { method: 'POST', token: me.token, body: { marble_id: m.id } });
    assert.ok(joined.status < 300, JSON.stringify(joined.body));
    assert.equal((await call('/auth/me', { token: me.token })).body.user.coins, before);
    assert.equal((await call(`/races/${race.id}/join`, { method: 'DELETE', token: me.token })).status, 204);
    assert.equal((await call('/auth/me', { token: me.token })).body.user.coins, before); // (nothing paid, nothing returned)
    const { rows } = await db.query(`SELECT 1 FROM coin_ledger WHERE race_id = $1 AND kind IN ('entry-fee', 'entry-refund')`, [race.id]);
    assert.equal(rows.length, 0);
  } finally {
    server.close();
    await db.pool?.end?.();
  }
});
