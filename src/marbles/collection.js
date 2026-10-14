'use strict';

/**
 * Owning collection marbles: buying a copy (numbered First Edition while the
 * first 500 last), the Marble Bag, the Shooter, and certificates.
 * Looks only: nothing here is read by the race engine.
 */

const { catalog, items, bySlug, byId, normaliseId, marbleCode, onSale, setOf } = require('./catalog');
const { HttpError, badRequest, conflict, notFound } = require('../utils/httpError');
const economy = require('../economy');

/** Live counts per item: { slug: { bought, gifted } }. */
async function counters(client) {
  const { rows } = await client.query('SELECT item_slug, bought, gifted FROM collection_counters');
  return Object.fromEntries(rows.map((r) => [r.item_slug, { bought: r.bought, gifted: r.gifted }]));
}

/** The shop/collection view of every item, with how many numbered copies are left. */
function describe(item, count = { bought: 0, gifted: 0 }, now = new Date()) {
  const numberedLeft = Math.max(0, item.editionSize - count.bought);
  return {
    slug: item.slug,
    id: item.id,
    collection: item.collection,
    design: item.design.key,
    shade: item.shade.key,
    rarity: item.rarity,
    price: item.price,
    editionSize: item.editionSize,
    numberedLeft,
    bought: count.bought,
    onSale: onSale(item, now, count.bought),
    saleEndsAt: item.saleEndsAt,
  };
}

async function listItems(client, now = new Date()) {
  const counts = await counters(client);
  return items.map((i) => describe(i, counts[i.slug], now));
}

/**
 * Buys one copy of an item for a player. Locks the item's counter so every
 * copy gets its own number: copies 1–500 (or the whole run of a limited
 * edition) are the numbered First Edition.
 */
async function buy(client, userId, slug, now = new Date()) {
  const item = bySlug.get(slug);
  if (!item) throw notFound('Marble not found');
  const price = item.price.coins;
  if (price == null) throw conflict('This marble has no price yet');
  const counter = await claimCopy(client, userId, item, now);
  await economy.spend(client, { userId, price, kind: 'purchase', itemSlug: slug });
  const copy = await addCopy(client, userId, item, counter, price);
  const { rows: [wallet] } = await client.query('SELECT coins FROM users WHERE id = $1', [userId]);
  return { copy: ownedView(copy), coins: wallet.coins };
}

/** Checks the player doesn't own the item yet and that it's on sale, and locks its counter. → the counter row. */
async function claimCopy(client, userId, item, now) {
  const owned = await client.query('SELECT 1 FROM user_collection WHERE user_id = $1 AND item_slug = $2', [userId, item.slug]);
  if (owned.rowCount) throw conflict('You already own this marble');
  await client.query('INSERT INTO collection_counters (item_slug) VALUES ($1) ON CONFLICT DO NOTHING', [item.slug]);
  const { rows: [count] } = await client.query('SELECT bought FROM collection_counters WHERE item_slug = $1 FOR UPDATE', [item.slug]);
  if (!onSale(item, now, count.bought)) throw new HttpError(410, 'This marble is no longer for sale');
  return count;
}

/** Hands out the next numbered copy (First Edition while the first 500 last). */
async function addCopy(client, userId, item, count, price) {
  const copyNo = count.bought + 1;
  await client.query('UPDATE collection_counters SET bought = $2 WHERE item_slug = $1', [item.slug, copyNo]);
  const editionNo = copyNo <= item.editionSize ? copyNo : null;
  const { rows: [copy] } = await client.query(
    `INSERT INTO user_collection (user_id, item_slug, source, copy_no, edition_no, marble_code, currency, price_paid, first_owner_id)
     VALUES ($1, $2, 'purchase', $3, $4, $5, 'coins', $6, $1)
     RETURNING *`,
    [userId, item.slug, copyNo, editionNo, marbleCode(item, { copyNo }), price],
  );
  return copy;
}

/**
 * A copy given by the back office (support: a lost purchase, a prize): a gift
 * copy (its own G-number, not one of the numbered bought copies), free. → the copy.
 */
async function grantCopy(client, userId, slug) {
  const item = bySlug.get(slug);
  if (!item) throw notFound('No such marble');
  const owned = await client.query('SELECT 1 FROM user_collection WHERE user_id = $1 AND item_slug = $2', [userId, slug]);
  if (owned.rowCount) throw conflict('The player already owns this marble');
  await client.query('INSERT INTO collection_counters (item_slug) VALUES ($1) ON CONFLICT DO NOTHING', [slug]);
  const { rows: [count] } = await client.query('UPDATE collection_counters SET gifted = gifted + 1 WHERE item_slug = $1 RETURNING gifted', [slug]);
  const { rows: [copy] } = await client.query(
    `INSERT INTO user_collection (user_id, item_slug, source, gift_no, marble_code, currency, price_paid, first_owner_id)
     VALUES ($1, $2, 'grant', $3, $4, 'coins', 0, $1) RETURNING *`,
    [userId, slug, count.gifted, marbleCode(item, { giftNo: count.gifted })],
  );
  return copy;
}

