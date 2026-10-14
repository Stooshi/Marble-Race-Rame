/**
 * The clear-track check: no scenery inside the track, none in front of the race camera.
 *
 *   corridorIntrusions: rays straight down through the channel, at every
 *     sample along the track and across the whole U, from CLEAR_ABOVE metres
 *     over the rim to the ice. Anything they hit before the ice is scenery
 *     inside the track (land poking through, a prop standing in the channel,
 *     something hanging low over it): visual only, but it reads as the track
 *     being covered.
 *   cameraClearance: where the follow camera actually goes in a race, nothing
 *     drawn may come within CAMERA_CLEAR metres of it (closer than that, the
 *     camera's near plane slices into it and patches of it cover the track),
 *     and the camera may never be inside the land.
 *
 * Neither can touch a marble: the race runs on the physics channel, which
 * knows nothing about the scenery. This is a drawing check.
 */
import { Box3, DoubleSide, Ray, Raycaster, Vector3 } from 'three';
import { channelLipAt, channelRadiusAt, forkAt, forkOffset, forkRadius } from '../iceChannel';

export const CLEAR_ABOVE = 2.5;  // metres over the rim that must be clear (a marble, its bounce, the camera's view down)
export const CAMERA_CLEAR = 1.2; // metres round the follow camera reported as close (a warning)
export const CAMERA_CUT = 0.5;   // closer than this, the camera's near plane cuts into it: patches over the track (a failure)
const ACROSS = [-0.95, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 0.95]; // shares of the way up each wall
const ICE_TOLERANCE = 0.03; // metres above the ice that still counts as the ice (its flat panels)

const UP = new Vector3(0, 1, 0);
const DOWN = new Vector3(0, -1, 0);
const DIRECTIONS = (() => {
  const out = [];
  for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) for (const z of [-1, 0, 1]) if (x || y || z) out.push(new Vector3(x, y, z).normalize());
  return out;
})();

/**
 * The track's corridor as a volume, for placing scenery (the same space the
 * check looks through): inside(x, y, z, { margin, skip }) is true where a point
 * lies over a channel (within its rim plus `margin` metres, on the plan), from
 * a little under its floor to CLEAR_ABOVE over its rim. skip(i): samples to
 * leave out (a bank's own stretch).
 */
/**
 * The point of triangle abc nearest to (x, z) on the plan, with the triangle's
 * height there: { x, y, z }. (Ericson, Real-Time Collision Detection 5.1.5, in two dimensions.)
 */
function closestOnTriangle2D(px, pz, a, b, c) {
  const abx = b.x - a.x; const abz = b.z - a.z; const acx = c.x - a.x; const acz = c.z - a.z;
  const apx = px - a.x; const apz = pz - a.z;
  const d1 = abx * apx + abz * apz; const d2 = acx * apx + acz * apz;
  const at = (u, v) => ({ x: a.x + abx * u + acx * v, z: a.z + abz * u + acz * v, y: a.y + (b.y - a.y) * u + (c.y - a.y) * v });
  if (d1 <= 0 && d2 <= 0) return at(0, 0);
  const bpx = px - b.x; const bpz = pz - b.z;
  const d3 = abx * bpx + abz * bpz; const d4 = acx * bpx + acz * bpz;
  if (d3 >= 0 && d4 <= d3) return at(1, 0);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return at(d1 / (d1 - d3), 0);
  const cpx = px - c.x; const cpz = pz - c.z;
  const d5 = abx * cpx + abz * cpz; const d6 = acx * cpx + acz * cpz;
  if (d6 >= 0 && d5 <= d6) return at(0, 1);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return at(0, d2 / (d2 - d6));
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return at(1 - w, w); }
  const denom = 1 / (va + vb + vc);
  return at(vb * denom, vc * denom);
}

