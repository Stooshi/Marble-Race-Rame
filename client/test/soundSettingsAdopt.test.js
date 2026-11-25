// Moses, 18 Nov 2026: Android build 7 raced muted (readiness: "native · muted") while the speaker button showed
// sound on, and toggling it didn't help. Each speaker button took the account's saved settings when it mounted, from
// the user object loaded at start-up; the phone menu's button mounts afresh every time the menu opens, so a mute
// undone on the device came back from the account. Now the account's settings are taken once per sign-in.
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The hook called as a plain function: each call is a fresh mount (effects run at once).
vi.mock('react', () => ({
  useEffect: (f) => { f(); },
  useRef: (v) => ({ current: v }),
  useCallback: (f) => f,
  useSyncExternalStore: (_s, get) => get(),
}));
const saved = [];
vi.mock('../src/api/client', () => ({ api: { saveSettings: (b) => { saved.push(b); return Promise.resolve({}); } } }));
const engine = { muted: null };
vi.mock('../src/sound/engine', () => ({ setSettings: (s) => { engine.muted = s.muted; }, prepare: () => {}, unlock: () => {} }));

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { useSoundSettings, _resetAdopted } = await import('../src/sound/settings');

describe("the account's sound settings", () => {
  beforeEach(() => { _resetAdopted(); saved.length = 0; });

  it('are taken once when the player signs in; a change on the device then stands through new menus and pages', async () => {
    vi.useFakeTimers();
    // Start-up: the account says muted (the user object as loaded then, never refreshed).
    const user = { id: 'u1', settings: { sound: { muted: true, music: true } } };
    useSoundSettings(user); // (the header's button)
    expect(useSoundSettings(user).settings.muted).toBe(true);
    expect(engine.muted).toBe(true);
    // The player turns the sound on from the phone menu.
    const menu = useSoundSettings(user);
    menu.update({ muted: false });
    expect(engine.muted).toBe(false);
    // The menu opens again, a page with the button opens: the stale account value must not come back.
    for (let k = 0; k < 3; k += 1) expect(useSoundSettings(user).settings.muted).toBe(false);
    expect(engine.muted).toBe(false);
    // And the change is saved to the account.
    await vi.advanceTimersByTimeAsync(900);
    expect(saved.at(-1)).toEqual({ sound: { muted: false, music: true } });
    vi.useRealTimers();
  });

  it("another account signing in brings that account's settings", () => {
    useSoundSettings({ id: 'u1', settings: { sound: { muted: false, music: true } } });
    expect(engine.muted).toBe(false);
    useSoundSettings(null); // (signed out)
    useSoundSettings({ id: 'u2', settings: { sound: { muted: true, music: true } } });
    expect(engine.muted).toBe(true);
  });
});
