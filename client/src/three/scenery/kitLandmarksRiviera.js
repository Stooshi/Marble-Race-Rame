/**
 * Landmarks for the Riviera (Saint-Tropez, 3 Nov 2026): one builder each, origin on the ground (boats and
 * the harbour on the water: a track's `sea` floats them at its level), front facing +z, cartoon low-poly
 * from a few simple shapes, merged into the still scenery. Our own models: a hilltop village of ochre and
 * rose houses under terracotta roofs, stone pines, olive groves and lavender behind dry-stone walls, a beach
 * with striped parasols, a harbour of small fishing boats and white yachts, a lighthouse on the harbour wall.
 * No names, flags or logos on anything.
 */
import { ConeGeometry, CylinderGeometry, IcosahedronGeometry, Matrix4, Quaternion, SphereGeometry, Vector3 } from 'three';
import { box, merge, piece, seededRandom } from './parts';

const Y = new Vector3(0, 1, 0);
const M = (x, y, z) => new Matrix4().makeTranslation(x, y, z);
const S = (x, y, z, sx, sy, sz) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion(), new Vector3(sx, sy, sz));
const turned = (x, y, z, yaw, sx = 1, sy = 1, sz = 1) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(Y, yaw), new Vector3(sx, sy, sz));
/** A hipped terracotta roof over a w × d house whose walls end at y. */
const roof = (w, d, x, y, z, colour = '#c8643a', h = 1.6) => piece(new ConeGeometry(Math.hypot(w, d) / 2 + 0.3, h, 4), colour, turned(x, y + h / 2, z, Math.PI / 4, (w + 0.6) / Math.hypot(w, d) * Math.SQRT2, 1, (d + 0.6) / Math.hypot(w, d) * Math.SQRT2));

const WALLS = ['#e8b77a', '#f0cf9a', '#e9a98b', '#f3e2bf', '#dca06a', '#f1c7a8'];
const ROOFS = ['#c8643a', '#b9573a', '#d27348'];
const SHUTTERS = ['#4f8a6a', '#5f8fb0', '#7aa56a', '#3f6f8f'];

/** A Provençal house: rendered walls, a terracotta roof, coloured shutters either side of two windows. */
function house(p, x, z, w, d, h, k, yaw = 0) {
  const g = [];
  g.push(box(w, h, d, 0, h / 2, 0, WALLS[k % WALLS.length]));
  g.push(roof(w, d, 0, h, 0, ROOFS[k % ROOFS.length]));
  // (The windows' shutters, one band of colour across the front: a box each, not three, for the phone's triangles.)
  g.push(box(w * 0.7, 1, 0.1, 0, h * 0.62, d / 2 + 0.05, SHUTTERS[k % SHUTTERS.length]));
  const geo = merge(g);
  geo.applyMatrix4(turned(x, 0, z, yaw));
  p.push(geo);
}

/** A stone pine: a tall bare trunk leaning a little, a wide flat dark-green crown. */
function stonePine(p, x, z, h = 11, lean = 0.08) {
  p.push(piece(new CylinderGeometry(0.28, 0.45, h, 6), '#7a5a42', new Matrix4().compose(new Vector3(x, h / 2, z), new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0.4).normalize(), lean), new Vector3(1, 1, 1))));
  p.push(piece(new SphereGeometry(3.6, 7, 3), '#3f6b3a', S(x + h * lean * 0.4, h + 0.4, z, 1.35, 0.42, 1.2)));
}

/** An olive tree: a short gnarled trunk, a round silvery-green crown. */
function oliveTree(p, x, z, s = 1) {
  p.push(piece(new CylinderGeometry(0.25 * s, 0.45 * s, 2 * s, 5), '#6e5a48', M(x, s, z)));
  p.push(piece(new IcosahedronGeometry(1.9 * s, 0), '#8fa173', S(x, 2.9 * s, z, 1.2, 0.85, 1.1)));
  p.push(piece(new IcosahedronGeometry(1.2 * s, 0), '#a3b38a', S(x + 0.9 * s, 3.4 * s, z + 0.4 * s, 1, 0.8, 1)));
}

/** A dry-stone wall from (x0, z) to (x1, z). */
const stoneWall = (p, x0, x1, z, h = 0.9) => p.push(box(Math.abs(x1 - x0), h, 0.7, (x0 + x1) / 2, h / 2, z, '#b8a68a'));

// ── The hilltop village ─────────────────────────────────────────────────────

