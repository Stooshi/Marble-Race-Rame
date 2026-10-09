/**
 * Scenery a track file names near a section, its start or its finish
 * (`scenery: [...]`), for kit sceneries (./kit.js): what grows there (bare
 * summit, snow-rimed rocks, birches, pines), race netting and timing boards
 * along a piste, a funicular railway climbing the hill, wooden houses with
 * warm windows, a frozen lake; and what stands in a splitter's middle
 * (`around`), a mountain hut with smoke from its chimney or a big rock.
 * Looks only. Each kind is merged into one or two draw calls.
 */
import {
  BoxGeometry, BufferGeometry, CanvasTexture, CircleGeometry, ConeGeometry, Float32BufferAttribute,
  Group, Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial, Points, PointsMaterial, Quaternion, SRGBColorSpace, Vector3,
} from 'three';
import { forkOffset, forkRadius } from '../iceChannel';
import { merge, piece } from './parts';
import { LANDMARKS } from './kitProps';
import { flakeTexture } from '../lighting';

const UP = new Vector3(0, 1, 0);
const at = (x, y, z) => new Matrix4().makeTranslation(x, y, z);
const box = (w, h, d, x, y, z, c) => piece(new BoxGeometry(w, h, d), c, at(x, y, z));
const lambert = () => new MeshLambertMaterial({ vertexColors: true, flatShading: true });

/** Which scenery tags apply where: the section's own, the start's near the top, the finish's near the end. */
export function sceneryTags(kit, p) {
  const sec = kit.sections.find((s) => p >= s.from && p <= s.to);
  const tags = [...(sec?.scenery ?? [])];
  if (p < 0.06) tags.push(...(kit.start?.scenery ?? []));
  if (p > 0.94) tags.push(...(kit.finish?.scenery ?? []));
  return tags;
}

/**
 * A lookup from a spot on the ground to the scenery tags of the nearest stretch of track
 * (within `reach` metres; beyond it, none).
 */
export function tagsNear(centerline, kit, reach = 160) {
  const { samples, segments } = centerline;
  const pts = [];
  for (let i = 0; i <= segments; i += 3) pts.push({ x: samples[i].pos.x, z: samples[i].pos.z, tags: sceneryTags(kit, i / segments) });
  return (x, z) => {
    let best = null;
    let bd = reach * reach;
    for (const p of pts) {
      const d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < bd) { bd = d; best = p; }
    }
    return best ? best.tags : [];
  };
}

// ── A splitter's centrepiece, on the divider between its two channels ──────

