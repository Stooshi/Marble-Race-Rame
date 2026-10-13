'use strict';

/**
 * Showcase marbles: in beginner races the computer players race in designed
 * marbles from the collection, so new players see what there is to collect.
 * About 6 Common/Uncommon, 3 Rare/Epic and 1 Legendary, different every race.
 *
 * Looks only. The looks are drawn with their own randomness after the race's
 * marbles, lanes and skills are set, they are stored apart from the race
 * entries (house_looks), and the race engine is never given them
 * (raceService strips them), so a computer player's marble can never change a
 * result. The track report checks that winners stay spread evenly whatever
 * marble a computer player wears.
 */

const crypto = require('crypto');
const { catalog, items } = require('./catalog');

/** A race is a beginner race when every player in it has finished fewer than this many races. */
const BEGINNER_MAX_RACES = catalog.showcase.beginnerMaxRaces;

/** How many computer players wear which rarities (the rest keep plain marbles). */
const SHOWCASE_MIX = Object.freeze(catalog.showcase.mix); // (in catalog.json, shared with the website)

const cryptoRandom = () => crypto.randomInt(0, 2 ** 32) / 2 ** 32;

/**
 * Picks the showcase looks for `bots` computer players: up to 10 different
 * items in the mix above (never the limited edition), in random order, then
 * nulls for the rest. `random` is any () => [0, 1) (tests and the report seed it).
 */
function pickShowcaseLooks(bots, random = cryptoRandom) {
  const picks = [];
  for (const { rarities, count } of SHOWCASE_MIX) {
    const pool = items.filter((i) => rarities.includes(i.rarity)).map((i) => i.slug);
    for (let k = 0; k < count && pool.length; k += 1) picks.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  }
  const looks = [...picks, ...new Array(Math.max(0, bots - picks.length)).fill(null)].slice(0, bots);
  for (let i = looks.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [looks[i], looks[j]] = [looks[j], looks[i]];
  }
  return looks;
}

/** Whether a race counts as a beginner race: it has players, and each has finished fewer than BEGINNER_MAX_RACES races. */
async function isBeginnerRace(client, raceId, maxRaces = BEGINNER_MAX_RACES) {
  const { rows: [r] } = await client.query(
    `SELECT COUNT(*)::int AS players,
            COUNT(*) FILTER (WHERE (SELECT COUNT(*) FROM race_entries pe JOIN races pr ON pr.id = pe.race_id AND pr.status = 'finished'
                                     WHERE pe.user_id = e.user_id) >= $2)::int AS experienced
       FROM race_entries e
      WHERE e.race_id = $1 AND e.user_id IS NOT NULL`,
    [raceId, maxRaces],
  );
  return r.players > 0 && r.experienced === 0;
}

/** Dresses a beginner race's computer players in showcase marbles (looks only; called once, when the race is decided). */
async function dressComputerPlayers(client, raceId, random = cryptoRandom) {
  if (!(await isBeginnerRace(client, raceId))) return [];
  const { rows: bots } = await client.query('SELECT id FROM race_entries WHERE race_id = $1 AND is_bot ORDER BY id', [raceId]);
  const looks = pickShowcaseLooks(bots.length, random);
  const pairs = bots.map((b, i) => [b.id, looks[i]]).filter(([, look]) => look);
  if (pairs.length) {
    await client.query(
      `INSERT INTO house_looks (entry_id, item_slug)
       SELECT * FROM unnest($1::uuid[], $2::text[]) ON CONFLICT (entry_id) DO NOTHING`,
      [pairs.map((p) => p[0]), pairs.map((p) => p[1])],
    );
  }
  return pairs;
}

/** The marble tier a look belongs to, for the fairness report. */
function lookTier(slug) {
  if (!slug) return 'plain';
  const rarity = items.find((i) => i.slug === slug)?.rarity;
  return SHOWCASE_MIX.findIndex((m) => m.rarities.includes(rarity));
}

module.exports = { BEGINNER_MAX_RACES, SHOWCASE_MIX, pickShowcaseLooks, isBeginnerRace, dressComputerPlayers, lookTier };