/**
 * The bags (client/src/shared/economy.json → bags): every collection design of
 * the bag's rarities in ONE shade the buyer picks (Classic if they don't), at
 * the bag's discount off what the marbles cost one by one, rounded to the
 * nearest 100 coins. A player who already owns some of them gets the rest, at
 * the same discount off what the missing marbles cost.
 * → { bag, label, shade, items, missing, worth, price }
 */
function bagOffer(bagKey, shadeKey = 'classic', ownedSlugs = new Set()) {
  const bag = Object.hasOwn(economy.economy.bags, bagKey) ? economy.economy.bags[bagKey] : null;
  if (!bag) throw notFound('No such bag');
  const shadeKeys = catalog.designs.find((d) => !d.limited)?.shades.map((sh) => sh.key) ?? [];
  if (!shadeKeys.includes(shadeKey)) throw badRequest(`Choose a shade: ${shadeKeys.join(', ')}`);
  const inBag = items.filter((i) => !i.design.limited && bag.rarities.includes(i.rarity) && i.shade.key === shadeKey);
  const worthOf = (list) => list.reduce((n, i) => n + (i.price.coins ?? 0), 0);
  const missing = inBag.filter((i) => !ownedSlugs.has(i.slug));
  const worth = worthOf(missing);
  return {
    bag: bagKey,
    label: bag.label,
    shade: shadeKey,
    discount: bag.discount,
    items: inBag.map((i) => ({ slug: i.slug, id: i.id, owned: ownedSlugs.has(i.slug) })),
    missing: missing.length,
    worth,
    price: missing.length ? economy.bagPrice(bagKey, worth) : 0,
  };
}

/** Buys a bag in one shade: one charge, then a numbered copy of each marble the player doesn't own yet. */
async function buyBag(client, userId, bagKey, shadeKey = 'classic', now = new Date()) {
  const { rows } = await client.query('SELECT item_slug FROM user_collection WHERE user_id = $1', [userId]);
  const offer = bagOffer(bagKey, shadeKey, new Set(rows.map((r) => r.item_slug)));
  if (!offer.missing) throw conflict('You already own every marble in this bag');
  const missing = offer.items.filter((i) => !i.owned).map((i) => bySlug.get(i.slug));
  const counters = [];
  for (const item of missing) counters.push(await claimCopy(client, userId, item, now));
  await economy.spend(client, { userId, price: offer.price, kind: 'bag', note: `${bagKey}:${shadeKey}` });
  // What each copy cost, for refunds: the bag's price shared out by the marbles' worth (the remainder on the last).
  const worth = missing.map((i) => i.price.coins ?? 0);
  const total = worth.reduce((a, b) => a + b, 0) || 1;
  let left = offer.price;
  const copies = [];
  for (let k = 0; k < missing.length; k += 1) {
    const share = k === missing.length - 1 ? left : Math.floor((offer.price * worth[k]) / total);
    left -= share;
    copies.push(ownedView(await addCopy(client, userId, missing[k], counters[k], share)));
  }
  const { rows: [wallet] } = await client.query('SELECT coins FROM users WHERE id = $1', [userId]);
  return { bag: bagKey, shade: shadeKey, copies, price: offer.price, coins: wallet.coins };
}

/** The item a typed Marble ID names ("sc105", "SC 105", "#SC105"), or 404. */
function findById(text) {
  const item = byId.get(normaliseId(text));
  if (!item) throw notFound('No marble has this ID');
  return describe(item);
}

function ownedView(row) {
  return {
    id: row.id,
    slug: row.item_slug,
    marbleId: bySlug.get(row.item_slug)?.id ?? null,
    source: row.source,
    editionNo: row.edition_no,
    marbleCode: row.marble_code,
    acquiredAt: row.acquired_at,
  };
}

/** A player's Marble Bag: collection copies, Originals (old plain marbles), sets completed, Shooter. */
async function bag(client, userId) {
  const { rows: copies } = await client.query(
    'SELECT * FROM user_collection WHERE user_id = $1 ORDER BY acquired_at, item_slug',
    [userId],
  );
  const { rows: originals } = await client.query(
    `SELECT m.id, m.slug, m.name, m.description, m.color_primary, m.color_secondary, m.pattern, m.rarity, m.is_starter
       FROM marbles m
      WHERE m.is_active
        AND (m.is_starter OR EXISTS (SELECT 1 FROM user_marbles um WHERE um.user_id = $1 AND um.marble_id = m.id))
      ORDER BY m.is_starter DESC, m.name`,
    [userId],
  );
  const { rows: [shooter] } = await client.query('SELECT item_slug, marble_id FROM user_shooter WHERE user_id = $1', [userId]);

  const ownedSlugs = new Set(copies.map((c) => c.item_slug));
  const designs = [...new Set(items.map((i) => i.design.key))];
  const sets = designs
    .map((d) => ({ design: d, owned: setOf(d).filter((s) => ownedSlugs.has(s)).length, of: setOf(d).length }))
    .filter((s) => s.of > 1);

  return {
    // (Copies of marbles no longer in the catalogue are left out.)
    copies: copies.filter((c) => bySlug.has(c.item_slug)).map(ownedView),
    originals,
    sets: sets.map((s) => ({ ...s, complete: s.owned === s.of })),
    shooter: shooter?.item_slug ? { item: shooter.item_slug } : shooter?.marble_id ? { original: shooter.marble_id } : null,
  };
}

