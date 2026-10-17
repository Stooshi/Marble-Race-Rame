/**
 * Track and Field (family 'athletics': `athletics: { stadium, lanes }`): the racing channel dressed
 * as an athletics track and the stadium round it. Looks only, like all scenery: every surface races
 * exactly like ice, and nothing here stands in the track (clearCheck.js checks the result).
 *
 *   STADIUMS[stadium]   a stadium's generic architecture (no names, rings, torch designs or sponsors):
 *                       its stands' colours, depth and rise, crowd, shape (a closed oval, or a horseshoe
 *                       open at one end), roof, floodlight masts and its own touches (a woven steel
 *                       facade, a stone colonnade, brick towers, a row of arches and a flame cauldron)
 *   buildAthletics(…)   the stadium fitted round the sections marked `stadium` (the stands open where
 *                       the track runs out through them, and step down under a ramp flying over them),
 *                       the white lane lines, start and finish lines and lane numbers on the tartan, the
 *                       starter on his stand (his gun flashes at GO), the scoreboard whose clock runs with
 *                       the race and stops at the winner's time, the photo-finish camera (it flashes as
 *                       the winner crosses) and, at a golden finish, gold lights and confetti
 *
 * Everything that moves follows the race clock and the leader's progress (ctx.frame.p), so every
 * viewer and every replay sees the same, and a replay rewound past a moment undoes it.
 *
 * Drawing budget: the stands, roofs, masts and the still parts are one merged mesh; every lamp is
 * in one unlit mesh; the lane lines one mesh; the scoreboard's screen one small canvas texture,
 * redrawn only when the shown tenth of a second changes.
 */
import {
  BoxGeometry, BufferGeometry, CanvasTexture, Color, ConeGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, IcosahedronGeometry,
  InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial, Object3D, PlaneGeometry, Quaternion, SRGBColorSpace, SphereGeometry, Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { channelLipAt, channelRadiusAt, forkAt, placeOnChannel } from '../iceChannel';
import { piece } from './parts';

const UP = new Vector3(0, 1, 0);

/**
 * The stadiums. seat/riser/wall: the stands' colours; depth and rise: metres back and up from the
 * front row to the back; front: the wall in front of the first row; rows (computer; phones fewer);
 * crowd: the share of seats taken; shape: 'oval' or 'horseshoe' (open at the end the track enters);
 * roof: null or { colour, under, depth, rise, over: 'all' | 'straights' | 'one-side', lights };
 * masts: floodlight masts round the outside; touch: the stadium's own feature.
 */
export const STADIUMS = {
  // Athens: steep white marble stands round a long, narrow arena, a horseshoe open at one end, no roof.
  panathenaic: { seat: '#f2efe8', riser: '#e2ddd2', wall: '#ece8df', depth: 26, rise: 17, front: 1.6, rows: 14, crowd: 0.42, shape: 'horseshoe', roof: null, masts: 0, apron: 7, touch: 'marble' },
  // Berlin's 1936 stadium: pale limestone, a colonnade of square pillars round the top, a light ring roof.
  'berlin-1936': { seat: '#9aa3ad', riser: '#d9d0bf', wall: '#cfc5b2', depth: 30, rise: 16, front: 2.2, rows: 12, crowd: 0.6, shape: 'oval', roof: { colour: '#eceae4', under: '#c9c6bf', depth: 16, rise: 3, over: 'all', lights: true }, masts: 0, apron: 11, touch: 'colonnade' },
  // Oslo: a tight, steep city stadium, roofs over both straights, four floodlight masts.
  bislett: { seat: '#3f4a5a', riser: '#8d8f93', wall: '#7c7f84', depth: 20, rise: 15, front: 1.6, rows: 12, crowd: 0.72, shape: 'oval', roof: { colour: '#40464f', under: '#5d646e', depth: 12, rise: 2.5, over: 'straights' }, masts: 4, apron: 6, touch: null },
  // Oregon: a modern stand of timber and steel, a great canopy over one side, a slender tower at a corner.
  hayward: { seat: '#2f5b3e', riser: '#a99372', wall: '#8a7a62', depth: 24, rise: 14, front: 1.8, rows: 12, crowd: 0.66, shape: 'oval', roof: { colour: '#3a3d42', under: '#b8935e', depth: 18, rise: 4, over: 'one-side' }, masts: 4, apron: 9, touch: 'tower' },
  // Beijing: red seats inside a woven steel shell (the nest), lit red from within at night.
  nest: { seat: '#b8392f', riser: '#6d6f74', wall: '#55585e', depth: 30, rise: 20, front: 2, rows: 14, crowd: 0.7, shape: 'oval', roof: null, masts: 0, apron: 12, touch: 'nest' },
  // Tokyo: deep stands in earthy, leafy mosaic colours under a roof of timber slats, green on its edge.
  tokyo: { seat: '#8a9a6a', riser: '#9a8a72', wall: '#857563', depth: 28, rise: 17, front: 2, rows: 13, crowd: 0.62, shape: 'oval', roof: { colour: '#5f5246', under: '#b0814f', depth: 17, rise: 3, over: 'all', lights: true, green: true }, masts: 0, apron: 11, touch: 'timber' },
  // Stockholm 1912: red-brown brick stands, two brick towers with pointed roofs, old floodlight masts.
  'stockholm-1912': { seat: '#c9b79c', riser: '#9a4a36', wall: '#8c4230', depth: 20, rise: 12, front: 2, rows: 10, crowd: 0.68, shape: 'oval', roof: null, masts: 4, apron: 7, touch: 'brick' },
  // London: a bowl of grey seats under a white roof ring.
  london: { seat: '#5b6068', riser: '#a5a8ad', wall: '#e6e7e9', depth: 30, rise: 18, front: 2, rows: 13, crowd: 0.7, shape: 'oval', roof: { colour: '#f2f3f4', under: '#dcdee1', depth: 15, rise: 2, over: 'all', lights: true }, masts: 0, apron: 12, touch: 'ring' },
  // Los Angeles: a great open bowl, a row of tall arches (the peristyle) at one end with a flame cauldron.
  coliseum: { seat: '#9c8f7e', riser: '#c9b79c', wall: '#bba88c', depth: 32, rise: 18, front: 2, rows: 14, crowd: 0.6, shape: 'oval', roof: null, masts: 4, apron: 12, touch: 'arches' },
  // Zurich: a modern stadium for a night meeting, a dark roof all round with a band of floodlights under it.
  letzigrund: { seat: '#2f3a4c', riser: '#7b8088', wall: '#5c6168', depth: 24, rise: 14, front: 2, rows: 12, crowd: 0.75, shape: 'oval', roof: { colour: '#2f3237', under: '#4a4e55', depth: 15, rise: 2.5, over: 'all', lights: true }, masts: 0, apron: 9, touch: 'golden' },
};
export const STADIUM_NAMES = Object.keys(STADIUMS);

const CROWD = ['#d94a3a', '#f2f2ee', '#3a6fc4', '#f2c230', '#2f9a4a', '#1f2226', '#e07a2e', '#7a4fb0', '#e9a3b8', '#7fc4d8'];
const LANE_LINES = [-0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75]; // across the U (share of the wall's angle): 8 lanes
const START_AT = 2.3;   // metres: the start line, just in front of the gate's front row
const NUMBERS_AT = 4.2; // …and the lane numbers just past it
const CLEAR = 4.4;      // metres from the channel's middle to beyond its rim
const REACH = 7.5;      // metres: a stretch of track this near a stand's footprint passes through it
const UNDER_RAMP = 5;   // metres a stand stays below a ramp flying over it

const hash = (a, b = 0) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Flat-shaded triangles in their own colours: quad(a, b, c, d, colour), then geometry(). */
function triangles() {
  const pos = [];
  const col = [];
  const c = new Color();
  const tri = (a, b, d, colour) => {
    c.set(colour);
    for (const p of [a, b, d]) { pos.push(p.x, p.y, p.z); col.push(c.r, c.g, c.b); }
  };
  return {
    tri,
    quad(a, b, d, e, colour) { tri(a, b, d, colour); tri(a, d, e, colour); },
    get count() { return pos.length / 9; },
    geometry() {
      const g = new BufferGeometry();
      g.setAttribute('position', new Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new Float32BufferAttribute(col, 3));
      g.computeVertexNormals();
      return g;
    },
  };
}

const shade = (hex, k) => `#${new Color(hex).multiplyScalar(k).getHexString()}`;

/**
 * Where the stadium stands: an athletics-track outline (two straights joined by half circles)
 * fitted round the sections marked `stadium`, with room for the stand's apron.
 * → { centre, e1, e2, L, B, perimeter, at(s) → { p (Vector3 on the plan), n (outward) }, local(x, z) } or null.
 */
export function fitStadium(points, apron) {
  if (points.length < 4) return null;
  let cx = 0;
  let cz = 0;
  for (const p of points) { cx += p.x; cz += p.z; }
  cx /= points.length;
  cz /= points.length;
  let sxx = 0;
  let sxz = 0;
  let szz = 0;
  for (const p of points) { sxx += (p.x - cx) ** 2; sxz += (p.x - cx) * (p.z - cz); szz += (p.z - cz) ** 2; }
  const angle = 0.5 * Math.atan2(2 * sxz, sxx - szz);
  let e1 = new Vector3(Math.cos(angle), 0, Math.sin(angle));
  let e2 = new Vector3(-Math.sin(angle), 0, Math.cos(angle));
  const span = (e) => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of points) { const u = (p.x - cx) * e.x + (p.z - cz) * e.z; lo = Math.min(lo, u); hi = Math.max(hi, u); }
    return [lo, hi];
  };
  let [u0, u1] = span(e1);
  let [v0, v1] = span(e2);
  if (u1 - u0 < v1 - v0) {
    [e1, e2] = [e2, e1.clone().negate()];
    [u0, u1] = span(e1);
    [v0, v1] = span(e2);
  }
  const centre = new Vector3(cx, 0, cz).addScaledVector(e1, (u0 + u1) / 2).addScaledVector(e2, (v0 + v1) / 2);
  const A = (u1 - u0) / 2 + CLEAR + apron;
  const B = (v1 - v0) / 2 + CLEAR + apron;
  const L = Math.max(0, A - B);
  const perimeter = 4 * L + 2 * Math.PI * B;
  const world = (u, v) => centre.clone().addScaledVector(e1, u).addScaledVector(e2, v);
  const dir = (nu, nv) => e1.clone().multiplyScalar(nu).addScaledVector(e2, nv);
  // Round the outline from the middle of one straight: the straight, the far end's half circle, the
  // other straight, the near end's half circle.
  const at = (s) => {
    let d = ((s % perimeter) + perimeter) % perimeter;
    if (d < L) return { p: world(d, B), n: dir(0, 1), part: 'straight', end: 0 };
    d -= L;
    const arc = Math.PI * B;
    if (d < arc) {
      const phi = Math.PI / 2 - d / B;
      return { p: world(L + B * Math.cos(phi), B * Math.sin(phi)), n: dir(Math.cos(phi), Math.sin(phi)), part: 'end', end: 1 };
    }
    d -= arc;
    if (d < 2 * L) return { p: world(L - d, -B), n: dir(0, -1), part: 'straight', end: 0 };
    d -= 2 * L;
    if (d < arc) {
      const phi = -Math.PI / 2 - d / B;
      return { p: world(-L + B * Math.cos(phi), B * Math.sin(phi)), n: dir(Math.cos(phi), Math.sin(phi)), part: 'end', end: -1 };
    }
    d -= arc;
    return { p: world(-L + d, B), n: dir(0, 1), part: 'straight', end: 0 };
  };
  const local = (x, z) => ({ u: (x - centre.x) * e1.x + (z - centre.z) * e1.z, v: (x - centre.x) * e2.x + (z - centre.z) * e2.z });
  return { centre, e1, e2, L, B, perimeter, at, local, world };
}

