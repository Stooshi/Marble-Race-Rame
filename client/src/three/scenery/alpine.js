/**
 * Bobsleigh Run's world: an ice channel carved into a snowy mountainside, deep
 * in pine forest. Snow banks up to the channel's walls, wooden trestles where
 * it runs high (over the lower loop of the corkscrew), a wooden start house at
 * the top, the finish in a snowy valley with flags and spectator stands, a few
 * log cabins, a moose beside the track and snowy peaks all around.
 *
 * Built like San Francisco (./sanFrancisco.js), on the same ground that hugs
 * the channel (./channelGround.js): the trees are drawn in tiles, so only those
 * in view are drawn, and phones get a lighter version (lite): a quarter of the
 * trees, all simple ones, coarser ground, fewer peaks.
 * Scenery only: the physics never sees any of it.
 */
import {
  Color, ConeGeometry, CylinderGeometry, Float32BufferAttribute, Group, Matrix4, Mesh, MeshLambertMaterial, Quaternion, Vector3,
} from 'three';
import { beam, box, hashString, merge, piece, seededRandom, smoothstep, triangles } from './parts';
import { buildTerrain, makeHeightField } from './terrain';
import { channelGround, tiledInstances } from './channelGround';

const SNOW_LEVEL = -2.05; // the valley floor (the theme's ground)
const SNOW_BANK = 2;      // metres of snow bank beside the channel's rim, at its height
const WOOD = '#8a5a35';
const WOOD_DARK = '#5e3b22';
const PINE = '#2e5b3c';
const PINE_DARK = '#244a31';
const SNOW = '#f6f9fc';

/** A pine tree, base at y = 0, about 10 m tall (full: trunk, two tiers and snow on top; lite: one cone). */
function pineGeometry(lite) {
  if (lite) {
    return merge([
      piece(new ConeGeometry(2.6, 9, 6, 1, true), PINE, new Matrix4().makeTranslation(0, 5.5, 0)),
      piece(new ConeGeometry(0.9, 1.6, 6, 1, true), SNOW, new Matrix4().makeTranslation(0, 9.3, 0)),
    ]);
  }
  return merge([
    piece(new CylinderGeometry(0.28, 0.38, 2.4, 5, 1, true), WOOD_DARK, new Matrix4().makeTranslation(0, 1.2, 0)),
    piece(new ConeGeometry(3, 5.5, 8, 1, true), PINE_DARK, new Matrix4().makeTranslation(0, 4.5, 0)),
    piece(new ConeGeometry(2.2, 4.8, 8, 1, true), PINE, new Matrix4().makeTranslation(0, 7.4, 0)),
    piece(new ConeGeometry(1, 1.8, 8, 1, true), SNOW, new Matrix4().makeTranslation(0, 9.9, 0)),
  ]);
}

/** A low bush half-buried in snow. */
function bushGeometry() {
  return merge([
    box(1.8, 1.1, 1.6, 0, 0.45, 0, '#3d6b45'),
    box(1.2, 0.35, 1.0, 0.1, 1.15, 0, SNOW),
  ]);
}

/** A log cabin, front facing +z, ground at y = 0. */
function cabinGeometry() {
  const z = 3.2;
  return merge([
    box(7, 3.4, 6.4, 0, 1.7, 0, WOOD),
    box(7.2, 0.25, 6.6, 0, 0.12, 0, WOOD_DARK),
    triangles([[-3.5, 3.4, z], [3.5, 3.4, z], [0, 5.6, z], [3.5, 3.4, -z], [-3.5, 3.4, -z], [0, 5.6, -z]], WOOD),
    // The roof under a thick layer of snow.
    triangles([[-4, 3.1, z + 0.5], [0, 5.9, z + 0.5], [0, 5.9, -z - 0.5], [-4, 3.1, z + 0.5], [0, 5.9, -z - 0.5], [-4, 3.1, -z - 0.5],
      [0, 5.9, z + 0.5], [4, 3.1, z + 0.5], [4, 3.1, -z - 0.5], [0, 5.9, z + 0.5], [4, 3.1, -z - 0.5], [0, 5.9, -z - 0.5]], SNOW),
    box(1.2, 2.2, 0.1, 1.6, 1.1, z + 0.02, WOOD_DARK), // the door
    box(1.3, 1.1, 0.1, -1.7, 1.9, z + 0.02, '#ffd38a'), // a warm window
    box(0.7, 1.8, 0.7, 2, 5, -1.2, '#7b7d80'), // the chimney
  ]);
}

