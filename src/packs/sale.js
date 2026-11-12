'use strict';

/**
 * Selling track packs (Moses, 12 Nov 2026). Every pack has one price, in
 * client/src/shared/payments/trackPacks.json (a campaign changes it there, no code): $7.99 by default, shown in
 * the player's own currency with VAT included; or the same pack with at most 25% of the price paid in coins
 * (1,990 coins + $5.99), never coins alone.
 *
 * Products (the same ids on the website and the App Store; Google Play writes them with _):
 *   trackpack-<pack>         the pack for real money             (Play: trackpack_<pack with _>)
 *   trackpack-<pack>-coins   the pack for coins + real money     (Play: trackpack_<pack>_coins)
 * Both are kept, never consumed (App Store: non-consumable; Google Play: acknowledged).
 *
 * Who can buy: only while pack locking is on for the player (the TRACK_PACKS switch: 'admins' for admin
 * accounts, 'on' for everyone; off: no pack is sold, nothing is locked). A pack is on sale once it has
 * `fullAt` (20) live tracks; before that it is "Coming soon", except a test purchase by an admin (Stripe
 * in test mode, a Google Play licence tester, the App Store sandbox), so Moses can try the whole flow.
 *
 * Coins: on the website they are taken when the Stripe checkout starts and given back if it lapses or
 * fails. In the apps the coins are set aside (a hold) before the store's sheet opens, used by the purchase
 * once the server has checked it, given back when the sheet is closed, or after 2 hours unused. Every
 * coin move goes through economy.change (kinds 'track-pack' and 'track-pack-back').
 * A full refund takes the pack back and gives the coins back; a chargeback takes the pack, the coins stay spent.
 */

const settings = require('../../client/src/shared/payments/trackPacks.json');
const economy = require('../economy');
const packs = require('./index');
const { HttpError, badRequest, conflict, notFound } = require('../utils/httpError');

const PREFIX = 'trackpack-';
const WITH_COINS = '-coins';
const HOLD_MS = 2 * 3600_000;

/** The price, from the settings file. */
const PRICE = Object.freeze({
  currency: settings.currency,
  cents: settings.priceCents,
  storeCents: settings.storeAmountCents,
  withCoins: { coins: settings.withCoins.coins, cents: settings.withCoins.priceCents, storeCents: settings.withCoins.storeAmountCents },
  maxCoinShare: settings.maxCoinShare,
  fullAt: settings.fullAt,
});

/** Whether the settings keep the rules: coins at most maxCoinShare of the price, never coins alone. */
function checkPrice(s = settings) {
  const coinCents = (s.withCoins.coins * s.coinValueCentsPer1000) / 1000;
  if (!(s.priceCents > 0 && s.withCoins.priceCents > 0)) return 'A pack is never sold for coins alone';
  if (coinCents > s.priceCents * s.maxCoinShare + 1e-9) return `Coins pay at most ${Math.round(s.maxCoinShare * 100)}% of the price`;
  if (s.withCoins.priceCents + coinCents > s.priceCents + 1e-9) return 'Coins and money together cost no more than the price';
  return null;
}

const productId = (packKey, withCoins = false) => `${PREFIX}${packKey}${withCoins ? WITH_COINS : ''}`;

/** trackpack-grand-prix(-coins) → { packKey, withCoins } or null. */
function parseProduct(id) {
  const m = /^trackpack-([a-z0-9-]+?)(-coins)?$/.exec(String(id ?? ''));
  return m ? { packKey: m[1], withCoins: Boolean(m[2]) } : null;
}

async function packRow(db, key) {
  const { rows: [p] } = await db.query('SELECT key, name, series, sort FROM track_packs WHERE key = $1', [key]);
  return p ?? null;
}

/** The pack's live tracks (its own, not the free ones): how many. */
async function liveCount(db, key) {
  const { rows: [r] } = await db.query('SELECT count(*)::int AS n FROM tracks WHERE pack_key = $1 AND NOT is_free AND is_active', [key]);
  return r.n;
}

async function roleOf(db, userId) {
  const { rows: [u] } = await db.query('SELECT role, is_guest FROM users WHERE id = $1 AND deleted_at IS NULL', [userId]);
  return u ?? null;
}

/** Whether packs are sold to this player at all (pack locking on for them). */
const sellsTo = (role, env = process.env) => packs.lockingFor(role, env);

/**
 * May this purchase go ahead? → null, or a reason: 'not-sold' (locking off for the player),
 * 'coming-soon' (fewer than 20 live tracks, not an admin's test purchase), 'already-owned'.
 */