/** A hilltop village: rendered houses stepping up the slope round a little square, a bell tower over them. */
function rivieraVillage() {
  const p = [];
  const r = seededRandom(7);
  let k = 0;
  for (const [x, z, w, d, h] of [[-14, 2, 6, 5, 6], [-7, -2, 7, 6, 7.5], [1, 3, 5.5, 5, 6.5], [8, -1, 7, 6, 8], [15, 3, 6, 5, 6],
    [-11, -9, 6, 6, 8.5], [-3, -11, 7, 6, 9.5], [5, -10, 6, 6, 9], [13, -9, 6, 5, 8], [-6, -18, 7, 6, 10], [4, -19, 6, 6, 11]]) {
    const lift = -z * 0.25; // (stepping up the hill behind)
    p.push(box(w + 0.6, lift + 0.3, d + 0.6, x, (lift + 0.3) / 2 - 0.3, z, '#b8a68a'));
    const g = [];
    house(g, 0, 0, w, d, h, k, (r() - 0.5) * 0.3);
    const m = merge(g);
    m.applyMatrix4(M(x, lift, z));
    p.push(m);
    k += 1;
  }
  // The bell tower: ochre stone, an open belfry, a little wrought-iron cage on top.
  p.push(box(4, 15, 4, -1, 7.5 + 3.5, -14, '#e0b27a'), box(4.4, 0.5, 4.4, -1, 18.8, -14, '#c9995e'));
  p.push(box(3, 2.2, 3, -1, 20.2, -14, '#2e2a26'), box(3.6, 0.4, 3.6, -1, 21.5, -14, '#c9995e'));
  p.push(piece(new SphereGeometry(1.3, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), '#3a3836', M(-1, 21.7, -14)));
  stoneWall(p, -18, 18, 6.5);
  stonePine(p, -20, -4, 12);
  stonePine(p, 20, -6, 11, -0.08);
  return merge(p);
}

/** A few stone pines on a rocky slope. */
function umbrellaPines() {
  const p = [];
  for (const [x, z, h, l] of [[-7, 0, 12, 0.1], [0, -5, 14, -0.06], [7, 1, 11, 0.12], [3, 6, 9, -0.1]]) stonePine(p, x, z, h, l);
  p.push(piece(new IcosahedronGeometry(2.2, 0), '#b4a58c', S(-3, 0.4, 3, 1.4, 0.5, 1)), piece(new IcosahedronGeometry(1.6, 0), '#a8987e', S(9, 0.3, -4, 1.2, 0.5, 1)));
  return merge(p);
}

/** A lavender field: purple rows on red earth behind a dry-stone wall, a stone farmhouse (a mas) at the back. */
function lavenderField() {
  const p = [box(40, 0.2, 26, 0, 0.1, -10, '#a46a48')];
  for (let k = 0; k < 9; k += 1) p.push(box(36, 0.9, 1.3, 0, 0.55, -1 - k * 2.4, k % 2 ? '#8b68bf' : '#9b79cf'));
  stoneWall(p, -20, 20, 3.5, 0.8);
  // The mas: pale stone, a long terracotta roof, a cypress beside it.
  p.push(box(12, 6, 7, 6, 3, -27, '#e6d6b8'), roof(12, 7, 6, 6, -27, '#c8643a', 2));
  p.push(box(1, 1.4, 0.1, 3, 2.4, -23.45, '#4f8a6a'), box(1, 1.4, 0.1, 9, 2.4, -23.45, '#4f8a6a'));
  p.push(piece(new ConeGeometry(1.1, 9, 6), '#2f5a36', M(-2, 4.5, -26)), piece(new ConeGeometry(1, 8, 6), '#2f5a36', M(15, 4, -25)));
  return merge(p);
}

/** An olive grove in rows on terraces held up by dry-stone walls. */
function oliveGrove() {
  const p = [box(36, 0.2, 24, 0, 0.1, -9, '#c9a878')];
  for (let row = 0; row < 3; row += 1) {
    stoneWall(p, -18, 18, 2.5 - row * 8, 0.7);
    for (let k = 0; k < 6; k += 1) oliveTree(p, -15 + k * 6 + (row % 2) * 2.5, -1 - row * 8, 1 - row * 0.05);
  }
  return merge(p);
}

// ── By the sea ──────────────────────────────────────────────────────────────