/** The moose: standing side-on, facing +x, hooves at y = 0, about 2.3 m to the shoulder. */
function mooseGeometry() {
  const fur = '#4a3020';
  const dark = '#2b1b12';
  const antler = '#d9c7a0';
  const parts = [
    box(2.6, 1.3, 1.1, 0, 2.1, 0, fur), // body
    box(0.9, 1.5, 1.0, 1.0, 2.5, 0, fur), // shoulders (the hump)
    beam(new Vector3(1.4, 2.6, 0), new Vector3(2.0, 3.1, 0), 0.55, fur), // neck
    box(1.1, 0.55, 0.55, 2.4, 3.0, 0, fur), // head
    box(0.5, 0.45, 0.5, 2.95, 2.85, 0, dark), // the long nose
    box(0.15, 0.5, 0.15, 2.2, 2.55, 0, dark), // the bell under the chin
  ];
  for (const [x, z] of [[-1, -0.35], [-1, 0.35], [0.95, -0.35], [0.95, 0.35]]) parts.push(box(0.22, 1.5, 0.22, x, 0.75, z, dark)); // legs
  for (const s of [-1, 1]) {
    // The broad flat antlers, with a few points.
    parts.push(box(0.5, 0.12, 1.1, 2.2, 3.45, s * 0.75, antler));
    parts.push(box(0.12, 0.45, 0.12, 2.0, 3.65, s * 1.2, antler));
    parts.push(box(0.12, 0.45, 0.12, 2.4, 3.65, s * 1.25, antler));
  }
  return merge(parts);
}

/** The wooden start house: front (open, facing down the track) at +z, ground at y = 0. */
function startHouseGeometry(width) {
  const w = width;
  const d = 7;
  const h = 6.5;
  const parts = [
    box(w, 0.6, d, 0, 0.3, 0, WOOD_DARK), // the deck
    box(w, h, 0.5, 0, h / 2, -d / 2, WOOD), // back wall
    box(0.6, h, d, -w / 2, h / 2, 0, WOOD), // sides
    box(0.6, h, d, w / 2, h / 2, 0, WOOD),
    box(w + 1.5, 0.5, d + 1.5, 0, h + 0.25, 0, WOOD_DARK), // roof
    box(w + 1.6, 0.7, d + 1.6, 0, h + 0.8, 0, SNOW), // snow on it
    box(Math.min(10, w * 0.6), 1.6, 0.2, 0, h - 1.1, d / 2 + 0.2, '#c8102e'), // the red START board
    box(Math.min(10, w * 0.6) - 0.8, 0.5, 0.05, 0, h - 1.1, d / 2 + 0.32, '#ffffff'),
  ];
  for (const x of [-w / 2 + 2, w / 2 - 2]) parts.push(box(0.5, h, 0.5, x, h / 2, d / 2 - 0.3, WOOD_DARK)); // front posts
  return merge(parts);
}

/** A spectator stand: rows of benches stepping up away from the track (front at +z), crowded with fans. */
function standGeometry(length, rand) {
  const parts = [];
  const fans = ['#e63946', '#f4a261', '#2a9d8f', '#457b9d', '#ffbe0b', '#8338ec', '#fb5607', '#ffffff'];
  for (let r = 0; r < 4; r += 1) {
    const y = 0.6 + r * 0.75;
    const z = -r * 1.1;
    parts.push(box(length, 0.35, 1.1, 0, y, z, WOOD));
    parts.push(box(length, y, 0.2, 0, y / 2, z + 0.5, WOOD_DARK));
    for (let x = -length / 2 + 0.6; x < length / 2 - 0.4; x += 0.85) {
      if (rand() < 0.2) continue; // a few empty seats
      parts.push(box(0.5, 0.75, 0.4, x + (rand() - 0.5) * 0.2, y + 0.55, z - 0.15, fans[Math.floor(rand() * fans.length)]));
    }
  }
  parts.push(box(length + 0.6, 0.3, 4.8, 0, 3.9, -1.6, '#b8c4d0')); // a little roof
  return merge(parts);
}

/** A ring of snowy peaks: cones, rock below and snow above. */
function peakGeometry(radius, height, sides, rand) {
  const g = new ConeGeometry(radius, height, sides, 3, true);
  const pos = g.getAttribute('position');
  // A craggier outline: jitter the lower rings.
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i);
    if (y < height / 2 - 1) {
      const k = 1 + (rand() - 0.5) * 0.25;
      pos.setX(i, pos.getX(i) * k);
      pos.setZ(i, pos.getZ(i) * k);
    }
  }
  const flat = g.toNonIndexed();
  g.dispose();
  flat.translate(0, height / 2, 0);
  const p = flat.getAttribute('position');
  const colors = [];
  const rock = new Color('#7d8ea3');
  const snow = new Color(SNOW);
  for (let i = 0; i < p.count; i += 3) {
    const y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
    const c = y > height * 0.45 ? snow : rock;
    for (let k = 0; k < 3; k += 1) colors.push(c.r, c.g, c.b);
  }
  flat.setAttribute('color', new Float32BufferAttribute(colors, 3));
  flat.deleteAttribute('uv');
  return flat;
}