async function refusal(db, userId, packKey, { test = false, env = process.env } = {}) {
  const u = await roleOf(db, userId);
  if (!u) return 'not-sold';
  if (!sellsTo(u.role, env)) return 'not-sold';
  if (await liveCount(db, packKey) < PRICE.fullAt && !(test && u.role === 'admin')) return 'coming-soon';
  if (await packs.owns(db, userId, packKey)) return 'already-owned';
  return null;
}

const REFUSED = {
  'not-sold': (p) => new HttpError(403, `The ${p.name} pack isn't for sale yet`, { code: 'pack_not_sold' }),
  'coming-soon': (p) => new HttpError(409, `The ${p.name} pack is coming soon`, { code: 'pack_coming_soon' }),
  'already-owned': (p) => conflict(`You already have the ${p.name} pack`),
};

/**
 * A pack as a store product, or null: { id, coins: 0, amountCents, storeAmountCents, currency, packKey,
 * withCoins, coinsSpent, name, keep: true } (kept, never consumed).
 */
async function packProduct(db, id) {
  const parsed = parseProduct(id);
  if (!parsed) return null;
  const p = await packRow(db, parsed.packKey);
  if (!p) return null;
  const price = parsed.withCoins ? PRICE.withCoins : PRICE;
  return {
    id: productId(p.key, parsed.withCoins), coins: 0, amountCents: price.cents, storeAmountCents: price.storeCents, currency: PRICE.currency,
    packKey: p.key, withCoins: parsed.withCoins, coinsSpent: parsed.withCoins ? PRICE.withCoins.coins : 0, name: `${p.name} pack`, keep: true, pack: p,
  };
}

/** A paid pack payment gives the pack, once. → 'granted' or 'already-held' (a second one paid for: flagged for a refund). */
async function grantForPayment(client, payment) {
  const { rows: [own] } = await client.query(
    `INSERT INTO pack_owners (user_id, pack_key, payment_id, provider) VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, pack_key) WHERE revoked_at IS NULL DO NOTHING RETURNING id`,
    [payment.user_id, payment.pack_key, payment.id, payment.provider],
  );
  if (own) return 'granted';
  await client.query(
    'INSERT INTO admin_audit (admin_id, action, target_user_id, reason, details) VALUES (NULL, $1, $2, $3, $4)',
    ['pack-duplicate', payment.user_id, 'A track pack the player already had was paid for: refund it', JSON.stringify({ order_no: payment.order_no, payment_id: payment.id, pack: payment.pack_key })],
  );
  return 'already-held';
}

/**
 * A pack payment refunded in full or disputed → its pack taken back. A refund also gives back the coins
 * paid towards it (`coinsBack`); a chargeback doesn't. → { revoked, coinsBack }.
 */
async function revokeForPayment(client, payment, reason, { coinsBack = true } = {}) {
  const { rowCount } = await client.query(
    'UPDATE pack_owners SET revoked_at = now(), revoke_reason = $2 WHERE payment_id = $1 AND revoked_at IS NULL',
    [payment.id, reason],
  );
  let back = 0;
  if (coinsBack && payment.coins_spent > 0) back = await giveBackOnce(client, payment, `${payment.order_no ?? payment.product_id} refunded: the coins paid towards it`);
  return { revoked: rowCount > 0, coinsBack: back };
}

/** Gives back a payment's coins once (the ledger is the record: a 'track-pack-back' line for the payment). */
async function giveBackOnce(client, payment, note) {
  if (!(payment.coins_spent > 0)) return 0;
  const { rows: [had] } = await client.query(
    `SELECT 1 FROM coin_ledger WHERE payment_id = $1 AND kind = 'track-pack-back' LIMIT 1`, [payment.id],
  );
  if (had) return 0;
  await economy.change(client, { userId: payment.user_id, amount: payment.coins_spent, kind: 'track-pack-back', paymentId: payment.id, note }, { mustCover: false });
  return payment.coins_spent;
}

/** A website checkout that lapsed or failed: its coins back. */
const checkoutFailed = (client, payment) => giveBackOnce(client, payment, `${payment.order_no} not paid: the coins back`);

/** The website: takes the coins for a pack checkout (with the payment's id). → false when the player hasn't enough. */
async function takeCoins(client, { userId, paymentId, coins, packName, orderNo }) {
  const done = await economy.change(client, { userId, amount: -coins, kind: 'track-pack', paymentId, note: `${orderNo}: towards the ${packName}` });
  return Boolean(done);
}

