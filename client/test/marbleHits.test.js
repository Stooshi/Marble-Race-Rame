// The player's own marble hitting another (Moses, 30 Oct 2026; src/sound/hits.js and engine.js marbleHit):
// only the own marble's hits, louder for harder ones, nothing below the speed threshold, at most one a second,
// soft and under the music.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { BUMP, HIT, HIT_GATE, NOT_OBSTACLES, createBumpDetector, createHitDetector, createHitGate } from '../src/sound/hits';
import { HIT_LEVEL, HIT_PEAK_DB, MUSIC_UNDER, SOUNDS, levels, marbleBump, marbleHit } from '../src/sound/engine';

const ARC = 1000;
const ROOM = 5;
// A frame: marble 0 (the own one) at 500 m, marble 1 at `m` metres, marble 2 at `o` metres, all in the middle.
const frame = (t, m, o = 600) => ({ t, p: [500 / ARC, m / ARC, o / ARC], l: [0, 0, 0] });

describe('the own marble\'s hits', () => {
  it('sounds when the own marble comes into touch fast enough, louder for harder hits', () => {
    const soft = createHitDetector({ arc: ARC, room: ROOM });
    soft.step(frame(10000, 503), [0]);
    const k1 = soft.step(frame(10050, 501.1), [0]); // (closing 38 m/s over 50 ms: well over full)
    expect(k1).toBe(1);
    const gentle = createHitDetector({ arc: ARC, room: ROOM });
    gentle.step(frame(10000, 501.4), [0]);
    const k2 = gentle.step(frame(10050, 501.2), [0]); // 4 m/s
    expect(k2).toBeGreaterThan(0);
    expect(k2).toBeLessThan(1);
  });
  it('is silent below the speed threshold and while already touching (rubbing)', () => {
    const d = createHitDetector({ arc: ARC, room: ROOM });
    d.step(frame(10000, 501.25), [0]);
    expect(d.step(frame(10050, 501.2), [0])).toBeNull(); // 1 m/s: under HIT.minSpeed
    expect(d.step(frame(10100, 501.1), [0])).toBeNull(); // already touching
    expect(HIT.minSpeed).toBeGreaterThan(1);
  });
  it('never for other marbles\' hits', () => {
    const d = createHitDetector({ arc: ARC, room: ROOM });
    d.step(frame(10000, 520, 523), [0]);
    expect(d.step(frame(10050, 520, 521.1), [0])).toBeNull(); // (marbles 1 and 2 collide; 0 is far away)
  });
  it('at most one a second of race time; starts afresh when scrubbed back', () => {
    const d = createHitDetector({ arc: ARC, room: ROOM });
    d.step(frame(10000, 503), [0]);
    expect(d.step(frame(10050, 501.1), [0])).not.toBeNull();
    d.step(frame(10100, 503), [0]);
    expect(d.step(frame(10150, 501.1), [0])).toBeNull(); // 0.1 s later: too soon
    d.step(frame(11100, 503), [0]);
    expect(d.step(frame(11150, 501.1), [0])).not.toBeNull(); // over a second later
    d.step(frame(5000, 503), [0]); // (scrubbed back)
    expect(d.step(frame(5050, 501.1), [0])).not.toBeNull();
  });
  it('nothing during the countdown or across a jump in time', () => {
    const d = createHitDetector({ arc: ARC, room: ROOM });
    d.step(frame(-100, 503), [0]);
    expect(d.step(frame(-50, 501.1), [0])).toBeNull();
    d.step(frame(10000, 503), [0]);
    expect(d.step(frame(10600, 501.1), [0])).toBeNull(); // 0.6 s gap: no speed measured
  });
  it('never ducking the music, never clipping; only the live viewer plays it, for the own marbles', () => {
    // (50% louder from 30 Oct 2026, at every strength; 6 dB louder again, x2, from Moses's computer test, 4 Nov 2026.)
    expect(HIT_LEVEL.soft).toBeCloseTo(0.365, 3);
    expect(HIT_LEVEL.hard).toBeCloseTo(1.25, 3);
    const l = levels();
    const db = (g) => 20 * Math.log10(g);
    expect(HIT_PEAK_DB + db(HIT_LEVEL.hard * l.effects)).toBeLessThanOrEqual(-1.4); // (the hardest click's peak as played: about -1.5 dBFS, never over)
    expect(MUSIC_UNDER).toBeGreaterThan(0);
    expect(HIT_LEVEL.soft).toBeLessThan(HIT_LEVEL.hard);
    expect(marbleHit('x', 1)).toBe(false); // (not unlocked in a test: nothing plays)
    const engine = fs.readFileSync(path.resolve(__dirname, '../src/sound/engine.js'), 'utf8');
    expect(engine).toContain("return play(key, { gain: HIT_LEVEL.soft + (HIT_LEVEL.hard - HIT_LEVEL.soft) * k, duck: false });");
    const view = fs.readFileSync(path.resolve(__dirname, '../src/components/LiveRaceViewer3D.jsx'), 'utf8');
    expect(view).toContain('hits.d?.step(f, ownRef.current)');
  });
});

