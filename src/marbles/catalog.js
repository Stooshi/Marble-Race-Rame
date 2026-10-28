'use strict';

/**
 * The marble collection catalogue (Collection 1 · Schoolyard Classics), read from the
 * shared file the web client and the phone apps use too:
 * client/src/shared/marbles/catalog.json. Names, stories, shade texts and
 * colours live only there; the database keeps who owns what and the counters.
 *
 * One item = one shade of one design, bought on its own, e.g. "champion-sunset",
 * with its Marble ID: the collection's two letters, the design's number (01–10)
 * and the shade's (1–5), e.g. SC105.
 * Looks only: nothing here ever reaches the race engine.
 */

const catalog = require('../../client/src/shared/marbles/catalog.json');

const pad = (n, w) => String(n).padStart(w, '0');

/** A design and shade's Marble ID: SC105. */
const marbleId = (design, shade) => `${design.collection ?? catalog.collection.code}${pad(design.no, 2)}${shade.no}`;

/**
 * The collection a design belongs to (catalog.json → collections, by the code in its Marble IDs): the
 * live standard collection, a limited edition, a seasonal collection or a season pass's marble.
 * → { code, kind: 'standard'|'limited'|'seasonal'|'pass', name, … }
 */
function collectionOf(design) {
  const code = design.collection ?? catalog.collection.code;
  const c = catalog.collections?.[code];
  return c ? { code, ...c } : { code, kind: 'standard', ...catalog.collection };
}

const items = [];
for (const design of catalog.designs) {
  const rarity = catalog.rarities[design.rarity];
  const col = collectionOf(design);
  for (const shade of design.shades) {
    items.push({
      slug: `${design.key}-${shade.key}`,
      id: marbleId(design, shade),
      collection: col.name,
      kind: col.kind,
      season: col.season ?? null,
      design,
      shade,
      rarity: design.rarity,
      // A seasonal collection has its own prices per rarity; a pass marble is never sold (no price).
      price: col.kind === 'pass' || col.kind === 'league' ? { coins: null } : col.prices?.[design.rarity] ?? rarity.price,
      // A pass marble: every copy numbered in order, an open edition (no size) that closes with its season.
      // The league marble likewise: numbered in the order it was won, never closing.
      editionSize: col.kind === 'pass' || col.kind === 'league' ? null : design.limited?.editionSize ?? catalog.editionSize,
      allNumbered: Boolean(design.limited?.allNumbered) || col.kind === 'pass' || col.kind === 'league',
      saleStartsAt: design.limited?.saleStartsAt ?? col.releaseAt ?? null,
      saleEndsAt: design.limited?.saleEndsAt ?? col.retireAt ?? col.closesAt ?? null,
    });
  }
}
const bySlug = new Map(items.map((i) => [i.slug, i]));
const byId = new Map(items.map((i) => [i.id, i]));

/** A Marble ID as people type it ("sc105", "SC 105", "#SC105") → "SC105", or null if it can't be one. */
function normaliseId(text) {
  const t = String(text ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^[A-Z]{2}\d{3}$/.test(t) ? t : null;
}

/** The certificate code of one copy: its Marble ID and copy number, SC105-000037 (a gift: SC105-G00012). */
function marbleCode(item, { copyNo, giftNo }) {
  return giftNo ? `${item.id}-G${pad(giftNo, 5)}` : `${item.id}-${pad(copyNo, 6)}`;
}

/**
 * Where an item's sale stands: 'coming' (before its window opens: a limited edition or a seasonal
 * collection), 'on-sale', 'sold-out' (a limited edition whose window has closed or whose numbered copies
 * are all sold), 'retired' (a seasonal collection after its retirement) or 'pass-only' (a season pass's
 * marble, never sold) or 'league-only' (the league marble: Pro League winners only, never sold). Sold
 * out and retired are for good: never sold again.
 */
function saleState(item, now = new Date(), sold = 0) {
  if (item.kind === 'league') return 'league-only';
  if (item.kind === 'pass') return 'pass-only';
  if (item.saleStartsAt && now < new Date(item.saleStartsAt)) return 'coming';
  if (item.saleEndsAt && now >= new Date(item.saleEndsAt)) return item.kind === 'seasonal' ? 'retired' : 'sold-out';
  if (item.allNumbered && item.editionSize != null && sold >= item.editionSize) return 'sold-out';
  return 'on-sale';
}

/** Whether the item can be bought right now (inside its sale window, and while a limited edition's numbers last). */
function onSale(item, now = new Date(), sold = 0) {
  return saleState(item, now, sold) === 'on-sale';
}

/** Whether an item is in the live standard collection (only these go in bags and the computer players' showcase). */
const isStandard = (item) => item.kind === 'standard';

/** The season pass's marble of a season ('holiday-2026'), or null. */
const passMarbleOf = (seasonKey) => items.find((i) => i.kind === 'pass' && i.season === seasonKey) ?? null;

/** The league marble (Racing Stripes: catalog.json collection LG). */
const leagueMarble = () => items.find((i) => i.kind === 'league') ?? null;

/** A design's shades as item slugs (for the Set badge). */
function setOf(designKey) {
  return items.filter((i) => i.design.key === designKey).map((i) => i.slug);
}

module.exports = { catalog, items, bySlug, byId, marbleId, normaliseId, marbleCode, saleState, onSale, setOf, collectionOf, isStandard, passMarbleOf, leagueMarble };
