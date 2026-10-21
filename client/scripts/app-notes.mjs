// Release notes for the current app version (npm run app:notes, in client/).
//
// First run for a version: writes client/release-notes/<versionName>.md, a draft with
//   - a short "What players read" text with template lines to edit, and
//   - the commit subjects since the previous app tag (app-v1.2.3), grouped by what they touched.
//   (No tag yet: the last 30 commits.) Commit subjects are written for us, not for players, so a
//   person writes the player text.
// Next runs (after you edited the player text): the .md is kept and the store texts are written:
//   client/release-notes/<versionName>.play.txt      Google Play, <en-US>…</en-US>, ≤ 500 characters
//   client/release-notes/<versionName>.appstore.txt  App Store "What's New", ≤ 4000 characters
// `npm run app:notes -- --fresh` writes the draft again (your edits are lost).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { groupCommits, notesMarkdown, parseGitLog, playerText, previousAppTag, storeTexts } from './app-release-lib.mjs';

const CLIENT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(CLIENT, 'release-notes');
const { versionCode, versionName } = JSON.parse(readFileSync(join(CLIENT, 'app-version.json'), 'utf8'));
const md = join(DIR, `${versionName}.md`);
const show = (p) => relative(CLIENT, p);
const git = (args) => execFileSync('git', args, { cwd: CLIENT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

if (!existsSync(md) || process.argv.includes('--fresh')) {
  let tags = [];
  try { tags = git(['tag', '--list', 'app-v*']).split('\n'); } catch { /* no git */ }
  const prev = previousAppTag(tags, versionName);
  const range = prev ? [`${prev}..HEAD`] : ['-n', '30'];
  let log = '';
  try {
    log = git(['log', '--no-merges', '--format=%x1e%s', '--name-only', ...range]);
  } catch {
    console.error('Couldn\'t read the git history (run this inside the project folder).');
    process.exit(1);
  }
  const commits = parseGitLog(log);
  mkdirSync(DIR, { recursive: true });
  writeFileSync(md, notesMarkdown({
    versionName,
    versionCode,
    since: prev ? `the commits since the tag ${prev}` : `the last ${commits.length} commits (no app tag yet)`,
    date: new Date().toISOString().slice(0, 10),
    groups: groupCommits(commits),
  }));
  console.log(`Release notes draft: client/${show(md)} (${commits.length} commits ${prev ? `since ${prev}` : 'with no app tag yet: the last 30'}).
Open it, write the short player text at the top, then run  npm run app:notes  again for the store texts.`);
  process.exit(0);
}

const text = playerText(readFileSync(md, 'utf8'));
if (text === null) {
  console.error(`client/${show(md)} has lost its "player text" marker lines. Put them back, or run  npm run app:notes -- --fresh`);
  process.exit(1);
}
const out = storeTexts(text);
if (!out.ok) {
  console.error(`Not yet: fix the player text in client/${show(md)}:\n${out.problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}
const play = join(DIR, `${versionName}.play.txt`);
const appStore = join(DIR, `${versionName}.appstore.txt`);
writeFileSync(play, out.play);
writeFileSync(appStore, out.appStore);
console.log(`Store texts (${out.chars} characters):
  client/${show(play)}      paste into Play Console > the release > Release notes
  client/${show(appStore)}  paste into App Store Connect > the version > What's New in This Version`);
