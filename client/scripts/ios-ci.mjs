// The iPhone build in GitHub Actions (Moses, 23 Nov 2026; .github/workflows/ios-testflight.yml).
// Signing works through the App Store Connect API key alone (secrets ASC_KEY_ID, ASC_ISSUER_ID,
// ASC_KEY_P8), with nothing else to store: each run makes its own short-lived Apple Distribution
// certificate and App Store profile through the API, signs with them, and revokes the certificate and
// deletes the profile at the end (builds already uploaded are not affected: Apple re-signs what it
// distributes). A fresh GitHub Mac can't use Xcode's automatic signing here without a development
// certificate and a registered iPhone, so this does the same through the API instead.
//
//   node scripts/ios-ci.mjs version      the build number: app-version.json's, raised above the highest
//                                         build already in App Store Connect if needed (writes app-version.json)
//   node scripts/ios-ci.mjs signing      certificate + profile, keychain files, project set to manual signing
//                                         (this checkout only), ExportOptions.plist
//   node scripts/ios-ci.mjs cleanup      revokes the certificate and deletes the profile made by `signing`
//   node scripts/ios-ci.mjs sync-version sets project.pbxproj's version to app-version.json (for the commit)
// Values for later steps go to GITHUB_OUTPUT; nothing secret is printed.
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUNDLE_ID, ascClient } from './asc-api.mjs';
import { setPbxprojBuildSettings, setPbxprojVersion } from './app-release-lib.mjs';

