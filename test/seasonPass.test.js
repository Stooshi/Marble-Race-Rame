'use strict';

// Seasons and the season pass (src/seasons, src/payments): the season's dates, the Track of the Day
// and the pass sale always; against a real database (ROOMS_TEST_DATABASE_URL) the whole flow: a
// pass bought on Stripe (test mode) or Google Play (acknowledged, never consumed) unlocks the
// season's tracks, friend rooms hosted by a holder open them to everyone in the room, the Track of
// the Day bonus is its own ledger line kept off the scoreboards, and a refund locks them again.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const Stripe = require('stripe');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_for_tests';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fake_for_tests';
process.env.PUBLIC_SITE_URL = 'https://marblespins.test';
delete process.env.STRIPE_ALLOW_LIVE;

const seasons = require('../src/seasons');

// The Holiday Season 2026 as its data updates set it (the pass on sale from 28 Nov: 2027-03-22-holiday-pass-pre-sale).
const HOLIDAY = {
  key: 'holiday-2026', name: 'Holiday Season 2026', time_zone: 'Europe/Stockholm',
  starts_at: '2026-12-01T00:00:00+01:00', ends_at: '2027-01-07T23:59:59+01:00', free_from: '2027-01-07T23:59:59+01:00',
  pass_product_id: 'holiday-pass-2026', pass_name: 'Holiday Season Pass 2026', price_cents: 999, currency: 'usd',
  pass_sale_starts_at: '2026-11-28T00:00:00+01:00', pass_sale_ends_at: '2027-01-07T23:59:59+01:00',
  featured: { '2026-12-01': 'tromso-aurora-grand-prix', '2026-12-24': 'gamla-stan-christmas-run', '2027-01-07': 'lalibela-genna-spins' },
  featured_bonus: 0.5,
};

test('the season by its own dates: locked before 1 Dec, pass holders until 7 Jan 23:59 Swedish time, then free', () => {
  assert.equal(seasons.stateOf(HOLIDAY, new Date('2026-11-30T22:59:59Z')), 'before');
  assert.equal(seasons.stateOf(HOLIDAY, new Date('2026-11-30T23:00:00Z')), 'on'); // (midnight in Stockholm)
  assert.equal(seasons.stateOf(HOLIDAY, new Date('2027-01-07T22:59:58Z')), 'on');
  assert.equal(seasons.stateOf(HOLIDAY, new Date('2027-01-07T22:59:59Z')), 'free');
});

test('the Track of the Day goes by the Swedish calendar day', () => {
  assert.equal(seasons.featuredSlug(HOLIDAY, new Date('2026-11-30T23:30:00Z')), 'tromso-aurora-grand-prix'); // (00:30 on 1 Dec in Stockholm)
  assert.equal(seasons.featuredSlug(HOLIDAY, new Date('2026-12-24T12:00:00Z')), 'gamla-stan-christmas-run');
  assert.equal(seasons.featuredSlug(HOLIDAY, new Date('2026-12-02T12:00:00Z')), null); // (no entry: no Track of the Day)
  assert.equal(seasons.featuredSlug(HOLIDAY, new Date('2027-01-07T20:00:00Z')), 'lalibela-genna-spins');
  assert.equal(seasons.featuredSlug(HOLIDAY, new Date('2027-01-08T12:00:00Z')), null); // (the season is over)
  assert.equal(seasons.dayOf(HOLIDAY, new Date('2026-12-31T23:30:00Z')), '2027-01-01');
});

test('the pass is sold from 28 Nov (a pre-sale, activating on 1 Dec) to the season\'s end, with an "ends in N days" countdown from 1 Jan', () => {
  assert.equal(seasons.passOnSale(HOLIDAY, new Date('2026-11-27T22:59:59Z')), false);
  assert.equal(seasons.passOnSale(HOLIDAY, new Date('2026-11-27T23:00:00Z')), true); // (28 Nov 00:00 in Stockholm)
  assert.equal(seasons.inPreSale(HOLIDAY, new Date('2026-11-27T23:00:00Z')), true);
  assert.equal(seasons.inPreSale(HOLIDAY, new Date('2026-11-30T22:59:59Z')), true);
  assert.equal(seasons.inPreSale(HOLIDAY, new Date('2026-11-30T23:00:00Z')), false); // (1 Dec: the pass is active)
  assert.equal(seasons.inPreSale(HOLIDAY, new Date('2026-11-20T12:00:00Z')), false); // (not on sale yet)
  assert.equal(seasons.activatesText(HOLIDAY), '1 December');
  assert.equal(seasons.passOnSale(HOLIDAY, new Date('2026-11-30T12:00:00Z')), true);
  assert.equal(seasons.passOnSale(HOLIDAY, new Date('2026-12-15T12:00:00Z')), true);
  assert.equal(seasons.passOnSale(HOLIDAY, new Date('2027-01-08T00:00:00Z')), false);
  const from = seasons.lastMonthStart(HOLIDAY);
  assert.equal(from.toISOString(), '2026-12-31T23:00:00.000Z'); // (1 Jan 00:00 in Stockholm)
  assert.equal(seasons.saleDaysLeft(HOLIDAY, new Date('2026-12-20T12:00:00Z'), from), null);
  assert.equal(seasons.saleDaysLeft(HOLIDAY, new Date('2027-01-01T08:00:00Z'), from), 7);
  assert.equal(seasons.saleDaysLeft(HOLIDAY, new Date('2027-01-07T20:00:00Z'), from), 1);
});

test('the Track of the Day bonus and the pass leave the scoreboards alone', () => {
  const economy = require('../src/economy');
  assert.ok(economy.KINDS.includes('featured-bonus'));
  assert.ok(!economy.EARNED.includes('featured-bonus'));
  assert.ok(!economy.BOUGHT.includes('featured-bonus'));
});

/** A pretend Stripe API: remembers the Checkout sessions and refunds asked for. */
function fakeStripe() {
  const made = { sessions: [], refunds: [] };
  const run = Date.now().toString(36);
  return {
    made,
    checkout: { sessions: { create: async (params, opts) => { const id = `cs_test_${run}_${made.sessions.length + 1}`; made.sessions.push({ params, opts, id }); return { id, url: `https://checkout.stripe.com/c/pay/${id}` }; } } },
    paymentIntents: { retrieve: async (id) => ({ id, latest_charge: { receipt_url: `https://pay.stripe.com/receipts/${id}` } }) },
    refunds: { create: async (params) => { made.refunds.push({ params }); return { id: `re_test_${run}_${made.refunds.length}`, status: 'pending', amount: params.amount ?? 999 }; } },
  };
}

