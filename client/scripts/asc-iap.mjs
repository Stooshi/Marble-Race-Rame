// Creates the App Store in-app purchases through the App Store Connect API (Moses, 23 Nov 2026).
// Run by the GitHub Actions workflow "App Store: create in-app purchases" (.github/workflows/app-store-iap.yml);
// safe to run again: what exists is kept, only what is missing is added (a text is corrected only while
// Apple still lets it be edited). Locally, with the three ASC_* variables set:
//   node scripts/asc-iap.mjs [--dry-run] [--packs grand-prix,blocks-2,...]
// For each product: the product (type, reference name, Family Sharing off), the English (U.S.) name and
// description, the US price (Apple sets the other countries), availability (every country except
// mainland China: decision E, 8 Nov 2026) and the review screenshot when its file is in the repository.
// The list: scripts/asc-api.mjs iapProducts. A report table goes to the log and the run's summary page.
import crypto from 'node:crypto';
import { appendFileSync, existsSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUNDLE_ID, COMPLETE_PACKS, ascClient, checkProducts, productsFromRepo } from './asc-api.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const dry = args.includes('--dry-run');
const packsArg = args.includes('--packs') ? args[args.indexOf('--packs') + 1] : '';
const complete = packsArg ? packsArg.split(',').map((s) => s.trim()).filter(Boolean) : COMPLETE_PACKS;
const EXCLUDED_TERRITORIES = ['CHN'];
const EDITABLE = new Set(['MISSING_METADATA', 'READY_TO_SUBMIT', 'DEVELOPER_ACTION_NEEDED', 'REJECTED']);

const products = productsFromRepo(complete);
const problems = checkProducts(products);
if (problems.length) { console.error(`The product list breaks Apple's rules:\n- ${problems.join('\n- ')}`); process.exit(1); }

const api = ascClient();
const say = (s) => console.log(s);

const apps = (await api.get(`/v1/apps?filter[bundleId]=${BUNDLE_ID}&fields[apps]=bundleId,name`)).data.filter((a) => a.attributes.bundleId === BUNDLE_ID);
if (!apps.length) { console.error(`No app with bundle id ${BUNDLE_ID} in App Store Connect (make it first: Apps > + > New App).`); process.exit(1); }
const appId = apps[0].id;
say(`App: ${apps[0].attributes.name} (${appId})${dry ? ' (dry run: nothing is changed)' : ''}`);

const existing = new Map((await api.all(`/v1/apps/${appId}/inAppPurchasesV2?limit=200`)).map((p) => [p.attributes.productId, p]));
let territories = null;
const allTerritories = async () => (territories ??= (await api.all('/v1/territories?limit=200')).map((t) => t.id));
const getOrNull = async (path) => { try { return (await api.get(path)).data ?? null; } catch (e) { if (e.status === 404) return null; throw e; } };