const CELL = 12;
export function trackCorridor(centerline, channel) {
  const { samples, segments } = centerline;
  const step = channel.arc / segments;
  const grid = new Map();
  const cellKey = (x, z) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
  for (let i = 0; i <= segments; i += 1) {
    const s = samples[i];
    const sArc = i * step;
    const side = new Vector3(s.side.x, 0, s.side.z).normalize();
    const fork = forkAt(channel, sArc);
    const us = fork
      ? [-1, 1].map((b) => ({ c: s.pos.clone().addScaledVector(side, b * forkOffset(fork, sArc)), R: forkRadius(fork, channel.radius, sArc), lip: channel.maxAngle }))
      : [{ c: s.pos, R: channelRadiusAt(channel, sArc), lip: channelLipAt(channel, sArc) }];
    for (const u of us) {
      const e = { i, x: u.c.x, z: u.c.z, floor: u.c.y, top: u.c.y + u.R * (1 - Math.cos(u.lip)), half: u.R * Math.sin(u.lip) + 0.45 };
      const k = cellKey(e.x, e.z);
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(e);
    }
  }
  return {
    inside(x, y, z, { margin = 0.5, skip = null, above = CLEAR_ABOVE, marginFor = null } = {}) {
      const cx = Math.floor(x / CELL); const cz = Math.floor(z / CELL);
      for (let dz = -1; dz <= 1; dz += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          for (const e of grid.get(`${cx + dx},${cz + dz}`) ?? []) {
            if (skip?.(e.i)) continue;
            if (y < e.floor - 3 || y > e.top + above) continue;
            const m = marginFor ? marginFor(e.i) : margin;
            if ((e.x - x) ** 2 + (e.z - z) ** 2 < (e.half + m) ** 2) return true;
          }
        }
      }
      return false;
    },
    /**
     * Whether a triangle (three Vector3s) reaches inside: for each channel cross-section near
     * it, the triangle's nearest point to the channel's centre (on the plan), at its height there.
     */
    hitsTriangle(a, b, c, { margin = 0.5, above = CLEAR_ABOVE, marginFor = null, skip = null } = {}) {
      const minX = Math.min(a.x, b.x, c.x); const maxX = Math.max(a.x, b.x, c.x);
      const minZ = Math.min(a.z, b.z, c.z); const maxZ = Math.max(a.z, b.z, c.z);
      const reach = 8; // (an entry's half width plus margin is never more than this)
      for (let cz = Math.floor((minZ - reach) / CELL); cz <= Math.floor((maxZ + reach) / CELL); cz += 1) {
        for (let cx = Math.floor((minX - reach) / CELL); cx <= Math.floor((maxX + reach) / CELL); cx += 1) {
          for (const e of grid.get(`${cx},${cz}`) ?? []) {
            if (skip?.(e.i)) continue;
            const r = e.half + (marginFor ? marginFor(e.i) : margin);
            if (r <= 0 || e.x < minX - r || e.x > maxX + r || e.z < minZ - r || e.z > maxZ + r) continue;
            const q = closestOnTriangle2D(e.x, e.z, a, b, c);
            if ((q.x - e.x) ** 2 + (q.z - e.z) ** 2 >= r * r) continue;
            // Over the channel, the triangle's heights run between its nearest point and its corners there:
            // inside if that range meets the channel's (from under its floor to over its rim).
            let lo = q.y; let hi = q.y;
            for (const v of [a, b, c]) if ((v.x - e.x) ** 2 + (v.z - e.z) ** 2 < r * r) { lo = Math.min(lo, v.y); hi = Math.max(hi, v.y); }
            if (hi - lo < 0.01 && Math.max(a.y, b.y, c.y) - Math.min(a.y, b.y, c.y) > r) { lo = Math.min(a.y, b.y, c.y); hi = Math.max(a.y, b.y, c.y); } // (a steep face crossing over it)
            if (hi >= e.floor - 3 && lo <= e.top + above) return true;
          }
        }
      }
      return false;
    },
    /** Whether a (world-space) geometry reaches inside (any of its triangles). */
    hits(geometry, opts) {
      const pos = geometry.getAttribute('position');
      const index = geometry.index;
      const count = index ? index.count : pos.count;
      const v = [new Vector3(), new Vector3(), new Vector3()];
      for (let t = 0; t + 2 < count; t += 3) {
        for (let k = 0; k < 3; k += 1) v[k].fromBufferAttribute(pos, index ? index.getX(t + k) : t + k);
        if (this.hitsTriangle(v[0], v[1], v[2], opts)) return true;
      }
      return false;
    },
  };
}

/**
 * The camera's keep-out boxes (scenery.userData.cameraKeepOut, world-space Box3s
 * of compact pieces by the track): blocked if the camera is within CAMERA_CLEAR
 * of one, or its line of sight to the marble passes through one.
 */
const koBox = new Box3();
const koRay = new Ray();
const koDir = new Vector3();
export function keepOutBlocks(boxes, camera, at) {
  if (!boxes?.length) return false;
  const span = camera.distanceTo(at);
  koDir.subVectors(at, camera).normalize();
  koRay.set(camera, koDir);
  const hit = new Vector3();
  for (const b of boxes) {
    koBox.copy(b).expandByScalar(CAMERA_CLEAR);
    if (koBox.containsPoint(camera)) return true;
    if (b.containsPoint(at)) continue; // (its marble right by it: the sight line starts inside)
    if (koRay.intersectBox(b, hit) && hit.distanceTo(camera) < span - 0.5) return true;
  }
  return false;
}

/** What a hit was: the mesh's name, or its group's (scenery is merged by kind: terrain, banks, dressing, landmarks…). */
export const nameOf = (o) => o.name || o.parent?.name || 'unnamed';

/**
 * Names the piece of merged scenery at a point (scenery.userData.stillParts: each
 * landmark, gateway, centrepiece… and its box), or null.
 */
export function pieceFinder(scenery) {
  const parts = scenery?.userData?.stillParts ?? [];
  return (point) => {
    let best = null;
    for (const p of parts) {
      if (!p.box.clone().expandByScalar(0.3).containsPoint(point)) continue;
      const size = p.box.getSize(new Vector3()).lengthSq();
      if (!best || size < best.size) best = { name: p.name, size };
    }
    return best?.name ?? null;
  };
}

/**
 * What may stand in the track on purpose: a coaster's own rails, and a tunnel's
 * or cave's own structure (the dragon's head, a cave's mouth) over its own stretch. Mark a structures
 * group's meshes first (markStructures).
 */
