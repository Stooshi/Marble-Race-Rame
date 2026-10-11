/**
 * Landmarks for the Coaster Series: one builder each, origin on the ground,
 * front facing +z, cartoon low-poly from a few simple shapes, merged into the
 * still scenery. Stylised impressions, never detailed reproductions.
 */
import { BoxGeometry, ConeGeometry, CylinderGeometry, IcosahedronGeometry, Matrix4, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import { box, merge, piece } from './parts';

const Y = new Vector3(0, 1, 0);
const M = (x, y, z) => new Matrix4().makeTranslation(x, y, z);
const S = (x, y, z, sx, sy, sz) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion(), new Vector3(sx, sy, sz));
const turned = (x, y, z, yaw, sx = 1, sy = 1, sz = 1) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(Y, yaw), new Vector3(sx, sy, sz));
const roof = (w, h, d, x, y, z, colour, yaw = 0) => piece(new ConeGeometry(Math.hypot(w, d) / 2, h, 4), colour, turned(x, y + h / 2, z, Math.PI / 4 + yaw, w / Math.hypot(w, d) * Math.SQRT2, 1, d / Math.hypot(w, d) * Math.SQRT2));

// ── Sognefjord ───────────────────────────────────────────────────────────────

/** A dark wooden stave church: stacked roofs climbing to a spire, dragon heads on the gables. */
function staveChurch() {
  const TAR = '#3a2a20';
  const DARK = '#2a1e17';
  const p = [box(9, 5, 13, 0, 2.5, 0, TAR)];
  [[11, 3.2, 15, 5], [8, 3, 11, 8.2], [6, 2.6, 8, 11.2], [3.6, 2.2, 4.6, 13.8]].forEach(([w, h, d, y], k) => {
    p.push(roof(w, h, d, 0, y, 0, k % 2 ? DARK : TAR));
    if (k < 3) p.push(box(w * 0.62, 1.6, d * 0.62, 0, y + h * 0.8, 0, TAR));
  });
  p.push(piece(new ConeGeometry(0.9, 5, 6), DARK, M(0, 18.5, 0)));
  // The dragon heads: little curled shapes reaching out from the gable tops.
  for (const [x, z] of [[0, 6.6], [0, -6.6], [0, 4.6], [0, -4.6]]) {
    p.push(piece(new ConeGeometry(0.3, 1.8, 5), DARK, new Matrix4().makeRotationX(z > 0 ? Math.PI / 3 : -Math.PI / 3).premultiply(M(x, z * 1.2 > 0 ? 9.8 : 9.8, z))));
  }
  p.push(box(2.2, 3, 0.4, 0, 1.5, 6.7, '#5a3f2a'));
  return merge(p);
}

/** Red and white wooden houses along a quay, steep roofs, a jetty. */
function fjordVillage() {
  const walls = ['#a8322a', '#f2efe6', '#a8322a', '#e8c45a', '#f2efe6', '#a8322a'];
  const p = [];
  walls.forEach((c, k) => {
    const x = -22 + k * 8.5;
    const z = (k % 2) * 6;
    p.push(box(6.5, 5, 7, x, 2.5, z, c));
    p.push(roof(7.4, 3, 7.8, x, 5, z, '#3a3d44'));
    p.push(box(1, 1.2, 0.2, x, 2.2, z + 3.6, '#2c3440'));
  });
  p.push(box(52, 0.8, 5, 0, 0.4, -7, '#7a6a55')); // the quay
  return merge(p);
}

/** A cruise ship gliding along the fjord: a long white hull, decks of windows, a funnel. */
function cruiseShip() {
  const p = [
    piece(new BoxGeometry(14, 6, 90), '#f4f4f2', M(0, 3, 0)),
    piece(new ConeGeometry(7, 14, 4), '#f4f4f2', new Matrix4().makeRotationX(Math.PI / 2).premultiply(M(0, 3, 51)).multiply(new Matrix4().makeRotationY(Math.PI / 4)).multiply(S(0, 0, 0, 1, 1, 0.43))),
    box(14.2, 1, 90.2, 0, 0.6, 0, '#2c3a52'),
  ];
  for (let d = 0; d < 4; d += 1) {
    p.push(box(12 - d * 1.4, 2.4, 70 - d * 10, 0, 7.2 + d * 2.4, -4, '#f4f4f2'));
    p.push(box(12.2 - d * 1.4, 0.5, 70.2 - d * 10, 0, 7.6 + d * 2.4, -4, '#3f6f9a'));
  }
  p.push(piece(new CylinderGeometry(2.2, 2.6, 6, 10), '#d8322b', M(0, 19, -18)));
  return merge(p);
}

/** A tall waterfall pouring off a dark cliff into a pool, its spray at the foot. */
function waterfallCliff() {
  const p = [
    piece(new IcosahedronGeometry(30, 1), '#5f6268', S(0, 26, -16, 1.2, 1.1, 0.7)),
    box(9, 58, 1.2, 0, 29, 6, '#dff3ff'), // the falling water
    box(5, 58, 1.4, 0, 29, 6.3, '#f4fbff'),
    piece(new CylinderGeometry(14, 14, 0.4, 20), '#4f8fb8', M(0, 0.2, 10)),
    piece(new IcosahedronGeometry(7, 1), '#f4fbff', S(0, 2.5, 10, 1.4, 0.45, 1)),
  ];
  return merge(p);
}

/** A farm on a ledge high on the fjord side: a red barn, a grass roof cottage, a little field. */
function ledgeFarm() {
  return merge([
    piece(new IcosahedronGeometry(16, 0), '#6a6d72', S(0, -4, 0, 1.2, 0.6, 1)),
    box(18, 1, 14, 0, 4, 0, '#6f9a45'),
    box(7, 4.5, 5, -4, 6.7, -2, '#a8322a'),
    roof(7.6, 2.5, 5.6, -4, 9, -2, '#3a3d44'),
    box(5, 3.5, 4, 4, 6.2, 2, '#f2efe6'),
    roof(5.6, 2, 4.6, 4, 8, 2, '#4f7a3a'),
  ]);
}


