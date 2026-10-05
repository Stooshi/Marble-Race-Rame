'use strict';

/**
 * The track's real shape, in metres, for the physics simulator.
 *
 * This is the same centre line the 3D view draws (client/src/three/trackModel.js
 * buildCenterline, which uses Three.js's centripetal Catmull-Rom curve with
 * arc-length sampling), ported without Three.js so the server can use it.
 * A client test checks the two agree, so what the physics computes is
 * exactly where the 3D view draws it.
 *
 * World axes as in the 3D view: x = waypoint x, z = waypoint y (ground plan),
 * y = waypoint z (height), scaled so the ground-plan length is length_m.
 */

const TRACK_STYLE = Object.freeze({
  laneWidth: 1.6,    // metres per lane
  heightScale: 1.4,  // slopes exaggerated a little, as drawn
  sampleSpacing: 2,  // metres between cross-sections
});

const FALLBACK = [{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 400, y: 100 }, { x: 300, y: 200 }, { x: 0, y: 200 }, { x: -100, y: 300 }];

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const distSq = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
// Same arithmetic as Three.js Vector3.distanceTo, so lengths match bit for bit.
const dist = (a, b) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

/** Centripetal Catmull-Rom through `points` (open curve), as Three.js does it. */
function catmullRom(points) {
  const l = points.length;
  function cubic(x0, x1, x2, x3, dt0, dt1, dt2, w) {
    let t1 = (x1 - x0) / dt0 - (x2 - x0) / (dt0 + dt1) + (x2 - x1) / dt1;
    let t2 = (x2 - x1) / dt1 - (x3 - x1) / (dt1 + dt2) + (x3 - x2) / dt2;
    t1 *= dt1;
    t2 *= dt1;
    const c0 = x1;
    const c1 = t1;
    const c2 = -3 * x1 + 3 * x2 - 2 * t1 - t2;
    const c3 = 2 * x1 - 2 * x2 + t1 + t2;
    const w2 = w * w;
    return c0 + c1 * w + c2 * w2 + c3 * w2 * w;
  }
  return function getPoint(t) {
    const p = (l - 1) * t;
    let intPoint = Math.floor(p);
    let weight = p - intPoint;
    if (weight === 0 && intPoint === l - 1) {
      intPoint = l - 2;
      weight = 1;
    }
    const p0 = intPoint > 0 ? points[intPoint - 1] : (() => { const d = sub(points[0], points[1]); return { x: d.x + points[0].x, y: d.y + points[0].y, z: d.z + points[0].z }; })();
    const p1 = points[intPoint];
    const p2 = points[intPoint + 1];
    const p3 = intPoint + 2 < l ? points[intPoint + 2] : (() => { const d = sub(points[l - 1], points[l - 2]); return { x: d.x + points[l - 1].x, y: d.y + points[l - 1].y, z: d.z + points[l - 1].z }; })();
    let dt0 = Math.pow(distSq(p0, p1), 0.25);
    let dt1 = Math.pow(distSq(p1, p2), 0.25);
    let dt2 = Math.pow(distSq(p2, p3), 0.25);
    if (dt1 < 1e-4) dt1 = 1.0;
    if (dt0 < 1e-4) dt0 = dt1;
    if (dt2 < 1e-4) dt2 = dt1;
    return {
      x: cubic(p0.x, p1.x, p2.x, p3.x, dt0, dt1, dt2, weight),
      y: cubic(p0.y, p1.y, p2.y, p3.y, dt0, dt1, dt2, weight),
      z: cubic(p0.z, p1.z, p2.z, p3.z, dt0, dt1, dt2, weight),
    };
  };
}

/** Arc-length lookup, as Three.js Curve.getLengths / getUtoTmapping. */
function arcLengthMap(getPoint, divisions) {
  const lengths = [0];
  let last = getPoint(0);
  let sum = 0;
  for (let p = 1; p <= divisions; p += 1) {
    const current = getPoint(p / divisions);
    sum += dist(current, last);
    lengths.push(sum);
    last = current;
  }
  function uToT(u) {
    const il = lengths.length;
    const target = u * lengths[il - 1];
    let low = 0;
    let high = il - 1;
    let i = 0;
    while (low <= high) {
      i = Math.floor(low + (high - low) / 2);
      const comparison = lengths[i] - target;
      if (comparison < 0) low = i + 1;
      else if (comparison > 0) high = i - 1;
      else { high = i; break; }
    }
    i = high;
    if (lengths[i] === target) return i / (il - 1);
    const before = lengths[i];
    const after = lengths[i + 1];
    return (i + (target - before) / (after - before)) / (il - 1);
  }
  return { uToT, total: sum };
}

