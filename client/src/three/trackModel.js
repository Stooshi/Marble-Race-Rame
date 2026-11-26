/**
 * Turns a track's waypoints into 3D: a smooth centre line in metres plus the
 * geometry of a cartoon marble run (floor, low walls, kerbs and an embankment
 * down to the ground). Pure maths: no WebGL, so it can be unit tested.
 *
 * World axes (Three.js is Y-up): x = waypoint x, z = waypoint y (the ground
 * plan as seen from above in the 2D viewer), y = waypoint z (height).
 */
import { BufferGeometry, CatmullRomCurve3, Color, Float32BufferAttribute, Vector3 } from 'three';

export const TRACK_STYLE = {
  laneWidth: 1.6,       // metres per lane
  wallHeight: 1.1,      // low walls marbles roll between
  wallThickness: 0.5,
  heightScale: 1.4,     // exaggerate slopes a little for drama
  sampleSpacing: 2,     // metres between cross-sections along the track
  floorColumns: 12,     // floor quads across the width (for lines and checkers)
  groundY: -2,          // where embankments meet the ground
  embankmentSlope: 0.3, // how far embankments spread per metre of height (steep, so lower loops stay visible)
  colors: {
    floorA: '#5b6b8c', floorB: '#56658a',
    wallInner: '#f2f4f8', wallOuter: '#d9dde6',
    kerbA: '#ef4444', kerbB: '#ffffff',
    embankment: '#6aa84f', embankmentDark: '#5c9645',
    start: '#ffffff', half: '#facc15', checkerA: '#111111', checkerB: '#ffffff',
  },
};

const FALLBACK = [{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 400, y: 100 }, { x: 300, y: 200 }, { x: 0, y: 200 }, { x: -100, y: 300 }];

/**
 * Smooth centre line in metres. Waypoint units are scaled so the ground-plan
 * length matches the track's real length (length_m); heights use the same
 * scale (times heightScale). Returns evenly spaced samples along the track.
 */
export function buildCenterline(track, style = TRACK_STYLE) {
  const raw = Array.isArray(track?.waypoints) && track.waypoints.length >= 2 ? track.waypoints : FALLBACK;
  let planLength = 0;
  for (let i = 1; i < raw.length; i += 1) planLength += Math.hypot(raw[i].x - raw[i - 1].x, raw[i].y - raw[i - 1].y);
  const length = Number(track?.length_m) || planLength || 1;
  const scale = length / (planLength || 1);

  const points = raw.map((p) => new Vector3(p.x * scale, (Number(p.z) || 0) * scale * style.heightScale, p.y * scale));
  const curve = new CatmullRomCurve3(points, false, 'centripetal');
  const segments = Math.max(16, Math.ceil(length / style.sampleSpacing));
  curve.arcLengthDivisions = segments * 4;

  const up = new Vector3(0, 1, 0);
  const samples = [];
  for (let i = 0; i <= segments; i += 1) {
    const u = i / segments;
    const pos = curve.getPointAt(u);
    const tangent = curve.getTangentAt(u);
    // Level cross-sections (no banking): sideways is horizontal and square to the direction of travel.
    const flat = new Vector3(tangent.x, 0, tangent.z);
    if (flat.lengthSq() < 1e-8) flat.set(1, 0, 0);
    flat.normalize();
    const side = new Vector3().crossVectors(flat, up).normalize();
    samples.push({ u, pos, tangent, side });
  }
  return { curve, samples, length, scale, segments };
}

/**
 * Position on the track for a race frame: progress 0..1 along the track and
 * lateral -1..1 across it (the same values the server streams).
 */
export function pointOnTrack(centerline, progress, lateral, lanes, style = TRACK_STYLE, out = new Vector3()) {
  const { samples, segments } = centerline;
  const f = Math.min(1, Math.max(0, progress)) * segments;
  const i = Math.min(segments - 1, Math.floor(f));
  const t = f - i;
  const a = samples[i];
  const b = samples[i + 1];
  const half = (lanes * style.laneWidth) / 2;
  const off = Math.max(-1, Math.min(1, lateral || 0)) * half;
  out.set(
    a.pos.x + (b.pos.x - a.pos.x) * t + (a.side.x + (b.side.x - a.side.x) * t) * off,
    a.pos.y + (b.pos.y - a.pos.y) * t,
    a.pos.z + (b.pos.z - a.pos.z) * t + (a.side.z + (b.side.z - a.side.z) * t) * off,
  );
  return out;
}

