// The pure parts of the app release scripts (no files, no git, no Xcode), so they can be tested:
// version raising, the iPhone project's version lines, release-note grouping, store-text limits,
// and the release-folder checks. Used by app-version.mjs, app-notes.mjs, ios-release.mjs and
// android-release.mjs; tested in client/test/appRelease.test.js.

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

/** "1.2.3" -> [1, 2, 3], or null. */
export function parseVersion(v) {
  const m = SEMVER.exec(String(v ?? '').trim());
  return m ? m.slice(1).map(Number) : null;
}

/** -1, 0 or 1, like a sort comparator, for two "x.y.z" strings. */
export function compareVersions(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) throw new Error(`Not a version: ${!pa ? a : b}`);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
  return 0;
}

/**
 * The next app version. `how` is patch (default), minor, major, build (only the build number,
 * for a second upload of the same version) or an explicit "x.y.z" higher than the current one.
 * versionCode (Android's versionCode and the iPhone's build number) always rises by 1.
 */
export function bumpVersion(current, how = 'patch') {
  const code = Number(current?.versionCode);
  const now = parseVersion(current?.versionName);
  if (!Number.isInteger(code) || code < 1) throw new Error('app-version.json: versionCode must be a whole number of at least 1');
  if (!now) throw new Error('app-version.json: versionName must look like 1.2.3');
  const [maj, min, pat] = now;
  const kind = String(how || 'patch').trim().toLowerCase();
  let versionName;
  if (kind === 'patch') versionName = `${maj}.${min}.${pat + 1}`;
  else if (kind === 'minor') versionName = `${maj}.${min + 1}.0`;
  else if (kind === 'major') versionName = `${maj + 1}.0.0`;
  else if (kind === 'build') versionName = current.versionName;
  else if (parseVersion(kind)) {
    if (compareVersions(kind, current.versionName) <= 0) {
      throw new Error(`${kind} isn't higher than the current ${current.versionName} (use "build" for a new build of the same version)`);
    }
    versionName = parseVersion(kind).join('.');
  } else {
    throw new Error(`Unknown choice "${how}": use patch, minor, major, build or a version like 1.2.0`);
  }
  return { versionCode: code + 1, versionName };
}

/** The ids of the App target's build configurations (Debug, Release, ...) in project.pbxproj. */
function appConfigIds(pbx, target) {
  const list = new RegExp(`/\\* Build configuration list for PBXNativeTarget "${target}" \\*/ = \\{[\\s\\S]*?buildConfigurations = \\(([\\s\\S]*?)\\);`).exec(pbx);
  if (!list) throw new Error(`project.pbxproj: no build configuration list for the "${target}" target`);
  const ids = [...list[1].matchAll(/([0-9A-F]{24})/g)].map((m) => m[1]);
  if (!ids.length) throw new Error(`project.pbxproj: the "${target}" target has no build configurations`);
  return ids;
}

/** Start and end of one XCBuildConfiguration's buildSettings body. */
function settingsRange(pbx, id) {
  const head = new RegExp(`\\n(\\t*)${id} /\\*[^*]*\\*/ = \\{\\n`).exec(pbx);
  if (!head) throw new Error(`project.pbxproj: build configuration ${id} not found`);
  const open = pbx.indexOf('buildSettings = {\n', head.index);
  const close = pbx.indexOf('\n\t\t\t};', open);
  const blockEnd = pbx.indexOf('\n\t\t};', head.index);
  if (open < 0 || close < 0 || close > blockEnd) throw new Error(`project.pbxproj: build configuration ${id} has no buildSettings`);
  return { start: open + 'buildSettings = {\n'.length, end: close };
}

const pbxValue = (v) => (/^[A-Za-z0-9._/]+$/.test(v) ? v : `"${v}"`);

/**
 * project.pbxproj with MARKETING_VERSION = versionName and CURRENT_PROJECT_VERSION = versionCode
 * in every build configuration of the App target (Info.plist reads both). Other targets and
 * settings are left exactly as they are; a missing line is added.
 */
