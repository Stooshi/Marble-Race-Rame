/**
 * Buying credits, behind one interface for the website and the phone apps.
 *
 *   web (Stripe)          start a checkout on the server, then follow its next step
 *                         (go to the payment page, or it's done, or not available yet)
 *   iPhone / Android app  (Capacitor) the App Store or Google Play in-app purchase,
 *                         then the receipt goes to the server, which adds the credits
 *
 * Screens call buyCredits(pack) and never care which store took the money.
 * The app side is a placeholder until the Capacitor apps exist: it reports
 * "not available yet" instead of pretending to sell.
 */
import { api } from '../../api/client';

/** Which store this copy of the site runs in: 'apple', 'google' or 'stripe' (the web). */
export function storeProvider() {
  const cap = typeof window !== 'undefined' ? window.Capacitor : null;
  if (cap?.isNativePlatform?.()) return cap.getPlatform?.() === 'ios' ? 'apple' : 'google';
  return import.meta.env.VITE_PAYMENTS_TEST === 'true' ? 'test' : 'stripe';
}

export const STORE_NAME = { stripe: 'Stripe', apple: 'the App Store', google: 'Google Play', test: 'a test payment' };

const ADAPTERS = {
  /** The web: the server starts a Stripe Checkout (or a test payment in development). */
  async web(pack, provider) {
    const { next, credits } = await api.checkout({ productId: pack.id, provider });
    if (next.kind === 'redirect') {
      window.location.assign(next.url);
      return { status: 'redirecting' };
    }
    if (next.kind === 'done') return { status: 'paid', credits };
    return { status: 'unavailable', message: next.message };
  },
  /** The apps: an in-app purchase through the store, then its receipt to the server. */
  async store(pack, provider) {
    // With the Capacitor apps: purchase `pack.id` through the store plugin, then
    //   const { credits } = await api.redeemReceipt({ provider, receipt });
    return { status: 'unavailable', message: `Buying credits through ${STORE_NAME[provider]} arrives with the app. [Placeholder]` };
  },
};

/** Buys a credit pack with this platform's store. Resolves { status: 'paid'|'redirecting'|'unavailable', credits?, message? }. */
export function buyCredits(pack) {
  const provider = storeProvider();
  return provider === 'apple' || provider === 'google' ? ADAPTERS.store(pack, provider) : ADAPTERS.web(pack, provider);
}
