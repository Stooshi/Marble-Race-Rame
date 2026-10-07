/**
 * San Francisco at golden hour: hills of painted-lady houses stepping down to
 * the bay, and the Golden Gate in the fog out west.
 *
 * Phone budget: terrain, houses (two instanced meshes), the bridge (one
 * merged mesh), a few fog sprites and the sun: about 7 draw calls in all.
 */
import {
  CanvasTexture, Color, DoubleSide, Group, InstancedMesh, Matrix4, Mesh, MeshLambertMaterial, Quaternion,
  Sprite, SpriteMaterial, SRGBColorSpace, Vector3,
} from 'three';
import { beam, box, hashString, merge, seededRandom, smoothstep, triangles } from './parts';
import { buildTerrain, makeHeightField } from './terrain';

const SEA_LEVEL = -1.2;
const PAINTED_LADIES = ['#f6a9bd', '#a9d6ef', '#ffd79c', '#b9e6a5', '#d6b9f2', '#ffb994', '#9fd8c9', '#f7e3a1', '#f2b6d8'];
const INTERNATIONAL_ORANGE = '#c4452f';

/**
 * Where the land and the water are, from the track's own shape (so it fits any SF layout).
 * pierFinish: the rebuilt track (new physics) finishes on a pier, with the bay
 * beyond it; the classic layout's whole southern edge is waterfront.
 */
