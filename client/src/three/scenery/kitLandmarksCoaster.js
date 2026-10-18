/**
 * Landmarks for the Coaster Series: one builder each, origin on the ground,
 * front facing +z, cartoon low-poly from a few simple shapes, merged into the
 * still scenery. Stylised impressions, never detailed reproductions.
 */
import { BoxGeometry, CircleGeometry, ConeGeometry, CylinderGeometry, IcosahedronGeometry, Matrix4, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from 'three';
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
  // (The harbour water from 10 to 32 m in front of the promenade: it stands 70 m past the line, facing back, so the water stops clear of the catch area.)
  const p = [box(140, 0.3, 22, 0, 0.1, 21, '#3f8fa8'), box(140, 0.5, 8, 0, 0.25, 6, '#d8d0c0')];
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

// ── Chiang Mai ───────────────────────────────────────────────────────────────

const GOLD = '#e0b43a';
const GOLD_DARK = '#b8892a';

/** A golden chedi: a stepped base, a bell, rings and a tall spire (all gold), `h` metres tall. */
function chedi(h, x = 0, z = 0, y = 0) {
  const k = h / 20;
  const p = [];
  [[5, 1.2], [4.2, 1.2], [3.4, 1.2]].forEach(([w, t], i) => p.push(box(w * 2 * k, t * k, w * 2 * k, x, y + (i * 1.2 + t / 2) * k, z, i % 2 ? GOLD_DARK : GOLD)));
  p.push(piece(new SphereGeometry(3 * k, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), GOLD, S(x, y + 3.6 * k, z, 1, 1.3, 1)));
  for (let i = 0; i < 4; i += 1) p.push(piece(new CylinderGeometry((1.4 - i * 0.25) * k, (1.5 - i * 0.25) * k, 0.7 * k, 10), i % 2 ? GOLD_DARK : GOLD, M(x, y + (7.6 + i * 0.7) * k, z)));
  p.push(piece(new ConeGeometry(0.75 * k, 8.5 * k, 10), GOLD, M(x, y + (10.4 + 4.25) * k, z)));
  return p;
}

/** A Thai temple hall: white walls, layered red roofs with green edges and golden finials. */
function templeHall(w, d, x, z, yaw = 0) {
  const p = [piece(new BoxGeometry(w, 4, d), '#f2ece0', turned(x, 2, z, yaw))];
  [[w + 2, 3.6, d + 2, 4], [w * 0.8, 3, d * 0.85, 6.2]].forEach(([rw, rh, rd, y], i) => {
    p.push(roof(rw, rh, rd, x, y, z, i ? '#2f7a4a' : '#b8322a', yaw));
  });
  p.push(piece(new ConeGeometry(0.25, 2, 5), GOLD, M(x, 10.2, z)));
  return p;
}

/** Wat Phra That Doi Suthep, a stylised impression: the golden chedi on its white terrace, temple halls, a naga stairway and flower gardens. */
function doiSuthep() {
  const p = [box(30, 2, 30, 0, 1, 0, '#efe8da'), ...chedi(22, 0, 0, 2)];
  for (const [x, z] of [[-11, -11], [11, -11], [-11, 11], [11, 11]]) p.push(...chedi(6, x, z, 2));
  p.push(...templeHall(10, 14, -24, 0), ...templeHall(10, 14, 24, 0));
  // The naga stairway down the front, its balustrades green and gold.
  for (const sx of [-2.6, 2.6]) p.push(piece(new BoxGeometry(0.8, 0.9, 26), sx > 0 ? '#3f8f5a' : GOLD_DARK, new Matrix4().makeRotationX(0.12).premultiply(M(sx, 0.4, 28))));
  p.push(piece(new BoxGeometry(4.4, 0.4, 26), '#e6dccb', new Matrix4().makeRotationX(0.12).premultiply(M(0, 0.1, 28))));
  // Flower gardens round the foot of the terrace.
  const flowers = ['#e45a9a', '#f2c230', '#b04ad0', '#f27a3a'];
  for (let k = 0; k < 24; k += 1) {
    const a = (k / 24) * Math.PI * 2;
    p.push(piece(new IcosahedronGeometry(1.1, 0), flowers[k % 4], S(Math.cos(a) * 21, 0.6, Math.sin(a) * 21, 1.2, 0.6, 1.2)));
  }
  return merge(p);
}

/** Chiang Mai's old city: a red-brick city gate in its wall, the moat before it, a golden temple spire beyond. */
function chiangMaiGate() {
  const BRICK = '#a8482e';
  const p = [];
  for (const sx of [-1, 1]) {
    p.push(box(26, 7, 4, sx * 18, 3.5, 0, BRICK));
    for (let k = 0; k < 6; k += 1) p.push(box(1.6, 1.4, 4.2, sx * (8 + k * 4.4), 7.7, 0, BRICK)); // battlements
    p.push(box(6, 9, 6, sx * 6, 4.5, 0, '#9a3f28')); // the gate's bastions
  }
  p.push(box(64, 0.3, 12, 0, 0.05, 12, '#3f7fa8')); // the moat
  p.push(box(64, 0.6, 1, 0, 0.3, 6, '#7a6a58'), box(64, 0.6, 1, 0, 0.3, 18, '#7a6a58'));
  p.push(...chedi(30, 4, -40), ...templeHall(12, 16, -16, -36));
  for (const [x, z] of [[-28, -20], [30, -18], [22, -30]]) p.push(piece(new CylinderGeometry(0.4, 0.5, 9, 6), '#6a4a2a', M(x, 4.5, z)), piece(new IcosahedronGeometry(4, 0), '#3f7a3a', M(x, 10, z))); // trees
  return merge(p);
}

/** A hilltop temple for the middle of the temple spin: a green hill, a golden chedi on top, sky lanterns floating up round it. */
function lanternChedi() {
  const p = [piece(new IcosahedronGeometry(7, 1), '#5a8a3a', S(0, 0, 0, 1, 0.55, 1)), ...chedi(16, 0, 0, 3.4)];
  for (let k = 0; k < 22; k += 1) {
    const a = k * 2.4;
    const r = 6 + (k % 5) * 3;
    p.push(box(0.6, 0.8, 0.6, Math.cos(a) * r, 18 + (k % 7) * 4 + (k % 3) * 1.3, Math.sin(a) * r, k % 3 ? '#ffb347' : '#ffd27a'));
  }
  return merge(p);
}

// ── Okavango Park ────────────────────────────────────────────────────────────

/** A giant ancient baobab on a dry island: a huge swollen grey trunk, stubby root-like branches, fan palms beside it. */
function baobab() {
  const BARK = '#9a8a78';
  const p = [piece(new IcosahedronGeometry(16, 1), '#c8b07a', S(0, -4, 0, 1.4, 0.4, 1.4))]; // the dry island
  p.push(piece(new CylinderGeometry(6, 8.5, 22, 10), BARK, M(0, 11, 0)));
  for (let k = 0; k < 7; k += 1) {
    const a = (k / 7) * Math.PI * 2;
    const m = new Matrix4().makeRotationZ(0.7).premultiply(new Matrix4().makeRotationY(a)).premultiply(M(Math.cos(a) * 3.5, 23, Math.sin(a) * 3.5));
    p.push(piece(new CylinderGeometry(0.7, 1.3, 9, 6), BARK, m));
    p.push(piece(new IcosahedronGeometry(2.6, 0), '#6f8a3a', M(Math.cos(a) * 8.5, 27.5, Math.sin(a) * 8.5)));
  }
  for (const [x, z] of [[14, 6], [-12, 10], [10, -14]]) {
    p.push(piece(new CylinderGeometry(0.35, 0.45, 8, 6), '#7a6a4a', M(x, 4, z)));
    for (let k = 0; k < 6; k += 1) p.push(piece(new BoxGeometry(0.3, 0.1, 3.2), '#4f8a3a', new Matrix4().makeRotationY(k * 1.05).multiply(new Matrix4().makeTranslation(0, 0, 1.4)).premultiply(M(x, 8.2, z))));
  }
  return merge(p);
}

/** A safari lodge on stilts over the water: thatched roofs, a long deck of spectators behind the station. */
function stiltLodge() {
  const THATCH = '#c8a45a';
  const p = [box(140, 0.3, 90, 0, -0.4, -30, '#4f8aa0')]; // the water
  for (const [x, z, w] of [[-26, -12, 14], [0, -18, 18], [26, -12, 14]]) {
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) p.push(box(0.5, 4, 0.5, x + dx * (w / 2 - 1), 2, z + dz * 5, '#6a4a2a'));
    p.push(box(w, 0.5, 11, x, 4.2, z, '#8a6a48'), box(w - 2, 3.4, 9, x, 6.1, z, '#d8c8a0'));
    p.push(piece(new ConeGeometry(w * 0.72, 6, 4), THATCH, turned(x, 10.8, z, Math.PI / 4, 1, 1, 0.75)));
  }
  p.push(box(80, 0.5, 6, 0, 4.2, 4, '#8a6a48'));
  for (let k = 0; k < 16; k += 1) {
    const x = -36 + k * 4.8;
    const shirt = ['#c43a2f', '#2f5d9a', '#f2c230', '#2f9a4a', '#f2f2ee'][k % 5];
    p.push(box(0.6, 1.2, 0.4, x, 5.05, 5.5, shirt), box(0.4, 0.4, 0.4, x, 5.9, 5.5, '#8a5a3a'));
  }
  return merge(p);
}