test('the pass on Stripe (test mode): unlocks the season\'s tracks, rooms, the bonus; a refund locks them again', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const stripe = require('../src/payments/stripe');
  const economy = require('../src/economy');
  const fake = fakeStripe();
  stripe.setClient(fake);
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token, headers = {} } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...headers, ...(token && { authorization: `Bearer ${token}` }) }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  let n = 0;
  const send = (type, object) => {
    const payload = JSON.stringify({ id: `evt_season_${Date.now()}_${++n}`, object: 'event', type, data: { object } });
    return call('/payments/stripe/webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': Stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_fake_for_tests' }) } });
  };
  const run = crypto.randomBytes(3).toString('hex');
  const key = `test-${run}`;
  const today = seasons.dayOf({ time_zone: 'Europe/Stockholm' }, new Date());
  try {
    // A season that is on now, with two tracks (copies of Meadow Loop) and today's Track of the Day.
    await db.query(
      `INSERT INTO seasons (key, name, starts_at, ends_at, free_from, pass_product_id, pass_name, price_cents, pass_sale_starts_at, pass_sale_ends_at, featured)
       VALUES ($1, 'Test Season 2026', now() - interval '1 day', now() + interval '10 days', now() + interval '10 days', $2, 'Test Season Pass 2026', 999,
               now() - interval '1 day', now() + interval '10 days', jsonb_build_object($3::text, $4::text))`,
      [key, `pass-${run}`, today, `${key}-featured`],
    );
    const tracks = [];
    for (const slug of [`${key}-featured`, `${key}-other`]) {
      const { rows: [t] } = await db.query(
        `INSERT INTO tracks (slug, name, difficulty, length_m, lane_count, waypoints, obstacles, season_key, is_active)
         SELECT $1, $2, difficulty, length_m, lane_count, waypoints, obstacles, $3, true FROM tracks WHERE slug = 'meadow-loop' RETURNING id, slug`,
        [slug, `Season ${slug.slice(-8)}`, key],
      );
      tracks.push(t);
    }
    seasons.forget();
    const [featured, other] = tracks;

    const account = async (tag) => {
      const name = `t_ss_${tag}_${run}`;
      return (await call('/auth/register', { method: 'POST', body: { username: name, email: `${name}@test.invalid`, password: 'password123', age_group: '18+' } })).body;
    };
    const holder = await account('h');
    const friend = await account('f');

    // Without the pass: locked in the list, refused on every request.
    const list = (await call('/tracks', { token: friend.token })).body.tracks.find((t) => t.id === featured.id);
    assert.equal(list.locked, true);
    assert.deepEqual(list.season, { key, name: 'Test Season 2026', state: 'on', featured: true });
    const refused = await call('/races', { method: 'POST', token: friend.token, body: { track_id: featured.id, enter: true } });
    assert.equal(refused.status, 403);
    assert.equal(refused.body.error, 'This track is in the Test Season pass');
    assert.equal(refused.body.details.code, 'season_pass_required');
    assert.equal((await call('/races', { method: 'POST', token: friend.token, body: { season: key } })).status, 403);
    assert.equal((await call('/rooms', { method: 'POST', token: friend.token, body: { track_id: featured.id } })).status, 403);
    // The public random pick never picks a locked season track.
    for (let i = 0; i < 25; i += 1) {
      const picked = await seasons.pickOpenTrack(db);
      assert.ok(!tracks.some((t) => t.id === picked));
    }

    // Buying it: consent first; real money only (the webhook gives it, coming back alone does not).
    assert.equal((await call('/payments/pass/checkout', { method: 'POST', token: holder.token, body: { season: key } })).status, 400);
    const out = (await call('/payments/pass/checkout', { method: 'POST', token: holder.token, body: { season: key, consent: true } })).body;
    assert.equal(out.next.kind, 'redirect');
    const { params } = fake.made.sessions[0];
    assert.equal(params.line_items[0].price_data.unit_amount, 999);
    assert.equal(params.line_items[0].price_data.product_data.name, 'Marble Spins Test Season Pass 2026');
    assert.ok(params.cancel_url.endsWith('/pass?cancelled=1'));
    const { rows: [pay] } = await db.query('SELECT * FROM payments WHERE order_no = $1', [out.payment.order_no]);
    assert.equal(pay.coins, 0);
    assert.equal(pay.season_key, key);
    // The pass's own consent (its delivery, not coins'), on the page and on Stripe's button.
    assert.match(pay.consent_text, /I want my pass delivered right away/);
    assert.match(params.custom_text.submit.message, /your pass to be delivered/);
    assert.equal(await seasons.hasPass(db, holder.user.id, key), false);
    const session = { id: fake.made.sessions[0].id, object: 'checkout.session', mode: 'payment', payment_status: 'paid', client_reference_id: pay.id, metadata: { payment_id: pay.id }, amount_total: 999, currency: 'usd', total_details: { amount_tax: 200 }, payment_intent: `pi_pass_${run}` };
    assert.equal((await send('checkout.session.completed', session)).body.outcome, 'granted');
    assert.equal((await send('checkout.session.async_payment_succeeded', session)).body.outcome, 'already-granted');
    assert.equal(await seasons.hasPass(db, holder.user.id, key), true);
    const { rows: ledger } = await db.query('SELECT 1 FROM coin_ledger WHERE payment_id = $1', [pay.id]);
    assert.equal(ledger.length, 0); // (no coins move)
    const view = (await call(`/seasons/${key}`, { token: holder.token })).body.season;
    assert.equal(view.pass.owned, true);
    assert.equal(view.featured.slug, featured.slug);
    // Once is enough: a second checkout is refused.
    assert.equal((await call('/payments/pass/checkout', { method: 'POST', token: holder.token, body: { season: key, consent: true } })).status, 409);

    // With the pass: unlocked; Holiday races pick only the season's tracks.
    assert.equal((await call('/tracks', { token: holder.token })).body.tracks.find((t) => t.id === featured.id).locked, false);
    const mine = await call('/races', { method: 'POST', token: holder.token, body: { track_id: featured.id, enter: true } });
    assert.equal(mine.status, 201);
    // A friend without the pass can't join the holder's public race on it…
    assert.equal((await call(`/races/${mine.body.race.id}/join`, { method: 'POST', token: friend.token, body: {} })).status, 403);
    // …but can watch it.
    assert.equal((await call(`/races/${mine.body.race.id}`)).status, 200);
    for (let i = 0; i < 6; i += 1) {
      const h = await call('/races', { method: 'POST', token: holder.token, body: { season: key } });
      assert.equal(h.status, 201);
      assert.ok(tracks.some((t) => t.id === h.body.race.track_id));
    }

    // A friend room hosted by the holder on a pass track: everyone in it may race.
    const room = await call('/rooms', { method: 'POST', token: holder.token, body: { track_id: other.id } });
    assert.equal(room.status, 201);
    assert.deepEqual(room.body.race.track.hostedSeason, { key, name: 'Test Season 2026' });
    const joined = await call(`/rooms/${room.body.room.code}/join`, { method: 'POST', token: friend.token });
    assert.equal(joined.status, 200);
    assert.equal(joined.body.players.length, 2);
    // A host without the pass can't pick a pass track for their own room.
    const friendsRoom = (await call('/rooms', { method: 'POST', token: friend.token, body: {} })).body;
    assert.equal((await call(`/rooms/${friendsRoom.room.code}/track`, { method: 'POST', token: friend.token, body: { track_id: featured.id } })).status, 403);

    // The Track of the Day bonus: half the race's coins, its own line, for the holder only, off the scoreboards.
    const marble = (await db.query('SELECT id FROM marbles WHERE is_starter ORDER BY slug LIMIT 2')).rows;
    const { rows: [race] } = await db.query(
      `INSERT INTO races (track_id, status, seed, target_duration_ms, track_snapshot) VALUES ($1, 'finished', 1, 50000, '{}'::jsonb) RETURNING id`,
      [featured.id],
    );
    await db.query(
      `INSERT INTO race_entries (race_id, marble_id, user_id, finish_position) VALUES ($1, $2, $3, 1), ($1, $4, $5, 2)`,
      [race.id, marble[0].id, holder.user.id, marble[1].id, friend.user.id],
    );
    const before = (await db.query('SELECT coins_earned FROM users WHERE id = $1', [holder.user.id])).rows[0].coins_earned;
    const paid = await db.withTransaction((c) => economy.payRace(c, race.id));
    const lines = [...paid.values()];
    const holderLines = lines.find((ls) => ls.some((l) => l.kind === 'featured-bonus'));
    const raceCoins = holderLines.filter((l) => l.kind === 'race' || l.kind === 'finish-bonus').reduce((s, l) => s + l.amount, 0);
    assert.equal(holderLines.find((l) => l.kind === 'featured-bonus').amount, Math.round(raceCoins / 2));
    assert.equal(lines.filter((ls) => ls.some((l) => l.kind === 'featured-bonus')).length, 1); // (not the friend)
    const { rows: [entry] } = await db.query('SELECT coins_awarded, bonus_coins FROM race_entries WHERE race_id = $1 AND user_id = $2', [race.id, holder.user.id]);
    assert.equal(entry.bonus_coins, Math.round(raceCoins / 2));
    const after = (await db.query('SELECT coins_earned FROM users WHERE id = $1', [holder.user.id])).rows[0].coins_earned;
    assert.equal(after - before, entry.coins_awarded); // (the bonus isn't earned coins)
    // After the day's full races: no bonus.
    await db.query(`UPDATE user_days SET races = 999 WHERE user_id = $1`, [holder.user.id]);
    const { rows: [race2] } = await db.query(`INSERT INTO races (track_id, status, seed, target_duration_ms, track_snapshot) VALUES ($1, 'finished', 2, 50000, '{}'::jsonb) RETURNING id`, [featured.id]);
    await db.query('INSERT INTO race_entries (race_id, marble_id, user_id, finish_position) VALUES ($1, $2, $3, 1)', [race2.id, marble[0].id, holder.user.id]);
    const late = [...(await db.withTransaction((c) => economy.payRace(c, race2.id))).values()][0];
    assert.ok(!late.some((l) => l.kind === 'featured-bonus'));

    // A full refund revokes the pass: the tracks lock again, and the room goes back to free tracks.
    await send('refund.created', { id: `re_pass_${run}`, object: 'refund', status: 'succeeded', amount: 999, currency: 'usd', payment_intent: session.payment_intent, metadata: {} });
    assert.equal(await seasons.hasPass(db, holder.user.id, key), false);
    const { rows: [revoked] } = await db.query('SELECT revoke_reason FROM season_passes WHERE payment_id = $1', [pay.id]);
    assert.equal(revoked.revoke_reason, 'refunded');
    const { rows: [audit] } = await db.query(`SELECT details FROM admin_audit WHERE target_user_id = $1 AND action = 'refund'`, [holder.user.id]);
    assert.equal(audit.details.pass_revoked, true);
    assert.equal((await call('/races', { method: 'POST', token: holder.token, body: { track_id: featured.id } })).status, 403);
    const { rows: [roomRow] } = await db.query('SELECT * FROM rooms WHERE code = $1', [room.body.room.code]);
    const nextId = await db.withTransaction((c) => require('../src/routes/rooms').newRoomRace(c, roomRow));
    const { rows: [nextRace] } = await db.query('SELECT track_id FROM races WHERE id = $1', [nextId]);
    assert.ok(!tracks.some((t) => t.id === nextRace.track_id));

    // The season over: free for everyone.
    await db.query(`UPDATE seasons SET free_from = now() - interval '1 minute' WHERE key = $1`, [key]);
    seasons.forget();
    assert.equal((await call('/races', { method: 'POST', token: friend.token, body: { track_id: featured.id, enter: true } })).status, 201);
    assert.equal((await call('/tracks', { token: friend.token })).body.tracks.find((t) => t.id === featured.id).locked, false);
  } finally {
    stripe.setClient(null);
    seasons.forget();
    server.close();
  }
});

