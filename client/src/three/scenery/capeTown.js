/**
 * Table Mountain Run's world: Cape Town. The run starts in a mountain forest
 * high on Table Mountain, comes down rocky slopes covered in fynbos and
 * boulders, sweeps above the city and the bay, divides round a big rock and
 * then round Lion's Head, spirals down past the Bo-Kaap's colourful houses,
 * plunges past Cape Town Stadium and finishes at the V&A Waterfront, by its
 * clock tower and the harbour. Table Mountain and Lion's Head stand behind it
 * all, far off.
 *
 * Built like Bobsleigh Run's world (./alpine.js), on the same ground that hugs
 * the channel (./channelGround.js): the trees, bushes and houses are drawn in
 * tiles, so only those in view are drawn, and phones get a lighter version
 * (lite): fewer of everything, simpler shapes, coarser ground.
 * Scenery only: the physics never sees any of it.
 */
import {
  CircleGeometry, Color, ConeGeometry, CylinderGeometry, Group, IcosahedronGeometry, LatheGeometry, Matrix4, Mesh,
  MeshLambertMaterial, Quaternion, Vector2, Vector3,
} from 'three';
import { box, hashString, merge, piece, seededRandom, smoothstep, triangles } from './parts';
import { buildTerrain, makeHeightField } from './terrain';
import { channelGround, tiledInstances } from './channelGround';
import { forkOffset } from '../iceChannel';

const SEA_LEVEL = -1.2;  // the bay and the harbour (the theme's ground)
const RIM = 2;           // metres of ground beside the channel's rim, at its height
const WOOD = '#8a5a35';
const WOOD_DARK = '#5e3b22';
const ROCK = '#8b8478';
const ROCK_DARK = '#6c665c';
const PINE = '#3f6b3a';
const PINE_DARK = '#2f5530';
const BO_KAAP = ['#f06b9a', '#7bc96f', '#3fc1c9', '#ffd23f', '#5b8def', '#ff8c42', '#b388eb', '#ef476f'];

/** A stone pine, base at y = 0, about 11 m tall: a bare trunk and a wide flat crown (lite: simpler). */
function stonePineGeometry(lite) {
  const crown = (r, y, sx, sy) => piece(new IcosahedronGeometry(r, lite ? 0 : 1), PINE, new Matrix4().compose(new Vector3(0, y, 0), new Quaternion(), new Vector3(sx, sy, sx)));
  return merge([
    piece(new CylinderGeometry(0.3, 0.45, 7.5, 5, 1, true), WOOD_DARK, new Matrix4().makeTranslation(0, 3.75, 0)),
    crown(3.2, 8.6, 1.5, 0.55),
    ...(lite ? [] : [piece(new IcosahedronGeometry(2.4, 1), PINE_DARK, new Matrix4().compose(new Vector3(1.2, 9.6, -0.6), new Quaternion(), new Vector3(1.3, 0.5, 1.3)))]),
  ]);
}

/** A fynbos bush: low, round and grey-green, with a pink protea flower or two. */
function fynbosGeometry(lite) {
  return merge([
    piece(new IcosahedronGeometry(1, 0), '#6f8a4f', new Matrix4().compose(new Vector3(0, 0.45, 0), new Quaternion(), new Vector3(1.2, 0.7, 1.1))),
    ...(lite ? [] : [
      piece(new IcosahedronGeometry(0.28, 0), '#e86a92', new Matrix4().makeTranslation(0.5, 1.0, 0.2)),
      piece(new IcosahedronGeometry(0.22, 0), '#f3a6bf', new Matrix4().makeTranslation(-0.4, 0.95, -0.3)),
    ]),
  ]);
}

/** A boulder: a lumpy grey rock, about 2 m across. */
function boulderGeometry() {
  return piece(new IcosahedronGeometry(1, 0), ROCK, new Matrix4().compose(new Vector3(0, 0.55, 0), new Quaternion(), new Vector3(1.2, 0.8, 1)));
}