// ── Phantom Peak ─────────────────────────────────────────────────────────────

/** A giant carved skull rock on the summit, its eyes glowing, the park's tall entrance gate below it. */
function skullRock() {
  const ROCK = '#8a8478';
  const DARK = '#2a2622';
  const GLOW = '#ffb02e';
  const p = [
    piece(new IcosahedronGeometry(9, 1), ROCK, S(0, 9, -4, 1, 0.95, 0.9)), // the cranium
    piece(new IcosahedronGeometry(5.5, 1), ROCK, S(0, 3.2, 1.5, 1.05, 0.6, 0.8)), // the jaw
    piece(new IcosahedronGeometry(14, 0), '#6d685f', S(0, -2, -4, 1.3, 0.35, 1.1)), // the rock it grows from
  ];
  for (const x of [-3.4, 3.4]) {
    p.push(piece(new SphereGeometry(2.2, 10, 8), DARK, S(x, 9.5, 3.2, 1, 1.1, 0.5))); // eye sockets
    p.push(piece(new SphereGeometry(0.9, 8, 6), GLOW, M(x, 9.4, 3.9))); // glowing eyes
  }
  p.push(piece(new ConeGeometry(1.3, 2.4, 3), DARK, new Matrix4().makeRotationX(Math.PI).premultiply(M(0, 6.4, 4.4))));
  for (let k = -2; k <= 2; k += 1) p.push(box(1, 1.3, 0.6, k * 1.25, 4.4, 5.2, '#e8e2d2')); // teeth
  // The entrance gate below: two tall posts and an arched sign.
  for (const x of [-9, 9]) p.push(box(1.6, 14, 1.6, x, 7, 16, '#3a2a48'), piece(new ConeGeometry(1.4, 3, 4), '#5a2a6a', turned(x, 15.5, 16, Math.PI / 4)));
  p.push(box(20, 2.6, 1, 0, 12.5, 16, '#5a2a6a'), box(16, 1.2, 1.1, 0, 12.5, 16.1, GLOW));
  return merge(p);
}

/** The park's midway behind the station: a lit Ferris wheel, a carousel, stalls strung with lights. */
function parkMidway() {
  const p = [];
  // The Ferris wheel: a ring of spokes and gondolas on an A-frame.
  const R = 16;
  const wx = -18;
  for (const z of [-1.2, 1.2]) p.push(piece(new TorusGeometry(R, 0.35, 5, 28), '#e8e0f0', turned(wx, R + 4, z, 0)));
  for (let k = 0; k < 12; k += 1) {
    const a = (k / 12) * Math.PI * 2;
    const m = new Matrix4().makeRotationZ(a).premultiply(M(wx, R + 4, 0));
    p.push(piece(new BoxGeometry(0.25, R * 2, 0.25), '#cfc6e0', m));
    const gx = wx + Math.cos(a) * R;
    const gy = R + 4 + Math.sin(a) * R;
    p.push(box(2, 1.8, 2, gx, gy - 1.6, 0, ['#ff5a5a', '#ffd23a', '#5ad1ff', '#9a6aff'][k % 4]));
  }
  for (const s of [-1, 1]) {
    for (const z of [-3, 3]) p.push(piece(new BoxGeometry(0.7, R + 6, 0.7), '#4a3a5a', new Matrix4().makeRotationZ(s * 0.28).premultiply(M(wx + s * 4, (R + 4) / 2, z))));
  }
  // The carousel: a striped round roof on a drum, horses round its rim.
  const cx = 14;
  p.push(piece(new CylinderGeometry(9, 9, 0.8, 18), '#7a4a8a', M(cx, 0.4, 0)));
  p.push(piece(new CylinderGeometry(1, 1, 7, 10), '#ffd23a', M(cx, 4, 0)));
  p.push(piece(new ConeGeometry(10, 4.5, 18), '#d8344a', M(cx, 9.5, 0)));
  p.push(piece(new CylinderGeometry(10, 10, 1, 18), '#f4ecd8', M(cx, 7.1, 0)));
  for (let k = 0; k < 8; k += 1) {
    const a = (k / 8) * Math.PI * 2;
    p.push(box(0.7, 1.4, 2, cx + Math.cos(a) * 6.5, 2.2, Math.sin(a) * 6.5, '#f4ecd8'));
    p.push(piece(new CylinderGeometry(0.1, 0.1, 6, 5), '#ffd23a', M(cx + Math.cos(a) * 6.5, 4, Math.sin(a) * 6.5)));
  }
  // Stalls along the midway, strung with lights.
  for (let k = 0; k < 4; k += 1) {
    const x = -6 + k * 5.5;
    p.push(box(4.5, 3, 3.5, x, 1.5, 12, ['#3a2a48', '#4a2a3a', '#2a3a48', '#3a3a2a'][k]));
    p.push(roof(5, 1.8, 4, x, 3, 12, ['#ff5a5a', '#5ad1ff', '#ffd23a', '#9a6aff'][k]));
  }
  for (let k = 0; k < 24; k += 1) p.push(piece(new SphereGeometry(0.28, 5, 4), '#ffe08a', M(-8 + k * 1.05, 6 + Math.sin(k * 0.6) * 0.5, 10)));
  return merge(p);
}

/** Other coasters lit up across the valley: lattice hills and a loop-free helix, in silhouette. */
function distantCoasters() {
  const p = [];
  const steel = '#3e3450';
  const lights = '#ffcf6a';
  for (let k = 0; k < 18; k += 1) {
    const x = -60 + k * 7;
    const h = 14 + Math.sin(k * 0.7) * 10 + (k > 9 ? 8 : 0);
    p.push(box(0.6, h, 0.6, x, h / 2, 0, steel));
    p.push(box(7.2, 0.7, 1.6, x + 3.5, h + 0.3, 0, '#c8c2d8'));
    p.push(piece(new SphereGeometry(0.35, 5, 4), lights, M(x, h + 1.2, 0.9)));
  }
  for (let k = 0; k < 10; k += 1) p.push(box(0.5, 22 + k * 1.8, 0.5, 70 + (k % 2) * 6, 11 + k * 0.9, -6 + Math.floor(k / 2) * 3, steel));
  p.push(piece(new TorusGeometry(10, 0.7, 5, 20), '#c8c2d8', new Matrix4().makeRotationX(Math.PI / 2).premultiply(M(73, 26, 0))));
  return merge(p);
}

