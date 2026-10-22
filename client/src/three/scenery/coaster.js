/**
 * Coasters (kit tracks of the coaster family): the channel dressed as a roller
 * coaster and flown on steel supports above the land, a lift hill behind the
 * gate, a station at the finish, water under the stretches that cross it.
 * Looks only: the race is exactly the ice channel's.
 *
 *   coasterFlight: how high the track flies above the land at every sample
 *     (a section's `height`, else the coaster's; 0 where it touches down),
 *     eased from one height to the next and down to each touchdown;
 *   buildCoaster: twin steel rails along the rims, a spine and cross-ties under
 *     the channel, lattice A-frame towers down to the land (fewer, plainer on
 *     phones), the lift hill and its chain, the station and its queue, water
 *     curtains, and a tower under each billboard that stands on one.
 */
import { BoxGeometry, BufferGeometry, CircleGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial, Vector3 } from 'three';
import { channelLipAt, channelRadiusAt, forkAt, forkOffset, forkRadius } from '../iceChannel';
import { box, merge, piece } from './parts';

const UP = new Vector3(0, 1, 0);
const SKIRT = 1.6;           // the channel's outer wall reaches this far below its floor (iceChannel.js)
const RIM_WIDTH = 0.45;      // its rim beyond the lip
const EASE_M = 25;           // metres either side over which the height eases from one section's to the next
const TOUCHDOWN_RISE = 0.4;  // the track climbs away from a touchdown no steeper than this (metres up per metre along)
const LIFTED = 0.6;          // metres: higher than this above the land, a sample is on supports (no banks)
const LIFT_GRADE = 0.75;     // the lift hill's slope behind the gate
const LIFT_RISE = 14;        // metres it climbs above the track's height at the gate
const LIFT_CUT = 14;         // metres either side of it the land lies below it…
const LIFT_CUT_EDGE = 26;    // …and over which it rises back to the hillside
export const STATION = { before: 14, length: 44, roof: 6.5, platform: 2.6 }; // metres: the station over the finish and run-out

/**
 * A light steel member from a to b: a three-sided prism without ends (6 triangles,
 * half a box's), for the hundreds of rails, ties, legs and braces a coaster has.
 */
function strut(a, b, t, colour) {
  const dir = new Vector3().subVectors(b, a).normalize();
  const u = Math.abs(dir.y) > 0.9 ? new Vector3(1, 0, 0) : UP.clone();
  const p = new Vector3().crossVectors(dir, u).normalize();
  const q = new Vector3().crossVectors(dir, p).normalize();
  const r = t * 0.6;
  const corner = (k) => p.clone().multiplyScalar(Math.cos((k * 2 * Math.PI) / 3) * r).addScaledVector(q, Math.sin((k * 2 * Math.PI) / 3) * r);
  const pos = [];
  for (let k = 0; k < 3; k += 1) {
    const c0 = corner(k);
    const c1 = corner(k + 1);
    const a0 = a.clone().add(c0);
    const a1 = a.clone().add(c1);
    const b0 = b.clone().add(c0);
    const b1 = b.clone().add(c1);
    for (const v of [a0, b0, b1, a0, b1, a1]) pos.push(v.x, v.y, v.z);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return piece(g, colour);
}

/** How high (metres) the track flies above the land at every sample, 0 where it touches down. */
export function coasterFlight(centerline, channel, kit) {
  const { segments } = centerline;
  const step = channel.arc / segments;
  const sections = kit.sections ?? [];
  const base = kit.coaster?.height ?? 16;
  const target = [];
  for (let i = 0; i <= segments; i += 1) {
    const p = i / segments;
    const sec = sections.find((x) => p >= x.from && p <= x.to);
    target.push(sec?.height ?? base);
  }
  // Eased between sections (an average over EASE_M either side)…
  const reach = Math.max(1, Math.round(EASE_M / step));
  const eased = target.map((_, i) => {
    let sum = 0;
    let n = 0;
    for (let k = Math.max(0, i - reach); k <= Math.min(segments, i + reach); k += 1) { sum += target[k]; n += 1; }
    return sum / n;
  });
  // …and never higher than a gentle climb away from the nearest touchdown, so it really meets the land there.
  const down = [];
  target.forEach((h, i) => { if (h === 0) down.push(i); });
  return eased.map((h, i) => {
    if (!down.length) return h;
    let d = Infinity;
    for (const k of down) d = Math.min(d, Math.abs(k - i) * step);
    return Math.min(h, d * TOUCHDOWN_RISE);
  });
}

/** Is sample i on supports (rather than on the land)? */
export const isLifted = (flight, i) => flight[i] > LIFTED;

/** The channel's half-width to its outer rim edge at sample i (both channels' at a splitter). */
function edgeAt(channel, i, step) {
  const s = i * step;
  const fork = forkAt(channel, s);
  if (fork) return Math.abs(forkOffset(fork, s)) + forkRadius(fork, channel.radius, s) * Math.sin(channel.maxAngle) + RIM_WIDTH;
  return channelRadiusAt(channel, s) * Math.sin(channelLipAt(channel, s)) + RIM_WIDTH;
}
const topAt = (channel, i, step) => {
  const s = i * step;
  return channelRadiusAt(channel, s) * (1 - Math.cos(channelLipAt(channel, s)));
};

/** The rails' thickness (strut's t: a triangular beam of half-width about 0.6·t). */
export const RAIL_THICKNESS = 0.36;
/** How far (metres, seen from above) a rail piece may stray from the rim between its ends. */
const RAIL_STRAY = 0.06;

/**
 * The coaster's two rails along the middle of the rims, as polylines (one per side): long straight
 * pieces (`lite`: up to 6 samples, else 3) where the track runs straight, and shorter ones on the
 * bends, so that no piece cuts the corner over the running surface (Moses, 21 Oct 2026: on Beijing
 * Nest 200's hairpin the 12 m pieces on a phone crossed the floor). Looks only.
 */
export function coasterRails(centerline, channel, { lite = false } = {}) {
  const { samples, segments } = centerline;
  const step = channel.arc / segments;
  const maxStep = lite ? 6 : 3;
  const lines = [];
  for (const sign of [1, -1]) {
    const at = (i) => {
      const s = samples[i];
      const side = new Vector3(s.side.x, 0, s.side.z).normalize();
      return s.pos.clone().addScaledVector(side, sign * (edgeAt(channel, i, step) - RIM_WIDTH * 0.5)).addScaledVector(UP, topAt(channel, i, step) + 0.2);
    };
    const pts = Array.from({ length: segments + 1 }, (_, i) => at(i));
    // Horizontal distance from p to the piece a–b.
    const stray = (p, a, b) => {
      const dx = b.x - a.x; const dz = b.z - a.z; const L = dx * dx + dz * dz;
      const t = L ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / L)) : 0;
      return Math.hypot(p.x - (a.x + t * dx), p.z - (a.z + t * dz));
    };
    const line = [pts[0]];
    let i = 0;
    while (i < segments) {
      let j = Math.min(segments, i + maxStep);
      while (j > i + 1) {
        let worst = 0;
        for (let k = i + 1; k < j; k += 1) worst = Math.max(worst, stray(pts[k], pts[i], pts[j]));
        if (worst <= RAIL_STRAY) break;
        j -= 1;
      }
      line.push(pts[j]);
      i = j;
    }
    lines.push(line);
  }
  return lines;
}

/**
 * How the coaster starts (the varied starts, `kit.start.type`): what stands behind the gate.
 *   straight-lift: a straight chain lift hill from its foot up to the gate (every coaster's, before);
 *   curving-lift:  the chain lift curving away to one side as it falls back;
 *   spiral-tower:  the lift winding round a lattice tower;
 *   elevator:      a vertical lift shaft behind the gate, a short bridge from its cage to the gate;
 *   cliff:         the gate on a ledge at the edge of a cliff top (the land raised behind it);
 *   rooftop:       the gate at the edge of a tall building's roof;
 *   station-launch: a launch platform behind the gate (the opening's boost launches the field);
 *   stepped-platform: the gate on top of a platform of broad stone steps, stepping down behind and to the sides.
 *   lighthouse:    a striped lighthouse behind the gate, its gallery level with the gate, a short bridge on to it;
 *   ski-jump:      a ski jump's in-run rising on from the gate to a start hut high behind it, on a concrete tower.
 *   castle-tower:  the gate on top of a great round tower with battlements, in the coaster's support colour.
 *   pier:          (Rivers) the gate at the end of a long wooden pier on piles, out over a pool of the river;
 *   river-boat:    (Rivers) a moored river boat behind the gate, its top deck level with the gate, a gangway on to it;
 *   lock-gate:     (Rivers) the gate is a lock's gate: a lock chamber behind it, full of high water.
 * Returns { type, top, foot, back, side, length, path (top to foot, for a chain lift), cut
 * (the land carved down along the path, so the whole climb shows), plateau (a cliff top) }.
 * `foot` is where the start's landmark is placed beyond, and the countdown's lift shot looks.
 */