/** A beach: pale sand sloping into the water, rows of striped parasols and loungers, a little beach hut. */
function rivieraBeach() {
  const p = [piece(new CylinderGeometry(30, 34, 1.2, 24, 1), '#efd7a6', S(0, 0.2, 0, 1.4, 1, 0.55))];
  const stripes = [['#e2473c', '#f7f2e8'], ['#2f7fc4', '#f7f2e8'], ['#f2b632', '#f7f2e8'], ['#2fa6a0', '#f7f2e8']];
  let k = 0;
  for (let row = 0; row < 2; row += 1) {
    for (let x = -28 + row * 4; x <= 28; x += 8) {
      const z = 4 - row * 7;
      const [a, b] = stripes[k % stripes.length];
      p.push(piece(new CylinderGeometry(0.06, 0.06, 2.4, 4), '#e8e2d6', M(x, 2, z)));
      p.push(piece(new ConeGeometry(1.7, 0.7, 6), a, M(x, 3.4, z)), piece(new ConeGeometry(1.0, 0.45, 6), b, M(x, 3.62, z)));
      p.push(box(0.8, 0.25, 2, x + 0.9, 0.95, z + 1.2, '#f7f2e8'));
      k += 1;
    }
  }
  p.push(box(4, 3, 3, 26, 2.3, -9, '#f3e9d6'), box(4.4, 0.3, 3.4, 26, 3.9, -9, '#2f7fc4'));
  return merge(p);
}

/** A small fishing boat (bright hull, a white band, a little cabin), floating; front along +z. */
function fishingBoat(p, x, z, k, yaw = 0) {
  const hulls = ['#2f7fc4', '#e2473c', '#2fa66a', '#f2b632', '#f7f2e8'];
  const g = [box(2.2, 1, 6.5, 0, 0.3, 0, hulls[k % hulls.length]), box(2.25, 0.25, 6.6, 0, 0.75, 0, '#f7f2e8')];
  g.push(piece(new ConeGeometry(1.15, 2.2, 4), hulls[k % hulls.length], new Matrix4().makeTranslation(0, 0.3, 4.3).multiply(new Matrix4().makeRotationX(Math.PI / 2)).multiply(new Matrix4().makeRotationY(Math.PI / 4)).multiply(S(0, 0, 0, 1, 1, 0.45))));
  if (k % 2) g.push(box(1.4, 1, 1.6, 0, 1.3, -1, '#f7f2e8'));
  const geo = merge(g);
  geo.applyMatrix4(turned(x, 0, z, yaw));
  p.push(geo);
}

/** A white sailing yacht, floating: a long hull, a low cabin, a tall mast (sails furled). */
function sailYacht(p, x, z, len = 11, yaw = 0) {
  const g = [box(3, 1.4, len, 0, 0.4, 0, '#f7f7f4'), box(3.05, 0.25, len, 0, 0.05, 0, '#1f3a5a'), box(2, 0.8, len * 0.35, 0, 1.4, -len * 0.05, '#e9eef2')];
  g.push(piece(new ConeGeometry(1.52, 3, 4), '#f7f7f4', new Matrix4().makeTranslation(0, 0.4, len / 2 + 1.2).multiply(new Matrix4().makeRotationX(Math.PI / 2)).multiply(new Matrix4().makeRotationY(Math.PI / 4)).multiply(S(0, 0, 0, 1, 1, 0.5))));
  g.push(piece(new CylinderGeometry(0.08, 0.1, len * 1.3, 4), '#d8dde2', M(0, len * 0.65 + 0.8, len * 0.12)));
  g.push(piece(new CylinderGeometry(0.22, 0.22, len * 0.45, 5), '#2f6fa8', new Matrix4().makeTranslation(0, 2.4, -len * 0.08).multiply(new Matrix4().makeRotationX(Math.PI / 2))));
  const geo = merge(g);
  geo.applyMatrix4(turned(x, 0, z, yaw));
  p.push(geo);
}

/** A white motor yacht, floating: a sleek hull, two decks of dark windows. */
function motorYacht(p, x, z, len = 22, yaw = 0) {
  const g = [box(5, 2.2, len, 0, 0.6, 0, '#f7f7f4'), box(5.05, 0.4, len, 0, -0.2, 0, '#2a3a4a')];
  g.push(piece(new ConeGeometry(2.55, 5, 4), '#f7f7f4', new Matrix4().makeTranslation(0, 0.6, len / 2 + 2).multiply(new Matrix4().makeRotationX(Math.PI / 2)).multiply(new Matrix4().makeRotationY(Math.PI / 4)).multiply(S(0, 0, 0, 1, 1, 0.45))));
  g.push(box(4.2, 1.8, len * 0.55, 0, 2.6, -len * 0.08, '#f7f7f4'), box(4.25, 0.6, len * 0.55, 0, 2.7, -len * 0.08, '#2b3440'));
  g.push(box(3.4, 1.4, len * 0.3, 0, 4.2, -len * 0.12, '#f7f7f4'), box(3.45, 0.5, len * 0.3, 0, 4.3, -len * 0.12, '#2b3440'));
  const geo = merge(g);
  geo.applyMatrix4(turned(x, 0, z, yaw));
  p.push(geo);
}

