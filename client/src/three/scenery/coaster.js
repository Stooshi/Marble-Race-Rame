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
import { BoxGeometry, BufferGeometry, CircleGeometry, DoubleSide, Float32BufferAttribute, Group, Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial, Vector3 } from 'three';
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

/**
 * How the coaster starts (the varied starts, `kit.start.type`): what stands behind the gate.
 *   straight-lift: a straight chain lift hill from its foot up to the gate (every coaster's, before);
 *   curving-lift:  the chain lift curving away to one side as it falls back;
 *   spiral-tower:  the lift winding round a lattice tower;
 *   elevator:      a vertical lift shaft behind the gate, a short bridge from its cage to the gate;
 *   cliff:         the gate on a ledge at the edge of a cliff top (the land raised behind it);
 *   rooftop:       the gate at the edge of a tall building's roof;
 *   station-launch: a launch platform behind the gate (the opening's boost launches the field).
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
  } else if (type === 'station-launch') {
    path = [top.clone(), go(top, 12, 0, 0)];
    cut = false;
    foot = go(top, 12, 0, 0);
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

  // Rails along both rims and a spine under the floor, one strip of beams along the whole track.
  const railStep = lite ? 6 : 3;
  for (let i = 0; i + railStep <= segments; i += railStep) {
    const j = i + railStep;
    const a = frameAt(i);
    const b = frameAt(j);
    for (const sign of [1, -1]) {
      const pa = a.s.pos.clone().addScaledVector(a.side, sign * (edgeAt(channel, i, step) - RIM_WIDTH * 0.5)).addScaledVector(UP, topAt(channel, i, step) + 0.2);
      const pb = b.s.pos.clone().addScaledVector(b.side, sign * (edgeAt(channel, j, step) - RIM_WIDTH * 0.5)).addScaledVector(UP, topAt(channel, j, step) + 0.2);
      steel.push(strut(pa, pb, 0.36, RAIL));
    }
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
  const below = (foot, i, topY) => samples.some((o, j) => Math.abs(j - i) * step >= 40 && o.pos.y < topY - 1
    && Math.hypot(o.pos.x - foot.x, o.pos.z - foot.z) < edgeAt(channel, j, step) + 2.5);
  // (`coaster.style` 'timber': wooden trestle bents instead of steel A-frames: near-upright posts,
  // close ties and cross-bracing in every panel, as the old mining railways' trestles.)
  const timber = kit.coaster?.style === 'timber';
  const tower = (top, side, half, i, { light = lite } = {}) => {
    const landY = groundAt(top.x, top.z);
    const h = top.y - landY;
    if (h < 1.2) return;
    const splay = timber ? Math.min(0.1 * h, 3.5) : Math.min(0.18 * h, 6);
    const legs = [1, -1].map((sign) => {
      const a = top.clone().addScaledVector(side, sign * half);
      const b = top.clone().addScaledVector(side, sign * (half + splay));
      b.y = groundAt(b.x, b.z) - 0.4;
      return [a, b];
    });
    if (legs.some(([, b]) => below(b, i, top.y))) return;
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
  const every = timber ? (lite ? 16 : 9) : lite ? 22 : 13; // (a trestle's bents stand closer together)
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
  buildStart(lift, { towers, feet, tower, groundAt, lite, RAIL, SUPPORT });

  // The station over the finish and the run-out: a platform each side, a canopy on posts, a queue behind.
  const st = stationOf(centerline);
  {
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
  for (const [name, parts] of [['coaster track', steel], ['coaster supports', towers], ['coaster station', station]]) {
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
function buildStart(lift, { towers, feet, tower, groundAt, lite, RAIL, SUPPORT }) {
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

  if (type === 'elevator') {
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

