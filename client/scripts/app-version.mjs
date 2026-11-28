// Raises the app version for BOTH apps (npm run app:version, in client/).
//   npm run app:version                 1.0.0 (1) -> 1.0.1 (2)
//   npm run app:version -- minor        1.0.1 (2) -> 1.1.0 (3)
//   npm run app:version -- major        1.1.0 (3) -> 2.0.0 (4)
//   npm run app:version -- 1.4.0        any higher version
//   npm run app:version -- build        same version, new build number (a second upload)
// Writes client/app-version.json (Android's app/build.gradle reads it) and sets MARKETING_VERSION
// and CURRENT_PROJECT_VERSION in the iPhone project (ios/App/App.xcodeproj/project.pbxproj), then
// writes the release-notes draft (npm run app:notes). Nothing is committed or tagged.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bumpVersion, setPbxprojVersion } from './app-release-lib.mjs';

const CLIENT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VERSION_FILE = join(CLIENT, 'app-version.json');
const PBXPROJ = join(CLIENT, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');

const current = JSON.parse(readFileSync(VERSION_FILE, 'utf8'));
let next;
try {
  next = bumpVersion(current, process.argv[2] || 'patch');
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
const pbx = setPbxprojVersion(readFileSync(PBXPROJ, 'utf8'), next);

writeFileSync(VERSION_FILE, `${JSON.stringify(next, null, 2)}\n`);
writeFileSync(PBXPROJ, pbx);
console.log(`Marble Spins ${current.versionName} (${current.versionCode}) -> ${next.versionName} (${next.versionCode})
  client/app-version.json                       (Android reads it)
  client/ios/App/App.xcodeproj/project.pbxproj  (iPhone: version ${next.versionName}, build ${next.versionCode})
`);

if (existsSync(join(CLIENT, 'release-notes', `${next.versionName}.md`))) {
  console.log(`The release notes for ${next.versionName} are already there: client/release-notes/${next.versionName}.md`);
} else {
  try {
    execFileSync(process.execPath, [join(CLIENT, 'scripts', 'app-notes.mjs')], { cwd: CLIENT, stdio: 'inherit' });
  } catch {
    console.log('(The release notes could not be made; run  npm run app:notes  later.)');
  }
}
console.log(`
Then save the new version in git:
  git add app-version.json ios/App/App.xcodeproj/project.pbxproj release-notes
  git commit -m "App ${next.versionName} (${next.versionCode})"`);
