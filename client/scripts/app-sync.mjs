// Builds the website for the iPhone and Android apps and copies it into ios/ and android/
// (npm run app:sync). The apps call the live server, so VITE_API_URL must be its public https
// address, e.g. VITE_API_URL=https://<railway address> npm run app:sync
import { execSync } from 'node:child_process';

const api = process.env.VITE_API_URL || '';
if (!/^https:\/\//.test(api) || /localhost|127\.0\.0\.1/.test(api)) {
  console.error('Set VITE_API_URL to the live server\'s https address first, e.g.\n  VITE_API_URL=https://your-server.up.railway.app npm run app:sync');
  process.exit(1);
}
const run = (cmd) => execSync(cmd, { stdio: 'inherit', env: { ...process.env, VITE_PAYMENTS_TEST: 'false' } });
run('npx vite build');
run('npx cap sync');
console.log('\nDone. Open the projects with: npx cap open ios (Xcode, on a Mac) · npx cap open android (Android Studio)');