export function setPbxprojVersion(pbx, { versionName, versionCode }, target = 'App') {
  if (!parseVersion(versionName)) throw new Error(`Not a version: ${versionName}`);
  if (!Number.isInteger(Number(versionCode))) throw new Error(`Not a build number: ${versionCode}`);
  const want = { MARKETING_VERSION: versionName, CURRENT_PROJECT_VERSION: String(versionCode) };
  let out = pbx;
  for (const id of appConfigIds(pbx, target)) {
    const { start, end } = settingsRange(out, id);
    let body = out.slice(start, end);
    for (const [key, value] of Object.entries(want)) {
      const line = new RegExp(`^(\\t+)${key} = [^;\\n]*;$`, 'm');
      if (line.test(body)) body = body.replace(line, `$1${key} = ${pbxValue(value)};`);
      else body = `\t\t\t\t${key} = ${pbxValue(value)};\n${body}`;
    }
    out = out.slice(0, start) + body + out.slice(end);
  }
  return out;
}

/** [{ id, versionName, versionCode }] for each build configuration of the App target. */
export function readPbxprojVersions(pbx, target = 'App') {
  return appConfigIds(pbx, target).map((id) => {
    const { start, end } = settingsRange(pbx, id);
    const body = pbx.slice(start, end);
    const get = (key) => (new RegExp(`^\\t+${key} = "?([^";\\n]*)"?;$`, 'm').exec(body) || [])[1] ?? null;
    return { id, versionName: get('MARKETING_VERSION'), versionCode: get('CURRENT_PROJECT_VERSION') };
  });
}

/** CocoaPods projects have App.xcworkspace next to App.xcodeproj; Swift Package Manager ones don't. */
export function xcodeContainer(exists, iosAppDir = 'ios/App') {
  const ws = `${iosAppDir}/App.xcworkspace`;
  return exists(ws) ? ['-workspace', ws] : ['-project', `${iosAppDir}/App.xcodeproj`];
}

/** An Apple Developer Team ID: 10 capital letters and digits. */
export const isTeamId = (s) => /^[A-Z0-9]{10}$/.test(String(s ?? '').trim());

/** ExportOptions.plist for xcodebuild -exportArchive (App Store Connect, automatic signing). */
export function exportOptionsPlist({ teamId, upload = false }) {
  if (!isTeamId(teamId)) throw new Error('The Apple Team ID must be 10 capital letters and digits');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>method</key>
\t<string>app-store-connect</string>
\t<key>destination</key>
\t<string>${upload ? 'upload' : 'export'}</string>
\t<key>signingStyle</key>
\t<string>automatic</string>
\t<key>teamID</key>
\t<string>${teamId.trim()}</string>
\t<key>uploadSymbols</key>
\t<true/>
\t<key>manageAppVersionAndBuildNumber</key>
\t<false/>
</dict>
</plist>
`;
}

// ---------------------------------------------------------------- release notes

/** The app version tags (app-v1.2.3), highest first. Other tags are ignored. */
export function appTags(tags) {
  return tags
    .map((t) => t.trim())
    .filter((t) => /^app-v\d+\.\d+\.\d+$/.test(t))
    .sort((a, b) => compareVersions(b.slice(5), a.slice(5)));
}

/** The tag the notes start from: the highest app tag lower than this version, or null. */
export function previousAppTag(tags, versionName) {
  return appTags(tags).find((t) => compareVersions(t.slice(5), versionName) < 0) ?? null;
}

export const NOTE_GROUPS = [
  { key: 'apps', title: 'The apps themselves (iPhone/Android projects, app settings)', test: (f) => /^client\/(ios|android|assets)\/|^client\/(capacitor\.config\.json|app-version\.json)$|^client\/src\/app\//.test(f) },
  { key: 'game', title: 'Game and website (players get these in the apps only with this update)', test: (f) => /^client\/(src|public)\//.test(f) },
  { key: 'server', title: 'Server (already live for app players; no app update needed)', test: (f) => /^(src|scripts)\//.test(f) || /^docs\/(database_schema\.sql|data_updates\/)/.test(f) },
  { key: 'other', title: 'Docs, tests and tools (not seen by players)', test: () => true },
];

/**
 * Groups commits ({ subject, files }) by what they touched, most player-relevant group first.
 * Release-pipeline commits that only raise the version are left out.
 */
export function groupCommits(commits) {
  const groups = Object.fromEntries(NOTE_GROUPS.map((g) => [g.key, []]));
  for (const c of commits) {
    const subject = String(c.subject ?? '').trim();
    if (!subject || /^App \d+\.\d+\.\d+ \(\d+\)$/.test(subject)) continue;
    const files = c.files ?? [];
    const group = NOTE_GROUPS.find((g) => files.some((f) => g.test(f))) ?? NOTE_GROUPS[NOTE_GROUPS.length - 1];
    groups[group.key].push(subject);
  }
  return groups;
}

/** git log --format=%x1e%s --name-only output -> [{ subject, files }]. */
export function parseGitLog(out) {
  return String(out).split('\x1e').map((chunk) => chunk.split('\n').map((l) => l.trim()).filter(Boolean))
    .filter((lines) => lines.length)
    .map(([subject, ...files]) => ({ subject, files }));
}

export const PLAYER_START = '<!-- player text: start -->';
export const PLAYER_END = '<!-- player text: end -->';
export const TEMPLATE_MARK = '[EDIT]';
export const PLAY_LIMIT = 500;
export const APP_STORE_LIMIT = 4000;

/** The draft release notes (client/release-notes/<versionName>.md). */
export function notesMarkdown({ versionName, versionCode, since, date, groups }) {
  const sections = NOTE_GROUPS.map((g) => {
    const items = groups[g.key] ?? [];
    return `### ${g.title}\n\n${items.length ? items.map((s) => `- ${s}`).join('\n') : '- (none)'}`;
  }).join('\n\n');
  return `# Marble Spins ${versionName} (build ${versionCode})

Draft made ${date} from ${since}.

## What players read (edit this)

Write what a player will notice, in short plain lines. Keep it under ${PLAY_LIMIT} characters
(Google Play's limit; the App Store allows ${APP_STORE_LIMIT}). Delete the lines that start
with ${TEMPLATE_MARK}, then run \`npm run app:notes\` again to make the store texts.

${PLAYER_START}
${TEMPLATE_MARK} One line per change players will notice, for example: New tracks in the Canyon Series.
${TEMPLATE_MARK} Another change players will notice.
Bug fixes and smoother races.
${PLAYER_END}

## The commits (for you, not for players)

${sections}
`;
}

