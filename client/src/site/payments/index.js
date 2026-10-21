/**
 * Buying coin packs with real money, behind one interface for the website and the phone apps.
 *
 *   web (Stripe)       start a checkout on the server, then follow its next step
 *                      (go to the payment page, or it's done, or not available yet)
 *   Android app        Google Play Billing (@capgo/native-purchases): buy the product with the
 *                      player's Play account id, then send the purchase to the server, which checks
 *                      it with Google before adding the coins (src/payments/google.js); the server
 *                      consumes it at Google. Stripe is never used inside the apps.
 *   iPhone app         App Store in-app purchases (StoreKit 2, the same plugin): buy the product with
 *                      the player's App Store account token, send the signed transaction to the
 *                      server, which checks Apple's signature before adding the coins
 *                      (src/payments/apple.js), then finish the transaction in StoreKit. Transactions
 *                      left unfinished (the app closed first) are sent again at the next start.
 *
 * Screens call buyCoins(pack) (or buyPass(season) for a season pass, which is kept: Google Play
 * acknowledges it, never consumes it; on iPhone it is a non-consumable, with restorePurchases())
 * and never care which store took the money.
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

  /** iPhone: the App Store (StoreKit 2), then the server checks Apple's signature and adds the coins. */
  async apple(productId, what = 'coins') {
    const { accountToken, live } = await api.appleAccount();
    if (!live) return { status: 'unavailable', message: 'Buying in the iPhone app isn\'t switched on yet. Please try again later.' };
    const { NativePurchases, PURCHASE_TYPE } = await billing();
    await NativePurchases.configure?.({ autoFinishTransactions: false }); // (finished only once the server has it)
    let t;
    try {
      t = await NativePurchases.purchaseProduct({
        productIdentifier: productId,
        productType: PURCHASE_TYPE.INAPP,
        appAccountToken: accountToken, // (StoreKit's appAccountToken: ties the purchase to this player)
        autoAcknowledgePurchases: false,
      });
    } catch (err) {
      if (cancelled(err)) return { status: 'cancelled' };
      throw err;
    }
    if (!t?.jwsRepresentation) return { status: 'pending', message: `The App Store is still processing your payment (Ask to Buy, or a slower method). Your ${what} arrive${what === 'coins' ? '' : 's'} as soon as it's done.` };
    return verifyApple(t);
  },
};

/** Sends an App Store transaction to the server and finishes it in StoreKit once the server has it. */
async function verifyApple(t) {
  const r = await api.appleVerify({ signedTransaction: t.jwsRepresentation });
  if (r.finish && t.transactionId) {
    const { NativePurchases } = await billing();
    await NativePurchases.finishTransaction({ transactionId: String(t.transactionId) }).catch(() => {});
  }
  if (r.status === 'paid' || r.status === 'duplicate') return { status: 'paid', coins: r.coins, pass: r.pass, orderNo: r.orderNo };
  if (r.status === 'already-owned') return { status: 'unavailable', message: 'You already have this pass. You can ask Apple for a refund of the second payment (reportaproblem.apple.com).' };
  if (r.status === 'not-on-sale') return { status: 'unavailable', message: 'This pass isn\'t on sale now. You can ask Apple for a refund (reportaproblem.apple.com).' };
  return { status: 'unavailable', message: 'The App Store refunded or cancelled this purchase.' };
}

async function verifyGoogle(productId, purchaseToken) {
  const r = await api.googleVerify({ productId, purchaseToken });
  if (r.status === 'paid' || r.status === 'duplicate') return { status: 'paid', coins: r.coins, pass: r.pass, orderNo: r.orderNo };
  if (r.status === 'already-owned') return { status: 'unavailable', message: 'You already have this pass. Google Play refunds the second payment by itself within 3 days.' };
  if (r.status === 'not-on-sale') return { status: 'unavailable', message: 'This pass isn\'t on sale now. Google Play refunds the payment by itself within 3 days.' };
  if (r.status === 'pending') return { status: 'pending', message: 'Google Play is still processing your payment. Your coins arrive as soon as it\'s done.' };
  return { status: 'unavailable', message: 'Google Play cancelled this purchase. Nothing was charged.' };
}

/** Buys a coin pack with this platform's store. `consent`: the player ticked immediate delivery + the terms (the server refuses without it on the web).
 * Resolves { status: 'paid'|'redirecting'|'pending'|'cancelled'|'unavailable', coins?, message? }. */
export function buyCoins(pack, { consent = false } = {}) {
  const provider = storeProvider();
  if (provider === 'google') return ADAPTERS.google(pack);
  if (provider === 'apple') return ADAPTERS.apple(pack.id);
  return ADAPTERS.web(pack, provider, { consent });
}