export function sanFranciscoLayout(centerline, { pierFinish = false } = {}) {
  const xs = centerline.samples.map((s) => s.pos.x);
  const zs = centerline.samples.map((s) => s.pos.z);
  const bounds = { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
  const finish = centerline.samples[centerline.samples.length - 1].pos;
  const depth = bounds.maxZ - bounds.minZ;
  // The bay lies past the waterfront finish and straight on beyond the line;
  // the Golden Gate strait opens to the west.
  const end = centerline.samples[centerline.samples.length - 1];
  const dir = new Vector3(end.tangent.x, 0, end.tangent.z).normalize();
  const water = (x, z) => Math.max(
    pierFinish ? 0 : smoothstep(finish.z + 18, finish.z + 70, z),
    smoothstep(14, 42, (x - finish.x) * dir.x + (z - finish.z) * dir.z)
      * (1 - smoothstep(110, 200, Math.abs((x - finish.x) * dir.z - (z - finish.z) * dir.x))),
    smoothstep(bounds.minX - 50, bounds.minX - 110, x) * smoothstep(bounds.minZ + depth * 0.35, bounds.minZ + depth * 0.6, z),
  );
  const bridge = {
    centre: new Vector3(bounds.minX - 520, SEA_LEVEL, (bounds.minZ + bounds.maxZ) / 2 + 120),
    axis: new Vector3(0.8, 0, -0.6), // the span, roughly broadside to the overview camera
  };
  return { bounds, finish, water, bridge };
}

/** House pieces in local space: front faces +z, ground at y = 0 (walls run 4 m into the slope). */
function houseGeometries() {
  const body = merge([
    box(6, 13, 9, 0, 2.5, 0, '#ffffff'),
    triangles([[-3, 9, 4.5], [3, 9, 4.5], [0, 12.6, 4.5], [3, 9, -4.5], [-3, 9, -4.5], [0, 12.6, -4.5]], '#ffffff'),
  ]);
  const quad = (a, b, c, d, color) => triangles([a, b, c, a, c, d], color);
  const z = 4.5;
  const trim = merge([
    // Roof slopes and cornice.
    quad([-3.4, 8.7, z + 0.4], [0, 12.9, z + 0.4], [0, 12.9, -z - 0.4], [-3.4, 8.7, -z - 0.4], '#5d6176'),
    quad([0, 12.9, z + 0.4], [3.4, 8.7, z + 0.4], [3.4, 8.7, -z - 0.4], [0, 12.9, -z - 0.4], '#555a6e'),
    box(6.5, 0.45, 9.5, 0, 8.85, 0, '#fbf5ea'),
    // Bay window with warm-lit panes catching the low sun.
    box(3.4, 6.8, 1.4, -1.1, 3.6, z + 0.7, '#fbf5ea'),
    quad([-2.4, 1.2, z + 1.42], [-1.4, 1.2, z + 1.42], [-1.4, 3.1, z + 1.42], [-2.4, 3.1, z + 1.42], '#ffcf86'),
    quad([-0.8, 1.2, z + 1.42], [0.2, 1.2, z + 1.42], [0.2, 3.1, z + 1.42], [-0.8, 3.1, z + 1.42], '#ffcf86'),
    quad([-2.4, 4.6, z + 1.42], [-1.4, 4.6, z + 1.42], [-1.4, 6.5, z + 1.42], [-2.4, 6.5, z + 1.42], '#ffd99c'),
    quad([-0.8, 4.6, z + 1.42], [0.2, 4.6, z + 1.42], [0.2, 6.5, z + 1.42], [-0.8, 6.5, z + 1.42], '#ffd99c'),
    // Door and the window above it.
    quad([1.2, 0, z + 0.03], [2.5, 0, z + 0.03], [2.5, 2.5, z + 0.03], [1.2, 2.5, z + 0.03], '#6b4636'),
    quad([1.3, 4.6, z + 0.03], [2.4, 4.6, z + 0.03], [2.4, 6.5, z + 0.03], [1.3, 6.5, z + 0.03], '#ffcf86'),
  ]);
  return { body, trim };
}

/** A simpler house for the hills further out: walls, gables and roof only (tinted per house). */
function farHouseGeometry() {
  return merge([
    box(6, 13, 9, 0, 2.5, 0, '#ffffff'),
    triangles([[-3, 9, 4.5], [3, 9, 4.5], [0, 12.6, 4.5], [3, 9, -4.5], [-3, 9, -4.5], [0, 12.6, -4.5]], '#ffffff'),
    triangles([[-3.3, 8.8, 4.8], [0, 12.8, 4.8], [0, 12.8, -4.8], [-3.3, 8.8, 4.8], [0, 12.8, -4.8], [-3.3, 8.8, -4.8],
      [0, 12.8, 4.8], [3.3, 8.8, 4.8], [3.3, 8.8, -4.8], [0, 12.8, 4.8], [3.3, 8.8, -4.8], [0, 12.8, -4.8]], '#77727a'),
  ]);
}

/**
 * Spots for houses: detailed rows along both sides of the streets the marbles
 * race down (`near`), then simpler blocks over the hills around (`far`).
 */
export function placeHouses(centerline, field, layout, {
  maxNear = 460, maxFar = 1300, seed = hashString('san-francisco'), groundAt = field.heightAt,
} = {}) {
  const rand = seededRandom(seed);
  const near = [];
  const far = [];
  let houses = near;
  let max = maxNear;
  const cell = 8;
  const grid = new Map();
  const key = (x, z) => `${Math.floor(x / cell)},${Math.floor(z / cell)}`;
  const free = (x, z) => {
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        for (const h of grid.get(`${Math.floor(x / cell) + dx},${Math.floor(z / cell) + dz}`) ?? []) {
          if ((h.x - x) ** 2 + (h.z - z) ** 2 < 7 * 7) return false;
        }
      }
    }
    return true;
  };
  const add = (x, z, yaw) => {
    if (houses.length >= max) return;
    if (field.nearest(x, z) < field.roadHalf + 6.5 || !free(x, z)) return;
    const y = groundAt(x, z);
    if (y < SEA_LEVEL + 2) return; // no houses in the water or on the beach
    const h = { x, y, z, yaw, scale: 0.9 + rand() * 0.3, color: PAINTED_LADIES[Math.floor(rand() * PAINTED_LADIES.length)] };
    houses.push(h);
    const k = key(x, z);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(h);
  };

  // Rows facing the street the marbles race down.
  const { samples } = centerline;
  for (let i = 0; i < samples.length; i += 4) {
    const s = samples[i];
    for (const side of [-1, 1]) {
      for (const offset of [field.roadHalf + 9, field.roadHalf + 19]) {
        const x = s.pos.x + s.side.x * side * offset;
        const z = s.pos.z + s.side.z * side * offset;
        add(x, z, Math.atan2(-s.side.x * side, -s.side.z * side));
      }
    }
  }
  // Blocks of houses over the hills, facing downhill towards the view, with streets between.
  houses = far;
  max = maxFar;
  const { minX, maxX, minZ, maxZ } = layout.bounds;
  const angle = 0.18;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const spots = [];
  for (let u = -260; u <= maxX - minX + 260; u += 9) {
    if (Math.round(u / 9) % 5 === 0) continue; // a street every few houses
    for (let v = -260; v <= maxZ - minZ + 260; v += 14) {
      spots.push([minX + u * ca - v * sa + (rand() - 0.5) * 2, minZ + u * sa + v * ca + (rand() - 0.5) * 2, rand()]);
    }
  }
  spots.sort((a, b) => a[2] - b[2]); // random order, so the limit thins houses evenly everywhere
  for (const [x, z, roll] of spots) {
    if (houses.length >= max) break;
    const r = field.nearest(x, z);
    if (r < field.roadHalf + 22 || r > 270) continue;
    if (roll > 0.95 - 0.55 * smoothstep(80, 270, r)) continue;
    if (!free(x, z)) continue;
    const gx = groundAt(x + 4, z) - groundAt(x - 4, z);
    const gz = groundAt(x, z + 4) - groundAt(x, z - 4);
    add(x, z, Math.atan2(-gx, -gz));
  }
  return { near, far };
}