/** A city building: a 1 m cube standing on y = 0 (scaled per copy), light walls and a darker roof band. */
function blockGeometry() {
  return merge([box(1, 1, 1, 0, 0.5, 0, '#e8e2d6'), box(1.02, 0.06, 1.02, 0, 0.97, 0, '#9aa3ad')]);
}

/** A Bo-Kaap house: a small flat-roofed terrace house (coloured per copy), door and windows. */
function boKaapGeometry() {
  return merge([
    box(5, 4.2, 6, 0, 2.1, 0, '#ffffff'),
    box(5.3, 0.35, 6.3, 0, 4.35, 0, '#f4f1ea'), // the parapet
    box(1.1, 2.1, 0.1, -1.2, 1.05, 3.02, '#4a3a2c'), // the door
    box(1.0, 1.1, 0.1, 1.2, 2.6, 3.02, '#2b3440'), // windows
    box(1.0, 1.1, 0.1, -1.2, 3.2, 3.02, '#2b3440'),
  ]);
}

/** The start house: an open timber shelter over the gate, front (facing down the track) at +z. */
function startHouseGeometry(width) {
  const d = 7;
  const h = 6.5;
  const parts = [
    box(width, 0.6, d, 0, 0.3, 0, WOOD_DARK),
    box(width, h, 0.5, 0, h / 2, -d / 2, WOOD),
    box(0.6, h, d, -width / 2, h / 2, 0, WOOD),
    box(0.6, h, d, width / 2, h / 2, 0, WOOD),
    box(width + 1.5, 0.5, d + 1.5, 0, h + 0.25, 0, '#9b4a2f'), // a red tin roof
    box(Math.min(10, width * 0.6), 1.6, 0.2, 0, h - 1.1, d / 2 + 0.2, '#0b6e4f'), // the green START board
    box(Math.min(10, width * 0.6) - 0.8, 0.5, 0.05, 0, h - 1.1, d / 2 + 0.32, '#ffd23f'),
  ];
  for (const x of [-width / 2 + 2, width / 2 - 2]) parts.push(box(0.5, h, 0.5, x, h / 2, d / 2 - 0.3, WOOD_DARK));
  return merge(parts);
}

/** Table Mountain far off: a long flat-topped mesa with sheer grey cliffs and green lower slopes, along +x, base at y = 0. */
function tableMountainGeometry(lite) {
  const L = 3200;   // its length
  const H = 820;    // the flat top
  const top = 380;  // half the depth of the flat top
  const foot = 900; // half the depth at the foot
  const cliffFoot = H * 0.45; // where the green slopes give way to the cliffs
  const prism = (x0, x1, y0, y1, d0, d1, color) => {
    const q = (a, b, c, d) => [a, b, c, a, c, d];
    const p = (x, y, z) => [x, y, z];
    return triangles([
      ...q(p(x0, y0, d0), p(x1, y0, d0), p(x1, y1, d1), p(x0, y1, d1)),     // the face towards the city (+z)
      ...q(p(x1, y0, -d0), p(x0, y0, -d0), p(x0, y1, -d1), p(x1, y1, -d1)), // the back
      ...q(p(x0, y0, -d0), p(x0, y0, d0), p(x0, y1, d1), p(x0, y1, -d1)),   // the ends
      ...q(p(x1, y0, d0), p(x1, y0, -d0), p(x1, y1, -d1), p(x1, y1, d1)),
    ], color);
  };
  const parts = [
    prism(-L / 2, L / 2, 0, cliffFoot, foot, top + 80, '#6f8a52'),          // the green lower slopes
    prism(-L / 2 + 60, L / 2 - 60, cliffFoot, H, top + 80, top, '#9a958c'), // the cliffs
    triangles([[-L / 2 + 60, H, top], [L / 2 - 60, H, top], [L / 2 - 60, H, -top], [-L / 2 + 60, H, top], [L / 2 - 60, H, -top], [-L / 2 + 60, H, -top]], '#a8a397'), // the flat top
  ];
  if (!lite) {
    // The "tablecloth": a band of cloud spilling over the top edge.
    parts.push(box(L * 0.7, 40, 120, -L * 0.05, H + 12, top - 30, '#ffffff'));
    for (let k = 0; k < 6; k += 1) parts.push(piece(new IcosahedronGeometry(60, 0), '#f6f8fb', new Matrix4().compose(new Vector3(-L * 0.35 + k * L * 0.13, H + 10, top + 10), new Quaternion(), new Vector3(1.6, 0.5, 0.8))));
  }
  return merge(parts);
}

