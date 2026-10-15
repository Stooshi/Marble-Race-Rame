/**
 * The Block Series' worlds (family 'block': `block: { world }`): land built of blocks round the
 * track, in calm colours, and what stands on it. Looks only.
 *
 *   BLOCK_WORLDS[world]       its land's colours (tops in two tones, the risers, the deep), the
 *                             banks, how high its hills rise and how tall a step of land is,
 *                             and its dressing (shares adding up to 1)
 *   makeBlockLand(world, f)   the voxel land: away from the track the land steps down in level
 *                             terraces (it only ever lowers the land, so it never rises over the
 *                             track), each terrace a slightly different tone, the risers in earth
 *                             or stone, the tops in square tiles
 *   blockDressing(world)      cube trees, cube rocks, stepped pines, gem clusters, basalt columns,
 *                             our own block pieces: [[make(lite) → geometry, share], …]
 *
 * Our own shapes and colours throughout: no names, creatures, textures or terms from any
 * existing block game, and never the classic four-cube falling pieces.
 */
import { BoxGeometry, Color, Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { merge, piece, smoothstep } from './parts';

const T = (x, y, z, sx = 1, sy = 1, sz = 1, yaw = 0) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw), new Vector3(sx, sy, sz));
const cube = (w, h, d, x, y, z, colour, yaw = 0) => piece(new BoxGeometry(w, h, d), colour, T(x, y, z, 1, 1, 1, yaw));

/** The worlds. tops: the two tones of level land; riser: a terrace's face; deep: the land far below. */
export const BLOCK_WORLDS = {
  // Spawn Point: a calm cube meadow at dawn.
  meadow: {
    tops: ['#86b665', '#79a95b'], riser: '#8c6c4b', deep: '#6d6660', bank: '#82b162', fill: '#8c6c4b', hills: 24, step: 3,
    dressing: [['tree', 0.45], ['bush', 0.25], ['flowers', 0.2], ['rock', 0.1]],
  },
  // Speedrun Valley: wide cube hills, a little warmer.
  valley: {
    tops: ['#97bd68', '#88b05d'], riser: '#9a7a52', deep: '#6f6a5e', bank: '#8eb663', fill: '#9a7a52', hills: 34, step: 4,
    dressing: [['tree', 0.5], ['bush', 0.3], ['rock', 0.2]],
  },
  // Voxel Peaks: snowy cube mountains.
  snow: {
    tops: ['#eef3f7', '#e1e8ef'], riser: '#7f8995', deep: '#69737f', bank: '#eaf0f5', fill: '#7f8995', hills: 46, step: 4,
    dressing: [['snowPine', 0.6], ['snowRock', 0.4]],
  },
  // Deep Mine: dark stone underground, gem seams.
  mine: {
    tops: ['#5c6067', '#53575e'], riser: '#3f424a', deep: '#2f3238', bank: '#575b62', fill: '#3f424a', hills: 30, step: 3,
    dressing: [['darkRock', 0.5], ['gems', 0.25], ['pillar', 0.25]],
  },
  // Magma Core: dark basalt over glowing magma.
  magma: {
    tops: ['#3b3335', '#342d2f'], riser: '#241f21', deep: '#1c1718', bank: '#3a3234', fill: '#241f21', hills: 28, step: 3,
    dressing: [['basalt', 0.55], ['darkRock', 0.3], ['embers', 0.15]],
  },
  // Line Clear and Combo Drop: a calm tiled plain, slate blue, our own block pieces on it.
  puzzle: {
    tops: ['#3e4c61', '#37445a'], riser: '#2a3447', deep: '#222a3a', bank: '#3b485d', fill: '#2a3447', hills: 14, step: 2,
    dressing: [['pieces', 0.45], ['pieceStack', 0.3], ['pillar', 0.25]],
  },
  // Block Fortress: green hills round a stone castle.
  fortress: {
    tops: ['#7fa85d', '#739c54'], riser: '#837a6f', deep: '#625c55', bank: '#7ba45a', fill: '#837a6f', hills: 24, step: 3,
    dressing: [['tree', 0.45], ['stoneRock', 0.35], ['bush', 0.2]],
  },
  // Final Level: a dusk-blue world round a glowing portal.
  portal: {
    tops: ['#2e3453', '#292e4b'], riser: '#1d2038', deep: '#15182b', bank: '#2c3150', fill: '#1d2038', hills: 20, step: 3,
    dressing: [['crystal', 0.35], ['pillar', 0.35], ['pieceStack', 0.3]],
  },
};
export const BLOCK_WORLD_NAMES = Object.keys(BLOCK_WORLDS);

