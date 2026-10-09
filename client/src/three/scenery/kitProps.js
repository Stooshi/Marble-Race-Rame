/**
 * Building blocks for kit sceneries: set dressing by landscape (trees, rocks,
 * cacti), people standing beside the track, landmarks, and things passing
 * overhead. Cartoon low-poly from a few simple shapes, merged or instanced so
 * each kind costs one draw call.
 */
import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, IcosahedronGeometry, Matrix4, Mesh, Quaternion, SphereGeometry, Vector3 } from 'three';
import { merge, piece } from './parts';
import { local } from '../costumes/animals';

// ── Set dressing: one geometry per kind, instanced ──────────────────────────

export function pine(lite, snowy = false) {
  // (Open-ended: the undersides are never seen, and there are hundreds of these.)
  const parts = [piece(new CylinderGeometry(0.25, 0.35, 2, 5, 1, true), '#6b4a2f', new Matrix4().makeTranslation(0, 1, 0))];
  const tiers = lite ? 2 : 3;
  for (let k = 0; k < tiers; k += 1) {
    const r = 2.4 - k * 0.65;
    parts.push(piece(new ConeGeometry(r, 3.2, lite ? 6 : 7, 1, true), k === tiers - 1 && snowy ? '#f3f7fb' : '#2f6b3f', new Matrix4().makeTranslation(0, 2.6 + k * 2, 0)));
  }
  if (snowy) parts.push(piece(new ConeGeometry(1.1, 1.4, 6, 1, true), '#ffffff', new Matrix4().makeTranslation(0, 3.6 + (tiers - 1) * 2, 0)));
  return merge(parts);
}

export function birch(lite) {
  return merge([
    piece(new CylinderGeometry(0.18, 0.24, 5, 6), '#ece8df', new Matrix4().makeTranslation(0, 2.5, 0)),
    piece(new IcosahedronGeometry(1.8, lite ? 0 : 1), '#d9b44a', new Matrix4().compose(new Vector3(0, 5.6, 0), new Quaternion(), new Vector3(1, 1.4, 1))),
  ]);
}

export function broadleaf(lite) {
  return merge([
    piece(new CylinderGeometry(0.3, 0.45, 3, 6), '#6b4a2f', new Matrix4().makeTranslation(0, 1.5, 0)),
    piece(new IcosahedronGeometry(2.6, lite ? 0 : 1), '#4f8f3a', new Matrix4().makeTranslation(0, 4.4, 0)),
    piece(new IcosahedronGeometry(1.8, 0), '#5ea345', new Matrix4().makeTranslation(1.2, 5.4, 0.6)),
  ]);
}

export function palm(lite) {
  const parts = [];
  for (let k = 0; k < 5; k += 1) parts.push(piece(new CylinderGeometry(0.28 - k * 0.03, 0.3 - k * 0.03, 1.4, 6), '#8a6a45', new Matrix4().makeTranslation(k * 0.12, 0.7 + k * 1.35, 0)));
  const blades = lite ? 5 : 7;
  for (let k = 0; k < blades; k += 1) {
    const a = (k / blades) * Math.PI * 2;
    const leaf = new BoxGeometry(0.7, 0.08, 3.4);
    leaf.translate(0, 0, 1.6);
    leaf.applyMatrix4(new Matrix4().makeRotationX(0.45));
    leaf.applyMatrix4(new Matrix4().makeRotationY(a));
    parts.push(piece(leaf, '#3f8f3a', new Matrix4().makeTranslation(0.6, 7, 0)));
  }
  return merge(parts);
}

export function cactus() {
  return merge([
    piece(new CylinderGeometry(0.4, 0.45, 4, 7), '#4f8a4a', new Matrix4().makeTranslation(0, 2, 0)),
    piece(new CylinderGeometry(0.25, 0.25, 1.6, 6), '#4f8a4a', new Matrix4().compose(new Vector3(0.7, 2.4, 0), new Quaternion(), new Vector3(1, 1, 1))),
    piece(new CylinderGeometry(0.25, 0.25, 1.2, 6), '#4f8a4a', new Matrix4().makeTranslation(-0.65, 2.9, 0)),
  ]);
}

