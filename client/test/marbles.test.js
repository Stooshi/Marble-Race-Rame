import { describe, expect, it } from 'vitest';
import { buildCenterline, pointOnTrack, TRACK_STYLE } from '../src/three/trackModel';
import { MARBLE_RADIUS, placeMarble } from '../src/three/marbles';

const track = {
  length_m: 600,
  lane_count: 5,
  waypoints: [{ x: 0, y: 0, z: 30 }, { x: 200, y: 0, z: 20 }, { x: 300, y: 100, z: 10 }, { x: 200, y: 200, z: 0 }],
};
const cl = buildCenterline(track);
const half = (track.lane_count * TRACK_STYLE.laneWidth) / 2;

describe('placeMarble', () => {
  it('rests the marble on the floor (centre one radius above it)', () => {
    const floor = pointOnTrack(cl, 0.3, 0, 5);
    const ball = placeMarble(cl, 0.3, 0, 5);
    expect(ball.y - floor.y).toBeCloseTo(MARBLE_RADIUS, 6);
    expect(ball.x).toBeCloseTo(floor.x, 6);
  });

  it('keeps the marble inside the walls even at the extreme lateral', () => {
    const centre = pointOnTrack(cl, 0.5, 0, 5);
    for (const lateral of [-1, 1, -3, 3]) {
      const ball = placeMarble(cl, 0.5, lateral, 5);
      const sideways = Math.hypot(ball.x - centre.x, ball.z - centre.z);
      expect(sideways).toBeLessThanOrEqual(half - MARBLE_RADIUS + 1e-6);
      expect(sideways).toBeGreaterThan(half - MARBLE_RADIUS - 0.01);
    }
  });

  it('moves forward along the track as progress grows', () => {
    const a = placeMarble(cl, 0, 0, 5);
    const b = placeMarble(cl, 1, 0, 5);
    expect(b.distanceTo(a)).toBeGreaterThan(100);
  });
});