/** A cartoon Golden Gate, built along +z around the origin (water at y = 0). */
function goldenGateGeometry() {
  const o = INTERNATIONAL_ORANGE;
  const parts = [];
  const half = 330;
  const towerZ = 150;
  const deckY = 30;
  const topY = 86;
  for (const tz of [-towerZ, towerZ]) {
    parts.push(box(32, 10, 14, 0, 2, tz, '#8d8f94')); // pier
    for (const x of [-11, 11]) parts.push(box(5, topY, 5, x, topY / 2, tz, o));
    for (const y of [deckY + 14, deckY + 32, topY - 3]) parts.push(box(27, 3.2, 4, 0, y, tz, o));
  }
  parts.push(box(26, 3, half * 2, 0, deckY, 0, o)); // deck
  parts.push(box(22, 0.4, half * 2, 0, deckY + 1.7, 0, '#6e5a55')); // road surface
  // Main cables: a sag between the towers, side spans down to the anchorages.
  const cableY = (z) => {
    const a = Math.abs(z);
    if (a <= towerZ) return deckY + 6 + (topY - deckY - 6) * (a / towerZ) ** 2;
    return deckY + 2 + (topY - deckY - 2) * ((half - a) / (half - towerZ)) ** 2;
  };
  for (const x of [-11, 11]) {
    const zs = [];
    for (let z = -half; z <= half + 1e-6; z += 22) zs.push(z);
    for (const z of [-towerZ, towerZ]) zs.push(z);
    zs.sort((a, b) => a - b);
    for (let i = 1; i < zs.length; i += 1) {
      parts.push(beam(new Vector3(x, cableY(zs[i - 1]), zs[i - 1]), new Vector3(x, cableY(zs[i]), zs[i]), 1.4, o));
    }
    for (let z = -towerZ + 15; z < towerZ; z += 15) {
      parts.push(beam(new Vector3(x, deckY + 1.5, z), new Vector3(x, cableY(z), z), 0.5, o));
    }
  }
  return merge(parts);
}