const CLIENT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PBXPROJ = join(CLIENT, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
const ENTITLEMENTS = join(CLIENT, 'ios', 'App', 'App', 'App.entitlements');
const VERSION_FILE = join(CLIENT, 'app-version.json');
const TMP = process.env.RUNNER_TEMP || join(CLIENT, '.ios-ci');
const STATE = join(TMP, 'ios-ci-state.json');
const CAPABILITIES = ['PUSH_NOTIFICATIONS', 'ASSOCIATED_DOMAINS'];

const output = (name, value, secret = false) => {
  if (secret) console.log(`::add-mask::${value}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
  else if (!secret) console.log(`${name}=${value}`);
};
const fail = (msg) => { console.error(`::error::${msg}`); process.exit(1); };
const api = () => ascClient();

async function appId(a) {
  const apps = (await a.get(`/v1/apps?filter[bundleId]=${BUNDLE_ID}&fields[apps]=bundleId`)).data.filter((x) => x.attributes.bundleId === BUNDLE_ID);
  if (!apps.length) fail(`No app with bundle id ${BUNDLE_ID} in App Store Connect (Apps > + > New App first).`);
  return apps[0].id;
}

async function version() {
  const a = api();
  const v = JSON.parse(readFileSync(VERSION_FILE, 'utf8'));
  const id = await appId(a);
  const builds = await a.all(`/v1/builds?filter[app]=${id}&fields[builds]=version&limit=200`);
  const highest = builds.reduce((m, b) => Math.max(m, Number(b.attributes.version) || 0), 0);
  const build = Math.max(v.versionCode, highest + 1);
  const bumped = build !== v.versionCode;
  if (bumped) writeFileSync(VERSION_FILE, `${JSON.stringify({ ...v, versionCode: build }, null, 2)}\n`);
  writeFileSync(PBXPROJ, setPbxprojVersion(readFileSync(PBXPROJ, 'utf8'), { versionName: v.versionName, versionCode: build }));
  console.log(`Version ${v.versionName}, build ${build} (app-version.json had ${v.versionCode}; the highest build in App Store Connect is ${highest || 'none'})`);
  output('version_name', v.versionName);
  output('build', build);
  output('bumped', bumped);
}

function syncVersion() {
  const v = JSON.parse(readFileSync(VERSION_FILE, 'utf8'));
  writeFileSync(PBXPROJ, setPbxprojVersion(readFileSync(PBXPROJ, 'utf8'), v));
}

async function signing() {
  const a = api();
  mkdirSync(TMP, { recursive: true });
  const state = {};
  const save = () => writeFileSync(STATE, JSON.stringify(state));

  // The app id (bundle id) and its capabilities (the entitlements file asks for push and associated domains).
  const bundle = (await a.get(`/v1/bundleIds?filter[identifier]=${BUNDLE_ID}&limit=20`)).data.find((b) => b.attributes.identifier === BUNDLE_ID);
  if (!bundle) fail(`The bundle id ${BUNDLE_ID} isn't registered (developer.apple.com > Identifiers).`);
  const have = new Set((await a.all(`/v1/bundleIds/${bundle.id}/bundleIdCapabilities`)).map((c) => c.attributes.capabilityType));
  for (const cap of CAPABILITIES.filter((c) => !have.has(c))) {
    await a.post('/v1/bundleIdCapabilities', { data: { type: 'bundleIdCapabilities', attributes: { capabilityType: cap }, relationships: { bundleId: { data: { type: 'bundleIds', id: bundle.id } } } } });
    console.log(`Switched on ${cap} for ${BUNDLE_ID}`);
  }

  // A key and certificate request made here; the private key never leaves this runner.
  const keyPem = join(TMP, 'dist-key.pem');
  const csr = join(TMP, 'dist.csr');
  execFileSync('openssl', ['req', '-new', '-newkey', 'rsa:2048', '-nodes', '-keyout', keyPem, '-out', csr, '-subj', '/CN=Marble Spins GitHub build/C=SE'], { stdio: 'ignore' });
  const csrContent = readFileSync(csr, 'utf8').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  let cert;
  try {
    cert = (await a.post('/v1/certificates', { data: { type: 'certificates', attributes: { certificateType: 'DISTRIBUTION', csrContent } } })).data;
  } catch (e) {
    fail(`Apple refused a new distribution certificate (${e.message}). If the team has reached its limit, revoke an old "Apple Distribution" certificate at developer.apple.com > Certificates and run again.`);
  }
  state.certId = cert.id;
  save();
  const der = join(TMP, 'dist.cer');
  writeFileSync(der, Buffer.from(cert.attributes.certificateContent, 'base64'));
  const subject = execFileSync('openssl', ['x509', '-inform', 'DER', '-in', der, '-noout', '-subject', '-nameopt', 'multiline'], { encoding: 'utf8' });
  const team = /organizationalUnitName\s*=\s*([A-Z0-9]{10})/.exec(subject)?.[1];
  if (!team) fail('Could not read the Team ID from the certificate.');
  const identity = /commonName\s*=\s*(.+)/.exec(subject)?.[1]?.trim() ?? 'Apple Distribution';

  // The .p12 for the keychain (the macOS openssl, which writes a .p12 the keychain reads).
  const certPem = join(TMP, 'dist-cert.pem');
  execFileSync('openssl', ['x509', '-inform', 'DER', '-in', der, '-out', certPem]);
  const p12 = join(TMP, 'dist.p12');
  const p12Pass = crypto.randomBytes(18).toString('base64url');
  const sslBin = existsSync('/usr/bin/openssl') ? '/usr/bin/openssl' : 'openssl';
  execFileSync(sslBin, ['pkcs12', '-export', '-inkey', keyPem, '-in', certPem, '-out', p12, '-passout', `pass:${p12Pass}`], { stdio: 'ignore' });

  // The App Store profile with this certificate.
  const profileName = `Marble Spins GitHub ${process.env.GITHUB_RUN_ID || Date.now()}`;
  const profile = (await a.post('/v1/profiles', { data: { type: 'profiles', attributes: { name: profileName, profileType: 'IOS_APP_STORE' },
    relationships: { bundleId: { data: { type: 'bundleIds', id: bundle.id } }, certificates: { data: [{ type: 'certificates', id: cert.id }] } } } })).data;
  state.profileId = profile.id;
  save();
  const profilePath = join(TMP, 'dist.mobileprovision');
  writeFileSync(profilePath, Buffer.from(profile.attributes.profileContent, 'base64'));
  const uuid = profile.attributes.uuid;
  for (const dir of [join(homedir(), 'Library', 'MobileDevice', 'Provisioning Profiles'), join(homedir(), 'Library', 'Developer', 'Xcode', 'UserData', 'Provisioning Profiles')]) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${uuid}.mobileprovision`), readFileSync(profilePath));
  }

  // This checkout only (never committed): manual signing for the App target's Release build, and
  // push for production (an App Store profile carries aps-environment = production).
  writeFileSync(PBXPROJ, setPbxprojBuildSettings(readFileSync(PBXPROJ, 'utf8'), {
    CODE_SIGN_STYLE: 'Manual', DEVELOPMENT_TEAM: team, CODE_SIGN_IDENTITY: 'Apple Distribution', 'CODE_SIGN_IDENTITY[sdk=iphoneos*]': 'Apple Distribution', PROVISIONING_PROFILE_SPECIFIER: profileName,
  }));
  writeFileSync(ENTITLEMENTS, readFileSync(ENTITLEMENTS, 'utf8').replace(/(<key>aps-environment<\/key>\s*<string>)development(<\/string>)/, '$1production$2'));
  writeFileSync(join(TMP, 'ExportOptions.plist'), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>method</key><string>app-store-connect</string>
\t<key>destination</key><string>export</string>
\t<key>signingStyle</key><string>manual</string>
\t<key>teamID</key><string>${team}</string>
\t<key>signingCertificate</key><string>Apple Distribution</string>
\t<key>provisioningProfiles</key>
\t<dict><key>${BUNDLE_ID}</key><string>${profileName}</string></dict>
\t<key>uploadSymbols</key><true/>
\t<key>manageAppVersionAndBuildNumber</key><false/>
</dict>
</plist>
`);
  console.log(`Signing ready: team ${team}, ${identity}, profile "${profileName}"`);
  output('team_id', team);
  output('p12', p12);
  output('p12_password', p12Pass, true);
  output('export_options', join(TMP, 'ExportOptions.plist'));
}

async function cleanup() {
  if (!existsSync(STATE)) { console.log('Nothing to clean up.'); return; }
  const state = JSON.parse(readFileSync(STATE, 'utf8'));
  const a = api();
  let bad = 0;
  if (state.profileId) {
    try { await a.del(`/v1/profiles/${state.profileId}`); console.log('Deleted the build\'s profile.'); } catch (e) { if (e.status !== 404) { bad++; console.error(`::warning::The profile wasn't deleted: ${e.message}`); } }
  }
  if (state.certId) {
    try { await a.del(`/v1/certificates/${state.certId}`); console.log('Revoked the build\'s certificate.'); } catch (e) { if (e.status !== 404) { bad++; console.error(`::warning::The certificate wasn't revoked (${e.message}): revoke it at developer.apple.com > Certificates.`); } }
  }
  if (!bad) writeFileSync(STATE, '{}');
}

const cmd = process.argv[2];
if (cmd === 'version') await version();
else if (cmd === 'signing') await signing();
else if (cmd === 'cleanup') await cleanup();
else if (cmd === 'sync-version') syncVersion();
else fail('Use: ios-ci.mjs version | signing | cleanup | sync-version');
