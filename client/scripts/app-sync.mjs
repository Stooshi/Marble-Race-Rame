// Builds the website for the iPhone and Android apps and copies it into ios/ and android/
// (npm run app:sync; `node scripts/app-sync.mjs ios` or `android` for one app only). The apps call
// the server address in client/app-api.json ("api") unless VITE_API_URL names another https address.
// Before building it checks that the address answers (GET /health): an app built against an address
// that doesn't work can't race. `--no-check` skips that (offline builds only).
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const addresses = JSON.parse(fs.readFileSync(new URL('../app-api.json', import.meta.url), 'utf8'));
const api = (process.env.VITE_API_URL || addresses.api).replace(/\/+$/, '');
if (!/^https:\/\//.test(api) || /localhost|127\.0\.0\.1/.test(api)) {
  console.error('Set VITE_API_URL to the live server\'s https address first, e.g.\n  VITE_API_URL=https://api.marblespins.com npm run app:sync');
  process.exit(1);
}
if (!process.argv.includes('--no-check')) {
  try {
    const res = await fetch(`${api}/health`, { signal: AbortSignal.timeout(15000) });
    const body = await res.json();
    if (!res.ok || body.status !== 'ok') throw new Error(`answered ${res.status} ${body.status ?? ''}`.trim());
    console.log(`${api} answers (server code ${body.version?.codeFingerprint ?? '?'})`);
  } catch (err) {
    console.error(`${api}/health doesn't answer (${err.message}). Not building the apps against it.`);
    if (addresses.fallback && addresses.fallback !== api) console.error(`The fallback address is ${addresses.fallback}: VITE_API_URL=${addresses.fallback} npm run app:sync`);
    process.exit(1);
  }
}
const platform = ['ios', 'android'].includes(process.argv[2]) ? process.argv[2] : '';
const run = (cmd) => execSync(cmd, { stdio: 'inherit', env: { ...process.env, VITE_API_URL: api, VITE_PAYMENTS_TEST: 'false' } });
console.log(`Building the apps against ${api}`);
run('npx vite build');
run(`npx cap sync${platform ? ` ${platform}` : ''}`);
console.log('\nDone. Open the projects with: npx cap open ios (Xcode, on a Mac) · npx cap open android (Android Studio)');
