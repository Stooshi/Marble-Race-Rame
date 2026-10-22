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
// The finish: the last FINISH_M metres before the line looked through four times as closely (where every
// race ends and the finish camera looks), and the catch area past the line, whose floor falls PEN_DROP a metre.
export const FINISH_M = 60;
const ACROSS_FINE = Array.from({ length: 17 }, (_, k) => -0.95 + (1.9 * k) / 16);
const PEN_DROP = 0.05; // (as src/three/marbles.js PEN_DROP)
const PEN_WALL = 1.6;  // metres: the catch area's walls (TrackScene buildCatchArea)
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
    // (Its marble inside it, under a gateway's arch: the camera goes through with it.)
    if (b.containsPoint(at)) continue;
    koBox.copy(b).expandByScalar(CAMERA_CLEAR);
    if (koBox.containsPoint(camera)) return true;
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
export function bothSides(meshes, fn) {
  const was = meshes.map((m) => m.material.side);
  for (const m of meshes) m.material.side = DoubleSide;
  try { return fn(); } finally { meshes.forEach((m, k) => { m.material.side = was[k]; }); }
}

/**
 * Scenery inside the track: [{ p, metres, across, by, height }] (height: metres above the ice),
 * one per sample and position across where something is hit. Also the finish (its last FINISH_M metres
 * more closely) and the catch area past the line (p over 1: metres past the line, `pen: true`).
 */
export function corridorIntrusions(centerline, channel, meshes, { pieceAt = null, allowed = null } = {}) {
  const { samples, segments } = centerline;
  const step = channel.arc / segments;
  const ray = new Raycaster();
  const out = [];
  for (const m of meshes) m.updateMatrixWorld(true);
  const finishFrom = Math.max(0, channel.arc - FINISH_M);
  const look = (from, ice, i, sArc, a, pen = false) => {
    ray.set(from, DOWN);
    ray.far = from.y - ice.y - ICE_TOLERANCE;
    const p = sArc / channel.arc;
    const hit = ray.intersectObjects(meshes, false).find((h) => !allowed?.(h.object, Math.min(1, p)));
    if (hit) out.push({ p: +p.toFixed(4), metres: Math.round(sArc), across: a, by: (/^scenery: still$|^landmarks$/.test(nameOf(hit.object)) && pieceAt?.(hit.point)) || nameOf(hit.object), height: +(hit.point.y - ice.y).toFixed(2), point: hit.point.toArray().map((v) => +v.toFixed(1)), ...(pen && { pen: true }) });
  };
  const atArc = (sArc) => {
    const f = Math.min(segments, Math.max(0, sArc / step));
    const i = Math.min(segments - 1, Math.floor(f));
    const a = samples[i]; const b = samples[i + 1];
    return { pos: new Vector3().lerpVectors(a.pos, b.pos, f - i), side: new Vector3(a.side.x, 0, a.side.z).normalize(), i };
  };
  const section = (sArc, across, pos, side, i) => {
    const fork = forkAt(channel, sArc);
    const us = fork
      ? [-1, 1].map((b) => ({ centre: pos.clone().addScaledVector(side, b * forkOffset(fork, sArc)), R: forkRadius(fork, channel.radius, sArc), lip: channel.maxAngle }))
      : [{ centre: pos, R: channelRadiusAt(channel, sArc), lip: channelLipAt(channel, sArc) }];
    for (const u of us) {
      const top = u.centre.y + u.R * (1 - Math.cos(u.lip));
      for (const a of across) {
        const th = a * u.lip;
        const ice = u.centre.clone().addScaledVector(side, u.R * Math.sin(th)).addScaledVector(UP, u.R * (1 - Math.cos(th)));
        const from = ice.clone();
        from.y = top + CLEAR_ABOVE;
        look(from, ice, i, sArc, a);
      }
    }
  };
  return bothSides(meshes, () => {
    for (let i = 0; i <= segments; i += 1) {
      const s = samples[i];
      const sArc = i * step;
      const side = new Vector3(s.side.x, 0, s.side.z).normalize();
      if (sArc >= finishFrom) {
        // The finish straight: four looks per sample, each across 17 places.
        for (let k = 0; k < 4 && sArc + (k * step) / 4 <= channel.arc; k += 1) {
          const at = atArc(sArc + (k * step) / 4);
          section(sArc + (k * step) / 4, ACROSS_FINE, at.pos, at.side, at.i);
        }
      } else {
        section(sArc, ACROSS, s.pos, side, i);
      }
    }
    // The catch area past the line: its floor, falling gently, between its walls, every metre.
    const pen = channel.runout;
    if (pen) {
      const end = samples[segments];
      const forward = new Vector3(end.tangent.x, 0, end.tangent.z).normalize();
      const side = new Vector3(end.side.x, 0, end.side.z).normalize();
      for (let d = 0; d <= pen.length; d += 1) {
        for (const a of ACROSS_FINE) {
          const ice = end.pos.clone().addScaledVector(forward, d).addScaledVector(side, a * pen.halfWidth);
          ice.y = end.pos.y - d * PEN_DROP;
          const from = ice.clone();
          from.y = ice.y + PEN_WALL + CLEAR_ABOVE;
          look(from, ice, segments, channel.arc + d, a, true);
        }
      }
    }
    return out;
  });
}

