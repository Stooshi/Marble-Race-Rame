'use strict';

/**
 * How computer players show in a race (Moses, 20 Oct 2026): a fun, friendly name from NAMES and, unless
 * they wear a showcase marble (a beginner race, ./showcase.js), a plain starter-style look (one colour or
 * two colours half and half, ./starters.js LOOKS) that nobody else in the race shows. They stay clearly
 * marked as computer players everywhere (a robot icon, "Computer player").
 *
 * LOOKS ONLY, and nothing is stored: the names and looks are worked out from the race's id and its
 * entries each time the race is shown (the same every time, also in replays), and only for showing it.
 * The race engine never sees them (raceService gives the engine its own rows); race results and the
 * race fingerprints don't change.
 */
const { LOOKS, lookKey } = require('./starters');

/** Friendly names: made-up, no real people, characters or brands. */
const NAMES = Object.freeze([
  'Pebble Pilot', 'Captain Wobble', 'Zippy', 'Glimmer', 'Sir Spinsalot', 'Bumble', 'Twister', 'Pip',
  'Nimbus', 'Zoomer', 'Fizz', 'Comet', 'Sprocket', 'Turbo Tortoise', 'Marbleous', 'Dizzy Dot',
  'Swoosh', 'Jellybean', 'Rumble', 'Breezy', 'Doodle', 'Spark', 'Whirly', 'Pickle',
  'Lady Loop', 'Rolly Polly', 'Zigzag', 'Biscuit', 'Speedy Noodle', 'Bubbles', 'Gusto', 'Tumbleweed',
  'Professor Plink', 'Dash', 'Ziggy', 'Moonbeam', 'Clatter', 'Skippy', 'Wobbleton', 'Pudding',
  'Rocket Sock', 'Glitterbug', 'Hopscotch', 'Mango', 'Pinwheel', 'Ripple', 'Snickerdoodle', 'Tidbit',
  'Sir Bounce', 'Velvet', 'Zephyr', 'Kerplunk', 'Popcorn', 'Clover', 'Fidget', 'Quickstep',
]);

// A small seeded random from a string (the race id): the same names and looks every time.
function seeded(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The computer players of one race: Map entryId → { name, look: { color_primary, color_secondary, pattern } | null }.
 * entries: every entry of the race ({ id, is_bot, color_primary, color_secondary, pattern, look }); a
 * computer player wearing a showcase marble (`look`) keeps it and gets no plain look.
 */
function computerPlayers(raceId, entries) {
  // (Two streams: a computer player's name depends only on the race and its entries, never on the looks.)
  const nameRandom = seeded(`${raceId}:names`);
  const lookRandom = seeded(`${raceId}:looks`);
  const bots = entries.filter((e) => e.is_bot).sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const names = [...NAMES];
  const shown = new Set(entries.filter((e) => !e.is_bot && !e.look).map((e) => lookKey(e.pattern, [e.color_primary, e.color_secondary])));
  const looks = LOOKS.filter((l) => !shown.has(l.key));
  const out = new Map();
  for (const b of bots) {
    const name = names.length ? names.splice(Math.floor(nameRandom() * names.length), 1)[0] : 'Computer player';
    let look = null;
    if (!b.look && looks.length) {
      const l = looks.splice(Math.floor(lookRandom() * looks.length), 1)[0];
      look = { color_primary: l.colours[0].hex, color_secondary: l.colours[1]?.hex ?? null, pattern: l.pattern };
    }
    out.set(b.id, { name, look });
  }
  return out;
}

/**
 * Rows of a race's entries with each computer player's name in `marble_name` (or `name_field`) and its
 * plain look in place of the house marble's colours. Returns new rows; the input is never changed.
 */
function dressRows(raceId, rows, { idField = 'id', nameField = 'marble_name' } = {}) {
  const players = computerPlayers(raceId, rows.map((r) => ({ ...r, id: r[idField] })));
  return rows.map((r) => {
    const p = players.get(r[idField]);
    if (!p) return r;
    return { ...r, [nameField]: p.name, computer_name: p.name, ...(p.look ?? {}) };
  });
}

module.exports = { NAMES, computerPlayers, dressRows };
