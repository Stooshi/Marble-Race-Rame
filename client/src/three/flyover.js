/**
 * The flyover before a race (Moses, 26 Oct 2026, third version): a helicopter overview, like the TV
 * shot of a Super-G course from high up and from the side, 4 s in all:
 *   1. the overview: the whole track in its landscape from the side, at a distance, from its high start
 *      to the finish, all but still (a slow drift of DRIFT_DEG round it), held at least HOLD_MS;
 *   2. one slow, smooth move in to the track's signature feature (its kit `signature` section: the
 *      Danube's chain bridge, a big curve, a landmark), as far in as the time allows;
 *   3. when it fits as slowly, a glide down to the start gate, ending at rest exactly where the
 *      countdown's camera begins; otherwise the countdown's camera takes over at the gate with a cut.
 * No quick moves anywhere: every move is a zoom and pan at no more than PACE (a measure of how fast the
 * picture changes), with long eased (quintic) starts and stops; it never follows the track or turns
 * with its bends; the horizon is level (the camera never rolls). The side, the distance and the
 * highlight are picked per track (`flyoverPath`): the side seeing most of the track unhidden by the
 * land and the buildings, and across its fall. Its height keeps clear of everything drawn below it
 * (`topAt`), so it never passes inside the scenery; the track report checks every frame
 * (report/viewChecks.report.js).
 *
 * A pure function of the time since the flight began (`poseAt(ms)`), so it can be checked frame by frame
 * and skipped at any point. Looks only: the race is untouched.
 */
import { Box3, Matrix4, Vector3 } from 'three';

export const FLYOVER_MS = 4000;
export const FLYOVER_CLEAR_M = 12;    // metres the flight keeps above anything drawn below it
const DRIFT_DEG = 2.5;                // how far round the overview drifts (a helicopter, all but still)
const HOLD_MS = 1600;                 // the overview, at least
const MAX_HOLD_MS = 2600;             // (and at most: what's left goes to the moves, slower still)
const PACE = 0.75;                    // the fastest the picture may change (zoom and pan measure per second)
const EASE_PEAK = 1.875;              // (the quintic ease's top speed, times its average)
const TURN_DEG = 70;                  // the glide down to the gate turns at most this far round
const STEPS = 140;                    // points along the flight its height is checked at
const UP = new Vector3(0, 1, 0);
const rad = (d) => (d * Math.PI) / 180;

/**
 * The track's highlight: its kit's `signature` section ({ name, from, to } as shares of the track), or
 * null (then the flight picks the middle of the track's biggest drop).
 */
export function flyoverHighlight(track) {
  const kit = track?.physics?.kit;
  const norm = (s) => String(s ?? '').toLowerCase().replace(/^the /, '').replace(/[^a-z0-9 ]/g, '').trim();
  const sig = norm(kit?.signature);
  const s = sig ? (kit.sections ?? []).find((x) => norm(x.name) === sig) : null;
  return s && Number.isFinite(s.from) && Number.isFinite(s.to) ? { name: s.name, from: s.from, to: s.to } : null;
}

/** A view direction (camera → target) at azimuth `az` (radians) looking down at `el`. */
const lookDir = (az, el) => new Vector3(Math.cos(az) * Math.cos(el), -Math.sin(el), Math.sin(az) * Math.cos(el));

/**
 * centerline: trackModel's { samples: [{ pos, tangent, side }], segments }.
 * topAt(x, z): the highest drawn surface at (x, z) in world metres.
 * options: highlight ({ from, to } shares of the track, see flyoverHighlight), end ({ camera, target }:
 * where the countdown's camera begins; without it the flight ends on the highlight), aspect and fov
 * (the camera's, vertical degrees), durationMs.
 * → { durationMs, poseAt(ms) → { camera, target }, points (the key cameras), height, side, highlight }
 */