/** Builds the whole alpine world around Bobsleigh Run. Returns a Group (lite: the lighter version for phones). */
export function buildAlpine(centerline, track, theme, { lite = false } = {}) {
  const rand = seededRandom(hashString(`alpine:${track?.slug ?? ''}`));
  const lanes = Math.max(1, Number(track?.lane_count) || 4);
  const hug = channelGround(centerline, track, { rim: SNOW_BANK, dip: lite ? 6 : 3, under: lite ? 4 : 2 });
  const street = hug ? { ...hug.street, cap: 0.6 } : null;
  const groundLine = hug?.groundLine ?? centerline;
  const field = makeHeightField(groundLine, lanes, { hillHeight: 40, landRadius: 420, seaLevel: SNOW_LEVEL, street });
  const group = new Group();
  group.name = 'scenery:alpine';

  // The mountainside: snow, and bare rock where it is steep.
  const xs = centerline.samples.map((s) => s.pos.x);
  const zs = centerline.samples.map((s) => s.pos.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const margin = lite ? 240 : 360;
  const ground = buildTerrain(field, { minX: minX - margin, maxX: maxX + margin, minZ: minZ - margin, maxZ: maxZ + margin }, {
    cells: lite ? 90 : 140,
    colors: { sand: '#eef3f8', grass: '#f2f6fa', dry: '#ffffff', shade: '#8e9fb3' },
    tiles: lite ? 4 : 6,
  });
  const terrain = new Group();
  const groundMat = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
  for (const g of ground.geometries) terrain.add(new Mesh(g, groundMat));
  terrain.name = 'terrain';
  group.add(terrain);
  const groundAt = ground.groundAt;

  const { samples, segments } = centerline;
  const start = samples[0];
  const end = samples[segments];
  const startDir = new Vector3(start.tangent.x, 0, start.tangent.z).normalize();
  const endDir = new Vector3(end.tangent.x, 0, end.tangent.z).normalize();
  const endSide = new Vector3(-endDir.z, 0, endDir.x);
  const solids = []; // { x, z, r, top } things the trees keep clear of (and the camera stays above)
  const placed = new Group();
  placed.name = 'buildings';
  const woodMat = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const put = (geometry, name, x, z, yaw, keep) => {
    const mesh = new Mesh(geometry, woodMat);
    mesh.name = name;
    const y = groundAt(x, z);
    mesh.position.set(x, y, z);
    mesh.rotation.y = yaw;
    placed.add(mesh);
    geometry.computeBoundingBox();
    solids.push({ x, z, r: keep, top: y + geometry.boundingBox.max.y });
    return mesh;
  };
  const yawTo = (dir) => Math.atan2(dir.x, dir.z); // turns a +z-facing model to face along dir

  // The start house at the top, behind the wide starting funnel, open to the track.
  const funnelHalf = hug?.street.halfAt(0) ?? 12;
  const houseAt = start.pos.clone().addScaledVector(startDir, -9);
  put(startHouseGeometry(funnelHalf * 2 + 4), 'start house', houseAt.x, houseAt.z, yawTo(startDir), funnelHalf + 4);

  // The finish in the valley: flags along the catch area, spectator stands either side of the line.
  const penLength = hug?.pen?.length ?? 30;
  const penHalf = (hug?.pen?.halfWidth ?? 3.5) + 1.2;
  const flagColors = ['#e63946', '#ffbe0b', '#2a9d8f', '#457b9d', '#fb5607', '#8338ec'];
  const flagParts = [];
  for (let d = -10; d <= penLength; d += 5) {
    for (const s of [-1, 1]) {
      const base = end.pos.clone().addScaledVector(endDir, d).addScaledVector(endSide, s * (d < 0 ? 5.5 : penHalf));
      const y = groundAt(base.x, base.z);
      flagParts.push(piece(new CylinderGeometry(0.06, 0.06, 5, 5, 1, true), '#d9dde3', new Matrix4().makeTranslation(base.x, y + 2.5, base.z)));
      const c = flagColors[(Math.round(d / 5) + (s > 0 ? 3 : 0) + 60) % flagColors.length];
      const top = new Vector3(base.x, y + 4.9, base.z);
      const tip = top.clone().addScaledVector(endDir, 1.6).add(new Vector3(0, -0.6, 0));
      flagParts.push(triangles([[top.x, top.y, top.z], [top.x, top.y - 1.2, top.z], [tip.x, tip.y, tip.z], [top.x, top.y, top.z], [tip.x, tip.y, tip.z], [top.x, top.y - 1.2, top.z]], c));
    }
  }
  const flags = new Mesh(merge(flagParts), woodMat);
  flags.name = 'flags';
  placed.add(flags);
  for (const s of [-1, 1]) {
    const at = end.pos.clone().addScaledVector(endDir, -4).addScaledVector(endSide, s * 13);
    const stand = put(standGeometry(lite ? 12 : 16, rand), 'spectator stand', at.x, at.z, yawTo(endSide.clone().multiplyScalar(-s)), 10);
    stand.position.y -= 0.2;
  }

  // A few log cabins, back from the track on the lower slopes (no more than these).
  for (const [p, side, out] of [[0.33, 1, 34], [0.56, -1, 40], [0.78, 1, 30], [0.93, -1, 36]]) {
    const s = samples[Math.round(p * segments)];
    const sideDir = new Vector3(s.side.x, 0, s.side.z).normalize().multiplyScalar(side);
    const at = s.pos.clone().addScaledVector(sideDir, (hug?.street.halfAt(Math.round(p * segments)) ?? 5) + out);
    if (field.clearance(at.x, at.z) < 15) continue; // (another stretch of track there)
    put(cabinGeometry(), 'cabin', at.x, at.z, yawTo(sideDir.clone().negate()), 7);
  }

  // The moose, standing in the trees right beside the track where the marbles pass, watching them go by.
  {
    const i = Math.round(0.47 * segments);
    const s = samples[i];
    const sideDir = new Vector3(s.side.x, 0, s.side.z).normalize();
    const at = s.pos.clone().addScaledVector(sideDir, (hug?.street.halfAt(i) ?? 5) + 3);
    const along = new Vector3(s.tangent.x, 0, s.tangent.z).normalize();
    // Side-on to the track, head turned towards the marbles coming down.
    put(mooseGeometry(), 'moose', at.x, at.z, Math.atan2(-along.z, along.x) + Math.PI, 4);
  }
  group.add(placed);

  // Wooden trestles where the channel runs high above the ground (over the corkscrew's lower loop).
  const supported = []; // where (share of the track) a trestle stands
  if (hug) {
    const trestle = [];
    const step = hug.channel.arc / segments;
    for (let i = 0; i <= segments; i += Math.max(1, Math.round((lite ? 12 : 7) / step))) { // (phones: further apart)
      const s = samples[i];
      const half = hug.street.halfAt(i) - SNOW_BANK;
      const side = new Vector3(s.side.x, 0, s.side.z).normalize();
      const bottom = s.pos.y - 1.6; // the channel's skirt
      // (Decided from the exact ground, so both versions stand them in the same places.)
      let low = Infinity;
      for (const k of [-1, 0, 1]) low = Math.min(low, field.heightAt(s.pos.x + side.x * half * k, s.pos.z + side.z * half * k));
      if (bottom - low < 4) continue;
      supported.push(i / segments);
      for (const k of [-1, 1]) {
        const top = s.pos.clone().addScaledVector(side, k * (half - 0.6));
        top.y = bottom;
        const foot = top.clone().addScaledVector(side, k * 1.2);
        foot.y = groundAt(foot.x, foot.z) - 0.5;
        trestle.push(beam(foot, top, 0.45, WOOD));
      }
      const a = s.pos.clone().addScaledVector(side, -(half - 0.6));
      const b = s.pos.clone().addScaledVector(side, half - 0.6);
      for (const y of lite ? [bottom - 0.3] : [bottom - 0.3, bottom - (bottom - low) * 0.5]) {
        a.y = b.y = y;
        trestle.push(beam(a.clone(), b.clone(), 0.3, WOOD_DARK));
      }
    }
    if (trestle.length) {
      const mesh = new Mesh(merge(trestle), woodMat);
      mesh.name = 'trestles';
      group.add(mesh);
    }
  }

  // The forest: pines thick along the slopes, some right by the track, thinning further out; bushes by the track.
  const keepClear = (x, z, extra) => solids.every((o) => (o.x - x) ** 2 + (o.z - z) ** 2 > (o.r + extra) ** 2);
  const trees = [];
  const bushes = [];
  const maxTrees = lite ? 420 : 1700;
  const spots = [];
  const spacing = lite ? 11 : 6.5;
  for (let x = minX - margin * 0.8; x <= maxX + margin * 0.8; x += spacing) {
    for (let z = minZ - margin * 0.8; z <= maxZ + margin * 0.8; z += spacing) {
      spots.push([x + (rand() - 0.5) * spacing * 0.9, z + (rand() - 0.5) * spacing * 0.9, rand()]);
    }
  }
  spots.sort((a, b) => a[2] - b[2]); // random order, so the limit thins the forest evenly
  for (const [x, z, roll] of spots) {
    if (trees.length >= maxTrees) break;
    if (roll > 0.75) continue; // (never kept, whatever the distance: skip working it out)
    const c = field.clearance(x, z);
    if (c < 2.5 || c > 270) continue; // (not out where the mountain falls away to the valley floor)
    // Denser near the track (the forest it runs through), thinner far out.
    const keep = 0.75 - 0.5 * smoothstep(25, 260, c);
    if (roll > keep) continue;
    if (!keepClear(x, z, 3)) continue;
    const y = groundAt(x, z);
    if (y < SNOW_LEVEL + 3) continue;
    trees.push({ x, y, z, yaw: rand() * Math.PI * 2, scale: 0.75 + rand() * 0.6, tint: 0.85 + rand() * 0.25 });
  }
  const maxBushes = lite ? 100 : 450;
  for (let tries = 0; bushes.length < maxBushes && tries < maxBushes * 6; tries += 1) {
    const s = samples[Math.floor(rand() * (segments + 1))];
    const side = new Vector3(s.side.x, 0, s.side.z).normalize().multiplyScalar(rand() < 0.5 ? -1 : 1);
    const at = s.pos.clone().addScaledVector(side, 6 + rand() * 18);
    if (field.clearance(at.x, at.z) < 1.5 || !keepClear(at.x, at.z, 2)) continue;
    bushes.push({ x: at.x, y: groundAt(at.x, at.z), z: at.z, yaw: rand() * 6.3, scale: 0.7 + rand() * 0.6, tint: 0.9 + rand() * 0.2 });
  }
  const m = new Matrix4();
  const q = new Quaternion();
  const up = new Vector3(0, 1, 0);
  const tint = new Color();
  const place = (mesh, i, h) => {
    mesh.setMatrixAt(i, m.compose(new Vector3(h.x, h.y - 0.3, h.z), q.setFromAxisAngle(up, h.yaw), new Vector3(h.scale, h.scale, h.scale)));
    mesh.setColorAt(i, tint.setScalar(h.tint));
  };
  const treeMat = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
  group.add(...tiledInstances(trees, [pineGeometry(lite)], [treeMat], ['forest'], place));
  group.add(...tiledInstances(bushes, [bushGeometry()], [treeMat], ['bushes'], place));

  // Snowy peaks all around, far off.
  const peaks = [];
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const ring = lite ? 7 : 12;
  for (let k = 0; k < ring; k += 1) {
    const a = (k / ring) * Math.PI * 2 + rand() * 0.3;
    const dist = 1300 + rand() * 500;
    const height = 380 + rand() * 320;
    const g = peakGeometry(260 + rand() * 200, height, lite ? 6 : 9, rand);
    g.translate(cx + Math.cos(a) * dist, SNOW_LEVEL - 10, cz + Math.sin(a) * dist);
    peaks.push(g);
  }
  const peakMesh = new Mesh(merge(peaks), new MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  peakMesh.name = 'peaks';
  group.add(peakMesh);

  // The highest solid thing at a spot (ground, tree tops, buildings), so the race camera stays clear of it.
  const cell = 10;
  const tops = new Map();
  for (const t of trees) {
    const k = `${Math.floor(t.x / cell)},${Math.floor(t.z / cell)}`;
    if (!tops.has(k)) tops.set(k, []);
    tops.get(k).push({ x: t.x, z: t.z, r: 3 * t.scale, top: t.y + 10 * t.scale });
  }
  const clearance = (x, z) => {
    let top = groundAt(x, z);
    const ix = Math.floor(x / cell);
    const iz = Math.floor(z / cell);
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        for (const t of tops.get(`${ix + dx},${iz + dz}`) ?? []) {
          if ((t.x - x) ** 2 + (t.z - z) ** 2 < t.r * t.r) top = Math.max(top, t.top);
        }
      }
    }
    for (const o of solids) if ((o.x - x) ** 2 + (o.z - z) ** 2 < o.r * o.r) top = Math.max(top, o.top);
    return top;
  };
  group.userData = { trees: trees.length, bushes: bushes.length, supported, field, groundAt, clearance };
  return group;
}