test('test purchases before the sale starts: Apple sandbox or TestFlight, Google licence testers, Stripe test mode by a tester; never real money, never after the end', () => {
  const before = new Date('2026-11-20T12:00:00+01:00');
  assert.equal(seasons.passOnSale(HOLIDAY, before), false);
  assert.equal(seasons.passOnSale(HOLIDAY, before, { early: true }), true);
  // Real purchases open at 28 Nov 00:00 Swedish time, not a minute before, on every platform.
  assert.equal(seasons.passOnSale(HOLIDAY, new Date('2026-11-27T23:59:00+01:00')), false);
  assert.equal(seasons.passOnSale(HOLIDAY, new Date('2026-11-28T00:00:00+01:00')), true);
  // After the sale ends, not even a test purchase.
  assert.equal(seasons.passOnSale(HOLIDAY, new Date('2027-01-08T00:00:00+01:00'), { early: true }), false);
});

test('a tester (PASS_TESTERS) sees the pass on sale before it starts and can buy it with Stripe in test mode; nobody else, and never with live keys', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const stripe = require('../src/payments/stripe');
  const config = require('../src/config');
  stripe.setClient(fakeStripe());
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const run = crypto.randomBytes(3).toString('hex');
  const key = `test-e-${run}`;
  const saved = { testers: process.env.PASS_TESTERS, key: config.stripe.secretKey, live: config.stripe.allowLive };
  try {
    // A season whose pass goes on sale in five days.
    await db.query(
      `INSERT INTO seasons (key, name, starts_at, ends_at, free_from, pass_product_id, pass_name, price_cents, pass_sale_starts_at, pass_sale_ends_at)
       VALUES ($1, 'Early Season 2026', now() + interval '5 days', now() + interval '20 days', now() + interval '20 days', $2, 'Early Season Pass 2026', 999, now() + interval '5 days', now() + interval '20 days')`,
      [key, `epass-${run}`],
    );
    seasons.forget();
    const account = async (tag) => {
      const name = `t_se_${tag}_${run}`;
      return (await call('/auth/register', { method: 'POST', body: { username: name, email: `${name}@test.invalid`, password: 'password123', age_group: '18+' } })).body;
    };
    const tester = await account('t');
    const player = await account('p');
    process.env.PASS_TESTERS = ` someone@example.invalid, T_SE_T_${run}@test.invalid `; // (any case, spaces)

    const pass = async (who) => (await call(`/seasons/${key}`, { token: who.token })).body.season.pass;
    assert.deepEqual([(await pass(tester)).onSale, (await pass(tester)).testPurchaseOnly], [true, true]);
    assert.deepEqual([(await pass(player)).onSale, (await pass(player)).testPurchaseOnly], [false, false]);

    const checkout = (who) => call('/payments/pass/checkout', { method: 'POST', token: who.token, body: { season: key, consent: true } });
    assert.equal((await checkout(player)).status, 409);
    const out = await checkout(tester);
    assert.equal(out.status, 200);
    assert.equal(out.body.next.kind, 'redirect');
    // Live keys: no early purchase, not even for a tester.
    config.stripe.secretKey = 'sk_live_fake_for_tests';
    config.stripe.allowLive = true;
    assert.equal(stripe.mode(), 'live');
    assert.equal((await checkout(tester)).status, 409);
  } finally {
    if (saved.testers === undefined) delete process.env.PASS_TESTERS; else process.env.PASS_TESTERS = saved.testers;
    config.stripe.secretKey = saved.key;
    config.stripe.allowLive = saved.live;
    seasons.forget();
    server.close();
  }
});

