'use strict';

// Selling track packs (Moses, 12 Nov 2026; src/packs/sale.js): $7.99, or at most 25% in coins (1,990 coins +
// $5.99), never coins alone; the price in one settings file. Sold only while pack locking is on for the player
// (TRACK_PACKS); a pack under 20 live tracks is "Coming soon" (an admin's test purchase aside). Website: Stripe
// Checkout, the pack only from the signed webhook, once; the coins back if the checkout lapses. Google Play and
// the App Store: checked, kept (acknowledged, never consumed), the coins set aside first. Refunds take the pack
// back (and give the coins back); a chargeback takes the pack. Stores are fakes; the database is real when
// ROOMS_TEST_DATABASE_URL is set.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const Stripe = require('stripe');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_for_tests';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fake_for_tests';
process.env.PUBLIC_SITE_URL = 'https://marblespins.test';
process.env.GOOGLE_PLAY_PACKAGE = 'com.marblespins.app';
process.env.APPLE_IAP_ENABLED = 'true';
process.env.APPLE_BUNDLE_ID = 'com.marblespins.app';
delete process.env.STRIPE_ALLOW_LIVE;
delete process.env.TRACK_PACKS;

const settings = require('../client/src/shared/payments/trackPacks.json');
const sale = require('../src/packs/sale');

test('the price: $7.99, or 1,990 coins + $5.99 (coins at most 25%, never coins alone), from one settings file', () => {
  assert.equal(settings.priceCents, 799);
  assert.equal(settings.withCoins.coins, 1990);
  assert.equal(settings.withCoins.priceCents, 599);
  assert.equal(sale.checkPrice(), null);
  assert.match(sale.checkPrice({ ...settings, withCoins: { ...settings.withCoins, coins: 2100 } }), /at most 25%/);
  assert.match(sale.checkPrice({ ...settings, withCoins: { coins: 1990, priceCents: 0, storeAmountCents: 0 } }), /never sold for coins alone/);
  assert.match(sale.checkPrice({ ...settings, withCoins: { coins: 1990, priceCents: 700, storeAmountCents: 700 } }), /no more than the price/);
  assert.deepEqual(sale.priceInfo(), { currency: 'usd', cents: 799, label: '$7.99', withCoins: { coins: 1990, cents: 599, label: '$5.99' }, maxCoinShare: 0.25 });
});

test('product ids: the same on the website and the App Store; Google Play with _', () => {
  const { playId } = require('../src/payments/google');
  assert.equal(sale.productId('grand-prix'), 'trackpack-grand-prix');
  assert.equal(sale.productId('track-and-field', true), 'trackpack-track-and-field-coins');
  assert.deepEqual(sale.parseProduct('trackpack-grand-prix-coins'), { packKey: 'grand-prix', withCoins: true });
  assert.deepEqual(sale.parseProduct('trackpack-blocks-2'), { packKey: 'blocks-2', withCoins: false });
  assert.equal(sale.parseProduct('coins-5000'), null);
  assert.equal(playId('trackpack-track-and-field-coins'), 'trackpack_track_and_field_coins');
  for (const p of require('../src/packs/list').PACKS) assert.ok(playId(sale.productId(p.key, true)).length <= 32, p.key); // (payments.product_id)
});

test('a track\'s one line for the pack page', () => {
  assert.equal(sale.oneLine('A loud, colourful race across Lagos: down a half-pipe into a busy market, round the long banked turn on the steel bridge over the lagoon. More.'), 'Down a half-pipe into a busy market, round the long banked turn on the steel bridge over the lagoon');
  assert.equal(sale.oneLine(''), '');
  assert.ok(sale.oneLine('x'.repeat(300)).length <= 110);
});

/** A pretend Stripe API. */
function fakeStripe() {
  const made = { sessions: [], refunds: [] };
  const run = Date.now().toString(36);
  return {
    made,
    checkout: { sessions: { create: async (params, opts) => { const id = `cs_test_tp_${run}_${made.sessions.length + 1}`; made.sessions.push({ params, opts, id }); return { id, url: `https://checkout.stripe.com/c/pay/${id}` }; } } },
    paymentIntents: { retrieve: async (id) => ({ id, latest_charge: { receipt_url: `https://pay.stripe.com/receipts/${id}` } }) },
    refunds: { create: async (params) => { made.refunds.push({ params }); return { id: `re_test_${run}_${made.refunds.length}`, status: 'pending', amount: params.amount ?? 799 }; } },
  };
}