export function flyoverPath(centerline, topAt, { highlight = null, end = null, aspect = 16 / 9, fov = 50, durationMs = FLYOVER_MS } = {}) {
  const { samples, segments } = centerline;
  const at = (p) => samples[Math.min(segments, Math.max(0, Math.round(p * segments)))].pos;
  const tanV = Math.tan(rad(fov) / 2);
  const tanH = tanV * Math.max(0.3, aspect);

  // The whole track: its middle and the points framed.
  const box = new Box3();
  for (const s of samples) box.expandByPoint(s.pos);
  const centre = box.getCenter(new Vector3());
  const every = Math.max(1, Math.floor(samples.length / 60));
  const framed = samples.filter((_, i) => i % every === 0).map((s) => s.pos);
  framed.push(samples[segments].pos);

  // Is the straight line from a to b clear of everything drawn (its last `spare` metres excepted)?
  const clearLine = (a, b, spare = 18) => {
    const len = a.distanceTo(b);
    const n = Math.max(8, Math.min(40, Math.round(len / 12)));
    const stop = Math.max(0, 1 - spare / Math.max(len, 1));
    for (let k = 1; k <= n; k += 1) {
      const u = (k / n) * stop;
      const x = a.x + (b.x - a.x) * u;
      const y = a.y + (b.y - a.y) * u;
      const z = a.z + (b.z - a.z) * u;
      if (y < topAt(x, z) + 1) return false;
    }
    return true;
  };
  // How far back a camera looking along `dir` at `target` must stand to frame `points` (with a margin).
  const fitDistance = (dir, target, points, margin = 0.82) => {
    const right = new Vector3().crossVectors(dir, UP).normalize();
    const up = new Vector3().crossVectors(right, dir).normalize();
    let d = 0;
    for (const p of points) {
      const o = p.clone().sub(target);
      const depth = o.dot(dir);
      d = Math.max(d, Math.abs(o.dot(right)) / (tanH * margin) - depth, Math.abs(o.dot(up)) / (tanV * margin) - depth);
    }
    return d;
  };

  // The fall: from the high start to the finish, level (seen across it, the drop shows best).
  const fall = samples[0].pos.clone().sub(samples[segments].pos).setY(0);
  const fallDir = fall.lengthSq() > 1 ? fall.normalize() : null;

  // 1. The side: every 15° round the track and three angles down, the one seeing most of the track.
  const options = [];
  for (let a = 0; a < 24; a += 1) {
    const az = (a / 24) * Math.PI * 2;
    for (const el of [rad(16), rad(23), rad(31)]) {
      const dir = lookDir(az, el);
      const dist = Math.max(70, fitDistance(dir, centre, framed));
      const cam = centre.clone().addScaledVector(dir, -dist);
      if (cam.y < topAt(cam.x, cam.z) + FLYOVER_CLEAR_M * 2) continue;
      const seen = framed.filter((p) => clearLine(cam, p)).length / framed.length;
      const across = fallDir ? Math.abs(new Vector3(dir.x, 0, dir.z).normalize().cross(fallDir).y) : 0.5;
      options.push({ az, el, dist, seen, across });
    }
  }
  // Among the views seeing nearly as much of the track as the best one: the one most across its fall
  // (the drop reads best side-on), then the lower.
  const most = Math.max(0, ...options.map((o) => o.seen));
  let best = null;
  for (const o of options) {
    if (o.seen < most - 0.12) continue;
    const score = o.across * 2 + o.seen - o.el * 1.2;
    if (!best || score > best.score) best = { ...o, score };
  }
  if (!best) best = { az: 0, el: rad(45), dist: Math.max(120, fitDistance(lookDir(0, rad(45)), centre, framed)), seen: 0 };
  // 2. The highlight: framed from close to the wide shot's own side (no swinging round), clear of the scenery.
  let hl = highlight;
  if (!hl) {
    // (None named: the middle of the steepest tenth of the track.)
    let drop = -Infinity;
    for (let p = 0.05; p <= 0.85; p += 0.05) {
      const d = at(p).y - at(p + 0.1).y;
      if (d > drop) { drop = d; hl = { name: null, from: p, to: p + 0.1 }; }
    }
  }
  const hPoints = [];
  for (let p = hl.from; p <= hl.to + 1e-9; p += Math.max(0.002, (hl.to - hl.from) / 24)) hPoints.push(at(p).clone());
  // (Aimed at the middle of the section, raised to the track's height there: the middle of a bend can
  // be inside the rock it bends round.)
  const hCentre = hPoints.reduce((v, p) => v.add(p), new Vector3()).divideScalar(hPoints.length);
  hCentre.y = Math.max(hCentre.y, ...hPoints.map((p) => p.y));
  const hSome = hPoints.filter((_, i) => i % 3 === 0);
  let hView = null;
  for (const turn of [0, 12, -12, 25, -25]) {
    for (const el of [rad(38), rad(30), rad(46)]) {
      const az = best.az + rad(DRIFT_DEG + turn);
      const D = Math.min(400, Math.max(45, fitDistance(lookDir(az, el), hCentre, hPoints, 0.7)));
      const cam = viewCamera({ c: hCentre, D, az, el });
      if (cam.y < topAt(cam.x, cam.z) + FLYOVER_CLEAR_M || hSome.filter((p) => clearLine(cam, p, 12)).length < hSome.length * 0.7) continue;
      hView = { c: hCentre.clone(), D, az, el };
      break;
    }
    if (hView) break;
  }
  if (!hView) {
    const az = best.az + rad(DRIFT_DEG);
    hView = { c: hCentre.clone(), D: Math.max(120, fitDistance(lookDir(az, rad(55)), hCentre, hPoints, 0.7)), az, el: rad(55) };
  }

  // The views: where the camera looks (c), how far back (D), from which side (az) and how far down (el).
  const wide0 = { c: centre.clone(), D: best.dist * 1.02, az: best.az, el: best.el };
  const wide1 = { c: centre.clone(), D: best.dist * 0.99, az: best.az + rad(DRIFT_DEG), el: best.el };
  const endView = end ? viewOf(end.camera, end.target) : null;

  // 3. The plan (Moses, 26 Oct 2026: "no quick moves anywhere… if a move feels rushed, drop it rather
  // than speed it up"): every move at most PACE in how fast the picture changes (a zoom and pan
  // measure, van Wijk & Nuij), with long eased starts and stops; the overview held at least HOLD_MS.
  // The move to the highlight goes as far in as the time allows; the glide down to the gate follows only
  // if it fits too, from the highlight's side (the gate's own view no more than TURN_DEG round), and
  // otherwise the flyover ends on the highlight and the countdown's camera takes over at the gate.
  const toH = zoomPan(wide1, hView);
  const toGate = endView && Math.abs(angleBetween(hView.az, endView.az)) <= rad(TURN_DEG) ? zoomPan(hView, endView) : null;
  const msFor = (S) => (EASE_PEAK * S * 1000) / PACE;
  let hold = durationMs - msFor(toH.S) - (toGate ? msFor(toGate.S) : 0);
  const glide = Boolean(toGate) && hold >= HOLD_MS;
  if (!glide) hold = durationMs - msFor(toH.S);
  hold = Math.min(MAX_HOLD_MS, Math.max(HOLD_MS, hold));
  const inMs = glide ? (durationMs - hold) * (toH.S / (toH.S + toGate.S)) : durationMs - hold;
  const reach = Math.min(1, (inMs * PACE) / (EASE_PEAK * toH.S * 1000)); // (how far in: all the way, if it fits)
  const t1 = hold;
  const t2 = hold + inMs;

  const viewAt = (ms) => {
    if (ms <= t1) return mixView(wide0, wide1, smoother(ms / t1));
    if (ms <= t2 || !glide) return toH.at(smoother(Math.min(1, (ms - t1) / Math.max(1, inMs))) * reach);
    return toGate.at(smoother(Math.min(1, (ms - t2) / Math.max(1, durationMs - t2))));
  };

  // Lifted, smoothly, wherever the flight would pass lower than FLYOVER_CLEAR_M over anything drawn
  // (towards a glide's end easing to the gate pose's own clearance, which the countdown's camera keeps).
  const endClear = glide ? Math.min(FLYOVER_CLEAR_M, end.camera.y - topAt(end.camera.x, end.camera.z)) : FLYOVER_CLEAR_M;
  const need = [];
  for (let j = 0; j <= STEPS; j += 1) {
    const ms = (j / STEPS) * durationMs;
    const camera = viewCamera(viewAt(ms));
    const u = glide ? Math.min(1, Math.max(0, (ms - (durationMs - 900)) / 900)) : 0;
    const clear = FLYOVER_CLEAR_M + (endClear - FLYOVER_CLEAR_M) * u * u * (3 - 2 * u);
    need.push(glide && j === STEPS ? 0 : Math.max(0, topAt(camera.x, camera.z) + clear - camera.y));
  }
  const lift = need.map((_, j) => {
    let m = 0;
    const w = glide ? Math.min(12, STEPS - j) : 12; // (a glide's end stays the gate pose)
    for (let i = Math.max(0, j - w); i <= Math.min(STEPS, j + w); i += 1) m = Math.max(m, need[i] * (1 - Math.abs(i - j) / (w + 1)));
    return m;
  });
  const liftAt = (ms) => {
    const f = Math.min(STEPS, Math.max(0, (ms / durationMs) * STEPS));
    const i = Math.min(STEPS - 1, Math.floor(f));
    const u = f - i;
    const s = u * u * (3 - 2 * u);
    return lift[i] + (lift[i + 1] - lift[i]) * s;
  };

  const camera = new Vector3();
  const target = new Vector3();
  const poseAt = (ms) => {
    const t = Math.min(durationMs, Math.max(0, ms));
    if (glide && t >= durationMs) {
      camera.copy(end.camera);
      target.copy(end.target);
      return { camera, target };
    }
    const v = viewAt(t);
    camera.copy(viewCamera(v));
    camera.y += liftAt(t);
    target.copy(v.c);
    return { camera, target };
  };
  return {
    durationMs,
    poseAt,
    cut: !glide, // (true: the countdown's camera takes over at the gate with a cut)
    plan: { holdMs: Math.round(hold), inMs: Math.round(inMs), reach: +reach.toFixed(2), glideMs: glide ? Math.round(durationMs - t2) : 0 },
    points: [wide0, wide1, hView, ...(glide ? [endView] : [])].map(viewCamera),
    height: Math.round(viewCamera(wide0).y - centre.y),
    side: { azimuthDeg: Math.round((best.az * 180) / Math.PI), downDeg: Math.round((best.el * 180) / Math.PI), distance: Math.round(best.dist), seen: Math.round(best.seen * 100) },
    highlight: { name: hl.name, from: hl.from, to: hl.to },
  };
}

