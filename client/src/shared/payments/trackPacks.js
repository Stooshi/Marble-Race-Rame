/**
 * Track packs for sale (Moses, 12 Nov 2026; the server: src/packs/sale.js): the price from trackPacks.json
 * (one file for every pack, so a campaign changes it without code), the product ids in each store, the
 * packs' names. In the apps only the store's own prices are shown (shownPrice in site/payments).
 */
import settings from './trackPacks.json';

const usd = (cents) => `$${(cents / 100).toFixed(2)}`;

export const TRACK_PACK_PRICE = {
  cents: settings.priceCents,
  label: usd(settings.priceCents),
  withCoins: { coins: settings.withCoins.coins, cents: settings.withCoins.priceCents, label: usd(settings.withCoins.priceCents) },
  maxCoinShare: settings.maxCoinShare,
  fullAt: settings.fullAt,
};

/** The pack's product id on the website and in the App Store (Google Play: playId(), with _). */
export const packProductId = (key, withCoins = false) => `trackpack-${key}${withCoins ? '-coins' : ''}`;

/** The packs' names by key (the same as src/packs/list.js; a test checks). */
export const PACK_NAMES = {
  'grand-prix': 'Grand Prix', 'world-tour': 'World Tour', coasters: 'Coasters', canyons: 'Canyons', 'blocks-1': 'Blocks 1', 'blocks-2': 'Blocks 2',
  'track-and-field': 'Track and Field', rivers: 'Rivers', peaks: 'Peaks', pinball: 'Pinball', arcade: 'Arcade',
};