/** The player text between the markers, trimmed, or null when the markers are missing. */
export function playerText(md) {
  const a = md.indexOf(PLAYER_START);
  const b = md.indexOf(PLAYER_END);
  if (a < 0 || b < a) return null;
  return md.slice(a + PLAYER_START.length, b).trim();
}

/** Characters as people count them (an emoji is one). */
export const charCount = (s) => [...String(s)].length;

/**
 * The store texts from the player text, or the problems that stop them.
 * Google Play: <en-US>…</en-US>, text at most 500 characters. App Store "What's New": at most 4000.
 */
export function storeTexts(text) {
  const problems = [];
  const t = String(text ?? '').trim();
  if (!t) problems.push('The player text is empty.');
  if (t.includes(TEMPLATE_MARK)) problems.push(`The player text still has template lines starting with ${TEMPLATE_MARK}.`);
  if (/[<>]/.test(t)) problems.push('Leave out < and > (Google Play reads them as language tags).');
  const n = charCount(t);
  if (n > PLAY_LIMIT) problems.push(`The player text is ${n} characters; Google Play allows ${PLAY_LIMIT}.`);
  if (n > APP_STORE_LIMIT) problems.push(`The player text is ${n} characters; the App Store allows ${APP_STORE_LIMIT}.`);
  if (problems.length) return { ok: false, problems };
  return { ok: true, problems, play: `<en-US>\n${t}\n</en-US>\n`, appStore: `${t}\n`, chars: n };
}

// ---------------------------------------------------------------- release folder

/** The highest versionCode among release files, e.g. marblespins-1.0.0-1.aab, or 0. */
export function highestBuiltCode(fileNames, kind) {
  const re = kind === 'ios' ? /^MarbleSpins-\d+\.\d+\.\d+-(\d+)\.xcarchive$/ : /^marblespins-\d+\.\d+\.\d+-(\d+)\.aab$/;
  return fileNames.reduce((max, f) => {
    const m = re.exec(f);
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);
}

export const tagCommand = (versionName) => `git tag app-v${versionName} && git push origin app-v${versionName}`;