/**
 * The apps: sets coins aside for a pack before the store's sheet opens. → { holdId, coins }.
 * Refused like a checkout (not sold, coming soon, owned) and when the player hasn't the coins (400 Not enough coins).
 */
async function holdCoins(db, userId, packKey, { test = false, env = process.env } = {}) {
  const p = await packRow(db, packKey);
  if (!p) throw notFound('No such track pack');
  const why = await refusal(db, userId, packKey, { test, env });
  if (why) throw REFUSED[why](p);
  return db.withTransaction(async (client) => {
    const coins = PRICE.withCoins.coins;
    const { rows: [hold] } = await client.query('INSERT INTO pack_coin_holds (user_id, pack_key, coins) VALUES ($1, $2, $3) RETURNING id', [userId, packKey, coins]);
    const done = await economy.change(client, { userId, amount: -coins, kind: 'track-pack', note: `set aside for the ${p.name} pack (hold ${hold.id})` });
    if (!done) throw badRequest('Not enough coins');
    return { holdId: hold.id, coins };
  });
}

/** Gives a hold's coins back (the sheet was closed, or it lapsed), once. → the coins given back (0 if used or done). */
async function releaseHold(client, { holdId, userId = null, why = 'the purchase was not made' }) {
  const { rows: [h] } = await client.query(
    `UPDATE pack_coin_holds SET released_at = now() WHERE id = $1 AND used_at IS NULL AND released_at IS NULL ${userId ? 'AND user_id = $2' : ''}
     RETURNING user_id, pack_key, coins`,
    userId ? [holdId, userId] : [holdId],
  );
  if (!h) return 0;
  await economy.change(client, { userId: h.user_id, amount: h.coins, kind: 'track-pack-back', note: `back: ${why} (hold ${holdId})` }, { mustCover: false });
  return h.coins;
}

/** Holds unused for 2 hours: their coins back. → how many. Hourly (src/server.js). */
async function releaseStaleHolds(db, now = new Date()) {
  const { rows } = await db.query(
    'SELECT id FROM pack_coin_holds WHERE used_at IS NULL AND released_at IS NULL AND created_at < $1',
    [new Date(now.getTime() - HOLD_MS)],
  );
  let n = 0;
  for (const r of rows) n += (await db.withTransaction((c) => releaseHold(c, { holdId: r.id, why: 'not used within 2 hours' }))) > 0 ? 1 : 0;
  return n;
}

/**
 * A store purchase of a pack, inside the store's redeem transaction, before its payment is recorded:
 * → null (go ahead), or a status that refuses it ('not-on-sale', 'already-owned', 'coins-missing').
 * `test`: a store test purchase (a Google licence tester, the App Store sandbox).
 */
async function storeRefusal(client, userId, p, { test = false, env = process.env } = {}) {
  const why = await refusal(client, userId, p.packKey, { test, env });
  if (why === 'already-owned') return 'already-owned';
  if (why) return 'not-on-sale';
  if (p.withCoins) {
    const { rows: [h] } = await client.query(
      `SELECT id FROM pack_coin_holds WHERE user_id = $1 AND pack_key = $2 AND used_at IS NULL AND released_at IS NULL ORDER BY created_at LIMIT 1 FOR UPDATE`,
      [userId, p.packKey],
    );
    if (!h) {
      const { rows: [u] } = await client.query('SELECT coins FROM users WHERE id = $1', [userId]);
      if (!(u?.coins >= p.coinsSpent)) return 'coins-missing';
    }
  }
  return null;
}

/** …and once its payment is recorded: the coins it was bought with taken (the hold used, or the coins now). */
async function storeTakeCoins(client, userId, p, payment) {
  if (!p.withCoins) return;
  const { rows: [h] } = await client.query(
    `UPDATE pack_coin_holds SET used_at = now(), payment_id = $3
      WHERE id = (SELECT id FROM pack_coin_holds WHERE user_id = $1 AND pack_key = $2 AND used_at IS NULL AND released_at IS NULL ORDER BY created_at LIMIT 1)
      RETURNING id`,
    [userId, p.packKey, payment.id],
  );
  if (h) return;
  const done = await economy.change(client, { userId, amount: -p.coinsSpent, kind: 'track-pack', paymentId: payment.id, note: `${payment.order_no}: towards the ${p.name}` });
  if (!done) throw new Error('coins went missing during the purchase'); // (checked just before, in the same transaction)
}