/**
 * Buys a season's pass (real money only). `season`: from /api/seasons (its pass.productId). Web:
 * Stripe Checkout (the pass comes from Stripe's webhook); Android: Google Play, kept, never consumed.
 * Resolves like buyCoins, with pass instead of coins.
 */
export async function buyPass(season, { consent = false } = {}) {
  const provider = storeProvider();
  if (provider === 'apple') return ADAPTERS.apple(season.pass.productId, 'pass');
  if (provider === 'google') {
    const { accountId, live } = await api.googleAccount();
    if (!live) return { status: 'unavailable', message: 'Buying in the app isn\'t switched on yet. Please try again later.' };
    const { NativePurchases, PURCHASE_TYPE } = await billing();
    let t;
    try {
      t = await NativePurchases.purchaseProduct({
        productIdentifier: season.pass.productId,
        productType: PURCHASE_TYPE.INAPP,
        appAccountToken: accountId,
        isConsumable: false, // (a pass is kept: the server acknowledges it after checking it)
        autoAcknowledgePurchases: false,
      });
    } catch (err) {
      if (cancelled(err)) return { status: 'cancelled' };
      throw err;
    }
    if (!t?.purchaseToken) return { status: 'pending', message: 'Google Play is still processing your payment. Your pass arrives as soon as it\'s done.' };
    return verifyGoogle(season.pass.productId, t.purchaseToken);
  }
  const { next, pass } = await api.passCheckout({ season: season.key, provider, consent });
  if (next.kind === 'redirect') {
    window.location.assign(next.url);
    return { status: 'redirecting' };
  }
  if (next.kind === 'done') return { status: 'paid', pass };
  return { status: 'unavailable', message: next.message };
}

/**
 * Android: purchases Google Play still holds unconsumed (the app was closed before the server
 * confirmed, or a pending payment completed): sent to the server, which adds their coins once.
 * Safe to call any time; the server also learns about them from Google's notifications.
 */
export async function resumeStorePurchases() {
  if (storeProvider() === 'apple') return resumeApple();
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

/** iPhone: App Store transactions not finished yet (the app closed before the server confirmed): sent again. */
async function resumeApple() {
  try {
    const { NativePurchases } = await billing();
    await NativePurchases.configure?.({ autoFinishTransactions: false });
    const { transactions = [] } = await NativePurchases.getUnfinishedTransactions();
    let n = 0;
    for (const t of transactions) {
      if (!t.jwsRepresentation) continue;
      const r = await verifyApple(t).catch(() => null);
      if (r?.status === 'paid') n += 1;
    }
    return n;
  } catch {
    return 0;
  }
}

/**
 * iPhone: "Restore Purchases" (Apple requires it for a non-consumable such as the season pass): asks
 * the App Store for this Apple ID's purchases and sends the pass ones to the server, which gives back
 * a pass it knows (never a second one). → how many were restored.
 */
export async function restoreStorePurchases() {
  if (storeProvider() !== 'apple') return 0;
  const { accountToken } = await api.appleAccount();
  const { NativePurchases, PURCHASE_TYPE } = await billing();
  await NativePurchases.restorePurchases();
  const { purchases = [] } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.INAPP, onlyCurrentEntitlements: true, appAccountToken: accountToken });
  let n = 0;
  for (const t of purchases) {
    if (!t.jwsRepresentation) continue;
    const r = await verifyApple(t).catch(() => null);
    if (r?.status === 'paid') n += 1;
  }
  return n;
}

/**
 * The price to show for a product. In the apps only the store's own price (null until the store
 * answers): never the website's dollar price (App Store 3.1.1 / Google Play Payments: the apps
 * show and use only their store's purchase). On the website: the website's price label.
 */
export function shownPrice(id, webLabel, storePrices = {}, provider = storeProvider()) {
  if (provider === 'apple' || provider === 'google') return storePrices[id] ?? null;
  return webLabel;
}

/** The apps: the products' prices as Google Play or the App Store shows them (local currency) → { [packId]: '49,00 kr' }. */
export function useStorePrices(packs) {
  const [prices, setPrices] = useState({});
  const ids = packs.map((p) => p.id).join(',');
  useEffect(() => {
    if (storeProvider() !== 'google' && storeProvider() !== 'apple') return undefined;
    let live = true;
    billing().then(({ NativePurchases, PURCHASE_TYPE }) => NativePurchases.getProducts({ productIdentifiers: ids.split(','), productType: PURCHASE_TYPE.INAPP }))
      .then(({ products = [] }) => { if (live) setPrices(Object.fromEntries(products.map((p) => [p.identifier, p.priceString]))); })
      .catch(() => {});
    return () => { live = false; };
  }, [ids]);
  return prices;
}