/** The track's samples on a coarse grid, for finding which stretches pass near a spot. */
function sampleGrid(centerline, channel, runout = 0) {
  const { samples, segments } = centerline;
  const step = channel.arc / segments;
  const CELL = 24;
  const grid = new Map();
  const key = (x, z) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
  const put = (e) => {
    const k = key(e.x, e.z);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(e);
  };
  for (let i = 0; i <= segments; i += 1) {
    const p = samples[i].pos;
    put({ i, x: p.x, z: p.z, y: p.y, s: i * step });
  }
  // (The catch area past the line, and the finish's view along it: the stands stay open there too.)
  const end = samples[segments];
  const ahead = new Vector3(end.tangent.x, 0, end.tangent.z).normalize();
  for (let d = 3; d <= runout; d += 3) put({ i: segments, x: end.pos.x + ahead.x * d, z: end.pos.z + ahead.z * d, y: end.pos.y, s: channel.arc + d });
  return {
    near(minX, maxX, minZ, maxZ) {
      const out = [];
      for (let gx = Math.floor(minX / CELL); gx <= Math.floor(maxX / CELL); gx += 1) {
        for (let gz = Math.floor(minZ / CELL); gz <= Math.floor(maxZ / CELL); gz += 1) out.push(...(grid.get(`${gx},${gz}`) ?? []));
      }
      return out;
    },
  };
}

