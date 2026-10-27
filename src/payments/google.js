'use strict';

/**
 * Google Play Billing for the Android app: coin packs are one-time ("consumable") products. Google
 * Play's product ids allow only lowercase letters, digits, _ and . (no hyphens), so in Google Play our
 * ids are written with _ (playId: coins-5000 → coins_5000, holiday-pass-2026 → holiday_pass_2026);
 * everywhere else (payments.product_id, the website, the App Store) they keep their hyphens (ourId turns
 * a Play id back). A season pass is a one-time product that is kept: acknowledged, never consumed.
 * Stripe stays for the website only.
 *
 * The flow (docs/05-runbook.md, "Google Play"):
 *   1. The app asks for the player's Play account id (accountIdFor: a random id kept in
 *      users.store_account_id, never the user id or anything personal) and buys the product with
 *      it as Google's obfuscatedAccountId.
 *   2. The app sends { productId, purchaseToken } to POST /api/payments/google/verify.
 *   3. The server asks Google (Play Developer API, purchases.products.get) whether the purchase is
 *      real, paid, for this app and for this player; only then the coins are added, once per
 *      purchase (payments.store_token and the order id are unique), in the coin ledger.
 *   4. The server consumes the purchase at Google (so the pack can be bought again; consuming also
 *      acknowledges it, which Google requires within 3 days or it refunds the player). Purchases not
 *      consumed yet are retried every hour.
 *   5. Refunds and chargebacks: Google's Voided Purchases API is read every 6 hours and whenever
 *      Google's real-time notification (Pub/Sub push to /api/payments/google/rtdn) says a purchase
 *      was voided; each takes the coins back once, like a Stripe refund (src/payments/stripe.js
 *      revoke: coin ledger 'pack-refund', admin audit). A notification only starts a check with
 *      Google, so a forged one can't change anything.
 *   6. The back office can refund a Google purchase: Google refunds the order (orders.refund) and
 *      the coins go when the voided purchase comes back (minutes), as with Stripe.
 *
 * Settings (Railway): GOOGLE_PLAY_SERVICE_ACCOUNT (the service account's JSON key, as JSON or
 * base64), GOOGLE_PLAY_PACKAGE (default com.marblespins.app), GOOGLE_PLAY_RTDN_TOKEN (the secret
 * in the Pub/Sub push address). Without the service account, Google purchases are switched off.
 */

const crypto = require('node:crypto');
const { HttpError, badRequest, forbidden } = require('../utils/httpError');
const seasons = require('../seasons');

const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';

let fetchImpl = (...args) => fetch(...args);

/** Our product id as Google Play writes it (Moses, 27 Oct 2026: Play refuses hyphens): coins-5000 → coins_5000. */
const playId = (id) => String(id).replace(/-/g, '_');
/** A Google Play product id back to ours: coins_5000 → coins-5000 (our ids never contain _). */
const ourId = (id) => String(id).replace(/_/g, '-');
/** Google Play's rule for product ids. */
const PLAY_ID = /^[a-z0-9][a-z0-9_.]*$/;
let accountOverride; // (tests)
/** Tests: a fake fetch (and service account). */
function setTransport(fn, account = undefined) { fetchImpl = fn; accountOverride = account; token = null; }

const packageName = () => process.env.GOOGLE_PLAY_PACKAGE || 'com.marblespins.app';

function serviceAccount() {
  if (accountOverride !== undefined) return accountOverride;
  const raw = (process.env.GOOGLE_PLAY_SERVICE_ACCOUNT || '').trim();
  if (!raw) return null;
  try {
    const json = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    const acc = JSON.parse(json);
    return acc.client_email && acc.private_key ? acc : null;
  } catch {
    console.error('[google-play] GOOGLE_PLAY_SERVICE_ACCOUNT is not a service account JSON key');
    return null;
  }
}

const configured = () => Boolean(serviceAccount());

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