/** Mokoros (dugout canoes) along a channel, each with a poler standing at the stern. */
function mokoros() {
  const p = [];
  [[-18, 0, 0.2], [0, 8, -0.3], [20, -4, 0.5]].forEach(([x, z, yaw]) => {
    p.push(piece(new BoxGeometry(1.1, 0.6, 7), '#6a4a2a', turned(x, 0.2, z, yaw)));
    const sx = x + Math.sin(yaw) * -2.8;
    const sz = z + Math.cos(yaw) * -2.8;
    p.push(box(0.5, 1.4, 0.35, sx, 1.2, sz, '#d8c8a0'), box(0.35, 0.35, 0.35, sx, 2.1, sz, '#5a3a22'));
    p.push(piece(new CylinderGeometry(0.05, 0.05, 6, 4), '#8a7a5a', new Matrix4().makeRotationZ(0.35).premultiply(M(sx + 0.6, 2, sz))));
    for (let k = 0; k < 3; k += 1) p.push(piece(new CircleGeometry(0.7, 7), '#4f9a4a', new Matrix4().makeRotationX(-Math.PI / 2).premultiply(M(x + 3 + k * 1.7, 0.05, z + 3 - k)))); // water lilies
  });
  for (let k = 0; k < 14; k += 1) p.push(piece(new CylinderGeometry(0.06, 0.08, 3.5, 4), '#6a8a3a', M(-28 + k * 4.3, 1.7, -9 + (k % 3)))); // papyrus
  return merge(p);
}

/** An elephant herd on an island among wildflowers. */
function elephantHerd() {
  const GREY = '#8a8580';
  const p = [];
  [[0, 0, 1], [7, 3, 0.8], [-6, 4, 1.1], [3, -6, 0.6]].forEach(([x, z, k]) => {
    p.push(piece(new IcosahedronGeometry(1.6 * k, 1), GREY, S(x, 2.6 * k, z, 1.2, 1, 1.7)));
    p.push(piece(new IcosahedronGeometry(0.9 * k, 1), GREY, M(x, 3.2 * k, z + 2.6 * k)));
    for (const [dx, dz] of [[-0.6, -1.2], [0.6, -1.2], [-0.6, 1.2], [0.6, 1.2]]) p.push(piece(new CylinderGeometry(0.35 * k, 0.4 * k, 1.8 * k, 6), GREY, M(x + dx * k, 0.9 * k, z + dz * k)));
  });
  const flowers = ['#f2c230', '#e45a9a', '#f2efe6'];
  for (let k = 0; k < 18; k += 1) p.push(piece(new IcosahedronGeometry(0.5, 0), flowers[k % 3], M(Math.cos(k * 2.1) * 14, 0.3, Math.sin(k * 2.1) * 14)));
  return merge(p);
}

