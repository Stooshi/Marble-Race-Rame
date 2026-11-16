'use strict';

/**
 * The bookkeeping amounts of each document (D4, Moses, 16 Nov 2026: SEK amounts from Stripe): what reached the
 * Stripe account, in its own currency (SEK), and Stripe's fee, from the charge's, refund's or dispute's balance
 * transaction. Filled a few minutes after the document is issued (the network calls stay outside the
 * payment's transaction); tried again every run until Stripe has it, for 30 days.
 */
const stripe = require('../payments/stripe');

/** The balance transaction(s) behind one document: { currency, amount, fee } (cents; negative for money out), or null. */
async function balanceOf(api, doc) {
  if (doc.kind === 'receipt') {
    if (!doc.payment_intent) return null;
    const pi = await api.paymentIntents.retrieve(doc.payment_intent, { expand: ['latest_charge.balance_transaction'] });
    const bt = pi.latest_charge?.balance_transaction;
    return bt && typeof bt === 'object' ? { currency: bt.currency, amount: bt.amount, fee: bt.fee } : null;
  }
  if (/^re_/.test(doc.refund_id ?? '')) {
    const r = await api.refunds.retrieve(doc.refund_id, { expand: ['balance_transaction'] });
    const bt = r.balance_transaction;
    return bt && typeof bt === 'object' ? { currency: bt.currency, amount: bt.amount, fee: bt.fee } : null;
  }
  if (/^du_/.test(doc.refund_id ?? '')) {
    const d = await api.disputes.retrieve(doc.refund_id);
    const bts = (d.balance_transactions ?? []).filter((b) => b && typeof b === 'object');
    if (!bts.length) return null;
    return { currency: bts[0].currency, amount: bts.reduce((s, b) => s + b.amount, 0), fee: bts.reduce((s, b) => s + b.fee, 0) };
  }
  return null;
}

/** Fills what Stripe has for documents still without book amounts. → how many filled. */
async function fillBook(db, { limit = 50 } = {}) {
  if (!stripe.configured()) return 0;
  const api = stripe.api();
  const { rows } = await db.query(
    `SELECT d.id, d.kind, d.refund_id, p.payment_intent FROM billing_documents d JOIN payments p ON p.id = d.payment_id
      WHERE d.book_filled_at IS NULL AND d.created_at > now() - interval '30 days' ORDER BY d.created_at LIMIT $1`,
    [limit],
  );
  let filled = 0;
  for (const doc of rows) {
    try {
      const b = await balanceOf(api, doc);
      if (!b) continue;
      await db.query(
        `UPDATE billing_documents SET book_currency = upper($2), book_gross_cents = $3, book_fee_cents = $4, book_filled_at = now()
          WHERE id = $1 AND book_filled_at IS NULL`,
        [doc.id, b.currency, b.amount, b.fee],
      );
      filled += 1;
    } catch (err) {
      console.warn(`[billing] book amounts for ${doc.id} not found yet: ${err.message}`);
    }
  }
  return filled;
}

module.exports = { balanceOf, fillBook };
