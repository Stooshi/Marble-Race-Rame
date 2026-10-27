'use strict';

// Google Play Billing for the Android app: a purchase is checked with Google before any coins,
// credited once, only to the player who bought it, consumed at Google; refunds and chargebacks
// (voided purchases) take the coins back once. Google's API is a fake here (with a real signed
// service-account sign-in); the database is real when ROOMS_TEST_DATABASE_URL is set.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
process.env.GOOGLE_PLAY_RTDN_TOKEN = 'rtdn-secret-for-tests';
process.env.GOOGLE_PLAY_PACKAGE = 'com.marblespins.app';

const google = require('../src/payments/google');

/** A pretend Google: its sign-in checks the service account's JWT signature; purchases are what the test says. */
function fakeGoogle() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const account = { client_email: 'play@marble-test.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }), token_uri: 'https://oauth2.googleapis.com/token' };
  const state = { purchases: new Map(), voided: [], consumed: [], refunded: [], calls: [] };
  const fetchFn = async (url, opts = {}) => {
    const u = new URL(url);
    state.calls.push(`${opts.method ?? 'GET'} ${u.pathname}`);
    const json = (status, body) => ({ ok: status < 300, status, json: async () => body, text: async () => (body == null ? '' : JSON.stringify(body)) });
    if (u.hostname === 'oauth2.googleapis.com') {
      const jwt = new URLSearchParams(opts.body).get('assertion');
      const [h, c, s] = jwt.split('.');
      const ok = crypto.verify('RSA-SHA256', Buffer.from(`${h}.${c}`), publicKey, Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64'));
      const claims = JSON.parse(Buffer.from(c.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
      if (!ok || claims.scope !== 'https://www.googleapis.com/auth/androidpublisher') return json(401, { error: 'invalid_grant' });
      return json(200, { access_token: 'ya29.fake', expires_in: 3600 });
    }
    if (opts.headers?.authorization !== 'Bearer ya29.fake') return json(401, {});
    assert.match(u.pathname, /^\/androidpublisher\/v3\/applications\/com\.marblespins\.app\//);
    let m = /\/purchases\/products\/([^/]+)\/tokens\/([^/:]+)(:consume)?$/.exec(u.pathname);
    if (m) {
      const p = state.purchases.get(decodeURIComponent(m[2]));
      if (!p || p.productId !== decodeURIComponent(m[1])) return json(404, { error: { code: 404 } });
      if (m[3]) { p.consumptionState = 1; state.consumed.push(decodeURIComponent(m[2])); return json(200, null); }
      return json(200, { kind: 'androidpublisher#productPurchase', purchaseState: p.purchaseState, consumptionState: p.consumptionState ?? 0, orderId: p.orderId, obfuscatedExternalAccountId: p.accountId, acknowledgementState: 0 });
    }
    if (u.pathname.endsWith('/purchases/voidedpurchases')) return json(200, { voidedPurchases: state.voided });
    m = /\/orders\/([^/:]+):refund$/.exec(u.pathname);
    if (m) { state.refunded.push(decodeURIComponent(m[1])); return json(200, null); }
    return json(404, {});
  };
  return { account, state, fetchFn };
}

test('without a service account Google purchases are off; Pub/Sub pushes need the secret', () => {
  google.setTransport(async () => { throw new Error('no network in this test'); }, null);
  assert.equal(google.configured(), false);
  assert.equal(google.rtdnTokenOk('rtdn-secret-for-tests'), true);
  assert.equal(google.rtdnTokenOk('rtdn-secret-for-test'), false);
  assert.equal(google.rtdnTokenOk(undefined), false);
  const n = { packageName: 'com.marblespins.app', voidedPurchaseNotification: { purchaseToken: 'x' } };
  assert.deepEqual(google.decodeRtdn({ message: { data: Buffer.from(JSON.stringify(n)).toString('base64') } }), n);
  assert.equal(google.decodeRtdn({ message: { data: '%%%' } }), null);
});

test('Google Play: verified, credited once to the buyer only, consumed; voided purchases take the coins back', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  const payments = require('../src/payments');
  const g = fakeGoogle();
  google.setTransport(g.fetchFn, g.account);
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: res.status === 204 ? null : await res.json().catch(() => null) };
  };
  const coinsOf = async (t) => (await call('/auth/me', { token: t })).body.user.coins;
  try {
    const run = Date.now() % 1e6;
    const me = (await call('/auth/register', { method: 'POST', body: { username: `t_gp_${run}`, email: `t_gp_${run}@test.invalid`, password: 'password123', age_group: '18+' } })).body;
    const other = (await call('/auth/register', { method: 'POST', body: { username: `t_gq_${run}`, email: `t_gq_${run}@test.invalid`, password: 'password123', age_group: '18+' } })).body;
    const start = me.user.coins;
    assert.equal((await call('/payments')).body.providers.google, true);

    // The player's account id for Google: random, the same every time, not the user id.
    const acc = (await call('/payments/google/account', { token: me.token })).body;
    assert.match(acc.accountId, /^[0-9a-f]{48}$/);
    assert.equal((await call('/payments/google/account', { token: me.token })).body.accountId, acc.accountId);
    assert.notEqual(acc.accountId, me.user.id.replace(/-/g, ''));
    const otherAcc = (await call('/payments/google/account', { token: other.token })).body.accountId;

    const tok = `play-token-${run}-aaaaaaaaaaaaaaaa`;
    g.state.purchases.set(tok, { productId: 'coins_10500', purchaseState: 0, orderId: `GPA.3300-${run}-1`, accountId: acc.accountId });

    // A made-up token, or a pack that doesn't exist: nothing.
    assert.equal((await call('/payments/google/verify', { method: 'POST', token: me.token, body: { productId: 'coins_10500', purchaseToken: `nope-${run}-xxxxxxxxxxxx` } })).status, 400);
    assert.equal((await call('/payments/google/verify', { method: 'POST', token: me.token, body: { productId: 'coins-999999', purchaseToken: tok } })).status, 404);
    // Someone else sending the buyer's token gets nothing.
    assert.equal((await call('/payments/google/verify', { method: 'POST', token: other.token, body: { productId: 'coins_10500', purchaseToken: tok } })).status, 403);
    assert.equal(await coinsOf(me.token), start);

    // The buyer: checked with Google, the coins once, consumed at Google.
    const paid = (await call('/payments/google/verify', { method: 'POST', token: me.token, body: { productId: 'coins_10500', purchaseToken: tok } })).body;
    assert.equal(paid.status, 'paid');
    assert.match(paid.orderNo, /^MS-\d+$/);
    assert.equal(paid.consumed, true);
    assert.deepEqual(g.state.consumed, [tok]);
    assert.equal(await coinsOf(me.token), start + 10500);
    // Again (the app retrying), or from Google's notification: nothing more.
    assert.equal((await call('/payments/google/verify', { method: 'POST', token: me.token, body: { productId: 'coins_10500', purchaseToken: tok } })).body.status, 'duplicate');
    const push = (n) => call(`/payments/google/rtdn?token=rtdn-secret-for-tests`, { method: 'POST', body: { message: { data: Buffer.from(JSON.stringify({ packageName: 'com.marblespins.app', ...n })).toString('base64') } } });
    assert.equal((await push({ oneTimeProductNotification: { notificationType: 1, purchaseToken: tok, sku: 'coins_10500' } })).status, 204);
    assert.equal(await coinsOf(me.token), start + 10500);
    const { rows: [pay] } = await db.query(`SELECT * FROM payments WHERE provider = 'google' AND store_token = $1`, [tok]);
    assert.equal(pay.status, 'paid');
    assert.equal(pay.provider_ref, `GPA.3300-${run}-1`);
    assert.ok(pay.store_consumed_at);
    const { rows: ledger } = await db.query('SELECT amount, kind FROM coin_ledger WHERE payment_id = $1', [pay.id]);
    assert.deepEqual(ledger, [{ amount: 10500, kind: 'coin-pack' }]);
    // Bought coins never count as earned.
    // (Bought as coins_10500 in Google Play; kept as our own id, coins-10500.)
    assert.equal((await db.query("SELECT product_id FROM payments WHERE provider = 'google' AND store_token = $1", [tok])).rows[0].product_id, 'coins-10500');
    const { rows: [u] } = await db.query('SELECT coins_bought FROM users WHERE id = $1', [me.user.id]);
    assert.ok(u.coins_bought >= 10500);

    // A purchase with another player's account id is refused, whoever sends it.
    const tok2 = `play-token-${run}-bbbbbbbbbbbbbbbb`;
    g.state.purchases.set(tok2, { productId: 'coins_5000', purchaseState: 0, orderId: `GPA.3300-${run}-2`, accountId: otherAcc });
    assert.equal((await call('/payments/google/verify', { method: 'POST', token: me.token, body: { productId: 'coins_5000', purchaseToken: tok2 } })).status, 403);

    // Pending (e.g. paid in cash at a shop): nothing yet; Google's notification credits it once paid.
    const tok3 = `play-token-${run}-cccccccccccccccc`;
    g.state.purchases.set(tok3, { productId: 'coins_5000', purchaseState: 2, orderId: `GPA.3300-${run}-3`, accountId: acc.accountId });
    assert.equal((await call('/payments/google/verify', { method: 'POST', token: me.token, body: { productId: 'coins_5000', purchaseToken: tok3 } })).body.status, 'pending');
    assert.equal(await coinsOf(me.token), start + 10500);
    g.state.purchases.get(tok3).purchaseState = 0;
    assert.equal((await push({ oneTimeProductNotification: { notificationType: 1, purchaseToken: tok3, sku: 'coins_5000' } })).status, 204);
    assert.equal(await coinsOf(me.token), start + 15500);

    // Pushes without the secret are refused; unknown products don't make Pub/Sub retry.
    assert.equal((await call('/payments/google/rtdn?token=wrong', { method: 'POST', body: { message: { data: 'e30=' } } })).status, 403);
    assert.equal((await push({ oneTimeProductNotification: { notificationType: 1, purchaseToken: tok, sku: 'coins_999' } })).status, 204);

    // A refund at Google (voided purchase): the coins go back once, in the ledger and the audit log.
    g.state.voided = [{ purchaseToken: tok, orderId: `GPA.3300-${run}-1`, voidedTimeMillis: String(Date.now()), voidedSource: 0, voidedReason: 1 }];
    assert.equal((await push({ voidedPurchaseNotification: { purchaseToken: tok, orderId: `GPA.3300-${run}-1`, productType: 2 } })).status, 204);
    assert.equal(await coinsOf(me.token), start + 5000);
    await payments.googleSync(db); // (the 6-hourly check finds it again: nothing more)
    assert.equal(await coinsOf(me.token), start + 5000);
    const { rows: [after] } = await db.query('SELECT status FROM payments WHERE id = $1', [pay.id]);
    assert.equal(after.status, 'refunded');
    const { rows: back } = await db.query(`SELECT amount, kind FROM coin_ledger WHERE payment_id = $1 ORDER BY created_at`, [pay.id]);
    assert.deepEqual(back.map((r) => r.kind), ['coin-pack', 'pack-refund']);
    const { rows: [audit] } = await db.query(`SELECT action, reason FROM admin_audit WHERE target_user_id = $1 AND action = 'refund' ORDER BY created_at DESC LIMIT 1`, [me.user.id]);
    assert.match(audit.reason, /Google Play: Remorse/);

    // A chargeback on the second purchase, after the player spent some coins: what's left, the rest recorded as short.
    await db.query('UPDATE users SET coins = 1000 WHERE id = $1', [me.user.id]);
    g.state.voided.push({ purchaseToken: tok3, orderId: `GPA.3300-${run}-3`, voidedTimeMillis: String(Date.now()), voidedSource: 2, voidedReason: 7 });
    await payments.googleSync(db);
    assert.equal(await coinsOf(me.token), 0);
    const { rows: [short] } = await db.query(`SELECT coins_removed, coins_short FROM payment_refunds WHERE id = $1`, [`google-void-GPA.3300-${run}-3`]);
    assert.deepEqual(short, { coins_removed: 1000, coins_short: 4000 });
    const { rows: [dispute] } = await db.query(`SELECT action FROM admin_audit WHERE target_user_id = $1 ORDER BY created_at DESC LIMIT 1`, [me.user.id]);
    assert.equal(dispute.action, 'dispute');

    // The back office refunds a Google order in full through Google (part refunds aren't possible).
    const tok4 = `play-token-${run}-dddddddddddddddd`;
    g.state.purchases.set(tok4, { productId: 'coins_5000', purchaseState: 0, orderId: `GPA.3300-${run}-4`, accountId: acc.accountId });
    await call('/payments/google/verify', { method: 'POST', token: me.token, body: { productId: 'coins_5000', purchaseToken: tok4 } });
    const { rows: [p4] } = await db.query(`SELECT id FROM payments WHERE store_token = $1`, [tok4]);
    const { rows: [admin] } = await db.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
    if (admin) {
      await assert.rejects(payments.refund(db, p4.id, { amountCents: 100, adminId: admin.id, reason: 'part refund test' }), /in full/);
      const r = await payments.refund(db, p4.id, { adminId: admin.id, reason: 'refund test' });
      assert.equal(r.waiting, true);
      assert.deepEqual(g.state.refunded, [`GPA.3300-${run}-4`]);
    }
  } finally {
    server.close();
    await db.pool?.end?.();
  }
});

test('Google Play product ids: no hyphens there (coins_5000), our own ids everywhere else', () => {
  const google = require('../src/payments/google');
  const packs = require('../client/src/shared/payments/packs.json').packs.map((p) => p.id);
  const fs = require('fs');
  const path = require('path');
  const seasonIds = [...fs.readFileSync(path.join(__dirname, '../docs/data_updates/2027-02-16-season-pass.sql'), 'utf8').matchAll(/'([a-z0-9-]+-pass-\d{4})'/g)].map((m) => m[1]);
  assert.ok(seasonIds.includes('holiday-pass-2026'));
  for (const id of [...packs, ...seasonIds]) {
    assert.doesNotMatch(id, /_/, `${id}: our ids never contain _`);
    assert.match(google.playId(id), google.PLAY_ID, `${id} → ${google.playId(id)} is a valid Google Play id`);
    assert.equal(google.ourId(google.playId(id)), id);
  }
  assert.equal(google.playId('coins-5000'), 'coins_5000');
  assert.equal(google.playId('holiday-pass-2026'), 'holiday_pass_2026');
  // The app buys and prices with the Play id (client/src/site/payments/index.js).
  const client = fs.readFileSync(path.join(__dirname, '../client/src/site/payments/index.js'), 'utf8');
  assert.match(client, /export const playId = \(id\) => String\(id\)\.replace\(\/-\/g, '_'\);/);
  assert.equal((client.match(/productIdentifier: playId\(/g) ?? []).length, 2);
});
