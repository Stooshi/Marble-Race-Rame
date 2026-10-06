import { useMemo } from 'react';
import { buildPath, fitTransform, pointAt } from '../utils/trackGeometry';

export const OBSTACLE_COLORS = {
  bumper: '#f59e0b',
  ramp: '#22c55e',
  sand: '#d6a35c',
  spinner: '#a855f7',
  funnel: '#38bdf8',
  cable_car: '#ef4444',
  // Ice channel features (tracks with physics.features, e.g. Bobsleigh Run).
  boost: '#facc15',
  bump: '#60a5fa',
  ice_block: '#bfe9ff',
  snowman: '#ffffff',
  icicles: '#7dd3fc',
  polar_bear: '#f5f5f4',
};

/** A track's obstacles plus its ice channel features (short marks), for the 2D views. */
export function trackMarks(track) {
  const features = (track?.physics?.features ?? []).map((f) => ({ type: f.type, at: f.at, span: 0.008 }));
  return [...(track?.obstacles ?? []), ...features];
}

/** Small SVG thumbnail of a track's shape with its obstacles. */
export default function TrackPreview({ track, width = 160, height = 100 }) {
  const svg = useMemo(() => {
    const path = buildPath(track?.waypoints);
    const { apply } = fitTransform(path, width, height, 10);
    const line = path.points.map((p) => apply(p)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const obstacles = trackMarks(track).map((o, i) => {
      const steps = 6;
      const pts = Array.from({ length: steps + 1 }, (_, k) => apply(pointAt(path, o.at + ((o.span ?? 0.03) * k) / steps)));
      return { key: i, color: OBSTACLE_COLORS[o.type] || '#fff', d: pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') };
    });
    const start = apply(path.points[0]);
    const end = apply(path.points[path.points.length - 1]);
    return { line, obstacles, start, end };
  }, [track, width, height]);

  return (
    <svg className="track-preview" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${track?.name ?? 'Track'} layout`}>
      <polyline points={svg.line} className="track-preview__bed" />
      <polyline points={svg.line} className="track-preview__line" />
      {svg.obstacles.map((o) => (
        <polyline key={o.key} points={o.d} stroke={o.color} className="track-preview__obstacle" />
      ))}
      <circle cx={svg.start.x} cy={svg.start.y} r="3.5" className="track-preview__start" />
      <circle cx={svg.end.x} cy={svg.end.y} r="3.5" className="track-preview__finish" />
    </svg>
  );
}
