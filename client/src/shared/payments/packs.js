/** Credit packs (shared with the server and the phone apps' in-app products). */
import data from './packs.json';

export const CREDIT_PACKS = data.packs.map((p) => ({ ...p, priceLabel: `$${(p.amountCents / 100).toLocaleString('en-US')}` }));
export const PACK = Object.fromEntries(CREDIT_PACKS.map((p) => [p.id, p]));