/** The camera of a view: back D from what it looks at (c), from side az, looking down el. */
function viewCamera({ c, D, az, el }) {
  return c.clone().addScaledVector(lookDir(az, el), -D);
}
/** The view a camera at `camera` looking at `target` has. */
function viewOf(camera, target) {
  const d = target.clone().sub(camera);
  const D = Math.max(1, d.length());
  d.divideScalar(D);
  return { c: target.clone(), D, az: Math.atan2(d.z, d.x), el: Math.asin(Math.max(-1, Math.min(1, -d.y))) };
}
const angleBetween = (a, b) => {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
};
/** Eased (quintic: long, gentle starts and stops). */
const smoother = (x) => {
  const u = Math.min(1, Math.max(0, x));
  return u * u * u * (u * (u * 6 - 15) + 10);
};
function mixView(a, b, w) {
  return { c: a.c.clone().lerp(b.c, w), D: a.D * (b.D / a.D) ** w, az: a.az + angleBetween(a.az, b.az) * w, el: a.el + (b.el - a.el) * w };
}

/**
 * The smoothest zoom and pan from view a to view b (van Wijk & Nuij, "Smooth and efficient zooming and
 * panning", 2003): out a little when the two are far apart, across, and in, the picture changing at an
 * even pace. → { S: the move's length in that measure, at(f): the view f (0–1) of the way along }. The
 * side and the angle down turn evenly along it.
 */