export function rock(lite, colour = '#8b8681') {
  return merge([piece(new IcosahedronGeometry(1.6, lite ? 0 : 1), colour, new Matrix4().compose(new Vector3(0, 0.6, 0), new Quaternion(), new Vector3(1.3, 0.8, 1.1)))]);
}

export function bush(lite, colour = '#4d8a3c') {
  return merge([piece(new IcosahedronGeometry(1, lite ? 0 : 1), colour, new Matrix4().compose(new Vector3(0, 0.6, 0), new Quaternion(), new Vector3(1.3, 0.8, 1.2)))]);
}

export function fern(lite) {
  const parts = [];
  const n = lite ? 4 : 6;
  for (let k = 0; k < n; k += 1) {
    const leaf = new BoxGeometry(0.35, 0.05, 1.8);
    leaf.translate(0, 0, 0.9);
    leaf.applyMatrix4(new Matrix4().makeRotationX(-0.6));
    leaf.applyMatrix4(new Matrix4().makeRotationY((k / n) * Math.PI * 2));
    parts.push(piece(leaf, '#4b9a3a', new Matrix4().makeTranslation(0, 0.1, 0)));
  }
  return merge(parts);
}

/** A rock with snow lying on its top (snow-rimed rocks on an open fell). */
export function snowRock(lite) {
  return merge([
    piece(new IcosahedronGeometry(1.6, lite ? 0 : 1), '#7f7b78', new Matrix4().compose(new Vector3(0, 0.6, 0), new Quaternion(), new Vector3(1.4, 0.85, 1.1))),
    piece(new IcosahedronGeometry(1.25, 0), '#f6f9fc', new Matrix4().compose(new Vector3(0.15, 1.35, 0), new Quaternion(), new Vector3(1.35, 0.35, 1.05))),
  ]);
}

/** A winter birch: white trunk, bare dark twigs, a little snow. */
export function winterBirch(lite) {
  return merge([
    piece(new CylinderGeometry(0.16, 0.24, 6, 6, 1, true), '#eeebe4', new Matrix4().makeTranslation(0, 3, 0)),
    piece(new IcosahedronGeometry(1.7, lite ? 0 : 1), '#5d4a3c', new Matrix4().compose(new Vector3(0, 6.2, 0), new Quaternion(), new Vector3(1, 1.4, 1))),
    piece(new IcosahedronGeometry(1.1, 0), '#f3f7fb', new Matrix4().compose(new Vector3(0.2, 7.3, 0), new Quaternion(), new Vector3(1.2, 0.5, 1.1))),
  ]);
}

/** What grows (or lies about) in each landscape: [geometry builder, share of the spots]. */
export function dressingFor(biome) {
  return {
    alpine: [[(l) => pine(l, true), 0.8], [(l) => rock(l, '#9a9690'), 0.2]],
    arctic: [[(l) => rock(l, '#7d8794'), 0.7], [(l) => rock(l, '#e8eef5'), 0.3]],
    meadow: [[broadleaf, 0.45], [birch, 0.15], [(l) => bush(l), 0.4]],
    desert: [[(l) => rock(l, '#b98154'), 0.55], [() => cactus(), 0.3], [palm, 0.15]],
    jungle: [[broadleaf, 0.4], [palm, 0.25], [fern, 0.35]],
    city: [[broadleaf, 0.5], [(l) => bush(l, '#5f9a48'), 0.5]],
  }[biome] ?? [[broadleaf, 1]];
}

// ── People standing beside the track (small idle movements only) ───────────
// Same builder shape as the costume library: (add, mat, group, point, q) → moving parts.