/** A graveyard by the crypt tunnel: leaning tombstones, a little crypt, a rusty fence, lanterns. */
function graveyard() {
  const p = [box(30, 0.3, 20, 0, 0.15, 0, '#4a5240')];
  for (let k = 0; k < 14; k += 1) {
    const x = -12 + (k % 7) * 4;
    const z = -6 + Math.floor(k / 7) * 7;
    const tilt = ((k * 37) % 7 - 3) * 0.06;
    p.push(piece(new BoxGeometry(1.4, 2 + (k % 3) * 0.4, 0.4), '#9a968c', new Matrix4().makeRotationZ(tilt).premultiply(M(x, 1.1, z))));
  }
  p.push(box(6, 5, 6, 10, 2.5, 5, '#77736a'), roof(7, 2.5, 7, 10, 5, 5, '#4a4640'), box(1.6, 3, 0.3, 10, 1.5, 8.1, '#1e1c1a'));
  for (let k = 0; k < 16; k += 1) p.push(box(0.12, 1.6, 0.12, -15 + k * 2, 0.8, -10, '#3a3430'));
  p.push(box(32, 0.12, 0.12, 0, 1.4, -10, '#3a3430'));
  for (const x of [-14, 14]) p.push(box(0.3, 3, 0.3, x, 1.5, 9, '#2a2622'), piece(new SphereGeometry(0.5, 6, 5), '#ffb02e', M(x, 3.2, 9)));
  return merge(p);
}

/** A smoking volcano rock in the middle of the spin, lava glowing in its cracks. */
function volcanoRock() {
  const p = [
    piece(new ConeGeometry(12, 34, 9), '#4a3a34', M(0, 17, 0)),
    piece(new CylinderGeometry(4.5, 6, 3, 9), '#3a2c28', M(0, 33.5, 0)),
    piece(new CylinderGeometry(3.6, 3.6, 0.6, 9), '#ff6a1a', M(0, 35, 0)),
  ];
  for (let k = 0; k < 7; k += 1) {
    const a = (k / 7) * Math.PI * 2 + 0.3;
    const r = 7 - (k % 3) * 0.8;
    const y = 8 + (k % 3) * 7;
    p.push(piece(new BoxGeometry(0.5, 9, 0.4), '#ff8a2a', new Matrix4().makeRotationY(-a).multiply(new Matrix4().makeRotationZ(0.45)).premultiply(M(Math.cos(a) * r, y, Math.sin(a) * r))));
  }
  for (let k = 0; k < 4; k += 1) p.push(piece(new IcosahedronGeometry(2.6 + k * 0.6, 0), '#8a8480', M(Math.sin(k) * 1.5, 38 + k * 3.2, Math.cos(k) * 1.5)));
  return merge(p);
}


// ── Collserola Run ───────────────────────────────────────────────────────────

/** Tibidabo's hilltop: the temple with its tall central tower and statue on top, and the slim Collserola tower beside it. */
function tibidabo() {
  const STONE = '#d8d0c0';
  const DARK = '#8a8070';
  const p = [
    box(18, 7, 14, 0, 3.5, 0, '#b8a888'), // the crypt below
    box(12, 9, 10, 0, 11.5, 0, STONE),
    piece(new CylinderGeometry(2.6, 3, 14, 10), STONE, M(0, 23, 0)),
    piece(new ConeGeometry(2.8, 4, 10), DARK, M(0, 32, 0)),
    piece(new CylinderGeometry(0.5, 0.7, 3.4, 8), '#e8c45a', M(0, 35.7, 0)), // the statue, arms out
    box(3.4, 0.5, 0.5, 0, 36.6, 0, '#e8c45a'),
  ];
  for (const x of [-5, 5]) p.push(piece(new CylinderGeometry(1.1, 1.3, 10, 8), STONE, M(x, 20, -3)), piece(new ConeGeometry(1.3, 3.5, 8), DARK, M(x, 26.7, -3)));
  // The Collserola tower: a slim needle with a disc of decks, its antenna on top.
  const tx = 26;
  p.push(piece(new CylinderGeometry(0.9, 1.4, 70, 8), '#c8ccd2', M(tx, 35, -10)));
  for (const y of [44, 48]) p.push(piece(new CylinderGeometry(7, 7, 2.6, 14), '#e2e4e8', M(tx, y, -10)));
  p.push(piece(new CylinderGeometry(0.25, 0.5, 18, 6), '#d84a3a', M(tx, 79, -10)));
  for (let k = 0; k < 3; k += 1) {
    const a = (k / 3) * Math.PI * 2;
    p.push(piece(new CylinderGeometry(0.08, 0.08, 52, 4), '#9aa0a8', new Matrix4().makeRotationZ(0.42).premultiply(new Matrix4().makeRotationY(a)).premultiply(M(tx + Math.cos(a) * 10, 24, -10 + Math.sin(a) * 10))));
  }
  return merge(p);
}

/** Barceloneta: the beach and the sea behind the station, umbrellas, a kiosk, the palm-lined promenade. */
function barcelonetaBeach() {
  const p = [
    box(110, 0.4, 30, 0, 0.2, -14, '#ead8a8'), // the sand
    box(130, 0.3, 60, 0, -0.1, -58, '#3f8fc4'), // the sea
    box(110, 0.5, 6, 0, 0.25, 4, '#c8c0b0'), // the promenade
  ];
  for (let k = 0; k < 9; k += 1) {
    const x = -44 + k * 11;
    const c = ['#d8442f', '#f2c230', '#2f7fc4', '#4aa35a'][k % 4];
    p.push(piece(new CylinderGeometry(0.1, 0.1, 2.6, 5), '#f2efe6', M(x, 1.3, -12 - (k % 3) * 5)));
    p.push(piece(new ConeGeometry(2, 0.9, 8), c, M(x, 2.9, -12 - (k % 3) * 5)));
  }
  for (let k = 0; k < 8; k += 1) {
    const x = -48 + k * 14;
    p.push(piece(new CylinderGeometry(0.3, 0.45, 9, 6), '#8a6a4a', M(x, 4.5, 7)));
    p.push(piece(new IcosahedronGeometry(2.6, 0), '#3f7f3a', S(x, 9.5, 7, 1.3, 0.5, 1.3)));
  }
  p.push(box(4, 3, 3, 30, 1.5, -6, '#f2efe6'), roof(5, 1.6, 4, 30, 3, -6, '#2f7fc4'));
  // A tall hotel sail at the end of the beach.
  p.push(piece(new CylinderGeometry(6, 8, 50, 4, 1), '#cfe0ea', turned(62, 25, -20, Math.PI / 4, 1, 1, 0.35)));
  return merge(p);
}

