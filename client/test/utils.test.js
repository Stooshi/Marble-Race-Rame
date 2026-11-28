import { describe, expect, it } from 'vitest';
import { formatDelta, formatTime, ordinal, percent } from '../src/utils/format';
import { detectCrossings, frameAtTime, lerpFrame, splitOrder } from '../src/utils/splits';
import { buildPath, fitTransform, pointAt } from '../src/utils/trackGeometry';

describe('format', () => {
  it('formats race times', () => {
    expect(formatTime(84213)).toBe('1:24.21');
    expect(formatTime(9500)).toBe('9.50');
    expect(formatTime(90000)).toBe('1:30.00');
    expect(formatTime(null)).toBe('—');
  });
  it('formats signed deltas', () => {
    expect(formatDelta(-450)).toBe('−0.45s');
    expect(formatDelta(1230)).toBe('+1.23s');
    expect(formatDelta(0)).toBe('±0.00s');
  });
  it('formats ordinals and percentages', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd']);
    expect(percent(1, 4)).toBe('25%');
    expect(percent(1, 0)).toBe('—');
  });
});

describe('splits', () => {
  const f0 = { t: 0, p: [0, 0], l: [0, 0] };
  const f1 = { t: 100, p: [0.4, 0.45], l: [0, 0] };
  const f2 = { t: 200, p: [0.6, 0.48], l: [0, 0] };

  it('interpolates the halfway crossing time between frames', () => {
    expect(detectCrossings(f0, f1)).toEqual({});
    expect(detectCrossings(f1, f2)).toEqual({ 0: 150 });
  });

  it('skips marbles that already have a split', () => {
    expect(detectCrossings(f1, f2, { 0: 150 })).toEqual({});
  });

  it('marks splits as unknown for marbles already past halfway when first seen', () => {
    expect(detectCrossings(null, { t: 5000, p: [0.7, 0.2], l: [0, 0] })).toEqual({ 0: null });
  });

  it('orders known splits fastest first', () => {
    expect(splitOrder({ 0: 500, 1: 300, 2: null, 3: 400 })).toEqual([1, 3, 0]);
  });

  it('interpolates frames', () => {
    const mid = lerpFrame(f1, f2, 0.5).p;
    expect(mid[0]).toBeCloseTo(0.5);
    expect(mid[1]).toBeCloseTo(0.465);
    const frames = [f0, f1, f2];
    expect(frameAtTime(frames, 100, 150).p[0]).toBeCloseTo(0.5);
    expect(frameAtTime(frames, 100, 10_000).p).toEqual(f2.p);
  });
});

describe('track geometry', () => {
  const path = buildPath([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }]);

  it('maps progress onto the polyline', () => {
    expect(path.total).toBe(200);
    expect(pointAt(path, 0)).toMatchObject({ x: 0, y: 0 });
    expect(pointAt(path, 0.25)).toMatchObject({ x: 50, y: 0, dx: 1, dy: 0 });
    expect(pointAt(path, 0.75)).toMatchObject({ x: 100, y: 50, dx: 0, dy: 1 });
    expect(pointAt(path, 1)).toMatchObject({ x: 100, y: 100 });
  });

  it('fits the path inside a box', () => {
    const { apply } = fitTransform(path, 220, 220, 10);
    expect(apply({ x: 0, y: 0 })).toEqual({ x: 10, y: 10 });
    expect(apply({ x: 100, y: 100 })).toEqual({ x: 210, y: 210 });
  });

  it('falls back to a default shape without waypoints', () => {
    expect(buildPath([]).points.length).toBeGreaterThan(2);
  });
});
