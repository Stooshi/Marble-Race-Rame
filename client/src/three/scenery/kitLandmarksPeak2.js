/**
 * Landmarks for the six Peaks tracks of 15 Nov 2026 (Moses: the Peaks pack filled to 20): Half Dome, Huayna Picchu,
 * Huashan, the Eiger, Etna and Tianmen. Like kitLandmarksPeak.js: one builder each, origin on the ground, front
 * facing +z, cartoon low-poly from a few simple shapes, merged into the still scenery. Stylised impressions of the
 * places, never detailed reproductions; no name, sign, flag or religious object on anything.
 */
import { BoxGeometry, ConeGeometry, CylinderGeometry, IcosahedronGeometry, Matrix4, Quaternion, SphereGeometry, Vector3 } from 'three';
import { box, merge, piece } from './parts';

const Y = new Vector3(0, 1, 0);
const X = new Vector3(1, 0, 0);
const M = (x, y, z) => new Matrix4().makeTranslation(x, y, z);
const S = (x, y, z, sx, sy, sz) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion(), new Vector3(sx, sy, sz));
const turned = (x, y, z, yaw, sx = 1, sy = 1, sz = 1) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(Y, yaw), new Vector3(sx, sy, sz));
const tilted = (x, y, z, pitch, sx = 1, sy = 1, sz = 1) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(X, pitch), new Vector3(sx, sy, sz));
/** A box turned about its own middle. */
const tbox = (w, h, d, x, y, z, c, yaw) => piece(new BoxGeometry(w, h, d), c, turned(x, y, z, yaw));
const rnd = (k) => (((k * 7919 + 13) % 97) + 97) % 97 / 97;

// ── Half Dome ────────────────────────────────────────────────────────────────

