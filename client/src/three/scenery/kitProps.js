/**
 * Building blocks for kit sceneries: set dressing by landscape (trees, rocks,
 * cacti), people standing beside the track, landmarks, and things passing
 * overhead. Cartoon low-poly from a few simple shapes, merged or instanced so
 * each kind costs one draw call.
 */
import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, IcosahedronGeometry, Matrix4, Mesh, Quaternion, SphereGeometry, Vector3 } from 'three';
import { merge, piece } from './parts';
import { local } from '../costumes/animals';
import { WORLD_LANDMARKS } from './kitLandmarks';

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

/** A city plane tree: a pale trunk and one round crown (the plainest tree, for streets lined with them). */
export function planeTree() {
  return merge([
    piece(new CylinderGeometry(0.25, 0.35, 3.4, 5, 1, true), '#a39a86', new Matrix4().makeTranslation(0, 1.7, 0)),
    piece(new IcosahedronGeometry(2.6, 0), '#4f8f3a', new Matrix4().compose(new Vector3(0, 4.8, 0), new Quaternion(), new Vector3(1, 0.9, 1))),
  ]);
}

/** A rainforest tree: a dark trunk and one big crown (the plainest tree, for hundreds of them). */
export function jungleTree() {
  return merge([
    piece(new CylinderGeometry(0.3, 0.45, 5, 5, 1, true), '#5a4a38', new Matrix4().makeTranslation(0, 2.5, 0)),
    piece(new IcosahedronGeometry(3, 0), '#2f6e2c', new Matrix4().compose(new Vector3(0, 6.5, 0), new Quaternion(), new Vector3(1, 0.75, 1))),
  ]);
}

/** A fern, three fronds (plain). */
export function jungleFern() {
  const parts = [];
  for (let k = 0; k < 3; k += 1) {
    const leaf = new BoxGeometry(0.4, 0.05, 1.9);
    leaf.translate(0, 0, 0.9);
    leaf.applyMatrix4(new Matrix4().makeRotationX(-0.6));
    leaf.applyMatrix4(new Matrix4().makeRotationY((k / 3) * Math.PI * 2));
    parts.push(piece(leaf, '#4b9a3a', new Matrix4().makeTranslation(0, 0.1, 0)));
  }
  return merge(parts);
}