/** Lion's Head: a rounded rocky peak, green below and bare rock on top, base at y = 0. */
function lionsHeadGeometry(radius, height, lite) {
  const pts = [];
  const n = lite ? 8 : 14;
  for (let k = 0; k <= n; k += 1) {
    const t = k / n;
    // A broad base rising to a rounded knob near the top.
    const r = radius * (1 - t) ** 1.4 * (1 + 0.35 * Math.sin(Math.PI * t * 0.9));
    pts.push(new Vector2(Math.max(0.01, r), height * t));
  }
  const g = new LatheGeometry(pts, lite ? 8 : 14);
  const flat = g.toNonIndexed();
  g.dispose();
  flat.deleteAttribute('uv');
  const p = flat.getAttribute('position');
  const colors = [];
  const green = new Color('#6d8a4c');
  const rock = new Color('#8d8172');
  for (let i = 0; i < p.count; i += 3) {
    const y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
    const c = y > height * 0.55 ? rock : green;
    for (let k = 0; k < 3; k += 1) colors.push(c.r, c.g, c.b);
  }
  flat.setAttribute('color', new (p.constructor)(new Float32Array(colors), 3));
  flat.computeVertexNormals();
  return flat;
}

/** Cape Town Stadium: a white bowl wrapped in its pale skin, open roof, base at y = 0. */
function stadiumGeometry(lite) {
  const R = 70;
  const h = 32;
  const outer = new LatheGeometry([new Vector2(R, 0), new Vector2(R * 1.06, h * 0.55), new Vector2(R * 0.98, h), new Vector2(R * 0.7, h * 1.02)], lite ? 18 : 36);
  const g = piece(outer, '#f2f1ec');
  const pitch = piece(new CircleGeometry(R * 0.55, lite ? 12 : 24), '#4f9a4a', new Matrix4().makeRotationX(-Math.PI / 2).setPosition(0, 1.5, 0));
  return merge([g, pitch]);
}

/** The V&A Waterfront's clock tower: a slender red tower with white trim and a clock face, base at y = 0. */
function clockTowerGeometry() {
  return merge([
    box(4, 1, 4, 0, 0.5, 0, '#e8e2d6'),
    box(3, 13, 3, 0, 7.5, 0, '#c0392b'),
    box(3.4, 0.5, 3.4, 0, 14, 0, '#ffffff'),
    box(3.2, 3.2, 3.2, 0, 15.9, 0, '#c0392b'),
    ...[[0, 1.62], [0, -1.62], [1.62, 0], [-1.62, 0]].map(([x, z]) => piece(new CylinderGeometry(1, 1, 0.1, 16), '#ffffff', new Matrix4().compose(new Vector3(x, 16, z), new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(x, 0, z).normalize()), new Vector3(1, 1, 1)))),
    piece(new ConeGeometry(2.6, 4, 4), '#4a5560', new Matrix4().compose(new Vector3(0, 19.5, 0), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 4), new Vector3(1, 1, 1))),
  ]);
}

/** A small harbour boat, bow at +z, waterline at y = 0. */
function boatGeometry(color) {
  return merge([
    box(3, 1.2, 9, 0, 0.3, 0, color),
    box(2.2, 1.4, 3, 0, 1.6, -1, '#ffffff'),
    box(0.2, 6, 0.2, 0, 3.5, 1.5, '#d9dde3'),
  ]);
}