export function liftHillOf(centerline, flight, type = 'straight-lift') {
  const s0 = centerline.samples[0];
  const back = new Vector3(-s0.tangent.x, 0, -s0.tangent.z).normalize();
  const side = new Vector3(s0.side.x, 0, s0.side.z).normalize();
  const top = s0.pos.clone();
  const rise = (flight?.[0] ?? 0) + LIFT_RISE;
  const go = (from, b, s, d, y) => from.clone().addScaledVector(back, b).addScaledVector(side, s).setY(y ?? from.y - d);
  let path = null;
  let cut = true;
  let plateau = null;
  let foot;
  if (type === 'curving-lift') {
    const length = rise / LIFT_GRADE;
    const turn = (110 * Math.PI) / 180;
    const R = (length - 6) / turn;
    path = [top.clone(), go(top, 6, 0, 6 * LIFT_GRADE)];
    for (let k = 1; k <= 12; k += 1) {
      const th = (turn * k) / 12;
      path.push(go(top, 6 + R * Math.sin(th), R * (1 - Math.cos(th)), (6 + R * th) * LIFT_GRADE));
    }
  } else if (type === 'spiral-tower') {
    const R = 11;
    const turns = 1.25 * 2 * Math.PI;
    const length = 6 + R * turns;
    const grade = rise / length;
    path = [top.clone(), go(top, 6, 0, 6 * grade)];
    for (let k = 1; k <= 30; k += 1) {
      const th = (turns * k) / 30;
      path.push(go(top, 6 + R * Math.sin(th), R * (1 - Math.cos(th)), (6 + R * th) * grade));
    }
  } else if (type === 'elevator') {
    path = [top.clone(), go(top, ELEVATOR.at, 0, 0)];
    foot = go(top, ELEVATOR.at, 0, rise);
  } else if (type === 'cliff') {
    path = [top.clone(), go(top, CLIFF.edge, 0, 0)];
    cut = false;
    plateau = { y: top.y - 2.4, edge: CLIFF.edge, half: CLIFF.half, depth: CLIFF.depth };
    foot = go(top, 14, 0, 0, plateau.y);
  } else if (type === 'rooftop') {
    path = [top.clone(), go(top, ROOF.depth, 0, 0)];
    foot = go(top, 12, 0, 0);
  } else if (type === 'stepped-platform') {
    path = [top.clone(), go(top, STEPS.depth(STEPS.tiers - 1), 0, 0)];
    foot = go(top, 14, 0, 0);
  } else if (type === 'station-launch') {
    path = [top.clone(), go(top, 12, 0, 0)];
    cut = false;
    foot = go(top, 12, 0, 0);
  } else if (type === 'lighthouse') {
    path = [top.clone(), go(top, LIGHTHOUSE.at, 0, 0)];
    foot = go(top, LIGHTHOUSE.at, 0, rise);
  } else if (type === 'castle-tower') {
    path = [top.clone(), go(top, CASTLE_TOWER.at, 0, 0)];
    foot = go(top, CASTLE_TOWER.at, 0, rise);
  } else if (type === 'pier') {
    path = [top.clone(), go(top, PIER.length, 0, 0)];
    cut = false;
    foot = go(top, PIER.length - 6, 0, 0);
  } else if (type === 'river-boat') {
    path = [top.clone(), go(top, BOAT.at, 0, 0)];
    cut = false;
    foot = go(top, BOAT.at, 0, 0);
  } else if (type === 'lock-gate') {
    path = [top.clone(), go(top, LOCK.length, 0, 0)];
    cut = false;
    foot = go(top, LOCK.length, 0, 0);
  } else if (type === 'ski-jump') {
    // (Up from the gate: the in-run's top, with its start hut, stands SKI_JUMP.rise over the gate.)
    path = [top.clone(), go(top, SKI_JUMP.length, 0, -SKI_JUMP.rise)];
    cut = false;
    foot = path[1].clone();
  } else {
    path = [top.clone(), go(top, rise / LIFT_GRADE, 0, rise)];
  }
  let length = 0;
  for (let k = 1; k < path.length; k += 1) length += Math.hypot(path[k].x - path[k - 1].x, path[k].z - path[k - 1].z);
  foot = foot ?? path[path.length - 1].clone();
  return { type, top, foot, back, side, length, path, cut, plateau, rise };
}
const ELEVATOR = { at: 12, half: 3.2 };        // metres: the shaft's middle behind the gate, its half-width
const CLIFF = { edge: 8, half: 30, depth: 80 }; // metres: the cliff edge behind the gate, the cliff top's half-width and depth
const ROOF = { depth: 24, half: 11 };          // metres: the building behind the gate
// The stepped platform: its tiers (the top one just under the gate), each this much deeper, wider and lower than the one above.
const LIGHTHOUSE = { at: 14, radius: 4.2 };    // metres: the lighthouse's middle behind the gate, its radius at the gallery
const CASTLE_TOWER = { at: 12, radius: 8 };     // metres: the tower's middle behind the gate, its radius
const PIER = { length: 34, half: 5.5 };        // metres: the pier behind the gate, its deck's half-width
const BOAT = { at: 18, half: 6, length: 30 };   // metres: the boat's middle behind the gate, its half-beam and length
const LOCK = { length: 36, half: 6.5 };         // metres: the lock chamber behind the gate, its half-width inside the walls
const SKI_JUMP = { length: 34, rise: 14, half: 3 }; // metres: the in-run behind the gate (along, up), its half-width
const STEPS = { tiers: 4, depth: (k) => 10 + 6 * k, half: (k) => 8 + 4 * k, drop: 2.6, colours: ['#c9a676', '#b38f60'] };

/** How low the land must lie at (x, z) to show the lift (Infinity away from it): below its path, falling away either side. */
export function liftHillCut(lift, x, z) {
  if (!lift.cut) return Infinity;
  const { path } = lift;
  const reach = LIFT_CUT + LIFT_CUT_EDGE;
  let best = Infinity;
  let lineY = 0;
  for (let k = 1; k < path.length; k += 1) {
    const a = path[k - 1];
    const b = path[k];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len2 = dx * dx + dz * dz || 1;
    const t = Math.min(1, Math.max(0, ((x - a.x) * dx + (z - a.z) * dz) / len2));
    const d = Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
    if (d < best) { best = d; lineY = a.y + (b.y - a.y) * t; }
  }
  // (And a little beyond the gate end and the foot, as the straight lift always had.)
  const { top, back } = lift;
  const along = (x - top.x) * back.x + (z - top.z) * back.z;
  if (along < -10 || best > reach) return Infinity;
  const k = best <= LIFT_CUT ? 0 : (best - LIFT_CUT) / LIFT_CUT_EDGE;
  return lineY - 2.5 + k * k * 60;
}