/** A skier standing on skis, poles planted, turning their head to watch. */
function skier(add, mat, group, point, q) {
  for (const x of [-0.18, 0.18]) add('figSki', new BoxGeometry(0.1, 0.05, 1.9), local(point, q, x, 0.03, 0));
  for (const x of [-0.17, 0.17]) add('figTrousers', new BoxGeometry(0.18, 0.85, 0.2), local(point, q, x, 0.48, 0));
  add('figJacket', new BoxGeometry(0.55, 0.65, 0.3), local(point, q, 0, 1.22, 0));
  for (const x of [-0.42, 0.42]) add('figPole', new CylinderGeometry(0.02, 0.02, 1.25, 4), local(point, q, x, 0.62, 0.25).multiply(new Matrix4().makeRotationX(0.2)));
  const head = new Group();
  head.position.copy(point.clone().add(new Vector3(0, 1.72, 0).applyQuaternion(q)));
  head.quaternion.copy(q);
  head.add(new Mesh(new SphereGeometry(0.17, 10, 8), mat('figHelmet')));
  const goggles = new Mesh(new BoxGeometry(0.26, 0.08, 0.06), mat('figGoggles'));
  goggles.position.set(0, 0, 0.15);
  head.add(goggles);
  group.add(head);
  return [{ part: head, base: q.clone(), axis: new Vector3(0, 1, 0), swing: 0.6, period: 4.3 }];
}

/** A snowboarder, board stood up beside them. */
function snowboarder(add, mat, group, point, q) {
  add('figBoard', new BoxGeometry(0.3, 1.5, 0.06), local(point, q, 0.45, 0.75, 0).multiply(new Matrix4().makeRotationZ(0.12)));
  for (const x of [-0.13, 0.13]) add('figTrousers2', new BoxGeometry(0.2, 0.85, 0.22), local(point, q, x, 0.43, 0));
  add('figJacket2', new BoxGeometry(0.58, 0.65, 0.32), local(point, q, 0, 1.18, 0));
  const head = new Group();
  head.position.copy(point.clone().add(new Vector3(0, 1.68, 0).applyQuaternion(q)));
  head.quaternion.copy(q);
  head.add(new Mesh(new SphereGeometry(0.17, 10, 8), mat('figBeanie')));
  group.add(head);
  return [{ part: head, base: q.clone(), axis: new Vector3(0, 1, 0), swing: 0.5, period: 3.7 }];
}

/** A spectator waving an arm (cheering the marbles past). */
function spectator(add, mat, group, point, q) {
  for (const x of [-0.12, 0.12]) add('figTrousers', new BoxGeometry(0.18, 0.85, 0.2), local(point, q, x, 0.43, 0));
  add('figShirt', new BoxGeometry(0.5, 0.65, 0.28), local(point, q, 0, 1.18, 0));
  add('figSkin', new SphereGeometry(0.16, 8, 6), local(point, q, 0, 1.68, 0));
  const arm = new Group();
  arm.position.copy(point.clone().add(new Vector3(0.3, 1.45, 0).applyQuaternion(q)));
  arm.quaternion.copy(q);
  const limb = new Mesh(new BoxGeometry(0.12, 0.6, 0.12), mat('figShirt'));
  limb.position.set(0, 0.3, 0);
  arm.add(limb);
  group.add(arm);
  return [{ part: arm, base: q.clone(), axis: new Vector3(0, 0, 1), swing: 0.5, period: 0.9 }];
}

export const FIGURE_COLORS = {
  figSki: '#e23b3b', figTrousers: '#2c3e66', figJacket: '#f2a23a', figPole: '#d9dde3', figHelmet: '#ffffff', figGoggles: '#ffb238',
  figBoard: '#7a3fd0', figTrousers2: '#3d3d45', figJacket2: '#2fb3a0', figBeanie: '#e23b3b', figShirt: '#3f7fd8', figSkin: '#e0b48f',
};

export const PEOPLE = { skier, snowboarder, spectator };

// ── Landmarks: one builder each, origin on the ground, front facing +z ─────

function church() {
  return merge([
    piece(new BoxGeometry(8, 6, 14), '#a49c8f', new Matrix4().makeTranslation(0, 3, 0)),
    piece(new ConeGeometry(7.2, 4, 4), '#5a4e44', new Matrix4().compose(new Vector3(0, 8, 0), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 4), new Vector3(0.8, 1, 1.4))),
    piece(new BoxGeometry(4, 13, 4), '#9a9285', new Matrix4().makeTranslation(0, 6.5, 8)),
    piece(new ConeGeometry(3, 6, 4), '#5a4e44', new Matrix4().compose(new Vector3(0, 16, 8), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 4), new Vector3(1, 1, 1))),
    piece(new BoxGeometry(1.4, 2.2, 0.2), '#3b2f27', new Matrix4().makeTranslation(0, 1.1, 10.05)),
  ]);
}

