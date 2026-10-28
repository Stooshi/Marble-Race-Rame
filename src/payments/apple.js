'use strict';

/**
 * App Store purchases for the iPhone app (StoreKit 2): the coin packs as consumable in-app
 * purchases with the same ids as on the website, and a season pass as a non-consumable.
 *
 * The flow (docs/05-runbook.md, "App Store"):
 *   1. The app asks for the player's App Store account token (accountTokenFor: a random UUID kept
 *      in users.apple_account_token, never the user id) and buys the product with it as StoreKit's
 *      appAccountToken.
 *   2. The app sends the transaction's signed form (jwsRepresentation) to
 *      POST /api/payments/apple/verify.
 *   3. The server checks Apple's signature itself (verifySigned: the certificate chain in the JWS
 *      header must lead to Apple Root CA - G3, whose fingerprint is pinned here; the leaf and the
 *      intermediate must carry Apple's App Store marker extensions; the ES256 signature must match),
 *      then this app's bundle id, a known product, this player's token, not revoked, not family
 *      shared. Only then the coins (or the pass) are added, once per transaction
 *      (payments.provider_ref = Apple's transactionId).
 *   4. The app finishes the transaction in StoreKit after the server says it is recorded; an
 *      unfinished one is sent again at the next start (and Restore Purchases sends the pass again).
 *   5. Refunds: App Store Server Notifications v2 (POST /api/payments/apple/notifications, signed by
 *      Apple like a transaction) say REFUND or REVOKE; each takes the coins (or the pass) back once,
 *      like a Stripe refund (src/payments/stripe.js revoke). A notification that isn't Apple's
 *      signature changes nothing. We can't refund App Store purchases ourselves: the player asks Apple.
 *
 * No secret is needed for any of this (Apple's signature is checked with Apple's public
 * certificates). Settings (Railway): APPLE_IAP_ENABLED=true switches it on; APPLE_BUNDLE_ID
 * (default com.marblespins.app); APPLE_ACCEPT_SANDBOX (default true: App Review and TestFlight buy
 * in Apple's sandbox, even against the live server; set false to refuse sandbox purchases).
 */

const crypto = require('node:crypto');
const { HttpError, badRequest, forbidden } = require('../utils/httpError');
const seasons = require('../seasons');

// SHA-256 fingerprint of "Apple Root CA - G3" (https://www.apple.com/certificateauthority/).
const APPLE_ROOT_G3 = '63:34:3A:BF:B8:9A:6A:03:EB:B5:7E:9B:3F:5F:A7:BE:7C:4F:5C:75:6F:30:17:B3:A8:C4:88:C3:65:3E:91:79';
// Apple's marker extensions: the App Store receipt-signing leaf (1.2.840.113635.100.6.11.1) and the
// WWDR intermediate (1.2.840.113635.100.6.2.1), as DER-encoded object identifiers.
const OID_LEAF = Buffer.from('060a2a864886f76364060b01', 'hex');
const OID_INTERMEDIATE = Buffer.from('060a2a864886f76364060201', 'hex');

let rootOverride = null; // (tests: a test root's fingerprint)
/** Tests: trust another root (its SHA-256 fingerprint), or null for Apple's. */
function setRoot(fingerprint) { rootOverride = fingerprint; }

const bundleId = () => process.env.APPLE_BUNDLE_ID || 'com.marblespins.app';
const configured = () => process.env.APPLE_IAP_ENABLED === 'true';
const acceptSandbox = () => process.env.APPLE_ACCEPT_SANDBOX !== 'false';

const b64url = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

/**
 * A JWS signed by the App Store (a transaction, a notification) → its payload, or throws 400.
 * `now`: the moment the certificates must be valid at.
 */