/** Builds the whole Cape Town world around Table Mountain Run. Returns a Group (lite: the lighter version for phones). */
export function buildCapeTown(centerline, track, theme, { lite = false } = {}) {
  const rand = seededRandom(hashString(`cape-town:${track?.slug ?? ''}`));
  const lanes = Math.max(1, Number(track?.lane_count) || 4);
  const hug = channelGround(centerline, track, { rim: RIM, dip: lite ? 6 : 3, under: lite ? 4 : 2 });
  const street = hug ? { ...hug.street, cap: 0.6 } : null;
  const groundLine = hug?.groundLine ?? centerline;
  const { samples, segments } = centerline;
  const start = samples[0];
  const end = samples[segments];
  const startDir = new Vector3(start.tangent.x, 0, start.tangent.z).normalize();
  const endDir = new Vector3(end.tangent.x, 0, end.tangent.z).normalize();
  const endSide = new Vector3(-endDir.z, 0, endDir.x);
  const pen = hug?.pen ?? null;
  // The harbour: water beyond the catch area and off to one side of the finish (the waterfront's quay).
  const bayFrom = (pen?.length ?? 30) + 8;
  const water = (x, z) => {
    const ahead = (x - end.pos.x) * endDir.x + (z - end.pos.z) * endDir.z;
    const across = (x - end.pos.x) * endSide.x + (z - end.pos.z) * endSide.z;
    return Math.max(
      smoothstep(bayFrom, bayFrom + 30, ahead) * (1 - smoothstep(220, 320, Math.abs(across))),
      smoothstep(26, 40, -across) * smoothstep(-60, -20, ahead) * (1 - smoothstep(140, 220, ahead)),
    );
  };
  const field = makeHeightField(groundLine, lanes, { hillHeight: 30, landRadius: 400, seaLevel: SEA_LEVEL, water, street });
  const group = new Group();
  group.name = 'scenery:cape-town';

  // The mountainside, the city's plain and the shore.
  const xs = samples.map((s) => s.pos.x);
  const zs = samples.map((s) => s.pos.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const margin = lite ? 240 : 360;
  const ground = buildTerrain(field, { minX: minX - margin, maxX: maxX + margin, minZ: minZ - margin, maxZ: maxZ + margin }, {
    cells: lite ? 90 : 140,
    colors: { sand: '#e3d3a3', grass: '#7f9455', dry: '#a59c68', shade: '#5f6243' },
    tiles: lite ? 4 : 6,
  });
  const terrain = new Group();
  const groundMat = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
  for (const g of ground.geometries) terrain.add(new Mesh(g, groundMat));
  terrain.name = 'terrain';
  group.add(terrain);
  const groundAt = ground.groundAt;

  // How far along the track the nearest bit of it is (0 at the start, 1 at the finish), for what grows where.
  const nearShare = (x, z) => {
    let best = Infinity;
    let at = 0;
    for (let i = 0; i <= segments; i += 2) {
      const d = (samples[i].pos.x - x) ** 2 + (samples[i].pos.z - z) ** 2;
      if (d < best) { best = d; at = i; }
    }
    return at / segments;
  };

  const solids = []; // { x, z, r, top } things the trees keep clear of (and the camera stays above)
  const placed = new Group();
  placed.name = 'buildings';
  const mat = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const put = (geometry, name, x, z, yaw, keep, y = groundAt(x, z)) => {
    const mesh = new Mesh(geometry, mat);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.rotation.y = yaw;
    placed.add(mesh);
    geometry.computeBoundingBox();
    solids.push({ x, z, r: keep, top: y + geometry.boundingBox.max.y });
    return mesh;
  };
  const yawTo = (dir) => Math.atan2(dir.x, dir.z); // turns a +z-facing model to face along dir
  const sideAt = (i) => new Vector3(samples[i].side.x, 0, samples[i].side.z).normalize();
  const indexOf = (share) => Math.max(0, Math.min(segments, Math.round(share * segments)));
  const marks = track?.physics?.landmarks ?? {};

  // The start house over the gate, in the forest high on the mountain.
  const funnelHalf = hug?.street.halfAt(0) ?? 12;
  const houseAt = start.pos.clone().addScaledVector(startDir, -9);
  put(startHouseGeometry(funnelHalf * 2 + 4), 'start house', houseAt.x, houseAt.z, yawTo(startDir), funnelHalf + 4);

  // The splitters' dividers: a big rock between the first one's channels, and Lion's Head between the second's.
  const forks = hug?.channel?.forks ?? [];
  forks.forEach((fork, k) => {
    const sMid = (fork.s0 + fork.s1) / 2;
    const i = indexOf(sMid / hug.channel.arc);
    const s = samples[i];
    const gap = 2 * forkOffset(fork, sMid) - 2 * (fork.radius + 0.45); // the divider's width at its widest
    const r = Math.max(1.5, gap / 2 - 0.4);
    const top = s.pos.y + fork.radius * 0.9; // standing on the divider, at the channels' rims
    if (k === 0) {
      const g = piece(new IcosahedronGeometry(1, 1), ROCK, new Matrix4().compose(new Vector3(0, 0, 0), new Quaternion(), new Vector3(r * 0.85, r * 0.6, r * 2.2)));
      const mesh = new Mesh(g, mat);
      mesh.name = 'big rock';
      mesh.position.set(s.pos.x, top, s.pos.z);
      mesh.rotation.y = yawTo(new Vector3(s.tangent.x, 0, s.tangent.z).normalize());
      placed.add(mesh);
    } else {
      const g = lionsHeadGeometry(r * 0.55, r * 0.9, lite); // a little Lion's Head, low and no wider than the divider
      g.scale(1, 1, 3);
      const mesh = new Mesh(g, mat);
      mesh.name = "Lion's Head (divider)";
      mesh.position.set(s.pos.x, top - 0.5, s.pos.z);
      mesh.rotation.y = yawTo(new Vector3(s.tangent.x, 0, s.tangent.z).normalize());
      placed.add(mesh);
    }
  });

  // The Bo-Kaap: colourful terrace houses around the corkscrew.
  const cork = marks.boKaap;
  const boKaap = [];
  if (cork) {
    const want = lite ? 30 : 80;
    for (let tries = 0; boKaap.length < want && tries < want * 20; tries += 1) {
      const i = indexOf(cork[0] + rand() * (cork[1] - cork[0]));
      const s = samples[i];
      const out = sideAt(i).multiplyScalar(rand() < 0.5 ? -1 : 1);
      const at = s.pos.clone().addScaledVector(out, (hug?.street.halfAt(i) ?? 5) + 6 + rand() * 40);
      if (field.clearance(at.x, at.z) < 5) continue;
      if (boKaap.some((h) => (h.x - at.x) ** 2 + (h.z - at.z) ** 2 < 49)) continue;
      boKaap.push({ x: at.x, y: groundAt(at.x, at.z), z: at.z, yaw: yawTo(out.clone().negate()) + (rand() - 0.5) * 0.3, color: BO_KAAP[Math.floor(rand() * BO_KAAP.length)] });
    }
  }

  // Cape Town Stadium beside the final plunge.
  if (marks.stadium) {
    // Alongside, as near as it can stand while clear of every stretch of the track (the corkscrew is close by).
    const i = indexOf(marks.stadium);
    let at = null;
    for (let d = 90; d <= 400 && !at; d += 10) {
      for (const k of [-1, 1]) {
        const p = samples[i].pos.clone().addScaledVector(sideAt(i).multiplyScalar(k), d);
        if (field.clearance(p.x, p.z) > 85) { at = p; break; }
      }
    }
    if (at) put(stadiumGeometry(lite), 'Cape Town Stadium', at.x, at.z, 0, 80, Math.max(SEA_LEVEL + 0.5, groundAt(at.x, at.z)) - 0.5);
  }

  // The V&A Waterfront: the clock tower on the quay beside the finish, boats in the harbour.
  {
    const at = end.pos.clone().addScaledVector(endDir, 22).addScaledVector(endSide, -24);
    put(clockTowerGeometry(), 'clock tower', at.x, at.z, yawTo(endSide), 4, Math.max(SEA_LEVEL + 1, groundAt(at.x, at.z)));
    const boats = lite ? 2 : 5;
    for (let k = 0; k < boats; k += 1) {
      const b = end.pos.clone().addScaledVector(endDir, bayFrom + 40 + k * 22).addScaledVector(endSide, (k % 2 ? 1 : -1) * (30 + 12 * k));
      const mesh = new Mesh(boatGeometry(['#2a6f97', '#f4f1ea', '#c0392b', '#ffd23f', '#3a7d44'][k % 5]), mat);
      mesh.name = 'boat';
      mesh.position.set(b.x, SEA_LEVEL, b.z);
      mesh.rotation.y = rand() * Math.PI * 2;
      placed.add(mesh);
    }
  }
  group.add(placed);

  // Table Mountain and Lion's Head, far off behind the run (beyond the start, up the mountain), always in view.
  {
    const towardsStart = start.pos.clone().sub(end.pos).setY(0).normalize();
    const along = new Vector3(-towardsStart.z, 0, towardsStart.x);
    const centre = start.pos.clone().addScaledVector(towardsStart, 1500).setY(SEA_LEVEL - 20);
    const mountain = new Mesh(tableMountainGeometry(lite), mat);
    mountain.name = 'Table Mountain';
    mountain.position.copy(centre);
    mountain.rotation.y = Math.atan2(-along.z, along.x); // its length across the view
    group.add(mountain);
    const head = new Mesh(lionsHeadGeometry(420, 700, lite), mat);
    head.name = "Lion's Head";
    head.position.copy(centre).addScaledVector(along, 2300).addScaledVector(towardsStart, -500);
    group.add(head);
  }

  // The mountain forest at the top, fynbos and boulders on the slopes, the city on the plain below.
  const keepClear = (x, z, extra) => solids.every((o) => (o.x - x) ** 2 + (o.z - z) ** 2 > (o.r + extra) ** 2);
  const trees = [];
  const bushes = [];
  const rocks = [];
  const blocks = [];
  const spacing = lite ? 11 : 7;
  const spots = [];
  for (let x = minX - margin * 0.8; x <= maxX + margin * 0.8; x += spacing) {
    for (let z = minZ - margin * 0.8; z <= maxZ + margin * 0.8; z += spacing) {
      spots.push([x + (rand() - 0.5) * spacing * 0.9, z + (rand() - 0.5) * spacing * 0.9, rand()]);
    }
  }
  spots.sort((a, b) => a[2] - b[2]); // random order, so the limits thin everything evenly
  const maxTrees = lite ? 260 : 900;
  const maxBlocks = lite ? 160 : 520;
  for (const [x, z, roll] of spots) {
    if (trees.length >= maxTrees && blocks.length >= maxBlocks) break;
    const c = field.clearance(x, z);
    if (c < 3 || c > 300) continue;
    const y = groundAt(x, z);
    if (y < SEA_LEVEL + 1.5) continue; // not in the water or on the beach
    if (!keepClear(x, z, 4)) continue;
    const share = nearShare(x, z);
    if (share < (marks.forest?.[1] ?? 0.15) + 0.03) {
      // The mountain forest round the start.
      if (trees.length < maxTrees && roll < 0.8 - 0.5 * smoothstep(20, 200, c)) {
        trees.push({ x, y, z, yaw: rand() * 6.3, scale: 0.75 + rand() * 0.5, tint: 0.85 + rand() * 0.25 });
      }
    } else if (share > (marks.city ?? 0.4) && c > 40 && !(cork && share > cork[0] - 0.02 && share < cork[1] + 0.02 && c < 60)) {
      // The city on the plain below the mountain (out of the Bo-Kaap's way).
      if (blocks.length < maxBlocks && roll < 0.55) {
        const tall = rand() < 0.15;
        blocks.push({ x, y, z, yaw: rand() * 0.3, w: 8 + rand() * 10, h: tall ? 30 + rand() * 50 : 8 + rand() * 14, d: 8 + rand() * 10, tint: 0.85 + rand() * 0.2 });
      }
    } else if (roll < 0.06 && trees.length < maxTrees && c > 60) {
      trees.push({ x, y, z, yaw: rand() * 6.3, scale: 0.7 + rand() * 0.4, tint: 0.85 + rand() * 0.2 }); // a few pines dotted about
    }
  }
  const maxBushes = lite ? 140 : 520;
  for (let tries = 0; bushes.length + rocks.length < maxBushes && tries < maxBushes * 6; tries += 1) {
    const i = Math.floor(rand() * segments * 0.75);
    const s = samples[i];
    const at = s.pos.clone().addScaledVector(sideAt(i).multiplyScalar(rand() < 0.5 ? -1 : 1), (hug?.street.halfAt(i) ?? 5) + 1 + rand() * 22);
    if (field.clearance(at.x, at.z) < 1.5 || !keepClear(at.x, at.z, 2)) continue;
    const item = { x: at.x, y: groundAt(at.x, at.z), z: at.z, yaw: rand() * 6.3, scale: 0.7 + rand() * 0.8, tint: 0.85 + rand() * 0.25 };
    (rand() < 0.22 ? rocks : bushes).push(item);
  }
  const m = new Matrix4();
  const q = new Quaternion();
  const up = new Vector3(0, 1, 0);
  const tint = new Color();
  const place = (mesh, i, h) => {
    mesh.setMatrixAt(i, m.compose(new Vector3(h.x, h.y - 0.3, h.z), q.setFromAxisAngle(up, h.yaw), new Vector3(h.scale, h.scale, h.scale)));
    mesh.setColorAt(i, tint.setScalar(h.tint));
  };
  const instMat = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
  group.add(...tiledInstances(trees, [stonePineGeometry(lite)], [instMat], ['forest'], place));
  group.add(...tiledInstances(bushes, [fynbosGeometry(lite)], [instMat], ['fynbos'], place));
  group.add(...tiledInstances(rocks, [boulderGeometry()], [instMat], ['boulders'], place));
  group.add(...tiledInstances(blocks, [blockGeometry()], [instMat], ['city'], (mesh, i, h) => {
    mesh.setMatrixAt(i, m.compose(new Vector3(h.x, h.y - 0.5, h.z), q.setFromAxisAngle(up, h.yaw), new Vector3(h.w, h.h, h.d)));
    mesh.setColorAt(i, tint.setScalar(h.tint));
  }));
  group.add(...tiledInstances(boKaap, [boKaapGeometry()], [instMat], ['Bo-Kaap'], (mesh, i, h) => {
    mesh.setMatrixAt(i, m.compose(new Vector3(h.x, h.y - 0.2, h.z), q.setFromAxisAngle(up, h.yaw), new Vector3(1, 1, 1)));
    mesh.setColorAt(i, tint.set(h.color));
  }));

  // The highest solid thing at a spot (ground, tree tops, buildings), so the race camera stays clear of it.
  const cell = 10;
  const tops = new Map();
  const addTop = (x, z, r, top) => {
    const k = `${Math.floor(x / cell)},${Math.floor(z / cell)}`;
    if (!tops.has(k)) tops.set(k, []);
    tops.get(k).push({ x, z, r, top });
  };
  for (const t of trees) addTop(t.x, t.z, 4.5 * t.scale, t.y + 11 * t.scale);
  for (const b of blocks) addTop(b.x, b.z, Math.max(b.w, b.d) * 0.7, b.y + b.h);
  for (const h of boKaap) addTop(h.x, h.z, 4.5, h.y + 4.6);
  const reach = Math.ceil(60 / cell); // (the tallest city blocks are wide)
  const clearance = (x, z) => {
    let top = groundAt(x, z);
    const ix = Math.floor(x / cell);
    const iz = Math.floor(z / cell);
    for (let dx = -reach; dx <= reach; dx += 1) {
      for (let dz = -reach; dz <= reach; dz += 1) {
        for (const t of tops.get(`${ix + dx},${iz + dz}`) ?? []) {
          if ((t.x - x) ** 2 + (t.z - z) ** 2 < t.r * t.r) top = Math.max(top, t.top);
        }
      }
    }
    for (const o of solids) if ((o.x - x) ** 2 + (o.z - z) ** 2 < o.r * o.r) top = Math.max(top, o.top);
    return top;
  };
  group.userData = { trees: trees.length, bushes: bushes.length, rocks: rocks.length, city: blocks.length, boKaap: boKaap.length, field, groundAt, clearance };
  return group;
}
