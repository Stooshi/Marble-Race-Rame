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
  it('soft and under the music, never ducking it; only the live viewer plays it, for the own marbles', () => {
    // (50% louder from 30 Oct 2026, at every strength.) The hardest hit's peak, as played, stays under a typical
    // race tune's (the tunes peak at -2.7 to -10.2 dBFS in their files, -4.7 the middle one).
    expect(HIT_LEVEL.soft).toBeCloseTo(0.07 * 1.5, 5);
    expect(HIT_LEVEL.hard).toBeCloseTo(0.24 * 1.5, 5);
    const l = levels();
    const db = (g) => 20 * Math.log10(g);
    expect(HIT_PEAK_DB + db(HIT_LEVEL.hard * l.effects)).toBeLessThan(-4.7 + db(l.music));
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
  // Streamed frames every 50 ms with the speeds (`v`); marble 0 is the own one, marble 1 another.
  const feed = (d, hits, speed) => {
    for (let t = 9000; t <= 13000; t += 50) {
      const events = hits.filter((h) => h.t > t - 50 && h.t <= t);
      d.add({ t, v: [speed(0, t), speed(1, t)], ...(events.length && { events }) }, [0]);
    }
  };
  // The own marble 25 m/s, losing `drop` m/s at 10 s (and at 12 s).
  const losing = (drop) => (i, t) => 25 - (t >= 10000 ? drop : 0) - (t >= 12000 ? drop : 0);
  const bounce = (t, i, obstacle) => ({ t, i, type: 'bounce', obstacle });

  it('sounds when the race as shown reaches the own marble\'s hit, louder for harder hits', () => {
    const hard = createBumpDetector();
    feed(hard, [bounce(10000, 0, 'slalom_gate')], losing(12));
    expect(hard.step(9990)).toBeNull(); // (not there yet)
    expect(hard.step(10010)).toBe(1);
    const soft = createBumpDetector();
    feed(soft, [bounce(10000, 0, 'polar_bear')], losing(3));
    const k = soft.step(10010);
    expect(k).toBeGreaterThan(0);
    expect(k).toBeLessThan(0.5);
  });
  it('silent below the threshold, for other marbles, and for walls, marbles, the divider and curtains', () => {
    const graze = createBumpDetector();
    feed(graze, [bounce(10000, 0, 'slalom_gate')], losing(1));
    expect(graze.step(10010)).toBeNull();
    expect(BUMP.minDrop).toBeGreaterThan(1);
    const theirs = createBumpDetector();
    feed(theirs, [bounce(10000, 1, 'slalom_gate')], () => 20);
    expect(theirs.step(10010)).toBeNull();
    for (const o of ['wall', 'marble', 'splitter', 'icicles']) {
      expect(NOT_OBSTACLES.has(o)).toBe(true);
      const d = createBumpDetector();
      feed(d, [bounce(10000, 0, o)], losing(12));
      expect(d.step(10010)).toBeNull();
    }
    for (const o of ['slalom_gate', 'ice_block', 'polar_bear', 'bus']) expect(NOT_OBSTACLES.has(o)).toBe(false);
  });
  it('at most one a second; never played late; starts afresh when scrubbed back', () => {
    const d = createBumpDetector();
    feed(d, [bounce(10000, 0, 'slalom_gate'), bounce(10300, 0, 'slalom_gate'), bounce(12000, 0, 'bus')], losing(6));
    expect(d.step(10010)).not.toBeNull();
    expect(d.step(10310)).toBeNull(); // 0.3 s later: too soon
    expect(d.step(12500)).toBeNull(); // the race as shown is already 0.5 s past it: let go
    const late = createBumpDetector();
    feed(late, [bounce(10000, 0, 'slalom_gate')], losing(6));
    expect(late.step(10000 + BUMP.late + 50)).toBeNull();
  });
  it('the two hit sounds share one limit: at most one every half second', () => {
    const g = createHitGate();
    expect(HIT_GATE.anyMs).toBe(500);
    expect(g.allow(10000)).toBe(true);
    expect(g.allow(10300)).toBe(false);
    expect(g.allow(10500)).toBe(true);
    expect(g.allow(2000)).toBe(true); // (scrubbed back)
  });
  it('at the collision sound\'s level, under the music, preloaded; the live viewer plays it for the own marbles', () => {
    expect(SOUNDS.bump).toBe('marble-bump');
    for (const ext of ['webm', 'm4a']) expect(fs.existsSync(path.resolve(__dirname, `../public/audio/marble-bump.${ext}`))).toBe(true);
    expect(marbleBump('x', 1)).toBe(false); // (not unlocked in a test: nothing plays)
    const engine = fs.readFileSync(path.resolve(__dirname, '../src/sound/engine.js'), 'utf8');
    expect(engine).toContain("return hitSound('bump', raceId, strength);");
    const view = fs.readFileSync(path.resolve(__dirname, '../src/components/LiveRaceViewer3D.jsx'), 'utf8');
    expect(view).toContain('bumpRef.current.d.add(frame, highlight)');
    expect(view).toContain('hits.gate.allow(f.t)');
  });
});
