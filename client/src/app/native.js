/**
 * The iPhone and Android apps (Capacitor): the native touches around the website.
 *   - the splash screen hides as soon as the game has drawn its first screen;
 *   - the status bar: light icons over the game's night blue, the page drawn under it
 *     (the header already keeps clear of it with the safe-area insets);
 *   - Android's back button goes back a page, and leaves the app from the home screen;
 *   - sound pauses while the app is in the background;
 *   - iPhone: the silent switch mutes the game's music and sounds, and the player's own music
 *     (Spotify, Apple Music…) keeps playing under the game (an "ambient" audio session; the app
 *     sets the same in ios/App/App/AppDelegate.swift).
 *   - app links: a marblespins.com link to a league, room, track, result, certificate or the
 *     scoreboards opens that page in the app (client/app-links.json; `linkPath`).
 * On the website none of this loads: the plugins are fetched only inside the apps.
 */
import appLinks from '../../app-links.json';
export const isNativeApp = () => typeof window !== 'undefined' && Boolean(window.Capacitor?.isNativePlatform?.());
export const nativePlatform = () => (isNativeApp() ? window.Capacitor.getPlatform() : 'web');

let started = false;

/**
 * The app's page for an opened link (https://marblespins.com/l/K7QF2M → "/l/K7QF2M"), or null for a
 * link the app doesn't open (another site, the shop, checkout…: those stay on the website).
 */
export function linkPath(url, cfg = appLinks) {
  let u;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== 'https:' || !cfg.hosts.includes(u.hostname)) return null;
  const ok = cfg.paths.some((p) => (p.endsWith('/') ? u.pathname.startsWith(p) && u.pathname.length > p.length : u.pathname === p || u.pathname.startsWith(`${p}/`)));
  return ok ? `${u.pathname}${u.search}${u.hash}` : null;
}

/**
 * iPhone app: ask WebKit for an "ambient" audio session (iOS 17+: navigator.audioSession), so the
 * silent switch mutes the game and other apps' music keeps playing. Must run before the first
 * sound starts. → whether it was set.
 */
export function preferAmbientAudio(nav = typeof navigator !== 'undefined' ? navigator : null, platform = nativePlatform()) {
  if (platform !== 'ios' || !nav?.audioSession) return false;
  try { nav.audioSession.type = 'ambient'; return true; } catch { return false; }
}

/** The apps' sound through @capacitor-community/native-audio, when this build has it. → whether it does. */
export async function startNativeAudio(sound, { available = null, load = () => import('@capacitor-community/native-audio') } = {}) {
  try {
    const has = available ?? (await import('@capacitor/core')).Capacitor.isPluginAvailable('NativeAudio');
    if (!has) { console.warn('[sound] the NativeAudio plugin is NOT in this app build: web audio instead (run npm install, then npm run app:sync)'); return false; }
    // (Destructured here: a plugin proxy answers `then`, so it is never what a promise resolves to.)
    const { NativeAudio } = await load();
    sound.useNativeAudio(NativeAudio);
    return true;
  } catch (err) {
    console.warn('[sound] native audio unavailable', err?.message ?? err);
    return false;
  }
}

/** Call once, after the first render. `navigate(-1)` goes back; `atHome()` says whether we're on the first screen; `open(path)` opens a page (app links). */
export async function startNativeShell({ goBack, atHome, open } = {}) {
  if (!isNativeApp() || started) return;
  started = true;
  preferAmbientAudio();
  document.documentElement.classList.add('is-app', `is-${nativePlatform()}`);
  const [{ SplashScreen }, { StatusBar, Style }, { App }, sound] = await Promise.all([
    import('@capacitor/splash-screen'),
    import('@capacitor/status-bar'),
    import('@capacitor/app'),
    import('../sound/engine'),
  ]);
  try {
    await StatusBar.setStyle({ style: Style.Dark }); // (light icons, for the dark game)
    if (nativePlatform() === 'android') {
      await StatusBar.setOverlaysWebView({ overlay: true });
      await StatusBar.setBackgroundColor({ color: '#00000000' });
    }
  } catch { /* (an older phone without these options) */ }
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack && !atHome?.()) goBack?.();
    else App.exitApp();
  });
  App.addListener('appStateChange', ({ isActive }) => sound.setBackground(!isActive));
  // The game's sound through the native audio plugin (Moses, 28 Oct 2026), like a normal game: preloaded
  // into memory, no tap needed, exact timing. (An older app build without it: the website's Web Audio.)
  await startNativeAudio(sound);
  // App links: a link tapped while the app runs, and the one that started it (each opened once).
  let last = null;
  const follow = (url) => {
    const to = linkPath(url);
    if (!to || to === last) return;
    last = to;
    console.info('[app-links] open', to);
    open?.(to);
  };
  App.addListener('appUrlOpen', ({ url }) => follow(url));
  App.getLaunchUrl?.().then((r) => r?.url && follow(r.url)).catch(() => {});
  // Two frames after the first render, so the game is on screen when the splash goes.
  requestAnimationFrame(() => requestAnimationFrame(() => SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => {})));
}

/** Network status: the app's own (more reliable on phones), the browser's otherwise. `onChange(online)`. */
export async function watchNetwork(onChange) {
  if (isNativeApp()) {
    const { Network } = await import('@capacitor/network');
    const status = await Network.getStatus();
    onChange(status.connected);
    const handle = await Network.addListener('networkStatusChange', (s) => onChange(s.connected));
    return () => handle.remove();
  }
  const update = () => onChange(navigator.onLine !== false);
  update();
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
}
