// The game's sound on the race clock (Moses, 28 Oct 2026): the website through Web Audio (every sound
// in memory, every voice scheduled on the sound clock at its race-clock moment), the apps through the
// native audio plugin; a sound that arrives late, or a pause in the background, picks up in step.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createWebBackend } from '../src/sound/webBackend';
import { createNativeBackend } from '../src/sound/nativeBackend';

const T0 = 1_000_000;

/** A Web Audio context whose clock is the (fake) wall clock, as a running AudioContext's is. */
function fakeAudio({ duration = 10, decodeMs = 0 } = {}) {
  const sources = [];
  const made = [];
  class Ctx {
    constructor(opts) { this.opts = opts; this.destination = {}; this._state = 'running'; this.t0 = Date.now(); made.push(this); }
    get currentTime() { return (Date.now() - this.t0) / 1000; }
    get state() { return this._state; }
    set state(v) { this._state = v; this.onstatechange?.(); }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    createGain() {
      return { gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} }, connect(x) { return x ?? this; }, disconnect() {} };
    }
    createBufferSource() {
      const s = { started: null, stopAt: null, connect() {}, start(when, offset) { this.started = { when, offset }; }, stop(at) { this.stopAt = at ?? 0; } };
      sources.push(s);
      return s;
    }
    decodeAudioData(_b, ok) { if (decodeMs) setTimeout(() => ok({ duration }), decodeMs); else ok({ duration }); }
  }
  return { Ctx, sources, made };
}

describe('the website: Web Audio on the race clock', () => {
  let audio;
  let fetched;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    audio = fakeAudio();
    fetched = [];
    globalThis.window = { AudioContext: audio.Ctx };
    globalThis.fetch = async (url) => { fetched.push(url); return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) }; };
  });
  afterEach(() => { vi.useRealTimers(); delete globalThis.window; delete globalThis.fetch; });
  const make = () => createWebBackend({ urlOf: (n) => `/audio/${n}.webm` });

  it('files are fetched before the first tap and decoded on it, at 32 kHz', async () => {
    const b = make();
    expect(await b.load('tune-1')).toBe(true);
    expect(fetched).toEqual(['/audio/tune-1.webm']);
    expect(b.ready()).toBe(false);
    expect(b.loaded('tune-1')).toBe(false);
    expect(b.fetched('tune-1')).toBe(true);
    expect(b.start('tune-1', {})).toBe(null); // (no sound before the tap)
    expect(b.init()).toBe(true);
    expect(audio.made[0].opts.sampleRate).toBe(32000);
    await vi.advanceTimersByTimeAsync(1);
    expect(b.loaded('tune-1')).toBe(true);
    expect(fetched.length).toBe(1); // (not fetched again)
  });

  it('a voice starts exactly at its moment, or part-way in when that moment has passed', async () => {
    const b = make();
    b.init();
    await b.load('start-beeps');
    await vi.advanceTimersByTimeAsync(1);
    const now = Date.now();
    b.start('start-beeps', { atWall: now + 2000 });
    const s1 = audio.sources.at(-1);
    expect(s1.started.when).toBeCloseTo(audio.made[0].currentTime + 2, 6);
    expect(s1.started.offset).toBe(0);
    b.start('start-beeps', { atWall: now - 1500 });
    const s2 = audio.sources.at(-1);
    expect(s2.started.when).toBeCloseTo(audio.made[0].currentTime, 6);
    expect(s2.started.offset).toBeCloseTo(1.5, 6); // (in step: never late from its start)
  });

  it('a sound that arrives late starts in step with the race clock', async () => {
    audio = fakeAudio({ decodeMs: 3000 });
    globalThis.window = { AudioContext: audio.Ctx };
    const b = make();
    b.init();
    b.load('tune-2');
    const go = Date.now() + 1000;
    b.start('tune-2', { atWall: go, bus: 'music' });
    expect(audio.sources.length).toBe(0); // (not in yet)
    await vi.advanceTimersByTimeAsync(3000);
    const s = audio.sources.at(-1);
    expect(s.started.offset).toBeCloseTo(2, 2); // (arrived 2 s after GO: 2 s in)
  });

  it('suspended (Safari, the background): resumed, the voices pick up where the race is', async () => {
    const b = make();
    b.init();
    await b.load('tune-3');
    await vi.advanceTimersByTimeAsync(1);
    const go = Date.now();
    b.start('tune-3', { atWall: go, bus: 'music' });
    b.background(true);
    expect(b.running()).toBe(false);
    await vi.advanceTimersByTimeAsync(4000);
    b.background(false);
    await vi.advanceTimersByTimeAsync(1);
    const s = audio.sources.at(-1);
    expect(s.started.offset).toBeCloseTo(4, 2);
    // Safari suspending it by itself: the next tap's wake() resumes it, in step again.
    audio.made[0].state = 'interrupted';
    await vi.advanceTimersByTimeAsync(2000);
    b.wake();
    await vi.advanceTimersByTimeAsync(1);
    expect(audio.sources.at(-1).started.offset).toBeCloseTo(6, 2);
  });

  it('a voice already over by now is dropped, not played late', async () => {
    const b = make();
    b.init();
    await b.load('launch');
    await vi.advanceTimersByTimeAsync(1);
    const before = audio.sources.length;
    b.start('launch', { atWall: Date.now() - 20_000 });
    expect(audio.sources.length).toBe(before);
  });
});

