/**
 * The flyover before a race (Moses, 26 Oct 2026): a camera flight of about three seconds over the
 * track, from above the start to above the finish, with the track's name and series on screen (the
 * race page draws those), then the race's own countdown. Looks only: the race is untouched.
 *
 * The flight follows a smoothed line of the track (its wiggles averaged out, so the camera sweeps
 * instead of twitching through every bend), a little to one side and well above it, looking ahead down
 * the track. Its height comes from what is actually drawn below it (`topAt(x, z)`: the highest surface
 * there, the track, land, landmarks, structures), so it never passes inside the scenery; the track
 * report checks the whole flight for that (report/viewChecks.report.js).
 *
 * A pure function of the time since the flight began (`poseAt(ms)`), like the starting camera, so it
 * can be checked frame by frame and skipped at any point.
 */
import { Box3, CatmullRomCurve3, Matrix4, Vector3 } from 'three';

export const FLYOVER_MS = 2800;
export const FLYOVER_CLEAR_M = 12;    // metres the flight keeps above anything drawn below it
const CONTROL_POINTS = 9;
const CHECKS = 120;                   // points along the flight its height is checked at

const smooth = (u) => u * u * (3 - 2 * u); // (eases in and out: starts and ends at rest)

/**
 * centerline: trackModel's { samples: [{ pos, tangent, side }], segments }.
 * topAt(x, z): the highest drawn surface at (x, z) in world metres (-Infinity where nothing is drawn).
 * → { durationMs, poseAt(ms) → { camera, target }, points: the camera's control points (for the checks) }
 */
export function flyoverPath(centerline, topAt, { durationMs = FLYOVER_MS } = {}) {
  const { samples, segments } = centerline;
  let arc = 0;
  for (let i = 1; i < samples.length; i += 1) arc += samples[i].pos.distanceTo(samples[i - 1].pos);
  // How high and how far to the side: higher over a longer track, so it doesn't race past at low level.
  const height = Math.min(85, Math.max(32, arc * 0.045));
  const aside = height * 0.55;
  const at = (p) => samples[Math.min(segments, Math.max(0, Math.round(p * segments)))];
  // The track's line averaged over a window (a tenth of the track each way), so the flight sweeps.
  const window = Math.max(1, Math.round(segments * 0.1));
  const smoothAt = (p) => {
    const c = Math.round(Math.min(1, Math.max(0, p)) * segments);
    const v = new Vector3();
    let n = 0;
    for (let k = Math.max(0, c - window); k <= Math.min(segments, c + window); k += 1) { v.add(samples[k].pos); n += 1; }
    return v.divideScalar(n);
  };
  // A little to one side of the track (level, to the right of the way along), so the camera sees the
  // track and what's beside it rather than straight down onto it.
  const first = samples[0].tangent.clone().setY(0).normalize();
  const sideOf = (p) => {
    const t = at(p).tangent;
    return new Vector3(t.z, 0, -t.x).normalize();
  };
  // Clearance over everything drawn around a point (a few probes round it, as the camera's view is wide).
  const clearTop = (x, z) => {
    let top = -Infinity;
    for (const [dx, dz] of [[0, 0], [6, 0], [-6, 0], [0, 6], [0, -6]]) top = Math.max(top, topAt(x + dx, z + dz));
    return top;
  };

  const points = [];
  for (let k = 0; k < CONTROL_POINTS; k += 1) {
    const p = k / (CONTROL_POINTS - 1);
    // (The ends are the real start and finish: the averaged line would pull them in along the track.)
    const ground = k === 0 || k === CONTROL_POINTS - 1 ? at(p).pos.clone() : smoothAt(p);
    const pt = ground.clone().addScaledVector(sideOf(p), aside);
    if (k === 0) pt.addScaledVector(first, -height * 0.6); // (starts back behind the start)
    const trackY = Math.max(at(p).pos.y, ground.y);
    pt.y = Math.max(trackY + height, clearTop(pt.x, pt.z) + FLYOVER_CLEAR_M);
    points.push(pt);
  }
  // Raise the flight wherever it would pass lower than FLYOVER_CLEAR_M over anything drawn.
  let curve = new CatmullRomCurve3(points, false, 'centripetal');
  for (let pass = 0; pass < 4; pass += 1) {
    let raised = false;
    for (let j = 0; j <= CHECKS; j += 1) {
      const u = j / CHECKS;
      const c = curve.getPointAt(u);
      const need = clearTop(c.x, c.z) + FLYOVER_CLEAR_M - c.y;
      if (need > 0) {
        // The nearest control points take it (the curve passes between them).
        const f = u * (points.length - 1);
        const a = Math.floor(f);
        for (const k of [a, Math.min(points.length - 1, a + 1)]) points[k].y += need + 1;
        raised = true;
      }
    }
    if (!raised) break;
    curve = new CatmullRomCurve3(points, false, 'centripetal');
  }
  const lead = Math.min(0.12, 160 / Math.max(arc, 1)); // (looks this share of the track ahead: about 160 m)
  const camera = new Vector3();
  const target = new Vector3();
  const poseAt = (ms) => {
    const u = smooth(Math.min(1, Math.max(0, ms / durationMs)));
    camera.copy(curve.getPointAt(u));
    // Ahead down the track, ending on the finish line.
    const p = Math.min(1, u * (1 - lead) + lead);
    target.copy(smoothAt(p)).lerp(at(p).pos, 0.5);
    return { camera, target };
  };
  return { durationMs, poseAt, points, height };
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
