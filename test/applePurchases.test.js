'use strict';

// App Store purchases for the iPhone app (StoreKit 2, src/payments/apple.js): Apple's signature is
// checked before any coins (the certificate chain must lead to the trusted root, with Apple's
// marker extensions, and the ES256 signature must match), a purchase is credited once and only to
// the player whose account token it carries, and Apple's signed refund notifications take the
// coins (or the season pass) back. The chain here is a test-only one (test/fixtures/apple); the
// database is real when ROOMS_TEST_DATABASE_URL is set.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DB = process.env.ROOMS_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB || process.env.DATABASE_URL || 'postgres://localhost:1/unused';
process.env.APPLE_IAP_ENABLED = 'true';
process.env.APPLE_BUNDLE_ID = 'com.marblespins.app';

const apple = require('../src/payments/apple');
const seasons = require('../src/seasons');

const FIX = path.join(__dirname, 'fixtures', 'apple');
const pem = (f) => fs.readFileSync(path.join(FIX, f), 'utf8');
const der64 = (p) => p.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
const root = new crypto.X509Certificate(pem('root.pem'));
const CHAIN = [der64(pem('leaf.pem')), der64(pem('inter.pem')), der64(pem('root.pem'))];
const LEAF_KEY = crypto.createPrivateKey(pem('leaf.key'));

const b64u = (b) => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
/** Signs a payload as the App Store does (ES256, the chain in x5c). */
function signed(payload, { key = LEAF_KEY, x5c = CHAIN } = {}) {
  const head = b64u(JSON.stringify({ alg: 'ES256', x5c }));
  const body = b64u(JSON.stringify(payload));
  const sig = crypto.sign('sha256', Buffer.from(`${head}.${body}`), { key, dsaEncoding: 'ieee-p1363' });
  return `${head}.${body}.${b64u(sig)}`;
}

let n = 0;
const tx = (over = {}) => ({
  transactionId: String(2000000000 + (n += 1) + Math.floor(Math.random() * 1e6)), bundleId: 'com.marblespins.app', productId: 'coins-10500',
  purchaseDate: Date.now(), type: 'Consumable', inAppOwnershipType: 'PURCHASED', environment: 'Sandbox', signedDate: Date.now(), ...over,
});

test('only the trusted root\'s signature counts', () => {
  const t = tx();
  // Apple's root is the only one trusted until a test says otherwise.
  assert.throws(() => apple.verifySigned(signed(t)), /Not signed by the App Store/);
  apple.setRoot(root.fingerprint256);
  try {
    assert.equal(apple.verifySigned(signed(t)).transactionId, t.transactionId);
    // A changed payload, another key, a chain cut short, no chain: refused.
    const [h, , s] = signed(t).split('.');
    assert.throws(() => apple.verifySigned(`${h}.${b64u(JSON.stringify({ ...t, productId: 'coins-57500' }))}.${s}`), /Not signed/);
    const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
    assert.throws(() => apple.verifySigned(signed(t, { key: privateKey })), /Not signed/);
    assert.throws(() => apple.verifySigned(signed(t, { x5c: [CHAIN[0]] })), /Not signed/);
    assert.throws(() => apple.verifySigned(signed(t, { x5c: [CHAIN[0], CHAIN[2]] })), /Not signed/); // (the leaf not issued by the root)
    assert.throws(() => apple.verifySigned('x.y'), /Not an App Store transaction/);
  } finally {
    apple.setRoot(null);
  }
  assert.equal(apple.APPLE_ROOT_G3, '63:34:3A:BF:B8:9A:6A:03:EB:B5:7E:9B:3F:5F:A7:BE:7C:4F:5C:75:6F:30:17:B3:A8:C4:88:C3:65:3E:91:79');
});

