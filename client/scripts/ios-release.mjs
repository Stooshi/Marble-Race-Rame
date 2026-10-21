// Builds the iPhone app for the App Store (npm run ios:release, in client/; on a Mac with Xcode).
//   npm run ios:release                 archive + .ipa in ~/MarbleSpins-releases
//   npm run ios:release -- --upload     also sends it to App Store Connect (TestFlight)
//   npm run ios:release -- --again      build the same version and build number again
// Needs the Apple Developer Team ID: MS_APPLE_TEAM_ID, or the file client/ios/apple-team-id.txt
// (gitignored). The beginner path for uploading is Xcode's Organizer (client/APP-TESTING.md).
// The project uses Swift Package Manager (no CocoaPods), so it builds App.xcodeproj; a CocoaPods
// App.xcworkspace would be used if it ever appears.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_RELEASE_DIR } from './android-tools.mjs';
import { exportOptionsPlist, highestBuiltCode, isTeamId, setPbxprojVersion, tagCommand, xcodeContainer } from './app-release-lib.mjs';

const CLIENT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PBXPROJ = join(CLIENT, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
const TEAM_FILE = join(CLIENT, 'ios', 'apple-team-id.txt');
const args = process.argv.slice(2);
const upload = args.includes('--upload');
const again = args.includes('--again');
const fail = (msg) => { console.error(`\n${msg}`); process.exit(1); };
const run = (cmd, a, opts = {}) => execFileSync(cmd, a, { cwd: CLIENT, stdio: 'inherit', ...opts });

if (process.platform !== 'darwin') fail('The iPhone app can only be built on a Mac (with Xcode). Use your Mac for this step.');
try {
  execFileSync('xcodebuild', ['-version'], { stdio: 'ignore' });
} catch {
  fail(`Xcode isn't ready. Install Xcode from the Mac App Store, open it once and accept the terms.
If Xcode is installed, point the command line at it:
  sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`);
}

const team = (process.env.MS_APPLE_TEAM_ID || (existsSync(TEAM_FILE) ? readFileSync(TEAM_FILE, 'utf8') : '')).trim();
if (!isTeamId(team)) {
  fail(`The Apple Team ID is missing${team ? ' or wrong (10 capital letters and digits)' : ''}.
Find it at developer.apple.com > Account > Membership details > Team ID (needs the paid
Apple Developer account), then save it once:
  echo YOURTEAMID > ios/apple-team-id.txt
(that file is gitignored), or set MS_APPLE_TEAM_ID for this terminal.`);
}

const { versionCode, versionName } = JSON.parse(readFileSync(join(CLIENT, 'app-version.json'), 'utf8'));
const outDir = resolve(process.env.MS_RELEASE_DIR || DEFAULT_RELEASE_DIR);
mkdirSync(outDir, { recursive: true });
const name = `MarbleSpins-${versionName}-${versionCode}`;
const archive = join(outDir, `${name}.xcarchive`);
const built = highestBuiltCode(readdirSync(outDir), 'ios');
if (built >= versionCode && !again) {
  fail(`Build ${versionCode} was already made for the iPhone (${outDir}).
Apple never accepts the same build number twice: run  npm run app:version  first.
(Never uploaded it and want to build it again? npm run ios:release -- --again)`);
}
if (again) rmSync(archive, { recursive: true, force: true });

// The iPhone project carries the version itself: make sure it matches app-version.json.
const pbx = readFileSync(PBXPROJ, 'utf8');
const synced = setPbxprojVersion(pbx, { versionName, versionCode });
if (synced !== pbx) {
  writeFileSync(PBXPROJ, synced);
  console.log('Set the iPhone project to the version in app-version.json (commit project.pbxproj).');
}

console.log(`Building Marble Spins ${versionName} (build ${versionCode}) for the App Store`);
run(process.execPath, [join(CLIENT, 'scripts', 'app-sync.mjs'), 'ios']);

const container = xcodeContainer((p) => existsSync(join(CLIENT, p)));
try {
  run('xcodebuild', [...container, '-scheme', 'App', '-configuration', 'Release', '-destination', 'generic/platform=iOS',
    '-archivePath', archive, '-allowProvisioningUpdates', `DEVELOPMENT_TEAM=${team}`, 'archive']);
} catch {
  fail(`The archive failed (see the messages above). Most often: Xcode > Settings > Accounts has no
Apple ID of the team ${team}, or the app com.marblespins.app isn't in App Store Connect yet.
client/APP-TESTING.md, "When something fails", has the usual fixes.`);
}

const exportDir = join(outDir, `${name}-export`);
mkdirSync(exportDir, { recursive: true });
const plist = join(exportDir, 'ExportOptions.plist');
writeFileSync(plist, exportOptionsPlist({ teamId: team, upload }));
try {
  run('xcodebuild', ['-exportArchive', '-archivePath', archive, '-exportPath', exportDir, '-exportOptionsPlist', plist, '-allowProvisioningUpdates']);
} catch {
  fail(`The archive is ready, but the ${upload ? 'upload' : 'export'} failed (see above).
Beginner path: double-click ${archive}
in Finder; Xcode's Organizer opens. Click Distribute App > App Store Connect > Distribute.`);
}

console.log(`
Archive: ${archive}
${upload
    ? 'Uploaded to App Store Connect. After 5–30 minutes it shows under the app > TestFlight.'
    : `App file: ${join(exportDir, 'App.ipa')}
To upload: double-click the archive in Finder (Xcode's Organizer opens) > Distribute App >
App Store Connect > Distribute. Or run again with  -- --upload --again`}
Release notes: paste client/release-notes/${versionName}.appstore.txt into "What to Test" (TestFlight)
or "What's New in This Version" (App Store).
When it is uploaded, mark this version in git:
  ${tagCommand(versionName)}`);
