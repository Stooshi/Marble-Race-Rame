import { Link } from 'react-router-dom';
import { COIN_PACKS } from '../../shared/payments/packs';
import { formatNumber } from '../../utils/format';

/**
 * "Get coins" instead of "Not enough coins" (Moses, 22 Oct 2026, first Android test): a button that
 * opens the coin packs (the checkout: Stripe on the website, the App Store or Google Play in the apps,
 * never the website's payment inside an app) and, once paid, brings the player back to the marble
 * they wanted. The way back is the checkout's ?back= and, for the trip through Stripe's payment page,
 * this tab's session storage (Stripe returns to /purchases, or to the checkout when cancelled).
 */

const KEY = 'ms:wanted';
const KEEP_MS = 60 * 60 * 1000; // (an hour: a payment page left open longer starts fresh)

/** Only a path on this site ("/collection/flame?shade=x"), never another site ("//x", "https:"). */
export function safeBack(path) {
  return typeof path === 'string' && /^\/(?!\/)/.test(path) && !/[\\\s]/.test(path) && path.length < 300 ? path : null;
}

/** The smallest pack that covers the coins still needed (the largest when none does). */
export function packFor(need) {
  return COIN_PACKS.find((p) => p.coins >= need) ?? COIN_PACKS[COIN_PACKS.length - 1];
}

/** Coins still needed for a price, or 0 when the player has enough. */
export function shortOf(price, coins) {
  return price != null && (coins ?? 0) < price ? price - (coins ?? 0) : 0;
}

/** The server's refusal of a buy for lack of coins (src/economy: "Not enough coins"). */
export const notEnoughCoins = (err) => /not enough coins/i.test(err?.message ?? '');

/** Remembers the marble the player wanted, for after the payment (this tab only). */
export function rememberWanted(back, label) {
  const path = safeBack(back);
  if (!path) return;
  try { sessionStorage.setItem(KEY, JSON.stringify({ back: path, label: label ?? null, at: Date.now() })); } catch { /* (private mode: ?back= still works in the apps and for test payments) */ }
}

/** The marble the player wanted, if they set out to buy it within the hour; `clear` forgets it. */
export function wanted({ clear = false } = {}) {
  try {
    const w = JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
    if (clear) sessionStorage.removeItem(KEY);
    return w && Date.now() - w.at < KEEP_MS && safeBack(w.back) ? w : null;
  } catch {
    return null;
  }
}

/** The checkout link for `need` more coins, coming back to `back`. */
export function getCoinsHref(need, back) {
  const path = safeBack(back);
  return `/checkout?pack=${packFor(need).id}${path ? `&back=${encodeURIComponent(path)}` : ''}`;
}

/**
 * The button: "You need ● 700 more coins." and GET COINS. `back`: where to return after paying
 * (the marble's own page); `label`: its name, for "Back to Flame Swirl". Also the shop sheet's
 * big button (`big`), in place of BUY.
 */
export default function GetCoins({ need, back, label, big = false, className = '' }) {
  return (
    <div className={`ms-getcoins ${className}`} role="group" aria-label="Get coins">
      <span className="ms-note">You need <b>{`● ${formatNumber(need)}`}</b> more coins.</span>
      <Link to={getCoinsHref(need, back)} onClick={() => rememberWanted(back, label)}
        className={`ms-btn ms-btn--primary${big ? ' ms-sheet__buy' : ' ms-btn--sm'}`}>GET COINS</Link>
    </div>
  );
}