test('the pre-sale on Stripe: bought before the season starts, the pass is held but activates only on the season\'s first day; a refund before then revokes it', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const stripe = require('../src/payments/stripe');
  const fake = fakeStripe();
  stripe.setClient(fake);
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token, headers = {} } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...headers, ...(token && { authorization: `Bearer ${token}` }) }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  let n = 0;
  const send = (type, object) => {
    const payload = JSON.stringify({ id: `evt_presale_${Date.now()}_${++n}`, object: 'event', type, data: { object } });
    return call('/payments/stripe/webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': Stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_fake_for_tests' }) } });
  };
  const run = crypto.randomBytes(3).toString('hex');
  const key = `test-ps-${run}`;
  try {
    // On sale since yesterday; the season starts in two days.
    await db.query(
      `INSERT INTO seasons (key, name, starts_at, ends_at, free_from, pass_product_id, pass_name, price_cents, pass_sale_starts_at, pass_sale_ends_at)
       VALUES ($1, 'Pre Season 2026', now() + interval '2 days', now() + interval '12 days', now() + interval '12 days', $2, 'Pre Season Pass 2026', 999, now() - interval '1 day', now() + interval '12 days')`,
      [key, `ppass-${run}`],
    );
    const { rows: [track] } = await db.query(
      `INSERT INTO tracks (slug, name, difficulty, length_m, lane_count, waypoints, obstacles, season_key, is_active)
       SELECT $1, 'Pre season track', difficulty, length_m, lane_count, waypoints, obstacles, $2, true FROM tracks WHERE slug = 'meadow-loop' RETURNING id`,
      [`${key}-t`, key],
    );
    seasons.forget();
    const name = `t_ps_${run}`;
    const me = (await call('/auth/register', { method: 'POST', body: { username: name, email: `${name}@test.invalid`, password: 'password123', age_group: '18+' } })).body;

    const view = async () => (await call(`/seasons/${key}`, { token: me.token })).body.season;
    let season = await view();
    assert.equal(season.state, 'before');
    assert.deepEqual([season.pass.onSale, season.pass.preSale, season.pass.testPurchaseOnly, season.pass.owned], [true, true, false, false]);
    assert.equal(new Date(season.pass.activatesAt).getTime(), new Date(season.startsAt).getTime());

    // A real purchase (no tester needed): the pre-sale consent and "Activates …" on Stripe's page.
    const out = (await call('/payments/pass/checkout', { method: 'POST', token: me.token, body: { season: key, consent: true } })).body;
    assert.equal(out.next.kind, 'redirect');
    const { params } = fake.made.sessions[0];
    assert.match(params.line_items[0].price_data.product_data.description, /Activates \d{1,2} [A-Z][a-z]+ at 00:00 Swedish time, with a full refund on request until then/);
    assert.match(params.custom_text.submit.message, /^Your pass activates on \d{1,2} [A-Z][a-z]+\. Until then you can cancel it for a full refund/);
    const { rows: [pay] } = await db.query('SELECT * FROM payments WHERE order_no = $1', [out.payment.order_no]);
    assert.match(pay.consent_text, /I want my pass to activate on \d{1,2} [A-Z][a-z]+\. Until then I can cancel it for a full refund/);
    const session = { id: fake.made.sessions[0].id, object: 'checkout.session', mode: 'payment', payment_status: 'paid', client_reference_id: pay.id, metadata: { payment_id: pay.id }, amount_total: 999, currency: 'usd', total_details: { amount_tax: 200 }, payment_intent: `pi_presale_${run}` };
    assert.equal((await send('checkout.session.completed', session)).body.outcome, 'granted');
    assert.equal(await seasons.hasPass(db, me.user.id, key), true);
    season = await view();
    assert.deepEqual([season.pass.owned, season.pass.preSale], [true, true]);

    // Held, but nothing opens before the season starts: its tracks, holiday races, rooms.
    const race = await call('/races', { method: 'POST', token: me.token, body: { track_id: track.id, enter: true } });
    assert.equal(race.status, 403);
    assert.equal(race.body.details.code, 'season_not_started');
    assert.equal((await call('/races', { method: 'POST', token: me.token, body: { season: key } })).status, 403);
    assert.equal((await call('/rooms', { method: 'POST', token: me.token, body: { track_id: track.id } })).status, 403);
    // Switched on early, but not in the track list (the picker, the website) before the season starts.
    const listed = async (token) => (await call('/tracks', { token })).body.tracks.some((t) => t.id === track.id);
    assert.equal(await listed(me.token), false);
    assert.equal(await listed(null), false);
    // The season starts: listed, and open for the holder.
    await db.query(`UPDATE seasons SET starts_at = now() - interval '1 minute' WHERE key = $1`, [key]);
    seasons.forget();
    assert.equal(await listed(me.token), true);
    assert.equal(await listed(null), true);
    assert.equal((await call('/races', { method: 'POST', token: me.token, body: { track_id: track.id, enter: true } })).status, 201);
    await db.query(`UPDATE seasons SET starts_at = now() + interval '2 days' WHERE key = $1`, [key]);
    seasons.forget();

    // Refunded before the season starts (from the back office or Stripe's dashboard): revoked.
    await send('refund.created', { id: `re_presale_${run}`, object: 'refund', status: 'succeeded', amount: 999, currency: 'usd', payment_intent: session.payment_intent, metadata: {} });
    assert.equal(await seasons.hasPass(db, me.user.id, key), false);
    const { rows: [revoked] } = await db.query('SELECT revoke_reason FROM season_passes WHERE payment_id = $1', [pay.id]);
    assert.equal(revoked.revoke_reason, 'refunded');
    season = await view();
    assert.deepEqual([season.pass.owned, season.pass.onSale], [false, true]); // (and may be bought again)
  } finally {
    stripe.setClient(null);
    seasons.forget();
    server.close();
  }
});