// The player's own marble hitting an obstacle (Moses, 31 Oct 2026): from the race's events, on the race clock,
// louder for harder hits, nothing below the threshold, at most one a second; the two hit sounds share one limit.
describe('the own marble\'s bumps on obstacles', () => {
  // Found from the frames against the obstacles' footprints (4 Nov 2026; checked against the simulator in
  // obstacleBumps.test.js). A slalom gate at 500 m in the middle (reach 1.25 m), a parked bus at 700 m, a
  // curtain (icicles) at 900 m, a loop at 1100 m.
  const SOLIDS = [
    { id: 0, type: 'slalom_gate', s: 500, xa: 0, xb: 0, reach: 1.25 },
    { id: 1, type: 'bus', s: 700, xa: -3, xb: -3, reach: 1.25 },
    { id: 2, type: 'icicles', s: 900, xa: -2, xb: 2, reach: 1.25 },
    { id: 3, type: 'loop', s: 1100, xa: 0, xb: 0, reach: 1.25 },
  ];
  const track = { solidsAt: () => SOLIDS, arc: ARC, room: ROOM };
  // The own marble (0) rolling at `v` m/s along x = `x` m from s0, thrown aside by `throwX` m once it reaches
  // `hitAt` (as the physics' bounce does); marble 1 far behind. Frames 20 a second.
  const run = (d, { s0 = 480, v = 20, x = 0, hitAt = 498.75, throwX = 1.2, from = 10000, to = 11500, own = [0], who = 0 } = {}) => {
    let s = s0;
    let xx = x;
    for (let t = from; t <= to; t += 50) {
      const p = [100 / ARC, 100 / ARC];
      const l = [0, 0];
      p[who] = s / ARC;
      l[who] = xx / ROOM;
      d.add({ t, p, l }, own);
      const next = s + (v * 50) / 1000;
      if (s < hitAt && next >= hitAt) { s = hitAt - 0.2; xx += throwX; } else s = next;
    }
  };

  it('sounds when the race as shown reaches the own marble\'s hit, louder for harder hits', () => {
    const hard = createBumpDetector(track);
    run(hard, { v: 20 });
    const at = [];
    for (let t = 10000; t <= 11500; t += 10) { const k = hard.step(t); if (k !== null) at.push([t, k]); }
    expect(at.length).toBe(1);
    expect(at[0][0]).toBeGreaterThan(10850); // (about 18.75 m at 20 m/s after 10 s)
    expect(at[0][0]).toBeLessThan(11050);
    const soft = createBumpDetector(track);
    run(soft, { v: 6, s0: 492, hitAt: 498.75 });
    let k = null;
    for (let t = 10000; t <= 11500 && k === null; t += 10) k = soft.step(t);
    expect(k).toBeGreaterThan(0);
    expect(k).toBeLessThan(at[0][1]);
  });
  it('silent below the race\'s own threshold (4 m/s into it), on a near miss, for other marbles, and for curtains and the loop', () => {
    expect(BUMP.minSpeed).toBe(4);
    const slow = createBumpDetector(track);
    run(slow, { v: 3, s0: 495 });
    for (let t = 10000; t <= 11500; t += 10) expect(slow.step(t)).toBeNull();
    const past = createBumpDetector(track);
    run(past, { x: 1.4, throwX: 0 }); // (1.4 m aside: clear of its 1.25 m reach)
    for (let t = 10000; t <= 11500; t += 10) expect(past.step(t)).toBeNull();
    const theirs = createBumpDetector(track);
    run(theirs, { who: 1 }); // (marble 1 hits it; the own marble is 0)
    for (let t = 10000; t <= 11500; t += 10) expect(theirs.step(t)).toBeNull();
    for (const s0 of [880, 1080]) {
      const d = createBumpDetector(track);
      run(d, { s0, hitAt: s0 + 18.75 });
      for (let t = 10000; t <= 11500; t += 10) expect(d.step(t)).toBeNull();
    }
    for (const o of ['wall', 'marble', 'splitter', 'icicles', 'loop']) expect(NOT_OBSTACLES.has(o)).toBe(true);
    for (const o of ['slalom_gate', 'ice_block', 'polar_bear', 'bus']) expect(NOT_OBSTACLES.has(o)).toBe(false);
  });
  it('a parked piece: any fresh touch is a hit', () => {
    const d = createBumpDetector(track);
    run(d, { s0: 698, x: -1.9, hitAt: 699.35, throwX: 0.8, v: 3 }); // (slow, glancing: still a hit on a parked bus)
    let k = null;
    for (let t = 10000; t <= 11500 && k === null; t += 10) k = d.step(t);
    expect(k).not.toBeNull();
  });
  it('nothing without the track\'s obstacles (the 2D view), never played late; starts afresh when scrubbed back', () => {
    const none = createBumpDetector();
    run(none);
    for (let t = 10000; t <= 11500; t += 10) expect(none.step(t)).toBeNull();
    const late = createBumpDetector(track);
    run(late);
    expect(late.step(10950 + BUMP.late + 100)).toBeNull();
    const d = createBumpDetector();
    expect(d.hasTrack()).toBe(false);
    d.setTrack(track);
    expect(d.hasTrack()).toBe(true);
    run(d);
    let k = null;
    for (let t = 10000; t <= 11500 && k === null; t += 10) k = d.step(t);
    expect(k).not.toBeNull();
    run(d, { from: 5000, to: 6500 }); // (scrubbed back: the replayed race again)
    k = null;
    for (let t = 5000; t <= 6500 && k === null; t += 10) k = d.step(t);
    expect(k).not.toBeNull();
    expect(BUMP.gapMs).toBe(1000);
  });
  it('the two hit sounds share one limit: at most one every half second', () => {
    const g = createHitGate();
    expect(HIT_GATE.anyMs).toBe(500);
    expect(g.allow(10000)).toBe(true);
    expect(g.allow(10300)).toBe(false);
    expect(g.allow(10500)).toBe(true);
    expect(g.allow(2000)).toBe(true); // (scrubbed back)
  });
  it('just under the collision click, preloaded; the live viewer plays it for the own marbles, from the frames', () => {
    expect(SOUNDS.bump).toBe('marble-bump');
    for (const ext of ['webm', 'm4a']) expect(fs.existsSync(path.resolve(__dirname, `../public/audio/marble-bump.${ext}`))).toBe(true);
    expect(marbleBump('x', 1)).toBe(false); // (not unlocked in a test: nothing plays)
    const engine = fs.readFileSync(path.resolve(__dirname, '../src/sound/engine.js'), 'utf8');
    expect(engine).toContain("return hitSound('bump', raceId, strength);");
    const view = fs.readFileSync(path.resolve(__dirname, '../src/components/LiveRaceViewer3D.jsx'), 'utf8');
    expect(view).toContain('bumpRef.current.d.add(frame, highlight)');
    expect(view).toContain('hits.gate.allow(f.t)');
    expect(view).toContain('bumpRef.current.d.setTrack({ solidsAt: at, ...span })');
    // Every streamed frame reaches the detector (1 Nov 2026): React may draw two frames as one.
    expect(view).toContain('for (const g of takeRef.current()) bumpRef.current.d.add(g, ownRef.current)');
    expect(fs.readFileSync(path.resolve(__dirname, '../src/pages/Race.jsx'), 'utf8')).toContain('takeStreamed={stream.takeStreamed}');
    // (No longer from the race's events: they carry at most one obstacle hit a marble every 3 s.)
    expect(fs.readFileSync(path.resolve(__dirname, '../src/sound/hits.js'), 'utf8')).not.toContain("e?.type !== 'bounce'");
  });
});
