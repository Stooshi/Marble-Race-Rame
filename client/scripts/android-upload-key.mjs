// Makes the Google Play UPLOAD key for com.marblespins.app, once, on your own computer.
//   npm run android:key            (in client/; Windows, macOS or Linux; needs Android Studio)
//
// Google Play App Signing keeps the real app-signing key at Google; this upload key only proves
// that an upload came from us. It is stored OUTSIDE the project, so it can never reach GitHub:
//   <home>/MarbleSpins-keys/marblespins-upload.jks    the key (PKCS12, alias "upload")   SECRET
//   <home>/MarbleSpins-keys/upload_certificate.pem    its public certificate             not secret
// (<home> = C:\Users\<you> on Windows, /Users/<you> on a Mac), and android/keystore.properties
// (gitignored) says where the key is, without the password.
// Back it up at once: docs/05-runbook.md, "The upload key".
import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_KEY_DIR, askHidden, keytool, run, sha256Of } from './android-tools.mjs';

const CLIENT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = resolve(CLIENT, '..');
const KEY_DIR = resolve(process.env.MS_KEY_DIR || DEFAULT_KEY_DIR);
const KEY = join(KEY_DIR, 'marblespins-upload.jks');
const CERT = join(KEY_DIR, 'upload_certificate.pem');
const PROPS = join(CLIENT, 'android', 'keystore.properties');
const ALIAS = 'upload';
const fail = (msg) => { console.error(msg); process.exit(1); };

const tool = keytool();
if (!tool) fail('keytool not found: install Android Studio (it includes Java) and try again.');
if (existsSync(KEY)) fail(`An upload key already exists: ${KEY}\nNever make a second one for the same app. (Lost it? The runbook says how Google resets it.)`);
if ((KEY_DIR + '/').startsWith(REPO + '/') || (KEY_DIR + '\\').startsWith(REPO + '\\')) fail('Keep the key outside the project folder (MS_KEY_DIR).');

let pass = process.env.MS_UPLOAD_STOREPASSWORD;
if (!pass) {
  console.log('Choose a password for the upload key (12+ characters). Save it in your password manager now.');
  pass = await askHidden('Password: ');
  if (pass !== await askHidden('Again:    ')) fail('The two passwords differ.');
}
if (pass.length < 12) fail('Use at least 12 characters.');

mkdirSync(KEY_DIR, { recursive: true });
// PKCS12 keystores use one password for the store and the key. Passed on the command line only
// to keytool, never written to a file.
run(tool, ['-genkeypair', '-noprompt', '-storetype', 'PKCS12', '-keystore', KEY, '-alias', ALIAS,
  '-keyalg', 'RSA', '-keysize', '4096', '-validity', '10000',
  '-dname', 'CN=Marble Spins upload key, O=Voltron Robotics AB, L=Stockholm, C=SE',
  '-storepass', pass, '-keypass', pass], { stdio: ['ignore', 'ignore', 'inherit'] });
run(tool, ['-exportcert', '-rfc', '-keystore', KEY, '-alias', ALIAS, '-storepass', pass, '-file', CERT], { stdio: ['ignore', 'ignore', 'inherit'] });
try { chmodSync(KEY_DIR, 0o700); chmodSync(KEY, 0o600); } catch { /* (Windows: the home folder is already private) */ }

const esc = (p) => p.replace(/\\/g, '\\\\').replace(/:/g, '\\:');
writeFileSync(PROPS, `# Where the Google Play upload key is (made by scripts/android-upload-key.mjs). Gitignored.\n# The password is NOT here: npm run android:release asks for it.\nstoreFile=${esc(KEY)}\nkeyAlias=${ALIAS}\n`);

const listing = run(tool, ['-list', '-v', '-keystore', KEY, '-alias', ALIAS, '-storepass', pass]);
console.log(`
Upload key made:
  key          ${KEY}
  certificate  ${CERT}
  SHA-256      ${sha256Of(listing)}

Back it up now (two copies; never GitHub, email, chat or a shared folder):
  1. Password manager: the password and the SHA-256 above, with the .jks and .pem files attached.
  2. An encrypted USB stick (BitLocker To Go on Windows) kept offline: the .jks and .pem.`);
