// Moses's Android build 1.0.0 (6), 18 Nov 2026: no sound at all in races (build 5 had it). The only change to the
// sound between the two builds was the race tunes' round of 12 kept on the device (marble-tunes, 16 Nov 2026). This
// drives the whole engine on a fake native player through four app starts (a new engine each time, the saved
// round in local storage), three races each: every race plays its beeps and a tune, and the report says it is not muted.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const T0 = 1_000_000;
function plug() {
  const log = [];
  const p = {
    configure: async () => {}, preload: async ({ assetId }) => { log.push(['preload', assetId]); },
    getDuration: async () => ({ duration: 30 }), play: async ({ assetId }) => { log.push(['play', assetId]); },
    stop: async () => {}, loop: async () => {}, pause: async () => {}, resume: async () => {}, setVolume: async () => {},
    getCurrentTime: async () => ({ currentTime: 0 }), addListener: () => {}, unload: async () => {},
  };
  return { p, log };
}
describe('the apps: races after app restarts with a saved round of tunes', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(T0); });
  afterEach(() => vi.useRealTimers());
  it('every race still plays its beeps and its tune', async () => {
    const store = new Map();
    globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
    for (let run = 0; run < 4; run += 1) {
      vi.resetModules();
      const s = await import('../src/sound/engine');
      const { p, log } = plug();
      s.useNativeAudio(p);
      for (let r = 0; r < 3; r += 1) {
        const id = `race-${run}-${r}`;
        await s.whenSoundReady(id, 3000);
        s.raceCountdown(id, 4000);
        await vi.advanceTimersByTimeAsync(4500);
        s.raceGo(id, null);
        await vi.advanceTimersByTimeAsync(2000);
        s.raceCeremony(id); s.closeCeremony(id);
        await vi.advanceTimersByTimeAsync(500);
      }
      const plays = log.filter(([k]) => k === 'play').map(([, n]) => n);
      expect(JSON.parse(store.get('marble-tunes')).order.length).toBeGreaterThan(0);
      expect(s.soundReport().muted).toBe(false);
      expect(s.soundReport().backend).toBe('native');
      expect(plays.filter((n) => n.startsWith('tune-')).length).toBeGreaterThan(0);
      expect(plays.filter((n) => n === 'start-beeps').length).toBe(3);
      expect(plays.filter((n) => n.startsWith('tune-')).length).toBeGreaterThanOrEqual(3);
    }
  });
});

// Moses, 18 Nov 2026: build 6's solo races reported beeps "none" with nothing missing. The report now says why.
describe('the readiness report says why a race had no beeps', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(T0); });
  afterEach(() => vi.useRealTimers());
  const engine = async () => {
    vi.resetModules();
    globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    const s = await import('../src/sound/engine');
    s.useNativeAudio(plug().p);
    return s;
  };
  it('a countdown heard: scheduled', async () => {
    const s = await engine();
    s.raceCountdown('r1', 4000);
    expect(s.soundReport('r1').beeps).toBe('scheduled');
  });
  it('muted: none: muted', async () => {
    const s = await engine();
    s.setSettings({ muted: true });
    s.raceCountdown('r1', 4000);
    expect(s.soundReport('r1').beeps).toBe('none: muted');
  });
  it('the countdown already over when it reached the sound: none: countdown N ms', async () => {
    const s = await engine();
    s.raceCountdown('r1', 100);
    expect(s.soundReport('r1').beeps).toBe('none: countdown 100 ms');
  });
  it('GO with no countdown before it, or none at all: none: no countdown', async () => {
    const s = await engine();
    expect(s.soundReport('r1').beeps).toBe('none: no countdown');
    s.raceGo('r1', T0);
    expect(s.soundReport('r1').beeps).toBe('none: no countdown');
    expect(s.soundReport('r2').beeps).toBe('none: another race');
  });
});

describe('the sound log kept for the readiness report', () => {
  it('keeps the last 40 "[sound]" lines with their time', async () => {
    vi.resetModules();
    const { soundLog, recentSoundLog } = await import('../src/sound/soundLog');
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    for (let k = 0; k < 45; k += 1) soundLog(`line ${k}`, { n: k });
    expect(recentSoundLog()).toHaveLength(40);
    expect(recentSoundLog().at(-1)).toMatch(/^\d+\.\d line 44 \{"n":44\}$/);
    expect(info).toHaveBeenCalledWith('[sound]', 'line 0', { n: 0 });
    info.mockRestore();
  });
});
