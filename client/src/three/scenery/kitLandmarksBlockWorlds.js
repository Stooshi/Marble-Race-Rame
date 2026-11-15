/**
 * Landmarks for the seven Blocks 1 tracks of 15 Nov 2026 (Moses: the Blocks 1 pack filled to 20): game worlds of our
 * own built of cubes: Mushroom Grove, Sunken Ruins, Clockwork Works, Crystal Grotto, Jungle Ruins, Moon Base and Neon
 * Grid. Like kitLandmarksBlock.js: one builder each, origin on the ground, front facing +z, made of boxes only, merged
 * into the still scenery. Our own shapes and colours: no names, creatures, textures or pieces from any existing game.
 */
import { BoxGeometry, Matrix4, Quaternion, Vector3 } from 'three';
import { merge, piece } from './parts';

const Y = new Vector3(0, 1, 0);
const Z = new Vector3(0, 0, 1);
/** A box w×h×d at (x, y, z), turned `yaw` about the vertical. */
const cube = (w, h, d, x, y, z, colour, yaw = 0) => piece(new BoxGeometry(w, h, d), colour, new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(Y, yaw), new Vector3(1, 1, 1)));
/** A box rolled `roll` about the forward axis (for a gear's teeth standing upright). */
const rolled = (w, h, d, x, y, z, colour, roll) => piece(new BoxGeometry(w, h, d), colour, new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(Z, roll), new Vector3(1, 1, 1)));
const rnd = (k) => (((k * 7919 + 13) % 97) + 97) % 97 / 97;

// ── Mushroom Grove ───────────────────────────────────────────────────────────

/** A giant cube mushroom: a thick pale stem, a broad red cap in two steps, white spots. */
function giantMushroom() {
  const p = [cube(5, 16, 5, 0, 8, 0, '#efe6d2'), cube(4, 1, 4, 0, 15.5, 0, '#e2d8c2'), cube(20, 3, 20, 0, 17.5, 0, '#c8483a'), cube(14, 2.4, 14, 0, 20.2, 0, '#d4544a')];
  for (const [x, z, y] of [[5, 4, 21.5], [-4, -5, 21.5], [-6, 5, 19.1], [8, -6, 19.1], [1, -1, 21.5]]) p.push(cube(2.4, 0.4, 2.4, x, y, z, '#ffffff'));
  return merge(p);
}

/** A ring of small cube mushrooms in the grass, brown and red caps. */
function mushroomRing() {
  const p = [];
  for (let k = 0; k < 9; k += 1) {
    const a = (k / 9) * Math.PI * 2;
    const x = Math.sin(a) * 7;
    const z = Math.cos(a) * 7;
    const h = 1.6 + rnd(k) * 1.4;
    p.push(cube(0.7, h, 0.7, x, h / 2, z, '#efe6d2'), cube(2.0, 0.7, 2.0, x, h + 0.3, z, k % 3 ? '#a8603a' : '#c8483a'));
  }
  return merge(p);
}

// ── Sunken Ruins ─────────────────────────────────────────────────────────────

/** A sunken dome: a stepped dome of pale stone, half buried, its top broken open, kelp on it. */
function sunkenDome() {
  const p = [];
  for (let k = 0; k < 6; k += 1) {
    const w = 30 - k * 4.6;
    p.push(cube(w, 2.6, w, 0, k * 2.6 + 1.3, 0, k % 2 ? '#c8c2b0' : '#bab4a2'));
  }
  p.push(cube(6, 3, 6, 4, 16.5, -2, '#2f5f6a')); // (the broken top)
  for (const [x, z] of [[-13, 9], [11, 11], [-9, -12]]) p.push(cube(0.8, 7, 0.8, x, 3.5, z, '#3f7a4a'), cube(0.6, 5, 0.6, x + 0.3, 9, z, '#4a8a52'));
  return merge(p);
}

/** Sunken arches: a row of three broken stone arches, pale and mossy. */
function sunkenArches() {
  const p = [];
  for (let k = -1; k <= 1; k += 1) {
    const x = k * 9;
    const h = 9 - Math.abs(k) * 2;
    p.push(cube(1.8, h, 1.8, x - 3, h / 2, 0, '#c8c2b0'), cube(1.8, h - 2, 1.8, x + 3, (h - 2) / 2, 0, '#bab4a2'));
    if (k !== 1) p.push(cube(8, 1.6, 1.8, x, h + 0.2, 0, '#c8c2b0'));
  }
  p.push(cube(5, 1.4, 2.4, 10, 0.7, 4, '#aaa492'));
  return merge(p);
}

// ── Clockwork Works ──────────────────────────────────────────────────────────

