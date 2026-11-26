/**
 * Geometry helpers that map race progress (0..1) onto a track's waypoint
 * polyline, used by the race viewer and track previews.
 */

const FALLBACK = [
  { x: 0, y: 0 }, { x: 300, y: 0 }, { x: 400, y: 100 }, { x: 300, y: 200 }, { x: 0, y: 200 }, { x: -100, y: 300 },
];

export function buildPath(waypoints) {
  const points = Array.isArray(waypoints) && waypoints.length >= 2 ? waypoints : FALLBACK;
  const cumulative = [0];
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    cumulative.push(cumulative[i - 1] + Math.hypot(dx, dy));
  }
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    points,
    cumulative,
    total: cumulative[cumulative.length - 1] || 1,
    bounds: { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) },
  };
}

/** Point and unit direction at a given progress along the path. */
export function pointAt(path, progress) {
  const target = Math.min(1, Math.max(0, progress)) * path.total;
  const { points, cumulative } = path;
  let i = 1;
  while (i < cumulative.length - 1 && cumulative[i] < target) i += 1;
  const a = points[i - 1];
  const b = points[i];
  const segLen = cumulative[i] - cumulative[i - 1] || 1;
  const f = (target - cumulative[i - 1]) / segLen;
  const dx = (b.x - a.x) / segLen;
  const dy = (b.y - a.y) / segLen;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, dx, dy };
}

/** Uniform scale + offset that fits the path's bounds into a box with padding. */
export function fitTransform(path, width, height, padding) {
  const { minX, maxX, minY, maxY } = path.bounds;
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  const scale = Math.min((width - padding * 2) / w, (height - padding * 2) / h);
  const ox = (width - w * scale) / 2 - minX * scale;
  const oy = (height - h * scale) / 2 - minY * scale;
  return { scale, apply: (p) => ({ x: p.x * scale + ox, y: p.y * scale + oy }) };
}

/** Aspect ratio (height / width) of the path's bounding box, clamped for layout. */
export function aspectRatio(path, min = 0.45, max = 1.4) {
  const { minX, maxX, minY, maxY } = path.bounds;
  return Math.min(max, Math.max(min, (maxY - minY || 1) / (maxX - minX || 1)));
}
