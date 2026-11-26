/** Coin packs bought with real money (shared with the server and the phone apps' in-app products). */
import data from './packs.json';

export const COIN_PACKS = data.packs.map((p) => ({ ...p, priceLabel: `$${(p.amountCents / 100).toLocaleString('en-US')}` }));
export const PACK = Object.fromEntries(COIN_PACKS.map((p) => [p.id, p]));