/** A track's one line for a pack's page: the start of its description (to the first colon or full stop). */
function oneLine(description) {
  const d = String(description ?? '').trim();
  if (!d) return '';
  const first = d.split(/(?<=\.)\s/)[0];
  const parts = first.split(': ');
  let line = parts.length > 1 && parts[1].length > 20 ? parts[1] : parts[0];
  line = line.replace(/\.$/, '');
  if (line.length > 110) line = `${line.slice(0, 107).replace(/[\s,;]+\S*$/, '')}…`;
  return line[0].toUpperCase() + line.slice(1);
}

/** The packs for the shop: each with its live count, wildness mix, picture, whether it's complete and owned. */
async function shopPacks(db, { userId = null, role = null, env = process.env } = {}) {
  const { rows } = await db.query(
    `SELECT p.key, p.name, p.series, p.sort,
            count(t.*) FILTER (WHERE t.is_active AND NOT t.is_free)::int AS live,
            count(t.*) FILTER (WHERE t.is_active AND NOT t.is_free AND t.wildness = 'easy')::int AS easy,
            count(t.*) FILTER (WHERE t.is_active AND NOT t.is_free AND t.wildness = 'wild')::int AS wild,
            count(t.*) FILTER (WHERE t.is_active AND NOT t.is_free AND t.wildness = 'extreme')::int AS extreme,
            (array_agg(t.slug ORDER BY t.wildness_score DESC NULLS LAST) FILTER (WHERE t.is_active AND NOT t.is_free))[1] AS pic
       FROM track_packs p LEFT JOIN tracks t ON t.pack_key = p.key
      GROUP BY p.key ORDER BY p.sort`,
  );
  const held = userId ? await packs.packsOf(db, userId) : new Set();
  return {
    onSale: sellsTo(role, env),
    testBuy: role === 'admin',
    price: priceInfo(),
    packs: rows.map((r) => ({
      key: r.key, name: r.name, series: r.series, pic: PICTURES[r.key] ?? r.pic, live: r.live, fullAt: PRICE.fullAt,
      complete: r.live >= PRICE.fullAt, mix: { easy: r.easy, wild: r.wild, extreme: r.extreme }, owned: held.has(r.key),
      products: { money: productId(r.key), coins: productId(r.key, true) },
    })),
  };
}

/** Each pack's best-looking track, for its card (the approved mockup, 12 Nov 2026); else its wildest. */
const PICTURES = {
  'grand-prix': 'pudong-marble-grand-prix', 'world-tour': 'saint-tropez', coasters: 'phantom-peak', canyons: 'tiger-leaping-spins',
  'blocks-1': 'bonus-round', 'blocks-2': 'venice-cube-canals', 'track-and-field': 'stockholm-1912-relay', rivers: 'zambezi-falls-run',
  peaks: 'k2-concordia', pinball: 'grand-champion', arcade: 'kill-screen',
};

const priceInfo = () => ({
  currency: PRICE.currency, cents: PRICE.cents, label: `$${(PRICE.cents / 100).toFixed(2)}`,
  withCoins: { coins: PRICE.withCoins.coins, cents: PRICE.withCoins.cents, label: `$${(PRICE.withCoins.cents / 100).toFixed(2)}` },
  maxCoinShare: PRICE.maxCoinShare,
});

/** One pack's page: the pack and every live track in it, with its one line; and the planned ones still to come. */
async function packPage(db, key, opts = {}) {
  const shop = await shopPacks(db, opts);
  const pack = shop.packs.find((p) => p.key === key);
  if (!pack) throw notFound('No such track pack');
  const { rows } = await db.query(
    `SELECT slug, name, description, wildness, wildness_score FROM tracks
      WHERE pack_key = $1 AND NOT is_free AND is_active ORDER BY wildness_score DESC NULLS LAST, name`,
    [key],
  );
  return {
    onSale: shop.onSale, testBuy: shop.testBuy, price: shop.price,
    pack: { ...pack, tracks: rows.map((t) => ({ slug: t.slug, name: t.name, wildness: t.wildness, line: oneLine(t.description) })), planned: settings.planned?.[key] ?? [] },
  };
}

module.exports = {
  PRICE, PREFIX, HOLD_MS, checkPrice, productId, parseProduct, packRow, liveCount, sellsTo, refusal, REFUSED, packProduct,
  grantForPayment, revokeForPayment, checkoutFailed, takeCoins, holdCoins, releaseHold, releaseStaleHolds, storeRefusal,
  storeTakeCoins, oneLine, shopPacks, packPage, priceInfo,
};