test('"Remind me when sales open": collected before the sale only (players in the game and by email if ticked, visitors by email with consent), cancelled, exported, deleted with the account', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const reminders = require('../src/seasons/reminders');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const run = crypto.randomBytes(3).toString('hex');
  const key = `test-r-${run}`;
  try {
    // On sale in five days, the season in eight.
    await db.query(
      `INSERT INTO seasons (key, name, starts_at, ends_at, free_from, pass_product_id, pass_name, price_cents, pass_sale_starts_at, pass_sale_ends_at)
       VALUES ($1, 'Remind Season 2026', now() + interval '8 days', now() + interval '20 days', now() + interval '20 days', $2, 'Remind Season Pass 2026', 999, now() + interval '5 days', now() + interval '20 days')`,
      [key, `rpass-${run}`],
    );
    seasons.forget();
    const name = `t_rm_${run}`;
    const me = (await call('/auth/register', { method: 'POST', body: { username: name, email: `${name}@test.invalid`, password: 'password123', age_group: '18+' } })).body;
    const view = async (token) => (await call(`/seasons/${key}`, { token })).body.season.pass;

    // The price is shown before the sale, and reminders may be asked for.
    let pass = await view(me.token);
    assert.deepEqual([pass.priceCents, pass.onSale, pass.remindersOpen, pass.reminder], [999, false, true, null]);

    // A player: in the game; the email only when ticked (their account's address).
    assert.deepEqual((await call(`/seasons/${key}/remind`, { method: 'POST', token: me.token, body: {} })).body.reminder, { inGame: true, email: false, confirmed: null });
    assert.deepEqual((await view(me.token)).reminder, { email: false, address: null, confirmed: null });
    // (Account emails aren't verified yet, so the player confirms the address like a visitor: double opt-in.)
    assert.deepEqual((await call(`/seasons/${key}/remind`, { method: 'POST', token: me.token, body: { email_too: true } })).body.reminder, { inGame: true, email: true, confirmed: false });
    assert.deepEqual((await view(me.token)).reminder, { email: true, address: `${name}@test.invalid`, confirmed: false });
    const { rows: mine } = await db.query('SELECT consent_text FROM pass_reminders WHERE user_id = $1 AND cancelled_at IS NULL', [me.user.id]);
    assert.equal(mine.length, 1); // (asking again updates it)
    assert.match(mine[0].consent_text, /Remind me in the game when the Remind Season Pass 2026 goes on sale on \d+ \w+\. \/ Also email me once at t_rm_/);

    // A visitor: an address and consent, both required; asked twice, listed once, the same answer.
    const visit = (body) => call(`/seasons/${key}/remind`, { method: 'POST', body });
    assert.equal((await visit({ email: 'not-an-email', consent: true })).status, 400);
    assert.equal((await visit({ email: `v_${run}@test.invalid` })).status, 400);
    assert.equal((await visit({ email: `v_${run}@test.invalid`, consent: true })).status, 201);
    assert.deepEqual((await visit({ email: `V_${run}@Test.invalid `, consent: true })).body.reminder, { inGame: false, email: true, confirmed: false });
    const { rows: theirs } = await db.query('SELECT email, consent_text, token FROM pass_reminders WHERE season_key = $1 AND user_id IS NULL', [key]);
    assert.equal(theirs.length, 1);
    assert.equal(theirs[0].email, `v_${run}@test.invalid`);
    assert.match(theirs[0].consent_text, /Email me once at this address when the Remind Season Pass 2026 goes on sale on \d+ \w+\. I'll first get an email to confirm my address/);
    // A bot (the hidden field): the same answer, nothing saved.
    assert.equal((await visit({ email: `bot_${run}@test.invalid`, consent: true, website: 'x' })).status, 201);
    assert.equal((await db.query('SELECT 1 FROM pass_reminders WHERE email = $1', [`bot_${run}@test.invalid`])).rows.length, 0);
    assert.deepEqual(await reminders.counts(db, key), { players: 1, byEmail: 2, confirmed: 0 });

    // Double opt-in: the confirmation email's link confirms it; unconfirmed 7 days after that email,
    // a visitor's reminder is deleted and a player's keeps only the in-game one. Nothing expires
    // before a confirmation email has gone out.
    // (purge() runs over every season: on a reused test database, count only this season's rows)
    const rowsOfSeason = async () => (await db.query('SELECT count(*)::int AS n, count(*) FILTER (WHERE email_wanted)::int AS e FROM pass_reminders WHERE season_key = $1', [key])).rows[0];
    const before = await rowsOfSeason();
    await reminders.purge(db, new Date(Date.now() + 4 * 86400_000));
    assert.deepEqual(await rowsOfSeason(), before);
    assert.deepEqual((await call('/seasons/reminders/confirm', { method: 'POST', body: { token: theirs[0].token } })).body, { confirmed: true });
    assert.deepEqual(await reminders.counts(db, key), { players: 1, byEmail: 2, confirmed: 1 });
    await visit({ email: `unconf_${run}@test.invalid`, consent: true });
    await db.query(`UPDATE pass_reminders SET confirm_sent_at = now() - interval '8 days' WHERE season_key = $1 AND confirmed_at IS NULL`, [key]);
    const pre = await rowsOfSeason();
    assert.ok(await reminders.purge(db) >= 2);
    const post = await rowsOfSeason(); // (the unconfirmed visitor deleted; the player's email dropped)
    assert.deepEqual([pre.n - post.n, pre.e - post.e], [1, 2]);
    assert.equal((await db.query('SELECT 1 FROM pass_reminders WHERE email = $1', [`unconf_${run}@test.invalid`])).rows.length, 0);
    assert.deepEqual((await view(me.token)).reminder, { email: false, address: null, confirmed: null });
    assert.deepEqual(await reminders.counts(db, key), { players: 1, byEmail: 1, confirmed: 1 });

    // Cancelling: the visitor's own link; the player on the page.
    assert.deepEqual((await call('/seasons/reminders/cancel', { method: 'POST', body: { token: theirs[0].token } })).body, { cancelled: true });
    assert.deepEqual((await call('/seasons/reminders/cancel', { method: 'POST', body: { token: theirs[0].token } })).body, { cancelled: false });
    assert.deepEqual((await call(`/seasons/${key}/remind`, { method: 'DELETE', token: me.token })).body, { cancelled: true });
    assert.equal((await view(me.token)).reminder, null);
    assert.equal(await reminders.purge(db) >= 2, true); // (cancelled ones are deleted by the hourly job)

    // In the player's data download, and deleted with the account (also one asked for at its address).
    await call(`/seasons/${key}/remind`, { method: 'POST', token: me.token, body: { email_too: true } });
    await visit({ email: `${name}@test.invalid`, consent: true });
    const data = (await call('/users/me/export', { token: me.token })).body;
    assert.equal((data.passReminders ?? data.data?.passReminders ?? []).length, 2);
    await db.withTransaction((c) => require('../src/account').deleteAccount(c, me.user.id));
    assert.equal((await db.query('SELECT 1 FROM pass_reminders WHERE season_key = $1', [key])).rows.length, 0);

    // Once the sale opens: no more reminders; 30 days after it, the hourly job deletes the rest.
    await visit({ email: `late_${run}@test.invalid`, consent: true });
    await db.query(`UPDATE seasons SET pass_sale_starts_at = now() - interval '1 minute' WHERE key = $1`, [key]);
    seasons.forget();
    assert.equal((await visit({ email: `later_${run}@test.invalid`, consent: true })).status, 409);
    assert.equal((await view(null)).remindersOpen, false);
    assert.equal(await reminders.purge(db, new Date(Date.now() + 31 * 86400_000)) >= 1, true);
    assert.equal((await db.query('SELECT 1 FROM pass_reminders WHERE season_key = $1', [key])).rows.length, 0);
  } finally {
    seasons.forget();
    server.close();
  }
});

