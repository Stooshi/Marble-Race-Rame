// The player's own marble hitting another (Moses, 30 Oct 2026; src/sound/hits.js and engine.js marbleHit):
// only the own marble's hits, louder for harder ones, nothing below the speed threshold, at most one a second,
// soft and under the music.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { HIT, createHitDetector } from '../src/sound/hits';
import { HIT_LEVEL, MUSIC_UNDER, marbleHit } from '../src/sound/engine';

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
    expect(HIT_LEVEL.hard).toBeLessThan(MUSIC_UNDER);
    expect(HIT_LEVEL.soft).toBeLessThan(HIT_LEVEL.hard);
    expect(marbleHit('x', 1)).toBe(false); // (not unlocked in a test: nothing plays)
    const engine = fs.readFileSync(path.resolve(__dirname, '../src/sound/engine.js'), 'utf8');
    expect(engine).toContain("return play('hit', { gain: HIT_LEVEL.soft + (HIT_LEVEL.hard - HIT_LEVEL.soft) * k, duck: false });");
    const view = fs.readFileSync(path.resolve(__dirname, '../src/components/LiveRaceViewer3D.jsx'), 'utf8');
    expect(view).toContain('hits.d?.step(f, ownRef.current)');
  });
});