/** A cliff start: the land at (x, z) given its height h, raised to the cliff top behind the gate. */
export function liftHillRaise(lift, x, z, h) {
  const pl = lift.plateau;
  if (!pl) return h;
  const { top, back, side } = lift;
  const dx = x - top.x;
  const dz = z - top.z;
  const along = dx * back.x + dz * back.z;
  const across = Math.abs(dx * side.x + dz * side.z);
  if (along < pl.edge - 1 || along > pl.depth + 70 || across > pl.half + 50) return h;
  // (A sheer cliff only at its edge; to the sides and behind, the cliff top slopes back down to the land.)
  const k = Math.min(smooth(pl.edge - 1, pl.edge + 1, along), 1 - smooth(pl.half, pl.half + 50, across), 1 - smooth(pl.depth, pl.depth + 70, along));
  return h + (Math.max(h, pl.y) - h) * k;
}
function smooth(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** The station over the finish line and the run-out: its middle, the way along, and across. */
export function stationOf(centerline) {
  const { samples, segments } = centerline;
  const end = samples[segments];
  const along = new Vector3(end.tangent.x, 0, end.tangent.z).normalize();
  const side = new Vector3(end.side.x, 0, end.side.z).normalize();
  const centre = end.pos.clone().addScaledVector(along, STATION.length / 2 - STATION.before);
  return { centre, along, side, floorY: end.pos.y };
}

/**
 * The station canopy as a slab, for the follow camera (the camera rule: it is never
 * blocked): its footprint ({ centre, along, side, halfLength, halfWidth }) and its
 * underside and top, with the front beam that hangs below it counted in.
 */
export function stationRoof(st) {
  const rimY = st.floorY + 1.6;
  return { centre: st.centre, along: st.along, side: st.side, halfLength: STATION.length / 2 + 1.6, halfWidth: 8.2, bottom: rimY + STATION.roof - 1.1, top: rimY + STATION.roof + 0.7 };
}

/** Does the line of sight from a to b pass through the station canopy? (A slab test in the canopy's own frame.) */
export function roofBlocks(roof, a, b) {
  const local = (p) => {
    const dx = p.x - roof.centre.x;
    const dz = p.z - roof.centre.z;
    return [dx * roof.along.x + dz * roof.along.z, p.y, dx * roof.side.x + dz * roof.side.z];
  };
  const p = local(a);
  const q = local(b);
  const lo = [-roof.halfLength, roof.bottom, -roof.halfWidth];
  const hi = [roof.halfLength, roof.top, roof.halfWidth];
  let t0 = 0;
  let t1 = 1;
  for (let k = 0; k < 3; k += 1) {
    const d = q[k] - p[k];
    if (Math.abs(d) < 1e-9) {
      if (p[k] < lo[k] || p[k] > hi[k]) return false;
      continue;
    }
    let ta = (lo[k] - p[k]) / d;
    let tb = (hi[k] - p[k]) / d;
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return false;
  }
  return true;
}

/**
 * The coaster's structure: { group, feet (spots kept clear of trees), liftHill }.
 * groundAt(x, z): the land's height; flight: coasterFlight's heights; boards: the
 * billboards' poses ({ foot, mount }) that stand on towers.
 */
export function buildCoaster(centerline, channel, kit, { lite = false, groundAt, flight, boards = [] }) {
  const { samples, segments } = centerline;
  const step = channel.arc / segments;
  const colours = kit.coaster?.colours ?? {};
  const RAIL = colours.rail ?? '#c9ced6';
  const SUPPORT = colours.support ?? '#c43a2f';
  const TIE = colours.tie ?? '#5b616b';
  const steel = [];   // rails, spine and ties (the track)
  const towers = [];  // the supports and the lift hill
  const station = []; // the station
  const feet = [];
  const group = new Group();
  group.name = 'coaster';
  const frameAt = (i) => {
    const s = samples[i];
    return { s, side: new Vector3(s.side.x, 0, s.side.z).normalize(), along: new Vector3(s.tangent.x, 0, s.tangent.z).normalize() };
  };

  // Rails along both rims (following the rim: shorter pieces on the bends, coasterRails) and a spine
  // under the floor, one strip of beams along the whole track.
  const railStep = lite ? 6 : 3;
  for (const line of coasterRails(centerline, channel, { lite })) {
    for (let k = 1; k < line.length; k += 1) steel.push(strut(line[k - 1], line[k], RAIL_THICKNESS, RAIL));
  }
  for (let i = 0; i + railStep <= segments; i += railStep) {
    const a = frameAt(i);
    const b = frameAt(i + railStep);
    steel.push(strut(a.s.pos.clone().addScaledVector(UP, -SKIRT - 0.35), b.s.pos.clone().addScaledVector(UP, -SKIRT - 0.35), 0.55, TIE));
  }
  // Cross-ties under the channel, rim to rim.
  const tieEvery = lite ? 8 : 4;
  for (let i = 0; i <= segments; i += Math.max(1, Math.round(tieEvery / step))) {
    const { s, side } = frameAt(i);
    const e = edgeAt(channel, i, step);
    const y = s.pos.y - SKIRT - 0.15;
    steel.push(strut(s.pos.clone().addScaledVector(side, e).setY(y), s.pos.clone().addScaledVector(side, -e).setY(y), 0.22, TIE));
  }

  // The towers: an A-frame of two splayed legs from under the channel down to the land, rungs
  // up it and (computer) a diagonal in each panel. Never one standing in or on another stretch below.
  // The catch area past the line (its floor and walls), where no leg may stand.
  const penEnd = samples[segments];
  const penAlong = new Vector3(penEnd.tangent.x, 0, penEnd.tangent.z).normalize();
  const penSide = new Vector3(penEnd.side.x, 0, penEnd.side.z).normalize();
  const inPen = (p) => {
    const r = channel.runout;
    if (!r) return false;
    const dx = p.x - penEnd.pos.x;
    const dz = p.z - penEnd.pos.z;
    const u = dx * penAlong.x + dz * penAlong.z;
    const w = dx * penSide.x + dz * penSide.z;
    return u > 0.5 && u < r.length + 3 && Math.abs(w) < r.halfWidth + 2 && p.y < penEnd.pos.y + 4;
  };
  const below = (foot, i, topY) => samples.some((o, j) => Math.abs(j - i) * step >= 40 && o.pos.y < topY - 1
    && Math.hypot(o.pos.x - foot.x, o.pos.z - foot.z) < edgeAt(channel, j, step) + 2.5);
  // (`coaster.style` 'timber': wooden trestle bents instead of steel A-frames: near-upright posts,
  // close ties and cross-bracing in every panel, as the old mining railways' trestles.)
  const timber = kit.coaster?.style === 'timber';
  // (`coaster.style` 'blocks' (the Block Series): two upright pillars of stacked cubes in two tones
  // of the support colour, and a cube beam across under the channel.)
  const blocks = kit.coaster?.style === 'blocks';
  // (`coaster.style` 'concrete' (Track and Field's ramps): two slim grey columns and a beam, as a stadium's concourse.)
  const concrete = kit.coaster?.style === 'concrete';
  const CUBE = 1.6;
  const SUPPORT_DARK = `#${new Color(SUPPORT).multiplyScalar(0.78).getHexString()}`;
  const tower = (top, side, half, i, { light = lite } = {}) => {
    const landY = groundAt(top.x, top.z);
    const h = top.y - landY;
    if (h < 1.2) return;
    const splay = blocks || concrete ? 0 : timber ? Math.min(0.1 * h, 3.5) : Math.min(0.18 * h, 6);
    const legs = [1, -1].map((sign) => {
      const a = top.clone().addScaledVector(side, sign * half);
      const b = top.clone().addScaledVector(side, sign * (half + splay));
      b.y = groundAt(b.x, b.z) - 0.4;
      return [a, b];
    });
    if (legs.some(([, b]) => below(b, i, top.y))) return;
    if (legs.some(([t, b]) => [0, 0.25, 0.5, 0.75, 1].some((f) => inPen(t.clone().lerp(b, f))))) return; // (nor one standing in the catch area past the line)
    // Nor one another stretch passes through, between its legs or under its rungs: that one spans the gap.
    const along = new Vector3().crossVectors(side, UP).normalize();
    const through = samples.some((o, j) => {
      if ((i >= 0 && Math.abs(j - i) * step < 40) || o.pos.y >= top.y - 1 || o.pos.y < landY - 2) return false;
      const dx = o.pos.x - top.x;
      const dz = o.pos.z - top.z;
      const e = edgeAt(channel, j, step) + 1.5;
      return Math.abs(dx * along.x + dz * along.z) < e && Math.abs(dx * side.x + dz * side.z) < half + splay + e;
    });
    if (through) return;
    if (concrete) {
      const yaw = Math.atan2(side.x, side.z);
      for (const [a, b] of legs) {
        const g = new BoxGeometry(0.9, a.y - b.y, 0.9);
        g.rotateY(yaw);
        g.translate(a.x, (a.y + b.y) / 2, a.z);
        towers.push(piece(g, SUPPORT));
        feet.push({ x: b.x, z: b.z, r: 3 });
      }
      const beamG = new BoxGeometry(half * 2 + 1.2, 0.9, 1.1);
      beamG.rotateY(yaw + Math.PI / 2);
      const mid = legs[0][0].clone().lerp(legs[1][0], 0.5);
      beamG.translate(mid.x, mid.y - 0.45, mid.z);
      towers.push(piece(beamG, SUPPORT_DARK));
      return;
    }
    if (blocks) {
      // Each pillar: cubes from the land up to the beam (fewer, bigger ones on phones).
      const size = light ? CUBE * 1.5 : CUBE;
      const yaw = Math.atan2(side.x, side.z);
      for (const [a, b] of legs) {
        const n = Math.max(1, Math.ceil((a.y - b.y) / size));
        const sz = (a.y - b.y) / n;
        for (let k = 0; k < n; k += 1) {
          const g = new BoxGeometry(size, sz * 0.98, size);
          g.rotateY(yaw);
          g.translate(a.x, b.y + sz * (k + 0.5), a.z);
          towers.push(piece(g, k % 2 ? SUPPORT_DARK : SUPPORT));
        }
        feet.push({ x: b.x, z: b.z, r: 3 });
      }
      const beamG = new BoxGeometry(half * 2 + size, size * 0.8, size);
      beamG.rotateY(yaw + Math.PI / 2);
      const mid = legs[0][0].clone().lerp(legs[1][0], 0.5);
      beamG.translate(mid.x, mid.y - size * 0.4, mid.z);
      towers.push(piece(beamG, SUPPORT_DARK));
      return;
    }
    for (const [a, b] of legs) {
      towers.push(strut(a, b, light ? 0.45 : 0.4, SUPPORT));
      feet.push({ x: b.x, z: b.z, r: 3 });
    }
    towers.push(strut(legs[0][0], legs[1][0], 0.4, SUPPORT)); // the crossbeam the channel rests on
    if (timber) {
      const tie = light ? 8 : 4.5;
      const n = Math.max(1, Math.floor(h / tie));
      for (let k = 1; k <= n; k += 1) {
        const t0 = ((k - 1) * tie) / h;
        const t = Math.min(1, (k * tie) / h);
        const l0 = legs[0][0].clone().lerp(legs[0][1], t0);
        const r0 = legs[1][0].clone().lerp(legs[1][1], t0);
        const l = legs[0][0].clone().lerp(legs[0][1], t);
        const r = legs[1][0].clone().lerp(legs[1][1], t);
        towers.push(strut(l, r, 0.32, SUPPORT));
        towers.push(strut(l0, r, 0.24, SUPPORT));
        if (!light) towers.push(strut(r0, l, 0.24, SUPPORT));
      }
      return;
    }
    const rung = light ? 12 : 7;
    const n = Math.floor(h / rung);
    for (let k = 1; k <= n; k += 1) {
      const t = (k * rung) / h;
      const l = legs[0][0].clone().lerp(legs[0][1], t);
      const r = legs[1][0].clone().lerp(legs[1][1], t);
      towers.push(strut(l, r, 0.28, SUPPORT));
      if (!light && k % 2) {
        const t0 = ((k - 1) * rung) / h;
        const l0 = legs[0][0].clone().lerp(legs[0][1], t0);
        const r0 = legs[1][0].clone().lerp(legs[1][1], t0);
        towers.push(k % 2 ? strut(l0, r, 0.2, SUPPORT) : strut(r0, l, 0.2, SUPPORT));
      }
    }
  };
  const every = timber ? (lite ? 16 : 9) : blocks || concrete ? (lite ? 20 : 12) : lite ? 22 : 13; // (a trestle's bents stand closer together)
  let last = -Infinity;
  for (let i = 0; i <= segments; i += 1) {
    if (!isLifted(flight, i) || i * step - last < every) continue;
    last = i * step;
    const { s, side } = frameAt(i);
    const top = s.pos.clone().addScaledVector(UP, -SKIRT - 0.4);
    tower(top, side, Math.max(1.2, edgeAt(channel, i, step) * 0.75), i);
  }
  // A tower under each billboard that stands up at the track.
  for (const b of boards) {
    if (b.mount !== 'tower') continue;
    const landY = groundAt(b.foot.x, b.foot.z);
    if (b.foot.y - landY < 1) continue;
    towers.push(strut(b.foot.clone(), new Vector3(b.foot.x, landY - 0.4, b.foot.z), 0.5, SUPPORT));
    feet.push({ x: b.foot.x, z: b.foot.z, r: 3 });
  }

  // What stands behind the gate (the start type): the lift hill, a lift tower, an elevator shaft, a cliff ledge, a rooftop or a launch platform.
  const lift = liftHillOf(centerline, flight, kit.start?.type);
  buildStart(lift, { towers, feet, tower, groundAt, lite, RAIL, SUPPORT, look: kit.start?.look });

  // The station over the finish and the run-out: a platform each side, a canopy on posts, a queue behind.
  // (Track and Field finishes at a finish line with its photo-finish camera instead: ./athletics.js.)
  const st = stationOf(centerline);
  if (!kit.athletics) {
    const { centre, along, side, floorY } = st;
    const half = 6.5;
    const yaw = Math.atan2(along.x, along.z);
    const place = (geo, p, colour) => {
      geo.rotateY(yaw);
      geo.translate(p.x, p.y, p.z);
      return piece(geo, colour);
    };
    const rimY = floorY + 1.6;
    for (const sign of [1, -1]) {
      const p = centre.clone().addScaledVector(side, sign * (half - STATION.platform / 2 + 0.6));
      p.y = rimY - 0.4;
      station.push(place(new BoxGeometry(STATION.platform, 0.8, STATION.length), p, '#d9d4c8'));
      for (let k = -2; k <= 2; k += 1) {
        const post = centre.clone().addScaledVector(side, sign * (half + 0.4)).addScaledVector(along, k * (STATION.length / 4.4));
        station.push(strut(new Vector3(post.x, groundAt(post.x, post.z) - 0.5, post.z), new Vector3(post.x, rimY + STATION.roof, post.z), 0.4, SUPPORT));
      }
      // The queue: a rail and a row of waiting riders behind the platform.
      if (!lite) {
        for (let k = 0; k < 12; k += 1) {
          const q = centre.clone().addScaledVector(side, sign * (half + 2.2)).addScaledVector(along, -STATION.length / 2 + 4 + k * 3.2);
          q.y = rimY;
          const shirt = ['#c43a2f', '#2f5d9a', '#f2c230', '#2f9a4a', '#f2f2ee', '#7a3fb0'][(k * 7 + (sign > 0 ? 3 : 0)) % 6];
          station.push(box(0.5, 1.1, 0.35, q.x, q.y + 0.55, q.z, shirt));
          station.push(box(0.36, 0.36, 0.36, q.x, q.y + 1.3, q.z, '#e6c39f'));
        }
      }
    }
    const roof = centre.clone();
    roof.y = rimY + STATION.roof + 0.3;
    station.push(place(new BoxGeometry(half * 2 + 3, 0.6, STATION.length + 2), roof, '#2f3540'));
    station.push(place(new BoxGeometry(half * 2 + 3.4, 0.9, 0.5), roof.clone().addScaledVector(along, -STATION.length / 2 - 1).addScaledVector(UP, -0.6), SUPPORT));
  }

  const mat = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
  // (A season track on a phone: its supports and station one mesh, one draw call fewer where both show.)
  const lumped = lite && kit.season;
  for (const [name, parts] of lumped ? [['coaster track', steel], ['coaster supports', [...towers, ...station]]] : [['coaster track', steel], ['coaster supports', towers], ['coaster station', station]]) {
    if (!parts.length) continue;
    const mesh = new Mesh(merge(parts), mat);
    mesh.name = name;
    mesh.userData.built = true;
    group.add(mesh);
  }

  // Water curtains: a see-through sheet falling across the rails (a waterfall the track runs behind).
  const sheets = [];
  for (const sec of kit.sections ?? []) {
    if (!sec.waterCurtain) continue;
    const i = Math.round(((sec.from + sec.to) / 2) * segments);
    const { s, side, along } = frameAt(i);
    const e = edgeAt(channel, i, step) + 1.5;
    const pts = [];
    const cols = 10;
    for (let k = 0; k <= cols; k += 1) {
      const t = k / cols;
      const x = -e + 2 * e * t;
      const yTop = s.pos.y + 9 + 1.5 * Math.sin(t * Math.PI);
      const yBot = s.pos.y + 0.2;
      pts.push([x, yTop, 0.6 * Math.sin(t * Math.PI)], [x, yBot, -0.4]);
    }
    const pos = [];
    for (let k = 0; k < cols; k += 1) {
      const [a, b] = [pts[k * 2], pts[k * 2 + 1]];
      const [c, d] = [pts[k * 2 + 2], pts[k * 2 + 3]];
      for (const p of [a, b, d, a, d, c]) {
        const v = s.pos.clone().addScaledVector(side, p[0]).addScaledVector(along, p[2]);
        pos.push(v.x, p[1], v.z);
      }
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    sheets.push(g);
  }
  if (sheets.length) {
    const curtain = new Mesh(merge(sheets.map((g) => piece(g, '#dff3ff'))), new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.32, depthWrite: false, side: DoubleSide }));
    curtain.name = 'coaster: water curtain';
    group.add(curtain);
  }

  return { group, feet, liftHill: lift, station: st };
}