// An OAuth access token for the service account (a signed JWT exchanged at Google), kept until it expires.
let token = null;
async function accessToken() {
  if (token && token.until > Date.now() + 60_000) return token.value;
  const acc = serviceAccount();
  if (!acc) throw new HttpError(503, 'Google Play purchases are not connected');
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: acc.client_email, scope: SCOPE, aud: acc.token_uri || 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const signature = b64url(crypto.sign('RSA-SHA256', Buffer.from(`${head}.${claims}`), acc.private_key));
  const res = await fetchImpl(acc.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claims}.${signature}` }).toString(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) throw new HttpError(502, `Google sign-in for the Play API failed (${res.status} ${body.error ?? ''})`);
  token = { value: body.access_token, until: Date.now() + (body.expires_in ?? 3600) * 1000 };
  return token.value;
}

/** One Play Developer API call → { status, body }. */
async function call(method, path, query = null) {
  const url = `${API}/${encodeURIComponent(packageName())}${path}${query ? `?${new URLSearchParams(query)}` : ''}`;
  const res = await fetchImpl(url, { method, headers: { authorization: `Bearer ${await accessToken()}`, ...(method === 'POST' && { 'content-length': '0' }) } });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text.slice(0, 200) }; }
  return { status: res.status, body };
}

const productPath = (productId, purchaseToken) => `/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;

/** Google's record of a one-time purchase (purchases.products.get), or null if Google doesn't know it. */
async function getPurchase(productId, purchaseToken) {
  const r = await call('GET', productPath(productId, purchaseToken));
  if (r.status === 404 || r.status === 400 || r.status === 410) return null;
  if (r.status >= 300) throw new HttpError(502, `Google Play didn't answer the purchase check (${r.status})`);
  return r.body;
}

/** Consumes (and so acknowledges) a purchase at Google. → true when done (or done before). */
async function consume(productId, purchaseToken) {
  const r = await call('POST', `${productPath(productId, purchaseToken)}:consume`);
  if (r.status < 300) return true;
  // Already consumed: Google answers 400 with a reason; treat as done.
  if (r.status === 400 && /consum/i.test(JSON.stringify(r.body))) return true;
  throw new HttpError(502, `Google Play didn't consume the purchase (${r.status})`);
}

/** Acknowledges a purchase that is kept (a season pass: never consumed). → true when done (or done before). */
async function acknowledge(productId, purchaseToken) {
  const r = await call('POST', `${productPath(productId, purchaseToken)}:acknowledge`);
  if (r.status < 300) return true;
  if (r.status === 400 && /acknowledg/i.test(JSON.stringify(r.body))) return true;
  throw new HttpError(502, `Google Play didn't acknowledge the purchase (${r.status})`);
}

/** Refunds an order at Google (all of it), taking the item back. → true. */
async function refundOrder(orderId) {
  const r = await call('POST', `/orders/${encodeURIComponent(orderId)}:refund`, { revoke: 'true' });
  if (r.status >= 300) throw new HttpError(502, `Google Play didn't refund ${orderId} (${r.status})`);
  return true;
}

/** Voided one-time purchases (refunds, chargebacks, revocations) of the last `days` (Google keeps 30). */
async function voidedPurchases({ days = 30 } = {}) {
  const out = [];
  let pageToken = null;
  const startTime = String(Date.now() - Math.min(days, 30) * 86400_000 + 60_000);
  for (let i = 0; i < 50; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const r = await call('GET', '/purchases/voidedpurchases', { startTime, type: '0', maxResults: '1000', ...(pageToken && { token: pageToken }) });
    if (r.status >= 300) throw new HttpError(502, `Google Play voided purchases unavailable (${r.status})`);
    out.push(...(r.body?.voidedPurchases ?? []));
    pageToken = r.body?.tokenPagination?.nextPageToken;
    if (!pageToken) break;
  }
  return out;
}

// purchaseState: 0 purchased, 1 cancelled, 2 pending. consumptionState: 0 not yet, 1 consumed.
const STATE = { 0: 'purchased', 1: 'cancelled', 2: 'pending' };

/** The player's id at Google (obfuscatedAccountId): random, made once, kept with the account. */
async function accountIdFor(db, userId) {
  const { rows: [u] } = await db.query('SELECT store_account_id FROM users WHERE id = $1', [userId]);
  if (u?.store_account_id) return u.store_account_id;
  const id = crypto.randomBytes(24).toString('hex');
  const { rows: [set] } = await db.query(
    'UPDATE users SET store_account_id = COALESCE(store_account_id, $2) WHERE id = $1 RETURNING store_account_id',
    [userId, id],
  );
  return set.store_account_id;
}

const VOID_REASON = { 0: 'Other', 1: 'Remorse', 2: 'Not received', 3: 'Defective', 4: 'Accidental purchase', 5: 'Fraud', 6: 'Friendly fraud', 7: 'Chargeback' };

/**
 * A purchase from the app (or from Google's notification): checked with Google, then the coins
 * added once. `userId`: the player who sent it (null when it comes from Google's notification:
 * the player is found by the account id the app bought with). `grant`, `product`: from src/payments
 * (a coin pack, or a season pass: `keep`, acknowledged and never consumed, granted only if bought
 * inside its sale window and not already held; otherwise it is left unacknowledged, so Google
 * refunds it by itself after 3 days).
 * → { status: 'paid'|'pending'|'duplicate'|'cancelled'|'not-on-sale'|'already-owned', coins?, pass?, orderNo?, consumed?, acknowledged? }
 */
async function redeem(db, { userId = null, productId, purchaseToken }, { grant, product }) {
  if (typeof purchaseToken !== 'string' || purchaseToken.length < 10 || purchaseToken.length > 2000) throw badRequest('Not a Google Play purchase');
  const p = await product(ourId(productId));
  const g = await getPurchase(playId(p.id), purchaseToken);
  if (!g) throw badRequest('Google Play doesn\'t know this purchase');
  const state = STATE[g.purchaseState] ?? 'unknown';
  if (state === 'pending') return { status: 'pending' };
  if (state !== 'purchased') return { status: 'cancelled' };
  // Whose purchase is it? The account id the app bought with must be this player's.
  const accountId = g.obfuscatedExternalAccountId || null;
  const out = await db.withTransaction(async (client) => {
    let owner = userId;
    if (accountId) {
      const { rows: [u] } = await client.query('SELECT id FROM users WHERE store_account_id = $1', [accountId]);
      if (!u) throw forbidden('This purchase belongs to another account');
      if (userId && u.id !== userId) throw forbidden('This purchase belongs to another account');
      owner = u.id;
    } else if (!userId) {
      return { status: 'unknown-player' };
    }
    const ref = g.orderId || `token-${crypto.createHash('sha256').update(purchaseToken).digest('hex').slice(0, 40)}`;
    const { rows: [had] } = await client.query(`SELECT user_id, order_no, status FROM payments WHERE provider = 'google' AND (store_token = $1 OR provider_ref = $2)`, [purchaseToken, ref]);
    if (had) {
      if (had.user_id !== owner) throw forbidden('This purchase belongs to another account');
      return { status: 'duplicate', orderNo: had.order_no };
    }
    if (p.keep) {
      // A season pass: bought inside its sale window (Google's purchase time), and not held already.
      const bought = new Date(Number(g.purchaseTimeMillis) || Date.now());
      // (Before the sale starts, only a licence tester's test purchase: Google's purchaseType 0.)
      if (!seasons.passOnSale(p.season, bought, { early: g.purchaseType === 0 })) return { status: 'not-on-sale' };
      if (await seasons.hasPass(client, owner, p.seasonKey)) return { status: 'already-owned' };
    }
    const { rows: [payment] } = await client.query(
      `INSERT INTO payments (user_id, provider, provider_ref, store_token, product_id, coins, amount_cents, currency, order_no, status, season_key)
       VALUES ($1, 'google', $2, $3, $4, $5, $6, $7, 'MS-' || nextval('payment_order_seq'), 'pending', $8)
       ON CONFLICT DO NOTHING RETURNING id, order_no`,
      [owner, ref, purchaseToken, p.id, p.coins, p.amountCents, p.currency, p.seasonKey ?? null],
    );
    if (!payment) return { status: 'duplicate', orderNo: null };
    const granted = await grant(client, payment.id, ref);
    return p.keep
      ? { status: 'paid', pass: granted, orderNo: payment.order_no, paymentId: payment.id }
      : { status: 'paid', coins: granted, orderNo: payment.order_no, paymentId: payment.id };
  });
  // A season pass: acknowledge at Google (never consume: it stays owned).
  if (p.keep) {
    if ((out.status === 'paid' || out.status === 'duplicate') && Number(g.acknowledgementState) !== 1) {
      try {
        await acknowledge(playId(p.id), purchaseToken);
        await db.query(`UPDATE payments SET store_acknowledged_at = now() WHERE provider = 'google' AND store_token = $1`, [purchaseToken]);
        out.acknowledged = true;
      } catch (err) {
        console.error(`[google-play] acknowledge ${out.orderNo}: ${err.message} (retried hourly)`);
        out.acknowledged = false;
      }
    } else if (out.status === 'paid' || out.status === 'duplicate') {
      await db.query(`UPDATE payments SET store_acknowledged_at = COALESCE(store_acknowledged_at, now()) WHERE provider = 'google' AND store_token = $1`, [purchaseToken]);
    }
    return out;
  }
  // Consume at Google (outside the transaction: the coins are already safely recorded).
  if ((out.status === 'paid' || out.status === 'duplicate') && Number(g.consumptionState) !== 1) {
    try {
      await consume(playId(p.id), purchaseToken);
      await db.query(`UPDATE payments SET store_consumed_at = now() WHERE provider = 'google' AND store_token = $1`, [purchaseToken]);
      out.consumed = true;
    } catch (err) {
      console.error(`[google-play] consume ${out.orderNo}: ${err.message} (retried hourly)`);
      out.consumed = false;
    }
  } else if (out.status === 'paid' || out.status === 'duplicate') {
    await db.query(`UPDATE payments SET store_consumed_at = COALESCE(store_consumed_at, now()) WHERE provider = 'google' AND store_token = $1`, [purchaseToken]);
  }
  return out;
}

/** Purchases paid but not consumed at Google yet (Google refunds them after 3 days): consume now. */
async function consumeLeftovers(db) {
  const { rows } = await db.query(
    `SELECT product_id, store_token FROM payments
      WHERE provider = 'google' AND status = 'paid' AND store_consumed_at IS NULL AND store_token IS NOT NULL AND season_key IS NULL LIMIT 200`,
  );
  let done = 0;
  for (const r of rows) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await consume(playId(r.product_id), r.store_token);
      // eslint-disable-next-line no-await-in-loop
      await db.query(`UPDATE payments SET store_consumed_at = now() WHERE provider = 'google' AND store_token = $1`, [r.store_token]);
      done += 1;
    } catch (err) {
      console.error(`[google-play] consume retry: ${err.message}`);
    }
  }
  return done;
}

