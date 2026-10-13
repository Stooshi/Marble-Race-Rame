/**
 * The marble collection, shared by the website and the phone apps (which wrap
 * this web client): the catalogue, prices, rarities and marble IDs.
 * Plain data and functions only — no React, no DOM — so any screen can use it.
 * The server reads the same catalog.json (src/marbles/catalog.js).
 */
import catalog from './catalog.json';

export { catalog };

export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'limited'];

export const DESIGNS = catalog.designs;
export const DESIGN = Object.fromEntries(DESIGNS.map((d) => [d.key, d]));

/** One entry per shade: { slug, design, shade, rarity, price, editionSize }. */
export const ITEMS = DESIGNS.flatMap((design) => design.shades.map((shade) => ({
  slug: `${design.key}-${shade.key}`,
  design,
  shade,
  rarity: design.rarity,
  price: catalog.rarities[design.rarity].price,
  editionSize: design.limited?.editionSize ?? catalog.editionSize,
})));
export const ITEM = Object.fromEntries(ITEMS.map((i) => [i.slug, i]));

export const rarityInfo = (rarity) => catalog.rarities[rarity];

/** "● 2,500 coins" or "◆ [X] credits" (a price still to be set stays a visible placeholder). */
export function priceLabel(price) {
  if (price.coins !== undefined) return `● ${price.coins.toLocaleString('en-US')} coins`;
  return `◆ ${price.credits ?? price.creditsLabel ?? '[X]'} credits`;
}

/** The shades of one design, as items. */
export const setItems = (designKey) => ITEMS.filter((i) => i.design.key === designKey);

/**
 * Gives every entry without a look one from `slugs`, the same way every time
 * for the same key (a race id), so a replay always shows the same marbles.
 * Looks only: used to dress house marbles and for previews.
 */
export function dressEntries(entries, key, slugs) {
  if (!slugs.length) return entries;
  let h = 2166136261;
  for (let i = 0; i < key.length; i += 1) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  const start = (h >>> 0) % slugs.length;
  return entries.map((e, i) => (e.marble?.look ? e : { ...e, marble: { ...e.marble, look: slugs[(start + i) % slugs.length] } }));
}

/** The designs whose 3D look is finished (materials.js builds exactly these). */
export const BUILT_MATERIALS = [
  'vane-glass', 'rings', 'gem-bands', 'bands', 'swirl-glass', 'melon', 'nebula-glass', 'lava',
  'neon-grid', 'checks', 'black-hole', 'aurora-glass', 'stripe', 'stone', 'core-glass', 'sunfire',
];

/** Looks house marbles can wear: every finished regular design (never the limited edition). */
export const HOUSE_LOOKS = ITEMS.filter((i) => BUILT_MATERIALS.includes(i.design.material) && !i.design.limited).map((i) => i.slug);

/** A short name for a look in standings: "Glacier Glass", "Ruby Ice", "Ocean Candy Stripe". */
export function lookName(slug) {
  const item = ITEM[slug];
  if (!item) return null;
  if (item.shade.original || item.design.shades.length === 1) return item.design.name;
  return item.shade.name.includes(' ') ? item.shade.name : `${item.shade.name} ${item.design.name}`;
}

/**
 * House marbles wear collection looks too, named after them, the same ones
 * every time a race is shown. Takes race data ({ entries }) and returns it
 * dressed; players keep their own Shooter's look (plain for an Original).
 */
export function dressHouseMarbles(data) {
  if (!data?.entries?.length) return data;
  const bots = HOUSE_LOOKS.length ? data.entries.filter((e) => e?.isBot && !e.marble?.look) : [];
  const dressed = bots.length ? dressEntries(bots, bots.map((e) => e.entryId ?? e.index).join(','), HOUSE_LOOKS) : [];
  const byEntry = new Map(bots.map((e, k) => [e, dressed[k]]));
  // Every marble wearing a look is called by it in the standings (a player's Shooter too).
  const named = (e) => (e?.marble?.look && ITEM[e.marble.look] ? { ...e, marble: { ...e.marble, name: lookName(e.marble.look) } } : e);
  return { ...data, entries: data.entries.map((e) => named(byEntry.get(e) ?? e)) };
}
