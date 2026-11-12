// Moses's Android test of 12 Nov 2026 (build 1.0.0 (4), Galaxy A12, Android 12): no collision clicks or bumps
// (the whoosh played), and the ceremony song playing on through the starting line, the countdown and the next
// race. A fake of the Android player as @capacitor-community/native-audio 8 really is (its Java read through):
// play() and loop() run on the UI thread and play() answers before its seek is done; the sound starts only once
// the seek completes; stop() does nothing unless it is already playing; one MediaPlayer per file.
// Slowed down like the A12 under a race (the UI thread busy, seeks slow).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const T0 = 1_000_000;
const LENGTHS = { 'marble-hit': 0.118, 'marble-bump': 0.144, 'speed-pad': 2.2, ceremony: 40, 'start-beeps': 4.05, 'start-rolling': 2, 'crowd-grand-prix': 3 };

function androidPlayer({ uiMs = 120, seekMs = 450 } = {}) {
  const players = new Map();
  const log = [];
  const listeners = {};
  const get = (id) => players.get(id);
  const ui = (f) => new Promise((ok) => setTimeout(() => ok(f()), uiMs)); // (runOnUiThread, the thread busy)
  const plugin = {
    configure: async () => {},
    preload: ({ assetId }) => new Promise((ok) => setTimeout(() => { players.set(assetId, { state: 'INVALID', playing: false, looping: false, vol: 1, startedAt: 0, from: 0 }); ok(); }, 50)),
    getDuration: async ({ assetId }) => ({ duration: LENGTHS[assetId] ?? 30 }),
    play: ({ assetId, time = 0 }) => ui(() => {
      const p = get(assetId);
      log.push(['play', assetId, Date.now(), time]);
      p.playing = false; // (playing: paused, then seeks)
      p.state = 'PENDING';
      p.looping = false;
      setTimeout(() => { if (p.state === 'PENDING') { p.state = 'PLAYING'; p.playing = true; p.startedAt = Date.now(); p.from = time; } }, seekMs);
    }),
    loop: ({ assetId }) => { ui(() => { get(assetId).looping = true; }); return new Promise(() => {}); }, // (Android never answers it)
    stop: async ({ assetId }) => { const p = get(assetId); log.push(['stop', assetId, Date.now(), p.state]); if (p.playing) { p.playing = false; p.state = 'INVALID'; } },
    pause: async ({ assetId }) => { const p = get(assetId); if (p.playing) { p.playing = false; p.state = 'PAUSE'; } },
    setVolume: async ({ assetId, volume }) => { get(assetId).vol = volume; },
    isPlaying: async ({ assetId }) => ({ isPlaying: Boolean(get(assetId)?.playing) }),
    getCurrentTime: async ({ assetId }) => { const p = get(assetId); return { currentTime: p.playing ? p.from + (Date.now() - p.startedAt) / 1000 : 0 }; },
    addListener: (e, f) => { listeners[e] = f; },
  };
  const timer = setInterval(() => {
    for (const [id, p] of players) {
      if (p.playing && !p.looping && p.from + (Date.now() - p.startedAt) / 1000 >= (LENGTHS[id] ?? 30)) { p.playing = false; p.state = 'INVALID'; listeners.complete?.({ assetId: id }); }
    }
  }, 10);
  // (Heard: playing at a volume above 0.)
  const heard = (id) => Boolean(get(id)?.playing && get(id).vol > 0);
  return { plugin, log, players, heard, plays: (id) => log.filter((l) => l[0] === 'play' && l[1] === id), done: () => clearInterval(timer) };
}

let eng;
let A;
beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
  vi.resetModules();
  eng = await import('../src/sound/engine');
  A = androidPlayer();
  eng.useNativeAudio(A.plugin);
  eng.prepare('race-a');
  await vi.advanceTimersByTimeAsync(4000);
});
afterEach(() => { A.done(); vi.useRealTimers(); });

/** A race on this screen: its countdown, GO, `ms` of racing. */
async function race(id, ms = 10_000) {
  eng.prepare(id);
  eng.raceCountdown(id, 5000);
  await vi.advanceTimersByTimeAsync(5000);
  eng.raceGo(id, Date.now());
  await vi.advanceTimersByTimeAsync(ms);
}

