// The app release pipeline's pure logic (scripts/app-release-lib.mjs): version raising, the iPhone
// project's version lines (on the real project.pbxproj), release-note grouping, store-text limits.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  APP_STORE_LIMIT, PLAY_LIMIT, PLAYER_END, PLAYER_START, TEMPLATE_MARK,
  appTags, bumpVersion, compareVersions, exportOptionsPlist, groupCommits, highestBuiltCode, isTeamId,
  notesMarkdown, parseGitLog, playerText, previousAppTag, readPbxprojVersions, setPbxprojVersion,
  storeTexts, tagCommand, xcodeContainer,
} from '../scripts/app-release-lib.mjs';

const ROOT = path.resolve(__dirname, '..');
const PBX = fs.readFileSync(path.join(ROOT, 'ios/App/App.xcodeproj/project.pbxproj'), 'utf8');
const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'app-version.json'), 'utf8'));

describe('version raising', () => {
  const v = { versionCode: 7, versionName: '1.2.3' };
  it('patch (default), minor, major, build and an explicit version; the code always rises by 1', () => {
    expect(bumpVersion(v)).toEqual({ versionCode: 8, versionName: '1.2.4' });
    expect(bumpVersion(v, 'patch')).toEqual({ versionCode: 8, versionName: '1.2.4' });
    expect(bumpVersion(v, 'minor')).toEqual({ versionCode: 8, versionName: '1.3.0' });
    expect(bumpVersion(v, 'MAJOR')).toEqual({ versionCode: 8, versionName: '2.0.0' });
    expect(bumpVersion(v, 'build')).toEqual({ versionCode: 8, versionName: '1.2.3' });
    expect(bumpVersion(v, '1.10.0')).toEqual({ versionCode: 8, versionName: '1.10.0' });
  });
  it('refuses a lower or equal version, nonsense, and a broken file', () => {
    expect(() => bumpVersion(v, '1.2.3')).toThrow(/isn't higher/);
    expect(() => bumpVersion(v, '1.1.9')).toThrow(/isn't higher/);
    expect(() => bumpVersion(v, 'next')).toThrow(/Unknown choice/);
    expect(() => bumpVersion(v, '1.2')).toThrow(/Unknown choice/);
    expect(() => bumpVersion({ versionCode: 0, versionName: '1.0.0' })).toThrow(/versionCode/);
    expect(() => bumpVersion({ versionCode: 1, versionName: '1.0' })).toThrow(/versionName/);
  });
  it('compares numerically, not as text', () => {
    expect(compareVersions('1.10.0', '1.9.9')).toBe(1);
    expect(compareVersions('2.0.0', '2.0.0')).toBe(0);
    expect(compareVersions('0.9.0', '1.0.0')).toBe(-1);
  });
  it('the Android build reads app-version.json', () => {
    const gradle = fs.readFileSync(path.join(ROOT, 'android/app/build.gradle'), 'utf8');
    expect(gradle).toMatch(/app-version\.json/);
    expect(gradle).toMatch(/versionCode appVersion\.versionCode/);
    expect(gradle).toMatch(/versionName appVersion\.versionName/);
  });
});

describe('the iPhone project (real project.pbxproj)', () => {
  it('uses Swift Package Manager: App.xcodeproj, no CocoaPods workspace', () => {
    expect(fs.existsSync(path.join(ROOT, 'ios/App/App.xcworkspace'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, 'ios/App/Podfile'))).toBe(false);
    expect(xcodeContainer((p) => fs.existsSync(path.join(ROOT, p)))).toEqual(['-project', 'ios/App/App.xcodeproj']);
    expect(xcodeContainer((p) => p.endsWith('.xcworkspace'))).toEqual(['-workspace', 'ios/App/App.xcworkspace']);
  });

  it('Info.plist takes the version and build number from the build settings', () => {
    const plist = fs.readFileSync(path.join(ROOT, 'ios/App/App/Info.plist'), 'utf8');
    expect(plist).toMatch(/<key>CFBundleShortVersionString<\/key>\s*<string>\$\(MARKETING_VERSION\)<\/string>/);
    expect(plist).toMatch(/<key>CFBundleVersion<\/key>\s*<string>\$\(CURRENT_PROJECT_VERSION\)<\/string>/);
  });

  it('is in step with app-version.json in both configurations of the App target', () => {
    const found = readPbxprojVersions(PBX);
    expect(found).toHaveLength(2);
    for (const c of found) expect(c).toMatchObject({ versionName: VERSION.versionName, versionCode: String(VERSION.versionCode) });
  });

  it('sets the version in Debug and Release of the App target and changes nothing else', () => {
    const out = setPbxprojVersion(PBX, { versionName: '1.4.2', versionCode: 12 });
    expect(readPbxprojVersions(out).map((c) => [c.versionName, c.versionCode])).toEqual([['1.4.2', '12'], ['1.4.2', '12']]);
    const strip = (s) => s.replace(/^\t+(MARKETING_VERSION|CURRENT_PROJECT_VERSION) = [^;]*;\n/gm, '');
    expect(strip(out)).toBe(strip(PBX));
    expect(out.split('\n')).toHaveLength(PBX.split('\n').length);
    // Running it again changes nothing.
    expect(setPbxprojVersion(out, { versionName: '1.4.2', versionCode: 12 })).toBe(out);
  });

  it('adds the lines when a configuration has none, and refuses a project without the App target', () => {
    const bare = PBX.replace(/^\t+(MARKETING_VERSION|CURRENT_PROJECT_VERSION) = [^;]*;\n/gm, '');
    expect(readPbxprojVersions(bare).every((c) => c.versionName === null)).toBe(true);
    const out = setPbxprojVersion(bare, { versionName: '2.0.0', versionCode: 3 });
    expect(readPbxprojVersions(out).map((c) => c.versionName)).toEqual(['2.0.0', '2.0.0']);
    expect(() => setPbxprojVersion(PBX.replace(/PBXNativeTarget "App"/g, 'PBXNativeTarget "Other"'), { versionName: '1.0.0', versionCode: 1 })).toThrow(/App/);
    expect(() => setPbxprojVersion(PBX, { versionName: '1.0', versionCode: 1 })).toThrow(/version/);
  });

  it('export options: App Store Connect, automatic signing, a valid team id, upload on request', () => {
    expect(isTeamId('ABCDE12345')).toBe(true);
    expect(isTeamId('abcde12345')).toBe(false);
    expect(isTeamId('')).toBe(false);
    const plist = exportOptionsPlist({ teamId: 'ABCDE12345' });
    expect(plist).toMatch(/<key>method<\/key>\s*<string>app-store-connect<\/string>/);
    expect(plist).toMatch(/<key>signingStyle<\/key>\s*<string>automatic<\/string>/);
    expect(plist).toMatch(/<key>teamID<\/key>\s*<string>ABCDE12345<\/string>/);
    expect(plist).toMatch(/<key>destination<\/key>\s*<string>export<\/string>/);
    expect(plist).toMatch(/<key>manageAppVersionAndBuildNumber<\/key>\s*<false\/>/);
    expect(exportOptionsPlist({ teamId: 'ABCDE12345', upload: true })).toMatch(/<string>upload<\/string>/);
    expect(() => exportOptionsPlist({ teamId: 'XXXX' })).toThrow(/Team ID/);
  });
});

describe('release notes', () => {
  it('finds the previous app tag by version, ignoring other tags', () => {
    const tags = ['app-v1.0.0', 'app-v1.10.0', 'app-v1.2.0', 'v3.0.0', 'app-vbeta', ''];
    expect(appTags(tags)).toEqual(['app-v1.10.0', 'app-v1.2.0', 'app-v1.0.0']);
    expect(previousAppTag(tags, '1.10.1')).toBe('app-v1.10.0');
    expect(previousAppTag(tags, '1.10.0')).toBe('app-v1.2.0');
    expect(previousAppTag(tags, '1.0.0')).toBeNull();
    expect(previousAppTag([], '1.0.1')).toBeNull();
  });

  it('reads git log output and groups commits by what they touched', () => {
    const log = '\x1eNew canyon tracks\n\nclient/src/three/canyon.js\nsrc/tracks/canyon.js\n'
      + '\x1eSplash colour\n\nclient/android/app/src/main/res/values/styles.xml\n'
      + '\x1eFaster leaderboard query\n\nsrc/leaderboard/index.js\ndocs/05-runbook.md\n'
      + '\x1eRunbook typo\n\ndocs/05-runbook.md\n'
      + '\x1eApp 1.0.1 (2)\n\nclient/app-version.json\n';
    const commits = parseGitLog(log);
    expect(commits[0]).toEqual({ subject: 'New canyon tracks', files: ['client/src/three/canyon.js', 'src/tracks/canyon.js'] });
    const g = groupCommits(commits);
    expect(g.apps).toEqual(['Splash colour']);
    expect(g.game).toEqual(['New canyon tracks']);
    expect(g.server).toEqual(['Faster leaderboard query']);
    expect(g.other).toEqual(['Runbook typo']);
  });

  it('the draft has a player text with template lines and the grouped commits', () => {
    const md = notesMarkdown({ versionName: '1.0.1', versionCode: 2, since: 'the commits since the tag app-v1.0.0', date: '2026-10-21', groups: { game: ['New canyon tracks'] } });
    expect(md).toMatch(/^# Marble Spins 1\.0\.1 \(build 2\)/);
    expect(md).toContain('- New canyon tracks');
    expect(md).toContain('- (none)');
    expect(md).toContain(PLAYER_START);
    expect(md).toContain(PLAYER_END);
    expect(playerText(md)).toContain(TEMPLATE_MARK);
    // The untouched template isn't accepted as store text.
    expect(storeTexts(playerText(md)).ok).toBe(false);
    // Edited: accepted.
    const edited = md.replace(/^\[EDIT\].*\n/gm, '');
    expect(storeTexts(playerText(edited))).toMatchObject({ ok: true, play: '<en-US>\nBug fixes and smoother races.\n</en-US>\n' });
    expect(playerText('no markers')).toBeNull();
  });

  it('store texts: Google Play 500 characters, App Store 4000, no < or >, not empty', () => {
    const ok = storeTexts('- New canyon tracks.\n- Smoother races 🏁');
    expect(ok.ok).toBe(true);
    expect(ok.appStore).toBe('- New canyon tracks.\n- Smoother races 🏁\n');
    expect(ok.chars).toBe(39);
    expect(storeTexts('x'.repeat(PLAY_LIMIT)).ok).toBe(true);
    expect(storeTexts('🏁'.repeat(PLAY_LIMIT)).ok).toBe(true); // counted as characters, not bytes
    expect(storeTexts('x'.repeat(PLAY_LIMIT + 1)).problems.join()).toMatch(/Google Play allows 500/);
    expect(storeTexts('x'.repeat(APP_STORE_LIMIT + 1)).problems.join()).toMatch(/App Store allows 4000/);
    expect(storeTexts('Use <b>bold</b>').ok).toBe(false);
    expect(storeTexts('  ').ok).toBe(false);
  });
});

describe('release folder and tags', () => {
  it('finds the highest build already made, per app', () => {
    const files = ['marblespins-1.0.0-1.aab', 'marblespins-1.0.1-3.aab', 'MarbleSpins-1.0.1-4.xcarchive', 'MarbleSpins-1.0.1-4-export', 'notes.txt'];
    expect(highestBuiltCode(files, 'android')).toBe(3);
    expect(highestBuiltCode(files, 'ios')).toBe(4);
    expect(highestBuiltCode([], 'android')).toBe(0);
  });
  it('prints the tag command (never runs it)', () => {
    expect(tagCommand('1.0.1')).toBe('git tag app-v1.0.1 && git push origin app-v1.0.1');
  });
});

describe("the apps' server address (app-api.json, used by npm run app:sync)", () => {
  const api = JSON.parse(fs.readFileSync(path.join(ROOT, 'app-api.json'), 'utf8'));
  it('is an https address, with the Railway address kept as the fallback and api.marblespins.com planned', () => {
    for (const k of ['api', 'planned', 'fallback']) expect(api[k]).toMatch(/^https:\/\/[a-z0-9.-]+$/);
    expect(api.fallback).toBe('https://marble-race-rame-production.up.railway.app');
    expect(api.planned).toBe('https://api.marblespins.com');
    expect([api.planned, api.fallback]).toContain(api.api);
  });
});
