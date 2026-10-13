'use strict';

/**
 * The marble collection catalogue (Collection 1 · Grand Opening), read from the
 * shared file the web client and the phone apps use too:
 * client/src/shared/marbles/catalog.json. Names, stories, shade texts and
 * colours live only there; the database keeps who owns what and the counters.
 *
 * One item = one shade of one design, bought on its own, e.g. "candy-pink".
 * Looks only: nothing here ever reaches the race engine.
 */

const catalog = require('../../client/src/shared/marbles/catalog.json');

const items = [];
for (const design of catalog.designs) {
  const rarity = catalog.rarities[design.rarity];
  for (const shade of design.shades) {
    items.push({
      slug: `${design.key}-${shade.key}`,
      design,
      shade,
      rarity: design.rarity,
      price: rarity.price,
      editionSize: design.limited?.editionSize ?? catalog.editionSize,
      allNumbered: Boolean(design.limited?.allNumbered),
      saleEndsAt: design.limited?.saleEndsAt ?? null,
    });
  }
}
const bySlug = new Map(items.map((i) => [i.slug, i]));

const pad = (n, w) => String(n).padStart(w, '0');

/** The ID printed on a marble and its certificate: MS-SUN-SOL-000037 for a bought copy, MS-CAN-PNK-G00012 for a gift. */
function marbleCode(item, { copyNo, giftNo }) {
  const base = `MS-${item.design.code}-${item.shade.code}`;
  return giftNo ? `${base}-G${pad(giftNo, 5)}` : `${base}-${pad(copyNo, 6)}`;
}

/** Whether the item can be bought right now (a limited edition only in its month, and while numbers last). */
function onSale(item, now = new Date(), sold = 0) {
  if (item.saleEndsAt && now >= new Date(item.saleEndsAt)) return false;
  if (item.allNumbered && sold >= item.editionSize) return false;
  return true;
}

/** A design's shades as item slugs (for the Set badge). */
function setOf(designKey) {
  return items.filter((i) => i.design.key === designKey).map((i) => i.slug);
}

module.exports = { catalog, items, bySlug, marbleCode, onSale, setOf };
