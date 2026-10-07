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

const BUMP_HALF = 1.2;  // metres from a bump's crest to its foot (the physics throws marbles up at its foot)
const BUMP_HEIGHT = 0.45;

export const FEATURE_COLORS = {
  chevron: '#ffd21f', chevronBack: '#16161a', bumpA: '#2f6fb0', bumpB: '#ffffff',
  snow: '#fbfdff', ice: '#bfe9ff', coal: '#1d1f24', carrot: '#ff8a1f', hat: '#2a2d36', scarf: '#e23b3b',
  bear: '#f7f3ea', bearDark: '#26262b', frost: '#e8f6ff',
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
 * Builds the features of a track on an ice channel.
 * Returns { group, update(t) } (t: ms after the start) or null if it has none.
 */
export function buildTrackFeatures(centerline, channel, features) {
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
  let bear = null;
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
      bear = { arm, paw, claws, shoulder, pawAt, inward };
    }
  }

  for (const f of features) {
    if (f.type === 'boost' || f.type === 'bump') continue;
    const xa = Math.min(f.l, f.l2 ?? f.l) * across;
    const xb = Math.max(f.l, f.l2 ?? f.l) * across;
    solids.push({ id: solids.length, type: f.type, s: f.at * channel.arc, xa, xb, reach: (f.radius ?? 0.7) + 0.55, rest: f.l * across, full: (f.reach ?? f.l) * across });
  }

  // One mesh per material.
  const tex = parts.chevron ? chevronTexture() : null;
  const materials = {
    chevron: new MeshBasicMaterial({ map: tex, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }),
    bump: new MeshLambertMaterial({ vertexColors: true }),
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
  };
  for (const [key, list] of Object.entries(parts)) {
    // Merge like with like (all with the same attributes).
    const keep = ['position', 'normal', ...(key === 'chevron' ? ['uv'] : []), ...(key === 'bump' ? ['color'] : [])];
    const ready = list.map((g) => {
      const n = g.index ? g.toNonIndexed() : g;
      if (!n.getAttribute('normal')) n.computeVertexNormals();
      for (const name of Object.keys(n.attributes)) if (!keep.includes(name)) n.deleteAttribute(name);
      return n;
    });
    const mesh = new Mesh(mergeGeometries(ready), materials[key]);
    mesh.name = key;
    group.add(mesh);
  }

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
      if (o.type !== 'polar_bear') continue;
      o.xa = o.xb = o.rest + (o.full - o.rest) * bearPaw(t / 1000);
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

  const update = (t, info) => {
    effects(t, info);
    if (!bear) return;
    const tip = bear.pawAt(bearPaw(t / 1000));
    const { arm, paw, claws, shoulder } = bear;
    const len = shoulder.distanceTo(tip);
    arm.position.copy(shoulder).lerp(tip, 0.5);
    arm.scale.set(1, len, 1);
    arm.quaternion.setFromUnitVectors(UP, tmp.subVectors(tip, shoulder).normalize());
    paw.position.copy(tip);
    claws.position.copy(tip).addScaledVector(bear.inward, 0.3);
  };
  update(0);
  const dispose = () => {
    group.traverse((o) => {
      if (!o.isMesh) return;
      o.geometry.dispose();
      if (!Object.values(materials).includes(o.material)) o.material.dispose();
    });
    for (const m of Object.values(materials)) m.dispose();
    tex?.dispose();
    bear?.arm.material.dispose();
    bear?.claws.material.dispose();
  };
  return { group, update, dispose, solidsAt };
}