/** A gear standing upright (facing ±z): a brass disc of boxes and square teeth round it, an iron hub. */
function upright(r, x, y, z, colour, teeth = 12) {
  const p = [rolled(r * 1.5, r * 1.5, 0.8, x, y, z, colour, 0), rolled(r * 1.5, r * 1.5, 0.8, x, y, z, colour, Math.PI / 4), cube(r * 0.5, r * 0.5, 1.2, x, y, z, '#4a3e32')];
  for (let k = 0; k < teeth; k += 1) {
    const a = (k / teeth) * Math.PI * 2;
    p.push(rolled(r * 0.35, r * 0.3, 0.8, x + Math.cos(a) * r, y + Math.sin(a) * r, z, colour, a));
  }
  return p;
}

/** The giant gear: one great brass gear on an iron stand (the middle of a splitter). */
function giantGear() {
  return merge([cube(3, 6, 3, 0, 3, 0, '#3f3a36'), cube(8, 1, 4, 0, 0.5, 0, '#4a4440'), ...upright(6, 0, 12, 0, '#c8963f', 14)]);
}

/** A gear wall: a tall iron wall with interlocking brass and copper gears on its face. */
function gearWall() {
  const p = [cube(36, 22, 3, 0, 11, -2, '#3f3a36'), cube(36, 1.2, 3.4, 0, 22.4, -2, '#5a524a')];
  [[-11, 12, 6, '#c8963f'], [0, 7, 4, '#b86f3a'], [8, 14, 5, '#d0a24a'], [14, 5, 3, '#b86f3a'], [-4, 17, 2.6, '#c8963f']].forEach(([x, y, r, c]) => p.push(...upright(r, x, y, 0.2, c, r > 4 ? 12 : 8)));
  return merge(p);
}

// ── Crystal Grotto ───────────────────────────────────────────────────────────

/** A crystal spire: a tall cluster of violet and pale blue crystal columns (the middle of a spiral). */
function crystalSpire() {
  const p = [cube(6, 2, 6, 0, 1, 0, '#2c2545')];
  [[0, 0, 22, 2.6, '#a88af0'], [2.4, 1.4, 14, 1.8, '#8fb8f0'], [-2.2, 1.2, 16, 1.8, '#c8a8ff'], [0.6, -2.4, 11, 1.6, '#8fb8f0'], [-1.8, -1.6, 9, 1.4, '#a88af0']].forEach(([x, z, h, w, c], k) => {
    p.push(cube(w, h, w, x, h / 2, z, c, 0.4 * k), cube(w * 0.6, w * 0.8, w * 0.6, x, h + w * 0.3, z, '#ece4ff', 0.4 * k + 0.785));
  });
  return merge(p);
}

/** A crystal pool: a still pool of glowing teal water in a ring of dark rock, crystals round its edge. */
function crystalPool() {
  const p = [cube(22, 0.4, 16, 0, 0.2, 0, '#2fc8c0'), cube(24, 1, 1.4, 0, 0.5, 8.6, '#2c2545'), cube(24, 1, 1.4, 0, 0.5, -8.6, '#2c2545'), cube(1.4, 1, 16, 11.8, 0.5, 0, '#2c2545'), cube(1.4, 1, 16, -11.8, 0.5, 0, '#2c2545')];
  for (let k = 0; k < 7; k += 1) {
    const x = -10 + k * 3.3;
    const h = 2 + rnd(k) * 4;
    p.push(cube(1.2, h, 1.2, x, h / 2, k % 2 ? -9.5 : 9.5, k % 2 ? '#a88af0' : '#8fb8f0', k));
  }
  return merge(p);
}

// ── Jungle Ruins ─────────────────────────────────────────────────────────────

/** A vine temple: a stepped stone ruin overgrown with green, a dark doorway, vines hanging off its steps. */
function vineTemple() {
  const p = [];
  for (let k = 0; k < 5; k += 1) {
    const w = 26 - k * 5;
    p.push(cube(w, 3.4, w, 0, k * 3.4 + 1.7, 0, k % 2 ? '#8a8670' : '#7f7b66'), cube(w + 0.2, 0.5, w + 0.2, 0, k * 3.4 + 3.5, 0, '#4f8a3a'));
  }
  p.push(cube(4, 4, 1, 0, 19, 3.1, '#2a2a22'), cube(6, 5, 6, 0, 19.5, 0, '#8a8670'));
  for (const [x, z, h] of [[-12, 13, 3], [6, 13, 4], [-8, 8, 5], [9, 8, 4]]) p.push(cube(0.4, h, 0.4, x, 6.8 - h / 2, z, '#3f7a32'));
  return merge(p);
}

