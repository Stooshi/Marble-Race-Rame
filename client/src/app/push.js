/**
 * Push notifications in the iPhone and Android apps (app plan step 5; the server side is src/push).
 *
 * Switched off until src/shared/push.json says enabled. Then, in the apps only:
 *   - we never ask at first launch: after the player's first finished race (push.json
 *     askAfterRaces) the results show our own short question first (PushAsk.jsx); only if they say
 *     yes does the phone's own permission dialog appear;
 *   - with permission, the phone's token is sent to the server for this account (again at each
 *     start, as tokens change), and forgotten on log out;
 *   - tapping a notification opens its page (a friend room, the pass, home).
 * The website never asks (browsers' web push isn't used).
 */
import settings from '../shared/push.json';
import { isNativeApp, nativePlatform } from './native';
import { api, getStoredToken } from '../api/client';

const KEY = 'marble-push';
const CHANNELS = [
  { id: 'friends', name: 'Friend room invites', description: 'When a friend invites you to race in their room', importance: 4 },
  { id: 'news', name: 'Season news', description: 'A new season starting, the season pass on sale', importance: 3 },
  { id: 'reminders', name: 'Daily goal reminder', description: 'Your daily goal, if you turned the reminder on', importance: 3 },
];

export const pushOn = () => settings.enabled === true && isNativeApp();

const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } };
const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify({ ...read(), ...v })); } catch { /* (private mode) */ } };

// (The plugin's module, not the plugin: a Capacitor plugin answers `then` too, so an async function
// returning it never resolves to it. Callers use `(await Push()).PushNotifications`.)
let mod = null;
async function Push() {
  if (!mod) mod = await import('@capacitor/push-notifications');
  return mod;
}

/** A race finished on this phone (counted for "ask after the first race"). */
export function raceFinished() {
  if (!pushOn()) return;
  write({ races: (read().races ?? 0) + 1 });
}

/** Whether to show our question now: in the apps, after the first finished race, never asked before. */
export function shouldAsk() {
  if (!pushOn()) return false;
  const s = read();
  return !s.asked && (s.races ?? 0) >= (settings.askAfterRaces ?? 1);
}

export const markAsked = (answer) => write({ asked: new Date().toISOString(), answer });

/** The phone's permission: 'granted' | 'denied' | 'prompt' | 'unavailable'. */
export async function permission() {
  if (!pushOn()) return 'unavailable';
  try { return (await (await Push()).PushNotifications.checkPermissions()).receive; } catch { return 'unavailable'; }
}

let listening = false;
let lastToken = null;
async function listen(navigate) {
  if (listening) return;
  listening = true;
  const P = (await Push()).PushNotifications;
  await P.addListener('registration', async ({ value }) => {
    lastToken = value;
    write({ token: value });
    if (!getStoredToken()) return;
    let appId = null;
    let appVersion = null;
    try { const info = await (await import('@capacitor/app')).App.getInfo(); appId = info.id; appVersion = info.version; } catch { /* (older shells) */ }
    api.pushRegister({ token: value, platform: nativePlatform(), ...(appId && { appId }), ...(appVersion && { appVersion }) }).catch(() => {});
  });
  await P.addListener('registrationError', (e) => console.warn('[push] registration failed', e?.error));
  await P.addListener('pushNotificationActionPerformed', ({ notification }) => {
    const url = notification?.data?.url;
    if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')) navigate?.(url);
  });
  if (nativePlatform() === 'android') for (const c of CHANNELS) await P.createChannel(c).catch(() => {});
}

/** At app start (logged in): if permission was given before, register again (tokens change). */
export async function startPush({ navigate } = {}) {
  if (!pushOn() || !getStoredToken()) return;
  if ((await permission()) !== 'granted') return;
  await listen(navigate);
  await (await Push()).PushNotifications.register().catch(() => {});
}

/** The player said yes: the phone's own dialog, then registration. → the permission it ends with. */
export async function enablePush({ navigate } = {}) {
  if (!pushOn()) return 'unavailable';
  const P = (await Push()).PushNotifications;
  let state = (await P.checkPermissions()).receive;
  if (state === 'prompt' || state === 'prompt-with-rationale') state = (await P.requestPermissions()).receive;
  if (state === 'granted') {
    await listen(navigate);
    await P.register();
  }
  return state;
}

/** Logging out on this phone: the server stops sending this account's messages here. */
export async function forgetPush() {
  const token = lastToken || read().token;
  if (!pushOn() || !token || !getStoredToken()) return;
  await api.pushForget(token).catch(() => {});
}