/** The city spread below: the grid of the Eixample, a few towers, the sea beyond. */
function barcelonaCity() {
  const p = [box(220, 0.3, 160, 0, -0.5, 0, '#c8b8a0')];
  for (let i = -6; i <= 6; i += 1) {
    for (let j = -4; j <= 4; j += 1) {
      const h = 6 + (Math.abs(i * 7 + j * 13) % 5) * 1.5;
      // Eixample blocks: square with cut corners, a courtyard in the middle (drawn as four sides).
      const x = i * 16;
      const z = j * 16;
      p.push(box(12, h, 3, x, h / 2, z - 4.5, '#e2d4b8'), box(12, h, 3, x, h / 2, z + 4.5, '#d8c8a8'));
      p.push(box(3, h, 6, x - 4.5, h / 2, z, '#e2d4b8'), box(3, h, 6, x + 4.5, h / 2, z, '#d8c8a8'));
    }
  }
  p.push(piece(new CylinderGeometry(4, 6, 60, 12), '#d84a3a', S(60, 30, -50, 1, 1, 0.8))); // a bullet-shaped tower
  p.push(piece(new SphereGeometry(4.4, 10, 8), '#2f7fc4', S(60, 60, -50, 1, 1.4, 0.8)));
  p.push(box(220, 0.3, 40, 0, -0.4, -100, '#3f8fc4'));
  return merge(p);
}

/** Park Güell's terrace by the tunnel: the long wavy mosaic bench, a little mosaic lizard, a gingerbread lodge. */
function parkGuellTerrace() {
  const tiles = ['#2f7fc4', '#f2c230', '#4aa35a', '#d8442f', '#2fb0a8', '#f2efe6'];
  const p = [box(36, 6, 16, 0, 3, 0, '#c8a878')]; // the terrace on its columns
  for (let k = 0; k < 6; k += 1) p.push(piece(new CylinderGeometry(0.9, 1, 6, 8), '#d8c8a8', M(-15 + k * 6, 3, 9)));
  for (let k = 0; k < 24; k += 1) {
    const x = -17 + k * 1.5;
    const z = 7.5 + Math.sin(k * 0.6) * 1.4;
    p.push(box(1.6, 1.2, 0.6, x, 6.6, z, tiles[k % tiles.length]));
  }
  // The lizard on the steps, in colourful tiles.
  p.push(piece(new IcosahedronGeometry(1.2, 0), '#4aa35a', S(-8, 1.2, 14, 1.8, 0.6, 0.9)));
  p.push(piece(new ConeGeometry(0.5, 2.4, 5), '#2f7fc4', new Matrix4().makeRotationZ(Math.PI / 2).premultiply(M(-11, 1.1, 14))));
  p.push(piece(new IcosahedronGeometry(0.7, 0), '#f2c230', M(-5.4, 1.4, 14)));
  // The lodge with its iced-cake roof and spire.
  p.push(box(8, 7, 8, 14, 3.5, -12, '#e8d8b8'), piece(new ConeGeometry(5.8, 4, 4), '#7a4a2a', turned(14, 9, -12, Math.PI / 4)));
  p.push(piece(new CylinderGeometry(0.6, 0.9, 6, 8), '#f2efe6', M(17, 10, -9)), piece(new ConeGeometry(0.9, 1.6, 8), '#2f7fc4', M(17, 13.8, -9)));
  return merge(p);
}

/** The Sagrada Família in the middle of the spin: clusters of tall perforated spires, cranes over the basilica. */
function sagradaFamilia() {
  const STONE = '#c8b08a';
  const p = [box(22, 14, 32, 0, 7, 0, '#b89c78')];
  const spire = (x, z, h, r) => {
    p.push(piece(new CylinderGeometry(r * 0.55, r, h, 8), STONE, M(x, 14 + h / 2, z)));
    p.push(piece(new ConeGeometry(r * 0.6, h * 0.25, 8), STONE, M(x, 14 + h + h * 0.12, z)));
    p.push(piece(new IcosahedronGeometry(r * 0.45, 0), '#e8c45a', M(x, 14 + h * 1.27, z)));
  };
  for (const z of [-15, 15]) for (const x of [-6, -2, 2, 6]) spire(x, z, 22 + (Math.abs(x) < 4 ? 6 : 0), 1.5);
  spire(0, 0, 40, 3.2); // the central tower
  for (const [x, z] of [[-7, -5], [7, -5], [-7, 6], [7, 6]]) spire(x, z, 28, 2);
  // Two construction cranes.
  for (const [x, z, a] of [[-14, -8, 0.4], [14, 10, -2.2]]) {
    p.push(box(1, 52, 1, x, 26, z, '#e8c23a'));
    p.push(piece(new BoxGeometry(26, 0.8, 0.8), '#e8c23a', new Matrix4().makeRotationY(a).premultiply(M(x, 52, z)).multiply(new Matrix4().makeTranslation(8, 0, 0))));
  }
  return merge(p);
}


// ── Whistler Spins ───────────────────────────────────────────────────────────