function zoomPan(a, b) {
  const RHO = Math.SQRT2;
  const K = 1.2; // (view width ≈ K × distance back: about the camera's own)
  const w0 = a.D * K;
  const w1 = b.D * K;
  const line = b.c.clone().sub(a.c);
  const u1 = line.length();
  const dir = u1 > 1e-6 ? line.clone().divideScalar(u1) : new Vector3();
  let S;
  let uAt;
  let wAt;
  if (u1 < 0.5) {
    S = Math.abs(Math.log(w1 / w0)) / RHO;
    const k = w1 < w0 ? -1 : 1;
    uAt = () => 0;
    wAt = (s) => w0 * Math.exp(k * RHO * s);
  } else {
    const bOf = (wi, sign) => (w1 * w1 - w0 * w0 + sign * RHO ** 4 * u1 * u1) / (2 * wi * RHO * RHO * u1);
    const rOf = (bi) => Math.log(-bi + Math.sqrt(bi * bi + 1));
    const r0 = rOf(bOf(w0, 1));
    const r1 = rOf(bOf(w1, -1));
    S = (r1 - r0) / RHO;
    uAt = (s) => (w0 / (RHO * RHO)) * Math.cosh(r0) * Math.tanh(RHO * s + r0) - (w0 / (RHO * RHO)) * Math.sinh(r0);
    wAt = (s) => (w0 * Math.cosh(r0)) / Math.cosh(RHO * s + r0);
  }
  S = Math.max(S, 1e-6);
  const turn = angleBetween(a.az, b.az);
  return {
    S,
    at: (f) => {
      const s = Math.min(1, Math.max(0, f)) * S;
      const g = f <= 0 ? 0 : f >= 1 ? 1 : s / S;
      return {
        c: a.c.clone().addScaledVector(dir, Math.min(u1, Math.max(0, uAt(s)))),
        D: f >= 1 ? b.D : wAt(s) / K,
        az: a.az + turn * g,
        el: a.el + (b.el - a.el) * g,
      };
    },
  };
}