/** A vine arch: a broken stone arch over the jungle floor, green spilling over its top. */
function vineArch() {
  return merge([cube(2.4, 12, 2.4, -6, 6, 0, '#7f7b66'), cube(2.4, 10, 2.4, 6, 5, 0, '#8a8670'), cube(15, 2.2, 2.6, 0, 12.6, 0, '#7f7b66'), cube(15.2, 0.8, 3, 0, 14, 0, '#4f8a3a'), cube(0.4, 6, 0.4, -2, 9, 1.4, '#3f7a32'), cube(0.4, 4, 0.4, 3, 10, 1.4, '#3f7a32')]);
}

// ── Moon Base ────────────────────────────────────────────────────────────────

/** Moon domes: three stepped white habitat domes joined by square tubes, lit windows. */
function moonDomes() {
  const p = [];
  const dome = (x, z, r) => {
    for (let k = 0; k < 4; k += 1) p.push(cube(r * 2 - k * r * 0.45, r * 0.32, r * 2 - k * r * 0.45, x, k * r * 0.32 + r * 0.16, z, k % 2 ? '#e4e6ea' : '#f2f4f6'));
    p.push(cube(r * 0.5, r * 0.3, 0.2, x, r * 0.3, z + r, '#f2d28e'));
  };
  dome(-10, 0, 6); dome(4, -2, 8); dome(15, 3, 4.5);
  p.push(cube(6, 2, 2, -4, 1, 0, '#c8cad0'), cube(5, 1.6, 1.6, 10.5, 0.8, 1, '#c8cad0'));
  return merge(p);
}

/** A launch tower: a tall lattice tower of grey boxes beside a white rocket of stacked cubes on its pad. */
function launchTower() {
  const p = [cube(14, 1, 14, 0, 0.5, 0, '#6a6a70')];
  for (let k = 0; k < 8; k += 1) p.push(cube(3, 0.4, 3, -5, 2 + k * 4, 0, '#8a8a90'));
  for (const [x, z] of [[-6.3, -1.3], [-3.7, -1.3], [-6.3, 1.3], [-3.7, 1.3]]) p.push(cube(0.4, 32, 0.4, x, 17, z, '#8a8a90'));
  p.push(cube(4, 20, 4, 3, 11, 0, '#f2f4f6'), cube(3, 4, 3, 3, 23, 0, '#e8eaee'), cube(1.6, 2.4, 1.6, 3, 26.2, 0, '#c84a3a'), cube(1.2, 4, 6.8, 3, 3, 0, '#c84a3a'), cube(6.8, 4, 1.2, 3, 3, 0, '#c84a3a'));
  return merge(p);
}

// ── Neon Grid ────────────────────────────────────────────────────────────────

/** Neon towers: thin dark towers outlined in cyan and pink light bars, a lit band at the top of each. */
function neonTowers() {
  const p = [];
  [[-12, 0, 26, '#5ff2ff'], [-2, -6, 34, '#ff4ab8'], [9, -1, 22, '#5ff2ff'], [17, -8, 30, '#ffd84a']].forEach(([x, z, h, c]) => {
    p.push(cube(5, h, 5, x, h / 2, z, '#1a1630'));
    for (const [dx, dz] of [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]]) p.push(cube(0.3, h, 0.3, x + dx, h / 2, z + dz, c));
    p.push(cube(5.4, 0.8, 5.4, x, h - 2, z, c));
  });
  return merge(p);
}

/** A neon gate: a square frame of light bars over the floor grid, cyan outside, pink inside. */
function neonGate() {
  return merge([cube(1, 16, 1, -9, 8, 0, '#5ff2ff'), cube(1, 16, 1, 9, 8, 0, '#5ff2ff'), cube(19, 1, 1, 0, 16, 0, '#5ff2ff'), cube(0.6, 13, 0.6, -7, 6.5, 0, '#ff4ab8'), cube(0.6, 13, 0.6, 7, 6.5, 0, '#ff4ab8'), cube(14.6, 0.6, 0.6, 0, 13, 0, '#ff4ab8'), cube(22, 0.2, 4, 0, 0.1, 0, '#2a2346')]);
}

export const BLOCK_WORLD_LANDMARKS = {
  'giant-mushroom': { build: giantMushroom, radius: 12 },
  'mushroom-ring': { build: mushroomRing, radius: 9 },
  'sunken-dome': { build: sunkenDome, radius: 17 },
  'sunken-arches': { build: sunkenArches, radius: 14 },
  'giant-gear': { build: giantGear, radius: 9 },
  'gear-wall': { build: gearWall, radius: 19 },
  'crystal-spire': { build: crystalSpire, radius: 5 },
  'crystal-pool': { build: crystalPool, radius: 13 },
  'vine-temple': { build: vineTemple, radius: 15 },
  'vine-arch': { build: vineArch, radius: 9 },
  'moon-domes': { build: moonDomes, radius: 20 },
  'launch-tower': { build: launchTower, radius: 9 },
  'neon-towers': { build: neonTowers, radius: 20 },
  'neon-gate': { build: neonGate, radius: 12 },
};