/** A pretend Google Play: purchases are what the test says; acknowledgements and consumptions recorded. */
function fakeGoogle() {
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const account = { client_email: 'play@marble-test.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }), token_uri: 'https://oauth2.googleapis.com/token' };
  const state = { purchases: new Map(), acknowledged: [], consumed: [] };
  const fetchFn = async (url, opts = {}) => {
    const u = new URL(url);
    const json = (status, body) => ({ ok: status < 300, status, json: async () => body, text: async () => (body == null ? '' : JSON.stringify(body)) });
    if (u.hostname === 'oauth2.googleapis.com') return json(200, { access_token: 'ya29.fake', expires_in: 3600 });
    const m = /\/purchases\/products\/([^/]+)\/tokens\/([^/:]+)(:consume|:acknowledge)?$/.exec(u.pathname);
    if (m) {
      const p = state.purchases.get(decodeURIComponent(m[2]));
      if (!p || p.productId !== decodeURIComponent(m[1])) return json(404, { error: { code: 404 } });
      if (m[3] === ':consume') { state.consumed.push(decodeURIComponent(m[2])); return json(200, null); }
      if (m[3] === ':acknowledge') { p.acknowledged = 1; state.acknowledged.push(decodeURIComponent(m[2])); return json(200, null); }
      return json(200, { purchaseState: 0, consumptionState: 0, orderId: p.orderId, obfuscatedExternalAccountId: p.accountId, acknowledgementState: p.acknowledged ?? 0, purchaseTimeMillis: String(Date.now()), ...(p.test && { purchaseType: 0 }) });
    }
    if (u.pathname.endsWith('/purchases/voidedpurchases')) return json(200, { voidedPurchases: [] });
    return json(404, {});
  };
  return { account, state, fetchFn };
}

// The App Store's signatures (the test-only chain in test/fixtures/apple, as test/applePurchases.test.js).
const FIX = path.join(__dirname, 'fixtures', 'apple');
const pem = (f) => fs.readFileSync(path.join(FIX, f), 'utf8');
const der64 = (p) => p.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
const CHAIN = [der64(pem('leaf.pem')), der64(pem('inter.pem')), der64(pem('root.pem'))];
const LEAF_KEY = crypto.createPrivateKey(pem('leaf.key'));
const b64u = (b) => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const signed = (payload) => {
  const head = b64u(JSON.stringify({ alg: 'ES256', x5c: CHAIN }));
  const body = b64u(JSON.stringify(payload));
  return `${head}.${body}.${b64u(crypto.sign('sha256', Buffer.from(`${head}.${body}`), { key: LEAF_KEY, dsaEncoding: 'ieee-p1363' }))}`;
};

test('track packs, end to end: the switch, coming soon, Stripe, the coins, Google Play, the App Store, refunds', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const stripe = require('../src/payments/stripe');
  const google = require('../src/payments/google');
  const apple = require('../src/payments/apple');
  const payments = require('../src/payments');
  const fake = fakeStripe();
  stripe.setClient(fake);
  const g = fakeGoogle();
  google.setTransport(g.fetchFn, g.account);
  apple.setRoot(new crypto.X509Certificate(pem('root.pem')).fingerprint256);
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (p, { method = 'GET', body, token, headers = {} } = {}) => {
    const res = await fetch(base + p, { method, headers: { 'content-type': 'application/json', ...headers, ...(token && { authorization: `Bearer ${token}` }) }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  let ev = 0;
  const send = (type, object) => {
    const payload = JSON.stringify({ id: `evt_tp_${Date.now()}_${++ev}`, object: 'event', type, data: { object } });
    return call('/payments/stripe/webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': Stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_fake_for_tests' }) } });
  };
  const run = crypto.randomBytes(3).toString('hex');
  const full = `tpf-${run}`; // (20 live tracks: on sale)
  const full2 = `tpg-${run}`;
  const soon = `tps-${run}`; // (3 live tracks: coming soon)
  const coinsOf = async (u) => (await db.query('SELECT coins FROM users WHERE id = $1', [u.user.id])).rows[0].coins;
  const owns = async (u, key) => Boolean((await db.query('SELECT 1 FROM pack_owners WHERE user_id = $1 AND pack_key = $2 AND revoked_at IS NULL', [u.user.id, key])).rows[0]);
  try {
    for (const [key, n] of [[full, 20], [full2, 20], [soon, 3]]) {
      await db.query(`INSERT INTO track_packs (key, name, series, sort) VALUES ($1, $2, 'Test', 99)`, [key, `Test ${key.slice(0, 3)}`]);
      await db.query(
        `INSERT INTO tracks (slug, name, difficulty, length_m, lane_count, waypoints, obstacles, is_active, pack_key, is_free, wildness, wildness_score, description)
         SELECT $1 || '-' || i, 'Pack track ' || i, difficulty, length_m, lane_count, waypoints, obstacles, true, $1, false,
                (ARRAY['easy','wild','extreme'])[1 + i % 3], 10 + i, 'A test run: over the crest and down the long banked turn.'
           FROM tracks, generate_series(1, $2) AS i WHERE slug = 'meadow-loop'`,
        [key, n],
      );
    }
    const account = async (tag) => {
      const name = `t_tp_${tag}_${run}`;
      return (await call('/auth/register', { method: 'POST', body: { username: name, email: `${name}@test.invalid`, password: 'password123', age_group: '18+' } })).body;
    };
    const admin = await account('a');
    const player = await account('p');
    await db.query(`UPDATE users SET role = 'admin' WHERE id = $1`, [admin.user.id]);
    await db.query('UPDATE users SET coins = 10000 WHERE id = ANY($1)', [[admin.user.id, player.user.id]]);
    const checkout = (u, body) => call('/payments/pack/checkout', { method: 'POST', token: u.token, body: { consent: true, ...body } });

    // TRACK_PACKS off (the default): no pack is sold to anyone, nothing locked.
    let shop = (await call('/packs', { token: admin.token })).body;
    assert.equal(shop.onSale, false);
    const off = await checkout(admin, { pack: full });
    assert.equal(off.status, 403);
    assert.equal(off.body.details.code, 'pack_not_sold');

    // 'admins': admins only (Moses tries it on his own account).
    process.env.TRACK_PACKS = 'admins';
    assert.equal((await call('/packs', { token: player.token })).body.onSale, false);
    assert.equal((await checkout(player, { pack: full })).status, 403);
    shop = (await call('/packs', { token: admin.token })).body;
    assert.equal(shop.onSale, true);
    const card = shop.packs.find((p) => p.key === full);
    assert.deepEqual({ live: card.live, complete: card.complete, mix: card.mix, owned: card.owned }, { live: 20, complete: true, mix: { easy: 6, wild: 7, extreme: 7 }, owned: false });
    assert.deepEqual(card.products, { money: `trackpack-${full}`, coins: `trackpack-${full}-coins` });
    assert.equal(shop.packs.find((p) => p.key === soon).complete, false);
    const page = (await call(`/packs/${full}`, { token: admin.token })).body;
    assert.equal(page.pack.tracks.length, 20);
    assert.equal(page.pack.tracks[0].line, 'Over the crest and down the long banked turn');

    // Stripe, $7.99: a Checkout page; the pack only from the signed webhook, once.
    const c1 = await checkout(admin, { pack: full });
    assert.equal(c1.status, 200);
    assert.equal(c1.body.next.kind, 'redirect');
    const s1 = fake.made.sessions.at(-1);
    assert.equal(s1.params.line_items[0].price_data.unit_amount, 799);
    assert.equal(s1.params.line_items[0].price_data.tax_behavior, 'inclusive');
    assert.equal(s1.params.adaptive_pricing.enabled, true); // (shown in the player's own currency)
    assert.match(s1.params.cancel_url, new RegExp(`/shop/packs/${full}\\?cancelled=1$`));
    const pay1 = (await db.query('SELECT * FROM payments WHERE stripe_session_id = $1', [s1.id])).rows[0];
    assert.deepEqual({ status: pay1.status, pack: pay1.pack_key, coins: pay1.coins, spent: pay1.coins_spent, cents: pay1.amount_cents }, { status: 'pending', pack: full, coins: 0, spent: 0, cents: 799 });
    assert.match(pay1.consent_text, /track pack unlocked right away/);
    assert.equal(await owns(admin, full), false);
    const done = { id: s1.id, mode: 'payment', payment_status: 'paid', amount_total: 799, currency: 'sek', payment_intent: `pi_tp_${run}_1`, metadata: { payment_id: pay1.id }, total_details: { amount_tax: 160 } };
    assert.equal((await send('checkout.session.completed', done)).status, 200);
    await send('checkout.session.completed', done);
    assert.equal(await owns(admin, full), true);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM pack_owners WHERE user_id = $1 AND pack_key = $2', [admin.user.id, full])).rows[0].n, 1);
    assert.equal((await checkout(admin, { pack: full })).status, 409); // (already owned)
    assert.equal((await call('/packs', { token: admin.token })).body.packs.find((p) => p.key === full).owned, true);
    const orders = (await call('/payments/mine', { token: admin.token })).body.orders;
    assert.ok(orders.some((o) => o.pack_key === full && o.status === 'paid'));

    // With coins: 1,990 coins taken at once, $5.99 at Stripe; the checkout lapses: the coins come back.
    let before = await coinsOf(admin);
    const c2 = await checkout(admin, { pack: full2, useCoins: true });
    assert.equal(c2.status, 200);
    const s2 = fake.made.sessions.at(-1);
    assert.equal(s2.params.line_items[0].price_data.unit_amount, 599);
    assert.match(s2.params.line_items[0].price_data.product_data.description, /1,990 coins/);
    assert.equal(await coinsOf(admin), before - 1990);
    const pay2 = (await db.query('SELECT * FROM payments WHERE stripe_session_id = $1', [s2.id])).rows[0];
    assert.equal(pay2.coins_spent, 1990);
    await send('checkout.session.expired', { id: s2.id, mode: 'payment', metadata: { payment_id: pay2.id } });
    await send('checkout.session.expired', { id: s2.id, mode: 'payment', metadata: { payment_id: pay2.id } });
    assert.equal(await coinsOf(admin), before);
    // Not enough coins: refused, nothing left behind.
    await db.query('UPDATE users SET coins = 500 WHERE id = $1', [admin.user.id]);
    const poor = await checkout(admin, { pack: full2, useCoins: true });
    assert.equal(poor.status, 400);
    assert.match(poor.body.error, /Not enough coins/);
    assert.equal((await db.query(`SELECT count(*)::int AS n FROM payments WHERE user_id = $1 AND pack_key = $2 AND status = 'pending'`, [admin.user.id, full2])).rows[0].n, 0);
    await db.query('UPDATE users SET coins = 10000 WHERE id = $1', [admin.user.id]);
    // Paid with coins, then refunded in full: the pack goes, the coins come back.
    before = await coinsOf(admin);
    await checkout(admin, { pack: full2, useCoins: true });
    const s3 = fake.made.sessions.at(-1);
    const pay3 = (await db.query('SELECT * FROM payments WHERE stripe_session_id = $1', [s3.id])).rows[0];
    await send('checkout.session.completed', { id: s3.id, mode: 'payment', payment_status: 'paid', amount_total: 599, currency: 'usd', payment_intent: `pi_tp_${run}_3`, metadata: { payment_id: pay3.id }, total_details: { amount_tax: 120 } });
    assert.equal(await owns(admin, full2), true);
    assert.equal(await coinsOf(admin), before - 1990);
    await send('refund.created', { id: `re_tp_${run}_3`, status: 'succeeded', amount: 599, payment_intent: `pi_tp_${run}_3`, metadata: {} });
    await send('refund.created', { id: `re_tp_${run}_3`, status: 'succeeded', amount: 599, payment_intent: `pi_tp_${run}_3`, metadata: {} });
    assert.equal(await owns(admin, full2), false);
    assert.equal(await coinsOf(admin), before);
    // A chargeback takes the first pack back.
    await send('charge.dispute.created', { id: `dp_tp_${run}`, amount: 799, payment_intent: `pi_tp_${run}_1`, reason: 'fraudulent' });
    assert.equal(await owns(admin, full), false);

    // Coming soon: fewer than 20 tracks. A player can't buy it (locking on for everyone); an admin's test purchase can.
    process.env.TRACK_PACKS = 'on';
    const cs = await checkout(player, { pack: soon });
    assert.equal(cs.status, 409);
    assert.equal(cs.body.details.code, 'pack_coming_soon');
    assert.equal((await checkout(admin, { pack: soon })).status, 200); // (Stripe in test mode: a test purchase)

    // Google Play: the coins set aside first, then the purchase checked, kept (acknowledged, never consumed).
    const acc = (await call('/payments/google/account', { token: player.token })).body.accountId;
    before = await coinsOf(player);
    const hold = (await call(`/packs/${full2}/coin-hold`, { method: 'POST', token: player.token, body: {} })).body;
    assert.equal(hold.coins, 1990);
    assert.equal(await coinsOf(player), before - 1990);
    const tok = `play-tp-${run}-aaaaaaaaaaaaaaaaaaaa`;
    g.state.purchases.set(tok, { productId: `trackpack_${full2.replace(/-/g, '_')}_coins`, orderId: `GPA.3311-${run}-1`, accountId: acc });
    const gp = (await call('/payments/google/verify', { method: 'POST', token: player.token, body: { productId: `trackpack_${full2.replace(/-/g, '_')}_coins`, purchaseToken: tok } })).body;
    assert.equal(gp.status, 'paid');
    assert.equal(gp.pack, 'pack-granted');
    assert.equal(gp.acknowledged, true);
    assert.deepEqual(g.state.consumed, []);
    assert.equal(await owns(player, full2), true);
    assert.equal(await coinsOf(player), before - 1990); // (the hold, used: no second take)
    const gpay = (await db.query(`SELECT * FROM payments WHERE provider = 'google' AND store_token = $1`, [tok])).rows[0];
    assert.deepEqual({ product: gpay.product_id, cents: gpay.amount_cents, spent: gpay.coins_spent }, { product: `trackpack-${full2}-coins`, cents: 599, spent: 1990 });
    assert.equal((await call(`/packs/coin-holds/${hold.holdId}`, { method: 'DELETE', token: player.token })).body.coinsBack, 0); // (used)
    assert.equal(await payments.googleSync(db).then(() => g.state.consumed.length), 0); // (the hourly job never consumes a pack)
    // A hold given back when the sheet closes, and one left over: back after 2 hours.
    const h2 = (await call(`/packs/${full}/coin-hold`, { method: 'POST', token: player.token, body: {} })).body;
    assert.equal((await call(`/packs/coin-holds/${h2.holdId}`, { method: 'DELETE', token: player.token })).body.coinsBack, 1990);
    assert.equal((await call(`/packs/coin-holds/${h2.holdId}`, { method: 'DELETE', token: player.token })).body.coinsBack, 0);
    const h3 = (await call(`/packs/${full}/coin-hold`, { method: 'POST', token: player.token, body: {} })).body;
    await db.query(`UPDATE pack_coin_holds SET created_at = now() - interval '3 hours' WHERE id = $1`, [h3.holdId]);
    before = await coinsOf(player);
    assert.ok(await sale.releaseStaleHolds(db) >= 1);
    assert.equal(await coinsOf(player), before + 1990);
    // Coming soon on Google: refused and left unacknowledged (Google refunds it by itself), unless an admin's licence-tester purchase.
    const tok2 = `play-tp-${run}-bbbbbbbbbbbbbbbbbbbb`;
    g.state.purchases.set(tok2, { productId: `trackpack_${soon.replace(/-/g, '_')}`, orderId: `GPA.3311-${run}-2`, accountId: acc });
    assert.equal((await call('/payments/google/verify', { method: 'POST', token: player.token, body: { productId: `trackpack_${soon.replace(/-/g, '_')}`, purchaseToken: tok2 } })).body.status, 'not-on-sale');
    assert.ok(!g.state.acknowledged.includes(tok2));
    // With coins but no hold and no coins left: refused (coins-missing), unacknowledged.
    await db.query('UPDATE users SET coins = 0 WHERE id = $1', [player.user.id]);
    const tok3 = `play-tp-${run}-cccccccccccccccccccc`;
    g.state.purchases.set(tok3, { productId: `trackpack_${full.replace(/-/g, '_')}_coins`, orderId: `GPA.3311-${run}-3`, accountId: acc });
    assert.equal((await call('/payments/google/verify', { method: 'POST', token: player.token, body: { productId: `trackpack_${full.replace(/-/g, '_')}_coins`, purchaseToken: tok3 } })).body.status, 'coins-missing');
    assert.equal(await owns(player, full), false);

    // The App Store: a non-consumable, checked, the pack once; Restore sends it again (nothing more); a refund takes it back.
    const appleTok = (await call('/payments/apple/account', { token: admin.token })).body.accountToken;
    const tx = { transactionId: String(3000000000 + Math.floor(Math.random() * 1e8)), bundleId: 'com.marblespins.app', productId: `trackpack_${full.replace(/-/g, '_')}`, purchaseDate: Date.now(), type: 'Non-Consumable', inAppOwnershipType: 'PURCHASED', environment: 'Production', signedDate: Date.now(), appAccountToken: appleTok };
    tx.originalTransactionId = tx.transactionId;
    const ap = (await call('/payments/apple/verify', { method: 'POST', token: admin.token, body: { signedTransaction: signed(tx) } })).body;
    assert.equal(ap.status, 'paid');
    assert.equal(ap.pack, 'pack-granted');
    assert.equal(await owns(admin, full), true);
    assert.equal((await call('/payments/apple/verify', { method: 'POST', token: admin.token, body: { signedTransaction: signed(tx) } })).body.status, 'duplicate'); // (Restore purchases)
    const apay = (await db.query(`SELECT * FROM payments WHERE provider = 'apple' AND provider_ref = $1`, [tx.transactionId])).rows[0];
    assert.equal(apay.amount_cents, 799);
    assert.equal(apay.product_id, `trackpack-${full}`); // (the App Store's id with _, ours with -)
    // A test purchase (sandbox) of a coming-soon pack by an admin: allowed; by a player: refused.
    const tx2 = { ...tx, transactionId: String(Number(tx.transactionId) + 7), originalTransactionId: String(Number(tx.transactionId) + 7), productId: `trackpack_${soon.replace(/-/g, '_')}`, environment: 'Sandbox' };
    assert.equal((await call('/payments/apple/verify', { method: 'POST', token: admin.token, body: { signedTransaction: signed(tx2) } })).body.status, 'paid');
    const tx3 = { ...tx2, transactionId: String(Number(tx2.transactionId) + 1), originalTransactionId: String(Number(tx2.transactionId) + 1), appAccountToken: (await call('/payments/apple/account', { token: player.token })).body.accountToken };
    assert.equal((await call('/payments/apple/verify', { method: 'POST', token: player.token, body: { signedTransaction: signed(tx3) } })).body.status, 'not-on-sale');
    const refund = signed({ notificationType: 'REFUND', data: { bundleId: 'com.marblespins.app', signedTransactionInfo: signed({ ...tx, revocationDate: Date.now() }) }, signedDate: Date.now() });
    assert.equal((await call('/payments/apple/notifications', { method: 'POST', body: { signedPayload: refund } })).status, 200);
    assert.equal(await owns(admin, full), false);

    // Owned packs unlock their tracks while locking is on (and nothing is locked with it off).
    const packs = require('../src/packs');
    const t = { slug: `${full2}-1` };
    assert.deepEqual(await packs.trackAccess(db, t, { userId: player.user.id, env: { TRACK_PACKS: 'on' } }), { ok: true });
    assert.equal((await packs.trackAccess(db, t, { userId: admin.user.id, env: { TRACK_PACKS: 'on' } })).ok, false);
    assert.deepEqual(await packs.trackAccess(db, t, { userId: admin.user.id, env: {} }), { ok: true });
  } finally {
    delete process.env.TRACK_PACKS;
    stripe.setClient(null);
    apple.setRoot(null);
    server.close();
    await db.end?.();
  }
});
