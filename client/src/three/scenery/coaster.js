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
 * Where the lift hill runs: from its foot behind the gate up to the gate, LIFT_RISE metres
 * more than the track flies at the gate, at LIFT_GRADE (the land is carved down along it,
 * kitGround.js, so the whole climb shows).
 */
export function liftHillOf(centerline, flight) {
  const s0 = centerline.samples[0];
  const back = new Vector3(-s0.tangent.x, 0, -s0.tangent.z).normalize();
  const side = new Vector3(s0.side.x, 0, s0.side.z).normalize();
  const top = s0.pos.clone();
  const rise = (flight?.[0] ?? 0) + LIFT_RISE;
  const length = rise / LIFT_GRADE;
  const foot = top.clone().addScaledVector(back, length);
  foot.y = top.y - rise;
  return { top, foot, back, side, length };
}

/** How low the land must lie at (x, z) to show the lift hill's climb (Infinity away from it). */
export function liftHillCut(lift, x, z) {
  const { top, foot, back, side, length } = lift;
  const dx = x - top.x;
  const dz = z - top.z;
  const along = dx * back.x + dz * back.z;
  if (along < -10 || along > length + 30) return Infinity;
  const across = Math.abs(dx * side.x + dz * side.z);
  if (across > LIFT_CUT + LIFT_CUT_EDGE) return Infinity;
  const t = Math.min(1, Math.max(0, along / length));
  const lineY = top.y + (foot.y - top.y) * t - 2.5;
  const k = across <= LIFT_CUT ? 0 : (across - LIFT_CUT) / LIFT_CUT_EDGE;
  return lineY + k * k * 60;
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
  const railStep = lite ? 4 : 3;
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
  const tieEvery = lite ? 6 : 4;
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
  const tower = (top, side, half, i, { light = lite } = {}) => {
    const landY = groundAt(top.x, top.z);
    const h = top.y - landY;
    if (h < 1.2) return;
    const splay = Math.min(0.18 * h, 6);
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
    const rung = light ? 10 : 7;
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
  const every = lite ? 18 : 13;
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

  // The lift hill: a deck with rails and the chain up its middle, a catwalk and handrail
  // beside it, on towers, from its foot up to the gate.
  const lift = liftHillOf(centerline, flight);
  {
    const { top, foot, side, length } = lift;
    const half = 4;
    const at = (d) => top.clone().lerp(foot, d / length);
    const deck = (d) => at(d).addScaledVector(UP, -1.1);
    for (let d = 0; d < length; d += 4) {
      const d1 = Math.min(length, d + 4);
      const a0 = deck(d);
      const a1 = deck(d1);
      // The deck: a dark plank strip as wide as the track.
      const w = new Vector3().subVectors(a1, a0);
      const m = new Matrix4().lookAt(a0, a1, UP);
      m.setPosition(a0.clone().add(a1).multiplyScalar(0.5));
      towers.push(piece(new BoxGeometry(half * 2, 0.35, w.length()), '#3b3f46', m));
    }
    for (const sign of [1, -1]) {
      towers.push(strut(deck(0).addScaledVector(side, sign * (half - 0.6)).addScaledVector(UP, 0.45), deck(length).addScaledVector(side, sign * (half - 0.6)).addScaledVector(UP, 0.45), 0.36, RAIL));
    }
    towers.push(strut(deck(0).addScaledVector(UP, 0.3), deck(length).addScaledVector(UP, 0.3), 0.45, '#1e2024')); // the chain
    // The catwalk's handrail on one side.
    towers.push(strut(deck(0).addScaledVector(side, half + 0.8).addScaledVector(UP, 1.1), deck(length).addScaledVector(side, half + 0.8).addScaledVector(UP, 1.1), 0.12, RAIL));
    for (let d = 0; d <= length; d += lite ? 8 : 4) towers.push(strut(deck(d).addScaledVector(side, half + 0.8), deck(d).addScaledVector(side, half + 0.8).addScaledVector(UP, 1.1), 0.1, RAIL));
    for (let d = 4; d <= length; d += lite ? 12 : 7) tower(deck(d).addScaledVector(UP, -0.4), side, half - 0.4, -1000);
    feet.push({ x: foot.x, z: foot.z, r: 8 });
  }

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

/** A flat water surface (a fjord, a bay) at `y`: discs round the given spots, merged. */
export function buildWater(spots, y, radius, colour = '#3f7fa8') {
  if (!spots.length) return null;
  const discs = spots.map((p) => piece(new CircleGeometry(radius, 20), colour, new Matrix4().makeRotationX(-Math.PI / 2).premultiply(new Matrix4().makeTranslation(p.x, y, p.z))));
  const mesh = new Mesh(merge(discs), new MeshLambertMaterial({ vertexColors: true }));
  mesh.name = 'water';
  mesh.userData.ground = true;
  return mesh;
}