/**
 * One merged geometry for the whole track with per-face colours, so it draws
 * in a single draw call. Each quad has its own four vertices so colours and
 * normals stay crisp (a faceted, cartoon look).
 */
export function buildTrackGeometry(track, centerline = buildCenterline(track), style = TRACK_STYLE) {
  const lanes = Math.max(1, Number(track?.lane_count) || 4);
  const half = (lanes * style.laneWidth) / 2;
  const wallOut = half + style.wallThickness;
  const { samples, segments, length } = centerline;
  const C = Object.fromEntries(Object.entries(style.colors).map(([k, v]) => [k, new Color(v)]));

  const positions = [];
  const colors = [];
  const indices = [];
  const quad = (p0, p1, p2, p3, color) => {
    const base = positions.length / 3;
    for (const p of [p0, p1, p2, p3]) {
      positions.push(p.x, p.y, p.z);
      colors.push(color.r, color.g, color.b);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  // Point across the track at sample s: lateral offset (metres) and height above the floor.
  const at = (s, off, dy = 0) => new Vector3(s.pos.x + s.side.x * off, s.pos.y + dy, s.pos.z + s.side.z * off);
  const ground = (s, off) => new Vector3(s.pos.x + s.side.x * off, style.groundY, s.pos.z + s.side.z * off);

  const halfDist = length / 2;
  for (let i = 0; i < segments; i += 1) {
    const a = samples[i];
    const b = samples[i + 1];
    const distA = a.u * length;
    const distB = b.u * length;
    const mid = (distA + distB) / 2;
    const stripe = Math.floor(mid / 4) % 2; // 4 m blocks for kerbs and floor tint

    // Floor, in columns so lines and the finish checkers can be drawn.
    const cols = style.floorColumns;
    const isStart = distA < 3;
    const isHalf = Math.abs(mid - halfDist) < 1.5;
    const isFinish = distB > length - 4;
    for (let c = 0; c < cols; c += 1) {
      const x0 = -half + (2 * half * c) / cols;
      const x1 = -half + (2 * half * (c + 1)) / cols;
      let color = stripe ? C.floorA : C.floorB;
      if (isStart) color = C.start;
      else if (isHalf) color = C.half;
      else if (isFinish) color = (c + Math.floor(distA / 2)) % 2 ? C.checkerA : C.checkerB;
      quad(at(a, x0), at(b, x0), at(b, x1), at(a, x1), color);
    }

    for (const sign of [-1, 1]) {
      // Each side: inner wall, kerb on top, outer wall face, embankment to the ground.
      const inner = sign * half;
      const outer = sign * wallOut;
      const spread = sign * (wallOut + style.embankmentSlope * Math.max(0, a.pos.y - style.groundY));
      const spreadB = sign * (wallOut + style.embankmentSlope * Math.max(0, b.pos.y - style.groundY));
      const h = style.wallHeight;
      const faces = [
        [at(a, inner, 0), at(a, inner, h), at(b, inner, h), at(b, inner, 0), C.wallInner],
        [at(a, inner, h), at(a, outer, h), at(b, outer, h), at(b, inner, h), stripe ? C.kerbA : C.kerbB],
        [at(a, outer, h), at(a, outer, 0), at(b, outer, 0), at(b, outer, h), C.wallOuter],
        [at(a, outer, 0), ground(a, spread), ground(b, spreadB), at(b, outer, 0), stripe ? C.embankment : C.embankmentDark],
      ];
      for (const [p0, p1, p2, p3, color] of faces) {
        // Keep winding consistent on both sides so faces point outwards.
        if (sign > 0) quad(p0, p1, p2, p3, color);
        else quad(p3, p2, p1, p0, color);
      }
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