test('sending the pass reminders: off until BREVO_API_KEY and PASS_REMINDERS_SENDING=on; then a confirmation (double opt-in), one reminder to confirmed addresses when the sale opens, the in-game notice, a cancel link in every email', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const email = require('../src/email');
  const reminders = require('../src/seasons/reminders');
  const reminderMail = require('../src/seasons/reminderMail');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const sent = [];
  let failNext = false;
  const savedEnv = process.env.PASS_REMINDERS_SENDING;
  const run = crypto.randomBytes(3).toString('hex');
  const key = `test-rs-${run}`;
  try {
    await db.query(
      `INSERT INTO seasons (key, name, starts_at, ends_at, free_from, pass_product_id, pass_name, price_cents, pass_sale_starts_at, pass_sale_ends_at)
       VALUES ($1, 'Send Season 2026', now() + interval '5 days', now() + interval '20 days', now() + interval '20 days', $2, 'Send Season Pass 2026', 999, now() + interval '2 days', now() + interval '20 days')`,
      [key, `spass-${run}`],
    );
    seasons.forget();
    const season = await seasons.byKey(db, key);
    const reg = async (tag) => (await call('/auth/register', { method: 'POST', body: { username: `t_rs${tag}_${run}`, email: `t_rs${tag}_${run}@test.invalid`, password: 'password123', age_group: '18+' } })).body;
    const withEmail = await reg('a');
    const inGameOnly = await reg('b');
    await call(`/seasons/${key}/remind`, { method: 'POST', token: withEmail.token, body: { email_too: true } });
    await call(`/seasons/${key}/remind`, { method: 'POST', token: inGameOnly.token, body: {} });
    await call(`/seasons/${key}/remind`, { method: 'POST', body: { email: `sv_${run}@test.invalid`, consent: true, lang: 'sv' } });

    // Off: no key and no go → nothing.
    delete process.env.PASS_REMINDERS_SENDING;
    assert.equal(reminderMail.sendingOn(), false);
    assert.deepEqual(await reminderMail.run(db, [season]), { confirmations: 0, reminders: 0, off: true });
    email.setTransport(async (m) => { if (failNext) { failNext = false; throw new Error('Brevo 500'); } sent.push(m); return { messageId: `m${sent.length}` }; });
    assert.equal(reminderMail.sendingOn(), false); // (email works, but Moses hasn't said go)
    process.env.PASS_REMINDERS_SENDING = 'on';
    assert.equal(reminderMail.sendingOn(), true);

    // 1. Confirmations, once each, to the two email reminders; Swedish for the Swedish browser.
    assert.deepEqual(await reminderMail.run(db, [season]), { confirmations: 2, reminders: 0 });
    assert.deepEqual(await reminderMail.run(db, [season]), { confirmations: 0, reminders: 0 });
    const sv = sent.find((m) => m.to[0].email === `sv_${run}@test.invalid`);
    assert.equal(sv.subject, 'Bekräfta din påminnelse om Send Season Pass 2026');
    const { rows: [svRow] } = await db.query('SELECT token FROM pass_reminders WHERE email = $1', [`sv_${run}@test.invalid`]);
    assert.ok(sv.htmlContent.includes(`/pass/reminder?confirm=${svRow.token}`));
    assert.ok(sv.htmlContent.includes(`/pass/reminder?cancel=${svRow.token}`));
    assert.match(sv.headers['List-Unsubscribe'], new RegExp(`/api/seasons/reminders/unsubscribe\\?t=${svRow.token}>$`));
    const en = sent.find((m) => m.to[0].email === `t_rsa_${run}@test.invalid`);
    assert.equal(en.subject, 'Confirm your reminder for the Send Season Pass 2026');
    assert.ok(en.htmlContent.includes('/pass/reminder?cancel='));

    // The visitor confirms; the player doesn't.
    assert.deepEqual((await call('/seasons/reminders/confirm', { method: 'POST', body: { token: svRow.token } })).body, { confirmed: true });

    // 2. The sale opens: one reminder, to the confirmed address only; a failed send is tried again.
    await db.query(`UPDATE seasons SET pass_sale_starts_at = now() - interval '1 minute' WHERE key = $1`, [key]);
    seasons.forget();
    const open = await seasons.byKey(db, key);
    sent.length = 0;
    failNext = true;
    assert.deepEqual(await reminderMail.run(db, [open]), { confirmations: 0, reminders: 0 });
    assert.deepEqual(await reminderMail.run(db, [open]), { confirmations: 0, reminders: 1 });
    assert.deepEqual(await reminderMail.run(db, [open]), { confirmations: 0, reminders: 0 });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to[0].email, `sv_${run}@test.invalid`);
    assert.equal(sent[0].subject, 'Send Season Pass 2026 säljs nu');
    assert.ok(sent[0].htmlContent.includes(`/pass?season=${key}`) && sent[0].htmlContent.includes(`/pass/reminder?cancel=${svRow.token}`));

    // The in-game notice: for both players (whatever their email), until closed; never for others.
    const notice = async (who) => (await call(`/seasons/${key}`, { token: who.token })).body.season.pass.onSaleNotice;
    assert.equal(await notice(withEmail), true);
    assert.equal(await notice(inGameOnly), true);
    assert.equal((await call(`/seasons/${key}`)).body.season.pass.onSaleNotice, false);
    await call(`/seasons/${key}/remind/seen`, { method: 'POST', token: inGameOnly.token });
    assert.equal(await notice(inGameOnly), false);
    // Off again: no notice.
    delete process.env.PASS_REMINDERS_SENDING;
    assert.equal(await notice(withEmail), false);

    // A mail app's one-click unsubscribe cancels it.
    const { rows: [mine] } = await db.query('SELECT token FROM pass_reminders WHERE user_id = $1', [withEmail.user.id]);
    const res = await fetch(`${base}/seasons/reminders/unsubscribe?t=${mine.token}`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'List-Unsubscribe=One-Click' });
    assert.equal(res.status, 200);
    assert.ok((await db.query('SELECT cancelled_at FROM pass_reminders WHERE token = $1', [mine.token])).rows[0].cancelled_at);
    assert.ok(reminders);
  } finally {
    if (savedEnv === undefined) delete process.env.PASS_REMINDERS_SENDING; else process.env.PASS_REMINDERS_SENDING = savedEnv;
    email.setTransport(null);
    seasons.forget();
    server.close();
  }
});