const CELL_M = 8; // the height map's cells

/**
 * The highest drawn surface at (x, z), for the flight's height: a height map of everything drawn (the
 * land, the track, landmarks, houses and towers, trees, structures, billboards), the highest point of
 * any vertex in each 8 m cell, read with its neighbours. Built once per track, in one pass over the
 * vertices (instanced pieces, e.g. trees, by each copy's box). Where nothing is drawn: the floor.
 * groups: the drawn groups (scenery, structures, billboards, the track); trackBelow(x, z): the track's
 * own top there (its walls), as a floor under the map.
 */
export function flyoverTop({ groups = [], trackBelow = () => -Infinity, groundY = 0 } = {}) {
  const cells = new Map();
  const put = (x, z, y) => {
    const k = `${Math.floor(x / CELL_M)},${Math.floor(z / CELL_M)}`;
    const was = cells.get(k);
    if (was === undefined || y > was) cells.set(k, y);
  };
  const v = new Vector3();
  const m = new Matrix4();
  const box = new Box3();
  for (const g of groups) {
    if (!g) continue;
    g.updateMatrixWorld?.(true);
    g.traverse((o) => {
      if (!o.isMesh || o.visible === false || !o.geometry?.getAttribute) return;
      const pos = o.geometry.getAttribute('position');
      if (!pos) return;
      if (o.isInstancedMesh) {
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        for (let i = 0; i < o.count; i += 1) {
          o.getMatrixAt(i, m);
          box.copy(o.geometry.boundingBox).applyMatrix4(m).applyMatrix4(o.matrixWorld);
          for (let x = box.min.x; x <= box.max.x + CELL_M; x += CELL_M) for (let z = box.min.z; z <= box.max.z + CELL_M; z += CELL_M) put(Math.min(x, box.max.x), Math.min(z, box.max.z), box.max.y);
        }
        return;
      }
      for (let i = 0; i < pos.count; i += 1) {
        v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        put(v.x, v.z, v.y);
      }
    });
  }
  return (x, z) => {
    const cx = Math.floor(x / CELL_M);
    const cz = Math.floor(z / CELL_M);
    let top = Math.max(groundY, trackBelow(x, z));
    for (let i = -1; i <= 1; i += 1) for (let j = -1; j <= 1; j += 1) {
      const y = cells.get(`${cx + i},${cz + j}`);
      if (y !== undefined && y > top) top = y;
    }
    return top;
  };
}
