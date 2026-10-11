/**
 * Landmarks for the Coaster Series: one builder each, origin on the ground,
 * front facing +z, cartoon low-poly from a few simple shapes, merged into the
 * still scenery. Stylised impressions, never detailed reproductions.
 */
import { BoxGeometry, ConeGeometry, CylinderGeometry, IcosahedronGeometry, Matrix4, Quaternion, Vector3 } from 'three';
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

export const COASTER_LANDMARKS = {
  'stave-church': { build: staveChurch, radius: 10 },
  'fjord-village': { build: fjordVillage, radius: 30 },
  'cruise-ship': { build: cruiseShip, radius: 48 },
  'waterfall-cliff': { build: waterfallCliff, radius: 36 },
  'ledge-farm': { build: ledgeFarm, radius: 18 },
};
