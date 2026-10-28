import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { api } from '../api/client';
import { prepare, setSettings, unlock } from './engine';

/**
 * The player's sound settings (Moses, 28 Oct 2026: no volume controls anywhere; players use the device's
 * own volume): `muted` (the speaker button) and `music` (Settings → "Game music", on or off). The levels
 * are fixed (engine.js levels(): the music under the effects as before). Remembered on the device and,
 * when signed in, in the account (so they follow the player to another device); the account's settings
 * win when the player signs in. Volumes saved before (numbers from the old sliders) are read once as
 * "music on unless it was at 0" and written back without them.
 */
const KEY = 'marble-sound';
const MUSIC_LEVEL = 0.7;   // (fixed: the engine mixes the music under the effects)
const EFFECTS_LEVEL = 0.8;
const listeners = new Set();
let current = { muted: false, music: true };

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { return null; }
}
function write(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* (private mode) */ }
}
/** { muted, music } from anything saved before: the old { music: 0.6, effects: 0.8, muted } too. */
export function clean(s) {
  const music = typeof s?.music === 'boolean' ? s.music : typeof s?.music === 'number' ? s.music > 0 : current.music;
  return { muted: typeof s?.muted === 'boolean' ? s.muted : current.muted, music };
}
/** What the engine plays at: fixed levels, music off when switched off. */
export const engineSettings = (s) => ({ music: s.music ? MUSIC_LEVEL : 0, effects: EFFECTS_LEVEL, muted: s.muted });
function apply(s) {
  current = clean(s);
  setSettings(engineSettings(current));
  write(current);
  for (const l of listeners) l();
}

// On load: this device's settings (old volume numbers dropped from storage).
const saved = read();
if (saved) apply(saved); else setSettings(engineSettings(current));

/**
 * Starts sound on the first tap, click or key anywhere (browsers allow sound only then).
 * Call once at the app's root.
 */
/**
 * The race's sound loaded into memory early (Moses, 28 Oct 2026): from when the player opens the
 * starting line, a room, Quick race or League Night (not during the countdown). Safe to use anywhere.
 */
export function useRaceSoundPreload(on = true) {
  useEffect(() => { if (on) prepare(); }, [on]);
}

export function useSoundUnlock(paused = false) {
  useEffect(() => {
    if (paused) return undefined;
    // Every tap: starts the sound the first time (Safari's rule), and afterwards resumes it if Safari
    // suspended it meanwhile (a call, another app's sound). (Cheap: nothing to do while it runs.)
    const go = () => unlock();
    const EVENTS = ['pointerup', 'touchend', 'click', 'keydown'];
    for (const e of EVENTS) window.addEventListener(e, go, true);
    return () => { for (const e of EVENTS) window.removeEventListener(e, go, true); };
  }, [paused]);
}

/** { settings: { muted, music }, update(patch) } for the speaker button and Settings; `user` from the auth context. */
export function useSoundSettings(user) {
  const settings = useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => current, () => current);
  // Signing in: the account's settings (if it has any).
  const adopted = useRef(null);
  useEffect(() => {
    if (!user?.id || adopted.current === user.id) return;
    adopted.current = user.id;
    const had = user.settings?.sound;
    if (had) {
      apply({ ...current, ...had });
      // (Old volume numbers saved with the account: written back without them.)
      if (typeof had.music === 'number' || 'effects' in had) api.saveSettings({ sound: current }).catch(() => {});
    }
  }, [user?.id, user?.settings?.sound]);
  const timer = useRef(null);
  const update = useCallback((patch) => {
    apply({ ...current, ...patch });
    if (!user?.id) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => api.saveSettings({ sound: current }).catch(() => {}), 800);
  }, [user?.id]);
  return { settings, update };
}