function normalize(v) {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

/**
 * Evenly spaced samples along the track (same as the 3D view's): each with
 * position, unit tangent and the level sideways direction. Plus the 3D arc
 * length, which is what race progress 0..1 is measured along.
 */
function buildCenterline(track, style = TRACK_STYLE) {
  const raw = Array.isArray(track?.waypoints) && track.waypoints.length >= 2 ? track.waypoints : FALLBACK;
  let planLength = 0;
  for (let i = 1; i < raw.length; i += 1) planLength += Math.hypot(raw[i].x - raw[i - 1].x, raw[i].y - raw[i - 1].y);
  const length = Number(track?.length_m) || planLength || 1;
  const scale = length / (planLength || 1);
  const points = raw.map((p) => ({ x: p.x * scale, y: (Number(p.z) || 0) * scale * style.heightScale, z: p.y * scale }));
  const getPoint = catmullRom(points);
  const segments = Math.max(16, Math.ceil(length / style.sampleSpacing));
  const arc = arcLengthMap(getPoint, segments * 4);

  const samples = [];
  for (let i = 0; i <= segments; i += 1) {
    const u = i / segments;
    const t = arc.uToT(u);
    const pos = getPoint(t);
    // Tangent as Three.js getTangent: two points a small delta apart.
    const t1 = Math.max(0, t - 0.0001);
    const t2 = Math.min(1, t + 0.0001);
    const tangent = normalize(sub(getPoint(t2), getPoint(t1)));
    let fx = tangent.x;
    let fz = tangent.z;
    const fl = Math.sqrt(fx * fx + fz * fz);
    if (fl * fl < 1e-8) { fx = 1; fz = 0; } else { fx /= fl; fz /= fl; }
    const side = normalize({ x: -fz, y: 0, z: fx }); // level, square to travel (cross(flat, up))
    samples.push({ u, pos, tangent, side });
  }
  return { samples, length, scale, segments, arcLength: arc.total };
}

/**
 * What the physics needs at each sample, as flat arrays: distance along the
 * track (m), floor height (m), slope (sine of the angle, negative downhill)
 * how sharply the track turns (signed, 1/m; positive turns towards `side`)
 * and how the slope bends over crests and dips.
 */
function trackProfile(centerline) {
  const { samples, segments, arcLength } = centerline;
  const n = samples.length;
  const s = new Float64Array(n);
  const y = new Float64Array(n);
  const slope = new Float64Array(n);
  const turn = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    s[i] = (arcLength * i) / segments;
    y[i] = samples[i].pos.y;
    slope[i] = samples[i].tangent.y;
  }
  const heading = (i) => Math.atan2(samples[i].side.z, samples[i].side.x);
  for (let i = 0; i < n; i += 1) {
    const a = Math.max(0, i - 1);
    const b = Math.min(n - 1, i + 1);
    let dh = heading(b) - heading(a);
    while (dh > Math.PI) dh -= 2 * Math.PI;
    while (dh < -Math.PI) dh += 2 * Math.PI;
    const horizontal = Math.hypot(samples[b].pos.x - samples[a].pos.x, samples[b].pos.z - samples[a].pos.z) || 1;
    turn[i] = dh / horizontal;
  }
  // How fast the slope changes (1/m), smoothed over about 8 m: negative over
  // a crest, where a fast marble can leave the floor.
  const bend = new Float64Array(n);
  const reach = Math.max(1, Math.round(4 / (arcLength / segments)));
  for (let i = 0; i < n; i += 1) {
    const a = Math.max(0, i - reach);
    const b = Math.min(n - 1, i + reach);
    bend[i] = b > a ? (slope[b] - slope[a]) / (s[b] - s[a]) : 0;
  }
  return { s, y, slope, turn, bend, spacing: arcLength / segments, total: arcLength };
}

module.exports = { TRACK_STYLE, buildCenterline, trackProfile };