/** A palm, plain: one trunk, five fronds. */
export function junglepalm() {
  const parts = [piece(new CylinderGeometry(0.2, 0.3, 7, 5, 1, true), '#8a6a45', new Matrix4().makeTranslation(0, 3.5, 0))];
  for (let k = 0; k < 5; k += 1) {
    const leaf = new BoxGeometry(0.7, 0.08, 3.4);
    leaf.translate(0, 0, 1.6);
    leaf.applyMatrix4(new Matrix4().makeRotationX(0.45));
    leaf.applyMatrix4(new Matrix4().makeRotationY((k / 5) * Math.PI * 2));
    parts.push(piece(leaf, '#3f8f3a', new Matrix4().makeTranslation(0, 7, 0)));
  }
  return merge(parts);
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

/** A winter aspen: tall, slim and white-barked, its bare crown a grey haze of twigs (Park City's groves). */
export function aspen(lite) {
  return merge([
    piece(new CylinderGeometry(0.13, 0.2, 8, 6, 1, true), '#f1eee6', new Matrix4().makeTranslation(0, 4, 0)),
    piece(new IcosahedronGeometry(1.4, lite ? 0 : 1), '#8d8478', new Matrix4().compose(new Vector3(0, 8.2, 0), new Quaternion(), new Vector3(1, 1.8, 1))),
    piece(new BoxGeometry(0.3, 0.12, 0.3), '#2c2a28', new Matrix4().makeTranslation(0, 2.6, 0.15)), // the dark scars on the bark
  ]);
}

/** What grows (or lies about) in each landscape: [geometry builder, share of the spots]. */
export function dressingFor(biome) {
  return {
    alpine: [[(l) => pine(l, true), 0.8], [(l) => rock(l, '#9a9690'), 0.2]],
    // (Arctic ground is all rocks, hundreds of them: always the plainest rock, so the triangles stay in budget.)
    arctic: [[() => rock(true, '#7d8794'), 0.7], [() => rock(true, '#e8eef5'), 0.3]],
    meadow: [[broadleaf, 0.45], [birch, 0.15], [(l) => bush(l), 0.4]],
    // (Arabian desert: sandstone rocks, desert shrubs and a few date palms; plain, as there are hundreds.)
    desert: [[() => rock(true, '#c98a5a'), 0.5], [() => bush(true, '#9a8a4a'), 0.35], [() => palm(true), 0.15]],
    // (Rainforest: hundreds of trees; the plainest kinds, to stay in budget.)
    jungle: [[jungleTree, 0.5], [jungleFern, 0.3], [junglepalm, 0.2]],
    // (City parks: hundreds of trees beside streets of buildings; always the plainest, to stay in budget.)
    city: [[planeTree, 0.5], [() => bush(true, '#5f9a48'), 0.5]],
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

/** A street painter at an easel, brush arm moving (Montmartre). */
function painter(add, mat, group, point, q) {
  for (const x of [-0.12, 0.12]) add('figTrousers', new BoxGeometry(0.18, 0.85, 0.2), local(point, q, x, 0.43, 0));
  add('figSmock', new BoxGeometry(0.52, 0.66, 0.3), local(point, q, 0, 1.18, 0));
  add('figSkin', new SphereGeometry(0.16, 8, 6), local(point, q, 0, 1.68, 0));
  add('figBeret', new CylinderGeometry(0.17, 0.17, 0.06, 10), local(point, q, 0.02, 1.83, 0));
  // The easel in front of them, its canvas towards the track.
  for (const x of [-0.3, 0.3]) add('figEasel', new BoxGeometry(0.04, 1.6, 0.04), local(point, q, x * 0.6, 0.8, 0.75).multiply(new Matrix4().makeRotationZ(-x * 0.2)));
  add('figEasel', new BoxGeometry(0.04, 1.6, 0.04), local(point, q, 0, 0.78, 0.95).multiply(new Matrix4().makeRotationX(0.3)));
  add('figCanvas', new BoxGeometry(0.7, 0.55, 0.04), local(point, q, 0, 1.25, 0.72));
  const arm = new Group();
  arm.position.copy(point.clone().add(new Vector3(0.28, 1.45, 0.05).applyQuaternion(q)));
  arm.quaternion.copy(q);
  const limb = new Mesh(new BoxGeometry(0.1, 0.1, 0.55), mat('figSmock'));
  limb.position.set(0, -0.05, 0.27);
  arm.add(limb);
  group.add(arm);
  return [{ part: arm, base: q.clone(), axis: new Vector3(0, 1, 0), swing: 0.25, period: 1.6 }];
}

export const FIGURE_COLORS = {
  figSki: '#e23b3b', figTrousers: '#2c3e66', figJacket: '#f2a23a', figPole: '#d9dde3', figHelmet: '#ffffff', figGoggles: '#ffb238',
  figBoard: '#7a3fd0', figTrousers2: '#3d3d45', figJacket2: '#2fb3a0', figBeanie: '#e23b3b', figShirt: '#3f7fd8', figSkin: '#e0b48f',
  figSmock: '#4a6fa5', figBeret: '#1f2024', figEasel: '#8a6a45', figCanvas: '#f4f0e6',
};

export const PEOPLE = { skier, snowboarder, spectator, painter };

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

const M = (x, y, z) => new Matrix4().makeTranslation(x, y, z);
const Y = new Vector3(0, 1, 0);
const turned = (x, y, z, yaw, sx = 1, sy = 1, sz = 1) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(Y, yaw), new Vector3(sx, sy, sz));
const roof4 = (r, h, c, x, y, z, sx = 1, sz = 1) => piece(new ConeGeometry(r, h, 4), c, turned(x, y, z, Math.PI / 4, sx, 1, sz));

/** A horse-drawn sleigh waiting by the piste: a brown horse, a red sleigh with blankets (Avoriaz). */
function horseSleigh() {
  const parts = [
    piece(new BoxGeometry(0.8, 0.9, 2), '#6b4428', M(0, 1.5, 2.2)),                     // horse's body
    piece(new BoxGeometry(0.4, 0.9, 0.5), '#6b4428', turned(0, 2.2, 3.25, 0).multiply(new Matrix4().makeRotationX(0.5))), // neck
    piece(new BoxGeometry(0.35, 0.4, 0.8), '#5a3820', M(0, 2.6, 3.6)),                   // head
    piece(new BoxGeometry(0.15, 0.6, 0.6), '#2a1d14', M(0, 2.45, 3.1)),                  // mane
    piece(new BoxGeometry(2.0, 0.9, 3.2), '#b5251d', M(0, 0.85, -0.6)),                  // the sleigh
    piece(new BoxGeometry(2.05, 0.5, 0.8), '#b5251d', M(0, 1.5, -1.9)),                  // its high back seat
    piece(new BoxGeometry(1.7, 0.2, 1.6), '#3e5f8a', M(0, 1.38, -0.7)),                  // a blanket
  ];
  for (const [x, z] of [[-0.28, 1.5], [0.28, 1.5], [-0.28, 2.9], [0.28, 2.9]]) parts.push(piece(new BoxGeometry(0.18, 1.1, 0.18), '#5a3820', M(x, 0.55, z)));
  for (const x of [-0.85, 0.85]) {
    parts.push(piece(new BoxGeometry(0.1, 0.1, 3.8), '#d8a93a', M(x, 0.25, -0.4)));       // runners
    parts.push(piece(new BoxGeometry(0.08, 0.08, 2.4), '#3a2a1e', M(x * 0.6, 1.3, 1.6))); // shafts to the horse
  }
  return merge(parts);
}

/** A little border post: a hut, a red-and-white barrier, and the French and Swiss flags flying side by side. */
function borderPost() {
  const parts = [
    piece(new BoxGeometry(3, 2.6, 2.4), '#e9e2d0', M(0, 1.3, 0)),
    roof4(2.5, 1.2, '#f4f7fb', 0, 3.2, 0, 1.1, 0.9),
    piece(new BoxGeometry(1.2, 0.8, 0.08), '#2d3e52', M(0.5, 1.6, 1.22)),               // window
    piece(new BoxGeometry(0.4, 1.0, 0.4), '#3a3d42', M(-2, 0.5, 1.8)),                   // the barrier's post
  ];
  for (let k = 0; k < 4; k += 1) parts.push(piece(new BoxGeometry(0.8, 0.12, 0.12), k % 2 ? '#ffffff' : '#d0242a', M(-2.6 - k * 0.8, 1.05, 1.8))); // the barrier, along the piste
  // Two flagpoles, the French flag (blue, white, red) and the Swiss (red, a white cross).
  for (const x of [1.9, 3.1]) parts.push(piece(new CylinderGeometry(0.05, 0.06, 6, 5), '#d9dde3', M(x, 3, -0.8)));
  ['#2a4fa0', '#ffffff', '#d0242a'].forEach((c, k) => parts.push(piece(new BoxGeometry(0.03, 0.9, 0.45), c, M(1.9, 5.4, -0.8 - 0.25 - k * 0.45))));
  parts.push(piece(new BoxGeometry(0.03, 1.1, 1.1), '#d0242a', M(3.1, 5.3, -0.8 - 0.6)));
  parts.push(piece(new BoxGeometry(0.05, 0.7, 0.22), '#ffffff', M(3.1, 5.3, -0.8 - 0.6)));
  parts.push(piece(new BoxGeometry(0.05, 0.22, 0.7), '#ffffff', M(3.1, 5.3, -0.8 - 0.6)));
  return merge(parts);
}

/** A mountain restaurant with a sun terrace: deckchairs in a row, tables with fondue pots, parasols. */
function mountainRestaurant() {
  const parts = [
    piece(new BoxGeometry(9, 2.2, 6), '#e6dccb', M(0, 1.1, -1.5)),                      // stone ground floor
    piece(new BoxGeometry(9, 2, 6), '#8a5a34', M(0, 3.2, -1.5)),                         // wooden upper floor
    roof4(7, 2.6, '#f4f7fb', 0, 5.5, -1.5, 1.05, 0.75),                                   // snow on the roof
    piece(new BoxGeometry(10, 0.3, 4), '#9a6a40', M(0, 0.15, 3)),                         // the terrace
  ];
  for (const x of [-3, 0, 3]) parts.push(piece(new BoxGeometry(1.4, 1, 0.1), '#2d3e52', M(x, 3.3, 1.55)));
  for (let k = 0; k < 6; k += 1) {
    const x = -4 + k * 1.6;
    parts.push(piece(new BoxGeometry(0.6, 0.08, 1.4), ['#e23b3b', '#2f6fd0', '#f2a23a'][k % 3], turned(x, 0.65, 4.2, 0).multiply(new Matrix4().makeRotationX(-0.45)))); // deckchairs
    parts.push(piece(new BoxGeometry(0.6, 0.35, 0.06), '#7a5534', M(x, 0.45, 4.7)));
  }
  for (const x of [-3, 1.5]) {
    parts.push(piece(new CylinderGeometry(0.7, 0.7, 0.08, 10), '#7a5534', M(x, 1.05, 2.2)));   // table
    parts.push(piece(new CylinderGeometry(0.08, 0.08, 0.9, 5), '#3a2a1e', M(x, 0.6, 2.2)));
    parts.push(piece(new CylinderGeometry(0.22, 0.18, 0.25, 8), '#b5251d', M(x, 1.22, 2.2)));   // fondue pot
    parts.push(piece(new CylinderGeometry(0.04, 0.04, 2.6, 4), '#d9dde3', M(x + 0.9, 1.4, 2.2)));
    parts.push(piece(new ConeGeometry(1.4, 0.6, 8), '#e23b3b', M(x + 0.9, 2.8, 2.2)));          // parasol
  }
  return merge(parts);
}

/** An old mine's timber headframe: two tall legs, a brace, the sheave wheel on top (Park City). */
function mineHeadframe() {
  const parts = [piece(new BoxGeometry(5, 3, 5), '#7a6048', M(0, 1.5, 0))];               // the hoist house at its foot
  parts.push(roof4(4.2, 1.6, '#5a524c', 0, 3.8, 0));
  for (const x of [-1.6, 1.6]) {
    for (const z of [-1.2, 1.2]) parts.push(piece(new BoxGeometry(0.35, 13, 0.35), '#6e5136', turned(x * 0.82, 6.5, z * 0.82, 0).multiply(new Matrix4().makeRotationZ(-x * 0.04))));
  }
  for (const y of [5, 8.5, 12]) parts.push(piece(new BoxGeometry(3.2, 0.25, 2.6), '#5d4630', M(0, y, 0)));
  parts.push(piece(new CylinderGeometry(1.3, 1.3, 0.3, 14), '#3a3b40', turned(0, 13.2, 0, 0).multiply(new Matrix4().makeRotationX(Math.PI / 2))));
  return merge(parts);
}

/** Weathered wooden mine buildings: sheds with rusty tin roofs. */
function mineBuildings() {
  const parts = [];
  [[0, 0, 7, 4.5, 5, 0], [8, -3, 5, 3.5, 4, 0.4], [-7, 2, 4, 3, 4, -0.3]].forEach(([x, z, w, h, d, yaw], k) => {
    parts.push(piece(new BoxGeometry(w, h, d), ['#7a6048', '#6e5440', '#86684c'][k], turned(x, h / 2, z, yaw)));
    parts.push(piece(new BoxGeometry(w + 0.6, 0.2, d + 0.8), '#8a4a2e', turned(x, h + 0.6, z, yaw).multiply(new Matrix4().makeRotationX(0.25))));
  });
  return merge(parts);
}

/** The summit lift station: a concrete-and-timber house, the big bullwheel out in front. */
function liftStation() {
  const parts = [
    piece(new BoxGeometry(10, 4, 7), '#9aa1aa', M(0, 2, 0)),
    piece(new BoxGeometry(10.6, 0.5, 8), '#5a3f2a', M(0, 4.3, 0)),
    piece(new BoxGeometry(1.2, 6, 1.2), '#7a8088', M(0, 3, 6)),
    piece(new CylinderGeometry(3, 3, 0.3, 18), '#3a3d42', M(0, 6.2, 6)),
  ];
  for (const x of [-3, 0, 3]) parts.push(piece(new BoxGeometry(2, 1.2, 0.1), '#2d3e52', M(x, 2.4, 3.55)));
  return merge(parts);
}

/** A Romanesque bell tower: square stone storeys, round-arched openings, a low slate pyramid roof (Val d'Aran). */
function bellTower() {
  const parts = [];
  for (let k = 0; k < 4; k += 1) parts.push(piece(new BoxGeometry(5 - k * 0.2, 4.2, 5 - k * 0.2), k % 2 ? '#a69c8c' : '#9a9080', M(0, 2.1 + k * 4.2, 0)));
  for (let k = 1; k < 4; k += 1) parts.push(piece(new BoxGeometry(5.3 - k * 0.2, 0.25, 5.3 - k * 0.2), '#8a8070', M(0, k * 4.2, 0)));
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    for (const x of [-0.9, 0.9]) parts.push(piece(new BoxGeometry(0.9, 1.6, 0.1), '#2a2622', turned(Math.sin(yaw) * 2.42 + Math.cos(yaw) * x, 14.3, Math.cos(yaw) * 2.42 - Math.sin(yaw) * x, yaw)));
  }
  parts.push(roof4(3.9, 2.4, '#4a4e56', 0, 18, 0));
  parts.push(piece(new BoxGeometry(1.2, 2.2, 0.15), '#3b2f27', M(0, 1.1, 2.55)));
  return merge(parts);
}

/** An expedition base camp on the ice: orange tents, a flag, a loaded dog sled beside the gate. */
function baseCamp() {
  const parts = [];
  [[-5, 0, 0.2], [0, -3, -0.3], [5, 0.5, 0.5], [-1, 4, 0.1]].forEach(([x, z, yaw]) => {
    parts.push(piece(new ConeGeometry(1.9, 1.9, 4), '#f07a1f', turned(x, 0.95, z, yaw + Math.PI / 4, 1.3, 1, 0.9)));
    parts.push(piece(new BoxGeometry(0.6, 0.9, 0.05), '#3a2a1e', turned(x, 0.45, z + 0.95, yaw)));
  });
  parts.push(piece(new CylinderGeometry(0.05, 0.06, 5, 5), '#d9dde3', M(2, 2.5, -4)));
  parts.push(piece(new BoxGeometry(0.03, 0.9, 1.4), '#d0242a', M(2, 4.4, -4.75)));       // a red-and-white expedition flag
  parts.push(piece(new BoxGeometry(0.04, 0.45, 1.4), '#ffffff', M(2, 4.4, -4.75)));
  parts.push(piece(new BoxGeometry(1.2, 0.12, 3.6), '#b4783f', M(-6, 0.3, 5)));          // the dog sled, loaded with crates
  parts.push(piece(new BoxGeometry(1.0, 0.8, 2.2), '#c9a06a', M(-6, 0.8, 4.8)));
  parts.push(piece(new BoxGeometry(1.0, 0.5, 0.5), '#2b62c9', M(-6, 1.45, 4.3)));
  for (const x of [-6.5, -5.5]) parts.push(piece(new BoxGeometry(0.06, 0.06, 4), '#2c2f36', M(x, 0.06, 5.1)));
  return merge(parts);
}

/** A nunatak: a dark rock peak standing out of the ice (Greenland Expedition's splitter). */
function nunatak() {
  return merge([
    piece(new IcosahedronGeometry(6, 1), '#3c3a3a', new Matrix4().compose(new Vector3(0, 3.5, 0), new Quaternion(), new Vector3(1, 1.25, 1.3))),
    piece(new IcosahedronGeometry(3.2, 0), '#4a4746', new Matrix4().compose(new Vector3(1.5, 8.5, 0.5), new Quaternion(), new Vector3(1, 1.2, 1))),
    piece(new IcosahedronGeometry(2.4, 0), '#f3f7fb', new Matrix4().compose(new Vector3(-2, 6.5, -2), new Quaternion(), new Vector3(1.4, 0.4, 1.2))), // snow lying in a hollow
  ]);
}

/** A terrain park beside the run: rails and a box, a little kicker. */
function snowPark() {
  const parts = [];
  for (const [x, z, yaw] of [[-5, 0, 0.1], [4, 2, -0.15]]) {
    parts.push(piece(new BoxGeometry(0.12, 0.12, 7), '#e23b3b', turned(x, 1.1, z, yaw)));
    for (const dz of [-3, 3]) parts.push(piece(new BoxGeometry(0.1, 1.1, 0.1), '#2c2f36', turned(x + Math.sin(yaw) * dz, 0.55, z + Math.cos(yaw) * dz, yaw)));
  }
  parts.push(piece(new BoxGeometry(1.4, 0.8, 6), '#2f6fd0', turned(0, 0.4, -6, 0)));   // a box
  parts.push(piece(new BoxGeometry(3, 1.2, 3), '#f3f7fb', turned(0, 0.3, 7, 0).multiply(new Matrix4().makeRotationX(0.35)))); // a kicker
  return merge(parts);
}

/** Landmarks by name: builder, footprint radius (metres kept clear around it). */
export const LANDMARKS = {
  church: { build: church, radius: 11 },
  'mountain-hut': { build: mountainHut, radius: 6 },
  'big-rock': { build: bigRock, radius: 9 },
  lighthouse: { build: lighthouse, radius: 4 },
  'horse-sleigh': { build: horseSleigh, radius: 4 },
  'border-post': { build: borderPost, radius: 5 },
  'mountain-restaurant': { build: mountainRestaurant, radius: 7, fit: 5.4 },
  'mine-headframe': { build: mineHeadframe, radius: 4, fit: 2.7 },
  'mine-buildings': { build: mineBuildings, radius: 11 },
  'lift-station': { build: liftStation, radius: 8 },
  'bell-tower': { build: bellTower, radius: 4, fit: 2.7 },
  'base-camp': { build: baseCamp, radius: 9 },
  nunatak: { build: nunatak, radius: 8, fit: 7.6 },
  'snow-park': { build: snowPark, radius: 9 },
  ...WORLD_LANDMARKS,
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

/** A bearded vulture gliding: long narrow wings, a wedge tail, a pale head (seen from below, high up). Flying along +z. */
export function vulture() {
  return merge([
    piece(new BoxGeometry(0.5, 0.4, 1.4), '#4a3a30', new Matrix4().makeTranslation(0, 0, 0)),
    piece(new BoxGeometry(0.35, 0.35, 0.4), '#e8b07a', new Matrix4().makeTranslation(0, 0.05, 0.85)), // rusty-orange head and breast
    piece(new BoxGeometry(5.4, 0.08, 0.8), '#3a2e28', new Matrix4().makeTranslation(0, 0.1, 0.1)),    // wings
    piece(new ConeGeometry(0.45, 1.2, 4), '#3a2e28', new Matrix4().compose(new Vector3(0, 0, -1.2), new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2), new Vector3(1, 0.3, 1))), // wedge tail
  ]);
}

export function liftTower() {
  return merge([
    piece(new BoxGeometry(0.8, 18, 0.8), '#9aa1aa', new Matrix4().makeTranslation(0, 9, 0)),
    piece(new BoxGeometry(4, 0.5, 0.6), '#9aa1aa', new Matrix4().makeTranslation(0, 18, 0)),
  ]);
}