/**
 * The start's structure (liftHillOf's types) into `towers`: a chain lift along its path (a deck with
 * rails and the chain up its middle, a catwalk and handrail beside it, on towers), and what else the type has.
 */
function buildStart(lift, { towers, feet, tower, groundAt, lite, RAIL, SUPPORT, look = null }) {
  const { type, top, back, side, path } = lift;
  const half = 4;
  const yawOf = (dir) => Math.atan2(dir.x, dir.z);
  const obox = (w, h, d, c, yaw, colour) => piece(new BoxGeometry(w, h, d), colour, new Matrix4().makeRotationY(yaw).setPosition(c));
  const flip = Math.sign(side.x * -back.z + side.z * back.x) || 1; // (the side of each piece of the path, turned with it)
  const deckAlong = (pts, { chain = true, posts = true, legs = true } = {}) => {
    for (let k = 1; k < pts.length; k += 1) {
      const a = pts[k - 1].clone().addScaledVector(UP, -1.1);
      const b = pts[k].clone().addScaledVector(UP, -1.1);
      const dir = new Vector3(b.x - a.x, 0, b.z - a.z);
      const len = dir.length();
      if (len < 0.01) continue;
      dir.normalize();
      const sd = new Vector3(-dir.z, 0, dir.x).multiplyScalar(flip);
      const n = Math.max(1, Math.ceil(len / 4));
      for (let j = 0; j < n; j += 1) {
        const p0 = a.clone().lerp(b, j / n);
        const p1 = a.clone().lerp(b, (j + 1) / n);
        const m = new Matrix4().lookAt(p0, p1, UP);
        m.setPosition(p0.clone().add(p1).multiplyScalar(0.5));
        towers.push(piece(new BoxGeometry(half * 2, 0.35, p0.distanceTo(p1) + 0.05), '#3b3f46', m));
      }
      for (const sign of [1, -1]) towers.push(strut(a.clone().addScaledVector(sd, sign * (half - 0.6)).addScaledVector(UP, 0.45), b.clone().addScaledVector(sd, sign * (half - 0.6)).addScaledVector(UP, 0.45), 0.36, RAIL));
      if (chain) towers.push(strut(a.clone().addScaledVector(UP, 0.3), b.clone().addScaledVector(UP, 0.3), 0.45, '#1e2024'));
      if (posts) {
        towers.push(strut(a.clone().addScaledVector(sd, half + 0.8).addScaledVector(UP, 1.1), b.clone().addScaledVector(sd, half + 0.8).addScaledVector(UP, 1.1), 0.12, RAIL));
        for (let d = 0; d < len; d += lite ? 8 : 4) {
          const p = a.clone().lerp(b, d / len).addScaledVector(sd, half + 0.8);
          towers.push(strut(p, p.clone().addScaledVector(UP, 1.1), 0.1, RAIL));
        }
      }
      if (legs) for (let d = k === 1 ? 4 : 0; d < len; d += lite ? 12 : 7) tower(a.clone().lerp(b, d / len).addScaledVector(UP, -0.4), sd, half - 0.4, -1000);
    }
  };
  const lattice = (centre, hx, hz, y0, y1, yaw, colour, { ring = lite ? 8 : 4 } = {}) => {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const corner = (i, j, y) => new Vector3(centre.x + i * hx * c + j * hz * s, y, centre.z - i * hx * s + j * hz * c);
    const cs = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
    for (const [i, j] of cs) towers.push(strut(corner(i, j, y0), corner(i, j, y1), 0.45, colour));
    for (let y = y0 + ring; y <= y1; y += ring) {
      for (let q = 0; q < 4; q += 1) {
        const [i0, j0] = cs[q];
        const [i1, j1] = cs[(q + 1) % 4];
        towers.push(strut(corner(i0, j0, y), corner(i1, j1, y), 0.25, colour));
        if (!lite) towers.push(strut(corner(i0, j0, y - ring), corner(i1, j1, y), 0.16, colour));
      }
    }
  };

  if (type === 'elevator' && look === 'bridge-tower') {
    // (Rivers) The lift inside a bridge tower: a square stone tower behind the gate, its lift door level with
    // the gate and a short deck on to it, slim corner turrets, a steep pointed roof and a raised bascule leaf
    // standing up beside it.
    const at = top.clone().addScaledVector(back, ELEVATOR.at + 1.5);
    const yaw = yawOf(back);
    const landY = groundAt(at.x, at.z) - 0.5;
    const W = 9;
    const STONE = '#cfc6b2';
    const h = top.y + 9 - landY;
    towers.push(obox(W, h, W, at.clone().setY(landY + h / 2), yaw, STONE));
    // Bands of tall windows on the face towards the gate, and the lift door.
    for (let y = top.y + 3; y > landY + 4; y -= lite ? 9 : 4.5) for (const k of [-2.2, 2.2]) towers.push(obox(1.1, 2.6, 0.2, at.clone().addScaledVector(back, -W / 2 - 0.05).addScaledVector(side, k).setY(y), yaw, '#3a4250'));
    towers.push(obox(3.4, 3, 0.25, at.clone().addScaledVector(back, -W / 2 - 0.08).setY(top.y + 0.4), yaw, '#2a2e36'));
    // The corner turrets and the roof.
    for (const [i, j] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) {
      const c = at.clone().addScaledVector(back, i * (W / 2 - 0.6)).addScaledVector(side, j * (W / 2 - 0.6));
      towers.push(obox(1.6, 6, 1.6, c.clone().setY(top.y + 12), yaw, STONE));
      towers.push(piece(new ConeGeometry(1.2, 3.4, 4), '#4a5a6a', new Matrix4().makeRotationY(yaw + Math.PI / 4).setPosition(c.clone().setY(top.y + 16.7))));
    }
    towers.push(piece(new ConeGeometry(W * 0.62, 9, 4), '#4a5a6a', new Matrix4().makeRotationY(yaw + Math.PI / 4).setPosition(at.clone().setY(top.y + 13.5))));
    towers.push(obox(W + 0.6, 0.8, W + 0.6, at.clone().setY(top.y + 9.2), yaw, '#b8ae98'));
    // A raised bascule leaf beside the tower (to one side of the track, standing up).
    const leaf = at.clone().addScaledVector(side, -(W / 2 + 5)).addScaledVector(back, 0);
    towers.push(obox(7, 16, 1.2, leaf.clone().setY(top.y - 2 + 8), yaw + Math.PI / 2, '#6a7f8f'));
    towers.push(obox(7.2, 0.6, 1.4, leaf.clone().setY(top.y - 2 + 15.4), yaw + Math.PI / 2, '#d8cfa8'));
    deckAlong([top, top.clone().addScaledVector(back, ELEVATOR.at + 1.5 - W / 2)], { chain: false });
    feet.push({ x: at.x, z: at.z, r: 12 });
  } else if (type === 'elevator' && look === 'port-crane') {
    // (Rivers) The lift up a port crane: its lattice tower behind the gate in crane yellow, the operator's cab at
    // the top, a long jib out to one side with its hook hanging, a counter-jib and its weights the other way.
    const at = top.clone().addScaledVector(back, ELEVATOR.at);
    const yaw = yawOf(back);
    const landY = groundAt(at.x, at.z) - 0.5;
    const CRANE = '#e8a52a';
    lattice(at, ELEVATOR.half, ELEVATOR.half, landY, top.y + 8, yaw, CRANE);
    deckAlong([top, top.clone().addScaledVector(back, ELEVATOR.at - ELEVATOR.half)], { chain: false });
    towers.push(obox(ELEVATOR.half * 2 + 1, 0.6, ELEVATOR.half * 2 + 1, at.clone().setY(top.y + 8.3), yaw, '#3b3f46'));
    towers.push(obox(4, 3, 3.4, at.clone().addScaledVector(back, -1).setY(top.y + 10.2), yaw, '#f2efe6'), obox(4.1, 1, 3.5, at.clone().addScaledVector(back, -1).setY(top.y + 10.6), yaw, '#2b3c52'));
    const jibY = top.y + 13;
    const out = side.clone().multiplyScalar(-1);
    const tip = at.clone().addScaledVector(out, 30).setY(jibY);
    const tail = at.clone().addScaledVector(out, -11).setY(jibY);
    towers.push(strut(tail, tip, 1.2, CRANE), strut(tail.clone().setY(jibY - 1.6), tip.clone().setY(jibY - 0.6), 0.5, CRANE));
    const peak = at.clone().setY(jibY + 7);
    towers.push(strut(at.clone().setY(top.y + 8.6), peak, 0.8, CRANE), strut(peak, tip, 0.18, '#2a2e30'), strut(peak, tail, 0.18, '#2a2e30'));
    towers.push(obox(3.2, 3, 3.2, tail.clone().setY(jibY - 1.2), yaw, '#7a7f86')); // the counterweights
    const hook = at.clone().addScaledVector(out, 24);
    towers.push(strut(hook.clone().setY(jibY - 0.8), hook.clone().setY(jibY - 9), 0.1, '#2a2e30'), obox(1.2, 1, 0.8, hook.clone().setY(jibY - 9.5), yaw, '#c8302a'));
    feet.push({ x: at.x, z: at.z, r: 8 }, { x: hook.x, z: hook.z, r: 6 });
  } else if (type === 'elevator') {
    // A lattice shaft behind the gate, its cage at the top, a short bridge on to the gate and a winding wheel above.
    const at = top.clone().addScaledVector(back, ELEVATOR.at);
    const yaw = yawOf(back);
    const landY = groundAt(at.x, at.z) - 0.5;
    lattice(at, ELEVATOR.half, ELEVATOR.half, landY, top.y + 6, yaw, SUPPORT);
    deckAlong([top, top.clone().addScaledVector(back, ELEVATOR.at - ELEVATOR.half)], { chain: false });
    const cage = at.clone().setY(top.y - 1.1);
    towers.push(obox(ELEVATOR.half * 2 - 0.8, 0.4, ELEVATOR.half * 2 - 0.8, cage, yaw, '#3b3f46'));
    towers.push(obox(ELEVATOR.half * 2 - 0.8, 0.3, ELEVATOR.half * 2 - 0.8, cage.clone().setY(top.y + 2.6), yaw, '#f2c230'));
    for (const [i, j] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) {
      const p = cage.clone().addScaledVector(back, i * (ELEVATOR.half - 0.6)).addScaledVector(side, j * (ELEVATOR.half - 0.6));
      towers.push(strut(p, p.clone().setY(top.y + 2.6), 0.18, '#f2c230'));
    }
    towers.push(obox(0.5, 3.2, 3.2, at.clone().setY(top.y + 7.6), yawOf(side), '#1e2024')); // the winding wheel
    towers.push(strut(at.clone().setY(top.y + 7.6), cage.clone().setY(top.y + 2.6), 0.12, '#1e2024'));
    feet.push({ x: at.x, z: at.z, r: 8 });
  } else if (type === 'cliff') {
    // A plank ledge out from the cliff edge to the gate, and the rock face below the edge.
    const pl = lift.plateau;
    deckAlong([top, top.clone().addScaledVector(back, pl.edge + 2)], { chain: false, legs: false });
    const faceH = lift.rise + 18;
    const face = top.clone().addScaledVector(back, pl.edge + 0.6).setY(pl.y - faceH / 2);
    towers.push(obox(pl.half * 2 + 4, faceH, 2.4, face, yawOf(back), '#6f6a62'));
    // (A few boulders along the edge.)
    for (let k = -3; k <= 3; k += 1) {
      if (k === 0) continue;
      const b = top.clone().addScaledVector(back, pl.edge + 2.5 + (k % 2)).addScaledVector(side, k * 7.5).setY(pl.y + 0.4);
      towers.push(obox(2.4 + (k & 1), 1.6, 2, b, k * 0.7, '#7d776d'));
    }
    feet.push({ x: lift.foot.x, z: lift.foot.z, r: 14 });
  } else if (type === 'rooftop' && look === 'mansard') {
    // (Rivers) A stone apartment building on the quay behind the gate, its roof terrace just under the track: cream
    // stone floors with tall windows and iron balconies, a mansard roof of grey zinc round the terrace with dormers,
    // and chimney stacks along its back.
    const yaw = yawOf(back);
    const mid = top.clone().addScaledVector(back, ROOF.depth / 2 - 1);
    const roofY = top.y - 2.0;
    let low = Infinity;
    for (const [i, j] of [[0, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]) low = Math.min(low, groundAt(mid.x + back.x * i * ROOF.depth / 2 + side.x * j * ROOF.half, mid.z + back.z * i * ROOF.depth / 2 + side.z * j * ROOF.half));
    const mans = 4; // the mansard storey under the terrace
    const h = roofY - mans - low + 1;
    towers.push(obox(ROOF.half * 2, h, ROOF.depth, mid.clone().setY(low - 1 + h / 2), yaw, '#e8dcc2'));
    towers.push(obox(ROOF.half * 2 - 1.2, mans, ROOF.depth - 1.2, mid.clone().setY(roofY - mans / 2), yaw, '#6f7a84'));
    towers.push(obox(ROOF.half * 2 + 0.6, 0.6, ROOF.depth + 0.6, mid.clone().setY(roofY - mans), yaw, '#cfc2a6')); // the cornice
    const floors = Math.max(1, Math.floor((h - 3) / (lite ? 7 : 3.5)));
    for (let f = 0; f < floors; f += 1) {
      const y = low + 3 + f * (h - 3) / floors;
      for (const sign of [1, -1]) {
        for (let d = -ROOF.depth / 2 + 3; d <= ROOF.depth / 2 - 3; d += lite ? 6 : 3) towers.push(obox(0.2, 1.8, 1.3, mid.clone().addScaledVector(side, sign * (ROOF.half + 0.05)).addScaledVector(back, d).setY(y), yaw, '#3a4250'));
        if (!lite) towers.push(obox(0.5, 0.15, ROOF.depth - 4, mid.clone().addScaledVector(side, sign * (ROOF.half + 0.3)).setY(y - 1), yaw, '#2a2e30')); // the iron balconies
      }
    }
    for (const sign of [1, -1]) for (let d = -ROOF.depth / 2 + 4; d <= ROOF.depth / 2 - 4; d += lite ? 8 : 4) {
      towers.push(obox(1, 1.6, 1.4, mid.clone().addScaledVector(side, sign * (ROOF.half - 0.4)).addScaledVector(back, d).setY(roofY - mans / 2), yaw, '#e8dcc2')); // dormers
    }
    // The terrace seen from above (the countdown's shot): pale stone paving, two glazed skylights, planters along its edges.
    towers.push(obox(ROOF.half * 2 - 2.2, 0.2, ROOF.depth - 2.2, mid.clone().setY(roofY + 0.1), yaw, '#d9cfb8'));
    for (const d of [-ROOF.depth / 4, ROOF.depth / 4]) towers.push(obox(ROOF.half * 0.9, 0.5, ROOF.depth / 5, mid.clone().addScaledVector(back, d).setY(roofY + 0.3), yaw, '#8fb2c8'));
    for (const sign of [1, -1]) for (let d = -ROOF.depth / 2 + 3; d <= ROOF.depth / 2 - 3; d += lite ? 9 : 4.5) {
      towers.push(obox(1.2, 0.8, 1.2, mid.clone().addScaledVector(side, sign * (ROOF.half - 2.2)).addScaledVector(back, d).setY(roofY + 0.5), yaw, '#5f8a3e'));
    }
    for (const sign of [1, -1]) towers.push(obox(0.4, 0.9, ROOF.depth - 1, mid.clone().addScaledVector(side, sign * (ROOF.half - 0.8)).setY(roofY + 0.45), yaw, '#2a2e30')); // the terrace's railings
    for (const j of [-6, -2, 2, 6]) towers.push(obox(1.4, 2.4, 0.9, mid.clone().addScaledVector(back, ROOF.depth / 2 - 1.5).addScaledVector(side, j).setY(roofY + 1.2), yaw, '#b86a4a'));
    feet.push({ x: mid.x, z: mid.z, r: ROOF.depth / 2 + ROOF.half });
  } else if (type === 'rooftop') {
    // A tall building behind the gate, its roof just under the track: windows, a parapet, a water tank.
    const yaw = yawOf(back);
    const mid = top.clone().addScaledVector(back, ROOF.depth / 2 - 1);
    const roofY = top.y - 2.0;
    let low = Infinity;
    for (const [i, j] of [[0, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]) low = Math.min(low, groundAt(mid.x + back.x * i * ROOF.depth / 2 + side.x * j * ROOF.half, mid.z + back.z * i * ROOF.depth / 2 + side.z * j * ROOF.half));
    const h = roofY - low + 1;
    towers.push(obox(ROOF.half * 2, h, ROOF.depth, mid.clone().setY(roofY - h / 2), yaw, '#8a8f99'));
    const floors = Math.floor((h - 2) / (lite ? 7 : 3.5));
    for (let f = 1; f <= floors; f += 1) {
      const y = roofY - f * (h - 2) / (floors + 0.5);
      for (const sign of [1, -1]) towers.push(obox(0.2, 1.4, ROOF.depth - 2, mid.clone().addScaledVector(side, sign * (ROOF.half + 0.05)).setY(y), yaw, '#f4d27a'));
      towers.push(obox(ROOF.half * 2 - 2, 1.4, 0.2, mid.clone().addScaledVector(back, -ROOF.depth / 2 - 0.05).setY(y), yaw, '#f4d27a'));
    }
    for (const sign of [1, -1]) towers.push(obox(0.4, 1, ROOF.depth, mid.clone().addScaledVector(side, sign * (ROOF.half - 0.2)).setY(roofY + 0.5), yaw, '#5d626b'));
    towers.push(obox(ROOF.half * 2, 1, 0.4, mid.clone().addScaledVector(back, ROOF.depth / 2 - 0.2).setY(roofY + 0.5), yaw, '#5d626b'));
    const tank = mid.clone().addScaledVector(back, ROOF.depth / 2 - 5).addScaledVector(side, ROOF.half - 4);
    towers.push(obox(3, 3.4, 3, tank.setY(roofY + 4.2), yaw, '#6b4a33'));
    for (const [i, j] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) {
      const p = tank.clone().addScaledVector(back, i * 1.2).addScaledVector(side, j * 1.2);
      towers.push(strut(p.clone().setY(roofY), p.clone().setY(roofY + 2.5), 0.15, '#3b3f46'));
    }
    feet.push({ x: mid.x, z: mid.z, r: ROOF.depth / 2 + ROOF.half });
  } else if (type === 'stepped-platform') {
    // Broad stone tiers behind the gate, each a step lower, deeper and wider than the one above, down to the land;
    // a flight of steps up the back of each, and a low parapet along the top tier's sides.
    const yaw = yawOf(back);
    const topY = top.y - 2.0;
    let low = Infinity;
    const big = STEPS.tiers - 1;
    for (const [i, j] of [[0, 0], [1, 1], [1, -1], [0, 1], [0, -1]]) {
      const c = top.clone().addScaledVector(back, i * STEPS.depth(big)).addScaledVector(side, j * STEPS.half(big));
      low = Math.min(low, groundAt(c.x, c.z));
    }
    for (let k = big; k >= 0; k -= 1) {
      const y = topY - STEPS.drop * k;
      const h = y - low + 1;
      if (h <= 0.2) continue;
      const d = STEPS.depth(k);
      const mid = top.clone().addScaledVector(back, d / 2 - 1);
      towers.push(obox(STEPS.half(k) * 2, h, d, mid.clone().setY(y - h / 2), yaw, STEPS.colours[k % 2]));
      // (the step's edge, a shade darker)
      towers.push(obox(STEPS.half(k) * 2 + 0.2, 0.35, 0.6, top.clone().addScaledVector(back, d - 1.2).setY(y - 0.1), yaw, '#8f7148'));
      if (k > 0) {
        const stair = top.clone().addScaledVector(back, d - 1 + 1.2);
        for (let st = 0; st < 3; st += 1) towers.push(obox(4.2, STEPS.drop / 3, 1.2, stair.clone().addScaledVector(back, -st * 0.9).setY(y - STEPS.drop + (st + 0.5) * STEPS.drop / 3), yaw, STEPS.colours[(k + 1) % 2]));
      }
    }
    for (const sign of [1, -1]) towers.push(obox(0.6, 1, STEPS.depth(0) - 2, top.clone().addScaledVector(back, STEPS.depth(0) / 2).addScaledVector(side, sign * (STEPS.half(0) - 0.4)).setY(topY + 0.5), yaw, '#8f7148'));
    const mid = top.clone().addScaledVector(back, STEPS.depth(big) / 2);
    feet.push({ x: mid.x, z: mid.z, r: STEPS.depth(big) / 2 + STEPS.half(big) });
  } else if (type === 'lighthouse') {
    // A lighthouse behind the gate in red and white bands, its gallery level with the gate and a short
    // bridge on to it, the lamp room and its cap above.
    const at = top.clone().addScaledVector(back, LIGHTHOUSE.at);
    const landY = groundAt(at.x, at.z) - 0.5;
    const galleryY = top.y - 0.6;
    const bands = Math.max(2, Math.round((galleryY - landY) / 4));
    for (let k = 0; k < bands; k += 1) {
      const y0 = landY + ((galleryY - landY) * k) / bands;
      const y1 = landY + ((galleryY - landY) * (k + 1)) / bands;
      const r0 = LIGHTHOUSE.radius + 1.6 * (1 - k / bands);
      const r1 = LIGHTHOUSE.radius + 1.6 * (1 - (k + 1) / bands);
      towers.push(piece(new CylinderGeometry(r1, r0, y1 - y0, lite ? 10 : 16), k % 2 ? '#f4f2ee' : '#c8302a', new Matrix4().makeTranslation(at.x, (y0 + y1) / 2, at.z)));
    }
    towers.push(piece(new CylinderGeometry(LIGHTHOUSE.radius + 1.4, LIGHTHOUSE.radius + 1.4, 0.5, lite ? 12 : 18), '#3b3f46', new Matrix4().makeTranslation(at.x, galleryY, at.z)));
    towers.push(piece(new CylinderGeometry(2.4, 2.4, 3.2, lite ? 10 : 14), '#ffe9a0', new Matrix4().makeTranslation(at.x, galleryY + 1.9, at.z)));
    towers.push(piece(new ConeGeometry(3, 2.4, lite ? 10 : 14), '#c8302a', new Matrix4().makeTranslation(at.x, galleryY + 4.7, at.z)));
    deckAlong([top, top.clone().addScaledVector(back, LIGHTHOUSE.at - LIGHTHOUSE.radius - 0.6)], { chain: false });
    feet.push({ x: at.x, z: at.z, r: 9 });
  } else if (type === 'castle-tower') {
    // A great round tower behind the gate, its top just under the gate's deck, battlements round it, a door at its foot.
    const at = top.clone().addScaledVector(back, CASTLE_TOWER.at);
    const landY = groundAt(at.x, at.z) - 0.5;
    const topY = top.y - 1.2;
    const segs = lite ? 12 : 20;
    towers.push(piece(new CylinderGeometry(CASTLE_TOWER.radius, CASTLE_TOWER.radius + 1.2, topY - landY, segs), SUPPORT, new Matrix4().makeTranslation(at.x, (topY + landY) / 2, at.z)));
    towers.push(piece(new CylinderGeometry(CASTLE_TOWER.radius + 0.8, CASTLE_TOWER.radius + 0.8, 1, segs), `#${new Color(SUPPORT).multiplyScalar(0.8).getHexString()}`, new Matrix4().makeTranslation(at.x, topY + 0.5, at.z)));
    for (let k = 0; k < segs; k += 2) {
      const a = (k / segs) * Math.PI * 2;
      towers.push(obox(1.4, 1.6, 1, at.clone().add(new Vector3(Math.cos(a) * (CASTLE_TOWER.radius + 0.4), 0, Math.sin(a) * (CASTLE_TOWER.radius + 0.4))).setY(topY + 1.8), -a, SUPPORT));
    }
    const door = at.clone().addScaledVector(back, -(CASTLE_TOWER.radius + 1.1)).addScaledVector(side, 3).setY(landY + 2.2);
    towers.push(obox(2.6, 4, 0.4, door, yawOf(back), '#3a2a20'));
    deckAlong([top, top.clone().addScaledVector(back, CASTLE_TOWER.at)], { chain: false, legs: false });
    feet.push({ x: at.x, z: at.z, r: CASTLE_TOWER.radius + 3 });
  } else if (type === 'ski-jump') {
    // A ski jump's in-run going on up from the gate to its start hut, on a concrete tower, snow on the in-run.
    const yaw = yawOf(back);
    deckAlong(path, { chain: false });
    const hut = path[1].clone().addScaledVector(back, 3);
    const landY = groundAt(hut.x, hut.z) - 0.5;
    const towerH = hut.y - landY;
    towers.push(obox(SKI_JUMP.half * 2 + 3, towerH, 6, hut.clone().setY(landY + towerH / 2), yaw, '#b8b4ac'));
    towers.push(obox(SKI_JUMP.half * 2 + 3.4, 4, 6.4, hut.clone().setY(hut.y + 2), yaw, '#3a5a8a'));
    towers.push(obox(SKI_JUMP.half * 2 + 4, 0.6, 7, hut.clone().setY(hut.y + 4.3), yaw, '#f4f7fa'));
    // Two slim columns under the in-run's middle.
    for (const sign of [1, -1]) {
      const m = top.clone().lerp(path[1], 0.55).addScaledVector(side, sign * (SKI_JUMP.half + 0.6));
      towers.push(strut(m.clone().setY(groundAt(m.x, m.z) - 0.5), m, 0.5, '#b8b4ac'));
    }
    feet.push({ x: hut.x, z: hut.z, r: 10 });
  } else if (type === 'pier' || type === 'river-boat' || type === 'lock-gate') {
    // (Rivers) A pool of the river behind the gate, at the land's lowest there, and what stands in it.
    const yaw = yawOf(back);
    const reach = type === 'pier' ? PIER.length : type === 'lock-gate' ? LOCK.length : BOAT.at + BOAT.length / 2;
    let low = Infinity;
    for (let d = 0; d <= reach + 8; d += 6) for (const j of [-1, 0, 1]) {
      const c = top.clone().addScaledVector(back, d).addScaledVector(side, j * 16);
      low = Math.min(low, groundAt(c.x, c.z));
    }
    const waterY = Math.min(low + 0.5, top.y - 4);
    const mid = top.clone().addScaledVector(back, reach / 2 + 2);
    if (type !== 'lock-gate') towers.push(obox(40, 0.3, reach + 14, mid.clone().setY(waterY), yaw, '#3f86a8'));
    if (type === 'pier') {
      // A plank deck at the gate's height on rows of piles, a handrail, lamps, and mooring posts at its end.
      for (let d = 0; d < PIER.length; d += 3) towers.push(obox(PIER.half * 2, 0.4, 3.05, top.clone().addScaledVector(back, d + 1.5).setY(top.y - 1.3), yaw, d % 6 ? '#8a6440' : '#7a5636'));
      for (let d = 3; d <= PIER.length; d += lite ? 9 : 4.5) {
        for (const sign of [1, -1]) {
          const p = top.clone().addScaledVector(back, d).addScaledVector(side, sign * (PIER.half - 0.4));
          towers.push(strut(p.clone().setY(waterY - 2), p.clone().setY(top.y - 1.4), 0.5, '#5a3e26'));
          towers.push(strut(p.clone().setY(top.y - 1.1), p.clone().setY(top.y + 0.1), 0.14, '#5a3e26'));
        }
      }
      for (const sign of [1, -1]) towers.push(strut(top.clone().addScaledVector(back, 3).addScaledVector(side, sign * (PIER.half - 0.4)).setY(top.y + 0.1), top.clone().addScaledVector(back, PIER.length).addScaledVector(side, sign * (PIER.half - 0.4)).setY(top.y + 0.1), 0.12, '#5a3e26'));
      for (const d of [10, 22]) for (const sign of [1, -1]) {
        const p = top.clone().addScaledVector(back, d).addScaledVector(side, sign * (PIER.half + 0.2));
        towers.push(strut(p.clone().setY(top.y - 1.1), p.clone().setY(top.y + 2.6), 0.12, '#2a2e30'));
        towers.push(obox(0.6, 0.6, 0.6, p.clone().setY(top.y + 2.9), yaw, '#ffe2a0'));
      }
      feet.push({ x: mid.x, z: mid.z, r: PIER.length / 2 + 6 });
    } else if (type === 'river-boat') {
      // A moored river boat: a white hull in the pool, decks up to the gate's level, a funnel, a gangway on to the gate.
      const at = top.clone().addScaledVector(back, BOAT.at);
      const deckY = top.y - 1.3;
      const hullTop = waterY + 2.4;
      towers.push(obox(BOAT.half * 2, hullTop - waterY + 0.6, BOAT.length, at.clone().setY((hullTop + waterY - 0.6) / 2), yaw, '#f2f2ee'));
      towers.push(obox(BOAT.half * 2 + 0.1, 0.5, BOAT.length + 0.1, at.clone().setY(waterY + 0.1), yaw, '#a8322a'));
      const decks = Math.max(1, Math.round((deckY - hullTop) / 2.6));
      for (let k = 0; k < decks; k += 1) {
        const y0 = hullTop + ((deckY - hullTop) * k) / decks;
        const y1 = hullTop + ((deckY - hullTop) * (k + 1)) / decks;
        towers.push(obox(BOAT.half * 2 - 1 - k * 0.6, y1 - y0, BOAT.length - 4 - k * 2, at.clone().setY((y0 + y1) / 2), yaw, '#fbfaf4'));
        towers.push(obox(BOAT.half * 2 - 0.9 - k * 0.6, 0.7, BOAT.length - 3.9 - k * 2, at.clone().setY(y0 + (y1 - y0) * 0.55), yaw, '#2b3c52'));
      }
      towers.push(obox(BOAT.half * 2 - 1, 0.3, BOAT.length - 4, at.clone().setY(deckY), yaw, '#c9a676'));
      const funnel = at.clone().addScaledVector(back, 6).addScaledVector(side, 0);
      towers.push(piece(new CylinderGeometry(1, 1.1, 5, 10), '#1e1e22', new Matrix4().makeTranslation(funnel.x, deckY + 2.5, funnel.z)));
      towers.push(piece(new CylinderGeometry(1.12, 1.12, 1, 10), '#c8302a', new Matrix4().makeTranslation(funnel.x, deckY + 4, funnel.z)));
      deckAlong([top, top.clone().addScaledVector(back, BOAT.at - BOAT.length / 2 + 2)], { chain: false, legs: false });
      feet.push({ x: at.x, z: at.z, r: BOAT.length / 2 + 4 });
    } else {
      // A lock chamber: two concrete walls from the land up past the gate, the chamber's high water just
      // under the gate, the far gate's beams and the lock-keeper's cabin on a wall.
      const yaw2 = yawOf(back);
      const chamberY = top.y - 1.6;
      for (const sign of [1, -1]) {
        const w = top.clone().addScaledVector(back, LOCK.length / 2).addScaledVector(side, sign * (LOCK.half + 1.6));
        const h = top.y + 1 - (low - 1);
        towers.push(obox(3.2, h, LOCK.length + 2, w.clone().setY(low - 1 + h / 2), yaw2, '#c8c4bc'));
        towers.push(obox(3.4, 0.4, LOCK.length + 2.2, w.clone().setY(top.y + 1.2), yaw2, '#9a968e'));
        for (let d = 4; d < LOCK.length; d += 8) towers.push(obox(0.3, 1, 0.3, top.clone().addScaledVector(back, d).addScaledVector(side, sign * (LOCK.half + 0.2)).setY(top.y + 0.5), yaw2, '#e8c030'));
      }
      towers.push(obox(LOCK.half * 2, 0.3, LOCK.length - 2, mid.clone().addScaledVector(back, -2).setY(chamberY), yaw2, '#3f86a8'));
      const far = top.clone().addScaledVector(back, LOCK.length);
      towers.push(obox(LOCK.half * 2 + 3.2, top.y + 1 - (low - 1), 1.6, far.clone().setY((top.y + 1 + low - 1) / 2), yaw2, '#5a6a72'));
      for (const sign of [1, -1]) towers.push(obox(0.5, 0.5, 9, far.clone().addScaledVector(side, sign * (LOCK.half + 6)).addScaledVector(back, 2).setY(top.y + 1.8), yaw2 + sign * 0.5, '#f2f0ea')); // the balance beams
      const cabin = top.clone().addScaledVector(back, 8).addScaledVector(side, -(LOCK.half + 1.6)).setY(top.y + 2.9);
      towers.push(obox(3, 3, 3.6, cabin, yaw2, '#f2f0ea'), obox(3.4, 0.4, 4, cabin.clone().setY(top.y + 4.6), yaw2, '#c8302a'));
      // Below the lock, the lower river: a pool at the land's level beside the walls.
      towers.push(obox(46, 0.3, 30, top.clone().addScaledVector(back, LOCK.length + 16).setY(waterY), yaw2, '#3f86a8'));
      feet.push({ x: mid.x, z: mid.z, r: LOCK.length / 2 + 8 });
    }
  } else if (type === 'station-launch') {
    // A launch platform either side behind the gate, lit along its edges, and the operator's booth
    // (nothing over the track or tall beside it: the cameras swoop low over the start here).
    const yaw = yawOf(back);
    deckAlong(path, { chain: false, legs: true });
    for (const sign of [1, -1]) {
      const p = top.clone().addScaledVector(back, 6).addScaledVector(side, sign * (half + 2.2)).setY(top.y - 0.6);
      towers.push(obox(2.6, 0.6, 14, p, yaw, '#d9d4c8'));
      for (let k = 0; k < 6; k += 1) towers.push(obox(0.3, 0.2, 0.9, p.clone().addScaledVector(side, sign * 1.25).addScaledVector(back, -5.5 + k * 2.2).setY(top.y - 0.2), yaw, k % 2 ? '#ff4b3e' : '#4bd1ff'));
    }
    const booth = top.clone().addScaledVector(back, 10).addScaledVector(side, -(half + 6)).setY(top.y + 0.6);
    towers.push(obox(4, 3, 4, booth, yaw, '#e8e4dc'), obox(4.4, 0.3, 4.4, booth.clone().setY(top.y + 2.25), yaw, SUPPORT));
    feet.push({ x: lift.foot.x, z: lift.foot.z, r: 8 });
  } else {
    // A chain lift: straight, curving or round a tower.
    deckAlong(path);
    if (type === 'spiral-tower') {
      const centre = top.clone().addScaledVector(back, 6).addScaledVector(side, 11);
      lattice(centre, 2.2, 2.2, groundAt(centre.x, centre.z) - 0.5, top.y + 8, yawOf(back), SUPPORT);
      towers.push(obox(1.2, 6, 1.2, centre.clone().setY(top.y + 11), 0, '#e8e2d0')); // (the tower's mast)
      feet.push({ x: centre.x, z: centre.z, r: 16 });
    }
    feet.push({ x: lift.foot.x, z: lift.foot.z, r: 8 });
  }
}

/** A flat water surface (a fjord, a bay) at `y`: discs round the given spots, merged. */
export function buildWater(spots, y, radius, colour = '#3f7fa8') {
  if (!spots.length) return null;
  const discs = spots.map((p) => piece(new CircleGeometry(radius, 20), colour, new Matrix4().makeRotationX(-Math.PI / 2).premultiply(new Matrix4().makeTranslation(p.x, y, p.z))));
  const mesh = new Mesh(merge(discs), new MeshLambertMaterial({ vertexColors: true }));
  mesh.name = 'water';
  mesh.userData.ground = true;
  return mesh;
}