function mountainHut() {
  return merge([
    piece(new BoxGeometry(7, 3.5, 6), '#7a5534', new Matrix4().makeTranslation(0, 1.75, 0)),
    piece(new ConeGeometry(5.6, 2.8, 4), '#f3f7fb', new Matrix4().compose(new Vector3(0, 4.9, 0), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 4), new Vector3(1, 1, 0.9))),
    piece(new BoxGeometry(0.7, 2.2, 0.7), '#6d6a66', new Matrix4().makeTranslation(2, 5.6, -1)),
    piece(new BoxGeometry(1.2, 1, 0.1), '#ffd36b', new Matrix4().makeTranslation(-1.5, 2, 3.05)),
    piece(new BoxGeometry(1.2, 1, 0.1), '#ffd36b', new Matrix4().makeTranslation(1.5, 2, 3.05)),
  ]);
}

function bigRock() {
  return merge([
    piece(new IcosahedronGeometry(7, 1), '#8b8681', new Matrix4().compose(new Vector3(0, 3, 0), new Quaternion(), new Vector3(1.2, 0.8, 1))),
    piece(new IcosahedronGeometry(4, 1), '#7b7671', new Matrix4().compose(new Vector3(5, 2, 3), new Quaternion(), new Vector3(1, 0.7, 1))),
  ]);
}

function lighthouse() {
  return merge([
    piece(new CylinderGeometry(1.6, 2.4, 16, 10), '#f4f2ec', new Matrix4().makeTranslation(0, 8, 0)),
    piece(new CylinderGeometry(1.65, 1.65, 2, 10), '#c42d24', new Matrix4().makeTranslation(0, 5, 0)),
    piece(new CylinderGeometry(1.65, 1.65, 2, 10), '#c42d24', new Matrix4().makeTranslation(0, 11, 0)),
    piece(new CylinderGeometry(1.3, 1.3, 2, 10), '#ffd36b', new Matrix4().makeTranslation(0, 17, 0)),
    piece(new ConeGeometry(1.8, 2, 10), '#2c2f36', new Matrix4().makeTranslation(0, 19, 0)),
  ]);
}

/** Landmarks by name: builder, footprint radius (metres kept clear around it). */
export const LANDMARKS = {
  church: { build: church, radius: 11 },
  'mountain-hut': { build: mountainHut, radius: 6 },
  'big-rock': { build: bigRock, radius: 9 },
  lighthouse: { build: lighthouse, radius: 4 },
};

// ── Things passing overhead (scenery only, high above the track) ───────────

/** A gondola or cable car cabin. */
export function cabin(kind) {
  if (kind === 'chairlift') {
    return merge([
      piece(new BoxGeometry(1.6, 0.12, 0.6), '#2c2f36', new Matrix4().makeTranslation(0, -2.2, 0)),
      piece(new BoxGeometry(1.6, 0.7, 0.1), '#2c2f36', new Matrix4().makeTranslation(0, -1.85, -0.3)),
      piece(new CylinderGeometry(0.04, 0.04, 2.2, 4), '#9aa1aa', new Matrix4().makeTranslation(0, -1.1, 0)),
    ]);
  }
  const red = kind === 'cable-car' ? '#c42d24' : '#d9483b';
  return merge([
    piece(new BoxGeometry(2.4, 2.2, 2.4), red, new Matrix4().makeTranslation(0, -2.6, 0)),
    piece(new BoxGeometry(2.45, 0.8, 2.45), '#2b3440', new Matrix4().makeTranslation(0, -2.2, 0)),
    piece(new CylinderGeometry(0.06, 0.06, 1.4, 4), '#9aa1aa', new Matrix4().makeTranslation(0, -0.8, 0)),
  ]);
}

export function liftTower() {
  return merge([
    piece(new BoxGeometry(0.8, 18, 0.8), '#9aa1aa', new Matrix4().makeTranslation(0, 9, 0)),
    piece(new BoxGeometry(4, 0.5, 0.6), '#9aa1aa', new Matrix4().makeTranslation(0, 18, 0)),
  ]);
}
