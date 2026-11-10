// The collision montage (Moses, 10 Nov 2026): the hits are found the game's own way, the clicks never rattle,
// slow motion moves a click later, and the shot list's rules (tracks, series, slow shots, length) are checked.
import { describe, expect, it } from 'vitest';
import { marbleHits, soundTimes } from '../video/collisions.js';
import { checkMontage } from '../video/speed-montage.mjs';

// Two marbles on a 1000 m track: B, 3 m ahead, is caught by A closing at `closing` m/s, side by side otherwise.
const raceOf = (closing) => {
  const frames = [];
  for (let k = 0; k < 20; k += 1) {
    const t = k * 50;
    const a = 100 + (20 * t) / 1000;
    const b = Math.max(a + 1.0, 103 + ((20 - closing) * t) / 1000);
    frames.push({ t, p: [a / 1000, b / 1000], l: [0, 0] });
  }
  return { frames, tickMs: 50 };
};

describe('the hits', () => {
  it('a marble catching another hard is a hit, at the moment they touch; a slow touch is not', () => {
    const hard = marbleHits(raceOf(10), { arc: 1000, room: 2, own: [0], from: 0, to: 1000 });
    expect(hard).toHaveLength(1);
    expect(hard[0]).toMatchObject({ kind: 'hit', i: 0, j: 1 });
    expect(hard[0].t).toBeGreaterThan(150);
    expect(hard[0].t).toBeLessThan(250); // (3 m − 1.21 m at 10 m/s: about 180 ms)
    expect(marbleHits(raceOf(1), { arc: 1000, room: 2, own: [0], from: 0, to: 1000 })).toHaveLength(0);
  });
  it('only hits of the marbles around the group, inside the shot', () => {
    expect(marbleHits(raceOf(10), { arc: 1000, room: 2, own: [], from: 0, to: 1000 })).toHaveLength(0);
    expect(marbleHits(raceOf(10), { arc: 1000, room: 2, own: [0], from: 400, to: 1000 })).toHaveLength(0);
  });
  it('the clicks: in the shot\'s own time (slow motion later), the harder kept when two are too close', () => {
    const hits = [{ t: 1000, k: 0.2 }, { t: 1040, k: 0.9 }, { t: 1500, k: 0.5 }];
    expect(soundTimes(hits, { from: 1000, speed: 1, gap: 0.11 }).map((h) => [h.v, h.k])).toEqual([[0.04, 0.9], [0.5, 0.5]]);
    expect(soundTimes(hits, { from: 1000, speed: 0.5, gap: 0.11 }).map((h) => h.v)).toEqual([0.08, 1]); // (40 ms of race is 80 ms of video: still too close)
  });
});

describe('the shot list', () => {
  const series = { a: 'Pinball', b: 'Blocks', c: 'Canyons', d: 'Grand Prix', e: 'Rivers', f: 'Arcade' };
  const slugs = ['a', 'b', 'c', 'x-grand-prix', 'e', 'f'];
  const of = (s) => series[s] ?? (s.includes('grand-prix') ? 'Grand Prix' : null);
  const shots = (over = {}) => slugs.map((slug, k) => ({ slug, race: `${slug}.video-1`, dur: k % 2 ? 2.0 : 2.4, ...(k % 2 ? {} : { speed: 0.5 }), ...(k === 5 && { end: 'Which one is yours?|marblespins.com|Follow for a new race every day' }), ...over[k] }));
  it('6 tracks, 3+ series, a Grand Prix track, 2+ slow shots, 15–20 s with the end card', () => {
    expect(checkMontage(shots(), { type: 'collision', series: of })).toBeCloseTo(16.2);
  });
  it('refuses too few slow shots, too few series and Champion Shooter', () => {
    expect(() => checkMontage(shots({ 0: { speed: 1 }, 2: { speed: 1 } }), { type: 'collision', series: of })).toThrow(/slow motion/);
    expect(() => checkMontage(shots(), { type: 'collision', series: () => 'Pinball' })).toThrow(/series/);
    expect(() => checkMontage(shots({ 1: { slug: 'champion-shooter-run' } }), { type: 'collision', series: of })).toThrow(/Champion Shooter/);
  });
  it('a speed montage stays at full speed', () => {
    expect(() => checkMontage(shots(), { type: 'speed', series: of })).toThrow(/full speed/);
  });
});
