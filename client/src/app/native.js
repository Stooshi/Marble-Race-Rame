/**
 * The iPhone and Android apps (Capacitor): the native touches around the website.
 *   - the splash screen hides as soon as the game has drawn its first screen;
 *   - the status bar: light icons over the game's night blue, the page drawn under it
 *     (the header already keeps clear of it with the safe-area insets);
 *   - Android's back button goes back a page, and leaves the app from the home screen;
 *   - sound pauses while the app is in the background.
 * On the website none of this loads: the plugins are fetched only inside the apps.
 */
export const isNativeApp = () => typeof window !== 'undefined' && Boolean(window.Capacitor?.isNativePlatform?.());
export const nativePlatform = () => (isNativeApp() ? window.Capacitor.getPlatform() : 'web');

let started = false;

/** Call once, after the first render. `navigate(-1)` goes back; `atHome()` says whether we're on the first screen. */
export async function startNativeShell({ goBack, atHome } = {}) {
  if (!isNativeApp() || started) return;
  started = true;
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
