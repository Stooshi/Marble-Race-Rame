/**
 * Buying coin packs with real money, behind one interface for the website and the phone apps.
 *
 *   web (Stripe)       start a checkout on the server, then follow its next step
 *                      (go to the payment page, or it's done, or not available yet)
 *   Android app        Google Play Billing (@capgo/native-purchases): buy the product with the
 *                      player's Play account id, then send the purchase to the server, which checks
 *                      it with Google before adding the coins (src/payments/google.js); the server
 *                      consumes it at Google. Stripe is never used inside the apps.
 *   iPhone app         App Store purchase: not built yet (reports "not available yet")
 *
 * Screens call buyCoins(pack) and never care which store took the money.
 */
import { useEffect, useState } from 'react';
import { api } from '../../api/client';

/** Which store this copy of the site runs in: 'apple', 'google' or 'stripe' (the web). */
export function storeProvider() {
  const cap = typeof window !== 'undefined' ? window.Capacitor : null;
  if (cap?.isNativePlatform?.()) return cap.getPlatform?.() === 'ios' ? 'apple' : 'google';
  return import.meta.env.VITE_PAYMENTS_TEST === 'true' ? 'test' : 'stripe';
}

export const STORE_NAME = { stripe: 'Stripe', apple: 'the App Store', google: 'Google Play', test: 'a test payment' };

const billing = () => import('@capgo/native-purchases');

/** Google's own error for "the player closed the purchase sheet". */
const cancelled = (err) => /cancel/i.test(`${err?.code ?? ''} ${err?.message ?? ''}`);

const ADAPTERS = {
  /** The web: the server starts a Stripe Checkout (or a test payment in development). */
  async web(pack, provider, { consent }) {
    const { next, coins } = await api.checkout({ productId: pack.id, provider, consent });
    if (next.kind === 'redirect') {
      window.location.assign(next.url);
      return { status: 'redirecting' };
    }
    if (next.kind === 'done') return { status: 'paid', coins };
    return { status: 'unavailable', message: next.message };
  },

  /** Android: Google Play Billing, then the server checks the purchase with Google and adds the coins. */
  async google(pack) {
    const { accountId, live } = await api.googleAccount();
    if (!live) return { status: 'unavailable', message: 'Buying coins in the app isn\'t switched on yet. Please try again later.' };
    const { NativePurchases, PURCHASE_TYPE } = await billing();
    const { isBillingSupported } = await NativePurchases.isBillingSupported();
    if (!isBillingSupported) return { status: 'unavailable', message: 'Google Play purchases aren\'t available on this device.' };
    let t;
    try {
      t = await NativePurchases.purchaseProduct({
        productIdentifier: pack.id,
        productType: PURCHASE_TYPE.INAPP,
        appAccountToken: accountId, // (Google's obfuscatedAccountId: ties the purchase to this player)
        isConsumable: false, // (the server consumes it, after checking it and adding the coins)
        autoAcknowledgePurchases: false,
      });
    } catch (err) {
      if (cancelled(err)) return { status: 'cancelled' };
      throw err;
    }
    if (!t?.purchaseToken) return { status: 'pending', message: 'Google Play is still processing your payment. Your coins arrive as soon as it\'s done.' };
    return verifyGoogle(pack.id, t.purchaseToken);
  },

  /** iPhone: the App Store purchase isn't built yet. */
  async apple() {
    return { status: 'unavailable', message: 'Buying coins in the iPhone app isn\'t available yet.' };
  },
};

async function verifyGoogle(productId, purchaseToken) {
  const r = await api.googleVerify({ productId, purchaseToken });
  if (r.status === 'paid' || r.status === 'duplicate') return { status: 'paid', coins: r.coins, orderNo: r.orderNo };
  if (r.status === 'pending') return { status: 'pending', message: 'Google Play is still processing your payment. Your coins arrive as soon as it\'s done.' };
  return { status: 'unavailable', message: 'Google Play cancelled this purchase. Nothing was charged.' };
}

/** Buys a coin pack with this platform's store. `consent`: the player ticked immediate delivery + the terms (the server refuses without it on the web).
 * Resolves { status: 'paid'|'redirecting'|'pending'|'cancelled'|'unavailable', coins?, message? }. */
export function buyCoins(pack, { consent = false } = {}) {
  const provider = storeProvider();
  if (provider === 'google') return ADAPTERS.google(pack);
  if (provider === 'apple') return ADAPTERS.apple();
  return ADAPTERS.web(pack, provider, { consent });
}

/**
 * Android: purchases Google Play still holds unconsumed (the app was closed before the server
 * confirmed, or a pending payment completed): sent to the server, which adds their coins once.
 * Safe to call any time; the server also learns about them from Google's notifications.
 */
export async function resumeStorePurchases() {
  if (storeProvider() !== 'google') return 0;
  try {
    const { NativePurchases, PURCHASE_TYPE } = await billing();
    const { purchases = [] } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.INAPP });
    let n = 0;
    for (const p of purchases) {
      if (!p.purchaseToken || !p.productIdentifier) continue;
      const r = await verifyGoogle(p.productIdentifier, p.purchaseToken).catch(() => null);
      if (r?.status === 'paid') n += 1;
    }
    return n;
  } catch {
    return 0;
  }
}

/** Android: the coin packs' prices as Google Play shows them (local currency) → { [packId]: '49,00 kr' }. */
export function useStorePrices(packs) {
  const [prices, setPrices] = useState({});
  const ids = packs.map((p) => p.id).join(',');
  useEffect(() => {
    if (storeProvider() !== 'google') return undefined;
    let live = true;
    billing().then(({ NativePurchases, PURCHASE_TYPE }) => NativePurchases.getProducts({ productIdentifiers: ids.split(','), productType: PURCHASE_TYPE.INAPP }))
      .then(({ products = [] }) => { if (live) setPrices(Object.fromEntries(products.map((p) => [p.identifier, p.priceString]))); })
      .catch(() => {});
    return () => { live = false; };
  }, [ids]);
  return prices;
}
