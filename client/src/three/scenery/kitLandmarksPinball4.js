/**
 * The last Pinball tables of 27 Nov 2026 (Moses: the Pinball pack towards 20): one signature landmark of its own per
 * table, original shapes and colours, beside the gate. Low-faceted on purpose (the phones' triangle budget).
 * Looks only: landmarks never touch a marble.
 *   hoard-dragon       Dragon's Lair: a dragon of our own curled on a rock over its hoard of gold, wings half open
 *   viking-longship    Viking Raid: a longship with a striped sail, a row of shields and a carved prow, on a wave
 *   safari-lookout     Safari Stampede: a flat-topped acacia, a stilted lookout tower and a safari tent
 *   giant-cupcake      Sugar Rush: a giant cupcake with a cherry on top, lollipops and a candy-striped pole
 *   desert-pyramid     Pharaoh's Tomb: a pyramid with its golden cap, a lion-bodied guardian, an obelisk and palms
 */
import { BoxGeometry, ConeGeometry, CylinderGeometry, IcosahedronGeometry, Matrix4, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import { box, merge, piece } from './parts';

const M = (x, y, z) => new Matrix4().makeTranslation(x, y, z);
const R = (x, y, z, rx, ry, rz, sx = 1, sy = 1, sz = 1) => new Matrix4().compose(
  new Vector3(x, y, z), new Quaternion().setFromEuler({ x: rx, y: ry, z: rz, order: 'XYZ', isEuler: true }), new Vector3(sx, sy, sz),
);

function hoardDragon() {
  const SCALE = '#2f7a4a';
  const BELLY = '#c8b25a';
  const p = [];
  p.push(piece(new IcosahedronGeometry(9, 0), '#5a5560', R(0, 3, 0, 0, 0.4, 0, 1.4, 0.6, 1))); // the rock
  for (const [x, z, r] of [[-8, 9, 2.2], [-4, 11, 1.8], [2, 10, 2.4], [7, 8, 1.6], [-1, 12, 1.4]]) p.push(piece(new IcosahedronGeometry(r, 0), '#ffc21a', M(x, r * 0.6, z))); // the hoard
  // The body: a curl of segments round the rock's top, the tail hanging down its side.
  for (let k = 0; k <= 12; k += 1) {
    const a = (k / 12) * Math.PI * 1.5 - 0.4;
    const r = 1.8 + Math.sin((k / 12) * Math.PI) * 0.9;
    p.push(piece(new IcosahedronGeometry(r, 0), k % 3 ? SCALE : BELLY, M(Math.cos(a) * 6, 8 + Math.sin(k * 0.5) * 0.6, Math.sin(a) * 5)));
  }
  for (let k = 0; k < 5; k += 1) p.push(piece(new IcosahedronGeometry(1.2 - k * 0.18, 0), SCALE, M(-6.5 - k * 0.6, 6 - k * 1.3, -2 - k * 0.4)));
  // The neck and head rising, the jaw open, horns back.
  p.push(piece(new CylinderGeometry(1.3, 1.8, 7, 7), SCALE, R(5.5, 12, -2, 0.3, 0, -0.35)));
  p.push(box(4.2, 2.2, 2.6, 8, 15.6, -3, SCALE));
  p.push(box(3.6, 0.7, 2.2, 8.6, 14.1, -3, BELLY)); // the jaw
  for (const z of [-3.9, -2.1]) p.push(piece(new ConeGeometry(0.4, 2.4, 5), '#ece2c6', R(6.4, 17.4, z, 0, 0, 0.8)));
  p.push(piece(new ConeGeometry(0.9, 3, 6), '#ff7a1a', R(11.2, 14.8, -3, 0, 0, -Math.PI / 2))); // a lick of flame
  // The wings: two broad fans of thin panels.
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k += 1) p.push(piece(new BoxGeometry(0.25, 7 - k, 4.5), k % 2 ? '#3f9a5c' : SCALE, R(-1, 14 + k * 0.4, s * (4 + k * 2.2), s * (0.5 + k * 0.25), 0, 0)));
  }
  return merge(p);
}

