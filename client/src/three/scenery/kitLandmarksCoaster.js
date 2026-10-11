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
};
