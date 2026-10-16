// Builds the signed Android App Bundle (.aab) for Google Play, on your own computer.
//   npm run android:release        (in client/; needs Android Studio and the upload key)
// Raise versionCode in client/app-version.json before every upload.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_RELEASE_DIR, IS_WINDOWS, androidStudioJava, askHidden, keytool, readProps, run, sha256Of } from './android-tools.mjs';

const CLIENT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ANDROID = join(CLIENT, 'android');
const fail = (msg) => { console.error(msg); process.exit(1); };

const props = readProps(join(ANDROID, 'keystore.properties'));
if (!props.storeFile) fail('No upload key yet: run  npm run android:key  first (or restore keystore.properties and the key from your backup).');
if (!existsSync(props.storeFile)) fail(`The upload key isn't at ${props.storeFile}: restore it from your backup.`);
const env = { ...process.env };
if (!env.JAVA_HOME && androidStudioJava()) env.JAVA_HOME = androidStudioJava();
const tool = keytool();
if (!tool) fail('Java not found: install Android Studio.');

const pass = env.MS_UPLOAD_STOREPASSWORD || await askHidden('Upload key password: ');
let keyInfo;
try {
  keyInfo = run(tool, ['-list', '-v', '-keystore', props.storeFile, '-alias', props.keyAlias || 'upload', '-storepass', pass], { stdio: ['ignore', 'pipe', 'ignore'] });
} catch {
  fail('Wrong password for the upload key.');
}
env.MS_UPLOAD_STOREPASSWORD = pass;
env.MS_UPLOAD_KEYPASSWORD = env.MS_UPLOAD_KEYPASSWORD || pass;

const { versionCode, versionName } = JSON.parse(readFileSync(join(CLIENT, 'app-version.json'), 'utf8'));
console.log(`Building Marble Spins ${versionName} (versionCode ${versionCode})`);

run('npm', ['run', 'app:sync'], { cwd: CLIENT, stdio: 'inherit', env, shell: IS_WINDOWS });
run(IS_WINDOWS ? 'gradlew.bat' : './gradlew', ['--no-daemon', 'clean', 'bundleRelease'], { cwd: ANDROID, stdio: 'inherit', env, shell: IS_WINDOWS });

const aab = join(ANDROID, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
if (!existsSync(aab)) fail('No bundle was made (see the Gradle messages above).');
// Google Play refuses a bundle that isn't signed with the upload key.
let signed = null;
try { signed = sha256Of(run(tool, ['-printcert', '-jarfile', aab])); } catch { /* unsigned */ }
if (!signed || signed !== sha256Of(keyInfo)) fail('The bundle isn\'t signed with the upload key.');

const outDir = resolve(env.MS_RELEASE_DIR || DEFAULT_RELEASE_DIR);
mkdirSync(outDir, { recursive: true });
const dest = join(outDir, `marblespins-${versionName}-${versionCode}.aab`);
copyFileSync(aab, dest);
console.log(`
Signed bundle ready: ${dest}
Upload it in Play Console > Test and release > Testing > Internal testing > Create new release.
Next time: raise versionCode in client/app-version.json first (Google never accepts the same one twice).`);