/**
 * The finish shot's view (`pose`: { camera, target } as TrackScene finishShotPose; `cut`: what it cuts away, TrackScene finishCutaway): nothing drawn
 * between the camera and the finish (the last 25 m of track, at a marble's height, across the
 * floor) or the catch area past the line, and nothing close round the camera itself.
 * → { blocked: [{ at (metres past the line, negative before it), by }], near: { by, metres } | null }
 */
const SHOT_FOV = 50; // degrees, top to bottom (TrackScene's camera)

export function finishShotView(centerline, channel, pose, meshes, ground = [], { pieceAt = null, cut = null } = {}) {
  const { samples, segments } = centerline;
  const end = samples[segments];
  const forward = new Vector3(end.tangent.x, 0, end.tangent.z).normalize();
  const side = new Vector3(end.side.x, 0, end.side.z).normalize();
  const pen = channel.runout ?? { length: 0, halfWidth: 0 };
  const points = [];
  for (let d = -25; d <= pen.length - 2; d += 2.5) {
    const half = d < 0 ? channelRadiusAt(channel, channel.arc) * 0.6 : pen.halfWidth * 0.75;
    for (const a of [-1, 0, 1]) {
      const p = end.pos.clone().addScaledVector(forward, d).addScaledVector(side, a * half);
      p.y = end.pos.y - Math.max(0, d) * PEN_DROP + 0.55;
      points.push({ d, p });
    }
  }
  // In the shot: in front of the camera and within its picture (the finish shot's 50° picture, a few degrees spare).
  const view = pose.target.clone().sub(pose.camera).normalize();
  const inShot = (p) => {
    const dir = p.clone().sub(pose.camera);
    return dir.dot(forward) >= 3 && dir.normalize().dot(view) >= Math.cos((SHOT_FOV / 2 + 4) * Math.PI / 180);
  };
  const ray = new Raycaster();
  const blocked = [];
  for (const m of meshes) m.updateMatrixWorld(true);
  bothSides(meshes, () => {
    for (const { d, p } of points) {
      const dir = p.clone().sub(pose.camera);
      if (!inShot(p)) continue; // (behind the camera, or outside its picture)
      ray.set(pose.camera, dir.clone().normalize());
      ray.far = dir.length() - 0.6;
      const hit = ray.intersectObjects(meshes, false).find((h) => !cut?.contains(h.point));
      if (hit) blocked.push({ at: d, by: (/^scenery: still$|^landmarks$/.test(nameOf(hit.object)) && pieceAt?.(hit.point)) || nameOf(hit.object), point: hit.point.toArray().map((v) => +v.toFixed(1)) });
    }
  });
  const { near, inside } = cameraClearance(pose.camera, meshes, ground, { pieceAt, cut });
  return { blocked, near, inside, looks: points.filter(({ p }) => inShot(p)).length };
}

/**
 * How close the scenery comes to the camera at `cam`: { near: { by, metres } | null, inside: name | null }.
 * `ground`: the land's meshes (for the inside-the-land test: the land's surface above the camera).
 */
