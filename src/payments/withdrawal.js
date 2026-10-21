'use strict';

/**
 * The online withdrawal function (EU Consumer Rights Directive art. 11a, from 19 June 2026; Moses,
 * 21 Oct 2026): a player withdraws from a purchase still within its withdrawal period with a clearly
 * labelled button on their Purchases page ("Withdraw from this purchase", then "Confirm withdrawal"),
 * and gets an acknowledgement by email (./emails.js, once email is on).
 *
 * Which purchases are still within a withdrawal period:
 *   - a season pass bought in its pre-sale, until the season starts (it isn't delivered before then):
 *     the website (Stripe) and Google Play ones are refunded in full from here; the pass goes when the
 *     refund comes back (Stripe's refund event, Google's voided purchase), like any refund;
 *     iPhone (App Store) ones: Apple is the seller there, so the page says to ask Apple.
 *   - coin packs never: the player asks for immediate delivery and agrees that this ends the right of
 *     withdrawal (the two boxes at checkout, stored in payments.consent_text), and the coins arrive at once.
 *   - a pass bought once its season has started: the same, delivered at once with that agreement.
 * payments.withdrawn_at records the player's withdrawal (whatever then happens to the refund).
 */
const seasons = require('../seasons');
const { badRequest, conflict, notFound } = require('../utils/httpError');

const REFUNDED_HERE = new Set(['stripe', 'google', 'test']);

/**
 * Whether a paid order can still be withdrawn from at `now`, from its row (with season_key, status,
 * paid_at, refunded_cents, withdrawn_at, provider) and its season. → null, or
 * { until (ISO time: the season's start), via: 'here' | 'apple' }.
 */
function withdrawalOf(order, season, now = new Date()) {
  if (!order?.season_key || !season || order.status !== 'paid' || order.withdrawn_at || Number(order.refunded_cents) > 0) return null;
  if (seasons.stateOf(season, now) !== 'before') return null;
  if (!order.paid_at || new Date(order.paid_at) >= new Date(season.starts_at)) return null;
  return { until: new Date(season.starts_at).toISOString(), via: order.provider === 'apple' ? 'apple' : REFUNDED_HERE.has(order.provider) ? 'here' : 'apple' };
}

/** Adds `withdraw` ({ until, via } or null) to a player's orders (the Purchases page). */
async function annotate(db, orders, now = new Date()) {
  const all = await seasons.all(db);
  return orders.map((o) => ({ ...o, withdraw: withdrawalOf(o, all.find((s) => s.key === o.season_key), now) }));
}

/**
 * The player withdraws from one of their orders. `refund(db, paymentId, opts)` is
 * src/payments → refund (passed in: no circular require). → { order_no, status: 'refund-requested' }.
 */
async function withdraw(db, userId, orderNo, { refund, now = new Date() }) {
  const pay = await db.withTransaction(async (client) => {
    const { rows: [p] } = await client.query('SELECT * FROM payments WHERE user_id = $1 AND order_no = $2 FOR UPDATE', [userId, orderNo]);
    if (!p) throw notFound('No such order');
    if (p.withdrawn_at) throw conflict('You have already withdrawn from this purchase');
    const w = withdrawalOf(p, await seasons.byKey(client, p.season_key), now);
    if (!w) throw badRequest('This purchase can no longer be withdrawn from');
    if (w.via === 'apple') throw badRequest('Bought in the iPhone app: Apple handles withdrawals and refunds there (reportaproblem.apple.com)');
    await client.query('UPDATE payments SET withdrawn_at = now() WHERE id = $1', [p.id]);
    return p;
  });
  try {
    await refund(db, pay.id, { adminId: null, reason: 'Withdrawal by the player (online withdrawal function, before the pass activated)' });
  } catch (err) {
    // The withdrawal stands (it is the player's legal right and is on record); the refund is retried by hand.
    await db.query(
      'INSERT INTO admin_audit (admin_id, action, target_user_id, reason, details) VALUES (NULL, $1, $2, $3, $4)',
      ['withdrawal-refund-failed', userId, `Refund for a withdrawal failed: ${err.message}`.slice(0, 500), JSON.stringify({ order_no: pay.order_no, payment_id: pay.id })],
    );
    console.error(`[payments] withdrawal ${pay.order_no}: refund failed: ${err.message}`);
  }
  return { order_no: pay.order_no, status: 'refund-requested' };
}

module.exports = { withdrawalOf, annotate, withdraw };
