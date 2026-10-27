// App links: writes the two files the phones read from the website, from client/app-links.json.
//   npm run app:links
// public/.well-known/assetlinks.json            Android App Links (each filled fingerprint)
// public/.well-known/apple-app-site-association  iPhone Universal Links (once the Team ID is filled)
// An empty slot is left out, so the file is always valid; with no fingerprint, links open the website.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;
export const TEAM_ID = /^[A-Z0-9]{10}$/;

export function readConfig(file = path.join(ROOT, 'app-links.json')) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** → { assetlinks, aasa } (the files' JSON), or throws on a fingerprint or Team ID that isn't one. */
export function build(cfg) {
  const prints = Object.entries(cfg.android.fingerprints)
    .map(([slot, v]) => [slot, String(v ?? '').trim().toUpperCase()])
    .filter(([, v]) => v);
  for (const [slot, v] of prints) {
    if (!FINGERPRINT.test(v)) throw new Error(`app-links.json android.fingerprints.${slot}: not a SHA-256 fingerprint (32 pairs like AB:CD:…)`);
  }
  const assetlinks = prints.length
    ? [{ relation: ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name: cfg.android.package, sha256_cert_fingerprints: [...new Set(prints.map(([, v]) => v))] } }]
    : [];
  const team = String(cfg.ios.teamId ?? '').trim().toUpperCase();
  if (team && !TEAM_ID.test(team)) throw new Error('app-links.json ios.teamId: 10 letters and digits (developer.apple.com → Account → Membership details)');
  const components = cfg.paths.flatMap((p) => (p.endsWith('/') ? [{ '/': `${p}*` }] : [{ '/': p }, { '/': `${p}/*` }]));
  const aasa = { applinks: { details: team ? [{ appIDs: [`${team}.${cfg.ios.bundleId}`], components }] : [] } };
  return { assetlinks, aasa };
}

export function write(cfg = readConfig()) {
  const { assetlinks, aasa } = build(cfg);
  const dir = path.join(ROOT, 'public', '.well-known');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'assetlinks.json'), `${JSON.stringify(assetlinks, null, 2)}\n`);
  fs.writeFileSync(path.join(dir, 'apple-app-site-association'), `${JSON.stringify(aasa, null, 2)}\n`);
  return { assetlinks, aasa };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { assetlinks, aasa } = write();
  const n = assetlinks[0]?.target.sha256_cert_fingerprints.length ?? 0;
  console.log(`assetlinks.json: ${n} fingerprint${n === 1 ? '' : 's'}${n ? '' : ' (links open the website on Android)'}`);
  console.log(`apple-app-site-association: ${aasa.applinks.details.length ? aasa.applinks.details[0].appIDs[0] : 'no Team ID yet (links open the website on iPhone)'}`);
}
