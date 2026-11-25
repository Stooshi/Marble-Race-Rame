// Push notifications in the apps (Moses, 21 Oct 2026; app plan step 5): switched off until
// src/shared/push.json is on; never asked at first launch, only after the first finished race;
// season news never for guests; the native projects are wired for Firebase and APNs.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import settings from '../src/shared/push.json';

let native = false;
vi.mock('../src/app/native', () => ({ isNativeApp: () => native, nativePlatform: () => (native ? 'android' : 'web') }));
const push = await import('../src/app/push');
const src = (p) => readFileSync(join(__dirname, '..', p), 'utf8');

const store = new Map();
beforeEach(() => {
  store.clear();
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
});
afterEach(() => { settings.enabled = false; native = false; });

describe('push notifications', () => {
  it('are off in the repository: nothing is asked, on the website or in the apps', () => {
    expect(settings.enabled).toBe(false);
    native = true;
    expect(push.pushOn()).toBe(false);
    push.raceFinished();
    expect(push.shouldAsk()).toBe(false);
  });
  it('when on: never on the website; in the apps only after the first finished race, and only once', () => {
    settings.enabled = true;
    expect(push.pushOn()).toBe(false); // (website)
    native = true;
    expect(push.shouldAsk()).toBe(false); // (first launch: no race yet)
    push.raceFinished();
    expect(push.shouldAsk()).toBe(true);
    push.markAsked('no');
    expect(push.shouldAsk()).toBe(false);
    expect(JSON.parse(store.get('marble-push')).answer).toBe('no');
  });
  it('the question sits under every race result, the switches in Settings, the invites in the room', () => {
    expect(src('src/components/NextRace.jsx')).toMatch(/<PushAsk \/>/);
    expect(src('src/site/pages/SettingsPage.jsx')).toMatch(/<PushSettings \/>/);
    const ui = src('src/site/account/PushSettings.jsx');
    expect(ui).toMatch(/const canNews = user && !user\.is_guest;/);
    expect(ui).toMatch(/useState\(false\);\n {2}const \[busy/); // (season news unticked by default)
    expect(src('src/site/pages/RoomPage.jsx')).toMatch(/<PushInvites code=\{code\} \/>/);
    expect(src('src/context/AuthContext.jsx')).toMatch(/forgetPush\(\);\n\s+storeToken\(null\);/);
    expect(src('src/site/consent/consent.js')).toMatch(/name: 'marble-push'/);
  });
  it('renders nothing while off', async () => {
    vi.doMock('../src/context/AuthContext', () => ({ useAuth: () => ({ user: { is_guest: false } }) }));
    const { PushAsk, PushSettings } = await import('../src/site/account/PushSettings');
    expect(renderToString(<MemoryRouter><PushAsk /><PushSettings /></MemoryRouter>)).toBe('');
  });
  it('the native projects: the plugin in both apps, APNs entitlement and token hand-over, Android icon and channel', () => {
    expect(src('android/app/capacitor.build.gradle')).toMatch(/capacitor-push-notifications/);
    const pkg = src('ios/App/CapApp-SPM/Package.swift');
    expect(pkg).toMatch(/CapacitorPushNotifications/);
    expect(pkg).toMatch(/CapgoNativePurchases/); // (the iPhone app's purchases need it too)
    expect(src('ios/App/App/App.entitlements')).toMatch(/<key>aps-environment<\/key>/);
    expect(src('ios/App/App.xcodeproj/project.pbxproj').match(/CODE_SIGN_ENTITLEMENTS = App\/App\.entitlements;/g)).toHaveLength(2);
    const d = src('ios/App/App/AppDelegate.swift');
    expect(d).toMatch(/capacitorDidRegisterForRemoteNotifications/);
    expect(d).toMatch(/capacitorDidFailToRegisterForRemoteNotifications/);
    const m = src('android/app/src/main/AndroidManifest.xml');
    expect(m).toMatch(/default_notification_icon" android:resource="@drawable\/ic_stat_marble"/);
    expect(m).toMatch(/default_notification_channel_id" android:value="friends"/);
    expect(JSON.parse(src('capacitor.config.json')).plugins.PushNotifications.presentationOptions).toContain('alert');
    // (No google-services.json in the repository: Moses adds Firebase's file when the project exists.)
    expect(src('android/app/build.gradle')).toMatch(/google-services\.json/);
  });
});
