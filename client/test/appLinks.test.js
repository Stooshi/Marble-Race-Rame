// App links (Moses, 27 Oct 2026): marblespins.com links to a league, a room and the other shared pages
// open the app when it's installed (Android App Links, iPhone Universal Links), else the website.
// client/app-links.json is the one list: the website's two files, the Android manifest, the iPhone
// entitlements and the app's own check all follow it.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { build, readConfig } from '../scripts/app-links.mjs';
import { linkPath } from '../src/app/native';

const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const cfg = readConfig();
const FP = Array.from({ length: 32 }, (_, i) => (i * 7 % 256).toString(16).padStart(2, '0').toUpperCase()).join(':');

describe('app links: the website\'s files', () => {
  it('are what client/app-links.json gives (run npm run app:links after changing it)', () => {
    const { assetlinks, aasa } = build(cfg);
    expect(JSON.parse(src('public/.well-known/assetlinks.json'))).toEqual(assetlinks);
    expect(JSON.parse(src('public/.well-known/apple-app-site-association'))).toEqual(aasa);
  });
  it('slots: debug, upload and Play app signing for Android; the Team ID for iPhone; empty slots left out', () => {
    expect(Object.keys(cfg.android.fingerprints)).toEqual(['debug', 'upload', 'playAppSigning']);
    expect(cfg.android.package).toBe('com.marblespins.app');
    expect(cfg.ios.bundleId).toBe('com.marblespins.app');
    expect(build({ ...cfg, android: { ...cfg.android, fingerprints: { debug: '', upload: '', playAppSigning: '' } } }).assetlinks).toEqual([]);
    const one = build({ ...cfg, android: { ...cfg.android, fingerprints: { debug: FP.toLowerCase(), upload: '', playAppSigning: FP } } }).assetlinks;
    expect(one).toEqual([{ relation: ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name: 'com.marblespins.app', sha256_cert_fingerprints: [FP] } }]);
    expect(() => build({ ...cfg, android: { ...cfg.android, fingerprints: { debug: 'AB:CD' } } })).toThrow(/debug/);
    const ios = build({ ...cfg, ios: { ...cfg.ios, teamId: 'ab12cd34ef' } }).aasa;
    expect(ios.applinks.details[0].appIDs).toEqual(['AB12CD34EF.com.marblespins.app']);
    expect(ios.applinks.details[0].components).toContainEqual({ '/': '/l/*' });
    expect(ios.applinks.details[0].components).toContainEqual({ '/': '/tracks/*' });
    expect(() => build({ ...cfg, ios: { ...cfg.ios, teamId: 'nope' } })).toThrow(/teamId/);
  });
  it('Vercel serves the iPhone file as JSON', () => {
    const v = JSON.parse(src('vercel.json'));
    const h = v.headers.find((x) => x.source === '/.well-known/apple-app-site-association');
    expect(h.headers).toContainEqual({ key: 'Content-Type', value: 'application/json' });
  });
  it('never the shop, checkout, the pass or gift codes (store rules: buying stays in the app\'s own store)', () => {
    for (const p of cfg.paths) expect(p).not.toMatch(/shop|checkout|pass|redeem|collection/);
  });
});

describe('app links: the apps', () => {
  it('Android: a verified link filter for the same host and paths', () => {
    const m = src('android/app/src/main/AndroidManifest.xml');
    expect(m).toContain('<intent-filter android:autoVerify="true">');
    expect(m).toContain(`<data android:host="${cfg.host}" />`);
    const prefixes = [...m.matchAll(/android:pathPrefix="([^"]+)"/g)].map((x) => x[1]);
    expect(prefixes).toEqual(cfg.paths);
  });
  it('iPhone: the Associated Domains entitlement', () => {
    expect(src('ios/App/App/App.entitlements')).toContain(`<string>applinks:${cfg.host}</string>`);
  });
  it('the app opens the page of a link it handles, and leaves the rest to the website', () => {
    expect(linkPath('https://marblespins.com/l/K7QF2M')).toBe('/l/K7QF2M');
    expect(linkPath('https://marblespins.com/l/K7QF2M?join=1')).toBe('/l/K7QF2M?join=1');
    expect(linkPath('https://www.marblespins.com/r/AB12CD')).toBe('/r/AB12CD');
    expect(linkPath('https://marblespins.com/tracks')).toBe('/tracks');
    expect(linkPath('https://marblespins.com/tracks/bobsleigh-run')).toBe('/tracks/bobsleigh-run');
    expect(linkPath('https://marblespins.com/results/123')).toBe('/results/123');
    expect(linkPath('https://marblespins.com/l/')).toBeNull();
    expect(linkPath('https://marblespins.com/shop')).toBeNull();
    expect(linkPath('https://marblespins.com/trackside')).toBeNull();
    expect(linkPath('http://marblespins.com/l/K7QF2M')).toBeNull();
    expect(linkPath('https://evil.example/l/K7QF2M')).toBeNull();
    expect(linkPath('not a link')).toBeNull();
    const native = src('src/app/native.js');
    expect(native).toContain("App.addListener('appUrlOpen', ({ url }) => follow(url));");
    expect(native).toContain('App.getLaunchUrl?.()');
    expect(src('src/App.jsx')).toContain('open: (to) => navigate(to)');
  });
});
