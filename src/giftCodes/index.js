'use strict';

/**
 * Gift codes (Moses, 21 Oct 2026): codes the back office makes for creators, campaigns and
 * giveaways, each worth a number of coins or a season's pass, redeemed on the website by a saved
 * account (src/routes/giftCodes.js, the "Redeem a code" page linked from Settings).
 *
 *   - single-use (max_uses 1) or multi-use up to a limit; each account redeems a code once;
 *   - an expiry time; a code can be switched off at any time (disabled_at);
 *   - every code has a tag: the creator or campaign it was made for (the back office sums by tag);
 *   - coins go through economy.change() as kind 'gift-code', a bought kind: they count as bought
 *     coins (users.coins_bought), never towards the scoreboards;
 *   - a pass goes into season_passes (provider 'gift-code', no payment), with the season's marble,
 *     like a bought pass. Only while the season hasn't ended; not if the player already has it.
 *
 * Redeeming is off until client/src/shared/giftCodes.json "enabled" is true (the back office can
 * make codes before that). Codes are stored normalised: upper case, no spaces or dashes.
 */
const crypto = require('crypto');
const settings = require('../../client/src/shared/giftCodes.json');
const { HttpError, badRequest, conflict, notFound } = require('../utils/httpError');
const economy = require('../economy');
const seasons = require('../seasons');

// No 0/O, 1/I/L, so a code read aloud or from a screenshot can't be mistyped.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const GENERATED_LENGTH = 12; // 31^12 ≈ 7.9e17: can't be guessed (and redeeming is rate-limited)

const enabled = () => settings.enabled === true;

/** 'abcd-efgh 1234' → 'ABCDEFGH1234'. */
const normalise = (code) => String(code ?? '').toUpperCase().replace(/[\s-]+/g, '');

/** 'ABCDEFGH1234' → 'ABCD-EFGH-1234' (generated codes; a custom code is shown as typed). */
const display = (code) => (/^[A-Z0-9]{12}$/.test(code) && [...code].every((c) => ALPHABET.includes(c)) ? code.match(/.{4}/g).join('-') : code);

function generate() {
  const bytes = crypto.randomBytes(GENERATED_LENGTH * 2);
  let out = '';
  // (Rejection sampling: no letter more likely than another.)
  for (let i = 0; out.length < GENERATED_LENGTH; i++) {
    if (i >= bytes.length) return generate();
    const b = bytes[i];
    if (b < 248) out += ALPHABET[b % ALPHABET.length];
  }
  return out;
}

const VALID_CUSTOM = /^[A-Z0-9]{4,24}$/;

/** What a code gives, in words: '5,000 coins' or 'the Holiday Season 2026 pass'. */
const describe = (c, seasonName = null) => (c.kind === 'coins' ? `${Number(c.coins).toLocaleString('en-US')} coins` : `the ${seasonName ?? c.season_key} pass`);

/**
 * Makes codes (the back office). `count` > 1 makes that many single-use codes with the same settings
 * (a batch). `code`: a custom code (one only), e.g. a creator's word. → the rows made.
 */
async function create(client, { kind, coins = null, seasonKey = null, maxUses = 1, expiresAt, tag, note = null, code = null, count = 1, adminId }) {
  if (!['coins', 'pass'].includes(kind)) throw badRequest('kind must be coins or pass');
  if (kind === 'coins' && !(Number.isInteger(coins) && coins > 0 && coins <= settings.maxCoins)) throw badRequest(`coins must be 1–${settings.maxCoins}`);
  if (kind === 'pass') {
    const season = seasonKey && await seasons.byKey(client, seasonKey);
    if (!season || !season.pass_product_id) throw badRequest('No such season with a pass');
    if (seasons.stateOf(season) === 'free') throw badRequest('That season has ended');
  }
  if (!(Number.isInteger(maxUses) && maxUses >= 1 && maxUses <= settings.maxUses)) throw badRequest(`max_uses must be 1–${settings.maxUses}`);
  if (!(Number.isInteger(count) && count >= 1 && count <= settings.maxBatch)) throw badRequest(`count must be 1–${settings.maxBatch}`);
  if (count > 1 && (maxUses !== 1 || code)) throw badRequest('A batch is of single-use codes, without a custom code');
  const expires = new Date(expiresAt);
  if (Number.isNaN(expires.getTime()) || expires <= new Date()) throw badRequest('The expiry must be in the future');
  const custom = code ? normalise(code) : null;
  if (custom && !VALID_CUSTOM.test(custom)) throw badRequest('A custom code is 4–24 letters and digits');
  const batch = count > 1 ? crypto.randomUUID() : null;
  const made = [];
  for (let i = 0; i < count; i++) {
    let row = null;
    for (let attempt = 0; !row && attempt < 5; attempt++) {
      const { rows } = await client.query(
        `INSERT INTO gift_codes (code, kind, coins, season_key, max_uses, expires_at, tag, note, batch_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (code) DO NOTHING RETURNING *`,
        [custom ?? generate(), kind, kind === 'coins' ? coins : null, kind === 'pass' ? seasonKey : null, maxUses, expires, tag, note, batch, adminId],
      );
      row = rows[0] ?? null;
      if (!row && custom) throw conflict('That code already exists');
    }
    if (!row) throw new Error('Could not make a unique code');
    made.push(row);
  }
  return made;
}