/** Mountain hut or big rock, scaled to fit between the channels where they are furthest apart; smoke from the hut. */
export function buildCentrepieces(centerline, channel, kit, { lite = false } = {}) {
  const group = new Group();
  group.name = 'centrepieces';
  const parts = [];
  const chimneys = [];
  const { samples, segments } = centerline;
  for (const sec of kit.sections) {
    if (!sec.around || !LANDMARKS[sec.around]) continue;
    const fork = channel.forks.find((f) => f.s0 / channel.arc >= sec.from - 0.01 && f.s0 / channel.arc <= sec.to);
    if (!fork) continue;
    const sMid = (fork.s0 + fork.s1) / 2;
    const i = Math.round((sMid / channel.arc) * segments);
    const s = samples[i];
    // The divider's width here: between the two channels' inner rims.
    const inner = forkOffset(fork, sMid) - forkRadius(fork, channel.radius, sMid) * Math.sin(channel.maxAngle) - 0.45;
    const gap = 2 * inner;
    const lm = LANDMARKS[sec.around];
    const scale = Math.min(1, (gap - 0.6) / (2 * lm.radius * (sec.around === 'mountain-hut' ? 0.62 : 0.85)));
    const top = s.pos.y + forkRadius(fork, channel.radius, sMid) * (1 - Math.cos(channel.maxAngle));
    const along = new Vector3(s.tangent.x, 0, s.tangent.z).normalize();
    const q = new Quaternion().setFromAxisAngle(UP, Math.atan2(along.x, along.z) + Math.PI / 2);
    const g = lm.build();
    g.applyMatrix4(new Matrix4().compose(new Vector3(s.pos.x, top - 0.05, s.pos.z), q, new Vector3(scale, scale, scale)));
    parts.push(g);
    if (sec.around === 'mountain-hut') chimneys.push(new Vector3(2, 6.8, -1).multiplyScalar(scale).applyQuaternion(q).add(new Vector3(s.pos.x, top, s.pos.z)));
  }
  if (parts.length) {
    const m = new Mesh(merge(parts), lambert());
    m.name = 'centrepiece';
    group.add(m);
  }
  // Smoke from the chimney: soft puffs rising and drifting, on the race clock.
  const puffs = lite ? 10 : 24;
  const smoke = [];
  for (const c of chimneys) {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(new Float32Array(puffs * 3), 3));
    const p = new Points(g, new PointsMaterial({ color: '#d9dde3', map: flakeTexture(), size: 2.2, transparent: true, opacity: 0.6, depthWrite: false }));
    p.name = 'chimney smoke';
    p.frustumCulled = false;
    group.add(p);
    smoke.push({ p, c });
  }
  const update = (t) => {
    const sec = t / 1000;
    for (const { p, c } of smoke) {
      const pos = p.geometry.getAttribute('position');
      for (let k = 0; k < puffs; k += 1) {
        const u = ((sec * 0.18 + k / puffs) % 1 + 1) % 1; // each puff's share of its rise
        pos.setXYZ(k, c.x + u * 5 + Math.sin(k * 2.1 + sec) * 0.4 * u, c.y + u * 9, c.z + u * 2 + Math.cos(k * 1.7) * 0.5 * u);
      }
      pos.needsUpdate = true;
    }
  };
  update(0);
  return { group, update };
}

// ── Along a section: race netting and a timing board ─────────────────────────

function timingBoardTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const g = canvas.getContext('2d');
  g.fillStyle = '#101418';
  g.fillRect(0, 0, 256, 96);
  g.fillStyle = '#ffd21f';
  g.font = '700 40px ui-monospace, Menlo, monospace';
  g.textBaseline = 'middle';
  g.fillText('0:48.27', 24, 34);
  g.fillStyle = '#ff5a3c';
  g.font = '700 22px ui-monospace, Menlo, monospace';
  g.fillText('INTERMEDIATE  -0.31', 24, 74);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** A see-through orange safety net (a coarse mesh of cords): drawn with alpha-test, cheap. */
function netTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, 64, 64);
  g.strokeStyle = '#ff6a1f';
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(0, 2); g.lineTo(64, 2);        // the cords across…
  g.moveTo(2, 0); g.lineTo(2, 64);        // …and up
  g.stroke();
  g.fillStyle = '#ff6a1f';
  g.fillRect(0, 0, 64, 10);               // a solid band along the top of each panel
  const tex = new CanvasTexture(canvas);
  tex.wrapS = 1000; // RepeatWrapping
  tex.wrapT = 1000;
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** Orange race netting on poles along both banks of the sections tagged 'race-netting', and a timing board. */
export function buildRaceNetting(centerline, channel, kit, rows) {
  const group = new Group();
  group.name = 'race netting';
  const net = { pos: [], uv: [] };
  const poles = [];
  const boards = [];
  const { samples, segments } = centerline;
  const NET_H = 1.1;
  const CELL = 0.35; // metres per mesh square
  for (const sec of kit.sections) {
    if (!(sec.scenery ?? []).includes('race-netting')) continue;
    const i0 = Math.ceil(sec.from * segments) + 2;
    const i1 = Math.floor(sec.to * segments) - 2;
    for (const sign of [1, -1]) {
      let prev = null;
      let run = 0;
      for (let i = i0; i <= i1; i += 2) {
        const row = rows[i]?.[sign];
        if (!row) { prev = null; continue; }
        // On the level shoulder, 1 m out from the rim.
        const foot = row.inner.clone().lerp(row.shoulder, 0.7);
        if (prev) {
          const len = prev.distanceTo(foot);
          const [u0, u1] = [run / CELL, (run + len) / CELL];
          const v = NET_H / CELL;
          const c = [[prev, 0, u0], [foot, 0, u1], [foot, NET_H, u1], [prev, NET_H, u0]];
          for (const k of [0, 1, 2, 0, 2, 3]) {
            const [p, h, u] = c[k];
            net.pos.push(p.x, p.y + 0.15 + h, p.z);
            net.uv.push(u, h === 0 ? 0 : v);
          }
          run += len;
        }
        if ((i - i0) % 6 === 0) poles.push(box(0.08, 1.4, 0.08, foot.x, foot.y + 0.7, foot.z, '#3a3d42'));
        prev = foot;
      }
    }
    // The timing board, beside the start of the section on its left bank.
    const row = rows[i0 + 4]?.[1];
    if (row) {
      const s = samples[i0 + 4];
      const side = new Vector3(s.side.x, 0, s.side.z).normalize();
      const along = new Vector3(s.tangent.x, 0, s.tangent.z).normalize();
      const foot = row.inner.clone().addScaledVector(side, 3.2);
      const q = new Quaternion().setFromAxisAngle(UP, Math.atan2(-along.x, -along.z) - 0.5);
      const frame = merge([box(4.2, 1.8, 0.25, 0, 3.4, 0, '#22262c'), box(0.25, 3.4, 0.25, -1.6, 1.4, 0, '#3a3d42'), box(0.25, 3.4, 0.25, 1.6, 1.4, 0, '#3a3d42')]);
      frame.applyMatrix4(new Matrix4().compose(foot, q, new Vector3(1, 1, 1)));
      poles.push(frame);
      const face = new BoxGeometry(3.9, 1.5, 0.02);
      face.applyMatrix4(new Matrix4().compose(foot.clone().add(new Vector3(0, 3.4, 0)).add(new Vector3(0, 0, 0.14).applyQuaternion(q)), q, new Vector3(1, 1, 1)));
      boards.push(face);
    }
  }
  if (net.pos.length) {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(net.pos, 3));
    g.setAttribute('uv', new Float32BufferAttribute(net.uv, 2));
    g.computeVertexNormals();
    group.add(Object.assign(new Mesh(g, new MeshBasicMaterial({ map: netTexture(), alphaTest: 0.5, side: 2 /* DoubleSide */, transparent: false })), { name: 'netting' }));
  }
  if (poles.length) group.add(Object.assign(new Mesh(merge(poles), lambert()), { name: 'netting poles' }));
  if (boards.length) group.add(Object.assign(new Mesh(merge(boards), new MeshBasicMaterial({ map: timingBoardTexture() })), { name: 'timing board' }));
  return group;
}

// ── Wooden houses with warm windows ─────────────────────────────────────────

const HOUSE_COLOURS = ['#9c2f22', '#a8382a', '#d8a93a', '#e8e1d0', '#7a2a20'];

/** A Swedish wooden house (origin at the ground, front +z): the walls and roof, and its windows apart. */
function house(k) {
  const w = 6 + (k % 3);
  const d = 5 + (k % 2);
  const h = 3.2 + (k % 2) * 1.2;
  const walls = HOUSE_COLOURS[k % HOUSE_COLOURS.length];
  const roof = new ConeGeometry(Math.hypot(w, d) / 2 + 0.4, 2.6, 4);
  roof.applyMatrix4(new Matrix4().makeRotationY(Math.PI / 4));
  roof.applyMatrix4(new Matrix4().makeScale(w / Math.hypot(w, d) * 1.4, 1, d / Math.hypot(w, d) * 1.4));
  const body = merge([
    box(w, h, d, 0, h / 2, 0, walls),
    box(w + 0.1, 0.2, d + 0.1, 0, 0.1, 0, '#f2efe8'),
    piece(roof, '#f4f7fb', at(0, h + 1.2, 0)), // snow on the roof
    box(0.6, 1.4, 0.6, w / 4, h + 1.8, 0, '#5a524c'),
  ]);
  const windows = merge([-w / 4, w / 4].map((x) => box(1, 0.9, 0.1, x, h * 0.55, d / 2 + 0.06, '#ffc860')));
  return { body, windows, w, d };
}

