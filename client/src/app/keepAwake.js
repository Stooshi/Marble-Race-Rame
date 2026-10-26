/**
 * Keeping the screen on while a race is on screen (Moses, 26 Oct 2026: the Android screen dimmed and
 * slept while he watched a race). From the start show or the countdown until the results board, and
 * never otherwise: released on the board, on leaving the race and while the app or tab is in the
 * background; taken again when it comes back, if a race is still on screen.
 *   - In the apps (Android, later iPhone): the system's own keep-screen-on, through the Capacitor plugin
 *     @capacitor-community/keep-awake (Android's FLAG_KEEP_SCREEN_ON, iOS's idle timer).
 *   - On the website: the Screen Wake Lock API (navigator.wakeLock), asked for again each time the tab
 *     becomes visible (the browser drops it when the tab is hidden). A browser without it: nothing
 *     happens (no errors, no fallback tricks).
 * Several holders may overlap (a race page handing over to the next race): the screen stays on while
 * any holds it. `useKeepAwake(on)` is the React side.
 */
import { useEffect } from 'react';
import { isNativeApp } from './native';

let holders = 0;
let sentinel = null;   // the website's wake lock, while held
let nativeOn = false;  // the app's keep-screen-on, while set
let queue = Promise.resolve();
let listening = false;
let hiddenApp = false; // the app in the background (Capacitor's appStateChange), besides document.hidden

// (Swappable in tests: the plugin, the document and the navigator.)
const env = {
  native: () => isNativeApp(),
  plugin: () => import('@capacitor-community/keep-awake').then((m) => m.KeepAwake),
  doc: () => (typeof document === 'undefined' ? null : document),
  nav: () => (typeof navigator === 'undefined' ? null : navigator),
};

const defaults = { ...env };

const shown = () => !hiddenApp && env.doc()?.visibilityState !== 'hidden';

/** Brings the screen's state in line with what is wanted now (one change at a time, in order). */
function settle() {
  queue = queue.then(apply, apply);
  return queue;
}

async function apply() {
  const want = holders > 0 && shown();
  if (env.native()) {
    if (want === nativeOn) return;
    try {
      const plugin = await env.plugin();
      if (want) await plugin.keepAwake();
      else await plugin.allowSleep();
      nativeOn = want;
    } catch { /* (the plugin missing in an older app build: the screen behaves as before) */ }
    return;
  }
  if (want && !sentinel) {
    const lock = env.nav()?.wakeLock;
    if (!lock?.request) return; // (not supported: nothing to do)
    try {
      const s = await lock.request('screen');
      // Let go meanwhile (the board came, or the tab was hidden while asking): give it back at once.
      if (!(holders > 0 && shown())) { await s.release().catch(() => {}); return; }
      sentinel = s;
      s.addEventListener?.('release', () => { if (sentinel === s) sentinel = null; });
    } catch { /* (refused: a hidden tab, battery saver, a permissions policy) */ }
  } else if (!want && sentinel) {
    const s = sentinel;
    sentinel = null;
    await s.release().catch(() => {});
  }
}

function listen() {
  if (listening) return;
  listening = true;
  env.doc()?.addEventListener?.('visibilitychange', () => settle());
  if (env.native()) {
    import('@capacitor/app').then(({ App }) => App.addListener('appStateChange', ({ isActive }) => { hiddenApp = !isActive; settle(); })).catch(() => {});
  }
}

/** Keeps the screen on until the returned function is called (once; further calls do nothing). */
export function holdAwake() {
  holders += 1;
  listen();
  settle();
  let done = false;
  return () => {
    if (done) return;
    done = true;
    holders -= 1;
    settle();
  };
}

/** React: the screen stays on while `on` is true and the component is mounted. */
export function useKeepAwake(on) {
  useEffect(() => (on ? holdAwake() : undefined), [on]);
}

/** For tests: the state, a fresh start, and stand-ins for the plugin, document and navigator. */
export const keepAwakeForTests = {
  state: () => ({ holders, held: Boolean(sentinel) || nativeOn, web: Boolean(sentinel), native: nativeOn }),
  settled: () => queue,
  appState(isActive) { hiddenApp = !isActive; return settle(); },
  reset(overrides = {}) {
    holders = 0; sentinel = null; nativeOn = false; listening = false; hiddenApp = false; queue = Promise.resolve();
    Object.assign(env, defaults, overrides);
  },
};