describe('the apps: the native audio plugin', () => {
  let calls;
  let plugin;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    calls = [];
    const rec = (name) => (args) => { calls.push([name, args]); return Promise.resolve(name === 'getDuration' ? { duration: 30 } : undefined); };
    plugin = Object.fromEntries(['configure', 'preload', 'play', 'loop', 'stop', 'pause', 'resume', 'unload', 'setVolume', 'getDuration'].map((n) => [n, rec(n)]));
    plugin.addListener = () => {};
  });
  afterEach(() => vi.useRealTimers());
  const of = (name) => calls.filter((c) => c[0] === name).map((c) => c[1]);

  it('the ambient session (the silent switch mutes the game), every sound preloaded from the app', async () => {
    const b = createNativeBackend({ plugin });
    b.init();
    expect(await b.load('tune-1')).toBe(true);
    expect(of('configure')[0]).toEqual({ focus: false, fade: false });
    expect(of('preload')[0]).toMatchObject({ assetId: 'tune-1', assetPath: 'public/audio/tune-1.m4a', isUrl: false });
    expect(b.loaded('tune-1')).toBe(true);
    expect(b.duration('tune-1')).toBe(30);
    expect(b.ready()).toBe(true); // (no tap needed)
  });

  it('plays at its race-clock moment, part-way in when late, and back in step after the background', async () => {
    const b = createNativeBackend({ plugin });
    b.setLevels({ music: 0.2, effects: 0.8 });
    await b.load('tune-2');
    b.start('tune-2', { atWall: Date.now() + 1000, bus: 'music' });
    expect(of('play').length).toBe(0);
    await vi.advanceTimersByTimeAsync(1000);
    expect(of('play')[0].assetId).toBe('tune-2');
    expect(of('play')[0].time).toBeCloseTo(0, 2);
    expect(of('setVolume').at(-1).volume).toBeCloseTo(0.2, 6);
    b.background(true);
    expect(of('pause').length).toBe(1);
    await vi.advanceTimersByTimeAsync(5000);
    b.background(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(of('play').at(-1).time).toBeCloseTo(5, 2);
    // A late start: where the race is.
    await b.load('start-beeps');
    b.start('start-beeps', { atWall: Date.now() - 1200 });
    await vi.advanceTimersByTimeAsync(1);
    expect(of('play').at(-1)).toMatchObject({ assetId: 'start-beeps' });
    expect(of('play').at(-1).time).toBeCloseTo(1.2, 2);
  });

  it('a looping tune: played from where the race is (inside the loop), then looped by the player itself', async () => {
    const b = createNativeBackend({ plugin });
    await b.load('tune-3'); // (30 s here)
    b.start('tune-3', { atWall: Date.now() - 65_000, bus: 'music', loop: true });
    await vi.advanceTimersByTimeAsync(1);
    expect(of('play').at(-1)).toMatchObject({ assetId: 'tune-3' });
    expect(of('play').at(-1).time).toBeCloseTo(5, 2); // (65 s in: the third time round, 5 s in)
    expect(of('loop').at(-1)).toEqual({ assetId: 'tune-3' });
  });
});