/** Houses beside the stretches tagged 'wooden-houses' (and round the finish when it is). */
export function buildHouses(centerline, kit, { lite = false, arc, groundAt, clearance, solids, rand }) {
  const group = new Group();
  group.name = 'wooden houses';
  const bodies = [];
  const windows = [];
  const { samples, segments } = centerline;
  const spots = [];
  for (const sec of kit.sections) {
    if (!(sec.scenery ?? []).includes('wooden-houses')) continue;
    for (let p = sec.from; p <= sec.to; p += 12 / arc) spots.push(p);
  }
  if ((kit.finish?.scenery ?? []).includes('wooden-houses')) for (let k = 0; k < 6; k += 1) spots.push(0.97 + k * 0.006);
  let k = 0;
  const per = lite ? 1 : 2;
  for (const p of spots) {
    const i = Math.min(segments, Math.round(p * segments));
    const s = samples[i];
    const side = new Vector3(s.side.x, 0, s.side.z).normalize();
    for (let n = 0; n < per; n += 1) {
      const sign = rand() < 0.5 ? 1 : -1;
      const out = 22 + rand() * 45;
      const spot = s.pos.clone().addScaledVector(side, sign * out);
      if (clearance(spot.x, spot.z) < 14) continue;
      if (solids.some((o) => (o.x - spot.x) ** 2 + (o.z - spot.z) ** 2 < (o.r + 6) ** 2)) continue;
      const h = house(k);
      k += 1;
      const q = new Quaternion().setFromAxisAngle(UP, Math.atan2(-side.x * sign, -side.z * sign) + (rand() - 0.5) * 0.4);
      const m = new Matrix4().compose(new Vector3(spot.x, groundAt(spot.x, spot.z) - 0.3, spot.z), q, new Vector3(1, 1, 1));
      bodies.push(h.body.applyMatrix4(m));
      windows.push(h.windows.applyMatrix4(m));
      solids.push({ x: spot.x, z: spot.z, r: Math.max(h.w, h.d) / 2 + 2 });
    }
  }
  if (bodies.length) group.add(Object.assign(new Mesh(merge(bodies), lambert()), { name: 'houses' }));
  // Warm lights in the windows: unlit, so they glow at night.
  if (windows.length) group.add(Object.assign(new Mesh(merge(windows), new MeshBasicMaterial({ vertexColors: true })), { name: 'house windows' }));
  return group;
}

// ── A funicular railway climbing the hill ───────────────────────────────────

/**
 * A little red funicular beside the section tagged 'funicular': its rails run
 * straight up the hillside from below the section to above it, clear of the
 * track, and a red car rides up and down them on the race clock.
 */
