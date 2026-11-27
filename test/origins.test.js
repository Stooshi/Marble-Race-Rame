'use strict';

// Where new players come from (Moses, 13 Nov 2026; src/origins): utm_source / utm_medium / utm_campaign, or if
// none the referring site's domain only, kept once per account (first touch, never overwritten), without
// cookies; the Dashboard's "Where players come from" table for the last 7 and 30 days.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
const origins = require('../src/origins');

test('only the three UTM values, or else the referring domain: cleaned, nothing else', () => {
  assert.deepEqual(origins.clean({ utm_source: 'TikTok', utm_medium: 'Paid Social', utm_campaign: 'nevada_launch', referrer: 'https://x.com/a' }),
    { source: 'tiktok', medium: 'paid-social', campaign: 'nevada_launch', referrer: null });
  assert.deepEqual(origins.clean({ utm_campaign: 'nov' }), { source: null, medium: null, campaign: 'nov', referrer: null });
  // (The referrer: the domain only, never the path or the query; www. dropped; our own sites never count.)
  assert.deepEqual(origins.clean({ referrer: 'https://www.Reddit.com/r/marbles/comments/abc?x=1' }), { source: null, medium: null, campaign: null, referrer: 'reddit.com' });
  assert.deepEqual(origins.clean({ referrer: 'l.instagram.com' }), { source: null, medium: null, campaign: null, referrer: 'l.instagram.com' });
  assert.equal(origins.clean({ referrer: 'https://marblespins.com/tracks' }), null);
  assert.equal(origins.clean({ referrer: 'checkout.stripe.com' }), null);
  assert.equal(origins.clean({ referrer: 'not a domain' }), null);
  assert.equal(origins.clean({ utm_source: '   ' }), null);
  assert.equal(origins.clean(null), null);
  assert.equal(origins.clean('tiktok'), null);
  assert.equal(origins.cleanTag('<script>alert(1)</script>'), 'scriptalert1script');
  assert.equal(origins.cleanTag('x'.repeat(200)).length, 64);
  assert.equal(origins.cleanTag(42), null);
  // (Other keys are never kept.)
  assert.deepEqual(Object.keys(origins.clean({ utm_source: 'a', email: 'x@y.z', gclid: 'abc' })).sort(), ['campaign', 'medium', 'referrer', 'source']);
});

test('the schema only adds the table; the guest and sign-up routes keep the origin', () => {
  const schema = fs.readFileSync(require.resolve('../docs/database_schema.sql'), 'utf8');
  assert.match(schema, /CREATE TABLE IF NOT EXISTS player_origins \(\s*user_id\s+uuid\s+PRIMARY KEY REFERENCES users\(id\) ON DELETE CASCADE/);
  const auth = fs.readFileSync(require.resolve('../src/routes/auth.js'), 'utf8');
  assert.equal((auth.match(/require\('\.\.\/origins'\)\.record\(user\.id, req\.body\?\.origin\)/g) ?? []).length, 2);
});

test('on a real database: first touch only, for guests and sign-ups; the Dashboard table', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const row = async (id) => (await db.query('SELECT utm_source, utm_medium, utm_campaign, referrer_domain FROM player_origins WHERE user_id = $1', [id])).rows[0] ?? null;
  try {
    const tag = `t${Date.now() % 1e6}`;
    const g = (await call('/auth/guest', { method: 'POST', body: { source: 'quick', origin: { utm_source: `tiktok-${tag}`, utm_medium: 'video', utm_campaign: 'nevada' } } })).body;
    assert.deepEqual(await row(g.user.id), { utm_source: `tiktok-${tag}`, utm_medium: 'video', utm_campaign: 'nevada', referrer_domain: null });
    // First touch: a later origin never overwrites it (saving the account sends none; a second record is ignored).
    assert.equal(await origins.record(g.user.id, { utm_source: 'other' }), false);
    assert.equal((await row(g.user.id)).utm_source, `tiktok-${tag}`);
    // The referrer only when there are no UTM values; nothing at all: no row.
    const r = (await call('/auth/guest', { method: 'POST', body: { source: 'solo', origin: { referrer: 'https://www.reddit.com/r/x' } } })).body;
    assert.deepEqual(await row(r.user.id), { utm_source: null, utm_medium: null, utm_campaign: null, referrer_domain: 'reddit.com' });
    const none = (await call('/auth/guest', { method: 'POST', body: { source: 'solo' } })).body;
    assert.equal(await row(none.user.id), null);
    // A direct sign-up keeps it too.
    const name = `t_or_${Date.now() % 1e6}`;
    const s = (await call('/auth/register', { method: 'POST', body: { username: name, email: `${name}@test.invalid`, password: 'rightpassword1', age_group: '18+', origin: { utm_source: `ig-${tag}` } } })).body;
    assert.equal((await row(s.user.id)).utm_source, `ig-${tag}`);

    // The Dashboard: per source, new players, finished a race, 3+ races, saved accounts.
    const dash = require('../src/admin/dashboard');
    const seven = await dash.origins(db, 7);
    const tik = seven.find((x) => x.source === `tiktok-${tag}`);
    assert.deepEqual(tik, { source: `tiktok-${tag}`, newPlayers: 1, finishedRace: 0, threeRaces: 0, saved: 0 });
    assert.deepEqual(seven.find((x) => x.source === `ig-${tag}`), { source: `ig-${tag}`, newPlayers: 1, finishedRace: 0, threeRaces: 0, saved: 1 });
    assert.ok(seven.find((x) => x.source === '(direct or unknown)').newPlayers >= 1);
    assert.ok(seven.find((x) => x.source === 'reddit.com').newPlayers >= 1);
    const summary = await dash.summary(db, '24h');
    assert.deepEqual(Object.keys(summary.origins), ['7d', '30d']);

    // In the player's data download; gone when the account is deleted.
    const account = require('../src/account');
    assert.equal((await account.exportData(db, r.user.id)).howYouFoundUs.referrer_domain, 'reddit.com');
    const c = await db.pool.connect();
    try { await c.query('BEGIN'); await account.deleteAccount(c, r.user.id); await c.query('COMMIT'); } finally { c.release(); }
    assert.equal(await row(r.user.id), null);
  } finally {
    server.close();
    await db.pool?.end?.();
  }
});