describe('the engine: beeps and tunes on the race clock', () => {
  let audio;
  let engine;
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    audio = fakeAudio({ duration: 40 });
    globalThis.window = { AudioContext: audio.Ctx, addEventListener() {} };
    globalThis.Audio = class { canPlayType() { return 'probably'; } };
    globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
    engine = await import('../src/sound/engine');
    engine.setSettings({ music: 0.7, effects: 0.8, muted: false });
  });
  afterEach(() => { vi.useRealTimers(); delete globalThis.window; delete globalThis.Audio; delete globalThis.fetch; });

  it('preloaded before the tap; ready once everything a race needs is in memory', async () => {
    const r = await engine.prepare('x');
    expect(r.ready).toBe(true);
    expect(engine.upcoming().length).toBe(engine.AHEAD);
    expect(engine.soundReport('x')).toMatchObject({ backend: 'web', started: false, missing: [] });
  });

  it('the beeps\' GO beep and the first tune on GO as shown, re-timed if GO moves', async () => {
    engine.unlock();
    await engine.prepare('r1');
    await vi.advanceTimersByTimeAsync(1);
    const ctx = audio.made[0];
    const n = audio.sources.length;
    expect(engine.raceCountdown('r1', 5000)).toBe(true);
    const fresh = audio.sources.slice(n);
    const beeps = fresh.find((s) => Math.abs(s.started.when - (ctx.currentTime + 5 - engine.BEEPS_GO_S)) < 1e-6);
    const tune = fresh.find((s) => Math.abs(s.started.when - (ctx.currentTime + 5)) < 1e-6);
    expect(beeps).toBeTruthy();
    expect(tune).toBeTruthy();
    expect(engine.musicState()).toBe(null); // (no music during the countdown)
    // The start show re-timed (e.g. a skipped flyover): both follow.
    engine.raceCountdown('r1', 3500);
    const again = audio.sources.slice(n + fresh.length);
    expect(again.some((s) => Math.abs(s.started.when - (ctx.currentTime + 3.5)) < 1e-6)).toBe(true);
    await vi.advanceTimersByTimeAsync(3500);
    expect(engine.musicState()).toMatchObject({ raceId: 'r1', kind: 'race' });
  });

  it('the tune picked at GO loops seamlessly until the ceremony (one tune, looped by the sound itself); then the ceremony rule', async () => {
    engine.unlock();
    await engine.prepare('r2');
    await vi.advanceTimersByTimeAsync(1);
    const n = audio.sources.length;
    engine.raceGo('r2', Date.now());
    const tune = engine.musicState().track;
    const src = audio.sources.at(-1);
    expect(audio.sources.length).toBe(n + 1);
    expect(src.loop).toBe(true);
    expect(src.loopStart).toBe(0);
    expect(src.loopEnd).toBeCloseTo(Math.min(40, engine.TRACK_SECONDS[tune]), 6);
    await vi.advanceTimersByTimeAsync(5 * 60_000); // (a long race: still the same tune, nothing new started)
    expect(engine.musicState().track).toBe(tune);
    expect(audio.sources.length).toBe(n + 1);
    expect(src.stopAt).toBe(null);
    engine.raceCeremony('r2');
    expect(src.stopAt).not.toBe(null); // (the tune stops: the ceremony rule)
    expect(engine.nowPlaying()).toEqual({ raceId: 'r2', kind: 'ceremony', name: engine.CEREMONY });
    expect(audio.sources.at(-1).loop).toBe(true);
    await vi.advanceTimersByTimeAsync(engine.CEREMONY_SECONDS * 1000 + 100);
    expect(engine.nowPlaying()).toBe(null); // (fading out after 45 s)
    engine.raceEnd('r2');
    expect(engine.musicState()).toBe(null);
  });

  it('a page opened long after GO: the looping tune joins where the race is, inside the loop', async () => {
    engine.unlock();
    await engine.prepare('r4');
    await vi.advanceTimersByTimeAsync(1);
    engine.raceGo('r4', Date.now());
    const len = audio.sources.at(-1).loopEnd;
    engine.raceEnd('r4');
    engine.raceGo('r5', Date.now() - (len * 2 + 3) * 1000);
    const s = audio.sources.at(-1);
    const l2 = s.loopEnd;
    expect(s.started.offset).toBeCloseTo(((len * 2 + 3) % l2), 2);
  });

  it('a page opened mid-race: the tune joins where the race is', async () => {
    engine.unlock();
    await engine.prepare('r3');
    await vi.advanceTimersByTimeAsync(1);
    engine.raceGo('r3', Date.now() - 7000);
    expect(audio.sources.at(-1).started.offset).toBeCloseTo(7, 2);
  });

  it('the apps: switched to the native plugin, no tap needed', async () => {
    const calls = [];
    const plugin = Object.fromEntries(['configure', 'preload', 'play', 'loop', 'stop', 'pause', 'setVolume', 'getDuration', 'unload'].map((k) => [k, (a) => { calls.push([k, a]); return Promise.resolve(k === 'getDuration' ? { duration: 40 } : undefined); }]));
    plugin.addListener = () => {};
    engine.useNativeAudio(plugin);
    expect(engine.soundBackend()).toBe('native');
    expect(engine.isUnlocked()).toBe(true);
    await engine.prepare('n1');
    expect(engine.soundMissing('n1')).toEqual([]);
    engine.raceCountdown('n1', 4000);
    await vi.advanceTimersByTimeAsync(4000 - engine.BEEPS_GO_S * 1000);
    expect(calls.some(([k, a]) => k === 'play' && a.assetId === 'start-beeps')).toBe(true);
    await vi.advanceTimersByTimeAsync(engine.BEEPS_GO_S * 1000);
    expect(calls.some(([k, a]) => k === 'play' && a.assetId.startsWith('tune-'))).toBe(true);
  });
});
