/**
 * Landmarks for the six Canyons tracks of 15 Nov 2026 (Moses: the Canyons pack filled to 20): Bryce Canyon, Blyde
 * River Canyon, Taroko Gorge, Samaria Gorge, Sumidero Canyon and Kings Canyon. Like kitLandmarksCanyon.js: one
 * builder each, origin on the ground (or on the water, placed with `river: true`), front facing +z, cartoon low-poly
 * from a few simple shapes, merged into the still scenery. Stylised impressions of the places, never detailed
 * reproductions, and no name on anything.
 */
import { BoxGeometry, ConeGeometry, CylinderGeometry, IcosahedronGeometry, Matrix4, Quaternion, SphereGeometry, Vector3 } from 'three';
import { box, merge, piece } from './parts';

const Y = new Vector3(0, 1, 0);
const M = (x, y, z) => new Matrix4().makeTranslation(x, y, z);
const S = (x, y, z, sx, sy, sz) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion(), new Vector3(sx, sy, sz));
const turned = (x, y, z, yaw, sx = 1, sy = 1, sz = 1) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(Y, yaw), new Vector3(sx, sy, sz));
const rnd = (k) => (((k * 7919 + 13) % 97) + 97) % 97 / 97;

// ── Bryce Canyon ─────────────────────────────────────────────────────────────

const HOODOO = ['#d9783f', '#e89a62', '#f2d2b0', '#c9653a', '#f6e6d2'];
/** One hoodoo: a stack of tapering bands of orange and white rock, a pale cap stone. */
function hoodoo(x, z, h, r, k) {
  const p = [];
  const bands = Math.max(3, Math.round(h / 3));
  for (let b = 0; b < bands; b += 1) {
    const y0 = (b / bands) * h;
    const w = r * (1 - 0.35 * (b / bands)) * (b % 2 ? 0.82 : 1); // pinched between bands
    p.push(piece(new CylinderGeometry(w * 0.9, w, h / bands, 6), HOODOO[(b + k) % HOODOO.length], M(x, y0 + h / bands / 2, z)));
  }
  p.push(piece(new CylinderGeometry(r * 0.75, r * 0.6, 0.9, 6), '#f6ecdc', M(x, h + 0.4, z)));
  return p;
}

/** The amphitheatre: rows of hoodoos in a wide arc, tallest at the back, a pine or two among them. */
function hoodooAmphitheatre() {
  const p = [];
  let k = 0;
  for (let row = 0; row < 3; row += 1) {
    const rad = 26 + row * 9;
    for (let a = -1.2; a <= 1.2; a += 0.22 - row * 0.03) {
      const x = Math.sin(a) * rad;
      const z = -Math.cos(a) * rad + 22;
      p.push(...hoodoo(x, z, 9 + row * 4 + rnd(k) * 6, 1.4 + rnd(k + 5) * 0.8, k));
      k += 1;
    }
  }
  for (const [x, z] of [[-18, 4], [14, -2], [3, -10]]) p.push(piece(new ConeGeometry(1.6, 7, 6), '#3f5f34', M(x, 4.5, z)), box(0.4, 1.5, 0.4, x, 0.75, z, '#5a3a2a'));
  return merge(p);
}

/** A hammer-headed hoodoo: one tall slender column, a broad flat block balanced on top. */
function hammerHoodoo() {
  return merge([
    ...hoodoo(0, 0, 14, 1.3, 1),
    box(3.4, 1.6, 2.4, 0, 15.2, 0, '#c9653a'),
    piece(new CylinderGeometry(3.5, 4.5, 3, 7), '#e0a87a', M(0, 1.5, 0)), // the scree round its foot
  ]);
}

// ── Blyde River Canyon ───────────────────────────────────────────────────────

/** The Three Rondavels: three round rock towers on a ridge, each capped with a cone of green bush, like huts. */
function threeRondavels() {
  const p = [box(70, 10, 18, 0, 5, -6, '#8a4a2e')];
  [-20, 0, 20].forEach((x, k) => {
    const h = 18 + k * 2;
    p.push(piece(new CylinderGeometry(6.5, 7.5, h, 10), k % 2 ? '#a8643a' : '#b8774a', M(x, 10 + h / 2, -6)));
    p.push(piece(new CylinderGeometry(6.6, 6.6, 1.2, 10), '#7a3e28', M(x, 10 + h * 0.4, -6)));
    p.push(piece(new ConeGeometry(7.4, 8, 10), '#4f7a34', M(x, 10 + h + 4, -6)));
  });
  return merge(p);
}

/**
 * The potholes: smooth round pits worn in the rock by the swirling river, water at their bottoms, banded walls in
 * yellow and red; set round a spiral's middle (or beside the track).
 */