export function buildFunicular(centerline, kit, { groundAt, clearance, lite = false }) {
  const sec = kit.sections.find((s) => (s.scenery ?? []).includes('funicular'));
  if (!sec) return null;
  const { samples, segments } = centerline;
  const i0 = Math.round(sec.from * segments);
  const i1 = Math.round(sec.to * segments);
  // The section's middle on the plan, and which way the hill falls (from its top to its bottom).
  const mid = new Vector3();
  for (let i = i0; i <= i1; i += 1) mid.add(samples[i].pos);
  mid.multiplyScalar(1 / (i1 - i0 + 1));
  const fall = samples[i1].pos.clone().sub(samples[i0].pos).setY(0);
  if (fall.lengthSq() < 1) fall.set(1, 0, 0);
  fall.normalize();
  const across = new Vector3(-fall.z, 0, fall.x);
  // Try lines beside the section on either side; keep the one furthest from any track.
  let best = null;
  for (const off of [70, -70, 90, -90, 110, -110]) {
    const centre = mid.clone().addScaledVector(across, off);
    const a = centre.clone().addScaledVector(fall, -130);
    const b = centre.clone().addScaledVector(fall, 130);
    let worst = Infinity;
    for (let k = 0; k <= 26; k += 1) {
      const p = a.clone().lerp(b, k / 26);
      worst = Math.min(worst, clearance(p.x, p.z));
    }
    if (!best || worst > best.worst) best = { a, b, worst };
  }
  if (!best || best.worst < 8) return null;
  const group = new Group();
  group.name = 'funicular';
  const N = lite ? 26 : 52;
  const pts = Array.from({ length: N + 1 }, (_, k) => {
    const p = best.a.clone().lerp(best.b, k / N);
    p.y = groundAt(p.x, p.z) + 0.5;
    return p;
  });
  const dir = best.b.clone().sub(best.a).normalize();
  const side = new Vector3(-dir.z, 0, dir.x);
  const rails = [];
  for (let k = 0; k < N; k += 1) {
    const a = pts[k];
    const b = pts[k + 1];
    for (const o of [-0.7, 0.7]) {
      const g = new BoxGeometry(0.12, 0.15, a.distanceTo(b) + 0.05);
      g.applyMatrix4(new Matrix4().lookAt(a, b, UP));
      const m = a.clone().add(b).multiplyScalar(0.5).addScaledVector(side, o);
      g.applyMatrix4(at(m.x, m.y, m.z));
      rails.push(piece(g, '#4a4d52'));
    }
    if (k % 2 === 0) {
      const g = new BoxGeometry(2.2, 0.15, 0.4);
      g.applyMatrix4(new Matrix4().lookAt(a, b, UP));
      g.applyMatrix4(at(a.x, a.y - 0.1, a.z));
      rails.push(piece(g, '#6b4a2f'));
    }
  }
  group.add(Object.assign(new Mesh(merge(rails), lambert()), { name: 'funicular rails' }));
  // The car: red, stepped to sit level on the slope, with lit windows.
  const car = new Mesh(merge([
    box(2.4, 2.4, 5, 0, 1.6, 0, '#c8241c'),
    box(2.5, 0.8, 4.2, 0, 2.3, 0, '#ffd77a'),
    box(2.6, 0.25, 5.2, 0, 2.95, 0, '#f2efe8'),
  ]), lambert());
  car.name = 'funicular car';
  group.add(car);
  const yaw = Math.atan2(dir.x, dir.z);
  const update = (t) => {
    // Up and down the line, pausing at each end: 40 s there and back.
    const u = (t / 1000 / 40) % 1;
    const k = u < 0.5 ? Math.min(1, Math.max(0, (u - 0.05) / 0.4)) : Math.min(1, Math.max(0, (0.95 - u) / 0.4));
    const f = k * N;
    const j = Math.min(N - 1, Math.floor(f));
    const p = pts[j].clone().lerp(pts[j + 1], f - j);
    car.position.copy(p);
    car.rotation.set(0, yaw, 0);
  };
  update(0);
  return { group, update, line: pts };
}

// ── A frozen lake ───────────────────────────────────────────────────────────

/** The frozen lake's ice (the basin is cut into the land by kitGround.js): pale ice with drifts of snow. */
export function buildLake(lake, { lite = false } = {}) {
  if (!lake) return null;
  const seg = lite ? 40 : 72;
  const ice = new CircleGeometry(1, seg);
  const pos = ice.getAttribute('position');
  for (let k = 1; k < pos.count; k += 1) {
    const a = Math.atan2(pos.getY(k), pos.getX(k));
    const r = lake.radius * lake.shape(-a);
    pos.setXY(k, Math.cos(a) * r, Math.sin(a) * r);
  }
  ice.rotateX(-Math.PI / 2);
  const drifts = [];
  for (let k = 0; k < (lite ? 6 : 14); k += 1) {
    const a = k * 2.399;
    const r = lake.radius * 0.75 * Math.sqrt((k + 0.5) / 14);
    const g = new CircleGeometry(6 + (k % 4) * 3, 8);
    g.rotateX(-Math.PI / 2);
    g.scale(1.8, 1, 0.8);
    g.rotateY(a);
    drifts.push(piece(g, '#f6f9fc', at(Math.cos(a) * r, 0.05, Math.sin(a) * r)));
  }
  const mesh = new Mesh(merge([piece(ice, '#bcd7ea'), ...drifts]), new MeshLambertMaterial({ vertexColors: true }));
  mesh.position.set(lake.x, lake.y, lake.z);
  mesh.name = 'frozen lake';
  mesh.userData.ground = true;
  return mesh;
}
