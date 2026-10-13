'use strict';

/**
 * Owning collection marbles: buying a copy (numbered First Edition while the
 * first 500 last), the Marble Bag, the Shooter, and certificates.
 * Looks only: nothing here is read by the race engine.
 */

const { items, bySlug, marbleCode, onSale, setOf } = require('./catalog');
const { HttpError, badRequest, conflict, notFound } = require('../utils/httpError');

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

  const owned = await client.query('SELECT 1 FROM user_collection WHERE user_id = $1 AND item_slug = $2', [userId, slug]);
  if (owned.rowCount) throw conflict('You already own this marble');

  await client.query('INSERT INTO collection_counters (item_slug) VALUES ($1) ON CONFLICT DO NOTHING', [slug]);
  const { rows: [count] } = await client.query('SELECT bought FROM collection_counters WHERE item_slug = $1 FOR UPDATE', [slug]);
  if (!onSale(item, now, count.bought)) throw new HttpError(410, 'This marble is no longer for sale');

  let currency;
  let price;
  if (item.price.coins !== undefined) {
    currency = 'coins';
    price = item.price.coins;
  } else {
    currency = 'credits';
    price = item.price.credits;
    if (price == null) throw conflict('This marble has no price yet');
  }
  const paid = await client.query(
    `UPDATE users SET ${currency} = ${currency} - $2 WHERE id = $1 AND ${currency} >= $2 RETURNING coins, credits`,
    [userId, price],
  );
  if (!paid.rowCount) throw badRequest(currency === 'coins' ? 'Not enough coins' : 'Not enough credits');

  const copyNo = count.bought + 1;
  await client.query('UPDATE collection_counters SET bought = $2 WHERE item_slug = $1', [slug, copyNo]);
  const editionNo = copyNo <= item.editionSize ? copyNo : null;
  const { rows: [copy] } = await client.query(
    `INSERT INTO user_collection (user_id, item_slug, source, copy_no, edition_no, marble_code, currency, price_paid, first_owner_id)
     VALUES ($1, $2, 'purchase', $3, $4, $5, $6, $7, $1)
     RETURNING *`,
    [userId, slug, copyNo, editionNo, marbleCode(item, { copyNo }), currency, price],
  );
  return { copy: ownedView(copy), coins: paid.rows[0].coins, credits: paid.rows[0].credits };
}

function ownedView(row) {
  return {
    id: row.id,
    slug: row.item_slug,
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
    copies: copies.map(ownedView),
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

module.exports = { pickRacingMarble, recordShooterLook, listItems, describe, buy, bag, setShooter, certificate, counters };
