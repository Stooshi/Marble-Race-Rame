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
};
