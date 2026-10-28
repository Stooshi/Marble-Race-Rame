// The race music (Moses, 28 Oct 2026): one random tune from GO; a tune that ends before the winner
// crosses the line crossfades (about 2 s) into another random tune, never the same one, so music plays
// all the way to the finish; then the ceremony rule as before (the tune stops, the ceremony song plays).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('the race music plays all the way to the finish', () => {
  let engine;
  let els;
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    els = [];
    const gain = () => ({ gain: { value: 1, setTargetAtTime() {}, cancelScheduledValues() {}, setValueAtTime() {}, linearRampToValueAtTime(v) { this.value = v; } }, connect(x) { return x ?? this; }, disconnect() {} });
    class FakeContext {
      constructor() { this.currentTime = 0; this.destination = {}; this.state = 'running'; }
      resume() { return Promise.resolve(); }
      createGain() { return gain(); }
      createMediaElementSource() { return { connect() {} }; }
      createBufferSource() { return { connect() { return this; }, start() {}, stop() {} }; }
      decodeAudioData(_b, ok) { ok({ duration: 3 }); }
    }
    class FakeAudio {
      constructor() { this.handlers = {}; this.currentTime = 0; this.duration = NaN; this.paused = true; this.readyState = 0; els.push(this); }
      canPlayType() { return 'probably'; }
      addEventListener(k, f) { (this.handlers[k] ??= []).push(f); }
      removeAttribute() { this.src = ''; }
      load() {}
      play() { this.paused = false; return Promise.resolve(); }
      pause() { this.paused = true; }
      at(t, total) { this.duration = total; this.currentTime = t; for (const f of this.handlers.timeupdate ?? []) f(); }
    }
    globalThis.window = { AudioContext: FakeContext };
    globalThis.Audio = FakeAudio;
    globalThis.fetch = async () => ({ arrayBuffer: async () => new ArrayBuffer(8) });
    engine = await import('../src/sound/engine');
    engine.setSettings({ music: 0.7, effects: 0.8, muted: false });
    engine.unlock();
    await vi.runAllTimersAsync();
  });
  afterEach(() => {
    vi.useRealTimers();
    delete globalThis.window;
    delete globalThis.Audio;
    delete globalThis.fetch;
  });

  const playingEl = () => els.filter((e) => !e.paused && e.src);

  it('a tune ending before the finish crossfades into another one, never the same, again and again', () => {
    engine.raceCountdown('r1', 4000);
    engine.raceGo('r1');
    const seen = [engine.nowPlaying().name];
    for (let k = 0; k < 8; k += 1) {
      const name = engine.nowPlaying().name;
      const total = engine.TRACK_SECONDS[name];
      const el = playingEl().find((e) => e.src.includes(`/${name}.`));
      expect(el, name).toBeTruthy();
      el.at(total - 11, total); // (12 s left: the next one loads)
      el.at(total - 1.9, total); // (2 s left: the crossfade)
      const next = engine.nowPlaying().name;
      expect(next).not.toBe(name);
      expect(engine.RACE_TRACKS).toContain(next);
      seen.push(next);
      vi.advanceTimersByTime(engine.CROSSFADE_S * 1000 + 200); // (the old one has faded out and stopped)
      expect(el.paused).toBe(true);
    }
    expect(new Set(seen).size).toBeGreaterThan(3);
    // The finish ceremony: the tune stops and the ceremony song starts (the rule as before).
    engine.raceCeremony('r1');
    expect(engine.nowPlaying()).toEqual({ raceId: 'r1', kind: 'ceremony', name: engine.CEREMONY });
    const ceremony = playingEl().find((e) => e.src.includes('/ceremony.'));
    expect(ceremony.loop).toBe(true);
    // (No crossfade from the ceremony song: it fades out after 45 s.)
    vi.advanceTimersByTime(engine.CEREMONY_SECONDS * 1000 + engine.CEREMONY_FADE_S * 1000 + 200);
    expect(engine.nowPlaying()).toBe(null);
    engine.raceEnd('r1');
  });

  it('a tune near its end when the winner crosses: no crossfade after the ceremony began', () => {
    engine.raceGo('r2');
    const name = engine.nowPlaying().name;
    const total = engine.TRACK_SECONDS[name];
    const el = playingEl().find((e) => e.src.includes(`/${name}.`));
    engine.raceCeremony('r2');
    el.at(total - 1.9, total);
    expect(engine.nowPlaying().kind).toBe('ceremony');
    engine.raceEnd('r2');
  });
});