const TILE = 12.5;         // metres: the land's square tiles
const STEP_FROM = 14;      // metres from the track where the land starts to step…
const STEP_FULL = 26;      // …and is fully stepped from here out

const hash2 = (a, b) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * The voxel land for `world` over a height field `f` (its clearance(x, z): metres to the track).
 * → { world, heightAt(x, z, h), colourAt(x, y, z, steep) }.
 */
export function makeBlockLand(worldKey, f) {
  const world = BLOCK_WORLDS[worldKey] ?? BLOCK_WORLDS.meadow;
  const { step } = world;
  const tops = world.tops.map((c) => new Color(c));
  const riser = new Color(world.riser);
  const deep = new Color(world.deep);
  const c = new Color();
  return {
    world,
    // Floored to whole steps (never above the land it came from), blending in from the track's banks.
    heightAt(x, z, h) {
      const w = smoothstep(STEP_FROM, STEP_FULL, f.clearance(x, z));
      if (w <= 0) return h;
      const q = Math.floor(h / step) * step;
      return h + (q - h) * w;
    },
    colourAt(x, y, z, steep) {
      // A cliff (a square more than two steps from corner to corner): its earth or stone shows.
      if (steep > step * 2.4) return c.copy(riser).multiplyScalar(0.92 + 0.12 * hash2(Math.floor(x / TILE), Math.floor(z / TILE)));
      const level = Math.floor(y / step);
      c.copy(tops[((level % 2) + 2) % 2]);
      // A terrace's edge: the same land a shade darker, so the layers read without patches of earth.
      if (steep > step * 0.55) c.lerp(riser, 0.18).multiplyScalar(0.86);
      if (y < -40) c.lerp(deep, Math.min(1, (-40 - y) / 30));
      // Each tile a touch lighter or darker: the land reads as blocks.
      return c.multiplyScalar(0.94 + 0.1 * hash2(Math.floor(x / TILE), Math.floor(z / TILE)));
    },
  };
}

// ── Dressing ──────────────────────────────────────────────────────────────────

