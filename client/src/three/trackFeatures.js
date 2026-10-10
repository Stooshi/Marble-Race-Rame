/**
 * Track features on ice channels (Bobsleigh Run): boost pads, speed bumps and
 * themed obstacles (ice blocks, a snowman, icicles and a polar bear), drawn
 * where the physics has them (src/game/trackFeatures.js): `at` is the share
 * of the way down the track, `l` the share of the way up the wall.
 *
 * Cartoon low-poly, built from a few simple shapes in code (no images): the
 * chevrons are our own design. Phone budget: everything but the bear's
 * swiping arm is merged into one mesh per material.
 */
import {
  AdditiveBlending, BoxGeometry, BufferGeometry, CanvasTexture, Color, ConeGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute,
  Group, IcosahedronGeometry, Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial, Quaternion, SphereGeometry, SRGBColorSpace, Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { channelLipAt, placeOnChannel } from './iceChannel';
import { ANIMALS } from './costumes/animals';
import { COSTUMES, COSTUME_COLORS } from './costumes';
import { mergeByArea, piece } from './scenery/parts';
import { bakeMovers } from './movers';

// The polar bear's timetable: the same as the physics' (src/game/trackFeatures.js; a test checks they agree).
const BEAR_PERIOD = 2.0;
const BEAR_SWIPE = 1.0;

/** How far the polar bear's paw reaches into the channel at `time` seconds after the start (0 on the rim, 1 at full stretch). */
export function bearPaw(time) {
  const t = ((time % BEAR_PERIOD) + BEAR_PERIOD) % BEAR_PERIOD;
  if (t >= BEAR_SWIPE) return 0;
  const k = Math.sin((Math.PI * t) / BEAR_SWIPE);
  return k * k;
}

// San Francisco's flopping sea lions: the same timetable as the physics' (src/game/trackFeatures.js; a test checks they agree).
const FLOP_PERIOD = 6.5;
const FLOP_IN = 0.7;
const FLOP_STAY = 2.6;
const FLOP_OUT = 0.9;

/** How far a flopping sea lion is into the channel at `time` seconds (0 on its perch, 1 lying where it flops to). */
export function seaLionFlop(time) {
  const t = ((time % FLOP_PERIOD) + FLOP_PERIOD) % FLOP_PERIOD;
  const ease = (x) => x * x * (3 - 2 * x);
  if (t < FLOP_IN) return ease(t / FLOP_IN);
  if (t < FLOP_IN + FLOP_STAY) return 1;
  if (t < FLOP_IN + FLOP_STAY + FLOP_OUT) return 1 - ease((t - FLOP_IN - FLOP_STAY) / FLOP_OUT);
  return 0;
}

// San Francisco's cable car: the same timetable as the physics' (src/game/trackFeatures.js; a test checks they agree).
const CABLE_PERIOD = 9;
const CABLE_CROSS = 4;

/** Where the cable car is at `time` seconds: null while away, else { k: 0..1 across, dir: +1 towards the left, -1 the other way }. */
export function cableCar(time) {
  const n = Math.floor(time / CABLE_PERIOD);
  const t = time - n * CABLE_PERIOD;
  if (t >= CABLE_CROSS) return null;
  return { k: t / CABLE_CROSS, dir: n % 2 === 0 ? 1 : -1 };
}

/**
 * Where the cable car is drawn at `time` seconds: as cableCar() while it crosses,
 * and also driving in and out along its rails for `extra` seconds either side
 * (out beyond the rims, where it cannot touch a marble): null when out of sight.
 * Returns { u: seconds since its crossing began (negative: still coming), dir }.
 */
function cableCarDrawn(time, extra) {
  const n = Math.floor(time / CABLE_PERIOD);
  const t = time - n * CABLE_PERIOD;
  if (t < CABLE_CROSS + extra) return { u: t, dir: n % 2 === 0 ? 1 : -1 };
  if (t > CABLE_PERIOD - extra) return { u: t - CABLE_PERIOD, dir: (n + 1) % 2 === 0 ? 1 : -1 };
  return null;
}

const SWIPERS = ['polar_bear', 'sea_lion']; // reach in from the rim on bearPaw's timetable
const BUS_STEP = 1.2; // the physics' round sections along a parked bus (src/game/trackFeatures.js busParts)
const busParts = (length) => {
  const n = Math.max(1, Math.round(length / BUS_STEP));
  return Array.from({ length: n + 1 }, (_, k) => (length * k) / n);
};
const DECOR = ['flowers', 'sea_lion_colony', 'penguins']; // drawn only: the physics ignores them
const SEA = -1.2; // the bay's water level (San Francisco's scenery)
const DOCK_OUT = 15; // metres from the middle of the street out to the colony's docks
const STRIPS = 4; // cobble strips at most across a braking zone (San Francisco: drawn only, the braking is the physics')
const DOCK_STEP = 9; // metres of pier per dock
const DRIVE_IN = 12; // metres the cable car is drawn driving in and out along its rails beyond the crossing

const BUMP_HALF = 1.2;  // metres from a bump's crest to its foot (the physics throws marbles up at its foot)
const BUMP_HEIGHT = 0.45;

export const FEATURE_COLORS = {
  chevron: '#ffd21f', chevronBack: '#16161a', bumpA: '#2f6fb0', bumpB: '#ffffff',
  snow: '#fbfdff', ice: '#bfe9ff', coal: '#1d1f24', carrot: '#ff8a1f', hat: '#2a2d36', scarf: '#e23b3b',
  bear: '#f7f3ea', bearDark: '#26262b', frost: '#e8f6ff',
  // San Francisco
  carRed: '#b8312f', carCream: '#f1e3bf', carWindow: '#2b3440', carRoof: '#4b3a2c', rail: '#2d2e33', deck: '#8d8f94',
  newsBox: '#2f5fb3', newsTop: '#e8edf5', hydrant: '#f2efe6', hydrantCap: '#2f5fb3',
  trashCan: '#2e6b45', trashLid: '#1f4a30', busWhite: '#f3f1ea', busRed: '#c8322f', busWindow: '#2b3440', tyre: '#1e1f24', street: '#55585f',
  // Table Mountain Run's animals
  baboon: '#7d6c58', baboonFace: '#c99a8c', elephant: '#9c9a95', tusk: '#f2ecdc', zebraW: '#f4f2ec', zebraB: '#1f1f22',
  giraffe: '#e3b35c', giraffeSpot: '#8a5a2b', penguinB: '#20242b', penguinW: '#f6f6f1', beak: '#f2a23a',
  seaLion: '#5a4030', seaLionDark: '#2b1f17', dock: '#9b7a55', dockEdge: '#5e4a36', rock: '#7b7d80', planterBox: '#8a6a48', leaf: '#3f8a3a', flowerA: '#ff6f91', flowerB: '#ffd23f',
};

/** Our own chevron design: bold yellow arrows on black, pointing down the track, with a yellow border. */
export function chevronTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  g.fillStyle = FEATURE_COLORS.chevronBack;
  g.fillRect(0, 0, 128, 256);
  g.fillStyle = FEATURE_COLORS.chevron;
  g.fillRect(0, 0, 10, 256);
  g.fillRect(118, 0, 10, 256);
  // Three chevrons; the texture's top (v = 1) is the far end of the pad.
  for (let k = 0; k < 3; k += 1) {
    const y = 40 + k * 70; // canvas y grows downwards: the tips point to the top
    g.beginPath();
    g.moveTo(20, y + 44);
    g.lineTo(64, y);
    g.lineTo(108, y + 44);
    g.lineTo(108, y + 70);
    g.lineTo(64, y + 26);
    g.lineTo(20, y + 70);
    g.closePath();
    g.fill();
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** The track's frame at progress p: centre-line point, level sideways direction (to the left) and direction along it. */
function frameAt(centerline, p) {
  const { samples, segments } = centerline;
  const f = Math.min(1, Math.max(0, p)) * segments;
  const i = Math.min(segments - 1, Math.floor(f));
  const a = samples[i];
  const b = samples[i + 1];
  const pos = new Vector3().lerpVectors(a.pos, b.pos, f - i);
  const side = new Vector3(a.side.x, 0, a.side.z).normalize();
  const along = new Vector3().subVectors(b.pos, a.pos).normalize();
  return { pos, side, along };
}

const UP = new Vector3(0, 1, 0);

/**
 * A sea lion lying on its belly, in local space: facing +z, belly at y = 0.
 * `head` raises its head (0 resting on its chest, 1 up high, barking);
 * `detail` 0 for a simpler one (the colony on its docks, seen from afar).
 * Returns { body, dark } geometry lists (its coat, and its flippers and nose).
 */
function seaLionShape(head = 1, detail = 1) {
  const at = (g, x, y, z, sx, sy, sz) => g.applyMatrix4(new Matrix4().compose(new Vector3(x, y, z), new Quaternion(), new Vector3(sx, sy, sz)));
  const ball = (r, extra = 0) => new IcosahedronGeometry(r, Math.max(0, detail + extra));
  const hy = 0.95 + 0.5 * head;
  const hz = 1.05 - 0.15 * head;
  return {
    body: [
      at(ball(1, 1), 0, 0.5, -0.1, 0.62, 0.5, 1.15),        // the long body
      at(ball(0.55), 0, 0.55 + 0.35 * head, 0.65, 0.95, 1.1, 0.95), // chest and neck
      at(ball(0.36), 0, hy, hz, 0.9, 0.85, 1.25),           // head
    ],
    dark: [
      at(ball(0.13, -1), 0, hy - 0.04, hz + 0.42, 1, 0.8, 1),   // nose
      ...[-1, 1].map((k) => at(ball(0.4, -1), k * 0.62, 0.1, 0.5, 0.75, 0.15, 0.45)),  // fore flippers
      ...[-1, 1].map((k) => at(ball(0.3, -1), k * 0.28, 0.08, -1.25, 0.55, 0.12, 0.8)), // tail flippers
    ],
  };
}

/**
 * Builds the features of a track on an ice channel.
 * Returns { group, update(t) } (t: ms after the start) or null if it has none.
 */
export function buildTrackFeatures(centerline, channel, features, { lite = false, compact = false } = {}) {
  if (!channel || !Array.isArray(features) || features.length === 0) return null;
  const across = channel.radius * channel.maxAngle; // metres along the wall from the middle to the top, per unit of l
  const group = new Group();
  const parts = {}; // material key → geometries (merged at the end)
  const add = (key, geometry, matrix) => {
    geometry.applyMatrix4(matrix);
    (parts[key] ??= []).push(geometry.index ? geometry.toNonIndexed() : geometry);
  };
  const pose = (position, quaternion = new Quaternion(), scale = new Vector3(1, 1, 1)) => new Matrix4().compose(position, quaternion, scale);
  const surface = (p, l, lift = 0) => {
    const normal = new Vector3();
    const point = placeOnChannel(centerline, channel, p, Math.max(-1, Math.min(1, l)), 0, 0, lift, new Vector3(), normal);
    return { point, normal };
  };
  const p = (at, metres = 0) => at + metres / channel.arc;
  const swipers = []; // the polar bear's and the sea lion's moving parts (and the elephant's trunk)
  const idlers = []; // the animals' small movements: { part, base, axis, swing, period, phase }
  const animalMats = {};
  const animalMat = (key) => (animalMats[key] ??= new MeshLambertMaterial({ color: FEATURE_COLORS[key] ?? COSTUME_COLORS[key], flatShading: true }));
  const animal = (kind, point, q, ...rest) => {
    for (const idle of ANIMALS[kind](add, animalMat, group, point, q, ...rest)) idlers.push({ ...idle, phase: idlers.length * 1.7 });
  };
  const wear = (build, point, q, size) => {
    for (const idle of build(add, animalMat, group, point, q, size)) idlers.push({ ...idle, phase: idlers.length * 1.7 });
  };
  /**
   * A costume from the library (./costumes), stood where its obstacle is: the
   * placement for its kind of obstacle, then its own builder. (Table Mountain
   * Run's animals were drawn by these same lines before the library existed.)
   */
  const dress = (f, costume) => {
    const zAxis = new Vector3(0, 0, 1);
    if (costume.places === 'block' || costume.places === 'slalom') {
      // In the pack's line, facing back up the track at the marbles coming: tilted
      // with the wall it sits on, or standing upright (tall ones, poles).
      const { point, normal } = surface(f.at, f.l, 0);
      const { along } = frameAt(centerline, f.at);
      const facing = along.clone().negate().setY(0).normalize();
      const upright = costume.upright || costume.places === 'slalom';
      const q = upright
        ? new Quaternion().setFromUnitVectors(zAxis, facing)
        : new Quaternion().setFromUnitVectors(UP, normal).multiply(new Quaternion().setFromUnitVectors(zAxis, facing));
      wear(costume.build, point, q, { radius: f.radius ?? 0.7, height: f.height ?? 1.2, l: f.l ?? 0, at: f.at });
    } else if (costume.places === 'curtain') {
      // A few figures standing across the high line, where the icicles hang.
      const { side } = frameAt(centerline, f.at);
      const from = f.l;
      const to = f.l2 ?? f.l;
      for (let k = 0; k < 3; k += 1) {
        const l = from + ((to - from) * (k + 0.5)) / 3;
        const { point } = surface(f.at + ((k - 1) * 0.6) / channel.arc, l, 0);
        // Standing upright on the steep wall (feet a little into it, so none hangs in the air).
        const q = new Quaternion().setFromUnitVectors(zAxis, side.clone().multiplyScalar(k % 2 ? 1 : -1));
        wear(costume.build, point.clone().addScaledVector(UP, -0.25), q);
      }
    } else if (costume.places === 'swipe') {
      // A body just outside the rim, an arm (or trunk) reaching into the channel on the swipe's timetable.
      const { side } = frameAt(centerline, f.at);
      const s = f.at * channel.arc;
      const lip = channelLipAt(channel, s) / channel.maxAngle;
      const sign = Math.sign(f.l) || -1;
      const rim = surface(f.at, sign * lip, 0).point;
      const out = side.clone().multiplyScalar(sign);
      const inward = out.clone().negate();
      const q = new Quaternion().setFromUnitVectors(zAxis, inward);
      const base = rim.clone().addScaledVector(out, costume.standOff).addScaledVector(UP, costume.sink);
      costume.body(add, base, q);
      const a = costume.arm;
      const shoulder = base.clone().add(new Vector3(...a.shoulder).applyQuaternion(q));
      const restL = f.l;
      const reachL = f.reach ?? f.l;
      const armMat = new MeshLambertMaterial({ color: FEATURE_COLORS[a.colour] ?? COSTUME_COLORS[a.colour], flatShading: true });
      const arm = new Mesh(new CylinderGeometry(a.radii[0], a.radii[1], 1, a.segments), armMat);
      const paw = new Mesh(new IcosahedronGeometry(a.tip, a.tipDetail), armMat);
      const claws = new Mesh(new IcosahedronGeometry(a.end, a.endDetail), armMat);
      group.add(arm, paw, claws);
      const pawAt = (k) => {
        const l = restL + (reachL - restL) * k;
        if (Math.abs(l) <= lip) return surface(f.at, l, a.lift).point;
        const beyond = (Math.abs(l) - lip) * across;
        return rim.clone().addScaledVector(out, beyond).addScaledVector(UP, a.outLift);
      };
      swipers.push({ arm, paw, claws, shoulder, pawAt, inward, nose: a.nose });
    } else if (costume.places === 'parked') {
      // Along the wall, filling the parked object's footprint: its inner flank on the wall, out over the rim.
      const s0 = f.at * channel.arc;
      const len = f.length ?? 10;
      const mid = f.at + len / 2 / channel.arc;
      const { side, along } = frameAt(centerline, mid);
      const sign = Math.sign(f.l) || -1;
      const lip = channelLipAt(channel, s0) / channel.maxAngle;
      const inner = surface(mid, sign * Math.min(Math.abs(f.l2 ?? f.l), lip), 0).point;
      const rimTop = surface(mid, sign * lip, 0).point;
      const width = 2.6;
      const outward = side.clone().multiplyScalar(sign);
      const flat = along.clone().setY(0).normalize();
      const q = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(outward, UP, flat));
      const centre = new Vector3(inner.x, rimTop.y, inner.z).addScaledVector(outward, width / 2);
      // `drop`: how far below the rim the footprint's inner edge is (where marbles hit it).
      wear(costume.build, centre, q, { len, width, height: f.height ?? 3, drop: Math.max(0, rimTop.y - inner.y) });
    }
  };
  const flopping = []; // the colony's sea lions flopping into the street
  let car = null;     // the cable car's body, rebuilt along the U as it crosses
  const pads = []; // boost pads: where they are (to spot marbles rolling onto them) and their flash
  const solids = []; // obstacle footprints, as the physics has them (metres along the track and along the wall)

  for (const f of features) {
    if (f.type === 'boost') {
      // A sheet of chevrons laid on the ice, following the U.
      const len = f.length ?? 8;
      const half = f.halfWidth ?? 1.3;
      const x0 = (f.l ?? 0) * across;
      const rows = 6;
      const cols = 6;
      const pos = [];
      const uv = [];
      for (let r = 0; r <= rows; r += 1) {
        for (let c = 0; c <= cols; c += 1) {
          const { point } = surface(p(f.at, (len * r) / rows), (x0 - half + (2 * half * c) / cols) / across, 0.025);
          pos.push(point.x, point.y, point.z);
          uv.push(1 - c / cols, r / rows);
        }
      }
      const index = [];
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          const a = r * (cols + 1) + c;
          index.push(a, a + 1, a + cols + 1, a + 1, a + cols + 2, a + cols + 1);
        }
      }
      const g = new BufferGeometry();
      g.setAttribute('position', new Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
      g.setIndex(index);
      g.computeVertexNormals();
      add('chevron', g.clone(), new Matrix4());
      // Its flash: the same sheet in glowing yellow, shown for a moment when a marble hits the pad.
      const flash = new Mesh(g, new MeshBasicMaterial({ color: '#fff27a', transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending }));
      flash.visible = false;
      flash.renderOrder = 2;
      group.add(flash);
      pads.push({ s0: f.at * channel.arc, len, x0, half, flash, start: -Infinity });
    } else if (f.type === 'bump') {
      // A rounded ridge across the whole channel, in blue and white bands.
      const s = f.at * channel.arc;
      const lip = channelLipAt(channel, s) / channel.maxAngle;
      const rows = 6;
      const cols = 24;
      const pos = [];
      const col = [];
      const A = new Color(FEATURE_COLORS.bumpA);
      const B = new Color(FEATURE_COLORS.bumpB);
      for (let r = 0; r <= rows; r += 1) {
        const a = -BUMP_HALF + (2 * BUMP_HALF * r) / rows;
        const h = BUMP_HEIGHT * 0.5 * (1 + Math.cos((Math.PI * a) / BUMP_HALF));
        for (let c = 0; c <= cols; c += 1) {
          const { point, normal } = surface(p(f.at, a), -lip + (2 * lip * c) / cols);
          point.addScaledVector(normal, h + 0.01);
          pos.push(point.x, point.y, point.z);
          const band = Math.floor(c / 3) % 2 ? A : B;
          col.push(band.r, band.g, band.b);
        }
      }
      const index = [];
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          const a = r * (cols + 1) + c;
          index.push(a, a + cols + 1, a + 1, a + 1, a + cols + 1, a + cols + 2);
        }
      }
      const g = new BufferGeometry();
      g.setAttribute('position', new Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new Float32BufferAttribute(col, 3));
      g.setIndex(index);
      g.computeVertexNormals();
      add('bump', g, new Matrix4());
    } else if (f.type === 'cobbles') {
      // Where the physics brakes the marbles (cobbles: the whole stretch, rim to
      // rim) the street stays asphalt; only the braking zones before the bends
      // show it, with a few short strips of grey cobblestones across the street,
      // spread along the zone. Brick-paved bends (look: 'brick') are drawn as plain
      // asphalt: the braking there is gentle, and a whole bend of stones was too much.
      if (f.look === 'brick') continue;
      if (features.some((g) => g.type === 'paint' && f.at < g.at + (g.length ?? 30) / channel.arc && g.at < f.at + (f.length ?? 25) / channel.arc)) continue; // (a painted board instead)
      const len = f.length ?? 25;
      const s0 = f.at * channel.arc;
      const lip = channelLipAt(channel, s0) / channel.maxAngle;
      const cols = lite ? 10 : 16; // stones across the street
      const rows = 2; // rows of stones in a strip, each about 0.9 m long
      const stripLen = rows * 0.9;
      const strips = Math.max(2, Math.min(STRIPS, Math.round(len / 10)));
      const pos = [];
      const col = [];
      // (On a sand channel, Table Mountain Run's, they are rough strips of red-brown gravel instead.)
      // (The Selarón Steps, look 'mosaic': tiles in red, yellow, blue and green.)
      const sand = channel.look === 'sand';
      const shades = (f.look === 'mosaic' ? ['#d8312a', '#f2c230', '#2f6fd0', '#2f9a4a', '#f2efe8']
        : sand ? ['#9c6b45', '#b07b50', '#8a5c3a', '#c08a5c'] : ['#a8a39b', '#bdb6ac', '#97928b', '#c7c0b4']).map((c) => new Color(c));
      const grout = new Color(sand ? '#5e3e27' : '#3e3b38');
      const quad = (a0, a1, u0, u1, lift, color) => {
        const corners = [[a0, u0], [a0, u1], [a1, u1], [a1, u0]].map(([at, u]) => surface(at, -lip + 2 * lip * u, lift).point);
        for (const k of [0, 1, 2, 0, 2, 3]) {
          pos.push(corners[k].x, corners[k].y, corners[k].z);
          col.push(color.r, color.g, color.b);
        }
      };
      for (let k = 0; k < strips; k += 1) {
        const from = ((len - stripLen) * k) / (strips - 1); // metres into the zone: the first at its start, the last at its end
        for (let r = 0; r < rows; r += 1) {
          const a0 = p(f.at, from + r * 0.9);
          const a1 = p(f.at, from + (r + 1) * 0.9);
          // The dark joints under the stones (they show between them)…
          for (let c = 0; c < cols; c += 1) quad(a0, a1, c / cols, (c + 1) / cols, 0.015, grout);
          // …and the stones, every other row half a stone along.
          const offset = r % 2 ? 0.5 : 0;
          for (let c = -1; c < cols; c += 1) {
            const u0 = Math.max(0, (c + 0.08 + offset) / cols);
            const u1 = Math.min(1, (c + 0.92 + offset) / cols);
            if (u1 - u0 < 0.25 / cols) continue;
            quad(p(f.at, from + (r + 0.08) * 0.9), p(f.at, from + (r + 0.92) * 0.9), u0, u1, 0.03, shades[(k * 5 + r * 7 + c * 3) % shades.length]);
          }
        }
      }
      const g = new BufferGeometry();
      g.setAttribute('position', new Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new Float32BufferAttribute(col, 3));
      g.computeVertexNormals();
      add('cobbles', g, new Matrix4());
    } else if (f.type === 'paint') {
      // Paint on the floor, looks only: a Go board (19 lines each way on pale wood) or a
      // Xiangqi board (9 lines across, its river a band of blue across the middle).
      const len = f.length ?? 30;
      const s0 = f.at * channel.arc;
      const lip = channelLipAt(channel, s0) / channel.maxAngle;
      const u = 0.62; // the share of the wall up each side the board is painted on
      const pos = [];
      const col = [];
      // (Split across into narrow strips, so the paint follows the U rather than cutting across it.)
      const quad = (m0, m1, l0, l1, lift, color) => {
        const n = Math.max(1, Math.ceil((l1 - l0) / (lite ? 0.16 : 0.08)));
        for (let j = 0; j < n; j += 1) {
          const a = l0 + ((l1 - l0) * j) / n;
          const b = l0 + ((l1 - l0) * (j + 1)) / n;
          const corners = [[m0, a], [m0, b], [m1, b], [m1, a]].map(([m, l]) => surface(p(f.at, m), l * lip, lift).point);
          for (const k of [0, 1, 2, 0, 2, 3]) { pos.push(corners[k].x, corners[k].y, corners[k].z); col.push(color.r, color.g, color.b); }
        }
      };
      const go = f.look !== 'xiangqi';
      const wood = new Color(go ? '#d9b37a' : '#e8c890');
      const ink = new Color('#2a2420');
      const steps = lite ? 6 : 12;
      for (let k = 0; k < steps; k += 1) quad((len * k) / steps, (len * (k + 1)) / steps, -u, u, 0.012, wood);
      const across = go ? 19 : 9;
      for (let c = 0; c < across; c += 1) {
        const l = -u + (2 * u * (c + 0.5)) / across;
        for (let k = 0; k < steps; k += 1) quad((len * k) / steps, (len * (k + 1)) / steps, l - (go ? 0.005 : 0.008), l + (go ? 0.005 : 0.008), 0.02, ink);
      }
      const lines = go ? Math.round(len / 1.6) : Math.round(len / 3);
      for (let r = 0; r <= lines; r += 1) {
        const m = (len * r) / lines;
        if (!go && r === Math.floor(lines / 2)) { quad(m, m + len / lines, -u, u, 0.022, new Color('#6aa8c8')); continue; } // the river
        quad(m - 0.05, m + 0.05, -u, u, 0.02, ink);
      }
      const g = new BufferGeometry();
      g.setAttribute('position', new Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new Float32BufferAttribute(col, 3));
      g.computeVertexNormals();
      add('cobbles', g, new Matrix4());
    } else if (f.look && COSTUMES[f.look]) {
      // A costume from the library, stood where its obstacle is (see ./costumes).
      dress(f, COSTUMES[f.look]);
    } else if (f.type === 'penguins') {
      // African penguins on the quay beside the run-in (scenery only).
      const side = f.side ?? 1;
      const from = f.at;
      const to = f.to ?? f.at;
      const count = lite ? 6 : 14;
      for (let k = 0; k < count; k += 1) {
        const at = from + ((to - from) * (k + 0.5)) / count;
        const { pos, side: left } = frameAt(centerline, at);
        const s = at * channel.arc;
        const out = channelLipAt(channel, s) * channel.radius + 1.2 + ((k * 37) % 5) * 0.45;
        const rim = surface(at, side * channelLipAt(channel, s) / channel.maxAngle, 0).point;
        const point = new Vector3(pos.x, rim.y, pos.z).addScaledVector(left, side * out);
        const q = new Quaternion().setFromAxisAngle(UP, Math.atan2(-left.x * side, -left.z * side) + ((k * 53) % 7 - 3) * 0.25);
        animal('penguin', point, q, 0.85 + ((k * 29) % 4) * 0.1);
      }
    } else if (f.type === 'ice_block') {
      // A chunky block of ice sitting on the wall, turned a little.
      const { point, normal } = surface(f.at, f.l, 0);
      const size = (f.radius ?? 0.7) * 1.7;
      const q = new Quaternion().setFromUnitVectors(UP, normal).multiply(new Quaternion().setFromAxisAngle(UP, 0.5));
      add('ice', new BoxGeometry(size, (f.height ?? 1.1) + 0.2, size), pose(point.clone().addScaledVector(normal, (f.height ?? 1.1) / 2 - 0.05), q));
    } else if (f.type === 'snowman') {
      // Three snowballs standing upright on the wall, carrot nose, coal eyes and buttons, a hat and a scarf.
      const { point } = surface(f.at, f.l, 0);
      const { side, along } = frameAt(centerline, f.at);
      const facing = along.clone().negate().setY(0).normalize(); // looking back up the track at the marbles coming
      const r0 = (f.radius ?? 0.8) * 1.05;
      const balls = [[r0, r0 * 0.7], [r0 * 0.72, r0 * 1.9], [r0 * 0.5, r0 * 2.75]];
      for (const [r, y] of balls) add('snow', new IcosahedronGeometry(r, 2), pose(point.clone().addScaledVector(UP, y)));
      const head = point.clone().addScaledVector(UP, r0 * 2.75);
      const nose = new ConeGeometry(0.09, 0.45, 8);
      nose.rotateX(Math.PI / 2);
      const look = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), facing);
      add('carrot', nose, pose(head.clone().addScaledVector(facing, r0 * 0.5 + 0.18), look));
      for (const s of [-1, 1]) add('coal', new SphereGeometry(0.06, 8, 6), pose(head.clone().addScaledVector(facing, r0 * 0.44).addScaledVector(side, s * 0.15).addScaledVector(UP, 0.12)));
      for (const k of [0, 1, 2]) add('coal', new SphereGeometry(0.07, 8, 6), pose(point.clone().addScaledVector(UP, r0 * (1.55 + 0.3 * k)).addScaledVector(facing, r0 * 0.7)));
      add('hat', new CylinderGeometry(r0 * 0.36, r0 * 0.36, 0.5, 14), pose(head.clone().addScaledVector(UP, r0 * 0.5 + 0.2)));
      add('hat', new CylinderGeometry(r0 * 0.55, r0 * 0.55, 0.06, 16), pose(head.clone().addScaledVector(UP, r0 * 0.45)));
      add('scarf', new CylinderGeometry(r0 * 0.55, r0 * 0.6, 0.18, 14), pose(point.clone().addScaledVector(UP, r0 * 2.35)));
    } else if (f.type === 'icicles') {
      // Long icicles hanging from a frosty beam across the channel, down to just over the ice.
      const { point } = surface(f.at, f.l, 0);
      const s = f.at * channel.arc;
      const lip = channelLipAt(channel, s) / channel.maxAngle;
      const left = surface(f.at, lip, 0).point;
      const right = surface(f.at, -lip, 0).point;
      const beamY = Math.max(left.y, right.y) + 3.2; // high, so the follow camera looks under it as much as possible
      const ends = [left, right].map((e) => new Vector3(e.x, beamY, e.z));
      // One beam for icicles close together (within a few metres).
      const beams = (group.userData.icicleBeams ??= []);
      if (!beams.some((at) => Math.abs(at - f.at) * channel.arc < 8)) {
        beams.push(f.at);
        const span = ends[0].distanceTo(ends[1]);
        const mid = ends[0].clone().lerp(ends[1], 0.5);
        const q = new Quaternion().setFromUnitVectors(new Vector3(1, 0, 0), ends[1].clone().sub(ends[0]).normalize());
        add('frost', new BoxGeometry(span + 0.8, 0.45, 0.6), pose(mid, q));
        for (const e of ends) add('frost', new BoxGeometry(0.4, beamY - Math.min(left.y, right.y) + 0.4, 0.4), pose(new Vector3(e.x, (beamY + Math.min(left.y, right.y)) / 2, e.z)));
        // Short decorative icicles all along the beam.
        for (let k = 1; k < 9; k += 1) {
          const at = ends[0].clone().lerp(ends[1], k / 9);
          const len = 0.5 + 0.35 * ((k * 7) % 3);
          const cone = new ConeGeometry(0.12, len, 6);
          cone.rotateX(Math.PI);
          add('ice', cone, pose(at.clone().addScaledVector(UP, -0.22 - len / 2)));
        }
      }
      // The long one the marbles hit, reaching down to the ice.
      const len = beamY - 0.22 - (point.y + 0.35);
      const cone = new ConeGeometry((f.radius ?? 0.35) * 0.9, len, 8);
      cone.rotateX(Math.PI);
      add('ice', cone, pose(new Vector3(point.x, beamY - 0.22 - len / 2, point.z)));
    } else if (f.type === 'trash_can') {
      // A green city trash can with a domed lid.
      const { point, normal } = surface(f.at, f.l, 0);
      const q = new Quaternion().setFromUnitVectors(UP, normal);
      const r = f.radius ?? 0.5;
      const h = f.height ?? 1.1;
      const up = (y) => point.clone().addScaledVector(normal, y);
      add('trashCan', new CylinderGeometry(r * 0.95, r * 0.8, h * 0.85, 14), pose(up(h * 0.425), q));
      add('trashLid', new SphereGeometry(r, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), pose(up(h * 0.85), q, new Vector3(1, 0.45, 1)));
      add('trashLid', new CylinderGeometry(r * 1.0, r * 1.0, 0.08, 14), pose(up(h * 0.86), q));
    } else if (f.type === 'bus') {
      // A city bus parked on the pavement, its side overhanging the top of the
      // channel's wall (the stretch marbles bounce off), facing down the track.
      const s0 = f.at * channel.arc;
      const len = f.length ?? 10;
      const mid = f.at + len / 2 / channel.arc;
      const { side, along } = frameAt(centerline, mid);
      const sign = Math.sign(f.l) || -1;
      const lip = channelLipAt(channel, s0) / channel.maxAngle;
      const inner = surface(mid, sign * Math.min(Math.abs(f.l2 ?? f.l), lip), 0).point; // the bus's inner flank on the wall
      const rimTop = surface(mid, sign * lip, 0).point;
      const width = 2.6;
      const height = f.height ?? 3;
      const outward = side.clone().multiplyScalar(sign);
      const flat = along.clone().setY(0).normalize();
      const q = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(outward, UP, flat));
      const centre = new Vector3(inner.x, rimTop.y, inner.z).addScaledVector(outward, width / 2);
      const at = (y) => centre.clone().addScaledVector(UP, y);
      add('busWhite', new BoxGeometry(width, height * 0.62, len), pose(at(height * 0.31 + 0.35), q));
      add('busRed', new BoxGeometry(width + 0.04, height * 0.12, len + 0.04), pose(at(height * 0.45 + 0.35), q));
      add('busWindow', new BoxGeometry(width + 0.06, height * 0.24, len * 0.9), pose(at(height * 0.72 + 0.35), q));
      add('busWhite', new BoxGeometry(width, height * 0.06, len), pose(at(height * 0.87 + 0.35), q));
      for (const zf of [-0.33, 0.33]) {
        for (const xs of [-1, 1]) {
          const wheel = new CylinderGeometry(0.5, 0.5, 0.35, 12);
          wheel.rotateZ(Math.PI / 2);
          add('tyre', wheel, pose(centre.clone().addScaledVector(outward, (xs * width) / 2).addScaledVector(flat, zf * len).addScaledVector(UP, 0.5), q));
        }
      }
    } else if (f.type === 'news_box' || f.type === 'hydrant') {
      // Street furniture standing on the floor: a blue newspaper box, or a white fire hydrant with a blue cap.
      const { point, normal } = surface(f.at, f.l, 0);
      const { along } = frameAt(centerline, f.at);
      const q = new Quaternion().setFromUnitVectors(UP, normal);
      const turn = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), along.clone().setY(0).normalize());
      const r = f.radius ?? 0.6;
      const h = f.height ?? 1.2;
      const up = (y) => point.clone().addScaledVector(normal, y);
      if (f.type === 'news_box') {
        add('newsBox', new BoxGeometry(r * 1.7, h * 0.85, r * 1.4), pose(up(h * 0.425), q.clone().multiply(turn)));
        add('newsTop', new BoxGeometry(r * 1.8, h * 0.15, r * 1.5), pose(up(h * 0.92), q.clone().multiply(turn)));
        add('newsTop', new BoxGeometry(r * 1.2, h * 0.3, 0.04), pose(up(h * 0.55).addScaledVector(along, -r * 0.71), q.clone().multiply(turn)));
      } else {
        add('hydrant', new CylinderGeometry(r * 0.6, r * 0.7, h * 0.75, 14), pose(up(h * 0.375), q));
        add('hydrantCap', new SphereGeometry(r * 0.62, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), pose(up(h * 0.75), q));
        add('hydrantCap', new CylinderGeometry(r * 0.16, r * 0.16, 0.15, 8), pose(up(h * 1.08), q));
        const nozzle = new CylinderGeometry(r * 0.2, r * 0.2, r * 1.8, 10);
        nozzle.rotateZ(Math.PI / 2);
        add('hydrant', nozzle, pose(up(h * 0.5), q.clone().multiply(turn)));
        add('hydrantCap', new CylinderGeometry(r * 0.75, r * 0.75, 0.1, 14), pose(up(0.05), q));
      }
    } else if (f.type === 'flowers') {
      // Lombard Street's flower beds, lining both rims from `at` to `to` (scenery only).
      for (let at = f.at; at <= (f.to ?? f.at); at += (lite ? 8 : 5) / channel.arc) {
        const s = at * channel.arc;
        const lip = channelLipAt(channel, s) / channel.maxAngle;
        const { side, along } = frameAt(centerline, at);
        const turn = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), along.clone().setY(0).normalize());
        for (const sign of [-1, 1]) {
          const rim = surface(at, sign * lip, 0).point.addScaledVector(side, sign * 1.1);
          add('planterBox', new BoxGeometry(0.9, 0.5, 2.6), pose(rim.clone().addScaledVector(UP, 0.25), turn));
          add('leaf', new IcosahedronGeometry(0.55, lite ? 0 : 1), pose(rim.clone().addScaledVector(UP, 0.7), turn, new Vector3(0.9, 0.7, 2)));
          for (let k = -1; k <= 1; k += 1) {
            const bloom = rim.clone().addScaledVector(UP, 1.05).addScaledVector(along, k * 0.7).addScaledVector(side, ((k + 2) % 2) * 0.15);
            add((Math.round(at * 997) + k) % 2 ? 'flowerA' : 'flowerB', new IcosahedronGeometry(0.2, 0), pose(bloom));
          }
        }
      }
    } else if (f.type === 'cable_car') {
      // A cable car crossing the street on rails, side to side, on its
      // timetable; between crossings it waits out of sight. Its body hugs
      // the U (rebuilt each frame as it slides), so what you see is exactly
      // what the marbles hit. Beyond each rim a deck carries the rails on.
      const s = f.at * channel.arc;
      const lipX = (channelLipAt(channel, s) / channel.maxAngle) * across; // metres along the wall to the rim
      const { side, along } = frameAt(centerline, f.at);
      const width = f.width ?? 2.4;
      const height = f.height ?? 3.2;
      const half = (f.length ?? 7) / 2;
      const travel = across + half + 1;
      // A spot x metres along the surface from the middle (+: left): on the channel, or past the rim on a deck at rim height.
      const spot = (x, lift) => {
        if (Math.abs(x) <= lipX) return surface(f.at, x / across, lift);
        const sgn = Math.sign(x);
        const rim = surface(f.at, (sgn * lipX) / across, 0).point;
        return { point: rim.addScaledVector(side, sgn * (Math.abs(x) - lipX)).addScaledVector(UP, lift), normal: UP.clone() };
      };
      // The cross street it runs along, out over both pavements, with its two rails.
      const reachOut = travel + half + DRIVE_IN;
      for (const off of [-0.55, 0.55]) {
        const pos = [];
        const steps = 60;
        for (let k = 0; k <= steps; k += 1) {
          const x = -reachOut + (2 * reachOut * k) / steps;
          const { point } = spot(x, 0.04);
          for (const w of [-0.07, 0.07]) {
            const q = point.clone().addScaledVector(along, off + w);
            pos.push(q.x, q.y, q.z);
          }
        }
        const index = [];
        for (let k = 0; k < steps; k += 1) index.push(2 * k, 2 * k + 1, 2 * k + 2, 2 * k + 1, 2 * k + 3, 2 * k + 2);
        const g = new BufferGeometry();
        g.setAttribute('position', new Float32BufferAttribute(pos, 3));
        g.setIndex(index);
        g.computeVertexNormals();
        add('rail', g, new Matrix4());
      }
      const basis = new Matrix4().makeBasis(side, UP, along.clone().setY(0).normalize());
      const deckQ = new Quaternion().setFromRotationMatrix(basis);
      for (const sgn of [-1, 1]) {
        const len = reachOut - lipX + 0.5;
        const from = surface(f.at, (sgn * lipX) / across, 0).point;
        add('street', new BoxGeometry(len, 0.3, width + 2.4), pose(from.clone().addScaledVector(side, (sgn * len) / 2).addScaledVector(UP, -0.13), deckQ));
      }
      // The body: slices across, each a band of colours up its side (red, cream belt, windows, cream, roof).
      const SLICES = 18;
      const LEVELS = [0, 0.48, 0.56, 0.84, 0.93, 1];
      const BANDS = ['carRed', 'carCream', 'carWindow', 'carCream', 'carRoof'].map((k) => new Color(FEATURE_COLORS[k]));
      const tris = SLICES * (LEVELS.length - 1) * 2 * 2 * 3 + SLICES * 2 * 3 + 2 * (LEVELS.length - 1) * 2 * 3; // sides, roof, ends
      const position = new Float32BufferAttribute(new Float32Array(tris * 3), 3);
      const color = new Float32BufferAttribute(new Float32Array(tris * 3), 3);
      const geo = new BufferGeometry();
      geo.setAttribute('position', position);
      geo.setAttribute('color', color);
      const corner = new Vector3();
      const build = (xa, xb) => {
        // Points of slice j at level i, on the front (+1) or back (-1) side.
        const slices = [];
        for (let j = 0; j <= SLICES; j += 1) {
          const { point, normal } = spot(xa + ((xb - xa) * j) / SLICES, 0.05);
          slices.push({ point, normal });
        }
        const at = (j, i, f2) => corner.copy(slices[j].point).addScaledVector(slices[j].normal, LEVELS[i] * height).addScaledVector(along, (f2 * width) / 2).clone();
        let v = 0;
        const put = (a, b, c, col) => { for (const p2 of [a, b, c]) { position.setXYZ(v, p2.x, p2.y, p2.z); color.setXYZ(v, col.r, col.g, col.b); v += 1; } };
        const quad = (a, b, c, d, col) => { put(a, b, c, col); put(a, c, d, col); };
        for (let j = 0; j < SLICES; j += 1) {
          for (let i = 0; i < LEVELS.length - 1; i += 1) {
            // The window band: windows with cream pillars between them (every third slice).
            const col = i === 2 && j % 3 === 0 ? BANDS[1] : BANDS[i];
            quad(at(j, i, 1), at(j + 1, i, 1), at(j + 1, i + 1, 1), at(j, i + 1, 1), col);
            quad(at(j + 1, i, -1), at(j, i, -1), at(j, i + 1, -1), at(j + 1, i + 1, -1), col);
          }
          const top = LEVELS.length - 1;
          quad(at(j, top, 1), at(j + 1, top, 1), at(j + 1, top, -1), at(j, top, -1), BANDS[BANDS.length - 1]);
        }
        for (const [j, f2] of [[0, -1], [SLICES, 1]]) {
          for (let i = 0; i < LEVELS.length - 1; i += 1) {
            const col = BANDS[i];
            if (f2 < 0) quad(at(j, i, -1), at(j, i, 1), at(j, i + 1, 1), at(j, i + 1, -1), col);
            else quad(at(j, i, 1), at(j, i, -1), at(j, i + 1, -1), at(j, i + 1, 1), col);
          }
        }
        position.needsUpdate = true;
        color.needsUpdate = true;
        geo.computeVertexNormals();
        geo.computeBoundingSphere();
      };
      const mesh = new Mesh(geo, new MeshLambertMaterial({ vertexColors: true, side: DoubleSide }));
      mesh.name = 'cable_car';
      mesh.visible = false;
      group.add(mesh);
      if (f.parked) {
        // Parked on its rails, standing across part of the street (l to l2): built once, always there.
        const xa = Math.min(f.l ?? 0, f.l2 ?? f.l ?? 0) * across;
        const xb = Math.max(f.l ?? 0, f.l2 ?? f.l ?? 0) * across;
        build(xa, xb);
        mesh.visible = true;
      } else car = { mesh, build, half, travel, phase: f.phase ?? 0, speed: (2 * travel) / CABLE_CROSS };
    } else if (f.type === 'sea_lion' && f.flop !== undefined) {
      // A sea lion of the pier's colony on a wooden perch beside the rim, flopping
      // down into the street on its timetable, lying there and hopping back out.
      const { side } = frameAt(centerline, f.at);
      const s = f.at * channel.arc;
      const lip = channelLipAt(channel, s) / channel.maxAngle;
      const sign = Math.sign(f.l) || -1;
      const rim = surface(f.at, sign * lip, 0).point;
      const out = side.clone().multiplyScalar(sign);
      const along = new Vector3().crossVectors(out, UP).normalize();
      const look = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), out);
      // Its perch: a deck on the pavement, and a gangway down to the docks.
      add('dock', new BoxGeometry(3.2, 0.3, 3.4), pose(rim.clone().addScaledVector(out, 1.8).addScaledVector(UP, -0.12), look));
      const deckEnd = rim.clone().addScaledVector(out, 3.4).addScaledVector(UP, -0.1);
      const dockAt = rim.clone().addScaledVector(out, DOCK_OUT - channel.radius * Math.sin(lip * channel.maxAngle) + 1);
      dockAt.y = SEA + 0.45;
      const span = new Vector3().subVectors(dockAt, deckEnd);
      add('dockEdge', new BoxGeometry(1.4, 0.15, span.length()), pose(deckEnd.clone().lerp(dockAt, 0.5), new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), span.clone().normalize())));
      const shape = seaLionShape(0.6);
      const geo = (list) => mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g)), false);
      const body = new Group();
      const coat = new Mesh(geo(shape.body), new MeshLambertMaterial({ color: FEATURE_COLORS.seaLion, flatShading: true }));
      const dark = new Mesh(geo(shape.dark), new MeshLambertMaterial({ color: FEATURE_COLORS.seaLionDark, flatShading: true }));
      body.add(coat, dark);
      body.name = 'flopping sea lion';
      group.add(body);
      const rest = f.l;
      const full = f.reach ?? f.l;
      const inward = out.clone().negate();
      const fwd = new Vector3();
      const basis = new Matrix4();
      flopping.push({
        phase: f.flop,
        place: (k) => {
          const l = rest + (full - rest) * k;
          let point;
          let normal;
          if (Math.abs(l) <= lip) ({ point, normal } = surface(f.at, l, 0));
          else {
            point = rim.clone().addScaledVector(out, (Math.abs(l) - lip) * across);
            normal = UP;
          }
          // Facing into the street (along the surface), hopping up a little as it flops.
          fwd.copy(inward).addScaledVector(normal, -inward.dot(normal)).normalize();
          const right = new Vector3().crossVectors(normal, fwd).normalize();
          basis.makeBasis(right, normal, fwd);
          body.quaternion.setFromRotationMatrix(basis);
          body.position.copy(point).addScaledVector(normal, 2 * k * (1 - k));
        },
      });
    } else if (f.type === 'sea_lion_colony') {
      // Pier 39's colony: floating wooden docks in the water beside the pier,
      // crowded with sea lions lazing about (scenery only).
      const sign = f.side ?? -1;
      const from = f.at;
      const to = f.to ?? f.at;
      const metres = (to - from) * channel.arc;
      const rand = (k) => {
        const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
        return x - Math.floor(x);
      };
      let n = 0;
      for (let d = 0; d < metres - 4; d += DOCK_STEP) {
        const { pos, side, along } = frameAt(centerline, p(from, d + DOCK_STEP / 2));
        const out = side.clone().multiplyScalar(sign);
        const dir = new Vector3(along.x, 0, along.z).normalize();
        const centre = new Vector3(pos.x, SEA + 0.25, pos.z).addScaledVector(out, DOCK_OUT + 2.5 + (n % 2) * 1.5);
        const look = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), dir);
        add('dock', new BoxGeometry(5, 0.4, DOCK_STEP - 1.6), pose(centre, look));
        for (const k of [-1, 1]) add('dockEdge', new BoxGeometry(0.3, 0.55, DOCK_STEP - 1.6), pose(centre.clone().addScaledVector(out, k * 2.5).addScaledVector(UP, -0.05), look));
        // Two or three sea lions on each, every one lying its own way, a few barking.
        const lying = 2 + (rand(n) > 0.5 ? 1 : 0);
        for (let j = 0; j < lying; j += 1) {
          const r = rand(n * 7 + j + 1);
          const yaw = r * Math.PI * 2;
          const spot = centre.clone()
            .addScaledVector(dir, (j - (lying - 1) / 2) * 2.6 + (rand(n * 11 + j) - 0.5))
            .addScaledVector(out, (rand(n * 13 + j) - 0.5) * 2)
            .addScaledVector(UP, 0.2);
          const m = pose(spot, new Quaternion().setFromAxisAngle(UP, yaw), new Vector3(0.85, 0.85, 0.85));
          const shape = seaLionShape(rand(n * 17 + j) > 0.6 ? 1 : 0.1, 0);
          for (const g of shape.body) add('seaLion', g, m);
          for (const g of shape.dark) add('seaLionDark', g, m);
        }
        n += 1;
      }
    } else if (f.type === 'sea_lion') {
      // A sea lion lying on a rock beside the pier, lunging its head into the channel on the swipe's timetable.
      const { side } = frameAt(centerline, f.at);
      const s = f.at * channel.arc;
      const lip = channelLipAt(channel, s) / channel.maxAngle;
      const sign = Math.sign(f.l) || -1;
      const rim = surface(f.at, sign * lip, 0).point;
      const out = side.clone().multiplyScalar(sign);
      const inward = out.clone().negate();
      const look = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), inward);
      const base = rim.clone().addScaledVector(out, 2.1);
      add('rock', new IcosahedronGeometry(1.5, 1), pose(base.clone().addScaledVector(UP, -0.4), look, new Vector3(1.3, 0.7, 1.4)));
      const body = base.clone().addScaledVector(UP, 0.75);
      add('seaLion', new IcosahedronGeometry(1, 2), pose(body, look, new Vector3(0.75, 0.7, 1.45)));
      const across2 = new Vector3().crossVectors(UP, inward).normalize();
      for (const k of [-1, 1]) add('seaLion', new IcosahedronGeometry(0.4, 1), pose(body.clone().addScaledVector(across2, k * 0.75).addScaledVector(inward, 0.4).addScaledVector(UP, -0.35), look, new Vector3(0.5, 0.2, 1.2)));
      const shoulder = body.clone().addScaledVector(inward, 0.9).addScaledVector(UP, 0.4);
      const restL = f.l;
      const reachL = f.reach ?? f.l;
      const neckMat = new MeshLambertMaterial({ color: FEATURE_COLORS.seaLion, flatShading: true });
      const arm = new Mesh(new CylinderGeometry(0.32, 0.42, 1, 10), neckMat);
      const paw = new Mesh(new IcosahedronGeometry(0.5, 1), neckMat);
      const claws = new Mesh(new IcosahedronGeometry(0.17, 1), new MeshLambertMaterial({ color: FEATURE_COLORS.seaLionDark }));
      group.add(arm, paw, claws);
      const pawAt = (k) => {
        const l = restL + (reachL - restL) * k;
        if (Math.abs(l) <= lip) return surface(f.at, l, 0.5).point;
        return rim.clone().addScaledVector(out, (Math.abs(l) - lip) * across).addScaledVector(UP, 0.9);
      };
      swipers.push({ arm, paw, claws, shoulder, pawAt, inward, nose: 0.45 });
    } else if (f.type === 'slalom_gate') {
      dress(f, COSTUMES['slalom-gate']); // a slalom gate with no costume of its own
    } else if (f.type === 'polar_bear') {
      // A polar bear sitting just outside the rim, swiping into the channel.
      const { pos, side } = frameAt(centerline, f.at);
      const s = f.at * channel.arc;
      const lip = channelLipAt(channel, s) / channel.maxAngle;
      const sign = Math.sign(f.l) || -1; // which side of the channel it sits on (+1: left)
      const rim = surface(f.at, sign * lip, 0).point;
      const out = side.clone().multiplyScalar(sign); // away from the channel
      const body = rim.clone().addScaledVector(out, 1.9).addScaledVector(UP, 0.9);
      const inward = out.clone().negate();
      const look = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), inward);
      add('bear', new IcosahedronGeometry(1, 2), pose(body, look, new Vector3(1.05, 1.15, 1.25)));
      const head = body.clone().addScaledVector(inward, 1.0).addScaledVector(UP, 1.15);
      add('bear', new IcosahedronGeometry(0.62, 2), pose(head));
      add('bear', new IcosahedronGeometry(0.3, 1), pose(head.clone().addScaledVector(inward, 0.55).addScaledVector(UP, -0.12), look, new Vector3(1, 0.8, 1.2)));
      add('bearDark', new SphereGeometry(0.1, 8, 6), pose(head.clone().addScaledVector(inward, 0.88).addScaledVector(UP, -0.05)));
      const across2 = new Vector3().crossVectors(UP, inward).normalize();
      for (const k of [-1, 1]) {
        add('bear', new SphereGeometry(0.2, 10, 8), pose(head.clone().addScaledVector(across2, k * 0.42).addScaledVector(UP, 0.5)));
        add('bearDark', new SphereGeometry(0.07, 8, 6), pose(head.clone().addScaledVector(inward, 0.5).addScaledVector(across2, k * 0.24).addScaledVector(UP, 0.18)));
      }
      // Its swiping arm: a shoulder on the rim side, a paw that reaches in (moved each frame).
      const shoulder = body.clone().addScaledVector(inward, 0.7).addScaledVector(UP, 0.45).addScaledVector(across2, 0.5);
      const restL = f.l;
      const reachL = f.reach ?? f.l;
      const armMat = new MeshLambertMaterial({ color: FEATURE_COLORS.bear });
      const arm = new Mesh(new CylinderGeometry(0.28, 0.32, 1, 10), armMat);
      const paw = new Mesh(new IcosahedronGeometry(0.42, 1), armMat);
      const claws = new Mesh(new IcosahedronGeometry(0.18, 1), new MeshLambertMaterial({ color: FEATURE_COLORS.bearDark }));
      group.add(arm, paw, claws);
      // Where the paw is for a reach k (0..1): beyond the rim when resting, in the channel at full stretch.
      const pawAt = (k) => {
        const l = restL + (reachL - restL) * k;
        if (Math.abs(l) <= lip) return surface(f.at, l, 0.45).point;
        // Past the rim: out over the outside of the channel, at rim height.
        const beyond = (Math.abs(l) - lip) * across;
        return rim.clone().addScaledVector(out, beyond).addScaledVector(UP, 0.6);
      };
      swipers.push({ arm, paw, claws, shoulder, pawAt, inward, nose: 0.3 });
    }
  }

  for (const f of features) {
    if (f.type === 'boost' || f.type === 'bump' || f.type === 'cobbles' || f.type === 'paint' || DECOR.includes(f.type)) continue;
    const l = f.l ?? 0;
    const xa = Math.min(l, f.l2 ?? l) * across;
    const xb = Math.max(l, f.l2 ?? l) * across;
    const radius = f.type === 'cable_car' ? (f.width ?? 2.4) / 2 : f.radius ?? 0.7;
    solids.push({
      id: solids.length, type: f.type, s: f.at * channel.arc, xa, xb, reach: radius + 0.55, rest: l * across, full: (f.reach ?? l) * across, flop: f.flop,
      ...(f.type === 'cable_car' && { half: (f.length ?? 7) / 2, travel: across + (f.length ?? 7) / 2 + 1, phase: f.phase ?? 0, parked: Boolean(f.parked) }),
    });
    // A parked bus: the physics' row of round sections down its length.
    if (f.type === 'bus') {
      const bus = solids.pop();
      for (const d of busParts(f.length ?? 10)) solids.push({ ...bus, id: solids.length, s: bus.s + d });
    }
  }

  // One mesh per material.
  const tex = parts.chevron ? chevronTexture() : null;
  const materials = {
    chevron: new MeshBasicMaterial({ map: tex, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }),
    bump: new MeshLambertMaterial({ vertexColors: true }),
    cobbles: new MeshLambertMaterial({ vertexColors: true, flatShading: true, polygonOffset: true, polygonOffsetFactor: -1 }),
    ice: new MeshLambertMaterial({ color: FEATURE_COLORS.ice, emissive: '#3a6c86', transparent: true, opacity: 0.78 }),
    snow: new MeshLambertMaterial({ color: FEATURE_COLORS.snow, emissive: '#8a96a2', flatShading: true }),
    coal: new MeshLambertMaterial({ color: FEATURE_COLORS.coal }),
    carrot: new MeshLambertMaterial({ color: FEATURE_COLORS.carrot, emissive: '#5a2200' }),
    hat: new MeshLambertMaterial({ color: FEATURE_COLORS.hat }),
    scarf: new MeshLambertMaterial({ color: FEATURE_COLORS.scarf }),
    bear: new MeshLambertMaterial({ color: FEATURE_COLORS.bear, emissive: '#5f5a50', flatShading: true }),
    bearDark: new MeshLambertMaterial({ color: FEATURE_COLORS.bearDark }),
    // Clear ice: the follow camera can see the marbles through the beam over the channel.
    frost: new MeshLambertMaterial({ color: FEATURE_COLORS.frost, emissive: '#6f8796', transparent: true, opacity: 0.35, depthWrite: false }),
    rail: new MeshLambertMaterial({ color: FEATURE_COLORS.rail, polygonOffset: true, polygonOffsetFactor: -2 }),
    street: new MeshLambertMaterial({ color: FEATURE_COLORS.street }),
    trashCan: new MeshLambertMaterial({ color: FEATURE_COLORS.trashCan }),
    trashLid: new MeshLambertMaterial({ color: FEATURE_COLORS.trashLid }),
    busWhite: new MeshLambertMaterial({ color: FEATURE_COLORS.busWhite, emissive: '#3a3833' }),
    busRed: new MeshLambertMaterial({ color: FEATURE_COLORS.busRed }),
    busWindow: new MeshLambertMaterial({ color: FEATURE_COLORS.busWindow }),
    tyre: new MeshLambertMaterial({ color: FEATURE_COLORS.tyre }),
    deck: new MeshLambertMaterial({ color: FEATURE_COLORS.deck }),
    dock: new MeshLambertMaterial({ color: FEATURE_COLORS.dock, flatShading: true }),
    dockEdge: new MeshLambertMaterial({ color: FEATURE_COLORS.dockEdge, flatShading: true }),
    newsBox: new MeshLambertMaterial({ color: FEATURE_COLORS.newsBox }),
    newsTop: new MeshLambertMaterial({ color: FEATURE_COLORS.newsTop }),
    hydrant: new MeshLambertMaterial({ color: FEATURE_COLORS.hydrant, emissive: '#55524a' }),
    hydrantCap: new MeshLambertMaterial({ color: FEATURE_COLORS.hydrantCap }),
    seaLion: new MeshLambertMaterial({ color: FEATURE_COLORS.seaLion, flatShading: true }),
    seaLionDark: new MeshLambertMaterial({ color: FEATURE_COLORS.seaLionDark, flatShading: true }),
    rock: new MeshLambertMaterial({ color: FEATURE_COLORS.rock, flatShading: true }),
    planterBox: new MeshLambertMaterial({ color: FEATURE_COLORS.planterBox }),
    leaf: new MeshLambertMaterial({ color: FEATURE_COLORS.leaf, flatShading: true }),
    flowerA: new MeshLambertMaterial({ color: FEATURE_COLORS.flowerA, emissive: '#5a1f2c' }),
    flowerB: new MeshLambertMaterial({ color: FEATURE_COLORS.flowerB, emissive: '#5a4a10' }),
    ...Object.fromEntries(['baboon', 'baboonFace', 'elephant', 'tusk', 'zebraW', 'zebraB', 'giraffe', 'giraffeSpot'].map((k) => [k, new MeshLambertMaterial({ color: FEATURE_COLORS[k], flatShading: true })])),
  };
  const plainPieces = [];
  const plain = (m) => m.isMeshLambertMaterial && m.flatShading && !m.transparent && !m.map && !m.vertexColors && !m.polygonOffset && m.emissive.getHex() === 0;
  for (const [key, list] of Object.entries(parts)) {
    // Merge like with like (all with the same attributes).
    const keep = ['position', 'normal', ...(key === 'chevron' ? ['uv'] : []), ...(key === 'bump' || key === 'cobbles' ? ['color'] : [])];
    const ready = list.map((g) => {
      const n = g.index ? g.toNonIndexed() : g;
      if (!n.getAttribute('normal')) n.computeVertexNormals();
      for (const name of Object.keys(n.attributes)) if (!keep.includes(name)) n.deleteAttribute(name);
      return n;
    });
    // Costumes' colours: one flat-shaded material each, made as they are used.
    materials[key] ??= new MeshLambertMaterial({ color: COSTUME_COLORS[key] ?? FEATURE_COLORS[key] ?? '#ff00ff', flatShading: true });
    // Kit tracks (compact): plain flat colours go into shared meshes, merged by neighbourhood below.
    if (compact && plain(materials[key]) && keep.length === 2) {
      for (const g of ready) plainPieces.push(piece(g, materials[key].color));
      continue;
    }
    const mesh = new Mesh(mergeGeometries(ready), materials[key]);
    mesh.name = key;
    group.add(mesh);
  }
  if (plainPieces.length) {
    const shared = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
    for (const geometry of mergeByArea(plainPieces, 250)) {
      const mesh = new Mesh(geometry, shared);
      mesh.name = 'costumes';
      group.add(mesh);
    }
  }
  // …and the animals' small movements, all in one mesh.
  const movers = compact ? bakeMovers(idlers, group, 'costumes:moving') : null;

  // Effects: a puff of snow where a marble slams into an obstacle, a yellow
  // streak and a rocket-booster flame behind a marble fired off a boost pad.
  // Small pools, hidden until used.
  const puffGeo = new IcosahedronGeometry(0.5, 1);
  const puffs = Array.from({ length: 10 }, () => {
    const m = new Mesh(puffGeo, new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
    m.visible = false;
    m.renderOrder = 3;
    group.add(m);
    return { mesh: m, start: -Infinity };
  });
  let nextPuff = 0;
  const streakGeo = new ConeGeometry(0.5, 1, 12, 1, true);
  streakGeo.rotateX(-Math.PI / 2); // along +z, wide end at the marble, tip trailing behind
  // The flame's shape: a cone from the marble's back (z = 0, wide) to its tip
  // (z = 1), white-hot at the nozzle through orange and red to nothing at the
  // tip. Painted, not glowing: glow washes out to white against the ice.
  const plumeGeo = new ConeGeometry(0.5, 1, 10, 4, true);
  plumeGeo.rotateX(Math.PI / 2);
  plumeGeo.translate(0, 0, 0.5);
  {
    const z = plumeGeo.getAttribute('position');
    const stops = [[0, '#fff3a0', 1], [0.3, '#ff9a10', 1], [0.65, '#f03a00', 0.85], [1, '#b01000', 0]];
    const a = new Color();
    const b = new Color();
    const colors = [];
    for (let k = 0; k < z.count; k += 1) {
      const u = Math.max(0, Math.min(1, z.getZ(k)));
      let j = 0;
      while (u > stops[j + 1][0]) j += 1;
      const [u0, c0, a0] = stops[j];
      const [u1, c1, a1] = stops[j + 1];
      const f = (u - u0) / (u1 - u0);
      a.set(c0).lerp(b.set(c1), f);
      colors.push(a.r, a.g, a.b, a0 + (a1 - a0) * f);
    }
    plumeGeo.setAttribute('color', new Float32BufferAttribute(colors, 4));
  }
  const streaks = new Map(); // marble index → { mesh, plume, core, start, dir }
  const streakOf = (i) => {
    if (!streaks.has(i)) {
      const m = new Mesh(streakGeo, new MeshBasicMaterial({ color: '#ffd21f', transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, side: DoubleSide }));
      m.visible = false;
      m.renderOrder = 3;
      group.add(m);
      // The booster flame: a short, flickering jet out of the back of the marble,
      // a white-hot core inside an orange-to-red plume, like a rocket engine (not
      // the trailing fire of the "Flaming" look players can choose).
      const plume = new Mesh(plumeGeo, new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false, side: DoubleSide }));
      const core = new Mesh(plumeGeo, new MeshBasicMaterial({ color: '#fffbe6', transparent: true, opacity: 0, depthWrite: false, side: DoubleSide }));
      plume.name = 'booster-flame';
      [plume, core].forEach((f, k) => {
        f.visible = false;
        f.renderOrder = 4 + k; // the core over the plume
        group.add(f);
      });
      streaks.set(i, { mesh: m, plume, core, start: -Infinity, dir: new Vector3(0, 0, 1) });
    }
    return streaks.get(i);
  };
  const prevP = [];
  const prevPos = [];
  let prevT = null;
  const lastPuff = new Map();
  const PUFF_MS = 450;
  const STREAK_MS = 1000;
  const FLAME_MS = 1000;
  const FLASH_MS = 400;

  /** Obstacle footprints at race time t (ms), for drawing marbles round them (the bear's paw moves). */
  const solidsAt = (t) => {
    for (const o of solids) {
      if (o.flop !== undefined) {
        const k = seaLionFlop(t / 1000 + o.flop);
        o.xa = o.xb = k > 0 ? o.rest + (o.full - o.rest) * k : 1e4; // on its perch: nowhere near the channel
      } else if (SWIPERS.includes(o.type)) o.xa = o.xb = o.rest + (o.full - o.rest) * bearPaw(t / 1000);
      else if (o.type === 'cable_car' && !o.parked) {
        const c = cableCar(t / 1000 + o.phase);
        if (!c) o.xa = o.xb = 1e4; // away: nowhere near the channel
        else {
          const centre = c.dir * (-o.travel + 2 * o.travel * c.k);
          o.xa = centre - o.half;
          o.xb = centre + o.half;
        }
      }
    }
    return solids;
  };

  const tmp = new Vector3();
  const BACK = new Vector3(0, 0, 1);
  /**
   * The booster flame of marble i, `age` ms after it hit a pad: it roars out at
   * once, flickers (worked out from race time alone, so every viewer and every
   * replay sees the same flicker) and sputters out over the last third.
   */
  const flame = (s, i, age, pos) => {
    const on = age >= 0 && age < FLAME_MS && Boolean(pos);
    s.plume.visible = s.core.visible = on;
    if (!on) return;
    const k = age / FLAME_MS;
    const roar = Math.min(1, age / 60) * (k < 0.65 ? 1 : 1 - (k - 0.65) / 0.35);
    const flicker = 1 + 0.18 * Math.sin(age * 0.07 + i * 1.7) + 0.12 * Math.sin(age * 0.19 + i * 4.1);
    const len = 2.4 * roar * flicker + 0.2;
    const width = 0.5 + 0.25 * roar; // slimmer than the marble, which shows round it
    s.plume.quaternion.setFromUnitVectors(BACK, tmp.copy(s.dir).negate());
    s.core.quaternion.copy(s.plume.quaternion);
    s.plume.position.copy(pos).addScaledVector(s.dir, -0.3);
    s.core.position.copy(s.plume.position);
    s.plume.scale.set(width, width, len);
    s.core.scale.set(width * 0.5, width * 0.5, len * 0.45);
    s.plume.material.opacity = Math.min(1, 1.3 * roar);
    s.core.material.opacity = 0.95 * Math.min(1, 1.3 * roar);
  };
  const effects = (t, { frame, positions, contacts } = {}) => {
    if (!frame || !positions) return;
    const back = prevT !== null && t < prevT - 50; // a replay scrubbed back: forget what was showing
    if (back) {
      for (const p of puffs) p.start = -Infinity;
      for (const s of streaks.values()) s.start = -Infinity;
      for (const p of pads) p.start = -Infinity;
      lastPuff.clear();
    }
    const room = channel.maxAngle * channel.radius;
    const n = frame.p.length;
    for (let i = 0; i < n; i += 1) {
      // Onto a boost pad since the last draw: flash the pad, streak the marble.
      if (!back && prevT !== null && prevP[i] !== undefined && t - prevT < 600) {
        const s0 = prevP[i] * channel.arc;
        const s1 = frame.p[i] * channel.arc;
        const x = (frame.l[i] ?? 0) * room;
        for (const pad of pads) {
          if (s0 < pad.s0 + 1 && s1 >= pad.s0 + 1 && Math.abs(x - pad.x0) <= pad.half) {
            pad.start = t;
            streakOf(i).start = t;
          }
        }
      }
      prevP[i] = frame.p[i];
    }
    // A puff where a marble touches an obstacle (once per contact).
    for (const c of contacts ?? []) {
      const key = `${c.index}:${c.solid.id}`;
      if (t - (lastPuff.get(key) ?? -Infinity) < 600) continue;
      lastPuff.set(key, t);
      const p = puffs[nextPuff];
      nextPuff = (nextPuff + 1) % puffs.length;
      p.start = t;
      p.mesh.position.copy(positions[c.index]);
    }
    for (const p of puffs) {
      const age = t - p.start;
      p.mesh.visible = age >= 0 && age < PUFF_MS;
      if (!p.mesh.visible) continue;
      const k = age / PUFF_MS;
      p.mesh.scale.setScalar(0.7 + 2.4 * k);
      p.mesh.material.opacity = 0.9 * (1 - k) * (1 - k);
    }
    for (const pad of pads) {
      const age = t - pad.start;
      pad.flash.visible = age >= 0 && age < FLASH_MS;
      if (pad.flash.visible) pad.flash.material.opacity = 0.95 * (1 - age / FLASH_MS);
    }
    for (const [i, s] of streaks) {
      const pos = positions[i];
      const age = t - s.start;
      const was = prevPos[i];
      if (was && pos.distanceTo(was) > 0.02) s.dir.subVectors(pos, was).normalize();
      s.mesh.visible = age >= 0 && age < STREAK_MS && Boolean(pos);
      flame(s, i, age, pos);
      if (!s.mesh.visible) continue;
      const k = age / STREAK_MS;
      const len = 6 * (1 - 0.6 * k);
      s.mesh.scale.set(1, 1, len);
      s.mesh.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), s.dir.clone().negate());
      s.mesh.position.copy(pos).addScaledVector(s.dir, -len / 2 - 0.3);
      s.mesh.material.opacity = 0.75 * (1 - k);
    }
    for (let i = 0; i < n; i += 1) (prevPos[i] ??= new Vector3()).copy(positions[i]);
    prevT = t;
  };

  const idleTurn = new Quaternion();
  const update = (t, info) => {
    effects(t, info);
    for (const sl of flopping) sl.place(seaLionFlop(t / 1000 + sl.phase));
    if (movers) movers.update(t);
    else for (const a of idlers) a.part.quaternion.copy(a.base).multiply(idleTurn.setFromAxisAngle(a.axis, a.swing * Math.sin((t / 1000 + a.phase) * (2 * Math.PI) / a.period)));
    for (const sw of swipers) {
      const tip = sw.pawAt(bearPaw(t / 1000));
      const { arm, paw, claws, shoulder } = sw;
      const len = shoulder.distanceTo(tip);
      arm.position.copy(shoulder).lerp(tip, 0.5);
      arm.scale.set(1, len, 1);
      arm.quaternion.setFromUnitVectors(UP, tmp.subVectors(tip, shoulder).normalize());
      paw.position.copy(tip);
      claws.position.copy(tip).addScaledVector(sw.inward, sw.nose);
    }
    if (car) {
      // On its timetable (as the physics has it while it crosses), driving in and out along its rails either side.
      const c = cableCarDrawn(t / 1000 + car.phase, DRIVE_IN / car.speed);
      car.mesh.visible = Boolean(c);
      if (c) {
        const centre = c.dir * (-car.travel + car.speed * c.u);
        car.build(centre - car.half, centre + car.half);
      }
    }
  };
  update(0);
  const dispose = () => {
    group.traverse((o) => {
      if (!o.isMesh) return;
      o.geometry.dispose();
      if (!Object.values(materials).includes(o.material)) o.material.dispose();
    });
    for (const m of Object.values(materials)) m.dispose();
    for (const m of Object.values(animalMats)) m.dispose();
    tex?.dispose();
  };
  return { group, update, dispose, solidsAt };
}
