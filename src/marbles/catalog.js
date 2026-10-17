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

const items = [];
for (const design of catalog.designs) {
  const rarity = catalog.rarities[design.rarity];
  for (const shade of design.shades) {
    items.push({
      slug: `${design.key}-${shade.key}`,
      id: marbleId(design, shade),
      collection: design.limited ? 'Limited edition' : catalog.collection.name,
      design,
      shade,
      rarity: design.rarity,
      price: rarity.price,
      editionSize: design.limited?.editionSize ?? catalog.editionSize,
      allNumbered: Boolean(design.limited?.allNumbered),
      saleStartsAt: design.limited?.saleStartsAt ?? null,
      saleEndsAt: design.limited?.saleEndsAt ?? null,
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
 * Where an item's sale stands: 'coming' (a limited edition before its window opens), 'on-sale', or
 * 'sold-out' (its window has closed or every numbered copy is sold; it is never sold again).
 */
function saleState(item, now = new Date(), sold = 0) {
  if (item.saleStartsAt && now < new Date(item.saleStartsAt)) return 'coming';
  if (item.saleEndsAt && now >= new Date(item.saleEndsAt)) return 'sold-out';
  if (item.allNumbered && sold >= item.editionSize) return 'sold-out';
  return 'on-sale';
}

/** Whether the item can be bought right now (a limited edition only in its sale window, and while numbers last). */
function onSale(item, now = new Date(), sold = 0) {
  return saleState(item, now, sold) === 'on-sale';
}

/** A design's shades as item slugs (for the Set badge). */
function setOf(designKey) {
  return items.filter((i) => i.design.key === designKey).map((i) => i.slug);
}

module.exports = { catalog, items, bySlug, byId, marbleId, normaliseId, marbleCode, saleState, onSale, setOf };