const MAKE = {
  // A cube tree: a square trunk under a canopy of two or three leaf cubes.
  tree: (lite) => merge([
    cube(0.9, 3, 0.9, 0, 1.5, 0, '#6e5136'),
    cube(3.6, 3, 3.6, 0, 4.4, 0, '#4f8a3f'),
    ...(lite ? [] : [cube(2.2, 1.6, 2.2, 0.3, 6.6, -0.2, '#5f9a48')]),
  ]),
  bush: () => merge([cube(1.8, 1.2, 1.8, 0, 0.6, 0, '#5a9444'), cube(1.0, 0.8, 1.0, 0.5, 1.4, 0.3, '#6aa452')]),
  // A patch of grass cubes with a few small flower cubes in soft colours.
  flowers: () => merge([
    cube(1.6, 0.4, 1.6, 0, 0.2, 0, '#6fa553'),
    cube(0.35, 0.35, 0.35, -0.4, 0.58, 0.3, '#f2d6e4'),
    cube(0.35, 0.35, 0.35, 0.45, 0.58, -0.2, '#f5e7a8'),
    cube(0.35, 0.35, 0.35, 0.1, 0.58, -0.5, '#c9d8f2'),
  ]),
  rock: () => merge([cube(2, 1.4, 1.8, 0, 0.7, 0, '#8f9094', 0.3), cube(1.2, 0.9, 1.1, 0.8, 1.6, 0.2, '#a2a3a7', 0.3)]),
  stoneRock: () => merge([cube(2.2, 1.6, 2, 0, 0.8, 0, '#8a8278', 0.2), cube(1.2, 1, 1.2, -0.6, 2, -0.2, '#9c9489', 0.2)]),
  // A stepped pine: three tiers of dark green cubes, snow on each.
  snowPine: (lite) => merge([
    cube(0.8, 2, 0.8, 0, 1, 0, '#5a4430'),
    ...[[3.6, 2.2], [2.6, 3.8], [1.6, 5.2]].slice(0, lite ? 2 : 3).flatMap(([w, y]) => [
      cube(w, 1.4, w, 0, y, 0, '#3e6a4c'),
      cube(w * 0.9, 0.3, w * 0.9, 0, y + 0.85, 0, '#f2f6fa'),
    ]),
  ]),
  snowRock: () => merge([cube(2.2, 1.4, 2, 0, 0.7, 0, '#7f8995', 0.4), cube(2.0, 0.35, 1.8, 0, 1.55, 0, '#eef3f7', 0.4)]),
  darkRock: () => merge([cube(2.4, 1.6, 2.2, 0, 0.8, 0, '#4a4d54', 0.5), cube(1.4, 1.1, 1.3, 0.6, 2.0, -0.3, '#555961', 0.5)]),
  // A clump of rock with gem cubes set in it.
  gems: () => merge([
    cube(2.2, 1.6, 2, 0, 0.8, 0, '#45484f', 0.2),
    cube(0.5, 0.5, 0.5, 0.6, 1.8, 0.4, '#6fd6dc', 0.6),
    cube(0.4, 0.4, 0.4, -0.5, 1.75, -0.3, '#b48cf0', 0.2),
  ]),
  // A square stone pillar with a warm lamp cube on top.
  pillar: () => merge([cube(1.2, 4.6, 1.2, 0, 2.3, 0, '#6b7179'), cube(0.8, 0.8, 0.8, 0, 5.0, 0, '#f4d28e')]),
  // Basalt: a group of tall dark square columns.
  basalt: () => merge([
    cube(1.4, 5, 1.4, 0, 2.5, 0, '#2c2628'),
    cube(1.2, 3.4, 1.2, 1.3, 1.7, 0.4, '#352e30'),
    cube(1.1, 2.2, 1.1, -0.9, 1.1, 0.9, '#3b3335'),
  ]),
  // A cooling ember cube on a rock, glowing faintly orange.
  embers: () => merge([cube(1.8, 1, 1.6, 0, 0.5, 0, '#2c2628', 0.3), cube(0.6, 0.6, 0.6, 0.2, 1.3, 0.1, '#e8743a', 0.7)]),
  // Our own block pieces lying in the grass: a stepped five and a hooked six, calm colours.
  pieces: () => merge([
    ...[[0, 0], [1, 0], [2, 0], [2, 1], [0, 1]].map(([a, b]) => cube(1.1, 1.1, 1.1, a * 1.12 - 1.1, 0.55, b * 1.12, '#4f9f9a')),
    ...[[0, 0], [0, 1]].map(([a, b]) => cube(1.1, 1.1, 1.1, a * 1.12 + 1.1, 1.65, b * 1.12, '#e2c47e')),
  ]),
  pieceStack: () => merge([
    cube(1.6, 1.6, 1.6, 0, 0.8, 0, '#5d6c8c'),
    cube(1.6, 1.6, 1.6, 0.5, 2.4, 0.3, '#d98a70', 0.4),
    cube(1.2, 1.2, 1.2, 0.2, 3.8, -0.1, '#9d8bbd', 0.8),
  ]),
  // A crystal cube standing on its corner (Final Level), glassy blue.
  crystal: () => merge([
    piece(new BoxGeometry(1.6, 1.6, 1.6), '#8fb8f0', new Matrix4().compose(new Vector3(0, 1.6, 0), new Quaternion().setFromEuler(new Euler(Math.PI / 4, 0.3, Math.atan(Math.SQRT1_2))), new Vector3(1, 1, 1))),
    cube(1.4, 0.4, 1.4, 0, 0.2, 0, '#1d2038'),
  ]),
};

/** A world's dressing: [[make(lite) → geometry with colours, share], …], shares adding up to 1. */
export function blockDressing(worldKey) {
  const world = BLOCK_WORLDS[worldKey] ?? BLOCK_WORLDS.meadow;
  return world.dressing.map(([kind, share]) => [MAKE[kind], share]);
}