export function tunnelAllowance(kit) {
  const tunnels = (kit?.sections ?? []).filter((s) => s.tunnel);
  return (object, p) => nameOf(object) === 'coaster track' // (a coaster's own rails and raised walls on its banked turns: part of the track)
    || (Boolean(object.userData.structure) && tunnels.some((s) => p >= s.from - 0.01 && p <= s.to + 0.01));
}
export function markStructures(group) {
  group?.traverse((o) => { if (o.isMesh) o.userData.structure = true; });
}

/** Raycast both faces (the check looks from inside things too), without changing how they draw. */
function bothSides(meshes, fn) {
  const was = meshes.map((m) => m.material.side);
  for (const m of meshes) m.material.side = DoubleSide;
  try { return fn(); } finally { meshes.forEach((m, k) => { m.material.side = was[k]; }); }
}

/**
 * Scenery inside the track: [{ p, metres, across, by, height }] (height: metres above the ice),
 * one per sample and position across where something is hit.
 */
export function corridorIntrusions(centerline, channel, meshes, { pieceAt = null, allowed = null } = {}) {
  const { samples, segments } = centerline;
  const step = channel.arc / segments;
  const ray = new Raycaster();
  const out = [];
  for (const m of meshes) m.updateMatrixWorld(true);
  return bothSides(meshes, () => {
    for (let i = 0; i <= segments; i += 1) {
      const s = samples[i];
      const sArc = i * step;
      const side = new Vector3(s.side.x, 0, s.side.z).normalize();
      // The U (or a splitter's two Us).
      const fork = forkAt(channel, sArc);
      const us = fork
        ? [-1, 1].map((b) => ({ centre: s.pos.clone().addScaledVector(side, b * forkOffset(fork, sArc)), R: forkRadius(fork, channel.radius, sArc), lip: channel.maxAngle }))
        : [{ centre: s.pos, R: channelRadiusAt(channel, sArc), lip: channelLipAt(channel, sArc) }];
      for (const u of us) {
        const top = u.centre.y + u.R * (1 - Math.cos(u.lip));
        for (const a of ACROSS) {
          const th = a * u.lip;
          const ice = u.centre.clone().addScaledVector(side, u.R * Math.sin(th)).addScaledVector(UP, u.R * (1 - Math.cos(th)));
          const from = ice.clone();
          from.y = top + CLEAR_ABOVE;
          ray.set(from, DOWN);
          ray.far = from.y - ice.y - ICE_TOLERANCE;
          const hit = ray.intersectObjects(meshes, false).find((h) => !allowed?.(h.object, i / segments));
          if (hit) out.push({ p: +(i / segments).toFixed(4), metres: Math.round(sArc), across: a, by: (/^scenery: still$|^landmarks$/.test(nameOf(hit.object)) && pieceAt?.(hit.point)) || nameOf(hit.object), height: +(hit.point.y - ice.y).toFixed(2), point: hit.point.toArray().map((v) => +v.toFixed(1)) });
        }
      }
    }
    return out;
  });
}

/**
 * How close the scenery comes to the camera at `cam`: { near: { by, metres } | null, inside: name | null }.
 * `ground`: the land's meshes (for the inside-the-land test: the land's surface above the camera).
 */
export function cameraClearance(cam, meshes, ground, { pieceAt = null } = {}) {
  const ray = new Raycaster();
  return bothSides(meshes, () => {
    let near = null;
    for (const d of DIRECTIONS) {
      ray.set(cam, d);
      ray.far = CAMERA_CLEAR;
      const hit = ray.intersectObjects(meshes, false)[0];
      if (hit && (!near || hit.distance < near.metres)) near = { by: (/^scenery: still$|^landmarks$|^grandstands$/.test(nameOf(hit.object)) && pieceAt?.(hit.point)) || nameOf(hit.object), metres: +hit.distance.toFixed(2) };
    }
    // Inside the land: straight up, the first land surface met faces up (the camera is under it).
    ray.set(cam, UP);
    ray.far = 2000;
    const over = ray.intersectObjects(ground, false)[0];
    const inside = over && over.face && over.face.normal.clone().transformDirection(over.object.matrixWorld).y > 0 ? nameOf(over.object) : null;
    return { near, inside };
  });
}

/** Runs of flagged samples, as stretches in metres: [{ from, to, metres, by: [names], worst }]. */
export function stretchesOf(hits, arc, key = 'height') {
  const runs = [];
  for (const h of [...hits].sort((a, b) => a.p - b.p)) {
    const last = runs[runs.length - 1];
    if (last && h.p - last.to <= 3 / arc) {
      last.to = h.p;
      if (!last.by.includes(h.by)) last.by.push(h.by);
      last.worst = Math.max(last.worst, h[key]);
      last.at ??= h.point;
      continue;
    }
    runs.push({ from: h.p, to: h.p, by: [h.by], worst: h[key], at: h.point ?? null });
  }
  return runs.map((r) => ({ ...r, metres: Math.max(1, Math.round((r.to - r.from) * arc)) }));
}