/** Distance on the plan from (x, z) to the convex quad a-b-c-d (0 inside it). */
function distToQuad(x, z, quad) {
  let inside = true;
  let best = Infinity;
  for (let k = 0; k < 4; k += 1) {
    const a = quad[k];
    const b = quad[(k + 1) % 4];
    const ex = b.x - a.x;
    const ez = b.z - a.z;
    const cross = ex * (z - a.z) - ez * (x - a.x);
    if (cross < 0) inside = false;
    const len2 = ex * ex + ez * ez || 1;
    const t = Math.max(0, Math.min(1, ((x - a.x) * ex + (z - a.z) * ez) / len2));
    best = Math.min(best, Math.hypot(x - (a.x + ex * t), z - (a.z + ez * t)));
  }
  // (The quad's winding may run either way: inside is all crosses one sign.)
  if (!inside) {
    inside = true;
    for (let k = 0; k < 4; k += 1) {
      const a = quad[k];
      const b = quad[(k + 1) % 4];
      if ((b.x - a.x) * (z - a.z) - (b.z - a.z) * (x - a.x) > 0) inside = false;
    }
  }
  return inside ? 0 : best;
}

/** A canvas texture (sRGB), or null where there is no canvas (tests). */
function canvasOf(w, h) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext?.('2d');
  if (!g) return null;
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return { canvas, g, tex };
}

/**
 * The lane lines, the start and finish lines and the lane numbers on the tartan:
 * { lines (one white mesh), numbers (a mesh of number squares at the start, or null) }.
 */