export function cameraClearance(cam, meshes, ground, { pieceAt = null, cut = null } = {}) {
  const ray = new Raycaster();
  return bothSides(meshes, () => {
    let near = null;
    for (const d of DIRECTIONS) {
      ray.set(cam, d);
      ray.far = CAMERA_CLEAR;
      const hit = ray.intersectObjects(meshes, false).find((h) => !cut?.contains(h.point));
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


/**
 * The finish camera's picture (Moses, 22 Oct 2026: Ha Long Bay Spins on an iPhone, the station's roof
 * filling the top half, the parked marbles squeezed into a strip behind it, a finished marble right in
 * front of the lens). For one moment of the finish, seen through `camera` (a PerspectiveCamera with its
 * screen's aspect, placed and aimed as the game places it):
 *   cover:  the share of the picture covered by anything drawn high over the finish (a roof, a beam, a
 *           banner, a board, an overhanging rock) nearer than the finishers: rays through a grid of the
 *           picture, counted where the first thing met hangs over the run-in or the catch area, OVERHEAD
 *           metres or more over its floor (the scenery beside the track and the view beyond do not count).
 *   hidden: finished marbles (`finished`: entry indices) not clearly in the picture: outside it, under
 *           the results at the bottom (FRAME.box) or the banner at the top (FRAME.top), or behind something drawn.
 *   lens:   the biggest a marble across the line (`home`: entry indices; all when null) is drawn, as a share
 *           of the picture's height, against its limit (`over` above 1: too big): a parked one (`parked`, or
 *           in `finished`) in the clear part of the picture or anywhere, or one still rolling in.
 * `cut`: { contains(point) } — what the finish camera cuts away (a coaster station's canopy): not drawn, so never in the way.
 * `marbles`: Vector3 per entry index (centres). Looks only: none of it touches a race.
 */
export const FRAME = {
  OVERHEAD: 3,                   // metres over the floor: above a marble and the catch area's walls
  cover: 0.1,                    // at most this share of the picture covered (a small strip)
  top: 0.1,                      // the winner's banner and the medals over the top of the picture
  box: { tall: 0.3, wide: 0.2 }, // the results (the arrivals list) over the bottom
  lens: { band: 0.07, anywhere: 0.1, rolling: 0.12 }, // a marble's drawn size, share of the picture's height: parked, in the clear band / anywhere; still rolling in
  beside: 0.8,                   // metres beyond the run-in's and the catch area's edges that still count as over them
};

export function finishFrame(centerline, channel, camera, meshes, { marbles = [], finished = [], parked: parkedAll = null, home = null, cut = null, grid = 24, pieceAt = null } = {}) {
  const { samples } = centerline;
  const end = samples[samples.length - 1];
  const forward = new Vector3(end.tangent.x, 0, end.tangent.z).normalize();
  const side = new Vector3(end.side.x, 0, end.side.z).normalize();
  const pen = channel.runout ?? { length: 30, halfWidth: 3.5 };
  // What lies under a point: over the catch area past the line, over the run-in before it (its own floor
  // height, coming down to the line), or beside them (null). → the floor's height there.
  const segs = centerline.segments ?? samples.length - 1;
  const runInFrom = Math.max(0, segs - Math.round(segs * 0.15));
  const floorUnder = (p) => {
    const rel = p.clone().sub(end.pos);
    const d = rel.dot(forward);
    if (d >= 0) return d <= pen.length && Math.abs(rel.dot(side)) <= pen.halfWidth + FRAME.beside ? end.pos.y - d * PEN_DROP : null;
    let best = segs;
    let bestD = Infinity;
    for (let i = runInFrom; i <= segs; i += 1) {
      const h = (samples[i].pos.x - p.x) ** 2 + (samples[i].pos.z - p.z) ** 2;
      if (h < bestD) { bestD = h; best = i; }
    }
    const q = samples[best];
    const arc = (best / segs) * channel.arc;
    const half = channelRadiusAt(channel, arc) * Math.sin(channelLipAt(channel, arc));
    const across = Math.abs((p.x - q.pos.x) * q.side.x + (p.z - q.pos.z) * q.side.z) / (Math.hypot(q.side.x, q.side.z) || 1);
    return across <= half + FRAME.beside ? q.pos.y : null;
  };
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  const tall = camera.aspect < 1;
  const box = tall ? FRAME.box.tall : FRAME.box.wide;
  const far = end.pos.clone().addScaledVector(forward, pen.length);
  const reach = camera.position.distanceTo(far) + 3;
  const ray = new Raycaster();
  const first = (hits) => hits.find((h) => !cut?.contains(h.point));
  const label = (h) => (/^scenery: still$|^landmarks$|^grandstands$/.test(nameOf(h.object)) && pieceAt?.(h.point)) || nameOf(h.object);
  for (const m of meshes) m.updateMatrixWorld(true);
  return bothSides(meshes, () => {
    // The cover: a grid of rays through the picture.
    // (About grid × grid / 2 rays, whatever the screen's shape.)
    const rows = grid ? Math.round(grid / Math.sqrt(2 * camera.aspect)) : 0;
    const cols = rows ? Math.max(8, Math.round(rows * camera.aspect)) : 0;
    let covered = 0;
    const by = {};
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        ray.setFromCamera({ x: ((c + 0.5) / cols) * 2 - 1, y: 1 - ((r + 0.5) / rows) * 2 }, camera);
        ray.far = reach;
        const hit = first(ray.intersectObjects(meshes, false));
        if (!hit) continue;
        // Only what hangs over the run-in or the catch area counts: not the scenery beside them, nor the view beyond.
        const floor = floorUnder(hit.point);
        if (floor === null || hit.point.y < floor + FRAME.OVERHEAD) continue;
        covered += 1;
        const name = label(hit);
        by[name] = (by[name] ?? 0) + 1;
      }
    }
    const cover = rows ? covered / (rows * cols) : null;
    // The finished marbles: in the clear part of the picture, nothing drawn in front of them.
    const hidden = [];
    for (const k of finished) {
      const p = marbles[k];
      if (!p) continue;
      const v = p.clone().project(camera);
      const x = (v.x + 1) / 2;
      const y = (1 - v.y) / 2;
      if (v.z > 1 || x < 0.03 || x > 0.97 || y < FRAME.top || y > 1 - box) {
        hidden.push({ index: k, why: v.z > 1 ? 'behind the camera' : y > 1 - box ? 'under the results' : y < FRAME.top ? 'under the banner' : 'out of the picture', at: [+x.toFixed(2), +y.toFixed(2)] });
        continue;
      }
      const dir = p.clone().sub(camera.position);
      ray.set(camera.position, dir.clone().normalize());
      ray.far = dir.length() - 0.6;
      const hit = first(ray.intersectObjects(meshes, false));
      if (hit) hidden.push({ index: k, why: `behind ${label(hit)}`, at: [+x.toFixed(2), +y.toFixed(2)] });
    }
    // The nearest marble: how big it is drawn (only where it is in the picture).
    const tan = Math.tan((camera.fov * Math.PI) / 360);
    let lens = null;
    marbles.forEach((p, k) => {
      if (!p || (home && !home.includes(k))) return;
      const v = p.clone().project(camera);
      if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) return;
      const size = (2 * MARBLE_R) / (camera.position.distanceTo(p) * 2 * tan);
      const y = (1 - v.y) / 2;
      const inBand = y >= FRAME.top && y <= 1 - box;
      const parked = finished.includes(k) || parkedAll?.includes(k);
      const over = size / (!parked ? FRAME.lens.rolling : inBand ? FRAME.lens.band : FRAME.lens.anywhere);
      if (!lens || over > lens.over) lens = { index: k, size: +size.toFixed(3), at: [+((v.x + 1) / 2).toFixed(2), +y.toFixed(2)], inBand, parked, over: +over.toFixed(2) };
    });
    return { cover: cover === null ? null : +cover.toFixed(3), coverBy: Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, k]) => `${n} ${Math.round((k / (rows * cols)) * 100)}%`), hidden, lens };
  });
}
const MARBLE_R = 0.55; // (as src/three/marbles.js MARBLE_RADIUS)