/** Yachts at anchor out in the bay (floating at the sea's level). */
function yachts() {
  const p = [];
  motorYacht(p, 0, 0, 24, 0.4);
  sailYacht(p, -26, 10, 12, -0.3);
  sailYacht(p, 22, -14, 10, 1.1);
  sailYacht(p, -10, -26, 13, 0.7);
  motorYacht(p, 30, 18, 16, -0.6);
  return merge(p);
}

/**
 * The harbour: a stone quay along the front with bollards and café umbrellas, little fishing boats and white
 * yachts moored stern-to along it (floating at the sea's level), a row of rendered houses behind the quay.
 */
function rivieraHarbour() {
  const p = [box(70, 1.4, 6, 0, 0.7, 10, '#cdbf9f')];
  for (let x = -32; x <= 32; x += 4) p.push(piece(new CylinderGeometry(0.22, 0.26, 0.6, 6), '#3a3836', M(x, 1.7, 7.4)));
  let k = 0;
  for (let x = -30; x <= 30; x += 5) {
    if (k % 3 === 2) sailYacht(p, x, 0, 11, Math.PI);
    else fishingBoat(p, x, 3, k, Math.PI);
    k += 1;
  }
  motorYacht(p, 8, -14, 22, Math.PI / 2);
  for (let i = 0; i < 6; i += 1) {
    const g = [];
    house(g, 0, 0, 9, 7, 9 + (i % 3) * 1.5, i + 2);
    const m = merge(g);
    m.applyMatrix4(M(-27 + i * 10.5, 1.4, 17.5));
    p.push(m);
  }
  for (const x of [-20, -8, 4, 16]) p.push(piece(new ConeGeometry(1.6, 0.6, 8), '#e2473c', M(x, 3.6, 12.6)), piece(new CylinderGeometry(0.05, 0.05, 2.2, 4), '#e8e2d6', M(x, 2.5, 12.6)));
  return merge(p);
}

/**
 * The lighthouse on the harbour wall: a round stone jetty head, a white tower with a red lantern room
 * and gallery (front +z). Standing in the middle of the spiral (`around`), the field winds down round it.
 */
function rivieraLighthouse() {
  const p = [piece(new CylinderGeometry(7, 8, 9, 18), '#c9bba0', M(0, -2, 0)), piece(new CylinderGeometry(7.3, 7.3, 0.4, 18), '#b3a486', M(0, 2.6, 0))]; // (the harbour wall's round head, from the sea floor up)
  p.push(piece(new CylinderGeometry(2.1, 2.8, 17, 14), '#f7f5ee', M(0, 2.5 + 8.5, 0)));
  p.push(piece(new CylinderGeometry(2.15, 2.25, 1.4, 14), '#d23a33', M(0, 9, 0)));
  p.push(piece(new CylinderGeometry(3, 3, 0.4, 14), '#d23a33', M(0, 19.7, 0)));
  p.push(piece(new CylinderGeometry(1.6, 1.6, 2.4, 10), '#fbe7a1', M(0, 21.1, 0)));
  p.push(piece(new ConeGeometry(2, 1.8, 12), '#d23a33', M(0, 23.2, 0)));
  for (let a = 0; a < 8; a += 1) p.push(piece(new CylinderGeometry(0.06, 0.06, 1, 4), '#3a3836', M(Math.cos(a * Math.PI / 4) * 2.9, 20.4, Math.sin(a * Math.PI / 4) * 2.9)));
  return merge(p);
}

export const RIVIERA_LANDMARKS = {
  'riviera-village': { build: rivieraVillage, radius: 24 },
  'umbrella-pines': { build: umbrellaPines, radius: 11 },
  'lavender-field': { build: lavenderField, radius: 22 },
  'olive-grove': { build: oliveGrove, radius: 20 },
  'riviera-beach': { build: rivieraBeach, radius: 40 },
  'riviera-harbour': { build: rivieraHarbour, radius: 36 },
  yachts: { build: yachts, radius: 34 },
  'riviera-lighthouse': { build: rivieraLighthouse, radius: 8, fit: 7 },
};
