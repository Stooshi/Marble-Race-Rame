'use strict';

/**
 * Payments for credits behind one interface, whichever store takes the money:
 *
 *   stripe  the website (Stripe Checkout)            [placeholder until there are keys]
 *   apple   the iPhone app (App Store in-app purchase) [placeholder until the app exists]
 *   google  the Android app (Google Play billing)      [placeholder until the app exists]
 *   test    local development only: pays at once      (PAYMENTS_TEST=true, never in production)
 *
 * Every provider ends in the same place: grant(), which marks the payment paid
 * and adds the pack's credits exactly once. Credits are then spent in the shop
 * like coins (src/marbles/collection.js). Looks only, never speed.
 *
 * A provider is { name, configured(), start(payment, ctx) → next, verify?(input) → { ref, productId } }:
 *   start: begins a web checkout and says what the client does next,
 *          { kind: 'redirect', url } or { kind: 'done' } or { kind: 'unavailable', message };
 *   verify: checks a store receipt from an app and returns its transaction id and product.
 */

const packsFile = require('../../client/src/shared/payments/packs.json');
const config = require('../config');
const { HttpError, badRequest, notFound } = require('../utils/httpError');

const PACKS = new Map(packsFile.packs.map((p) => [p.id, p]));

const notYet = (what) => ({ kind: 'unavailable', message: `${what} isn't connected yet. [Placeholder]` });

const PROVIDERS = {
  stripe: {
    name: 'stripe',
    // Ready once STRIPE_SECRET_KEY is set and the Checkout session call below is written.
    configured: () => false,
    start: async () => notYet('[Stripe] payment'),
  },
  apple: {
    name: 'apple',
    configured: () => false,
    start: async () => notYet('App Store purchase'),
    verify: async () => { throw new HttpError(501, 'App Store receipts are not checked yet. [Placeholder]'); },
  },
  google: {
    name: 'google',
    configured: () => false,
    start: async () => notYet('Google Play purchase'),
    verify: async () => { throw new HttpError(501, 'Google Play receipts are not checked yet. [Placeholder]'); },
  },
  test: {
    name: 'test',
    configured: () => !config.isProduction && process.env.PAYMENTS_TEST === 'true',
    start: async () => ({ kind: 'done' }),
  },
};

function pack(productId) {
  const p = PACKS.get(productId);
  if (!p) throw notFound('No such credit pack');
  return p;
}

/** Which providers can take money right now (the client shows the others as placeholders). */
function available() {
  return Object.fromEntries(Object.values(PROVIDERS).map((p) => [p.name, p.configured()]));
}

/** Adds a paid payment's credits, once. Returns the player's new credit balance (or null if it was already granted). */
async function grant(client, paymentId, providerRef = null) {
  const { rows: [pay] } = await client.query(
    `UPDATE payments SET status = 'paid', paid_at = now(), provider_ref = COALESCE($2, provider_ref)
      WHERE id = $1 AND status = 'pending' RETURNING user_id, credits`,
    [paymentId, providerRef],
  );
  if (!pay) return null;
  const { rows: [user] } = await client.query('UPDATE users SET credits = credits + $2 WHERE id = $1 RETURNING credits', [pay.user_id, pay.credits]);
  return user.credits;
}

/** Starts buying a credit pack with a provider. */
async function checkout(client, userId, { productId, provider: providerName }) {
  const provider = PROVIDERS[providerName];
  if (!provider) throw badRequest('Unknown payment provider');
  const p = pack(productId);
  if (!provider.configured()) {
    return { payment: null, next: await provider.start(null, {}) };
  }
  const { rows: [payment] } = await client.query(
    `INSERT INTO payments (user_id, provider, product_id, credits, amount_cents, currency)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, status, product_id, credits, amount_cents, currency`,
    [userId, provider.name, p.id, p.credits, p.amountCents, p.currency],
  );
  const next = await provider.start(payment, { userId });
  if (next.kind === 'done') {
    const credits = await grant(client, payment.id, `test-${payment.id}`);
    return { payment: { ...payment, status: 'paid' }, next, credits };
  }
  return { payment, next };
}

/** An app's store purchase: check the receipt, record it once, add the credits. */
async function redeemReceipt(client, userId, { provider: providerName, receipt }) {
  const provider = PROVIDERS[providerName];
  if (!provider?.verify) throw badRequest('Unknown store');
  const { ref, productId } = await provider.verify(receipt);
  const p = pack(productId);
  const { rows: [payment] } = await client.query(
    `INSERT INTO payments (user_id, provider, provider_ref, product_id, credits, amount_cents, currency)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (provider, provider_ref) DO NOTHING RETURNING id`,
    [userId, provider.name, ref, p.id, p.credits, p.amountCents, p.currency],
  );
  if (!payment) return { credits: null, duplicate: true };
  return { credits: await grant(client, payment.id) };
}

module.exports = { PROVIDERS, PACKS, available, checkout, grant, redeemReceipt };