function vikingLongship() {
  const p = [];
  // The wave under it and the hull, long and low, both ends rising.
  p.push(piece(new CylinderGeometry(15, 17, 1.6, 12), '#2a6f9a', R(0, 0.8, 0, 0, 0, 0, 1.4, 1, 0.5)));
  p.push(box(26, 2.6, 5.4, 0, 2.6, 0, '#7a4a2a'));
  p.push(box(22, 1, 5.8, 0, 3.6, 0, '#5a3418'));
  for (const s of [-1, 1]) {
    p.push(piece(new BoxGeometry(1.2, 7, 1.2), '#7a4a2a', R(s * 13.4, 5.4, 0, 0, 0, s * -0.35)));
    p.push(piece(new TorusGeometry(1.2, 0.35, 5, 8, Math.PI * 1.4), '#7a4a2a', R(s * 15, 9, 0, Math.PI / 2, 0, s > 0 ? 0 : Math.PI))); // the carved scroll
  }
  // A row of round shields along each side.
  for (let k = 0; k < 7; k += 1) {
    for (const z of [-2.9, 2.9]) p.push(piece(new CylinderGeometry(1, 1, 0.3, 8), k % 2 ? '#d8242a' : '#ffd23f', R(-9 + k * 3, 3.6, z, Math.PI / 2, 0, 0)));
  }
  p.push(piece(new CylinderGeometry(0.35, 0.45, 16, 6), '#5a3418', M(0, 11, 0))); // the mast
  for (let k = 0; k < 5; k += 1) p.push(box(0.3, 2, 11, 0, 9 + k * 2, 0, k % 2 ? '#f2ead8' : '#d8242a')); // the striped sail
  for (const s of [-1, 1]) p.push(piece(new BoxGeometry(0.3, 0.4, 10), '#5a3418', R(-4 + s * 6, 3, s * 4.5, 0, s * 0.5, 0.3))); // oars out
  return merge(p);
}

function safariLookout() {
  const p = [];
  // A flat-topped acacia.
  p.push(piece(new CylinderGeometry(0.7, 1.1, 12, 6), '#6a4a2a', R(-10, 6, 2, 0, 0, 0.12)));
  p.push(piece(new CylinderGeometry(0.4, 0.5, 6, 5), '#6a4a2a', R(-8, 12, 2, 0, 0, -0.6)));
  p.push(piece(new CylinderGeometry(9, 7, 2.2, 9), '#5a8a2a', M(-9, 14, 2)));
  p.push(piece(new CylinderGeometry(6, 5, 1.6, 9), '#6a9a32', M(-6, 15.6, 3)));
  // The lookout on stilts, its thatched roof.
  for (const [x, z] of [[5, -3], [11, -3], [5, 3], [11, 3]]) p.push(box(0.5, 9, 0.5, x, 4.5, z, '#7a5a32'));
  p.push(box(7.6, 0.6, 7.6, 8, 9, 0, '#8a6a3a'));
  p.push(box(7.6, 1.6, 0.3, 8, 10, 3.7, '#8a6a3a'));
  p.push(piece(new ConeGeometry(6, 4, 4), '#d8b45a', R(8, 13, 0, 0, Math.PI / 4, 0)));
  for (let k = 0; k < 6; k += 1) p.push(piece(new BoxGeometry(2.4, 0.2, 0.4), '#7a5a32', R(3, 1 + k * 1.4, 4.5, 0, 0, 0.5))); // its ladder
  // The safari tent and a camp fire.
  p.push(piece(new ConeGeometry(4, 4, 4), '#c8b07a', R(0, 2, 10, 0, Math.PI / 4, 0, 1.4, 1, 1)));
  p.push(piece(new ConeGeometry(0.8, 1.6, 5), '#ff7a1a', M(6, 0.8, 10)));
  return merge(p);
}

