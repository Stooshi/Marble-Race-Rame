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

/**
 * One design per rarity (the first of each, Common up to Legendary, never the
 * limited edition): what the shop, landing page and collection hero show, so
 * swapping the catalogue never needs code changes.
 */
export const FEATURED_DESIGNS = RARITY_ORDER.filter((r) => r !== 'limited')
  .map((r) => DESIGNS.find((d) => d.rarity === r)).filter(Boolean);

/**
 * A preview of the computer players' showcase marbles in a beginner race (the
 * real ones are drawn by the server when the race starts): the catalogue's mix,
 * picked the same way every time for the same key; nulls stay plain.
 */
export function previewShowcase(count, key) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i += 1) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  const rand = () => { h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  const picks = [];
  for (const { rarities, count: n } of catalog.showcase?.mix ?? []) {
    const pool = ITEMS.filter((i) => rarities.includes(i.rarity)).map((i) => i.slug);
    for (let k = 0; k < n && pool.length; k += 1) picks.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  }
  const out = [...picks, ...new Array(Math.max(0, count - picks.length)).fill(null)].slice(0, count);
  for (let i = out.length - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

/** The original shade's item slug of a design. */
export const originalSlug = (design) => `${design.key}-${design.shades[0].key}`;

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

/** Looks the previews can dress marbles in: every finished regular design (never a limited edition). */
export const HOUSE_LOOKS = ITEMS.filter((i) => BUILT_MATERIALS.includes(i.design.material) && !i.design.limited).map((i) => i.slug);

/** A short name for a look in standings: "Glacier Glass", "Ruby Ice", "Ocean Candy Stripe". */
export function lookName(slug) {
  const item = ITEM[slug];
  if (!item) return null;
  if (item.shade.original || item.design.shades.length === 1) return item.design.name;
  return item.shade.name.includes(' ') ? item.shade.name : `${item.shade.name} ${item.design.name}`;
}

/**
 * Names every marble that wears a collection look after it in the standings
 * (a player's Shooter, a computer player's showcase marble). The server says
 * which look each entry wears; this only renames. Takes race data ({ entries }).
 */
export function nameLooks(data) {
  if (!data?.entries?.length) return data;
  const named = (e) => (e?.marble?.look && ITEM[e.marble.look] ? { ...e, marble: { ...e.marble, name: lookName(e.marble.look) } } : e);
  return { ...data, entries: data.entries.map(named) };
}
