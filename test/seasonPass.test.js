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

// The Holiday Season 2026 as its data update sets it.
const HOLIDAY = {
  key: 'holiday-2026', name: 'Holiday Season 2026', time_zone: 'Europe/Stockholm',
  starts_at: '2026-12-01T00:00:00+01:00', ends_at: '2027-01-07T23:59:59+01:00', free_from: '2027-01-07T23:59:59+01:00',
  pass_product_id: 'holiday-pass-2026', pass_name: 'Holiday Season Pass 2026', price_cents: 999, currency: 'usd',
  pass_sale_starts_at: '2026-12-01T00:00:00+01:00', pass_sale_ends_at: '2027-01-07T23:59:59+01:00',
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

test('the pass is sold from the season\'s start to its end, with an "ends in N days" countdown from 1 Jan', () => {
  assert.equal(seasons.passOnSale(HOLIDAY, new Date('2026-11-30T12:00:00Z')), false);
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

test('the pass on Google Play: inside its sale window only, once, acknowledged (never consumed); a voided purchase revokes it', { skip: !DB }, async () => {
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
      return json(200, { purchaseState: 0, consumptionState: 0, acknowledgementState: p.acknowledgementState ?? 0, orderId: p.orderId, obfuscatedExternalAccountId: p.accountId, purchaseTimeMillis: String(p.at) });
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
    const buy = (tok, at = Date.now()) => state.purchases.set(tok, { orderId: `GPA.4400-${run}-${++orders}`, accountId, at });

    // Bought before the sale started: not granted, not acknowledged (Google refunds it by itself).
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
  } finally {
    google.setTransport((...a) => fetch(...a), undefined);
    seasons.forget();
    await db.pool?.end?.();
  }
});