async function ensureProduct(p) {
  let iap = existing.get(p.productId);
  const notes = [];
  if (!iap) {
    if (dry) return { notes: ['would create'], state: '(new)' };
    iap = (await api.post('/v2/inAppPurchases', { data: { type: 'inAppPurchases', attributes: {
      name: p.referenceName, productId: p.productId, inAppPurchaseType: p.type, reviewNote: p.reviewNote, familySharable: p.familySharable,
    }, relationships: { app: { data: { type: 'apps', id: appId } } } } })).data;
    notes.push('created');
  } else {
    if (iap.attributes.inAppPurchaseType !== p.type) throw new Error(`exists as ${iap.attributes.inAppPurchaseType}, not ${p.type}: fix by hand (a type can't be changed)`);
    const a = iap.attributes;
    const change = {};
    if (a.name !== p.referenceName) change.name = p.referenceName;
    if ((a.reviewNote ?? '') !== p.reviewNote) change.reviewNote = p.reviewNote;
    if (p.type === 'NON_CONSUMABLE' && a.familySharable) notes.push('Family Sharing is ON: turn it off by hand (Apple never lets it be turned off again once on)');
    if (Object.keys(change).length && EDITABLE.has(a.state) && !dry) {
      await api.patch(`/v2/inAppPurchases/${iap.id}`, { data: { type: 'inAppPurchases', id: iap.id, attributes: change } });
      notes.push(`updated ${Object.keys(change).join(', ')}`);
    } else if (Object.keys(change).length) notes.push(`differs (${Object.keys(change).join(', ')}), ${dry ? 'would update' : `left: ${a.state}`}`);
    else notes.push('exists');
  }
  const id = iap.id;

  // English (U.S.) name and description.
  const locs = await api.all(`/v2/inAppPurchases/${id}/inAppPurchaseLocalizations?limit=50`);
  const en = locs.find((l) => l.attributes.locale === 'en-US');
  if (!en) {
    if (!dry) await api.post('/v1/inAppPurchaseLocalizations', { data: { type: 'inAppPurchaseLocalizations', attributes: { locale: 'en-US', name: p.name, description: p.description },
      relationships: { inAppPurchaseV2: { data: { type: 'inAppPurchases', id } } } } });
    notes.push(dry ? 'would add the text' : 'text added');
  } else if (en.attributes.name !== p.name || en.attributes.description !== p.description) {
    try {
      if (!dry) await api.patch(`/v1/inAppPurchaseLocalizations/${en.id}`, { data: { type: 'inAppPurchaseLocalizations', id: en.id, attributes: { name: p.name, description: p.description } } });
      notes.push(dry ? 'would correct the text' : 'text corrected');
    } catch (e) { notes.push(`text differs, not changed (${e.status})`); }
  }

  // The US price (Apple sets the other countries from it).
  const schedule = await getOrNull(`/v2/inAppPurchases/${id}/iapPriceSchedule`);
  let priced = false;
  if (schedule) {
    const manual = await api.get(`/v1/inAppPurchasePriceSchedules/${schedule.id}/manualPrices?include=inAppPurchasePricePoint,territory&limit=50`).catch(() => null);
    priced = Boolean(manual?.data?.length);
    const point = manual?.included?.find((x) => x.type === 'inAppPurchasePricePoints');
    if (point && point.attributes.customerPrice !== p.price) notes.push(`US price is ${point.attributes.customerPrice}, not ${p.price}: change it by hand`);
  }
  if (!priced) {
    const points = await api.all(`/v2/inAppPurchases/${id}/pricePoints?filter[territory]=USA&limit=200`);
    const point = points.find((x) => Number(x.attributes.customerPrice) === Number(p.price));
    if (!point) throw new Error(`no US price point ${p.price}`);
    if (!dry) await api.post('/v1/inAppPurchasePriceSchedules', {
      data: { type: 'inAppPurchasePriceSchedules', relationships: {
        inAppPurchase: { data: { type: 'inAppPurchases', id } },
        baseTerritory: { data: { type: 'territories', id: 'USA' } },
        manualPrices: { data: [{ type: 'inAppPurchasePrices', id: '${price-usa}' }] },
      } },
      included: [{ type: 'inAppPurchasePrices', id: '${price-usa}', attributes: { startDate: null },
        relationships: { inAppPurchaseV2: { data: { type: 'inAppPurchases', id } }, inAppPurchasePricePoint: { data: { type: 'inAppPurchasePricePoints', id: point.id } } } }],
    });
    notes.push(dry ? `would price USD ${p.price}` : `priced USD ${p.price}`);
  }

  // Availability: every country except mainland China.
  const avail = await getOrNull(`/v2/inAppPurchases/${id}/inAppPurchaseAvailability`);
  if (!avail) {
    const ids = (await allTerritories()).filter((t) => !EXCLUDED_TERRITORIES.includes(t));
    if (!dry) await api.post('/v1/inAppPurchaseAvailabilities', { data: { type: 'inAppPurchaseAvailabilities', attributes: { availableInNewTerritories: true },
      relationships: { inAppPurchase: { data: { type: 'inAppPurchases', id } }, availableTerritories: { data: ids.map((t) => ({ type: 'territories', id: t })) } } } });
    notes.push(dry ? `would make available in ${ids.length} countries` : `available in ${ids.length} countries`);
  }

  // The review screenshot.
  const shot = await getOrNull(`/v2/inAppPurchases/${id}/appStoreReviewScreenshot`);
  const shotOk = shot && shot.attributes?.assetDeliveryState?.state !== 'FAILED';
  let screenshot = shotOk ? 'yes' : 'MISSING';
  if (!shotOk) {
    const file = join(ROOT, p.screenshot);
    if (!existsSync(file)) notes.push(`screenshot: upload by hand (no ${p.screenshot})`);
    else if (dry) { screenshot = 'would upload'; }
    else { await uploadScreenshot(id, file); screenshot = 'uploaded'; }
  }
  const state = dry ? iap.attributes.state : (await api.get(`/v2/inAppPurchases/${id}`)).data.attributes.state;
  return { notes, state, screenshot };
}

async function uploadScreenshot(iapId, file) {
  const bytes = readFileSync(file);
  const made = (await api.post('/v1/inAppPurchaseAppStoreReviewScreenshots', { data: { type: 'inAppPurchaseAppStoreReviewScreenshots',
    attributes: { fileName: basename(file), fileSize: statSync(file).size }, relationships: { inAppPurchaseV2: { data: { type: 'inAppPurchases', id: iapId } } } } })).data;
  for (const op of made.attributes.uploadOperations ?? []) {
    const res = await fetch(op.url, { method: op.method, headers: Object.fromEntries((op.requestHeaders ?? []).map((h) => [h.name, h.value])), body: bytes.subarray(op.offset, op.offset + op.length) });
    if (!res.ok) throw new Error(`screenshot upload: ${res.status}`);
  }
  await api.patch(`/v1/inAppPurchaseAppStoreReviewScreenshots/${made.id}`, { data: { type: 'inAppPurchaseAppStoreReviewScreenshots', id: made.id,
    attributes: { uploaded: true, sourceFileChecksum: crypto.createHash('md5').update(bytes).digest('hex') } } });
}

const rows = [];
let failed = 0;
for (const p of products) {
  try {
    const r = await ensureProduct(p);
    rows.push([p.productId, p.type === 'CONSUMABLE' ? 'Consumable' : 'Non-consumable', `USD ${p.price}`, r.state, r.screenshot ?? '', r.notes.join('; ')]);
  } catch (e) {
    failed += 1;
    rows.push([p.productId, p.type === 'CONSUMABLE' ? 'Consumable' : 'Non-consumable', `USD ${p.price}`, 'ERROR', '', e.message]);
  }
  say(`${rows.at(-1)[0]}: ${rows.at(-1)[3]} (${rows.at(-1)[5]})`);
}

const table = ['| Product | Type | Price | Status | Review screenshot | What happened |', '|---|---|---|---|---|---|',
  ...rows.map((r) => `| \`${r[0]}\` | ${r.slice(1).map((c) => String(c).replace(/\|/g, '/')).join(' | ')} |`)].join('\n');
const summary = `## App Store in-app purchases${dry ? ' (dry run)' : ''}\n\n${table}\n\n${failed ? `**${failed} failed** (see What happened).` : 'No errors.'}\n\nStatus is Apple's: MISSING_METADATA means something is still missing (usually the review screenshot); READY_TO_SUBMIT means it can go for review with the next app version.\n`;
console.log(`\n${summary}`);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
process.exit(failed ? 1 : 0);