/** A soft cloud texture for fog banks. */
function fogTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const g = canvas.getContext('2d');
  const rand = seededRandom(7);
  for (let i = 0; i < 26; i += 1) {
    const x = 30 + rand() * 196;
    const y = 40 + rand() * 25;
    const r = 18 + rand() * 26;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(255,248,240,0.55)');
    grad.addColorStop(1, 'rgba(255,248,240,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 96);
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

function sunTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,250,225,1)');
  grad.addColorStop(0.18, 'rgba(255,236,180,1)');
  grad.addColorStop(0.3, 'rgba(255,200,130,0.5)');
  grad.addColorStop(1, 'rgba(255,190,120,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** Builds the whole San Francisco world around a track. Returns a Group. */
export function buildSanFrancisco(centerline, track, theme) {
  const lanes = Math.max(1, Number(track?.lane_count) || 5);
  const layout = sanFranciscoLayout(centerline, { pierFinish: Boolean(track?.physics?.channel) });
  const field = makeHeightField(centerline, lanes, { hillHeight: 34, landRadius: 340, seaLevel: SEA_LEVEL, water: layout.water });
  const group = new Group();
  group.name = 'scenery:san-francisco';

  // Hills.
  const { minX, maxX, minZ, maxZ } = layout.bounds;
  const margin = 380;
  const ground = buildTerrain(field, { minX: minX - margin, maxX: maxX + margin, minZ: minZ - margin, maxZ: maxZ + margin }, {
    cells: 80, colors: { grass: '#8db457', dry: '#b7b85c', shade: '#77a04a', sand: '#ecd59e' },
  });
  const terrain = new Mesh(ground.geometry, new MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  terrain.name = 'terrain';
  group.add(terrain);

  // Painted ladies.
  const spots = placeHouses(centerline, field, layout, { groundAt: ground.groundAt });
  const { body, trim } = houseGeometries();
  const bodies = new InstancedMesh(body, new MeshLambertMaterial({ flatShading: true }), spots.near.length);
  const trims = new InstancedMesh(trim, new MeshLambertMaterial({ vertexColors: true, flatShading: true, side: DoubleSide }), spots.near.length);
  const farHouses = new InstancedMesh(farHouseGeometry(), new MeshLambertMaterial({ vertexColors: true, flatShading: true }), spots.far.length);
  const m = new Matrix4();
  const q = new Quaternion();
  const up = new Vector3(0, 1, 0);
  const c = new Color();
  const place = (h) => m.compose(new Vector3(h.x, h.y, h.z), q.setFromAxisAngle(up, h.yaw), new Vector3(h.scale, h.scale, h.scale));
  spots.near.forEach((h, i) => {
    place(h);
    bodies.setMatrixAt(i, m);
    trims.setMatrixAt(i, m);
    bodies.setColorAt(i, c.set(h.color));
  });
  spots.far.forEach((h, i) => {
    farHouses.setMatrixAt(i, place(h));
    farHouses.setColorAt(i, c.set(h.color));
  });
  bodies.name = 'houses';
  trims.name = 'house trim';
  farHouses.name = 'houses on the hills';
  group.add(bodies, trims, farHouses);

  // The Golden Gate, out west in the fog.
  const bridge = new Mesh(goldenGateGeometry(), new MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  bridge.name = 'golden gate';
  bridge.position.copy(layout.bridge.centre);
  bridge.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), layout.bridge.axis.clone().normalize());
  group.add(bridge);

  const fogMat = new SpriteMaterial({ map: fogTexture(), transparent: true, depthWrite: false, opacity: 0.9 });
  const along = layout.bridge.axis.clone().normalize();
  const fogBanks = [
    [-260, 16, 260, 70], [-90, 20, 280, 80], [90, 14, 260, 70], [250, 22, 300, 90], [0, 46, 200, 55],
    [-420, 30, 320, 100], [420, 26, 320, 100],
  ];
  for (const [s, y, w, hgt] of fogBanks) {
    const fog = new Sprite(fogMat);
    fog.position.copy(layout.bridge.centre).addScaledVector(along, s).add(new Vector3(0, y, 0));
    fog.scale.set(w, hgt, 1);
    group.add(fog);
  }

  // A low golden sun in the west, behind the bridge.
  const sunDir = new Vector3(...theme.sun.direction).normalize();
  const sun = new Sprite(new SpriteMaterial({ map: sunTexture(), transparent: true, depthWrite: false, fog: false }));
  const centre = new Vector3((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
  sun.position.copy(centre).addScaledVector(sunDir, 1400);
  sun.scale.set(260, 260, 1);
  sun.renderOrder = -0.5;
  sun.name = 'sun';
  group.add(sun);

  // Highest solid thing at a spot (hill or house roof), so the race camera can stay clear of it.
  const roofs = new Map();
  for (const h of [...spots.near, ...spots.far]) {
    const k = `${Math.floor(h.x / 10)},${Math.floor(h.z / 10)}`;
    if (!roofs.has(k)) roofs.set(k, []);
    roofs.get(k).push(h);
  }
  const clearance = (x, z) => {
    let top = ground.groundAt(x, z);
    const cx = Math.floor(x / 10);
    const cz = Math.floor(z / 10);
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        for (const h of roofs.get(`${cx + dx},${cz + dz}`) ?? []) {
          if ((h.x - x) ** 2 + (h.z - z) ** 2 < (7 * h.scale) ** 2) top = Math.max(top, h.y + 13 * h.scale);
        }
      }
    }
    return top;
  };
  group.userData = { houses: spots.near.length + spots.far.length, field, groundAt: ground.groundAt, clearance };
  return group;
}
