// The apps' sound after Moses's Android test of 7 Nov 2026 (build 1.0.0 (2), a Samsung): the countdown beeps
// about 30 s into the race, and no hit sounds. A fake of the Android player as @capacitor-community/native-audio
// drives it (each file prepared in a MediaPlayer, slowly when many load at once; play() seeks first and only
// starts once the seek is done; stop() does nothing while it is still seeking).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNativeBackend } from '../src/sound/nativeBackend';

const T0 = 1_000_000;

/** The Android player: `prepareMs(name, atOnce)` per file; `seekMs` before a play starts; stop ignored while seeking. */
function androidPlayer({ prepareMs = () => 100, seekMs = 80 } = {}) {
  const log = [];
  const players = new Map(); // name → { state: 'idle' | 'seeking' | 'playing', playedAt }
  let preparing = 0;
  const plugin = {
    configure: async () => {},
    preload: ({ assetId }) => {
      preparing += 1;
      const atOnce = preparing;
      log.push(['preload', assetId, atOnce]);
      return new Promise((ok) => setTimeout(() => { preparing -= 1; players.set(assetId, { state: 'idle' }); ok(); }, prepareMs(assetId, atOnce)));
    },
    getDuration: async () => ({ duration: 4.05 }),
    play: ({ assetId, time }) => {
      const p = players.get(assetId);
      p.state = 'seeking';
      log.push(['play', assetId, Date.now(), time]);
      return new Promise((ok) => setTimeout(() => { if (p.state === 'seeking') { p.state = 'playing'; p.playedAt = Date.now(); } ok(); }, seekMs));
    },
    stop: async ({ assetId }) => {
      const p = players.get(assetId);
      log.push(['stop', assetId, Date.now(), p?.state]);
      if (p?.state === 'playing') p.state = 'idle'; // (MediaPlayer: only while playing)
    },
    loop: async () => {},
    pause: async () => {},
    setVolume: async () => {},
    getCurrentTime: async () => ({ currentTime: 0 }),
    addListener: () => {},
  };
  return { plugin, log, players };
}

describe('the apps: the native player on a slow Android phone', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(T0); });
  afterEach(() => { vi.useRealTimers(); });

  it('loads a few files at a time, the start and the hit sounds first', async () => {
    const { plugin, log } = androidPlayer({ prepareMs: () => 300 });
    const b = createNativeBackend({ plugin });
    for (const n of ['tune-3', 'tune-4', 'ceremony', 'crowd-grand-prix', 'marble-hit', 'marble-bump', 'start-beeps', 'start-rolling']) b.load(n);
    await vi.advanceTimersByTimeAsync(5000);
    const order = log.filter(([k]) => k === 'preload').map(([, n]) => n);
    expect(Math.max(...log.filter(([k]) => k === 'preload').map(([, , atOnce]) => atOnce))).toBeLessThanOrEqual(2);
    // (The first two asked for started at once; then the urgent ones before the tunes and the ceremony.)
    expect(order.slice(2, 6).sort()).toEqual(['marble-bump', 'marble-hit', 'start-beeps', 'start-rolling']);
    expect(order.slice(6).sort()).toEqual(['ceremony', 'crowd-grand-prix']);
  });

  it('a hit sound that takes longer than the load timeout still works once it arrives', async () => {
    const { plugin, log } = androidPlayer({ prepareMs: (n) => (n === 'marble-hit' ? 12_000 : 100) });
    const b = createNativeBackend({ plugin });
    const p = b.load('marble-hit');
    await vi.advanceTimersByTimeAsync(8_100);
    expect(await p).toBe(false);
    expect(b.loaded('marble-hit')).toBe(false);
    expect(b.failed()).toEqual(['marble-hit']);
    await vi.advanceTimersByTimeAsync(4_100);
    expect(b.loaded('marble-hit')).toBe(true); // (before 7 Nov 2026: lost for the whole visit, no hit sounds)
    expect(b.failed()).toEqual([]);
    b.start('marble-hit', { atWall: Date.now() });
    await vi.advanceTimersByTimeAsync(200);
    expect(log.filter(([k]) => k === 'play').length).toBe(1);
  });

  it('beeps whose file arrives after their time are never played late', async () => {
    const { plugin, log } = androidPlayer({ prepareMs: (n) => (n === 'start-beeps' ? 30_000 : 100) });
    const b = createNativeBackend({ plugin });
    b.load('start-beeps');
    const go = Date.now() + 6000;
    b.start('start-beeps', { atWall: go - 3023, until: go + 900 });
    await vi.advanceTimersByTimeAsync(31_000);
    expect(b.loaded('start-beeps')).toBe(true);
    expect(log.filter(([k]) => k === 'play')).toEqual([]);
  });

  it('a voice stopped while the player is still seeking is stopped once it starts', async () => {
    const { plugin, players } = androidPlayer({ seekMs: 300 });
    const b = createNativeBackend({ plugin });
    b.load('start-beeps');
    await vi.advanceTimersByTimeAsync(200);
    const v = b.start('start-beeps', { atWall: Date.now() });
    await vi.advanceTimersByTimeAsync(20); // (play() called; the player still seeking)
    v.stop(0);
    await vi.advanceTimersByTimeAsync(600);
    expect(players.get('start-beeps').state).toBe('idle');
  });
});

describe('the engine: no countdown after GO as shown', () => {
  let engine;
  let calls;
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    globalThis.window = { addEventListener() {} };
    engine = await import('../src/sound/engine');
    engine.setSettings({ music: 0.7, effects: 0.8, muted: false });
    const a = androidPlayer();
    calls = a.log;
    engine.useNativeAudio(a.plugin);
    const ready = engine.whenSoundReady('android-2', 6000);
    await vi.advanceTimersByTimeAsync(3000);
    await ready;
  });
  afterEach(() => { vi.useRealTimers(); delete globalThis.window; });

  it('beeps planned for a later GO than the one shown are dropped when the race as shown reaches GO', async () => {
    // (A slow phone: the sound timed 42 s ahead, while the picture could only be held 12 s: GO shown at +12 s.)
    engine.raceCountdown('android-2', 42_000);
    await vi.advanceTimersByTimeAsync(12_000);
    engine.raceGo('android-2', Date.now());
    expect(engine.soundReport('android-2')).toMatchObject({ beeps: 'dropped', goGapMs: -30_000 });
    await vi.advanceTimersByTimeAsync(35_000);
    expect(calls.filter(([k, n]) => k === 'play' && n === 'start-beeps')).toEqual([]);
  });

  it('beeps on time play before GO, and the report says so', async () => {
    const t = Date.now();
    engine.raceCountdown('android-2', 5000);
    await vi.advanceTimersByTimeAsync(5000);
    engine.raceGo('android-2', Date.now());
    const plays = calls.filter(([k, n]) => k === 'play' && n === 'start-beeps');
    expect(plays.length).toBe(1);
    expect(plays[0][2]).toBeLessThan(t + 5000 - 2900); // (the first beep about 3 s before GO)
    expect(plays[0][2]).toBeGreaterThan(t + 5000 - 3200);
    expect(engine.soundReport('android-2')).toMatchObject({ beeps: 'scheduled', goGapMs: 0, backend: 'native' });
  });
});
