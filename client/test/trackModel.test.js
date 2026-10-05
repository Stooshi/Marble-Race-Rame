import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { buildCenterline, buildTrackGeometry, pointOnTrack, TRACK_STYLE } from '../src/three/trackModel';

const track = {
  length_m: 600,
  lane_count: 6,
  waypoints: [
    { x: 0, y: 0, z: 40 }, { x: 200, y: 0, z: 30 }, { x: 300, y: 100, z: 20 }, { x: 200, y: 200, z: 10 }, { x: 0, y: 200, z: 0 },
  ],
};

describe('centre line', () => {
  const cl = buildCenterline(track);

  it('is scaled to the real track length in metres', () => {
    let len = 0;
    for (let i = 1; i < cl.samples.length; i += 1) {
      const a = cl.samples[i - 1].pos;
      const b = cl.samples[i].pos;
      len += Math.hypot(b.x - a.x, b.z - a.z);
    }
    expect(len).toBeGreaterThan(560);
    expect(len).toBeLessThan(640);
    expect(cl.samples.length).toBe(cl.segments + 1);
  });

  it('follows the heights, downhill from start to finish', () => {
    expect(cl.samples[0].pos.y).toBeCloseTo(40 * cl.scale * TRACK_STYLE.heightScale, 3);
    expect(cl.samples.at(-1).pos.y).toBeCloseTo(0, 3);
  });

  it('keeps cross-sections level and square to the direction of travel', () => {
    for (const s of cl.samples) {
      expect(s.side.y).toBeCloseTo(0, 6);
      expect(s.side.length()).toBeCloseTo(1, 6);
      expect(Math.abs(s.side.x * s.tangent.x + s.side.z * s.tangent.z)).toBeLessThan(1e-6);
    }
  });

  it('places race positions on the track, using the full width for lateral -1..1', () => {
    const half = (6 * TRACK_STYLE.laneWidth) / 2;
    const centre = pointOnTrack(cl, 0.5, 0, 6);
    const edge = pointOnTrack(cl, 0.5, 1, 6, TRACK_STYLE, new Vector3());
    expect(Math.hypot(edge.x - centre.x, edge.z - centre.z)).toBeCloseTo(half, 1);
    expect(pointOnTrack(cl, 0, 0, 6).distanceTo(cl.samples[0].pos)).toBeLessThan(1e-6);
    expect(pointOnTrack(cl, 1, 0, 6).distanceTo(cl.samples.at(-1).pos)).toBeLessThan(1e-6);
  });

  it('falls back to a default shape when a track has no layout yet', () => {
    expect(buildCenterline({ length_m: 600, waypoints: [] }).samples.length).toBeGreaterThan(16);
  });
});

describe('track geometry', () => {
  it('is one valid mesh with colours, sized for phones', () => {
    const g = buildTrackGeometry(track);
    const pos = g.getAttribute('position');
    expect(g.getAttribute('color').count).toBe(pos.count);
    expect(Array.from(pos.array).every(Number.isFinite)).toBe(true);
    expect(Math.max(...g.index.array)).toBeLessThan(pos.count);
    const triangles = g.index.count / 3;
    expect(triangles).toBeLessThan(20000);
  });
});
