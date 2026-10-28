import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { api } from '../api/client';
import { getSettings, prepare, setSettings, unlock } from './engine';

/**
 * The player's sound settings (music and effects volume, mute), remembered on the
 * device and, when signed in, in their account (so they follow them to another
 * device). The account's settings win when the player signs in.
 */
const KEY = 'marble-sound';
const listeners = new Set();
let current = getSettings();

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { return null; }
}
function write(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* (private mode) */ }
}
function clean(s) {
  const level = (v, d) => (typeof v === 'number' && v >= 0 && v <= 1 ? v : d);
  return { music: level(s?.music, current.music), effects: level(s?.effects, current.effects), muted: typeof s?.muted === 'boolean' ? s.muted : current.muted };
}
function apply(s) {
  current = clean(s);
  setSettings(current);
  write(current);
  for (const l of listeners) l();
}

// On load: this device's settings.
const saved = read();
if (saved) { current = clean(saved); setSettings(current); }

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

/** { settings, update(patch) } for the sound controls; `user` from the auth context. */
export function useSoundSettings(user) {
  const settings = useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => current, () => current);
  // Signing in: the account's settings (if it has any).
  const adopted = useRef(null);
  useEffect(() => {
    if (!user?.id || adopted.current === user.id) return;
    adopted.current = user.id;
    if (user.settings?.sound) apply({ ...current, ...user.settings.sound });
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
