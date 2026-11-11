// A slow phone (Moses's Galaxy A12, build 1.0.0 (3), 11 Nov 2026): the countdown and its beeps ran under the
// flyover, the picture was slow, taps lagged and the hit sounds were almost all lost. The fixes:
// 1. a solo start show may be held back as long as the phone needs (up to 60 s), so the countdown comes after the flight;
// 2. the resolution steps down on frames up to a second apart, and a phone still too slow drops the scenery;
// 3. the page's own state (standings, clock) follows the stream 4 times a second on phones, not every frame;
// 4. the clicks are found from the streamed frames, and hits may play as late as one drawn frame.
// Looks and sound only: the race itself is never touched.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { MAX_HOLD_MS, SOLO_MAX_HOLD_MS, holdCap, throttleFrames } from '../src/hooks/useRaceStream';
import { BUMP, HIT, LATE_MAX_MS, createStreamedHitDetector, lateFor } from '../src/sound/hits';

const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

describe('1. the solo start show waits for a slow phone', () => {
  it('a solo hold may be 60 s; a shared race still never more than 12 s', () => {
    expect(holdCap(true)).toBe(SOLO_MAX_HOLD_MS);
    expect(SOLO_MAX_HOLD_MS).toBe(60000);
    expect(holdCap(false)).toBe(MAX_HOLD_MS);
    const stream = src('src/hooks/useRaceStream.js');
    expect(stream).toContain('const base = Math.max(0, Math.min(holdCap(stay), ms || 0));');
    expect(stream).toMatch(/const STREAMED_KEEP = 1300;/); // (the streamed frames for the sounds kept that long too)
  });
  it('the beeps follow the same hold: the solo show passes stay to heldFor', () => {
    const viewer = src('src/components/LiveRaceViewer3D.jsx');
    expect(viewer).toContain('const heldFor = (lag, stay = false) => Math.min(holdCap(stay), Math.max(0, lag || 0));');
    expect(viewer.match(/heldFor\(lag, true\)/g)).toHaveLength(2); // (the start show, and the flyover skipped)
    expect(viewer).toContain('shownGo(go + BUFFER_MS + heldFor(lag));'); // (a room's race: as before)
  });
});

describe('2. drawing less on a phone that cannot keep up', () => {
  // A stand-in for the scene's renderer and camera, with TrackScene.keepPace and dropScenery borrowed.
  const sceneLike = async (ratio = 1.5) => {
    const { TrackScene } = await import('../src/three/TrackScene');
    const s = Object.create(TrackScene.prototype);
    let r = ratio;
    Object.assign(s, {
      lite: true, sceneryOn: true, minPixelRatio: 0.75, size: { width: 360, height: 800 },
      renderer: { getPixelRatio: () => r, setPixelRatio: (x) => { r = x; }, setSize: () => {} },
      camera: { layers: { disabled: [], disable(l) { this.disabled.push(l); } } },
    });
    return { s, ratio: () => r };
  };
  const run = (s, gap, ms, now) => {
    let t = now.t;
    const spy = vi.spyOn(performance, 'now').mockImplementation(() => t);
    for (; t < now.t + ms; t += gap) s.keepPace();
    now.t = t;
    spy.mockRestore();
  };

  it('frames 300 ms apart (3 a second) count as slow: the resolution steps down to the phone floor', async () => {
    const { s, ratio } = await sceneLike();
    const now = { t: 1000 };
    run(s, 300, 30_000, now);
    expect(ratio()).toBe(0.75);
  });
  it('still slow at the floor: no scenery for the rest of the race; a long pause counts for nothing', async () => {
    const { s } = await sceneLike(0.75);
    const now = { t: 1000 };
    run(s, 1500, 20_000, now); // (only pauses: a hidden tab)
    expect(s.sceneryOn).toBe(true);
    run(s, 300, 10_000, now);
    expect(s.sceneryOn).toBe(false);
    expect(s.sceneryDropped).toBe(true);
    expect(s.camera.layers.disabled).toEqual([1]);
  });
  it('a phone that keeps up keeps everything; a computer never drops scenery', async () => {
    const { s, ratio } = await sceneLike();
    const now = { t: 1000 };
    run(s, 17, 10_000, now);
    expect([ratio(), s.sceneryOn]).toEqual([1.5, true]);
    const pc = (await sceneLike(1)).s;
    Object.assign(pc, { lite: false, minPixelRatio: 1 });
    run(pc, 300, 20_000, { t: 1000 });
    expect(pc.sceneryOn).toBe(true);
  });
});

