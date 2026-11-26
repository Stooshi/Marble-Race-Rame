// The app shell: the website never loads the app plugins; the offline check; the app's icons,
// splash screens and settings are all in place.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { isNativeApp, nativePlatform } from '../src/app/native';
import { serverReachable } from '../src/app/OfflineScreen';

const ROOT = path.resolve(__dirname, '..');

describe('app shell', () => {
  it('is off on the website', () => {
    expect(isNativeApp()).toBe(false);
    expect(nativePlatform()).toBe('web');
  });

  it('server check: up (even with its database briefly away), down, or no answer', async () => {
    expect(await serverReachable(async () => ({ ok: true, status: 200 }))).toBe(true);
    expect(await serverReachable(async () => ({ ok: false, status: 503 }))).toBe(true);
    expect(await serverReachable(async () => ({ ok: false, status: 502 }))).toBe(false);
    expect(await serverReachable(async () => { throw new TypeError('offline'); })).toBe(false);
  });

  it('the apps have their icons, splash screens and settings', () => {
    const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'capacitor.config.json'), 'utf8'));
    expect(config.appId).toBe('com.marblespins.app');
    expect(config.plugins.SplashScreen.backgroundColor).toBe('#0E1320');
    for (const f of [
      'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png',
      'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png',
      'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml',
      'android/app/src/main/res/drawable/splash.png',
      'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',
      'ios/App/App/Assets.xcassets/Splash.imageset/Default@3x~universal~anyany.png',
    ]) expect(fs.existsSync(path.join(ROOT, f)), f).toBe(true);
  });
});