/** Sets the look a player races in: a collection item they own, or one of their Originals. */
async function setShooter(client, userId, { item, original }) {
  if (Boolean(item) === Boolean(original)) throw badRequest('Choose one marble');
  if (item) {
    const owned = await client.query('SELECT 1 FROM user_collection WHERE user_id = $1 AND item_slug = $2', [userId, item]);
    if (!owned.rowCount) throw notFound('You don\'t own this marble');
  } else {
    const ok = await client.query(
      `SELECT 1 FROM marbles m WHERE m.id = $2 AND m.is_active
          AND (m.is_starter OR EXISTS (SELECT 1 FROM user_marbles um WHERE um.user_id = $1 AND um.marble_id = m.id))`,
      [userId, original],
    );
    if (!ok.rowCount) throw notFound('You don\'t own this marble');
  }
  await client.query(
    `INSERT INTO user_shooter (user_id, item_slug, marble_id, updated_at) VALUES ($1, $2, $3, now())
     ON CONFLICT (user_id) DO UPDATE SET item_slug = EXCLUDED.item_slug, marble_id = EXCLUDED.marble_id, updated_at = now()`,
    [userId, item ?? null, original ?? null],
  );
  return { item: item ?? null, original: original ?? null };
}

/** A certificate by marble ID: the numbered copy, its first owner, when it was made and its race record. */
async function certificate(client, code) {
  const { rows: [copy] } = await client.query(
    `SELECT c.*, fo.username AS first_owner, o.username AS owner,
            (SELECT COUNT(*)::int FROM race_entry_looks l JOIN race_entries e ON e.id = l.entry_id
               JOIN races r ON r.id = e.race_id AND r.status = 'finished' WHERE l.collection_id = c.id) AS races,
            (SELECT COUNT(*)::int FROM race_entry_looks l JOIN race_entries e ON e.id = l.entry_id
               JOIN races r ON r.id = e.race_id AND r.status = 'finished' WHERE l.collection_id = c.id AND e.finish_position = 1) AS wins
       FROM user_collection c
       LEFT JOIN users fo ON fo.id = c.first_owner_id
       LEFT JOIN users o ON o.id = c.user_id
      WHERE c.marble_code = $1`,
    [code],
  );
  if (!copy) throw notFound('No marble has this ID');
  const item = bySlug.get(copy.item_slug);
  return {
    marbleCode: copy.marble_code,
    marbleId: item?.id ?? null,
    collection: item?.collection ?? null,
    slug: copy.item_slug,
    design: item?.design.key,
    shade: item?.shade.key,
    editionNo: copy.edition_no,
    editionSize: item?.editionSize,
    firstEdition: copy.edition_no != null,
    firstOwner: copy.first_owner,
    owner: copy.owner,
    made: copy.acquired_at,
    races: copy.races,
    wins: copy.wins,
  };
}

/**
 * The catalogue marble a player races as (races need one per entry): their
 * Shooter's Original if they chose one, otherwise one of their marbles, the
 * starters last, skipping any already in this race. The look they race in is
 * their Shooter (recordShooterLook); this only fills the race's marble slot.
 */
async function pickRacingMarble(client, raceId, userId) {
  const { rows } = await client.query(
    `SELECT m.id
       FROM marbles m
       LEFT JOIN user_shooter sh ON sh.user_id = $2 AND sh.marble_id = m.id
      WHERE m.is_active
        AND (m.is_starter OR EXISTS (SELECT 1 FROM user_marbles um WHERE um.user_id = $2 AND um.marble_id = m.id))
        AND NOT EXISTS (SELECT 1 FROM race_entries e WHERE e.race_id = $1 AND e.marble_id = m.id)
      ORDER BY (sh.marble_id IS NOT NULL) DESC, m.is_starter, m.slug
      LIMIT 1`,
    [raceId, userId],
  );
  if (!rows[0]) throw conflict('All your marbles are already in this race');
  return rows[0].id;
}

/** Notes the collection look a player races in for this entry (their Shooter, if it's a collection marble). */
async function recordShooterLook(client, userId, entryId) {
  await client.query(
    `INSERT INTO race_entry_looks (entry_id, collection_id)
     SELECT $2, c.id FROM user_shooter sh JOIN user_collection c ON c.user_id = sh.user_id AND c.item_slug = sh.item_slug
      WHERE sh.user_id = $1
     ON CONFLICT (entry_id) DO NOTHING`,
    [userId, entryId],
  );
}

module.exports = { grantCopy, pickRacingMarble, recordShooterLook, listItems, describe, buy, bagOffer, buyBag, findById, bag, setShooter, certificate, counters };