function verifySigned(jws, { now = new Date() } = {}) {
  if (typeof jws !== 'string' || jws.length > 20000) throw badRequest('Not an App Store transaction');
  const parts = jws.split('.');
  if (parts.length !== 3) throw badRequest('Not an App Store transaction');
  let header;
  let payload;
  try {
    header = JSON.parse(b64url(parts[0]).toString('utf8'));
    payload = JSON.parse(b64url(parts[1]).toString('utf8'));
  } catch {
    throw badRequest('Not an App Store transaction');
  }
  if (header.alg !== 'ES256' || !Array.isArray(header.x5c) || header.x5c.length < 2) throw badRequest('Not signed by the App Store');
  let certs;
  try {
    certs = header.x5c.map((c) => new crypto.X509Certificate(Buffer.from(c, 'base64')));
  } catch {
    throw badRequest('Not signed by the App Store');
  }
  const t = now.getTime();
  const bad = () => badRequest('Not signed by the App Store');
  for (const c of certs) if (!(new Date(c.validFrom).getTime() <= t && t <= new Date(c.validTo).getTime())) throw bad();
  for (let i = 0; i < certs.length - 1; i += 1) {
    if (!certs[i].checkIssued(certs[i + 1]) || !certs[i].verify(certs[i + 1].publicKey)) throw bad();
  }
  if (certs.at(-1).fingerprint256 !== (rootOverride ?? APPLE_ROOT_G3)) throw bad();
  if (!certs[0].raw.includes(OID_LEAF) || !certs[1].raw.includes(OID_INTERMEDIATE)) throw bad();
  const ok = crypto.verify('sha256', Buffer.from(`${parts[0]}.${parts[1]}`), { key: certs[0].publicKey, dsaEncoding: 'ieee-p1363' }, b64url(parts[2]));
  if (!ok) throw bad();
  return payload;
}

/** The player's App Store account token (StoreKit's appAccountToken): a random UUID, made once. */
async function accountTokenFor(db, userId) {
  const { rows: [u] } = await db.query('SELECT apple_account_token FROM users WHERE id = $1', [userId]);
  if (u?.apple_account_token) return u.apple_account_token;
  const { rows: [set] } = await db.query(
    'UPDATE users SET apple_account_token = COALESCE(apple_account_token, $2) WHERE id = $1 RETURNING apple_account_token',
    [userId, crypto.randomUUID()],
  );
  return set.apple_account_token;
}

/** Checks a verified transaction is this app's and usable; → the environment. */
function checkTransaction(tx) {
  if (tx.bundleId !== bundleId()) throw forbidden('This purchase is for another app');
  if (tx.environment === 'Sandbox' && !acceptSandbox()) throw forbidden('Sandbox purchases are not accepted');
  if (!['Sandbox', 'Production', 'Xcode'].includes(tx.environment)) throw badRequest('Unknown App Store environment');
  if (tx.environment === 'Xcode' && process.env.NODE_ENV === 'production') throw forbidden('Xcode test purchases are not accepted');
  return tx.environment;
}

/**
 * A purchase from the app: its signed transaction checked, then the coins (or the pass) added once.
 * `grant`, `product`: from src/payments (a coin pack, or a season pass: `keep`).
 * → { status: 'paid'|'duplicate'|'revoked'|'not-on-sale'|'already-owned', coins?, pass?, orderNo?, finish }
 * `finish`: whether the app may finish the transaction in StoreKit (it is recorded, or never will be).
 */