/** Season passes paid but not acknowledged at Google yet (Google refunds them after 3 days): acknowledge now. */
async function acknowledgeLeftovers(db) {
  const { rows } = await db.query(
    `SELECT product_id, store_token FROM payments
      WHERE provider = 'google' AND status = 'paid' AND store_acknowledged_at IS NULL AND store_token IS NOT NULL AND season_key IS NOT NULL LIMIT 200`,
  );
  let done = 0;
  for (const r of rows) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await acknowledge(playId(r.product_id), r.store_token);
      // eslint-disable-next-line no-await-in-loop
      await db.query(`UPDATE payments SET store_acknowledged_at = now() WHERE provider = 'google' AND store_token = $1`, [r.store_token]);
      done += 1;
    } catch (err) {
      console.error(`[google-play] acknowledge retry: ${err.message}`);
    }
  }
  return done;
}

/**
 * Refunds, chargebacks and revocations from Google: every voided purchase takes its coins back
 * once (src/payments/stripe.js revoke). → how many were new.
 */
async function syncVoided(db, { revoke }) {
  const voided = await voidedPurchases();
  let revoked = 0;
  for (const v of voided) {
    // eslint-disable-next-line no-await-in-loop
    const done = await db.withTransaction(async (client) => {
      const { rows: [pay] } = await client.query(
        `SELECT * FROM payments WHERE provider = 'google' AND (store_token = $1 OR ($2::text IS NOT NULL AND provider_ref = $2)) FOR UPDATE`,
        [v.purchaseToken, v.orderId ?? null],
      );
      if (!pay || pay.status === 'pending' || pay.status === 'failed') return null;
      const reason = VOID_REASON[v.voidedReason] ?? 'Refunded';
      const chargeback = Number(v.voidedReason) === 7 || Number(v.voidedReason) === 6;
      const left = (pay.charged_cents ?? pay.amount_cents) - pay.refunded_cents;
      return revoke(client, {
        payment: pay,
        refundId: `google-void-${v.orderId ?? crypto.createHash('sha256').update(v.purchaseToken).digest('hex').slice(0, 40)}`,
        amountCents: Math.max(1, left),
        reason: `Google Play: ${reason}${Number(v.voidedSource) === 0 ? ' (by the player)' : Number(v.voidedSource) === 1 ? ' (by Google)' : ' (by us)'}`,
        action: chargeback ? 'dispute' : 'refund',
      });
    });
    if (done) revoked += 1;
  }
  return revoked;
}

/** Checks the secret in the Pub/Sub push address (constant time). */
function rtdnTokenOk(given) {
  const want = process.env.GOOGLE_PLAY_RTDN_TOKEN || '';
  if (!want || typeof given !== 'string') return false;
  const a = Buffer.from(want);
  const b = Buffer.from(given);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** A Pub/Sub push body → Google's developer notification (or null). */
function decodeRtdn(body) {
  try {
    const data = body?.message?.data;
    if (!data) return null;
    return JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

module.exports = {
  configured, packageName, accountIdFor, redeem, consume, consumeLeftovers, acknowledge, acknowledgeLeftovers, syncVoided, refundOrder,
  getPurchase, voidedPurchases, rtdnTokenOk, decodeRtdn, setTransport, VOID_REASON, playId, ourId, PLAY_ID,
};