describe('collision clicks and bumps in the apps (Galaxy A12)', () => {
  it('a click plays from its start, although the player takes longer to start than the click lasts', async () => {
    await race('race-a');
    expect(eng.marbleHit('race-a', 0.8)).toBe(true);
    await vi.advanceTimersByTimeAsync(700);
    // (Before 12 Nov 2026: "marble-hit: its time has passed, not played": a 0.12 s click, worked out in step
    // from a player that takes 0.3 s to start, was always over.)
    expect(A.plays('marble-hit')).toEqual([['play', 'marble-hit', expect.any(Number), 0]]);
    expect(eng.marbleBump('race-a', 0.6)).toBe(true);
    await vi.advanceTimersByTimeAsync(700);
    expect(A.plays('marble-bump')).toHaveLength(1);
    expect(A.plays('marble-bump')[0][3]).toBe(0);
  });

  it('clicks one after another each play (the player restarts the file)', async () => {
    await race('race-a');
    for (let k = 0; k < 4; k += 1) {
      eng.marbleHit('race-a', 0.5);
      await vi.advanceTimersByTimeAsync(600); // (the viewer's gate: at most one every 0.5 s)
    }
    expect(A.plays('marble-hit')).toHaveLength(4);
  });

  it('the whoosh starts at its beginning too, not part-way in', async () => {
    await race('race-a');
    eng.speedPad('race-a');
    await vi.advanceTimersByTimeAsync(700);
    expect(A.plays('speed-pad')[0][3]).toBe(0);
  });

  it('a one-shot that could not start within 250 ms of its moment is dropped, never heard late', async () => {
    const { createNativeBackend } = await import('../src/sound/nativeBackend');
    const B = androidPlayer();
    const b = createNativeBackend({ plugin: B.plugin, durations: LENGTHS });
    b.load('marble-hit');
    await vi.advanceTimersByTimeAsync(500);
    b.start('marble-hit', { atWall: Date.now() - 400, asap: true });
    await vi.advanceTimersByTimeAsync(700);
    expect(B.plays('marble-hit')).toHaveLength(0);
    B.done();
  });
});

describe('the ceremony song in the apps (Galaxy A12)', () => {
  async function ceremony() {
    await race('race-a', 30_000);
    eng.raceCeremony('race-a');
    await vi.advanceTimersByTimeAsync(3000);
    expect(A.heard('ceremony')).toBe(true);
  }

  it('stops when the player leaves the race (or closes the celebration)', async () => {
    await ceremony();
    eng.closeCeremony('race-a');
    eng.raceEnd('race-a');
    await vi.advanceTimersByTimeAsync(1500);
    expect(A.heard('ceremony')).toBe(false);
  });

  it('stops on the next countdown, and the old race\'s finish shown late never starts it again', async () => {
    await ceremony();
    eng.prepare('race-b');
    eng.raceCountdown('race-b', 5000);
    await vi.advanceTimersByTimeAsync(300);
    eng.raceCeremony('race-a'); // (the page still showing race A's finish as race B loads)
    await vi.advanceTimersByTimeAsync(4700);
    eng.raceGo('race-b', Date.now());
    for (let s = 0; s < 60; s += 1) {
      await vi.advanceTimersByTimeAsync(1000);
      eng.raceCeremony('race-a');
      expect(A.heard('ceremony')).toBe(false);
    }
    expect(A.heard(eng.nowPlaying()?.name)).toBe(true); // (race B's tune)
  });

  it('a song left alone fades out after 45 s, as on the website', async () => {
    await ceremony();
    await vi.advanceTimersByTimeAsync(41_000); // (45 s after it started, then the 4 s fade)
    expect(A.heard('ceremony')).toBe(true);
    await vi.advanceTimersByTimeAsync(6_000);
    expect(A.heard('ceremony')).toBe(false);
  });

  it('a stop that reaches the player while it is still seeking is made good', async () => {
    eng.raceCountdown('race-a', 5000);
    await vi.advanceTimersByTimeAsync(5000);
    eng.raceGo('race-a', Date.now());
    eng.raceCeremony('race-a');
    await vi.advanceTimersByTimeAsync(130); // (play() has run on the UI thread; the seek isn't done)
    eng.raceEnd('race-a');
    for (let s = 0; s < 10; s += 1) {
      await vi.advanceTimersByTimeAsync(500);
      expect(A.heard('ceremony')).toBe(false);
    }
    expect(A.players.get('ceremony').playing).toBe(false); // (stopped again once it had started)
  });
});