describe('3. the page follows the stream a few times a second', () => {
  it('passes on the newest frame at most once per interval, and always the last one', () => {
    let t = 0;
    const timers = [];
    const got = [];
    const th = throttleFrames((f) => got.push(f), 250, { now: () => t, later: (fn, ms) => (timers.push({ fn, at: t + ms }), timers.length), cancel: (id) => { timers[id - 1].fn = null; } });
    for (let k = 0; k < 20; k += 1) { th.push({ t: k * 50 }); t += 50; } // (20 frames a second for a second)
    expect(got.map((f) => f.t)).toEqual([0, 250, 500, 750]); // (4 a second, not 20)
    for (const x of timers) if (x.fn) { t = x.at; x.fn(); }
    expect(got.map((f) => f.t)).toEqual([0, 250, 500, 750, 950]); // (and the newest at the end)
    th.reset(null);
    expect(got.at(-1)).toBeNull();
  });
  it('phones every 250 ms, computers every 100 ms; the held-back clock follows suit', () => {
    const stream = src('src/hooks/useRaceStream.js');
    expect(stream).toContain("return coarse && Math.min(window.screen.width, window.screen.height) <= 900 ? 250 : 100;");
    expect(stream).toContain('if (!frameUi.current) frameUi.current = throttleFrames(setFrameNow, uiFrameMs());');
    expect(src('src/components/LiveRaceViewer3D.jsx')).toContain('Math.floor(f.t / UI_MS) !== lastShownClock');
  });
});

describe('4. the hit sounds on a slow phone', () => {
  const arc = 1000;
  const room = 2;
  // The own marble (0) runs into marble 1 between 100 and 150 ms (closing 10 m/s).
  const frames = [0, 50, 100, 150, 200, 250].map((t) => ({ t, p: [(100 + (t / 1000) * 20) / arc, (103 + (t / 1000) * 10 - (t >= 150 ? 1.6 : 0)) / arc], l: [0, 0] }));

  it('a click is found from the streamed frames, whatever the screen draws, and played when the picture reaches it', () => {
    const d = createStreamedHitDetector({ arc, room });
    for (const f of frames) d.add(f, [0]);
    expect(d.step(100)).toBeNull(); // (not yet)
    expect(d.step(450, lateFor(300))).toBeGreaterThan(0); // (one drawn frame 300 ms later: still played)
  });
  it('an old-style check between drawn frames 300 ms apart finds nothing (why the clicks were lost)', () => {
    expect(300).toBeGreaterThan(HIT.maxStepMs);
  });
  it('late: at least the usual 400 ms, one drawn frame and a bit on a slow phone, never over 1.2 s', () => {
    expect(lateFor(16)).toBe(BUMP.late);
    expect(lateFor(500)).toBe(600);
    expect(lateFor(5000)).toBe(LATE_MAX_MS);
    expect(lateFor(undefined)).toBe(BUMP.late);
  });
  it('the bumps take the same allowance: the viewer passes it to both', () => {
    expect(src('src/sound/hits.js')).toContain('if (t - h.t > late || t - lastAt < BUMP.gapMs) continue;');
    const viewer = src('src/components/LiveRaceViewer3D.jsx');
    expect(viewer).toContain('bumpRef.current.d.step(f.t, late)');
    expect(viewer).toContain('const k = streamed ? hits.d?.step(f.t, late) : hits.d?.step(f, ownRef.current);');
  });
});