function giantCupcake() {
  const p = [];
  // The wrapper, ribbed, and the icing in three swirls, a cherry on top.
  for (let k = 0; k < 12; k += 1) {
    const a = (k / 12) * Math.PI * 2;
    p.push(piece(new BoxGeometry(2.4, 7, 0.6), k % 2 ? '#ff7ab4' : '#ffb0d4', R(Math.cos(a) * 6.4, 3.5, Math.sin(a) * 6.4, 0, -a + Math.PI / 2, 0.12 * 0)));
  }
  p.push(piece(new CylinderGeometry(7, 6.2, 7, 12), '#a86a3a', M(0, 3.5, 0)));
  p.push(piece(new SphereGeometry(8, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#fff0f6', M(0, 7, 0)));
  p.push(piece(new TorusGeometry(5, 1.6, 6, 12), '#ffd6ea', R(0, 11.5, 0, Math.PI / 2, 0, 0)));
  p.push(piece(new ConeGeometry(3.6, 5, 10), '#fff0f6', M(0, 15, 0)));
  p.push(piece(new SphereGeometry(1.6, 10, 8), '#d8242a', M(0, 18.6, 0)));
  for (const [x, z, c] of [[-3, 3, '#5affd2'], [3, -2, '#ffd23f'], [2, 4, '#7a5aff'], [-4, -3, '#ff7a1a']]) p.push(box(0.4, 0.4, 1.2, x, 9 + Math.abs(x) * 0.3, z, c)); // sprinkles
  // Lollipops and a candy-striped pole beside it.
  for (const [x, z, c] of [[-13, 4, '#ff5a8a'], [12, 6, '#5ab4ff'], [-11, -6, '#ffd23f']]) {
    p.push(piece(new CylinderGeometry(0.25, 0.25, 9, 5), '#f2f2f2', M(x, 4.5, z)));
    p.push(piece(new CylinderGeometry(2.6, 2.6, 0.6, 12), c, R(x, 10, z, Math.PI / 2, 0, 0)));
  }
  for (let k = 0; k < 7; k += 1) p.push(piece(new CylinderGeometry(0.7, 0.7, 2, 8), k % 2 ? '#d8242a' : '#ffffff', M(13, 1 + k * 2, -5)));
  return merge(p);
}

function desertPyramid() {
  const SAND = '#d8b36a';
  const p = [];
  p.push(piece(new ConeGeometry(17, 18, 4), SAND, R(0, 9, -4, 0, Math.PI / 4, 0)));
  p.push(piece(new ConeGeometry(2.4, 2.6, 4), '#ffd23f', R(0, 17.2, -4, 0, Math.PI / 4, 0))); // its golden cap
  p.push(box(4, 5, 1, 0, 2.5, 8.1, '#3a2a1a')); // the tomb's door
  // The guardian: a lion's body lying down, its head with a striped headdress.
  p.push(box(4, 3, 10, 13, 1.5, 6, '#c8a45a'));
  for (const z of [0.8, 11.2]) p.push(box(1.2, 1.2, 3, 13 + (z > 5 ? 0 : 0), 0.6, z, '#c8a45a')); // paws
  p.push(box(3, 3.4, 2.8, 13, 4.6, 11, '#c8a45a'));
  for (let k = 0; k < 4; k += 1) p.push(box(3.4, 0.4, 3, 13, 3.4 + k * 0.8, 10.6, k % 2 ? '#2a5aa8' : '#ffd23f'));
  // An obelisk and palms.
  p.push(piece(new BoxGeometry(1.6, 14, 1.6), '#c89a5a', M(-13, 7, 8)));
  p.push(piece(new ConeGeometry(1.2, 2, 4), '#ffd23f', R(-13, 15, 8, 0, Math.PI / 4, 0)));
  for (const [x, z] of [[-16, -2], [16, -6]]) {
    p.push(piece(new CylinderGeometry(0.4, 0.6, 9, 5), '#7a5a32', M(x, 4.5, z)));
    for (let k = 0; k < 5; k += 1) p.push(piece(new ConeGeometry(0.9, 5, 4), '#3a8a3a', R(x, 9, z, Math.PI / 2.3, (k / 5) * Math.PI * 2, 0)));
  }
  return merge(p);
}

export const PINBALL4_LANDMARKS = {
  'desert-pyramid': { build: desertPyramid, radius: 18 },
  'hoard-dragon': { build: hoardDragon, radius: 16 },
  'viking-longship': { build: vikingLongship, radius: 18 },
  'safari-lookout': { build: safariLookout, radius: 18 },
  'giant-cupcake': { build: giantCupcake, radius: 15 },
};