test('App Store: checked, credited once to the buyer only; a refund notification takes the coins back; the pass once', { skip: !DB }, async () => {
  const { createApp } = require('../src/app');
  const db = require('../src/db');
  apple.setRoot(root.fingerprint256);
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (p, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + p, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const run = crypto.randomBytes(3).toString('hex');
  const key = `test-ap-${run}`;
  try {
    const reg = async (tag) => (await call('/auth/register', { method: 'POST', body: { username: `t_ap${tag}_${run}`, email: `t_ap${tag}_${run}@test.invalid`, password: 'password123', age_group: '18+' } })).body;
    const me = await reg('a');
    const other = await reg('b');
    const coins = async (t) => (await call('/auth/me', { token: t })).body.user.coins;
    const start = await coins(me.token);

    const acc = (await call('/payments/apple/account', { token: me.token })).body;
    assert.match(acc.accountToken, /^[0-9a-f-]{36}$/);
    assert.equal(acc.live, true);
    assert.equal((await call('/payments/apple/account', { token: me.token })).body.accountToken, acc.accountToken);
    const otherToken = (await call('/payments/apple/account', { token: other.token })).body.accountToken;
    const verify = (t, body) => call('/payments/apple/verify', { method: 'POST', token: t, body: { signedTransaction: body } });

    // The buyer: the coins, once.
    const t1 = tx({ appAccountToken: acc.accountToken });
    const paid = (await verify(me.token, signed(t1))).body;
    assert.equal(paid.status, 'paid');
    assert.equal(paid.finish, true);
    assert.equal(await coins(me.token), start + 10500);
    assert.equal((await verify(me.token, signed(t1))).body.status, 'duplicate');
    assert.equal(await coins(me.token), start + 10500);
    const { rows: [pay] } = await db.query(`SELECT * FROM payments WHERE provider = 'apple' AND provider_ref = $1`, [t1.transactionId]);
    assert.equal(pay.status, 'paid');
    const { rows: ledger } = await db.query('SELECT amount, kind FROM coin_ledger WHERE payment_id = $1', [pay.id]);
    assert.deepEqual(ledger, [{ amount: 10500, kind: 'coin-pack' }]);

    // Someone else's purchase, another app, a shared one, an unknown product, a forged one: nothing.
    assert.equal((await verify(other.token, signed(t1))).status, 403);
    assert.equal((await verify(me.token, signed(tx({ appAccountToken: otherToken })))).status, 403);
    assert.equal((await verify(me.token, signed(tx({ appAccountToken: acc.accountToken, bundleId: 'com.example.other' })))).status, 403);
    assert.equal((await verify(me.token, signed(tx({ appAccountToken: acc.accountToken, inAppOwnershipType: 'FAMILY_SHARED' })))).status, 403);
    assert.equal((await verify(me.token, signed(tx({ appAccountToken: acc.accountToken, productId: 'coins-999' })))).status, 404);
    const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
    assert.equal((await verify(me.token, signed(tx({ appAccountToken: acc.accountToken }), { key: privateKey }))).status, 400);
    assert.equal(await coins(me.token), start + 10500);

    // Apple refunds it: the signed notification takes the coins back, once; a forged one changes nothing.
    const note = (type, t) => signed({ notificationType: type, notificationUUID: crypto.randomUUID(), data: { bundleId: 'com.marblespins.app', environment: 'Sandbox', signedTransactionInfo: signed({ ...t, revocationDate: Date.now(), revocationReason: 0 }) }, version: '2.0', signedDate: Date.now() });
    assert.equal((await call('/payments/apple/notifications', { method: 'POST', body: { signedPayload: signed({ notificationType: 'TEST' }, { key: privateKey }) } })).status, 400);
    assert.equal((await call('/payments/apple/notifications', { method: 'POST', body: { signedPayload: note('REFUND', t1) } })).status, 200);
    assert.equal((await call('/payments/apple/notifications', { method: 'POST', body: { signedPayload: note('REFUND', t1) } })).status, 200);
    assert.equal(await coins(me.token), start);
    const { rows: [after] } = await db.query('SELECT status FROM payments WHERE id = $1', [pay.id]);
    assert.equal(after.status, 'refunded');
    const { rows: back } = await db.query(`SELECT amount, kind FROM coin_ledger WHERE payment_id = $1 ORDER BY id`, [pay.id]);
    assert.deepEqual(back.map((l) => [l.kind, l.amount]), [['coin-pack', 10500], ['pack-refund', -10500]]);
    // A purchase already revoked when it arrives: nothing added.
    assert.equal((await verify(me.token, signed(tx({ appAccountToken: acc.accountToken, revocationDate: Date.now() })))).body.status, 'revoked');

    // The season pass (a non-consumable): inside its sale window, once; refunded → revoked.
    await db.query(
      `INSERT INTO seasons (key, name, starts_at, ends_at, free_from, pass_product_id, pass_name, price_cents, pass_sale_starts_at, pass_sale_ends_at)
       VALUES ($1, 'Apple Season 2026', now() - interval '1 day', now() + interval '10 days', now() + interval '10 days', $2, 'Apple Season Pass 2026', 999, now() - interval '1 day', now() + interval '10 days')`,
      [key, `apass-${run}`],
    );
    seasons.forget();
    const early = tx({ appAccountToken: acc.accountToken, productId: `apass-${run}`, type: 'Non-Consumable', purchaseDate: Date.now() - 3 * 86400_000 });
    assert.equal((await verify(me.token, signed(early))).body.status, 'not-on-sale');
    const passTx = tx({ appAccountToken: acc.accountToken, productId: `apass-${run}`, type: 'Non-Consumable' });
    passTx.originalTransactionId = passTx.transactionId;
    const got = (await verify(me.token, signed(passTx))).body;
    assert.equal(got.status, 'paid');
    assert.equal(got.pass, 'pass-granted');
    assert.equal(await seasons.hasPass(db, me.user.id, key), true);
    // Restore Purchases sends it again (a new transaction id, the same original): nothing more.
    assert.equal((await verify(me.token, signed({ ...passTx, transactionId: String(Number(passTx.transactionId) + 7) }))).body.status, 'duplicate');
    const second = tx({ appAccountToken: acc.accountToken, productId: `apass-${run}`, type: 'Non-Consumable' });
    assert.equal((await verify(me.token, signed(second))).body.status, 'already-owned');
    const { rows: flags } = await db.query(`SELECT 1 FROM admin_audit WHERE target_user_id = $1 AND action = 'apple-pass-refused'`, [me.user.id]);
    assert.equal(flags.length, 2);
    assert.equal((await call('/payments/apple/notifications', { method: 'POST', body: { signedPayload: note('REFUND', passTx) } })).status, 200);
    assert.equal(await seasons.hasPass(db, me.user.id, key), false);
  } finally {
    apple.setRoot(null);
    seasons.forget();
    server.close();
    await db.pool?.end?.();
  }
});