/** A tall stone inukshuk on the summit (a plain one, stacked stones with arms), snowy peaks behind it. */
function inukshuk() {
  const STONE = '#8a8f96';
  const p = [
    box(1.6, 4, 1.4, -1.8, 2, 0, STONE), box(1.6, 4, 1.4, 1.8, 2, 0, STONE), // the legs
    box(6, 1.6, 1.8, 0, 4.8, 0, '#7a7f86'), // the hips
    box(3, 3.4, 1.6, 0, 7.3, 0, STONE), // the body
    box(10, 1.4, 1.6, 0, 9.6, 0, '#7a7f86'), // the arms
    box(2.2, 2, 1.6, 0, 11.3, 0, STONE), // the head
    piece(new IcosahedronGeometry(5, 0), '#e8eef4', S(0, 0.5, 0, 1.4, 0.3, 1.2)),
  ];
  for (const [x, z, h, r] of [[-40, -50, 60, 26], [10, -70, 80, 30], [55, -45, 55, 24]]) {
    p.push(piece(new ConeGeometry(r, h, 6), '#7a7f86', M(x, h / 2 - 6, z)));
    p.push(piece(new ConeGeometry(r * 0.42, h * 0.42, 6), '#f4f8fb', M(x, h - 6 - h * 0.21 + 0.5, z)));
  }
  return merge(p);
}

/** Whistler Village behind the station: wooden lodges with snowy roofs, strings of lights, a skating rink. */
function whistlerVillage() {
  const p = [];
  const walls = ['#7a5a3a', '#8a6a48', '#6a4a30', '#9a7a52'];
  for (let k = 0; k < 6; k += 1) {
    const x = -30 + k * 12;
    const z = (k % 2) * 8 - 4;
    const h = 7 + (k % 3) * 2;
    p.push(box(9, h, 8, x, h / 2, z, walls[k % 4]));
    p.push(roof(10.4, 4, 9.4, x, h, z, '#f4f8fb'));
    for (const y of [2.5, 5]) p.push(box(6, 1.2, 0.2, x, y, z + 4.1, '#ffd88a'));
  }
  // The skating rink with its rail and a few skaters.
  p.push(box(26, 0.3, 14, 4, 0.15, 20, '#cfe8f6'));
  for (const [w, d, x, z] of [[26, 0.3, 4, 13], [26, 0.3, 4, 27], [0.3, 14, -9, 20], [0.3, 14, 17, 20]]) p.push(box(w, 1.1, d, x, 0.55, z, '#f2efe6'));
  for (let k = 0; k < 6; k += 1) p.push(box(0.5, 1.6, 0.4, -4 + k * 3.2, 1.1, 17 + (k % 3) * 2.5, ['#d8442f', '#2f7fc4', '#f2c230'][k % 3]));
  for (let k = 0; k < 30; k += 1) p.push(piece(new SphereGeometry(0.25, 5, 4), '#ffe08a', M(-34 + k * 2.4, 7 + Math.sin(k * 0.8) * 0.6, 9)));
  return merge(p);
}

/** A frozen waterfall in the middle of the second spin: a cliff hung with ice, a mountain goat on a ledge. */
function frozenWaterfall() {
  const p = [
    piece(new CylinderGeometry(4.2, 6, 24, 7), '#6f747a', M(0, 12, 0)),
    piece(new ConeGeometry(4.6, 4, 7), '#f4f8fb', M(0, 26, 0)),
  ];
  for (let k = 0; k < 9; k += 1) {
    const a = (k / 9) * Math.PI * 2;
    const h = 9 + (k % 4) * 3;
    p.push(piece(new ConeGeometry(1.1, h, 6), k % 2 ? '#bfe4f6' : '#e2f4fc', new Matrix4().makeRotationX(Math.PI).premultiply(M(Math.cos(a) * 5.2, 24 - h / 2, Math.sin(a) * 5.2))));
  }
  p.push(piece(new CylinderGeometry(6.5, 6.5, 0.5, 14), '#cfe8f6', M(0, 0.25, 0))); // the frozen pool
  // The mountain goat on a ledge, white coat, black horns.
  p.push(box(2.4, 0.5, 1.8, 4.6, 14, 1.5, '#6f747a'));
  p.push(box(1.4, 0.8, 0.6, 4.6, 15, 1.5, '#f4f2ea'), box(0.45, 0.6, 0.45, 5.4, 15.6, 1.5, '#f4f2ea'));
  for (const x of [4.1, 5.1]) p.push(box(0.18, 0.7, 0.18, x, 14.5, 1.3, '#f4f2ea'));
  p.push(piece(new ConeGeometry(0.09, 0.45, 4), '#2a2622', new Matrix4().makeRotationZ(-0.5).premultiply(M(5.6, 16.1, 1.5))));
  return merge(p);
}


// ── Pyramid Run ──────────────────────────────────────────────────────────────

const LIMESTONE = '#e2cc98';

/** A stepped-looking pyramid: a four-sided cone, its capstone a shade lighter. */
function pyramid(base, height, x = 0, z = 0) {
  const r = base / Math.SQRT2;
  return [
    piece(new ConeGeometry(r, height, 4), LIMESTONE, turned(x, height / 2, z, Math.PI / 4)),
    piece(new ConeGeometry(r * 0.12, height * 0.12, 4), '#f2e2b8', turned(x, height * 0.94, z, Math.PI / 4)),
  ];
}

/** The Great Sphinx lying on the sand, the Great Pyramid rising behind it. */
function sphinx() {
  const STONE = '#c8a46a';
  const p = [
    box(8, 5, 26, 0, 2.5, -2, STONE), // the lion's body
    box(9, 2, 30, 0, 1, -1, '#b8945a'), // its plinth
    box(2.4, 2, 10, -3, 1.6, 15, STONE), box(2.4, 2, 10, 3, 1.6, 15, STONE), // the paws, out in front
    box(5, 6, 5, 0, 8, 10, STONE), // the head
    box(7.4, 5, 2.4, 0, 7.6, 9, '#2f5a8a'), box(7.4, 1.2, 2.6, 0, 7, 9, '#d8b84a'), // the striped headdress
    box(3.2, 3.6, 0.4, 0, 8, 12.6, '#b8945a'), // the face
    piece(new IcosahedronGeometry(3, 0), '#c8a46a', S(0, 4, -16, 1.2, 1, 1.4)), // the haunch
  ];
  p.push(...pyramid(120, 90, -10, -110));
  return merge(p);
}