export function buildLaneMarkings(centerline, channel, { lite = false } = {}) {
  const arc = channel.arc;
  const out = new Vector3();
  const nrm = new Vector3();
  const at = (s, l, lift = 0.012) => placeOnChannel(centerline, channel, Math.min(1, Math.max(0, s / arc)), l, 0, 0, lift, out, nrm).clone();
  const lipShare = (s) => channelLipAt(channel, s) / channel.maxAngle;
  const t = triangles();
  const white = '#f4f1ea';
  const step = lite ? 6 : 3;
  // Along: each lane line, a thin strip a few centimetres off the floor (none through a splitter's two channels).
  for (const l of LANE_LINES) {
    for (let s = START_AT; s + 0.01 < arc - 0.3; s += step) {
      const s1 = Math.min(arc - 0.3, s + step);
      if (forkAt(channel, s) || forkAt(channel, s1)) continue;
      // (About 7 cm either side of the line: as a share of the wall's angle, at each end's radius.)
      const wa = 0.07 / (channelRadiusAt(channel, s) * channel.maxAngle);
      const wb = 0.07 / (channelRadiusAt(channel, s1) * channel.maxAngle);
      const la = l * lipShare(s);
      const lb = l * lipShare(s1);
      t.quad(at(s, la - wa), at(s1, lb - wb), at(s1, lb + wb), at(s, la + wa), white);
    }
  }
  // Across: the start line in front of the gate, the finish line, both the full width of the floor.
  const across = (s, len) => {
    const n = lite ? 10 : 20;
    const lip = lipShare(s) * 0.92;
    for (let k = 0; k < n; k += 1) {
      const a = -lip + (2 * lip * k) / n;
      const b = -lip + (2 * lip * (k + 1)) / n;
      t.quad(at(s, a, 0.016), at(s, b, 0.016), at(s + len, b, 0.016), at(s + len, a, 0.016), white);
    }
  };
  across(START_AT, 0.25);
  across(arc - 0.45, 0.35);
  const lines = new Mesh(t.geometry(), new MeshLambertMaterial({ vertexColors: true, flatShading: true, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  lines.name = 'athletics: lane lines';

  // The lane numbers, 1 to 8 from the inside, white squares with a dark number, just past the start line.
  let numbers = null;
  const atlas = canvasOf(512, 64);
  if (atlas) {
    const { g } = atlas;
    g.fillStyle = '#f4f1ea';
    g.fillRect(0, 0, 512, 64);
    g.fillStyle = '#b9493a';
    g.font = 'bold 48px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let k = 0; k < 8; k += 1) g.fillText(String(k + 1), 32 + 64 * k, 35);
    atlas.tex.needsUpdate = true;
  }
  const pos = [];
  const uv = [];
  const lip = lipShare(NUMBERS_AT);
  const edges = [-1, ...LANE_LINES, 1];
  for (let k = 0; k < 8; k += 1) {
    const mid = ((edges[k] + edges[k + 1]) / 2) * lip;
    const half = 0.07 * lip;
    const quad = [at(NUMBERS_AT, mid - half, 0.02), at(NUMBERS_AT, mid + half, 0.02), at(NUMBERS_AT + 1.1, mid + half, 0.02), at(NUMBERS_AT + 1.1, mid - half, 0.02)];
    const u0 = k / 8;
    const u1 = (k + 1) / 8;
    // (Read from behind the gate: the number's top towards the finish.)
    const uvs = [[u0, 1], [u1, 1], [u1, 0], [u0, 0]];
    for (const j of [0, 1, 2, 0, 2, 3]) { pos.push(quad[j].x, quad[j].y, quad[j].z); uv.push(...uvs[j]); }
  }
  const ng = new BufferGeometry();
  ng.setAttribute('position', new Float32BufferAttribute(pos, 3));
  ng.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  ng.computeVertexNormals();
  numbers = new Mesh(ng, new MeshLambertMaterial({ map: atlas?.tex ?? null, color: atlas ? '#ffffff' : '#f4f1ea', side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  numbers.name = 'athletics: lane numbers';
  return { lines, numbers };
}

/**
 * The stadium and its race furniture round a Track and Field track.
 * → { group, spots (kept clear of trees), update(t, ctx), stadium (the fitted outline, or null) }.
 */
export function buildAthletics(centerline, channel, kit, { lite = false, groundAt, corridor = null } = {}) {
  const a = kit.athletics ?? {};
  const style = STADIUMS[a.stadium] ?? STADIUMS.bislett;
  const { samples, segments } = centerline;
  const step = channel.arc / segments;
  const group = new Group();
  group.name = 'athletics';
  const spots = [];
  const solid = [];   // still, lit parts (one merged mesh)
  const glow = [];    // lamps (one unlit mesh)
  const effects = []; // (t, lead, ctx) => …
  const frame = (p) => {
    const i = Math.min(segments, Math.max(0, Math.round(p * segments)));
    const s = samples[i];
    return { i, s, side: new Vector3(s.side.x, 0, s.side.z).normalize(), along: new Vector3(s.tangent.x, 0, s.tangent.z).normalize() };
  };
  const clearOf = (g) => !corridor || !corridor.hits(g);

  // (The lane lines, start and finish lines and lane numbers are the track's own: TrackScene draws them with it.)

  // ── The stadium round the sections marked `stadium` ──
  const inside = [];
  for (const sec of kit.sections ?? []) {
    if (!sec.stadium) continue;
    const i0 = Math.round(sec.from * segments);
    const i1 = Math.round(sec.to * segments);
    for (let i = i0; i <= i1; i += 1) inside.push(samples[i].pos);
  }
  // A finish inside the stadium: its catch area and the view past the line inside it too.
  const RUNOUT = 55;
  const last = (kit.sections ?? []).filter((x) => x.shape !== 'runIn').pop();
  if (last?.stadium) {
    const end = samples[segments];
    const ahead = new Vector3(end.tangent.x, 0, end.tangent.z).normalize();
    for (let d = 5; d <= RUNOUT; d += 5) inside.push(end.pos.clone().addScaledVector(ahead, d));
  }
  const stadium = inside.length ? fitStadium(inside, style.apron) : null;
  let board = null; // where the scoreboard stands
  if (stadium) {
    const built = buildStands(stadium, style, { lite, groundAt, grid: sampleGrid(centerline, channel, RUNOUT), clearOf, inside, samples, segments });
    solid.push(...built.solid);
    glow.push(...built.glow);
    spots.push(...built.spots);
    board = built.board;
  }

  // ── The starter on his stand beside the gate: his gun flashes and smokes at GO ──
  {
    const { s, side, along } = frame(START_AT / channel.arc);
    const R = channelRadiusAt(channel, START_AT);
    const lip = channelLipAt(channel, START_AT);
    const half = R * Math.sin(lip) + 0.45;
    const rimY = s.pos.y + R * (1 - Math.cos(lip));
    let foot = null;
    for (const sign of [1, -1]) {
      for (let extra = 2.5; extra < 14 && !foot; extra += 1.5) {
        const p = s.pos.clone().addScaledVector(side, sign * (half + extra));
        const parts = starterStand(p, groundAt(p.x, p.z), rimY, side.clone().multiplyScalar(-sign), along);
        if (clearOf(mergeGeometries(parts.solid))) foot = { p, sign, parts };
      }
      if (foot) break;
    }
    if (foot) {
      solid.push(...foot.parts.solid);
      spots.push({ x: foot.p.x, z: foot.p.z, r: 3 });
      const flash = new Mesh(new IcosahedronGeometry(0.32, 0), new MeshBasicMaterial({ color: '#fff3b0' }));
      flash.name = 'athletics: starter flash';
      flash.position.copy(foot.parts.muzzle);
      const smoke = new Mesh(new SphereGeometry(0.5, 8, 6), new MeshBasicMaterial({ color: '#d9d9d6', transparent: true, opacity: 0.6, depthWrite: false }));
      smoke.name = 'athletics: starter smoke';
      smoke.position.copy(foot.parts.muzzle);
      group.add(flash, smoke);
      effects.push((t) => {
        // The flash for the first sixth of a second after GO, the puff of smoke rising and fading over 1.6 s.
        const f = t >= 0 && t < 170;
        flash.visible = f;
        flash.scale.setScalar(f ? 1 + t / 120 : 1);
        const k = t >= 0 && t < 1600 ? t / 1600 : -1;
        smoke.visible = k >= 0;
        if (k >= 0) {
          smoke.scale.setScalar(0.4 + 2.2 * k);
          smoke.position.copy(foot.parts.muzzle).addScaledVector(UP, 1.2 * k);
          smoke.material.opacity = 0.55 * (1 - k);
        }
      });
    }
  }

  // ── The photo-finish camera on its post at the line: it flashes as the winner crosses ──
  {
    const end = frame(1);
    const sArc = channel.arc;
    const R = channelRadiusAt(channel, sArc);
    const lip = channelLipAt(channel, sArc);
    const half = R * Math.sin(lip) + 0.45;
    const rimY = end.s.pos.y + R * (1 - Math.cos(lip));
    let placed = null;
    for (const sign of [-1, 1]) {
      for (let extra = 1.2; extra < 8 && !placed; extra += 1) {
        const p = end.s.pos.clone().addScaledVector(end.side, sign * (half + extra));
        const parts = photoFinishPost(p, groundAt(p.x, p.z), rimY, end.side.clone().multiplyScalar(-sign));
        if (clearOf(mergeGeometries(parts.solid))) placed = { p, parts };
      }
      if (placed) break;
    }
    if (placed) {
      solid.push(...placed.parts.solid);
      spots.push({ x: placed.p.x, z: placed.p.z, r: 2.5 });
      const flash = new Mesh(new IcosahedronGeometry(0.5, 1), new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95, depthWrite: false }));
      flash.name = 'athletics: photo-finish flash';
      flash.position.copy(placed.parts.lens);
      group.add(flash);
      let crossed = null;
      effects.push((t, lead) => {
        if (lead < 1) crossed = null;
        else if (crossed === null || t < crossed) crossed = t;
        const k = crossed === null ? -1 : (t - crossed) / 260;
        flash.visible = k >= 0 && k < 1;
        if (flash.visible) {
          flash.scale.setScalar(1 + 5 * k);
          flash.material.opacity = 0.95 * (1 - k);
        }
      });
    }
  }

  // ── The scoreboard: its clock runs with the race and stops at the winner's time ──
  if (board) {
    const screen = canvasOf(256, 128);
    const W = 18;
    const H = 9;
    const g = new PlaneGeometry(W - 1.2, H - 1.2);
    const m = new Mesh(g, new MeshBasicMaterial({ map: screen?.tex ?? null, color: screen ? '#ffffff' : '#141414' }));
    m.name = 'athletics: scoreboard';
    m.position.copy(board.centre);
    m.quaternion.copy(board.q);
    m.position.addScaledVector(board.facing, 0.42);
    group.add(m);
    let shown = null;
    let stopped = null;
    const draw = (text, sub) => {
      if (!screen) return;
      const { g: c, tex } = screen;
      c.fillStyle = '#0d0f12';
      c.fillRect(0, 0, 256, 128);
      c.fillStyle = '#8a8f96';
      c.font = 'bold 18px sans-serif';
      c.textAlign = 'center';
      c.fillText(sub, 128, 26);
      c.fillStyle = '#ffb627';
      c.font = 'bold 64px monospace';
      c.fillText(text, 128, 92);
      tex.needsUpdate = true;
    };
    effects.push((t, lead) => {
      if (lead < 1) stopped = null;
      else if (stopped === null || t < stopped) stopped = t;
      const ms = t < 0 ? 0 : stopped !== null ? stopped : t;
      const tenths = Math.floor(ms / 100);
      const key = `${tenths}:${stopped !== null}`;
      if (key === shown) return;
      shown = key;
      draw(`${Math.floor(tenths / 10)}.${tenths % 10}`, stopped !== null ? 'WINNER' : t < 0 ? 'ON YOUR MARKS' : 'RACE TIME');
    });
  }

  // ── A golden finish (Zurich): gold lamps on two masts by the line, gold confetti once the winner is home ──
  if (a.stadium === 'letzigrund') {
    const end = frame(1);
    const R = channelRadiusAt(channel, channel.arc);
    const half = R + 3.5;
    const lampsAt = [];
    for (const sign of [1, -1]) {
      for (let extra = 0; extra < 10; extra += 1.5) {
        const p = end.s.pos.clone().addScaledVector(end.side, sign * (half + extra)).addScaledVector(end.along, 3);
        const y0 = groundAt(p.x, p.z) - 0.4;
        const top = end.s.pos.y + 11;
        const mast = piece(new BoxGeometry(0.5, top - y0, 0.5), '#2a2c30', new Matrix4().makeTranslation(p.x, (y0 + top) / 2, p.z));
        if (!clearOf(mast)) { mast.dispose(); continue; }
        solid.push(mast);
        for (let k = 0; k < 5; k += 1) lampsAt.push(new Vector3(p.x, top - 0.6 - k * 1.6, p.z).addScaledVector(end.side, -sign * 0.45));
        spots.push({ x: p.x, z: p.z, r: 2 });
        break;
      }
    }
    const lamp = new InstancedMesh(new BoxGeometry(0.7, 0.7, 0.7), new MeshBasicMaterial(), Math.max(1, lampsAt.length));
    lamp.name = 'athletics: golden lamps';
    lamp.count = lampsAt.length;
    const dummy = new Object3D();
    lampsAt.forEach((p, k) => { dummy.position.copy(p); dummy.updateMatrix(); lamp.setMatrixAt(k, dummy.matrix); lamp.setColorAt(k, new Color('#6b5a30')); });
    group.add(lamp);
    const N = lite ? 60 : 140;
    const confetti = new InstancedMesh(new PlaneGeometry(0.35, 0.22), new MeshBasicMaterial({ side: DoubleSide }), N);
    confetti.name = 'athletics: confetti';
    confetti.frustumCulled = false;
    const gold = [new Color('#ffd34d'), new Color('#ffe9a3'), new Color('#e8b13a'), new Color('#ffffff')];
    for (let k = 0; k < N; k += 1) confetti.setColorAt(k, gold[k % gold.length]);
    group.add(confetti);
    const centre = end.s.pos.clone().addScaledVector(end.along, 8);
    let won = null;
    const tint = new Color();
    effects.push((t, lead) => {
      if (lead < 1) won = null;
      else if (won === null || t < won) won = t;
      const k = won === null ? -1 : (t - won) / 1000;
      lampsAt.forEach((_, j) => lamp.setColorAt(j, tint.set(k < 0 ? '#6b5a30' : (Math.floor(k * 4 + j) % 2 ? '#ffd34d' : '#fff1c2'))));
      if (lamp.instanceColor) lamp.instanceColor.needsUpdate = true;
      confetti.visible = k >= 0 && k < 9;
      if (!confetti.visible) return;
      for (let j = 0; j < N; j += 1) {
        // Each piece fired up and out from the line, then fluttering down, turning.
        const r = hash(j, 1);
        const ang = hash(j, 2) * Math.PI * 2;
        const speed = 4 + 7 * hash(j, 3);
        const up = 9 + 7 * hash(j, 4);
        const tt = Math.max(0, k - hash(j, 5) * 0.4);
        const rise = Math.min(tt, up / 9.8);
        const y = centre.y + 3 + up * rise - 4.9 * rise * rise - Math.max(0, tt - up / 9.8) * 1.6;
        dummy.position.set(centre.x + Math.cos(ang) * speed * Math.min(tt, 1.2) * (0.6 + r), Math.max(centre.y + 0.2, y), centre.z + Math.sin(ang) * speed * Math.min(tt, 1.2) * (0.6 + r));
        dummy.rotation.set(tt * 5 + j, tt * 3 + r * 6, tt * 4);
        dummy.updateMatrix();
        confetti.setMatrixAt(j, dummy.matrix);
      }
      confetti.instanceMatrix.needsUpdate = true;
    });
  }

  if (solid.length) {
    // (Both sides: the stands' rows and walls are drawn whichever way round they were wound.)
    const mesh = new Mesh(mergeGeometries(solid), new MeshLambertMaterial({ vertexColors: true, flatShading: true, side: DoubleSide }));
    mesh.name = 'stadium';
    group.add(mesh);
  }
  if (glow.length) {
    const mesh = new Mesh(mergeGeometries(glow), new MeshBasicMaterial({ vertexColors: true }));
    mesh.name = 'stadium: lamps';
    group.add(mesh);
  }
  const update = (t, ctx = {}) => {
    const p = ctx.frame?.p ?? [];
    let lead = 0;
    for (const x of p) if (x > lead) lead = x;
    for (const e of effects) e(t, lead, ctx);
  };
  update(-1);
  return { group, spots, update, stadium };
}

/** The starter's stand: a step up to the rim's height, the starter in a red jacket, his arm up, the gun. */
function starterStand(p, landY, rimY, facing, along) {
  const yaw = Math.atan2(facing.x, facing.z);
  const q = new Quaternion().setFromAxisAngle(UP, yaw);
  const top = Math.max(landY + 0.8, rimY + 0.4);
  const at = (x, y, z) => p.clone().add(new Vector3(x, 0, z).applyQuaternion(q)).setY(y);
  const box = (w, h, d, x, y, z, colour) => piece(new BoxGeometry(w, h, d), colour, new Matrix4().compose(at(x, y, z), q, new Vector3(1, 1, 1)));
  const solid = [
    box(1.8, top - landY + 0.4, 1.8, 0, (top + landY - 0.4) / 2, 0, '#e8e6e1'),
    box(2.0, 0.12, 2.0, 0, top + 0.06, 0, '#2f5d9a'),
    box(0.22, 0.85, 0.22, -0.16, top + 0.55, 0, '#1f2226'),
    box(0.22, 0.85, 0.22, 0.16, top + 0.55, 0, '#1f2226'),
    box(0.62, 0.78, 0.34, 0, top + 1.36, 0, '#c8382c'),
    box(0.34, 0.34, 0.34, 0, top + 1.95, 0, '#e2b08a'),
    box(0.38, 0.1, 0.38, 0, top + 2.15, 0, '#f4f1ea'),
    // The right arm raised high, the gun in the hand; the left at the side.
    box(0.16, 0.72, 0.16, 0.38, top + 2.0, 0, '#c8382c'),
    box(0.16, 0.6, 0.16, -0.38, top + 1.3, 0, '#c8382c'),
    box(0.1, 0.12, 0.3, 0.38, top + 2.45, 0.06, '#202226'),
  ];
  const muzzle = at(0.38, top + 2.6, 0.2);
  return { solid, muzzle, along };
}

/** The photo-finish camera's post at the line: a slim post up past the rim, the camera on top looking across. */
function photoFinishPost(p, landY, rimY, facing) {
  const yaw = Math.atan2(facing.x, facing.z);
  const q = new Quaternion().setFromAxisAngle(UP, yaw);
  const top = rimY + 2.4;
  const at = (x, y, z) => p.clone().add(new Vector3(x, 0, z).applyQuaternion(q)).setY(y);
  const box = (w, h, d, x, y, z, colour) => piece(new BoxGeometry(w, h, d), colour, new Matrix4().compose(at(x, y, z), q, new Vector3(1, 1, 1)));
  const solid = [
    box(0.22, top - landY + 0.4, 0.22, 0, (top + landY - 0.4) / 2, 0, '#2a2c30'),
    box(0.9, 0.08, 0.9, 0, top, 0, '#2a2c30'),
    box(0.5, 0.42, 0.7, 0, top + 0.26, 0, '#1b1d21'),
    box(0.26, 0.26, 0.24, 0, top + 0.28, 0.46, '#3a3e45'),
    box(0.62, 0.06, 0.82, 0, top + 0.52, 0, '#d8322b'),
  ];
  return { solid, lens: at(0, top + 0.28, 0.62) };
}

/**
 * The stands round the fitted outline, in chunks: each a stepped block of rows (the crowd coloured
 * into them), a front wall and a back wall; open where the track runs through, lowered where a ramp
 * flies over; a roof, masts and the stadium's own touch. → { solid, glow, spots, board }.
 */
function buildStands(st, style, { lite, groundAt, grid, clearOf, inside }) {
  const solid = [];
  const glow = [];
  const spots = [];
  const D = style.depth;
  const H = style.rise;
  const H0 = style.front;
  const rows = lite ? Math.max(5, Math.round(style.rows / 2)) : style.rows;
  const chunk = lite ? 9 : 5;
  const n = Math.max(12, Math.round(st.perimeter / chunk));
  const ds = st.perimeter / n;
  // A horseshoe opens at the end the track first comes in by.
  const first = st.local(inside[0].x, inside[0].z);
  const openEnd = style.shape === 'horseshoe' ? (first.u >= 0 ? 1 : -1) : 0;
  // Each chunk: how high it may rise (Infinity: in full; a number: under a ramp; null: open).
  const chunks = [];
  for (let k = 0; k < n; k += 1) {
    const s0 = k * ds;
    const s1 = (k + 1) * ds;
    const A = st.at(s0);
    const Bq = st.at(s1);
    const mid = st.at((s0 + s1) / 2);
    if (openEnd && mid.end === openEnd) { chunks.push(null); continue; }
    const quad = [A.p, Bq.p, Bq.p.clone().addScaledVector(Bq.n, D), A.p.clone().addScaledVector(A.n, D)];
    const base = groundAt(mid.p.x, mid.p.z);
    const xs = quad.map((q) => q.x);
    const zs = quad.map((q) => q.z);
    let cap = Infinity;
    for (const e of grid.near(Math.min(...xs) - REACH, Math.max(...xs) + REACH, Math.min(...zs) - REACH, Math.max(...zs) + REACH)) {
      if (distToQuad(e.x, e.z, quad) > REACH) continue;
      cap = Math.min(cap, e.y - base - UNDER_RAMP);
    }
    if (cap < H0 + 2) chunks.push({ s0, s1, A, B: Bq, mid, base, top: null });
    else chunks.push({ s0, s1, A, B: Bq, mid, base, top: Math.min(H0 + H, cap) });
  }
  // (A short piece of stand left between two stretches of track passing through is no stand: drop it.)
  const MIN_RUN = Math.ceil(28 / ds);
  const standing = (k) => { const c = chunks[(k + n) % n]; return Boolean(c && c.top !== null); };
  if (chunks.some((c, k) => !standing(k))) {
    const startAt = chunks.findIndex((c, k) => !standing(k));
    for (let j = 0; j < n;) {
      const k0 = (startAt + j) % n;
      if (!standing(k0)) { j += 1; continue; }
      let len = 0;
      while (len < n && standing(k0 + len)) len += 1;
      if (len < MIN_RUN) for (let m = 0; m < len; m += 1) chunks[(k0 + m) % n].top = null;
      j += len;
    }
  }
  const open = (k) => { const c = chunks[(k + n) % n]; return !c || c.top === null; };
  // The stands: rows rising from the front wall to the back; a ramp over them cuts the rows it would touch.
  const roofOver = (c) => {
    const r = style.roof;
    if (!r || c.top < H0 + H - 0.01) return false;
    if (r.over === 'all') return true;
    if (r.over === 'straights') return c.mid.part === 'straight';
    return c.mid.part === 'straight' && st.local(c.mid.p.x, c.mid.p.z).v > 0; // 'one-side'
  };
  for (let k = 0; k < n; k += 1) {
    const c = chunks[k];
    if (!c || c.top === null) continue;
    const t = triangles();
    const pt = (q, nrm, o, y) => q.p.clone().addScaledVector(nrm, o).setY(y);
    const { A, B, base } = c;
    const yRow = (r) => base + Math.min(c.top, H0 + (H * (r + 1)) / rows);
    const oRow = (r) => (D * r) / rows;
    const split = lite ? 2 : 6;
    for (let r = 0; r < rows; r += 1) {
      const y = yRow(r);
      const yPrev = r === 0 ? base + H0 : yRow(r - 1);
      const o0 = oRow(r);
      const o1 = oRow(r + 1);
      // The riser, then the row's seats in a few patches, each a spectator's colours or an empty seat.
      t.quad(pt(A, A.n, o0, yPrev), pt(B, B.n, o0, yPrev), pt(B, B.n, o0, y), pt(A, A.n, o0, y), r % 2 ? style.riser : shade(style.riser, 0.94));
      for (let j = 0; j < split; j += 1) {
        const a0 = A.p.clone().lerp(B.p, j / split);
        const a1 = A.p.clone().lerp(B.p, (j + 1) / split);
        const n0 = A.n.clone().lerp(B.n, j / split).normalize();
        const n1 = A.n.clone().lerp(B.n, (j + 1) / split).normalize();
        const h = hash(k * 7 + j, r * 13 + 1);
        // (Spectators' colours muted a little, so the stands read as a crowd, not as confetti.)
        const colour = h < style.crowd ? `#${new Color(CROWD[Math.floor(hash(k * 3 + j, r) * CROWD.length)]).lerp(new Color(style.seat), 0.35).multiplyScalar(0.8 + 0.15 * hash(k, r + j)).getHexString()}` : shade(style.seat, 0.92 + 0.12 * hash(r, k + j));
        t.quad(a0.clone().addScaledVector(n0, o0).setY(y), a1.clone().addScaledVector(n1, o0).setY(y), a1.clone().addScaledVector(n1, o1).setY(y), a0.clone().addScaledVector(n0, o1).setY(y), colour);
      }
    }
    // The front wall (down into the ground), the back wall (down to the land behind).
    const topY = yRow(rows - 1);
    const outA = pt(A, A.n, D, 0);
    const outB = pt(B, B.n, D, 0);
    const backA = groundAt(outA.x, outA.z) - 1;
    const backB = groundAt(outB.x, outB.z) - 1;
    t.quad(pt(A, A.n, 0, base - 1), pt(B, B.n, 0, base - 1), pt(B, B.n, 0, base + H0), pt(A, A.n, 0, base + H0), style.wall);
    t.quad(pt(B, B.n, D, Math.min(backB, topY - 1)), pt(A, A.n, D, Math.min(backA, topY - 1)), pt(A, A.n, D, topY), pt(B, B.n, D, topY), shade(style.wall, 0.9));
    // The ends, where the stand stops (the track runs through, or a horseshoe's open end).
    for (const [q, other, flip] of [[A, k - 1, false], [B, k + 1, true]]) {
      if (!open(other)) continue;
      for (let r = 0; r < rows; r += 1) {
        const y = yRow(r);
        const p0 = pt(q, q.n, oRow(r), base - 1);
        const p1 = pt(q, q.n, oRow(r + 1), base - 1);
        const quad = [p0, p1, p1.clone().setY(y), p0.clone().setY(y)];
        if (flip) t.quad(quad[1], quad[0], quad[3], quad[2], style.wall);
        else t.quad(...quad, style.wall);
      }
    }
    // The roof: a plate out over the back rows, on posts at the back.
    if (roofOver(c)) {
      const r = style.roof;
      const y0 = topY + 5;
      const y1 = y0 + r.rise;
      const o1 = D - r.depth;
      const back = [pt(A, A.n, D + 0.8, y0), pt(B, B.n, D + 0.8, y0)];
      const front = [pt(A, A.n, o1, y1), pt(B, B.n, o1, y1)];
      t.quad(back[0], back[1], front[1], front[0], r.colour);
      t.quad(front[0], front[1], back[1], back[0], r.under);
      const lip = [front[0].clone().setY(y1 - 0.8), front[1].clone().setY(y1 - 0.8)];
      t.quad(front[0], front[1], lip[1], lip[0], shade(r.colour, 0.85));
      if (k % 2 === 0) {
        const post = pt(A, A.n, D + 0.4, topY);
        solid.push(piece(new BoxGeometry(0.5, y0 - topY + 0.2, 0.5), shade(style.wall, 0.75), new Matrix4().makeTranslation(post.x, (topY + y0) / 2, post.z)));
      }
      if (r.green && !lite) t.quad(lip[0].clone().setY(y1 + 0.35), lip[1].clone().setY(y1 + 0.35), front[1].clone().setY(y1 + 0.35), front[0].clone().setY(y1 + 0.35), '#4f8a3f');
      if (r.lights) {
        // A band of floodlights under the roof's front edge.
        const lamp = front[0].clone().lerp(front[1], 0.5).setY(y1 - 1.1);
        glow.push(piece(new BoxGeometry(ds * 0.7, 0.45, 0.45), '#fff6d8', new Matrix4().compose(lamp, new Quaternion().setFromUnitVectors(new Vector3(1, 0, 0), B.p.clone().sub(A.p).setY(0).normalize()), new Vector3(1, 1, 1))));
      }
    }
    // The stadium's own touch on its stands.
    if (style.touch === 'nest') {
      // The woven steel shell: crossing beams outside the back wall, rising above the stands.
      const g0 = Math.min(backA, backB);
      const shell = topY + 9;
      const a0 = pt(A, A.n, D + 1.5, g0);
      const b1 = pt(B, B.n, D + 3.5, shell);
      const b0 = pt(B, B.n, D + 1.5, g0);
      const a1 = pt(A, A.n, D + 3.5, shell);
      for (const [u, v] of [[a0, b1], [b0, a1]]) {
        const dir = v.clone().sub(u);
        solid.push(piece(new BoxGeometry(0.9, 0.9, dir.length()), '#9a9da3', new Matrix4().compose(u.clone().lerp(v, 0.5), new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), dir.normalize()), new Vector3(1, 1, 1))));
      }
      t.quad(pt(A, A.n, D + 3.5, shell), pt(B, B.n, D + 3.5, shell), pt(B, B.n, D - 4, shell + 1), pt(A, A.n, D - 4, shell + 1), '#8e9197');
      glow.push(piece(new BoxGeometry(0.4, 1.2, 0.4), '#e2412f', new Matrix4().makeTranslation(...pt(A, A.n, D + 0.9, topY - 3).toArray())));
    } else if (style.touch === 'colonnade' && k % 2 === 0) {
      const post = pt(A, A.n, D - 0.6, topY);
      solid.push(piece(new BoxGeometry(1.1, 6, 1.1), '#ddd4c2', new Matrix4().makeTranslation(post.x, topY + 3, post.z)));
      const len = A.p.distanceTo(B.p) * 2;
      const lintel = pt(A, A.n, D - 0.6, topY + 6.3).lerp(pt(B, B.n, D - 0.6, topY + 6.3), 0.5);
      solid.push(piece(new BoxGeometry(len, 0.7, 1.3), '#d6ccb8', new Matrix4().compose(lintel, new Quaternion().setFromUnitVectors(new Vector3(1, 0, 0), B.p.clone().sub(A.p).setY(0).normalize()), new Vector3(1, 1, 1))));
    } else if (style.touch === 'marble' && k % 3 === 0 && !lite) {
      // A low marble balustrade along the top row.
      t.quad(pt(A, A.n, D - 0.3, topY), pt(B, B.n, D - 0.3, topY), pt(B, B.n, D - 0.3, topY + 1.1), pt(A, A.n, D - 0.3, topY + 1.1), '#f6f3ec');
    }
    const g = t.geometry();
    if (clearOf(g)) solid.push(g);
    else g.dispose();
    spots.push({ x: c.mid.p.x + c.mid.n.x * D * 0.5, z: c.mid.p.z + c.mid.n.z * D * 0.5, r: D * 0.7 + 4 });
  }
  // The arena itself: no trees inside the stands.
  for (let u = -st.L - st.B * 0.6; u <= st.L + st.B * 0.6; u += st.B * 0.6) {
    const p = st.world(u, 0);
    spots.push({ x: p.x, z: p.z, r: st.B });
  }

  // Where the track runs out through the stands: a gateway frame each side (the stand's ends) is enough;
  // a ramp over them already stands clear.
  // ── Floodlight masts round the outside ──
  const tallest = Math.max(...chunks.filter((c) => c && c.top !== null).map((c) => c.base + c.top), -Infinity);
  if (style.masts) {
    const out = D + 9;
    const corners = [[st.L, 1], [st.L, -1], [-st.L, 1], [-st.L, -1]];
    for (const [u, sv] of corners) {
      const d = Math.SQRT1_2 * (st.B + out);
      const p = st.world(u + Math.sign(u || 1) * d, sv * d);
      const y0 = groundAt(p.x, p.z) - 0.5;
      const top = Math.max(y0 + 34, tallest + 18);
      const toward = st.centre.clone().sub(p).setY(0).normalize();
      const q = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), toward);
      const parts = [
        piece(new CylinderGeometry(0.6, 1.1, top - y0, 6), '#7d838b', new Matrix4().makeTranslation(p.x, (y0 + top) / 2, p.z)),
        piece(new BoxGeometry(7, 4.4, 0.8), '#3a3e45', new Matrix4().compose(p.clone().setY(top + 1.6), q, new Vector3(1, 1, 1))),
      ];
      const mast = mergeGeometries(parts);
      if (!clearOf(mast)) continue;
      solid.push(mast);
      for (let i = 0; i < 4; i += 1) {
        for (let j = 0; j < 3; j += 1) {
          const lamp = p.clone().setY(top + 0.3 + j * 1.3).add(new Vector3(-2.4 + i * 1.6, 0, 0.5).applyQuaternion(q));
          glow.push(piece(new BoxGeometry(1.2, 1, 0.3), '#fff8e2', new Matrix4().compose(lamp, q, new Vector3(1, 1, 1))));
        }
      }
      spots.push({ x: p.x, z: p.z, r: 5 });
    }
  }
  // ── The stadium's own landmarks: brick towers, a corner tower, a row of arches with a flame cauldron ──
  const standAt = (u, v) => {
    const p = st.world(u, v);
    return { p, y: groundAt(p.x, p.z) - 0.5 };
  };
  const tryAdd = (parts, lamps = [], spot = null) => {
    const g = mergeGeometries(parts);
    if (!clearOf(g)) return false;
    solid.push(g);
    glow.push(...lamps);
    if (spot) spots.push(spot);
    return true;
  };
  const yawOf = (dir) => new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), dir.clone().setY(0).normalize());
  if (style.touch === 'brick') {
    for (const su of [1, -1]) {
      const { p, y } = standAt(su * (st.L * 0.5), st.B + D + 7);
      const h = Math.max(30, tallest - y + 14);
      tryAdd([
        piece(new BoxGeometry(9, h, 9), '#8f3f2d', new Matrix4().makeTranslation(p.x, y + h / 2, p.z)),
        piece(new BoxGeometry(10, 1.2, 10), '#6e2f22', new Matrix4().makeTranslation(p.x, y + h - 4, p.z)),
        piece(new ConeGeometry(7.4, 9, 4), '#4a5a52', new Matrix4().compose(new Vector3(p.x, y + h + 4.5, p.z), new Quaternion().setFromAxisAngle(UP, Math.PI / 4), new Vector3(1, 1, 1))),
      ], [], { x: p.x, z: p.z, r: 9 });
    }
  } else if (style.touch === 'tower') {
    const { p, y } = standAt(st.L + Math.SQRT1_2 * (st.B + D + 10), Math.SQRT1_2 * (st.B + D + 10));
    const h = Math.max(46, tallest - y + 24);
    const parts = [];
    for (const [x, z] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) parts.push(piece(new BoxGeometry(0.5, h, 0.5), '#b6bcc4', new Matrix4().makeTranslation(p.x + x, y + h / 2, p.z + z)));
    for (let k = 1; k < h / 5; k += 1) parts.push(piece(new BoxGeometry(3.7, 0.3, 3.7), '#a0a7b0', new Matrix4().makeTranslation(p.x, y + k * 5, p.z)));
    parts.push(piece(new BoxGeometry(5, 3, 5), '#2f3237', new Matrix4().makeTranslation(p.x, y + h + 1.5, p.z)));
    tryAdd(parts, [piece(new BoxGeometry(5.2, 0.6, 5.2), '#ffe7a8', new Matrix4().makeTranslation(p.x, y + h + 0.4, p.z))], { x: p.x, z: p.z, r: 5 });
  } else if (style.touch === 'arches') {
    // The peristyle: a row of tall arches across one end, just behind the stands, a flame cauldron over the middle.
    const end = st.L + st.B + D + 3;
    const { y } = standAt(end, 0);
    const toward = st.e1.clone().negate();
    const q = yawOf(toward);
    const across = st.e2;
    const W = Math.min(70, st.B * 1.4);
    const h = Math.max(24, tallest - y + 8);
    const parts = [];
    const n7 = 7;
    for (let k = 0; k <= n7; k += 1) {
      const p = st.world(end, -W / 2 + (W * k) / n7);
      parts.push(piece(new BoxGeometry(2.4, h, 3), '#d7c6a6', new Matrix4().compose(p.clone().setY(y + h / 2), q, new Vector3(1, 1, 1))));
    }
    for (let k = 0; k < n7; k += 1) {
      const p = st.world(end, -W / 2 + (W * (k + 0.5)) / n7);
      // (Each opening's head: a lintel and a rounded-looking step in.)
      parts.push(piece(new BoxGeometry(W / n7, 3, 3.2), '#cdbb9a', new Matrix4().compose(p.clone().setY(y + h - 1.5), q, new Vector3(1, 1, 1))));
      parts.push(piece(new BoxGeometry(W / n7 - 3.6, 1.6, 3.0), '#d7c6a6', new Matrix4().compose(p.clone().setY(y + h - 3.6), q, new Vector3(1, 1, 1))));
    }
    const mid = st.world(end, 0);
    parts.push(piece(new BoxGeometry(W + 3, 2.4, 4), '#cdbb9a', new Matrix4().compose(mid.clone().setY(y + h + 1.2), q, new Vector3(1, 1, 1))));
    // The cauldron: a plain wide bowl on a short pedestal (no torch design of any games).
    parts.push(piece(new CylinderGeometry(1.2, 1.6, 3, 8), '#8a7a62', new Matrix4().makeTranslation(mid.x, y + h + 3.9, mid.z)));
    parts.push(piece(new CylinderGeometry(3.6, 1.4, 2.4, 10), '#6f6352', new Matrix4().makeTranslation(mid.x, y + h + 6.6, mid.z)));
    const flame = [
      piece(new ConeGeometry(2.6, 6, 7), '#ff8a2a', new Matrix4().makeTranslation(mid.x, y + h + 10.6, mid.z)),
      piece(new ConeGeometry(1.5, 4.4, 6), '#ffd36a', new Matrix4().makeTranslation(mid.x + 0.3, y + h + 10.2, mid.z)),
    ];
    void across;
    tryAdd(parts, flame, { x: mid.x, z: mid.z, r: W / 2 });
  }

  // ── The scoreboard: at an end of the stadium (a horseshoe's closed end), facing the arena ──
  let board = null;
  for (const su of openEnd ? [-openEnd] : [1, -1]) {
    const u = su * (st.L + st.B + D + 2);
    const { p, y } = standAt(u, 0);
    const facing = st.e1.clone().multiplyScalar(-su);
    const q = yawOf(facing);
    const W = 18;
    const Hh = 9;
    const bottom = Math.max(y + 4, tallest - Hh * 0.35);
    const parts = [
      piece(new BoxGeometry(W, Hh, 0.8), '#1d1f23', new Matrix4().compose(p.clone().setY(bottom + Hh / 2), q, new Vector3(1, 1, 1))),
      ...[-W / 3, W / 3].map((x) => piece(new BoxGeometry(0.9, bottom - y + 0.5, 0.9), '#4a4e55', new Matrix4().compose(p.clone().add(new Vector3(x, 0, -0.6).applyQuaternion(q)).setY((y + bottom) / 2), q, new Vector3(1, 1, 1)))),
    ];
    if (tryAdd(parts, [], { x: p.x, z: p.z, r: 12 })) {
      board = { centre: p.clone().setY(bottom + Hh / 2), q, facing };
      break;
    }
  }
  return { solid, glow, spots, board };
}
