// App Store Connect API (Moses, 23 Nov 2026): the token, the calls, and the in-app purchase list.
// Used by GitHub Actions (scripts/ios-ci.mjs for the iPhone build, scripts/asc-iap.mjs for the
// in-app purchases). The key comes from the repository's Actions secrets ASC_KEY_ID, ASC_ISSUER_ID and
// ASC_KEY_P8 (an Admin team key); it is never printed, written to the repository or put in a log.
// The pure parts (token, product list, limits) are tested in client/test/ascApi.test.js.
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLIENT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const API = 'https://api.appstoreconnect.apple.com';
export const BUNDLE_ID = 'com.marblespins.app';

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

/** A signed App Store Connect token (ES256, at most 20 minutes). */
export function ascToken({ keyId, issuerId, p8, now = Date.now(), minutes = 15 }) {
  if (!keyId || !issuerId || !p8) throw new Error('The App Store Connect key is missing (ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8)');
  const iat = Math.floor(now / 1000);
  const head = b64url(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }));
  const body = b64url(JSON.stringify({ iss: issuerId, iat, exp: iat + minutes * 60, aud: 'appstoreconnect-v1' }));
  const key = crypto.createPrivateKey(String(p8).replace(/\\n/g, '\n').trim());
  const sig = crypto.sign('sha256', Buffer.from(`${head}.${body}`), { key, dsaEncoding: 'ieee-p1363' });
  return `${head}.${body}.${b64url(sig)}`;
}