/** The three pyramids of Giza across the sand, two small queens' pyramids beside them. */
function gizaPyramids() {
  const p = [];
  p.push(...pyramid(110, 82, -70, 10), ...pyramid(100, 76, 20, -20), ...pyramid(60, 40, 95, 30));
  for (const x of [120, 135, 150]) p.push(...pyramid(16, 11, x, 70));
  return merge(p);
}

/** A Nile-side station: the river, palms on the bank, feluccas with tall white sails. */
function nileStation() {
  const p = [
    box(140, 0.3, 50, 0, 0.1, -40, '#3f8fa8'), // the Nile
    box(140, 0.5, 10, 0, 0.25, -10, '#c8b078'), // the bank
  ];
  for (let k = 0; k < 10; k += 1) {
    const x = -60 + k * 13;
    p.push(piece(new CylinderGeometry(0.35, 0.5, 10, 6), '#8a6a3a', M(x, 5, -8 + (k % 2) * 4)));
    p.push(piece(new IcosahedronGeometry(3, 0), '#4f8a3a', S(x, 10.5, -8 + (k % 2) * 4, 1.3, 0.45, 1.3)));
  }
  for (const [x, z, yaw] of [[-30, -35, 0.3], [10, -48, -0.2], [45, -32, 0.6]]) {
    p.push(piece(new BoxGeometry(3, 1.2, 10), '#7a5a3a', turned(x, 0.6, z, yaw)));
    p.push(piece(new CylinderGeometry(0.12, 0.12, 12, 5), '#5a4028', M(x, 6.5, z)));
    // The lateen sail: a long tilted triangle.
    p.push(piece(new ConeGeometry(4.5, 12, 3), '#f4f0e4', new Matrix4().makeRotationZ(0.35).premultiply(turned(x + 1.5, 7, z, yaw, 1, 1, 0.12))));
  }
  return merge(p);
}


// ── Ha Long Bay Spins ────────────────────────────────────────────────────────

const KARST = '#8a8f86';
const JUNGLE = '#3f7a3a';

/** A limestone karst island: a tall steep tower of rock, jungle clinging to its ledges. */
function karst(h, r, x = 0, z = 0, seed = 1) {
  const p = [piece(new CylinderGeometry(r * 0.7, r, h, 7), KARST, turned(x, h / 2, z, seed))];
  p.push(piece(new IcosahedronGeometry(r * 0.75, 0), JUNGLE, S(x, h, z, 1, 0.45, 1)));
  for (let k = 0; k < 3; k += 1) {
    const a = seed * 2.1 + k * 2.2;
    p.push(piece(new IcosahedronGeometry(r * 0.35, 0), JUNGLE, S(x + Math.cos(a) * r * 0.85, h * (0.35 + k * 0.18), z + Math.sin(a) * r * 0.85, 1, 0.6, 1)));
  }
  return p;
}

/** The Fighting Cocks: two limestone islets facing each other across a strip of water. */
function fightingCocks() {
  const p = [];
  for (const [sign, lean] of [[-1, 0.18], [1, -0.18]]) {
    const x = sign * 7;
    p.push(piece(new CylinderGeometry(2.6, 5, 16, 6), KARST, new Matrix4().makeRotationZ(lean).premultiply(M(x, 8, 0))));
    p.push(piece(new IcosahedronGeometry(3.2, 0), KARST, S(x - sign * 2.2, 16.5, 0, 1.4, 1, 1))); // the heads leaning in
    p.push(piece(new IcosahedronGeometry(2, 0), JUNGLE, S(x - sign * 1.5, 18.6, 0, 1.2, 0.5, 1)));
  }
  return merge(p);
}

/** A limestone island in the middle of a spin, with monkeys on its ledges. */
function limestoneIsland() {
  const p = karst(30, 9, 0, 0, 0.7);
  for (const [x, y, z] of [[6.5, 12, 3], [-5, 18, 5.5], [3, 22, -6]]) {
    p.push(piece(new IcosahedronGeometry(0.55, 0), '#6a4a2a', M(x, y, z)), piece(new IcosahedronGeometry(0.35, 0), '#6a4a2a', M(x, y + 0.7, z + 0.2)));
  }
  return merge(p);
}

/** A bay of karst islands out on the water, junk boats with red sails among them. */
function karstBay() {
  const p = [];
  [[0, 0, 40, 12], [40, -30, 55, 15], [-45, -20, 35, 10], [75, 10, 30, 9], [-80, 15, 48, 14], [20, -70, 62, 16]].forEach(([x, z, h, r], k) => p.push(...karst(h, r, x, z, k + 1)));
  for (const [x, z, yaw] of [[18, 25, 0.4], [-25, 30, -0.3], [55, 30, 1.1]]) {
    p.push(piece(new BoxGeometry(3.4, 1.6, 12), '#6a4a2a', turned(x, 0.8, z, yaw)));
    for (const d of [-3, 2]) {
      const sail = turned(x + Math.sin(yaw) * d, 6, z + Math.cos(yaw) * d, yaw, 1, 1, 1);
      p.push(piece(new BoxGeometry(0.2, 8, 5), '#c8342a', sail));
    }
  }
  return merge(p);
}

/** A floating fishing village: wooden houses on rafts, walkways between them, basket boats. */
function floatingVillage() {
  const p = [box(120, 0.3, 70, 0, -0.1, -25, '#3f9a8a')];
  const walls = ['#8a6a48', '#2f6f8a', '#c8a46a', '#4a8a5a'];
  for (let k = 0; k < 8; k += 1) {
    const x = -42 + (k % 4) * 26;
    const z = -10 - Math.floor(k / 4) * 22;
    p.push(box(14, 0.8, 10, x, 0.4, z, '#7a5a3a'));
    p.push(box(9, 4, 7, x, 2.8, z, walls[k % 4]), roof(10, 2.5, 8, x, 4.8, z, '#2f5a6a'));
  }
  p.push(box(90, 0.4, 2, 0, 0.4, -21, '#7a5a3a'));
  for (const [x, z] of [[-20, 6], [12, 4], [35, 10]]) p.push(piece(new SphereGeometry(1.4, 8, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), '#a8885a', M(x, 1, z)));
  return merge(p);
}