const NO_SUCH = "That code doesn't work. Check it and try again.";

/**
 * A saved account redeems a code. → { kind, coins?, balance?, season? { key, name }, code }.
 * Refusals: 401 save_first (a guest), 404 (no such code, or switched off), 410 (expired), 409 (used up,
 * already redeemed by this account, already has the pass), 400 (the season has ended).
 */
async function redeem(db, userId, rawCode, now = new Date()) {
  const code = normalise(rawCode);
  if (!code || code.length > 24) throw notFound(NO_SUCH);
  return db.withTransaction(async (client) => {
    const { rows: [u] } = await client.query('SELECT is_guest FROM users WHERE id = $1 AND deleted_at IS NULL', [userId]);
    if (!u || u.is_guest) throw new HttpError(401, 'Save your marble first: codes are for saved accounts, so what you get stays yours', { code: 'save_first' });
    const { rows: [c] } = await client.query('SELECT * FROM gift_codes WHERE code = $1 FOR UPDATE', [code]);
    if (!c || c.disabled_at) throw notFound(NO_SUCH);
    if (new Date(c.expires_at) <= now) throw new HttpError(410, 'This code has expired');
    const { rows: [mine] } = await client.query('SELECT 1 FROM gift_code_redemptions WHERE code_id = $1 AND user_id = $2', [c.id, userId]);
    if (mine) throw conflict("You've already used this code");
    if (c.uses >= c.max_uses) throw conflict('This code has been used up');
    let out;
    let passId = null;
    if (c.kind === 'coins') {
      const done = await economy.change(client, { userId, amount: c.coins, kind: 'gift-code', note: `Gift code ${display(c.code)} (${c.tag})` });
      out = { kind: 'coins', coins: c.coins, balance: done.balance };
    } else {
      const season = await seasons.byKey(client, c.season_key);
      if (!season || seasons.stateOf(season, now) === 'free') throw badRequest('This pass is for a season that has ended');
      const { rows: [pass] } = await client.query(
        `INSERT INTO season_passes (user_id, season_key, provider) VALUES ($1, $2, 'gift-code')
         ON CONFLICT (user_id, season_key) WHERE revoked_at IS NULL DO NOTHING RETURNING id`,
        [userId, season.key],
      );
      if (!pass) throw conflict(`You already have the ${season.name} pass. Give the code to a friend instead!`);
      passId = pass.id;
      await require('../marbles/collection').grantSeasonMarble(client, userId, season.key);
      out = { kind: 'pass', season: { key: season.key, name: season.name, startsAt: season.starts_at } };
    }
    await client.query(
      'INSERT INTO gift_code_redemptions (code_id, user_id, coins, season_pass_id) VALUES ($1, $2, $3, $4)',
      [c.id, userId, c.kind === 'coins' ? c.coins : null, passId],
    );
    await client.query('UPDATE gift_codes SET uses = uses + 1 WHERE id = $1', [c.id]);
    return { ...out, code: display(c.code) };
  });
}

/** A player's redeemed codes, newest first (the Redeem page's list). */
async function mine(db, userId) {
  const { rows } = await db.query(
    `SELECT g.code, g.kind, r.coins, g.season_key, s.name AS season_name, r.redeemed_at
       FROM gift_code_redemptions r JOIN gift_codes g ON g.id = r.code_id LEFT JOIN seasons s ON s.key = g.season_key
      WHERE r.user_id = $1 ORDER BY r.redeemed_at DESC LIMIT 100`,
    [userId],
  );
  return rows.map((r) => ({ code: display(r.code), kind: r.kind, coins: r.coins, season: r.season_key ? { key: r.season_key, name: r.season_name } : null, redeemedAt: r.redeemed_at, what: describe(r, r.season_name) }));
}

/** A code's state for the back office: active | expired | used-up | disabled. */
function stateOf(c, now = new Date()) {
  if (c.disabled_at) return 'disabled';
  if (new Date(c.expires_at) <= now) return 'expired';
  if (c.uses >= c.max_uses) return 'used-up';
  return 'active';
}

module.exports = { enabled, normalise, display, generate, create, redeem, mine, stateOf, describe, ALPHABET, NO_SUCH };