/** An API client from the environment (the three secrets). */
export function ascClient(env = process.env) {
  const cred = { keyId: env.ASC_KEY_ID?.trim(), issuerId: env.ASC_ISSUER_ID?.trim(), p8: env.ASC_KEY_P8 };
  let token = null;
  let made = 0;
  const auth = () => {
    if (!token || Date.now() - made > 10 * 60_000) { token = ascToken(cred); made = Date.now(); }
    return token;
  };
  async function call(method, path, body) {
    for (let attempt = 1; ; attempt++) {
      const res = await fetch(path.startsWith('http') ? path : `${API}${path}`, {
        method,
        headers: { Authorization: `Bearer ${auth()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      if ((res.status === 429 || res.status >= 500) && attempt < 4) { await new Promise((r) => setTimeout(r, 2000 * attempt)); continue; }
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      if (!res.ok) {
        const why = (json?.errors ?? []).map((e) => `${e.title ?? ''}: ${e.detail ?? ''}`.trim()).join('; ') || text.slice(0, 300);
        const err = new Error(`${method} ${path.replace(API, '')}: ${res.status} ${why}`);
        err.status = res.status;
        err.errors = json?.errors ?? [];
        throw err;
      }
      return json;
    }
  }
  /** Every item of a list, following the pages. */
  async function all(path) {
    const out = [];
    let next = path;
    while (next) {
      const page = await call('GET', next);
      out.push(...(page.data ?? []));
      next = page.links?.next ?? null;
    }
    return out;
  }
  return { call, all, get: (p) => call('GET', p), post: (p, b) => call('POST', p, b), patch: (p, b) => call('PATCH', p, b), del: (p) => call('DELETE', p) };
}

// ---------------------------------------------------------------- in-app purchases

/** Apple's limits for an in-app purchase's App Store text (App Store Connect Help). */
export const LIMITS = Object.freeze({ referenceName: 64, displayName: 30, description: 45, reviewNote: 4000 });

/** The packs complete on 23 Nov 2026 (Moses): 20 live paid tracks each. */
export const COMPLETE_PACKS = ['grand-prix', 'blocks-2', 'rivers', 'canyons', 'peaks', 'blocks-1', 'world-tour', 'coasters'];

const usd = (cents) => (cents / 100).toFixed(2);
const thousands = (n) => n.toLocaleString('en-US');

/**
 * The App Store products: the 4 coin packs, the Holiday Season pass and both products of each complete
 * track pack. Ids with _ (as in Google Play); names and texts as in the project docs
 * claude/store-submission-drafts.md section 4 and claude/track-packs-products.md, shortened only where
 * Apple's limits (30 / 45 characters) need it; the full Google Play text goes in the review note.
 */
export function iapProducts({ coinPacks, trackPacks, packList, complete = COMPLETE_PACKS }) {
  const out = [];
  for (const p of coinPacks.packs) {
    const name = `${thousands(p.coins)} Coins`;
    out.push({
      productId: p.id.replace(/-/g, '_'), type: 'CONSUMABLE', referenceName: name, familySharable: false,
      price: usd(p.storeAmountCents), name, description: 'Coins for the shop: looks, never speed',
      reviewNote: `${name} for the Marble Spins shop (marble looks; coins never make a marble faster). Shown in the app's shop; the server checks the signed transaction and adds the coins once.`,
      screenshot: 'store-assets/app-store/iphone-6.9/04-shop.png',
    });
  }
  out.push({
    productId: 'holiday_pass_2026', type: 'NON_CONSUMABLE', referenceName: 'Holiday Season Pass 2026', familySharable: false,
    price: '9.99', name: 'Holiday Season Pass 2026', description: 'All holiday tracks, daily bonus, a marble.',
    reviewNote: 'Every holiday track from 1 Dec 2026 to 7 Jan 2027, the Track of the Day bonus (+50% race coins) and the Winter Solstice marble. Activates 1 December. One payment, not a subscription. Sandbox and TestFlight purchases are accepted before the sale starts so the purchase can be reviewed.',
    screenshot: 'store-assets/app-store/iphone-6.9/10-holiday-pass.png',
  });
  const coins = thousands(trackPacks.withCoins.coins);
  for (const key of complete) {
    const pack = packList.find((p) => p.key === key);
    if (!pack) throw new Error(`Unknown track pack: ${key}`);
    const id = `trackpack_${key.replace(/-/g, '_')}`;
    const full = `Unlocks every track of the ${pack.name} pack for good: race them any time, and with friends in your rooms. Looks and places only: every marble races the same.`;
    out.push({
      productId: id, type: 'NON_CONSUMABLE', referenceName: `${pack.name} track pack`, familySharable: false,
      price: usd(trackPacks.storeAmountCents), name: `${pack.name} track pack`, description: `All ${pack.name} tracks, yours for good.`,
      reviewNote: `${full} Shown on the pack's page in the app (Tracks > Track packs).`,
      screenshot: `store-assets/app-store/iap-review/${id}.png`,
    });
    out.push({
      productId: `${id}_coins`, type: 'NON_CONSUMABLE', referenceName: `${pack.name} track pack (with ${coins} coins)`, familySharable: false,
      price: usd(trackPacks.withCoins.storeAmountCents), name: `${pack.name} pack (with coins)`, description: `All ${pack.name} tracks, part-paid in coins.`,
      reviewNote: `${full} Paid partly with ${coins} coins from the player's Marble Spins account: the server holds the coins before the App Store sheet opens and uses them once the purchase is checked. Shown on the pack's page in the app.`,
      screenshot: `store-assets/app-store/iap-review/${id}.png`, // one picture of the pack page serves both
    });
  }
  return out;
}

/** The problems with a product list (Apple's limits, duplicate ids), or []. */
export function checkProducts(list) {
  const problems = [];
  const seen = new Set();
  for (const p of list) {
    if (seen.has(p.productId)) problems.push(`${p.productId}: twice`);
    seen.add(p.productId);
    if (!/^[A-Za-z0-9._]+$/.test(p.productId)) problems.push(`${p.productId}: only letters, digits, . and _`);
    for (const [field, max] of [['referenceName', LIMITS.referenceName], ['name', LIMITS.displayName], ['description', LIMITS.description], ['reviewNote', LIMITS.reviewNote]]) {
      const n = [...String(p[field] ?? '')].length;
      if (n < 2 || n > max) problems.push(`${p.productId}: ${field} is ${n} characters (2 to ${max})`);
    }
  }
  return problems;
}

/** The product list from the repository's own files. */
export function productsFromRepo(complete = COMPLETE_PACKS) {
  const read = (p) => JSON.parse(readFileSync(join(CLIENT, p), 'utf8'));
  const { PACKS } = createRequire(import.meta.url)(join(CLIENT, '..', 'src', 'packs', 'list.js'));
  return iapProducts({ coinPacks: read('src/shared/payments/packs.json'), trackPacks: read('src/shared/payments/trackPacks.json'), packList: PACKS, complete });
}