/** The great granite dome cut away on its front: a rounded back, a sheer flat face (+z) streaked darker. */
function sheerDome() {
  const geo = new SphereGeometry(30, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const pos = geo.getAttribute('position');
  for (let k = 0; k < pos.count; k += 1) if (pos.getZ(k) > 4) pos.setZ(k, 4); // (sliced: the sheer face)
  return merge([
    piece(geo, '#b8b2a8', S(0, 0, 0, 1, 1.5, 1)),
    box(44, 40, 0.6, 0, 20, 4.2, '#8f8a82'),
    ...[-12, -4, 6, 14].map((x, k) => box(1.4, 26 + rnd(k) * 10, 0.4, x, 18, 4.6, '#6f6a64')), // (dark water streaks)
    piece(new IcosahedronGeometry(8, 0), '#a8a298', S(-24, 3, 2, 1.6, 0.6, 1.2)),
  ]);
}

/** The cables route: a smooth granite slab, two lines of posts with cables between them climbing it, timber steps. */
function cableRoute() {
  const p = [piece(new BoxGeometry(14, 1.5, 46), '#b4aea4', tilted(0, 10, 0, -0.45))];
  for (let k = 0; k <= 9; k += 1) {
    const z = -18 + k * 4;
    const y = 10 + (-z) * Math.tan(0.45) * 0.92 + 1;
    for (const x of [-1.3, 1.3]) p.push(box(0.15, 1.4, 0.15, x, y + 0.6, z * 0.9, '#3a3836'));
    p.push(box(2.8, 0.15, 0.4, 0, y, z * 0.9, '#7a5a3a'));
  }
  for (const x of [-1.3, 1.3]) p.push(piece(new BoxGeometry(0.08, 0.08, 46), '#2a2826', tilted(x, 11.9, 0, -0.45)));
  return merge(p);
}

// ── Huayna Picchu ────────────────────────────────────────────────────────────

/** Inca terraces: green stepped benches with grey stone fronts climbing a slope in a gentle curve. */
function incaTerraces() {
  const p = [];
  for (let k = 0; k < 7; k += 1) {
    const w = 34 - k * 2.5;
    const y = k * 2.2;
    const z = -k * 3.2;
    p.push(box(w, 2.2, 3.4, 0, y + 1.1, z, '#7f7a70'), box(w, 0.25, 3.2, 0, y + 2.3, z - 0.1, '#6f9a48'));
  }
  p.push(box(1.2, 14, 1.2, 15, 7, -10, '#7f7a70')); // (a stone stair up the side)
  return merge(p);
}

/** A stone citadel: roofless grey granite houses with trapezoid doorways, walls, a few thatched roofs. */
function stoneCitadel() {
  const p = [];
  const house = (x, z, yaw, roof, k) => {
    const g = '#8a857a';
    p.push(tbox(6, 3.6, 0.6, x, 1.8, z - 2.2, g, yaw), tbox(6, 3.6, 0.6, x, 1.8, z + 2.2, g, yaw));
    p.push(piece(new BoxGeometry(0.6, 3.6, 4.4), g, turned(x - 2.7, 1.8, z, yaw)), piece(new BoxGeometry(0.6, 3.6, 4.4), g, turned(x + 2.7, 1.8, z, yaw)));
    if (roof) p.push(piece(new ConeGeometry(4.4, 3, 4), '#a8884a', turned(x, 5.1, z, yaw + Math.PI / 4, 1.1, 1, 0.8)));
    if (k % 2) p.push(tbox(1.2, 2, 0.7, x, 1, z + 2.25, '#4a463e', yaw)); // (a doorway's shade)
  };
  [[-10, 0, 0, true], [-2, -2, 0.1, false], [6, 1, -0.1, true], [-6, -10, 0.2, false], [4, -9, 0, false], [12, -7, -0.2, true]].forEach(([x, z, yaw, roof], k) => house(x, z, yaw, roof, k));
  p.push(box(36, 1.2, 2, 0, 0.6, 7, '#7f7a70'), box(30, 0.2, 24, 0, 0.05, -4, '#6f9a48'));
  return merge(p);
}

/** A terraced hill: rings of stone-faced green terraces round a rocky top (the middle of a splitter). */
function terracedHill() {
  const p = [];
  for (let k = 0; k < 5; k += 1) {
    const r = 9 - k * 1.6;
    p.push(piece(new CylinderGeometry(r, r + 0.3, 1.8, 10), '#7f7a70', M(0, k * 1.8 + 0.9, 0)), piece(new CylinderGeometry(r - 0.2, r - 0.2, 0.2, 10), '#6f9a48', M(0, k * 1.8 + 1.85, 0)));
  }
  p.push(piece(new IcosahedronGeometry(1.8, 0), '#6a665e', S(0, 10, 0, 1, 1.3, 1)));
  return merge(p);
}

// ── Huashan ──────────────────────────────────────────────────────────────────

/** The plank walk: a sheer granite wall with a line of narrow planks bolted to it, a chain rail, a pine above. */
function plankWalk() {
  const p = [box(40, 46, 6, 0, 23, -3, '#9a8c82'), box(40, 1, 6.2, 0, 46.5, -3, '#7a6c64')];
  for (let k = 0; k < 14; k += 1) {
    const x = -16 + k * 2.4;
    const y = 18 + Math.sin(k * 0.5) * 1.5;
    p.push(box(2.2, 0.2, 1.1, x, y, 0.55, '#7a5a3a'), box(0.12, 1.3, 0.12, x, y + 0.65, 1.05, '#2a2826'));
  }
  p.push(box(34, 0.08, 0.08, 0, 19.2, 1.05, '#2a2826'));
  for (const [x, y] of [[-12, 47], [10, 47], [17, 30]]) p.push(piece(new ConeGeometry(2.6, 3, 6), '#2f5a2c', S(x, y + 1.5, 0, 1.4, 0.6, 1.4)), box(0.5, 1.6, 0.5, x, y - 0.4, 0, '#5a3a2a'));
  return merge(p);
}

/** Cliff stairs: a narrow stone stairway climbing a knife-edge granite ridge, chain rails either side. */
function cliffStairs() {
  const p = [piece(new ConeGeometry(10, 44, 4), '#a8988e', S(0, 22, 0, 0.6, 1, 2.2))];
  for (let k = 0; k < 16; k += 1) {
    const z = 18 - k * 2.4;
    const y = 2 + k * 2.6;
    p.push(box(1.6, 0.5, 1.6, 0, y, z * 0.95 - 2, '#c2b4a8'));
  }
  return merge(p);
}

// ── The Eiger ────────────────────────────────────────────────────────────────

/** The window gallery: a dark rock wall with a row of openings cut in it (the railway's windows in the face). */
function galleryWindows() {
  const p = [box(46, 60, 8, 0, 30, -4, '#34312f'), box(46, 4, 8.4, 0, 60, -4, '#e8eef4')];
  for (let k = 0; k < 4; k += 1) p.push(box(3.6, 2.4, 0.4, -9 + k * 6, 26, 0.1, '#0e0d0c'), box(3.8, 0.3, 0.6, -9 + k * 6, 24.8, 0.3, '#5a5650'));
  return merge(p);
}

/** A rock pillar with the gallery's windows in it (the middle of a spiral). */
function windowPillar() {
  const p = [piece(new CylinderGeometry(6, 9, 30, 8), '#3a3735', M(0, 15, 0)), piece(new ConeGeometry(6.2, 6, 8), '#e8eef4', M(0, 33, 0))];
  for (let k = 0; k < 4; k += 1) {
    const a = (k / 4) * Math.PI * 2;
    p.push(tbox(2.4, 1.8, 0.4, Math.sin(a) * 7, 18, Math.cos(a) * 7, '#0e0d0c', a));
  }
  return merge(p);
}

/** A cog railway: a short red-and-cream train on a track up the pasture, a small timber station. */
function cogRailway() {
  const p = [];
  for (let k = 0; k < 2; k += 1) {
    const z = -k * 9;
    p.push(box(3, 2.6, 8, 0, 2.3, z, '#b8282a'), box(3.1, 0.9, 8.1, 0, 3.2, z, '#f2e8d8'), box(3.2, 0.3, 8.2, 0, 3.75, z, '#3a3836'));
  }
  p.push(box(2.2, 0.2, 40, 0, 0.1, -4, '#4a4642'), box(7, 4, 10, 8, 2, 4, '#7a5a3a'), piece(new ConeGeometry(7, 2.6, 4), '#5a3a2a', turned(8, 5.3, 4, Math.PI / 4, 1, 1, 1.4)));
  return merge(p);
}

// ── Etna ─────────────────────────────────────────────────────────────────────

/** A lava flow: a long tongue of black crust down the slope, glowing orange in its cracks and at its front. */
function lavaFlow() {
  const p = [];
  for (let k = 0; k < 8; k += 1) {
    const z = 20 - k * 6;
    const w = 7 + Math.sin(k * 1.3) * 2;
    p.push(piece(new IcosahedronGeometry(1, 0), '#1e1a19', S(Math.sin(k * 0.7) * 3, 0.6, z, w, 1.1, 4)));
    p.push(box(w * 0.8, 0.15, 0.5, Math.sin(k * 0.7) * 3, 1.5, z + 1, '#ff6a1a'));
  }
  p.push(piece(new IcosahedronGeometry(1, 0), '#ff7a2a', S(0, 0.8, 24, 6, 1, 2)));
  return merge(p);
}

/** A smoking crater: a black cinder cone with a red-brown rim, grey smoke puffs rising from it. */
function smokingCrater() {
  const p = [piece(new CylinderGeometry(9, 26, 22, 12, 1, true), '#2e2a28', M(0, 11, 0)), piece(new CylinderGeometry(9.5, 9.5, 1.2, 12), '#6a3a2a', M(0, 22, 0))];
  for (let k = 0; k < 5; k += 1) p.push(piece(new IcosahedronGeometry(4 + k * 1.2, 0), k % 2 ? '#bfbab4' : '#a8a29c', M(Math.sin(k) * 2 + k * 1.5, 26 + k * 5, -k)));
  return merge(p);
}

// ── Tianmen ──────────────────────────────────────────────────────────────────

/** The sky arch: a towering cliff with a great hole right through it, forest on its ledges. */
function skyArch() {
  const c = '#8a7e72';
  const p = [
    box(18, 90, 14, -25, 45, 0, c), box(18, 90, 14, 25, 45, 0, c), // (the pillars either side of the hole)
    box(68, 26, 14, 0, 77, 0, c), // (the rock over it)
    box(68, 3, 14.2, 0, 91.5, 0, '#3f6a3a'),
  ];
  for (const [x, y] of [[-30, 60], [28, 40], [-22, 20], [30, 70]]) p.push(piece(new ConeGeometry(3, 4, 6), '#2f5a2c', S(x, y, 7.5, 1.4, 0.7, 0.6)));
  return merge(p);
}

/** The switchback road: a pale road zigzagging up a green slope in tight hairpins. */
function switchbackRoad() {
  const p = [piece(new BoxGeometry(50, 1, 60), '#3f6a3a', tilted(0, 14, 0, -0.5))];
  for (let k = 0; k < 7; k += 1) {
    const z = 22 - k * 7.5;
    const y = 14 + (-z) * Math.tan(0.5) + 1;
    p.push(piece(new BoxGeometry(34, 0.3, 2.4), '#d8d2c6', tilted(0, y, z * 0.88, -0.5)));
    const end = k % 2 ? -17 : 17;
    p.push(piece(new CylinderGeometry(2.6, 2.6, 0.3, 8), '#d8d2c6', M(end, y + Math.tan(0.5) * 3.2, z * 0.88 - 3.2)));
  }
  return merge(p);
}

export const PEAK2_LANDMARKS = {
  'sheer-dome': { build: sheerDome, radius: 44 },
  'cable-route': { build: cableRoute, radius: 26 },
  'inca-terraces': { build: incaTerraces, radius: 20 },
  'stone-citadel': { build: stoneCitadel, radius: 20 },
  'terraced-hill': { build: terracedHill, radius: 9 },
  'plank-walk': { build: plankWalk, radius: 22 },
  'cliff-stairs': { build: cliffStairs, radius: 22 },
  'gallery-windows': { build: galleryWindows, radius: 26 },
  'window-pillar': { build: windowPillar, radius: 9 },
  'cog-railway': { build: cogRailway, radius: 22 },
  'lava-flow': { build: lavaFlow, radius: 26 },
  'smoking-crater': { build: smokingCrater, radius: 26 },
  'sky-arch': { build: skyArch, radius: 36 },
  'switchback-road': { build: switchbackRoad, radius: 30 },
};