function potholes() {
  const p = [piece(new CylinderGeometry(16, 18, 4, 16), '#c9884a', M(0, 2, 0))];
  for (const [x, z, r] of [[0, 0, 5], [-8, 5, 3.5], [7, -6, 4], [8, 6, 3], [-7, -7, 3]]) {
    p.push(piece(new CylinderGeometry(r, r * 0.8, 0.3, 12), '#2f5a44', M(x, 4.05, z)));
    p.push(piece(new CylinderGeometry(r + 0.6, r + 0.6, 0.25, 12), '#e0b060', M(x, 4.0, z)));
  }
  return merge(p);
}

// ── Taroko Gorge ─────────────────────────────────────────────────────────────

/** A pillar of grey-white marble with dark streaks, standing on the divider of a splitter, a little jungle on its top. */
function marblePillar() {
  const p = [];
  for (let k = 0; k < 6; k += 1) p.push(piece(new CylinderGeometry(1.15 - k * 0.04, 1.2 - k * 0.04, 3, 7), k % 2 ? '#d8d6d0' : '#b8b6b0', M(0, 1.5 + k * 3, 0)));
  p.push(piece(new IcosahedronGeometry(1.6, 0), '#3f7a34', S(0, 19, 0, 1, 0.7, 1)));
  return merge(p);
}

/** The shrine on the cliff: a red-pillared pavilion with a green tiled roof perched on a ledge, a waterfall pouring out beside it. */
function shrineWaterfall() {
  const p = [box(22, 18, 10, 0, 9, -6, '#b8b6b0')]; // the cliff
  p.push(box(10, 0.8, 6, -4, 18.4, -2, '#9a9894'));
  for (const x of [-7.5, -0.5]) for (const z of [-4, 0]) p.push(box(0.5, 4, 0.5, x, 20.8, z, '#b02a22'));
  p.push(box(9, 0.6, 6, -4, 23, -2, '#2f7a4a'), piece(new ConeGeometry(5.6, 2.4, 4), '#2f7a4a', turned(-4, 24.5, -2, Math.PI / 4, 1.2, 1, 0.8)));
  p.push(box(3, 18, 0.8, 6, 9, -0.6, '#eef8f8'), piece(new CylinderGeometry(4, 4, 0.3, 10), '#5ab8b8', M(6, 0.15, 2))); // the waterfall and its pool
  return merge(p);
}
function shrineSpray() {
  return merge([piece(new SphereGeometry(4, 8, 6), '#ffffff', S(6, 1.5, 1.5, 1.2, 0.6, 1.2))]);
}

// ── Samaria Gorge ────────────────────────────────────────────────────────────

/** The wooden staircase down the gorge's head: flights of plank steps with handrails zigzagging down a pale cliff. */
function woodenStaircase() {
  const p = [box(28, 30, 8, 0, 15, -6, '#c9c2b4')];
  for (let f = 0; f < 5; f += 1) {
    const dir = f % 2 ? -1 : 1;
    const y = 28 - f * 5.6;
    for (let s = 0; s < 8; s += 1) p.push(box(1.4, 0.25, 2.2, dir * (-8 + s * 2.1), y - s * 0.7, -0.8, '#8a6a42'));
    p.push(box(17, 0.15, 0.15, dir * -0.6, y - 1.6, 0.4, '#5a4a36'));
    p.push(box(2.6, 0.3, 2.6, dir * 9.5, y - 5.6, -0.8, '#8a6a42')); // a landing
  }
  return merge(p);
}

/** The abandoned village: a few stone houses with fallen roofs among tall cypresses, a little chapel. */
function stoneVillage() {
  const p = [];
  [[-8, 0, 0.2], [0, -5, -0.1], [9, 1, 0.3], [-2, 7, 0]].forEach(([x, z, yaw], k) => {
    p.push(piece(new BoxGeometry(5, 3.2, 4), k % 2 ? '#c9c2b4' : '#b0a898', turned(x, 1.6, z, yaw)));
    if (k === 1) p.push(piece(new ConeGeometry(3.4, 1.6, 4), '#a8583a', turned(x, 4, z, yaw + Math.PI / 4))); // the one roof still on
  });
  p.push(box(3, 4, 4, 14, 2, -6, '#ece4d2'), piece(new CylinderGeometry(1.4, 1.4, 1.2, 8, 1, false, 0, Math.PI), '#ece4d2', turned(14, 4.2, -6, 0, 1, 1, 1))); // the chapel
  for (const [x, z] of [[-13, -4], [5, 6], [11, -8], [-5, -9], [17, 2]]) p.push(piece(new IcosahedronGeometry(1, 0), '#2f4a2c', S(x, 5, z, 1, 4.2, 1)));
  return merge(p);
}

// ── Sumidero Canyon ──────────────────────────────────────────────────────────