// ── Kopaonik Spins ───────────────────────────────────────────────────────────

const STONE = '#b8b0a2';

/** The botanist's stone mausoleum on the summit, a stylised impression: a square stone tomb on steps, a low pyramid roof, a small cross; rocks and alpine flowers round it. */
function pancicMausoleum() {
  const p = [box(16, 1, 16, 0, 0.5, 0, '#9a9286'), box(12, 1, 12, 0, 1.5, 0, '#a8a094'), box(8, 6, 8, 0, 5, 0, STONE)];
  p.push(roof(9, 3, 9, 0, 8, 0, '#8a8478'));
  p.push(box(0.3, 2, 0.3, 0, 12, 0, '#6a6458'), box(1.2, 0.3, 0.3, 0, 12.4, 0, '#6a6458'));
  p.push(box(2.4, 3.4, 0.3, 0, 3.7, 4.05, '#5a5448'));
  for (let k = 0; k < 10; k += 1) p.push(piece(new IcosahedronGeometry(1.4 + (k % 3) * 0.5, 0), '#8a8478', M(Math.cos(k * 1.9) * 15, 0.6, Math.sin(k * 1.9) * 15)));
  return merge(p);
}

/** A medieval stone monastery: a church with a dome and a bell tower, a wall round it (stylised, no particular one). */
function stoneMonastery() {
  const p = [box(16, 8, 10, 0, 4, 0, '#e2d8c4'), roof(17, 4, 11, 0, 8, 0, '#a8482e')];
  p.push(piece(new CylinderGeometry(3, 3, 3, 10), '#e2d8c4', M(0, 13, 0)), piece(new SphereGeometry(3, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#a8482e', M(0, 14.5, 0)));
  p.push(box(4, 16, 4, 12, 8, 6, '#d8ccb6'), roof(5, 4, 5, 12, 16, 6, '#a8482e'));
  for (const [x, z, w, d] of [[0, -16, 44, 1.2], [0, 16, 44, 1.2], [-22, 0, 1.2, 32], [22, 0, 1.2, 32]]) p.push(box(w, 3, d, x, 1.5, z, '#c8bca6'));
  for (let k = 0; k < 5; k += 1) p.push(box(1, 1, 1, -30 + k * 2, 0.5, 20, k % 2 ? '#f2c230' : '#e8e2d0')); // beehives
  return merge(p);
}

/** A wooden watermill on a stream, its wheel standing in the water, for the middle of a spin. */
function watermill() {
  const p = [box(9, 5, 7, 0, 2.5, 0, '#8a6a42'), roof(10, 4, 8, 0, 5, 0, '#5a4a3a')];
  p.push(piece(new TorusGeometry(2.6, 0.25, 6, 14), '#6a4a2a', new Matrix4().makeRotationY(Math.PI / 2).premultiply(M(5.2, 2.6, 0))));
  for (let k = 0; k < 8; k += 1) p.push(piece(new BoxGeometry(0.2, 0.9, 5.4), '#7a5a3a', new Matrix4().makeRotationX((k / 8) * Math.PI).premultiply(M(5.2, 2.6, 0))));
  p.push(box(3, 0.2, 16, 6, 0.1, 0, '#4f8aa8'));
  return merge(p);
}

/** A shepherd with a flock of sheep on a meadow of wildflowers. */
function sheepFlock() {
  const p = [box(0.6, 1.6, 0.4, 0, 0.8, 0, '#5a4a3a'), box(0.4, 0.4, 0.4, 0, 1.8, 0, '#c8956a'), piece(new CylinderGeometry(0.04, 0.04, 2.2, 4), '#6a4a2a', M(0.5, 1.1, 0))];
  for (let k = 0; k < 12; k += 1) {
    const x = Math.cos(k * 2.3) * (3 + (k % 4) * 2);
    const z = Math.sin(k * 2.3) * (3 + (k % 4) * 2);
    p.push(piece(new IcosahedronGeometry(0.6, 0), '#f2efe6', S(x, 0.7, z, 1.3, 0.9, 1)), box(0.3, 0.35, 0.3, x + 0.7, 0.9, z, '#2a2622'));
  }
  const flowers = ['#f2c230', '#e45a9a', '#8a5ad0', '#f2efe6'];
  for (let k = 0; k < 20; k += 1) p.push(piece(new IcosahedronGeometry(0.35, 0), flowers[k % 4], M(Math.cos(k * 1.7) * 16, 0.2, Math.sin(k * 1.7) * 16)));
  return merge(p);
}

/** A mountain village square: a stone church, wooden houses, dancers in traditional dress in a kolo circle, musicians beside them. */
function koloVillage() {
  const p = [box(40, 0.2, 30, 0, 0.1, 0, '#c8bca6')];
  p.push(box(10, 7, 14, -16, 3.5, -12, '#e8e0cc'), roof(11, 4, 15, -16, 7, -12, '#8a4a2e'), box(3.4, 12, 3.4, -16, 6, -3, '#e8e0cc'), piece(new ConeGeometry(2.4, 4, 4), '#8a4a2e', turned(-16, 14, -3, Math.PI / 4)));
  for (const [x, z] of [[8, -14], [18, -10], [22, 6]]) p.push(box(7, 5, 6, x, 2.5, z, '#8a6a42'), roof(8, 3, 7, x, 5, z, '#5a4a3a'));
  // The kolo: dancers hand in hand in a ring, white shirts with red sashes and dark vests.
  for (let k = 0; k < 14; k += 1) {
    const a = (k / 14) * Math.PI * 2;
    const x = 4 + Math.cos(a) * 5;
    const z = 4 + Math.sin(a) * 5;
    p.push(box(0.55, 1.2, 0.35, x, 0.8, z, k % 2 ? '#f2efe6' : '#2a2a3a'), box(0.6, 0.15, 0.4, x, 1.05, z, '#c43a2f'), box(0.38, 0.38, 0.38, x, 1.65, z, '#d8a47a'));
  }
  for (const x of [12, 13.4]) p.push(box(0.55, 1.4, 0.35, x, 0.9, 10, '#2a2a3a'), box(0.38, 0.38, 0.38, x, 1.8, 10, '#d8a47a'), box(0.8, 0.5, 0.2, x, 1.2, 10.3, '#8a5a32'));
  return merge(p);
}

// ── Nanjing ──────────────────────────────────────────────────────────────────

const BLUE_TILE = '#2f5a8a';

/** The Sun Yat-sen Mausoleum, a stylised impression: a long ceremonial stairway of white stone up the mountainside to a white hall with a blue-tiled roof, forest either side. */
function sunYatSenMausoleum() {
  const p = [];
  for (let k = 0; k < 14; k += 1) p.push(box(12 - k * 0.2, 1.2, 4, 0, 0.6 + k * 1.1, -k * 4, k % 4 === 3 ? '#d8d4c8' : '#ece8de')); // the stairway, landings now and then
  const top = 14 * 1.1;
  p.push(box(24, 2, 14, 0, top + 1, -62, '#ece8de'), box(18, 8, 10, 0, top + 6, -62, '#f2efe6'));
  p.push(roof(22, 4, 14, 0, top + 10, -62, BLUE_TILE), roof(14, 3, 9, 0, top + 13, -62, BLUE_TILE));
  p.push(box(3, 5, 0.3, 0, top + 4.5, -56.9, '#2a2d32'));
  for (let k = 0; k < 16; k += 1) {
    const sx = k % 2 ? 1 : -1;
    const z = -4 - Math.floor(k / 2) * 7;
    p.push(piece(new ConeGeometry(3, 9, 6), '#2f5a32', M(sx * (12 + (k % 3) * 2), 5 + (-z / 4) * 1.1, z)));
  }
  return merge(p);
}

/** A great road-and-rail river bridge, a stylised impression: twin tall towers with red flags at the near end, the long steel span out across the river, barges below. */
function yangtzeBridge() {
  const p = [box(260, 0.3, 120, 0, -0.2, -40, '#6f8a8a')]; // the river
  for (const x of [-10, 10]) {
    p.push(box(6, 40, 6, x, 20, 0, '#d8d4c8'), box(7, 2, 7, x, 41, 0, '#c8c4b8'));
    p.push(box(0.15, 3, 2, x, 43.5, 0, '#c43a2f'));
  }
  p.push(box(14, 2, 4, 0, 30, 0, '#c8c4b8'));
  p.push(box(16, 1.6, 200, 0, 18, -100, '#7a7f88'));
  for (let k = 0; k < 5; k += 1) p.push(box(5, 18, 6, 0, 9, -20 - k * 40, '#a8a49a'));
  for (let k = 0; k < 10; k += 1) p.push(box(0.4, 4, 0.4, -7.5, 21, -k * 20, '#5a5f68'), box(0.4, 4, 0.4, 7.5, 21, -k * 20, '#5a5f68'));
  for (const [x, z] of [[-40, -50], [30, -80], [-20, -110]]) p.push(box(6, 1.4, 22, x, 0.6, z, '#5a4a3a'), box(5, 2, 5, x, 2, z - 8, '#d8d4c8'));
  return merge(p);
}

/** Ramparts of the old city wall beside the gate: grey brick, battlements, a gate tower with a red-pillared hall. */
function zhonghuaGate() {
  const BRICK = '#8f8a80';
  const p = [box(80, 14, 12, 0, 7, 0, BRICK)];
  for (let k = 0; k < 16; k += 1) p.push(box(2.4, 1.8, 12.4, -37.5 + k * 5, 14.9, 0, '#7f7a70'));
  p.push(box(20, 2, 14, 0, 15, 0, '#a8a296'), box(16, 6, 9, 0, 19, 0, '#a8322a'), roof(22, 4, 14, 0, 22, 0, '#3a3d44'));
  for (const x of [-6, -2, 2, 6]) p.push(box(0.8, 6, 0.8, x, 19, 4.8, '#c43a2f'));
  for (const x of [-30, -18, 18, 30]) p.push(box(5, 4, 0.4, x, 6, 6.2, '#6f6a62')); // arched openings (dark)
  return merge(p);
}

/** Xuanwu Lake: water, a little island with a pagoda, lotus leaves, pleasure boats. */
function lakePagodas() {
  const p = [box(120, 0.3, 90, 0, -0.1, 0, '#5a8aa8'), piece(new IcosahedronGeometry(10, 1), '#4f8a3a', S(10, -2, -10, 1, 0.35, 1))];
  for (let k = 0; k < 5; k += 1) p.push(box(6 - k * 0.8, 2.2, 6 - k * 0.8, 10, 2 + k * 3, -10, '#d8c8a8'), roof(8 - k * 0.9, 1.2, 8 - k * 0.9, 10, 3.1 + k * 3, -10, '#3a3d44'));
  for (let k = 0; k < 16; k += 1) p.push(piece(new CircleGeometry(1.2, 8), '#3f8a4a', new Matrix4().makeRotationX(-Math.PI / 2).premultiply(M(-30 + (k % 4) * 4, 0.1, 20 + Math.floor(k / 4) * 3.5))));
  for (const [x, z] of [[-20, -20], [30, 15]]) p.push(box(3, 0.8, 7, x, 0.4, z, '#c43a2f'), box(2.6, 1.6, 3, x, 1.6, z, '#f2c230'));
  return merge(p);
}

/** A grove of golden ginkgo trees on the hillside, leaves on the ground, a small pagoda among them. */
function ginkgoGrove() {
  const p = [];
  for (let k = 0; k < 12; k += 1) {
    const x = Math.cos(k * 2.4) * (8 + (k % 4) * 6);
    const z = Math.sin(k * 2.4) * (8 + (k % 4) * 6);
    p.push(piece(new CylinderGeometry(0.4, 0.6, 9, 6), '#6a5a42', M(x, 4.5, z)), piece(new IcosahedronGeometry(4, 0), k % 3 ? '#f2c230' : '#e8a82a', S(x, 11, z, 1, 1.3, 1)));
    p.push(piece(new CircleGeometry(3, 8), '#e8c03a', new Matrix4().makeRotationX(-Math.PI / 2).premultiply(M(x, 0.05, z))));
  }
  for (let k = 0; k < 4; k += 1) p.push(box(4 - k * 0.7, 2, 4 - k * 0.7, 0, 1 + k * 2.6, 0, '#a8322a'), roof(5.4 - k * 0.8, 1, 5.4 - k * 0.8, 0, 2 + k * 2.6, 0, '#3a3d44'));
  return merge(p);
}

/** The lantern-lit Confucius Temple quarter, for the middle of a spin: a red hall with a dark tiled roof, a canal, strings of red lanterns. */
function confuciusTemple() {
  const p = [box(12, 1, 10, 0, 0.5, 0, '#c8c4b8'), box(9, 5, 7, 0, 3.5, 0, '#a8322a'), roof(12, 3, 9, 0, 6, 0, '#3a3d44'), roof(8, 2, 6, 0, 8.6, 0, '#3a3d44')];
  p.push(box(14, 0.2, 2.4, 0, 0.1, 7, '#4f7a8a'));
  for (let k = 0; k < 12; k += 1) {
    const a = (k / 12) * Math.PI * 2;
    p.push(piece(new IcosahedronGeometry(0.4, 0), '#ff4a3a', S(Math.cos(a) * 6.5, 6 + (k % 2) * 0.6, Math.sin(a) * 6.5, 1, 1.3, 1)));
  }
  return merge(p);
}

// ── Multiball Manor ──────────────────────────────────────────────────────────

/** A gothic manor at midnight (our own design): dark walls, steep roofs, towers, lit windows, a lightning rod. */
function hauntedManor() {
  const WALL = '#2a2236';
  const ROOF = '#141018';
  const LIT = '#ffd27a';
  const p = [box(40, 16, 18, 0, 8, 0, WALL), roof(42, 9, 20, 0, 16, 0, ROOF)];
  for (const x of [-22, 22]) p.push(box(9, 28, 9, x, 14, 0, WALL), piece(new ConeGeometry(6.6, 12, 4), ROOF, turned(x, 34, 0, Math.PI / 4)));
  p.push(box(8, 8, 2, 0, 4, 9.5, '#3a2a1e'));
  for (let k = 0; k < 10; k += 1) p.push(box(2.4, 3.2, 0.3, -15 + (k % 5) * 7.5, 6 + Math.floor(k / 5) * 6.5, 9.1, k % 3 ? LIT : '#5a4a6a'));
  for (const x of [-22, 22]) p.push(box(2.4, 3.2, 0.3, x, 20, 4.6, LIT));
  p.push(box(0.4, 10, 0.4, 22, 45, 0, '#9aa0a8'), box(1.6, 0.4, 0.4, 22, 49, 0, '#9aa0a8')); // the lightning rod
  for (let k = 0; k < 8; k += 1) p.push(piece(new ConeGeometry(1.6, 7, 5), '#1c2420', M(-30 + k * 8.5, 3.5, 18 + (k % 2) * 4))); // dark hedges
  return merge(p);
}

// ── Wizard Mode ──────────────────────────────────────────────────────────────

const CASTLE = '#a8a296';
const CASTLE_DARK = '#7f7a70';

/** A castle under siege (our own design): curtain walls, round towers with banners, a gatehouse, catapults outside. */
function siegeCastle() {
  const p = [];
  for (const [x, z, w, d] of [[0, -20, 44, 3], [0, 20, 44, 3], [-22, 0, 3, 40], [22, 0, 3, 40]]) p.push(box(w, 12, d, x, 6, z, CASTLE));
  for (let k = 0; k < 10; k += 1) p.push(box(2.6, 1.6, 3.4, -18 + (k % 5) * 9, 12.8, k < 5 ? -20 : 20, CASTLE_DARK));
  for (const [x, z] of [[-22, -20], [22, -20], [-22, 20], [22, 20]]) {
    p.push(piece(new CylinderGeometry(4.5, 5, 20, 7), CASTLE, M(x, 10, z)), piece(new ConeGeometry(5.4, 8, 7), '#2f4a8a', M(x, 24, z)));
    p.push(box(0.2, 4, 0.2, x, 30, z, '#5a4a3a'), box(2.4, 1.4, 0.1, x + 1.2, 31, z, '#d8342a'));
  }
  p.push(box(14, 22, 12, 0, 11, 0, CASTLE_DARK), roof(15, 6, 13, 0, 22, 0, '#2f4a8a')); // the keep
  p.push(box(10, 16, 6, 0, 8, 22, CASTLE_DARK), box(5, 7, 0.4, 0, 3.5, 25.2, '#2a1a12')); // the gatehouse
  for (const x of [-34, 34]) { // catapults
    p.push(box(5, 1, 3, x, 1.5, 34, '#6a4a2a'), box(0.5, 0.5, 9, x, 4, 34, '#5a3a22'));
    for (const dx of [-2, 2]) p.push(piece(new CylinderGeometry(1, 1, 0.4, 6), '#3a2a1a', new Matrix4().makeRotationZ(Math.PI / 2).premultiply(M(x + dx, 1, 34))));
  }
  return merge(p);
}

/** The castle keep for the middle of a spiral: a square stone tower, its battlements and a banner. */
function castleKeep() {
  const p = [box(9, 18, 9, 0, 9, 0, CASTLE), roof(10, 5, 10, 0, 18, 0, '#2f4a8a')];
  for (let k = 0; k < 8; k += 1) p.push(box(1.6, 1.4, 1.6, (k % 4 - 1.5) * 2.4, 18.4, k < 4 ? -4.5 : 4.5, CASTLE_DARK));
  p.push(box(0.2, 5, 0.2, 0, 25, 0, '#5a4a3a'), box(2.6, 1.6, 0.1, 1.3, 26.5, 0, '#ffd23f'));
  return merge(p);
}

// ── Flipper Spins ────────────────────────────────────────────────────────────

/** A grand old theatre (our own design): a pale facade with columns, a marquee of bulbs, red curtains in its arches. */
function grandTheatre() {
  const p = [box(44, 22, 14, 0, 11, 0, '#e8dcc4'), box(46, 3, 15, 0, 23.5, 0, '#c8b89a')];
  for (let k = 0; k < 6; k += 1) p.push(piece(new CylinderGeometry(1, 1.1, 16, 10), '#f2ead6', M(-17.5 + k * 7, 8, 7.6)));
  for (let k = 0; k < 5; k += 1) p.push(box(4.4, 9, 0.3, -14 + k * 7, 5.5, 7.2, '#a8122a'));
  p.push(box(30, 4, 1.6, 0, 18, 8.4, '#2a1a12'));
  for (let k = 0; k < 24; k += 1) p.push(box(0.5, 0.5, 0.3, -14.5 + k * 1.26, k % 2 ? 19.6 : 16.4, 9.3, '#ffe9a8')); // the marquee's bulbs
  p.push(piece(new ConeGeometry(16, 6, 4), '#7a5a3a', turned(0, 28, 0, Math.PI / 4, 1.9, 1, 0.6)));
  return merge(p);
}

/** The magician's trunk for the middle of the hairpin: a big studded box, its lid open, gold trim. */
function magicianTrunk() {
  const p = [box(7, 4, 4.5, 0, 2, 0, '#3a1a3a'), box(7.2, 0.4, 4.7, 0, 1, 0, '#e0b43a'), box(7.2, 0.4, 4.7, 0, 3.4, 0, '#e0b43a')];
  p.push(piece(new BoxGeometry(7, 0.5, 4.5), '#3a1a3a', new Matrix4().makeRotationX(-1.1).premultiply(M(0, 5.6, -2.6))));
  for (const x of [-3, 3]) p.push(box(0.5, 4.2, 0.5, x, 2.1, 2.3, '#e0b43a'));
  p.push(box(0.6, 0.6, 0.6, 0, 6.2, 0, '#f2efe6')); // a dove
  return merge(p);
}

/** A giant top hat for the middle of a spiral, a white rabbit peeking out. */
function topHat() {
  const p = [piece(new CylinderGeometry(6, 6, 0.6, 18), '#141418', M(0, 0.3, 0)), piece(new CylinderGeometry(4, 4.2, 9, 18), '#1c1c22', M(0, 5, 0)), piece(new CylinderGeometry(4.25, 4.25, 1.2, 18), '#a8122a', M(0, 1.6, 0))];
  p.push(piece(new IcosahedronGeometry(1.4, 1), '#f4f4f0', M(0, 10, 0)));
  for (const x of [-0.6, 0.6]) p.push(box(0.4, 2, 0.3, x, 12, 0, '#f4f4f0'));
  return merge(p);
}

// ── Slingshot Spins ──────────────────────────────────────────────────────────

/** A big retro flying saucer hovering high beside the track (our own cheerful design): a silver disc, a green dome, a ring of lights, a beam. */
function flyingSaucer() {
  const H = 32;
  const p = [piece(new CylinderGeometry(16, 10, 3.4, 18), '#b8c4cc', M(0, H, 0)), piece(new CylinderGeometry(10, 16, 2, 18), '#9aa6ae', M(0, H + 2.6, 0))];
  p.push(piece(new SphereGeometry(7, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#7dff6a', M(0, H + 3.4, 0)));
  for (let k = 0; k < 12; k += 1) {
    const a = (k / 12) * Math.PI * 2;
    p.push(box(1.2, 0.8, 1.2, Math.cos(a) * 14.6, H + 0.6, Math.sin(a) * 14.6, k % 2 ? '#ff4fd8' : '#ffd23f'));
  }
  return merge(p);
}

/** A small 1950s town under attack: little houses with pastel walls, a water tower, a diner sign. */
function saucerTown() {
  const walls = ['#f2d0a8', '#a8d8f2', '#f2a8c8', '#c8f2a8', '#f2efe6'];
  const p = [];
  for (let k = 0; k < 8; k += 1) {
    const x = -28 + k * 8;
    const z = (k % 2) * 8;
    p.push(box(6, 5, 6, x, 2.5, z, walls[k % 5]), roof(7, 3, 7, x, 5, z, '#7a4a3a'));
  }
  p.push(piece(new CylinderGeometry(3, 3, 5, 10), '#c8ccd2', M(26, 16, -10)));
  for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) p.push(box(0.3, 14, 0.3, 26 + dx, 7, -10 + dz, '#8a8f99'));
  return merge(p);
}

// ── Tilt ─────────────────────────────────────────────────────────────────────

/** A 1970s chrome diner (our own design): a long rounded chrome car, a band of windows, a red stripe and a big neon TILT sign on the roof. */
function retroDiner() {
  const p = [box(40, 9, 13, 0, 4.5, 0, '#d8dce2'), piece(new CylinderGeometry(6.5, 6.5, 40, 16, 1, false, 0, Math.PI), '#c8ccd2', new Matrix4().makeRotationZ(Math.PI / 2).premultiply(M(0, 9, 0)))];
  p.push(box(40.2, 1.2, 13.2, 0, 2.2, 0, '#d8142a'), box(36, 3, 13.4, 0, 6, 0, '#7af2ff'));
  for (let k = 0; k < 9; k += 1) p.push(box(0.4, 3.2, 13.6, -16 + k * 4, 6, 0, '#e8eaee'));
  p.push(box(1, 8, 1, -8, 19, 0, '#3a3d44'), box(1, 8, 1, 8, 19, 0, '#3a3d44'), box(22, 7, 1, 0, 25, 0, '#1a1a24'));
  for (let k = 0; k < 4; k += 1) p.push(box(3.6, 4.6, 1.2, -7.5 + k * 5, 25, 0.2, '#ff4fa8')); // the four neon letters
  p.push(box(16, 0.6, 1.3, 0, 22, 0.1, '#ffd23f'));
  return merge(p);
}

/** A giant soda fountain beside the waterfall: a tall fluted glass of pink soda, a straw and a chrome tap pouring into it. */
function sodaFountain() {
  const p = [piece(new CylinderGeometry(6, 3.5, 16, 14), '#e8f4f8', M(0, 8, 0)), piece(new CylinderGeometry(5.6, 3.6, 12, 14), '#ff8ac0', M(0, 7, 0))];
  p.push(piece(new IcosahedronGeometry(5.5, 1), '#f6f2ea', M(0, 16.5, 0)), piece(new IcosahedronGeometry(1.4, 1), '#d8142a', M(0, 22, 0)));
  p.push(piece(new CylinderGeometry(0.5, 0.5, 14, 8), '#ff4fa8', new Matrix4().makeRotationZ(-0.3).premultiply(M(2.5, 20, 0))));
  p.push(box(2, 20, 2, -9, 10, 0, '#c8ccd2'), box(8, 1.6, 1.6, -5.5, 20.5, 0, '#c8ccd2'), box(1.4, 3, 1.4, -2, 19, 0, '#e8eaee'));
  return merge(p);
}

/** A giant jukebox for the middle of a spiral: a rounded wooden cabinet, a glowing amber arch, chrome trim and coloured bubble tubes. */
function jukeboxTower() {
  const p = [box(9, 11, 6, 0, 5.5, 0, '#7a3a1a'), piece(new CylinderGeometry(4.5, 4.5, 6.2, 16, 1, false, 0, Math.PI), '#ffb83a', new Matrix4().makeRotationX(Math.PI / 2).multiply(new Matrix4().makeRotationY(-Math.PI / 2)).premultiply(M(0, 11, 0)))];
  for (const x of [-4.2, 4.2]) p.push(box(0.6, 12, 6.4, x, 6, 0, '#ff4fa8'));
  p.push(box(6, 3, 6.3, 0, 3, 0, '#e8eaee'), box(5, 2, 6.4, 0, 7.5, 0, '#ffd23f'));
  return merge(p);
}

// ── Replay ───────────────────────────────────────────────────────────────────

/** A giant gumball machine at the top of the table: a red stand, a clear globe full of coloured gumballs, a chrome coin slot. */
function gumballMachine() {
  const p = [piece(new CylinderGeometry(7, 9, 12, 10), '#d8142a', M(0, 6, 0)), box(5, 3, 1, 0, 8, 8.5, '#c8ccd2'), piece(new CylinderGeometry(8, 8, 1.5, 16), '#c8ccd2', M(0, 12.7, 0))];
  p.push(piece(new SphereGeometry(10, 16, 10), '#e8f4f8', M(0, 22, 0)));
  const gums = ['#ff4a4a', '#4a9aff', '#ffd23f', '#5adf6a', '#ff8ac0'];
  for (let k = 0; k < 26; k += 1) {
    const a = k * 2.4;
    const r = 3 + (k % 4) * 1.6;
    p.push(piece(new IcosahedronGeometry(1.5, 0), gums[k % 5], M(Math.cos(a) * r, 16 + (k % 6) * 1.6, Math.sin(a) * r)));
  }
  p.push(piece(new CylinderGeometry(2, 2, 2, 10), '#d8142a', M(0, 33, 0)));
  return merge(p);
}

/** A surreal clocktower for the middle of a spiral: a slim tower with a big clock face on each side, its spire leaning a little. */
function clocktower() {
  const p = [box(7, 22, 7, 0, 11, 0, '#3a2a7a'), box(8, 1, 8, 0, 22.5, 0, '#c89a3a')];
  for (const [x, z, yaw] of [[0, 3.6, 0], [3.6, 0, Math.PI / 2], [0, -3.6, Math.PI], [-3.6, 0, -Math.PI / 2]]) {
    p.push(piece(new CylinderGeometry(3, 3, 0.4, 18), '#f4ecd2', new Matrix4().makeRotationX(Math.PI / 2).premultiply(turned(x, 17, z, yaw))));
    p.push(piece(new BoxGeometry(0.3, 2.4, 0.2), '#1a1a24', turned(x * 1.07, 17.8, z * 1.07, yaw)), piece(new BoxGeometry(1.8, 0.3, 0.2), '#1a1a24', turned(x * 1.07, 17, z * 1.07, yaw)));
  }
  p.push(piece(new ConeGeometry(5, 10, 4), '#2a1a5a', new Matrix4().makeRotationZ(0.12).premultiply(turned(0.6, 28, 0, Math.PI / 4))));
  return merge(p);
}

/** Doors floating in the void beside the track, and stairs to nowhere: three tall doors at odd angles, light spilling from one. */
function floatingDoors() {
  const p = [];
  for (const [x, y, z, yaw, open] of [[-14, 10, 0, 0.3, false], [0, 16, -6, -0.4, true], [14, 8, 4, 0.9, false]]) {
    p.push(piece(new BoxGeometry(5.4, 10.4, 0.6), '#ffcf5a', turned(x, y, z, yaw)));
    p.push(piece(new BoxGeometry(4.6, 9.6, 0.7), open ? '#fff2c4' : '#3a3aa8', turned(x, y, z, yaw)));
  }
  for (let k = 0; k < 7; k += 1) p.push(box(5, 0.8, 2.4, 20 + k * 1.6, 2 + k * 1.6, -10 - k * 2.2, '#c8b8ff')); // stairs to nowhere
  return merge(p);
}

// ── Grand Champion ───────────────────────────────────────────────────────────

/** A stadium rock stage (our own band, no real musicians): a black stage, amplifier stacks either side, a truss and a drum riser. */
function concertStage() {
  const p = [box(46, 3, 18, 0, 1.5, 0, '#0a0a10'), box(14, 2, 7, 0, 4, -4, '#1a1a24')];
  for (const x of [-19, 19]) for (let k = 0; k < 3; k += 1) {
    p.push(box(7, 4.2, 4, x, 5.1 + k * 4.4, -4, '#141418'), box(6, 3.4, 0.2, x, 5.1 + k * 4.4, -1.9, '#2a2a32'));
  }
  for (const x of [-22, 22]) p.push(box(1, 22, 1, x, 11, 6, '#c8ccd2'));
  p.push(box(45, 1.2, 1.2, 0, 22, 6, '#c8ccd2'));
  for (let k = 0; k < 10; k += 1) p.push(box(1.2, 1.2, 1.6, -18 + k * 4, 21, 6.4, k % 2 ? '#ff3fa8' : '#3fd8ff'));
  for (const [x, c] of [[-3, '#c8142a'], [0, '#f2efe6'], [3, '#c8142a']]) p.push(piece(new CylinderGeometry(1.4, 1.4, 1.6, 12), c, M(x, 5.8, -4)));
  return merge(p);
}

/** A giant speaker wall beside the track: a wide stack of black cabinets with grilles and glowing pink cones. */
function speakerWall() {
  const p = [];
  for (let r = 0; r < 4; r += 1) for (let c = 0; c < 6; c += 1) {
    const x = -15 + c * 6;
    const y = 2.4 + r * 4.8;
    p.push(box(5.8, 4.6, 4, x, y, 0, '#141418'), piece(new CylinderGeometry(1.6, 1.6, 0.3, 14), (r + c) % 3 ? '#2a2a32' : '#ff3fa8', new Matrix4().makeRotationX(Math.PI / 2).premultiply(M(x, y, 2.1))));
  }
  return merge(p);
}

/** A lighting rig tower for the middle of a spiral: a square truss tower, a ring of coloured lamps at the top. */
function lightingRig() {
  const p = [];
  for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) p.push(box(0.5, 22, 0.5, x, 11, z, '#c8ccd2'));
  for (let k = 0; k < 7; k += 1) p.push(box(4.6, 0.3, 4.6, 0, 2 + k * 3.2, 0, '#8a8f99'));
  for (let k = 0; k < 8; k += 1) {
    const a = (k / 8) * Math.PI * 2;
    p.push(box(1.4, 1.4, 1.4, Math.cos(a) * 4, 22, Math.sin(a) * 4, ['#ff3fa8', '#3fd8ff', '#ffd23f', '#7dff6a'][k % 4]));
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
  'doi-suthep': { build: doiSuthep, radius: 30 },
  'chiang-mai-gate': { build: chiangMaiGate, radius: 45 },
  'lantern-chedi': { build: lanternChedi, radius: 8, fit: 7.5 },
  baobab: { build: baobab, radius: 22 },
  'stilt-lodge': { build: stiltLodge, radius: 50 },
  mokoros: { build: mokoros, radius: 28 },
  'elephant-herd': { build: elephantHerd, radius: 15 },
  'pancic-mausoleum': { build: pancicMausoleum, radius: 16 },
  'stone-monastery': { build: stoneMonastery, radius: 24 },
  watermill: { build: watermill, radius: 9, fit: 8 },
  'sheep-flock': { build: sheepFlock, radius: 16 },
  'kolo-village': { build: koloVillage, radius: 30 },
  'sun-yat-sen-mausoleum': { build: sunYatSenMausoleum, radius: 30 },
  'yangtze-bridge': { build: yangtzeBridge, radius: 60 },
  'zhonghua-gate': { build: zhonghuaGate, radius: 42 },
  'lake-pagodas': { build: lakePagodas, radius: 60 },
  'ginkgo-grove': { build: ginkgoGrove, radius: 26 },
  'confucius-temple': { build: confuciusTemple, radius: 8, fit: 7.5 },
  'haunted-manor': { build: hauntedManor, radius: 30 },
  'siege-castle': { build: siegeCastle, radius: 40 },
  'castle-keep': { build: castleKeep, radius: 7, fit: 7 },
  'grand-theatre': { build: grandTheatre, radius: 30 },
  'magician-trunk': { build: magicianTrunk, radius: 6, fit: 6 },
  'top-hat': { build: topHat, radius: 7, fit: 7 },
  'flying-saucer': { build: flyingSaucer, radius: 17 },
  'saucer-town': { build: saucerTown, radius: 34 },
  'retro-diner': { build: retroDiner, radius: 24 },
  'soda-fountain': { build: sodaFountain, radius: 12 },
  'jukebox-tower': { build: jukeboxTower, radius: 6, fit: 6 },
  'gumball-machine': { build: gumballMachine, radius: 12 },
  clocktower: { build: clocktower, radius: 6, fit: 6 },
  'floating-doors': { build: floatingDoors, radius: 30 },
  'concert-stage': { build: concertStage, radius: 26 },
  'speaker-wall': { build: speakerWall, radius: 20 },
  'lighting-rig': { build: lightingRig, radius: 6, fit: 6 },
};