// ── Hong Kong Crossing ───────────────────────────────────────────────────────

const GLASS = ['#5a7a9a', '#7a9ab8', '#3f5a7a', '#9ab0c8', '#6a8aa8'];

/** A cluster of glass towers: heights, widths and colours varied, a few with lit crowns. */
function towers(list) {
  const p = [];
  list.forEach(([x, z, w, h], k) => {
    p.push(box(w, h, w, x, h / 2, z, GLASS[k % GLASS.length]));
    if (k % 3 === 0) p.push(box(w * 0.6, h * 0.08, w * 0.6, x, h + h * 0.04, z, '#d8e4f0'));
  });
  return p;
}

/** Victoria Peak: the green peak above the harbour, Hong Kong's skyscrapers at its foot. */
function victoriaPeak() {
  const p = [piece(new ConeGeometry(70, 60, 8), '#4f7a3a', M(0, 20, -90))];
  p.push(box(14, 6, 10, 0, 50, -80, '#d8d4c8')); // the lookout on the peak
  const list = [];
  for (let k = 0; k < 18; k += 1) list.push([-90 + k * 11, -20 + (k % 3) * 9, 7 + (k % 4), 30 + ((k * 37) % 70)]);
  p.push(...towers(list));
  return merge(p);
}

/** The great sea bridge as a backdrop: a long low deck on piers with cable-stayed towers, far out at sea. */
function seaBridge() {
  const p = [box(600, 2, 12, 0, 20, 0, '#c8ccd2')];
  for (let x = -290; x <= 290; x += 40) p.push(box(3, 20, 6, x, 10, 0, '#a8acb2'));
  for (const x of [-150, 0, 150]) {
    p.push(box(4, 70, 4, x, 35, 0, '#e8eaee'));
    for (let k = 1; k <= 5; k += 1) {
      for (const sign of [-1, 1]) {
        const len = Math.hypot(k * 14, 60 - k * 8);
        const a = Math.atan2(60 - k * 8, k * 14);
        p.push(piece(new BoxGeometry(len, 0.3, 0.3), '#f2f2f2', new Matrix4().makeRotationZ(sign * a).premultiply(M(x + sign * k * 7, 20 + (60 - k * 8) / 2, 0))));
      }
    }
  }
  // Cargo ships below.
  for (const [x, z] of [[-80, 60], [110, -50]]) {
    p.push(box(60, 5, 12, x, 2.5, z, '#2f3a52'));
    for (let k = 0; k < 6; k += 1) p.push(box(8, 3, 10, x - 22 + k * 9, 6.5, z, ['#d8442f', '#2f7fc4', '#f2c230', '#4aa35a'][k % 4]));
  }
  return merge(p);
}

/** A small green sea island with a rocky shore and seabirds, in the middle of the island spin. */
function seaIslet() {
  const p = [piece(new IcosahedronGeometry(9, 1), '#7a7a72', S(0, 2, 0, 1, 0.5, 1)), piece(new IcosahedronGeometry(7, 1), '#4f8a3a', S(0, 5.5, 0, 1, 0.55, 1))];
  p.push(box(1.4, 6, 1.4, 2, 9, -1, '#f2efe6'), roof(2, 1.2, 2, 2, 12, -1, '#d8442f')); // a little beacon
  for (let k = 0; k < 5; k += 1) p.push(piece(new ConeGeometry(0.5, 1.6, 3), '#f4f4f2', new Matrix4().makeRotationZ(Math.PI / 2).premultiply(M(Math.cos(k * 1.3) * 6, 14 + k, Math.sin(k * 1.3) * 6))));
  return merge(p);
}

/** Port cranes by the hairpin: tall gantry cranes and stacked containers on the quay. */
function portCranes() {
  const p = [box(70, 1, 30, 0, 0.5, 0, '#8a8a84')];
  for (const x of [-20, 10]) {
    for (const z of [-6, 6]) p.push(box(1.6, 34, 1.6, x, 17, z, '#d8442f'));
    p.push(box(2, 2, 40, x, 34, 8, '#d8442f'));
  }
  for (let k = 0; k < 16; k += 1) p.push(box(6, 2.6, 2.4, -28 + (k % 8) * 7, 2.3 + Math.floor(k / 8) * 2.6, 10, ['#2f7fc4', '#f2c230', '#4aa35a', '#d8442f'][k % 4]));
  return merge(p);
}

/** The Zhuhai waterfront: modern towers behind a palm-lined promenade and the sea. */
function zhuhaiWaterfront() {
  const p = [box(140, 0.3, 40, 0, 0.1, 30, '#3f8fa8'), box(140, 0.5, 8, 0, 0.25, 6, '#d8d0c0')];
  for (let k = 0; k < 10; k += 1) {
    const x = -60 + k * 13;
    p.push(piece(new CylinderGeometry(0.3, 0.45, 8, 6), '#8a6a3a', M(x, 4, 6)), piece(new IcosahedronGeometry(2.4, 0), '#3f7f3a', S(x, 8.6, 6, 1.3, 0.45, 1.3)));
  }
  p.push(...towers([[-50, -20, 12, 60], [-30, -26, 10, 80], [-8, -18, 14, 50], [16, -28, 11, 95], [40, -20, 13, 70], [62, -26, 9, 55]]));
  return merge(p);
}

// ── Redwood Forest Run ───────────────────────────────────────────────────────

const BARK = '#7a3f28';
const BARK_DARK = '#5a2c1c';

/** One giant redwood: a tall tapering trunk, a narrow crown high up. */
function redwood(h, r, x = 0, z = 0) {
  return [
    piece(new CylinderGeometry(r * 0.45, r, h, 8), BARK, M(x, h / 2, z)),
    piece(new ConeGeometry(r * 2.6, h * 0.35, 7), '#2f5a32', M(x, h * 0.86, z)),
    piece(new ConeGeometry(r * 2, h * 0.22, 7), '#3a6a3a', M(x, h * 1.0, z)),
  ];
}