async function redeem(db, { userId, signedTransaction }, { grant, product, now = new Date() }) {
  const tx = verifySigned(signedTransaction, { now });
  const env = checkTransaction(tx);
  const p = await product(tx.productId);
  if (tx.inAppOwnershipType && tx.inAppOwnershipType !== 'PURCHASED') throw forbidden('Family-shared purchases are not accepted');
  const ref = String(tx.transactionId);
  return db.withTransaction(async (client) => {
    const { rows: [u] } = await client.query('SELECT id, apple_account_token FROM users WHERE id = $1', [userId]);
    if (!u) throw forbidden('No such player');
    if (!tx.appAccountToken || !u.apple_account_token || tx.appAccountToken.toLowerCase() !== String(u.apple_account_token).toLowerCase()) {
      throw forbidden('This purchase belongs to another account');
    }
    const { rows: [had] } = await client.query(
      `SELECT user_id, order_no, status FROM payments WHERE provider = 'apple' AND (provider_ref = $1 OR ($2::boolean AND store_token = $3))`,
      [ref, Boolean(p.keep), String(tx.originalTransactionId ?? ref)],
    );
    if (had) {
      if (had.user_id !== userId) throw forbidden('This purchase belongs to another account');
      return { status: 'duplicate', orderNo: had.order_no, finish: true };
    }
    if (tx.revocationDate) return { status: 'revoked', finish: true };
    if (p.keep) {
      // (Before the sale starts, only a sandbox or TestFlight purchase: App Review and our testers.)
      const bought = new Date(Number(tx.purchaseDate) || now.getTime());
      const flag = async (why) => client.query(
        'INSERT INTO admin_audit (admin_id, action, target_user_id, reason, details) VALUES (NULL, $1, $2, $3, $4)',
        ['apple-pass-refused', userId, `${why}: the player can ask Apple for a refund`, JSON.stringify({ transaction_id: ref, product_id: p.id, environment: env })],
      );
      if (!seasons.passOnSale(p.season, bought, { early: env !== 'Production' })) { await flag('Bought outside the sale window'); return { status: 'not-on-sale', finish: true }; }
      if (await seasons.hasPass(client, userId, p.seasonKey)) { await flag('A second pass'); return { status: 'already-owned', finish: true }; }
    }
    const { rows: [payment] } = await client.query(
      `INSERT INTO payments (user_id, provider, provider_ref, store_token, product_id, coins, amount_cents, currency, order_no, status, season_key, credit_amount)
       VALUES ($1, 'apple', $2, $3, $4, $5, $6, $7, 'MS-' || nextval('payment_order_seq'), 'pending', $8, $9)
       ON CONFLICT DO NOTHING RETURNING id, order_no`,
      [userId, ref, String(tx.originalTransactionId ?? ref), p.id, p.coins, p.storeAmountCents ?? p.amountCents, p.currency, p.seasonKey ?? null, p.credits ?? 0], // (the store's US price: $4.99 for the $5 pack)
    );
    if (!payment) return { status: 'duplicate', orderNo: null, finish: true };
    const granted = await grant(client, payment.id, ref);
    return p.keep
      ? { status: 'paid', pass: granted, orderNo: payment.order_no, paymentId: payment.id, finish: true }
      : { status: 'paid', ...(p.credits ? { credits: granted } : { coins: granted }), orderNo: payment.order_no, paymentId: payment.id, finish: true };
  });
}

/**
 * App Store Server Notifications v2: a signed notification. REFUND and REVOKE take the coins (or the
 * pass) back once (`revoke`: src/payments/stripe.js). → a short word for the log.
 */
async function notification(db, signedPayload, { revoke, now = new Date() }) {
  const n = verifySigned(signedPayload, { now });
  if (n.notificationType === 'TEST') return 'test';
  if (n.data?.bundleId && n.data.bundleId !== bundleId()) return 'other-app';
  if (!['REFUND', 'REVOKE'].includes(n.notificationType)) return 'ignored';
  const tx = verifySigned(n.data?.signedTransactionInfo, { now });
  if (tx.bundleId !== bundleId()) return 'other-app';
  const ref = String(tx.transactionId);
  const out = await db.withTransaction(async (client) => {
    const { rows: [pay] } = await client.query(`SELECT * FROM payments WHERE provider = 'apple' AND provider_ref = $1 FOR UPDATE`, [ref]);
    if (!pay || pay.status === 'pending' || pay.status === 'failed') return null;
    const left = (pay.charged_cents ?? pay.amount_cents) - pay.refunded_cents;
    return revoke(client, {
      payment: pay,
      refundId: `apple-${n.notificationType.toLowerCase()}-${ref}`,
      amountCents: Math.max(1, left),
      reason: n.notificationType === 'REFUND' ? `App Store: refunded by Apple${tx.revocationReason === 1 ? ' (an issue in the app)' : ''}` : 'App Store: revoked (Family Sharing)',
    });
  });
  return out ? 'revoked' : 'unknown-or-done';
}

module.exports = { configured, bundleId, verifySigned, accountTokenFor, redeem, notification, setRoot, APPLE_ROOT_G3 };
