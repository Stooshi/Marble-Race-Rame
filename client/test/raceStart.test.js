// The race start (Moses, 22 Oct 2026, first Android test): the 3D view was ready only after the
// countdown (it built the track when the countdown began), so the race appeared 5–6 s in; and the start
// beeps, scheduled on a paused sound clock, played 20–30 s into the race at the next tap.
//   - The starting line opens the race page first (?go=1); the page builds the track and starts the race.
//   - A view ready late holds itself back to show the countdown from its start, then catches up.
//   - Beeps (and race sounds) only on a running sound clock, never after their countdown.
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CATCH_UP, MAX_HOLD_MS, holdLag } from '../src/hooks/useRaceStream';

const src = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

const { holdFor } = await import('../src/components/LiveRaceViewer3D');

describe('the view holds back when it is ready late', () => {
  const go = 1_000_000;
  it('ready during the countdown or just after GO: held back to show the countdown from its start', () => {
    expect(holdFor(go, 5000, go - 4900)).toBe(0); // (ready 0.1 s into the countdown: no hold)
    expect(holdFor(go, 5000, go - 2000)).toBe(3000);
    expect(holdFor(go, 5000, go + 1000)).toBe(6000);
  });
  it('very late (8 s past GO), or a page that never saw the countdown: live', () => {
    expect(holdFor(go, 5000, go + 8000)).toBe(0);
    expect(holdFor(null, 5000, go)).toBe(0);
  });
  it('the hold is shed at 1.35× speed from 1.5 s after the GO as shown, never further back than 12 s', () => {
    expect(CATCH_UP).toBe(0.35);
    expect(MAX_HOLD_MS).toBe(12000);
    const h = { base: 6000, decayFrom: 10_000 };
    expect(holdLag(h, 9_000)).toBe(6000);
    expect(holdLag(h, 10_000)).toBe(6000);
    expect(holdLag(h, 20_000)).toBeCloseTo(2500, 6);
    expect(holdLag(h, 40_000)).toBe(0); // (live again ~17 s after GO)
  });
  it('the stream plays from the held-back time and keeps the frames for it; the viewer shows the countdown it held', () => {
    const stream = src('src/hooks/useRaceStream.js');
    expect(stream).toContain('performance.now() + b.offset - BUFFER_MS - lag');
    expect(stream).toContain('(hold.current.decided ? hold.current.base : MAX_HOLD_MS) + 3000');
    const viewer = src('src/components/LiveRaceViewer3D.jsx');
    expect(viewer).toContain('Date.now() - BUFFER_MS - lag - (startRef.current ?? Date.now())');
    // (The beeps and the tunes on GO as shown here: BUFFER_MS behind the stream, plus any hold.)
    expect(viewer).toContain('shownGo(go + BUFFER_MS + lag);');
    expect(viewer).toContain('if (meta?.raceId) raceCountdown(meta.raceId, wall - Date.now());');
    expect(viewer).toContain('Getting the track ready…');
  });
});

describe('the track is built before the race starts', () => {
  it('the starting line opens the race page first, and the page starts the race once the 3D view is ready', () => {
    const flow = src('src/site/pages/RaceFlow.jsx');
    expect(flow).toContain('navigate(`/race/${race.id}?go=1`)');
    expect(flow).not.toMatch(/await api\.startRace\(race\.id\)/);
    const page = src('src/pages/Race.jsx');
    expect(page).toContain("onPrepared={preparing ? startWhenReady : null}");
    expect(page).toContain('track={preload}');
    const scene = src('src/three/TrackScene.js');
    expect(scene).toContain('async whenReady()');
    expect(scene).toMatch(/compileAsync\(this\.scene, this\.camera\)/);
  });
});

describe('beeps only over the countdown, in step with it', () => {
  let ctx;
  let sources;
  let engine;
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    sources = [];
    const gain = () => ({ gain: { value: 1, setTargetAtTime() {}, cancelScheduledValues() {}, setValueAtTime() {}, linearRampToValueAtTime() {} }, connect(x) { return x ?? this; }, disconnect() {} });
    class FakeContext {
      constructor() { this.t0 = Date.now(); this.destination = {}; this._state = 'running'; ctx = this; }
      get currentTime() { return 100 + (Date.now() - this.t0) / 1000; }
      get state() { return this._state; }
      set state(v) { this._state = v; this.onstatechange?.(); }
      resume() { return Promise.resolve(); } // (an Android phone before a tap: stays suspended)
      createGain() { return gain(); }
      createBufferSource() {
        const s = { started: null, stopAt: null, connect() {}, start(when = 0, offset = 0) { this.started = { when, offset }; }, stop(at) { this.stopAt = at; } };
        sources.push(s);
        return s;
      }
      decodeAudioData(_b, ok) { ok({ duration: 3.6 }); }
    }
    globalThis.window = { AudioContext: FakeContext, addEventListener() {} };
    globalThis.Audio = class { canPlayType() { return 'probably'; } };
    globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
    engine = await import('../src/sound/engine');
    engine.setSettings({ music: 0, effects: 0.8, muted: false }); // (the beeps alone)
    engine.unlock();
    await engine.prepare();
    await vi.advanceTimersByTimeAsync(1);
  });
  afterEach(() => {
    vi.useRealTimers();
    delete globalThis.window;
    delete globalThis.Audio;
    delete globalThis.fetch;
  });

  it('a running sound clock: the GO beep exactly on GO, and stopped just after it', () => {
    expect(engine.raceCountdown('r1', 4000)).toBe(true);
    const beeps = sources.at(-1);
    expect(beeps.started.when).toBeCloseTo(ctx.currentTime + 4 - engine.BEEPS_GO_S, 6);
    expect(beeps.stopAt).toBeCloseTo(ctx.currentTime + 4 + 0.9, 6); // (cut off just after the GO beep)
  });

  it('a paused sound clock (Android before a tap): nothing plays, and nothing plays late after the countdown', async () => {
    ctx.state = 'suspended';
    const before = sources.length;
    engine.raceCountdown('r2', 4000);
    expect(sources.length).toBe(before);
    expect(engine.play('launch')).toBe(false); // (nor the launch, which would be heard mid-race)
    await vi.advanceTimersByTimeAsync(6000);
    ctx.state = 'running'; // (a tap after GO)
    expect(sources.length).toBe(before); // (the countdown is over: no beeps)
  });

  it('a clock that wakes during the countdown beeps over what is left of it, in step', async () => {
    ctx.state = 'suspended';
    engine.raceCountdown('r3', 4000);
    await vi.advanceTimersByTimeAsync(2000);
    ctx.state = 'running';
    const beeps = sources.at(-1);
    expect(beeps.started.offset).toBeCloseTo(2 - (4 - engine.BEEPS_GO_S), 2); // (where the countdown is)
  });
});