/** A giant ancient drive-through redwood beside the lift hill, its trunk arched open big enough for a car. */
function driveThroughRedwood() {
  const p = [];
  for (const sign of [-1, 1]) p.push(piece(new CylinderGeometry(3, 4.2, 9, 8, 1, false, sign > 0 ? 0 : Math.PI, Math.PI), BARK, M(0, 4.5, 0)));
  p.push(piece(new CylinderGeometry(4.2, 4.2, 4, 8), BARK, M(0, 11, 0)));
  p.push(piece(new CylinderGeometry(2.4, 4.2, 70, 8), BARK, M(0, 48, 0)));
  p.push(piece(new ConeGeometry(10, 26, 7), '#2f5a32', M(0, 74, 0)));
  p.push(box(2, 1.4, 4, 0, 0.9, 0, '#2f6f8a')); // a little car in the arch
  return merge(p);
}

/** A grove of giant redwoods. */
function redwoodGrove() {
  const p = [];
  [[0, 0, 80, 3.6], [22, 14, 70, 3.2], [-18, 20, 90, 4], [40, -12, 65, 3], [-34, -8, 75, 3.4], [10, -30, 85, 3.8]].forEach(([x, z, h, r]) => p.push(...redwood(h, r, x, z)));
  for (let k = 0; k < 10; k += 1) p.push(piece(new IcosahedronGeometry(2.4, 0), '#4f8a3a', S(Math.cos(k) * 30, 1, Math.sin(k) * 30, 1.6, 0.5, 1.6))); // ferns
  return merge(p);
}

/** A giant redwood in the middle of the trunk spin, an elk on the bank below it. */
function giantRedwood() {
  const p = redwood(60, 5.5);
  for (let k = 0; k < 4; k += 1) p.push(box(0.5, 0.3, 1.2, Math.cos(k * 1.7) * 4.8, 6 + k * 3, Math.sin(k * 1.7) * 4.8, '#e8c23a')); // banana slugs on the bark
  // The elk.
  p.push(box(2.6, 1.4, 1, 9, 2.4, 3, '#8a5a3a'), box(0.8, 1.2, 0.7, 10.4, 3.4, 3, '#7a4a2a'));
  for (const x of [8.2, 9.8]) p.push(box(0.25, 1.6, 0.25, x, 0.8, 3, '#6a3f22'));
  for (const sign of [-1, 1]) p.push(piece(new ConeGeometry(0.12, 1.6, 4), '#e8dcc0', new Matrix4().makeRotationX(sign * 0.6).premultiply(M(10.6, 4.6, 3 + sign * 0.5))));
  return merge(p);
}

/** A misty Pacific beach: sand, surf, tall sea stacks out in the water. */
function seaStacksBeach() {
  const p = [box(130, 0.3, 30, 0, 0.1, -15, '#d8cfb8'), box(140, 0.3, 70, 0, -0.1, -60, '#4f7a8a'), box(140, 0.5, 2, 0, 0.3, -30, '#f2f4f4')];
  for (const [x, z, h, r] of [[-30, -60, 30, 7], [10, -75, 42, 9], [45, -55, 24, 6], [-60, -80, 36, 8]]) {
    p.push(piece(new CylinderGeometry(r * 0.7, r, h, 7), '#5a5650', M(x, h / 2, z)), piece(new IcosahedronGeometry(r * 0.7, 0), '#3f6a3a', S(x, h, z, 1, 0.4, 1)));
  }
  return merge(p);
}

export const COASTER_LANDMARKS = {
  'stave-church': { build: staveChurch, radius: 10 },
  'fjord-village': { build: fjordVillage, radius: 30 },
  'cruise-ship': { build: cruiseShip, radius: 48 },
  'waterfall-cliff': { build: waterfallCliff, radius: 36 },
  'ledge-farm': { build: ledgeFarm, radius: 18 },
  'skull-rock': { build: skullRock, radius: 16 },
  'park-midway': { build: parkMidway, radius: 34 },
  'distant-coasters': { build: distantCoasters, radius: 70 },
  graveyard: { build: graveyard, radius: 17 },
  'volcano-rock': { build: volcanoRock, radius: 12, fit: 11 },
  tibidabo: { build: tibidabo, radius: 30 },
  'barceloneta-beach': { build: barcelonetaBeach, radius: 60 },
  'barcelona-city': { build: barcelonaCity, radius: 110 },
  'park-guell-terrace': { build: parkGuellTerrace, radius: 20 },
  'sagrada-familia': { build: sagradaFamilia, radius: 18, fit: 12 },
  inukshuk: { build: inukshuk, radius: 8 },
  'whistler-village': { build: whistlerVillage, radius: 38 },
  'frozen-waterfall': { build: frozenWaterfall, radius: 7, fit: 6.5 },
  sphinx: { build: sphinx, radius: 16 },
  'giza-pyramids': { build: gizaPyramids, radius: 120 },
  'nile-station': { build: nileStation, radius: 60 },
  'fighting-cocks': { build: fightingCocks, radius: 13 },
  'limestone-island': { build: limestoneIsland, radius: 9, fit: 8 },
  'karst-bay': { build: karstBay, radius: 100 },
  'floating-village': { build: floatingVillage, radius: 55 },
  'victoria-peak': { build: victoriaPeak, radius: 70 },
  'sea-bridge': { build: seaBridge, radius: 300 },
  'sea-islet': { build: seaIslet, radius: 9, fit: 8 },
  'port-cranes': { build: portCranes, radius: 36 },
  'zhuhai-waterfront': { build: zhuhaiWaterfront, radius: 60 },
  'drive-through-redwood': { build: driveThroughRedwood, radius: 10 },
  'redwood-grove': { build: redwoodGrove, radius: 40 },
  'giant-redwood': { build: giantRedwood, radius: 11, fit: 7 },
  'sea-stacks-beach': { build: seaStacksBeach, radius: 60 },
};
