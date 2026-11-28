// Shared helpers for the Android release scripts (Windows, macOS and Linux).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import readline from 'node:readline';

const WIN = process.platform === 'win32';

/** Android Studio's own Java (JBR), when it's installed in the usual place. */
export function androidStudioJava() {
  const c = WIN
    ? [join(process.env.ProgramFiles || 'C:\\Program Files', 'Android', 'Android Studio', 'jbr'), join(process.env.LOCALAPPDATA || '', 'Programs', 'Android Studio', 'jbr')]
    : ['/Applications/Android Studio.app/Contents/jbr/Contents/Home', join(homedir(), 'Applications/Android Studio.app/Contents/jbr/Contents/Home'), '/opt/android-studio/jbr', join(homedir(), 'android-studio/jbr')];
  return c.find((d) => existsSync(join(d, 'bin', WIN ? 'java.exe' : 'java'))) ?? null;
}

/** keytool: JAVA_HOME's, Android Studio's, or the one on PATH. */
export function keytool() {
  const home = process.env.JAVA_HOME || androidStudioJava();
  const exe = WIN ? 'keytool.exe' : 'keytool';
  if (home && existsSync(join(home, 'bin', exe))) return join(home, 'bin', exe);
  try {
    execFileSync(exe, ['-help'], { stdio: 'ignore' });
    return exe;
  } catch {
    return null;
  }
}

export const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: 'utf8', ...opts });

/** Asks for a password without showing it. */
export function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.startsWith(question)) rl.output.write(question); };
    rl.question(question, (answer) => { rl.close(); process.stdout.write('\n'); resolve(answer); });
  });
}

/** android/keystore.properties as an object ({} when missing). */
export function readProps(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => /^\w+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/\\\\/g, '\\').replace(/\\:/g, ':')]));
}

/** The SHA-256 fingerprint keytool prints, or null. */
export const sha256Of = (text) => (text.match(/SHA256:\s*([0-9A-F:]+)/i) || [])[1] ?? null;

export const DEFAULT_KEY_DIR = join(homedir(), 'MarbleSpins-keys');
export const DEFAULT_RELEASE_DIR = join(homedir(), 'MarbleSpins-releases');
export const IS_WINDOWS = WIN;
