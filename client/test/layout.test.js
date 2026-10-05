import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { buildCenterline } from '../src/three/trackModel';
import { assignParking, layoutMarbles, MARBLE_RADIUS, RUNOUT_LENGTH } from '../src/three/marbles';
import { lerpFrame } from '../src/utils/splits';
import { realTracks } from './helpers/tracks';

const require = createRequire(import.meta.url);
const { simulateRace } = require('../../src/game/simulator');

const tracks = realTracks();
const field = (seed) => Array.from({ length: 20 }, (_, i) => ({
  id: `m${i}`, lane: (i * 7 + seed) % 20, topSpeed: 30 + ((i * 13 + seed) % 60), acceleration: 50, handling: 30 + ((i * 17) % 60), luck: 50,
}));

describe('3D never-touch layout', () => {
  it('reads all four real tracks', () => {
    expect(tracks.map((t) => t.slug).sort()).toEqual(['canyon-drop', 'meadow-loop', 'san-francisco', 'volcano-run']);
  });

  for (const track of tracks) {
    it(`no two marbles ever touch, and none jumps, on ${track.slug} (bends, overtakes, finish parking)`, { timeout: 120_000 }, () => {
      const centerline = buildCenterline(track);
      for (let seed = 0; seed < 3; seed += 1) {
        const sim = simulateRace({ seed: seed * 7919 + 5, track, entries: field(seed), minDurationMs: 90_000, maxDurationMs: 90_000 });
        const finish = new Map([...sim.results].sort((a, b) => a.finishTimeMs - b.finishTimeMs).map((r, rank) => [r.index, { rank, t: r.finishTimeMs }]));
        let closest = Infinity;
        let biggestStep = 0;
        let prev = null;
        const crossedAt = new Map();
      const memory = {}; // as the 3D view: nudges carried from draw to draw
        // Every server frame plus the in-between moments the 3D view draws, to 2 s after the last finisher.
        const after = Array.from({ length: 20 }, (_, k) => ({ ...sim.frames.at(-1), t: sim.durationMs + (k + 1) * 100 }));
        const frames = [...sim.frames, ...after];
        for (let k = 0; k < frames.length - 1; k += 1) {
          for (let sub = 0; sub < 6; sub += 1) {
            const f = lerpFrame(frames[k], frames[k + 1], sub / 6);
            const pos = layoutMarbles(centerline, f, track.lane_count, finish, { crossedAt, memory }).map((v) => v.clone());
            for (let i = 0; i < pos.length; i += 1) {
              for (let j = i + 1; j < pos.length; j += 1) closest = Math.min(closest, pos[i].distanceTo(pos[j]));
              if (prev) biggestStep = Math.max(biggestStep, pos[i].distanceTo(prev[i]));
            }
            prev = pos;
          }
        }
        expect(closest).toBeGreaterThanOrEqual(2 * MARBLE_RADIUS);
        expect(biggestStep).toBeLessThan(0.6); // 1/60 s apart: smooth, no teleports
      }
    });
  }

  it('parks finishers in their own spots, each column filling from the far end', () => {
    for (const lanes of [4, 5, 6]) {
      // Worst case: all 20 cross the line on the same side.
      const finishers = Array.from({ length: 20 }, (_, i) => ({ index: i, across: -3 + (i % 3) * 0.1 }));
      const spots = assignParking(finishers, lanes, 20);
      expect(spots.size).toBe(20);
      expect(new Set([...spots.values()].map((s) => `${s.along}:${s.across}`)).size).toBe(20);
      for (const s of spots.values()) {
        expect(s.along).toBeLessThanOrEqual(RUNOUT_LENGTH - MARBLE_RADIUS);
        expect(Math.abs(s.across)).toBeLessThanOrEqual((lanes * 1.6) / 2 - MARBLE_RADIUS);
      }
      // Within a column, each later finisher stops short of the earlier ones.
      for (let a = 0; a < 20; a += 1) {
        for (let b = a + 1; b < 20; b += 1) {
          const sa = spots.get(a);
          const sb = spots.get(b);
          if (sa.across === sb.across) expect(sb.along).toBeLessThan(sa.along);
        }
      }
    }
  });
});