/** The "Christmas tree": a tall cone of green moss built up in tiers on the canyon wall, white water streaming down over it. */
function treeWaterfall() {
  const p = [box(30, 46, 8, 0, 23, -8, '#6a6862')];
  for (let k = 0; k < 7; k += 1) {
    const r = 3 + k * 1.6;
    p.push(piece(new ConeGeometry(r, 6, 10, 1, true, Math.PI * 0.5, Math.PI), k % 2 ? '#3f7a34' : '#4f8a3e', M(0, 40 - k * 5.4, -4)));
    p.push(piece(new BoxGeometry(r * 1.2, 0.4, 0.4), '#eef8f4', M(0, 37.4 - k * 5.4, -4 + r * 0.55)));
  }
  p.push(box(1.2, 8, 0.6, 0, 42, -3.6, '#eef8f4'));
  return merge(p);
}
function treeWaterfallSpray() {
  return merge([piece(new SphereGeometry(8, 8, 6), '#ffffff', S(0, 2, 0, 1.4, 0.5, 1))]);
}

/** Crocodiles basking on a sandbank in the river: three long low bodies, ridged backs, open jaws on one. */
function crocodiles() {
  const p = [piece(new CylinderGeometry(9, 10, 0.6, 12), '#b8a878', S(0, 0.1, 0, 1, 1, 0.5))];
  [[-4, 0.6, 0.3], [2, -1.2, -0.4], [5, 2, 1.2]].forEach(([x, z, yaw], k) => {
    const at = (dx, dy, dz) => turned(x, 0.4, z, yaw).multiply(M(dx, dy, dz));
    p.push(piece(new BoxGeometry(1.1, 0.45, 3.4), '#4a5a34', at(0, 0.25, 0)), piece(new BoxGeometry(0.7, 0.35, 1.4), '#4a5a34', at(0, 0.22, 2.3)));
    p.push(piece(new ConeGeometry(0.45, 2.4, 4), '#4a5a34', at(0, 0.2, -2.8).multiply(new Matrix4().makeRotationX(-Math.PI / 2))));
    if (k === 0) p.push(piece(new BoxGeometry(0.7, 0.2, 1.3), '#4a5a34', at(0, 0.6, 2.4).multiply(new Matrix4().makeRotationX(-0.35))));
  });
  return merge(p);
}

// ── Kings Canyon ─────────────────────────────────────────────────────────────

/** The Lost City: a cluster of rounded beehive domes of sandstone, banded red and pale, cracks between them. */
function beehiveDomes() {
  const p = [];
  let k = 0;
  for (let x = -24; x <= 24; x += 8) {
    for (const z of [-6, 4]) {
      const r = 3.6 + rnd(k) * 1.6;
      const h = 6 + rnd(k + 3) * 6;
      for (let b = 0; b < 3; b += 1) p.push(piece(new CylinderGeometry(r * (1 - b * 0.22) * 0.85, r * (1 - b * 0.22), h / 3, 9), b % 2 ? '#e0b088' : '#b8542e', M(x + (z > 0 ? 3 : 0), b * h / 3 + h / 6, z)));
      p.push(piece(new SphereGeometry(r * 0.56, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2), '#a8442a', M(x + (z > 0 ? 3 : 0), h, z)));
      k += 1;
    }
  }
  return merge(p);
}

/** The Garden of Eden: a still green pool in a cleft of red rock, ringed with palms and green fronds. */
function edenPool() {
  const p = [box(36, 12, 6, 0, 6, -12, '#a8442a'), box(6, 10, 22, -16, 5, -2, '#8a3a22'), box(6, 10, 22, 16, 5, -2, '#8a3a22')];
  p.push(piece(new CylinderGeometry(11, 11, 0.3, 16), '#3f8a6a', S(0, 0.15, -1, 1, 1, 0.7)));
  for (const [x, z] of [[-9, -6], [-4, -9], [5, -8], [10, -4], [-11, 2], [11, 3]]) {
    p.push(piece(new CylinderGeometry(0.22, 0.3, 6, 5), '#6a5a42', M(x, 3, z)));
    for (let f = 0; f < 5; f += 1) p.push(piece(new BoxGeometry(0.5, 0.12, 3), '#3f7a34', turned(x, 6, z, (f / 5) * Math.PI * 2).multiply(new Matrix4().makeRotationX(0.45)).multiply(M(0, 0, 1.4))));
  }
  return merge(p);
}

export const CANYON2_LANDMARKS = {
  'hoodoo-amphitheatre': { build: hoodooAmphitheatre, radius: 45 },
  'hammer-hoodoo': { build: hammerHoodoo, radius: 5 },
  'three-rondavels': { build: threeRondavels, radius: 36 },
  potholes: { build: potholes, radius: 18 },
  'marble-pillar': { build: marblePillar, radius: 2 },
  'shrine-waterfall': { build: shrineWaterfall, haze: shrineSpray, radius: 14 },
  'wooden-staircase': { build: woodenStaircase, radius: 15 },
  'stone-village': { build: stoneVillage, radius: 18 },
  'tree-waterfall': { build: treeWaterfall, haze: treeWaterfallSpray, radius: 16 },
  crocodiles: { build: crocodiles, radius: 10 },
  'beehive-domes': { build: beehiveDomes, radius: 30 },
  'eden-pool': { build: edenPool, radius: 18 },
};