test('the pass on Google Play: inside its sale window only (a licence tester\'s test purchase also before it), once, acknowledged (never consumed); a voided purchase revokes it', { skip: !DB }, async () => {
  const db = require('../src/db');
  const google = require('../src/payments/google');
  const payments = require('../src/payments');
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const account = { client_email: 'play@marble-test.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }), token_uri: 'https://oauth2.googleapis.com/token' };
  const state = { purchases: new Map(), voided: [], consumed: [], acknowledged: [] };
  google.setTransport(async (url, opts = {}) => {
    const u = new URL(url);
    const json = (status, body) => ({ ok: status < 300, status, json: async () => body, text: async () => (body == null ? '' : JSON.stringify(body)) });
    if (u.hostname === 'oauth2.googleapis.com') return json(200, { access_token: 'ya29.fake', expires_in: 3600 });
    const m = /\/purchases\/products\/([^/]+)\/tokens\/([^/:]+)(:consume|:acknowledge)?$/.exec(u.pathname);
    if (m) {
      const p = state.purchases.get(decodeURIComponent(m[2]));
      if (!p) return json(404, {});
      if (m[3] === ':consume') { state.consumed.push(m[2]); return json(200, null); }
      if (m[3] === ':acknowledge') { p.acknowledgementState = 1; state.acknowledged.push(m[2]); return json(200, null); }
      return json(200, { purchaseState: 0, consumptionState: 0, acknowledgementState: p.acknowledgementState ?? 0, orderId: p.orderId, obfuscatedExternalAccountId: p.accountId, purchaseTimeMillis: String(p.at), ...(p.test && { purchaseType: 0 }) });
    }
    if (u.pathname.endsWith('/purchases/voidedpurchases')) return json(200, { voidedPurchases: state.voided });
    return json(404, {});
  }, account);
  const run = crypto.randomBytes(3).toString('hex');
  const key = `test-g-${run}`;
  try {
    await db.query(
      `INSERT INTO seasons (key, name, starts_at, ends_at, free_from, pass_product_id, pass_name, price_cents, pass_sale_starts_at, pass_sale_ends_at)
       VALUES ($1, 'Play Season 2026', now() - interval '1 day', now() + interval '10 days', now() + interval '10 days', $2, 'Play Season Pass 2026', 999, now() - interval '1 day', now() + interval '10 days')`,
      [key, `gpass-${run}`],
    );
    seasons.forget();
    const { rows: [user] } = await db.query(`INSERT INTO users (username, email, password_hash) VALUES ($1, $2, 'x') RETURNING id`, [`t_gs_${run}`, `t_gs_${run}@test.invalid`]);
    const accountId = await google.accountIdFor(db, user.id);
    const productId = `gpass-${run}`;
    let orders = 0;
    const buy = (tok, at = Date.now(), test = false) => state.purchases.set(tok, { orderId: `GPA.4400-${run}-${++orders}`, accountId, at, test });

    // Bought (for real) before the sale started: not granted, not acknowledged (Google refunds it by itself).
    const early = `play-pass-${run}-early-xxxxxx`;
    buy(early, Date.now() - 3 * 86400_000);
    assert.equal((await payments.googlePurchase(db, { userId: user.id, productId, purchaseToken: early })).status, 'not-on-sale');
    assert.deepEqual(state.acknowledged, []);

    const tok = `play-pass-${run}-good-xxxxxxx`;
    buy(tok);
    const out = await payments.googlePurchase(db, { userId: user.id, productId, purchaseToken: tok });
    assert.equal(out.status, 'paid');
    assert.equal(out.pass, 'pass-granted');
    assert.equal(out.acknowledged, true);
    assert.equal(state.consumed.length, 0);
    assert.equal(await seasons.hasPass(db, user.id, key), true);
    assert.equal((await payments.googlePurchase(db, { userId: user.id, productId, purchaseToken: tok })).status, 'duplicate');
    // The hourly job never consumes a pass.
    assert.equal(await google.consumeLeftovers(db), 0);
    // A second pass bought while holding one: not taken (Google refunds it unacknowledged).
    const again = `play-pass-${run}-again-xxxxxx`;
    buy(again);
    assert.equal((await payments.googlePurchase(db, { userId: user.id, productId, purchaseToken: again })).status, 'already-owned');
    assert.equal(state.acknowledged.length, 1);

    // Refunded at Google: the pass is revoked.
    state.voided = [{ purchaseToken: tok, orderId: state.purchases.get(tok).orderId, voidedReason: 1, voidedSource: 0 }];
    await payments.googleSync(db);
    assert.equal(await seasons.hasPass(db, user.id, key), false);

    // A licence tester's test purchase (purchaseType 0) before the sale started: granted (App Review, our testers).
    const tested = `play-pass-${run}-test-xxxxxxx`;
    buy(tested, Date.now() - 3 * 86400_000, true);
    assert.equal((await payments.googlePurchase(db, { userId: user.id, productId, purchaseToken: tested })).status, 'paid');
    assert.equal(await seasons.hasPass(db, user.id, key), true);

    // The pre-sale: a real purchase before the season starts (its sale has started) is granted; it
    // activates with the season, and a refund before then revokes it.
    await db.query(`UPDATE seasons SET starts_at = now() + interval '2 days' WHERE key = $1`, [key]);
    seasons.forget();
    state.voided = [{ purchaseToken: tested, orderId: state.purchases.get(tested).orderId, voidedReason: 1, voidedSource: 0 }];
    await payments.googleSync(db);
    assert.equal(await seasons.hasPass(db, user.id, key), false);
    const pre = `play-pass-${run}-presale-xxxx`;
    buy(pre);
    assert.equal((await payments.googlePurchase(db, { userId: user.id, productId, purchaseToken: pre })).status, 'paid');
    assert.equal(await seasons.hasPass(db, user.id, key), true);
    assert.equal((await seasons.trackAccess(db, { season_key: key }, { userId: user.id })).reason, 'before');
    state.voided.push({ purchaseToken: pre, orderId: state.purchases.get(pre).orderId, voidedReason: 1, voidedSource: 0 });
    await payments.googleSync(db);
    assert.equal(await seasons.hasPass(db, user.id, key), false);
  } finally {
    google.setTransport((...a) => fetch(...a), undefined);
    seasons.forget();
  }
});

test('the season end: its final standings, the top players\' badges once, and the board on its dates', { skip: !DB }, async () => {
  const db = require('../src/db');
  const economy = require('../src/economy');
  const run = crypto.randomBytes(3).toString('hex');
  const key = `test-end-${run}`;
  try {
    // A season that ran long ago, at a moment of its own (so no other test's, or earlier run's, coins
    // fall in it), with a badge for the top 2.
    const base = 1000 + crypto.randomInt(50000); // (days ago)
    const ago = (days) => `${base - 400 + days} days`;
    await db.query(
      `INSERT INTO seasons (key, name, starts_at, ends_at, free_from, badge_top) VALUES ($1, 'End Test Season', now() - $2::interval, now() - $3::interval, now() - $3::interval, 2)`,
      [key, ago(400), ago(390)],
    );
    seasons.forget();
    const users = [];
    for (const tag of ['a', 'b', 'c', 'd']) {
      const { rows: [u] } = await db.query(`INSERT INTO users (username, email, password_hash) VALUES ($1, $2, 'x') RETURNING id`, [`t_end${tag}_${run}`, `t_end${tag}_${run}@test.invalid`]);
      users.push(u.id);
    }
    const line = (u, amount, kind, ago) => db.query(`INSERT INTO coin_ledger (user_id, amount, kind, created_at) VALUES ($1, $2, $3, now() - $4::interval)`, [u, amount, kind, ago]);
    const [a, b, c, d] = users;
    await line(a, 300, 'race', ago(395)); // a: 300, reached 395 days ago
    await line(b, 200, 'race', ago(396)); await line(b, 100, 'finish-bonus', ago(394)); // b: 300 too, reached later → after a
    await line(c, 5000, 'coin-pack', ago(393)); await line(c, 50, 'race', ago(393)); // c: bought coins never count
    await line(c, 900, 'race', ago(389)); // (after the end: not counted)
    await line(d, 120, 'featured-bonus', ago(392)); await line(d, 100, 'daily-goal', ago(392)); // d: the bonus doesn't count
    const season = (await seasons.all(db, { fresh: true })).find((s) => s.key === key);
    const table = await seasons.standings(db, season, { earned: economy.EARNED });
    assert.deepEqual(table.map((r) => [users.indexOf(r.userId), r.coins, r.rank]), [[0, 300, 1], [1, 300, 2], [3, 100, 3], [2, 50, 4]]);

    // Not before the end; then the top 2 (of everyone in the season) get the badge, once.
    assert.equal(await seasons.awardBadges(db, key, { now: new Date(Date.now() - (base - 9) * 86400_000), earned: economy.EARNED }), 0);
    assert.equal(await seasons.awardBadges(db, key, { earned: economy.EARNED }), 2);
    assert.equal(await seasons.awardBadges(db, key, { earned: economy.EARNED }), 0);
    const { rows: got } = await db.query('SELECT user_id, rank FROM user_badges WHERE badge_key = $1 ORDER BY rank', [key]);
    assert.deepEqual(got.map((r) => [r.user_id, r.rank]), [[a, 1], [b, 2]]);
    assert.deepEqual(await seasons.badgesOf(db, c), []);
    assert.deepEqual((await seasons.badgesOf(db, a)).map((x) => [x.key, x.name, x.rank]), [[key, 'End Test Season', 1]]);

    // The board: before any season none; a season on comes first; an ended one stays as final standings.
    const view = await seasons.scoreboardSeason(db);
    assert.ok(view);
    if (view.key === key) assert.equal(view.ended, true);
  } finally {
    seasons.forget();
    await db.pool?.end?.();
  }
});
