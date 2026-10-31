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

/** The worlds. tops: the two tones of level land; riser: a terrace's face; deep: the land far below; floor: the world's ground far out. */
export const BLOCK_WORLDS = {
  // Spawn Point: a calm cube meadow at dawn.
  meadow: {
    tops: ['#86b665', '#79a95b'], riser: '#8c6c4b', deep: '#6d6660', floor: '#79a95b', bank: '#82b162', fill: '#8c6c4b', hills: 24, step: 3,
    dressing: [['tree', 0.45], ['bush', 0.25], ['flowers', 0.2], ['rock', 0.1]],
  },
  // Speedrun Valley: wide cube hills, a little warmer.
  valley: {
    tops: ['#97bd68', '#88b05d'], riser: '#9a7a52', deep: '#6f6a5e', floor: '#88b05d', bank: '#8eb663', fill: '#9a7a52', hills: 34, step: 4,
    dressing: [['tree', 0.5], ['bush', 0.3], ['rock', 0.2]],
  },
  // Voxel Peaks: snowy cube mountains.
  snow: {
    tops: ['#eef3f7', '#e1e8ef'], riser: '#7f8995', deep: '#69737f', floor: '#e1e8ef', bank: '#eaf0f5', fill: '#7f8995', hills: 46, step: 4,
    dressing: [['snowPine', 0.6], ['snowRock', 0.4]],
  },
  // Deep Mine: dark stone underground, gem seams.
  mine: {
    tops: ['#5c6067', '#53575e'], riser: '#3f424a', deep: '#2f3238', floor: '#2f3238', bank: '#575b62', fill: '#3f424a', hills: 30, step: 3,
    dressing: [['darkRock', 0.5], ['gems', 0.25], ['pillar', 0.25]],
  },
  // Magma Core: dark basalt over glowing magma.
  magma: {
    tops: ['#3b3335', '#342d2f'], riser: '#241f21', deep: '#1c1718', floor: '#1c1718', bank: '#3a3234', fill: '#241f21', hills: 28, step: 3,
    dressing: [['basalt', 0.55], ['darkRock', 0.3], ['embers', 0.15]],
  },
  // Line Clear and Combo Drop: a calm tiled plain, slate blue, our own block pieces on it.
  puzzle: {
    tops: ['#62718b', '#596880'], riser: '#424e67', deep: '#36405a', floor: '#36405a', bank: '#5e6d87', fill: '#424e67', hills: 14, step: 2,
    dressing: [['pieces', 0.45], ['pieceStack', 0.3], ['pillar', 0.25]],
  },
  // Block Fortress: green hills round a stone castle.
  fortress: {
    tops: ['#7fa85d', '#739c54'], riser: '#837a6f', deep: '#625c55', floor: '#739c54', bank: '#7ba45a', fill: '#837a6f', hills: 24, step: 3,
    dressing: [['tree', 0.45], ['stoneRock', 0.35], ['bush', 0.2]],
  },
  // Final Level: a dusk-blue world round a glowing portal.
  portal: {
    tops: ['#2e3453', '#292e4b'], riser: '#1d2038', deep: '#15182b', floor: '#15182b', bank: '#2c3150', fill: '#1d2038', hills: 20, step: 3,
    dressing: [['crystal', 0.35], ['pillar', 0.35], ['pieceStack', 0.3]],
  },
  // Sky Islands: green island tops high over a sea of cloud (the land far below is cloud).
  sky: {
    tops: ['#8cc06a', '#7fb35f'], riser: '#a08566', deep: '#e9eff7', floor: '#eef3f9', bank: '#86ba65', fill: '#a08566', hills: 30, step: 3,
    dressing: [['tree', 0.4], ['flowers', 0.25], ['cloud', 0.2], ['rock', 0.15]],
  },
  // Voxel Harbor: quays of grey stone and timber at sunset, container stacks, the water beyond.
  harbour: {
    tops: ['#8a8f96', '#7f848b'], riser: '#5e636a', deep: '#3f6f8a', floor: '#3f6f8a', bank: '#878c93', fill: '#5e636a', hills: 12, step: 2,
    dressing: [['containers', 0.4], ['bollards', 0.25], ['crates', 0.2], ['rock', 0.15]],
  },
  // Sunstone Temple: desert of sand-coloured cubes round a stepped temple.
  temple: {
    tops: ['#e2c48e', '#d8b980'], riser: '#b8955e', deep: '#a8875a', floor: '#d8b980', bank: '#dfc08a', fill: '#b8955e', hills: 22, step: 3,
    dressing: [['sandRock', 0.4], ['palmCube', 0.25], ['ruin', 0.25], ['cactusCube', 0.1]],
  },
  // Bonus Round: a bright stage world of cream and gold tiles at night, lit pillars.
  bonus: {
    tops: ['#3a3456', '#342f4e'], riser: '#262140', deep: '#1c1830', floor: '#1c1830', bank: '#383254', fill: '#262140', hills: 16, step: 2,
    dressing: [['pillar', 0.4], ['crystal', 0.3], ['pieceStack', 0.3]],
  },
  // ── Blocks Series 2 (30 Oct 2026) ──
  // Li River: green rice-field land, grey karst rock in the risers.
  karst: {
    tops: ['#7fb062', '#73a458'], riser: '#8d9187', deep: '#5f6b62', floor: '#73a458', bank: '#7bab5e', fill: '#8d9187', hills: 22, step: 3,
    dressing: [['bamboo', 0.4], ['bush', 0.25], ['rock', 0.2], ['flowers', 0.15]],
  },
  // Venice: pale stone pavements and terracotta, canals between.
  canal: {
    tops: ['#d6cdbb', '#cbc1ae'], riser: '#b8644e', deep: '#3f6f8a', floor: '#3f6f8a', bank: '#d2c9b6', fill: '#b8644e', hills: 10, step: 2,
    dressing: [['lampPost', 0.35], ['planter', 0.35], ['crates', 0.15], ['bush', 0.15]],
  },
  // Niagara: green parkland over a grey-and-tan gorge.
  falls: {
    tops: ['#7fae5f', '#73a254'], riser: '#7d7a72', deep: '#5d6a66', floor: '#73a254', bank: '#7aa95c', fill: '#7d7a72', hills: 26, step: 4,
    dressing: [['tree', 0.5], ['bush', 0.25], ['rock', 0.25]],
  },
  // The Dolomites: pale limestone, high green meadows, larches.
  dolomite: {
    tops: ['#93b86e', '#86ab62'], riser: '#c2bbad', deep: '#9a948a', floor: '#86ab62', bank: '#8fb46a', fill: '#c2bbad', hills: 40, step: 4,
    dressing: [['larch', 0.35], ['paleRock', 0.35], ['flowers', 0.3]],
  },
  // Lapland under the aurora: snow over dark rock, birch woods (year-round; no holiday decorations).
  aurora: {
    tops: ['#e9f0f6', '#dde6ee'], riser: '#5a606a', deep: '#4a505a', floor: '#dde6ee', bank: '#e5ecf3', fill: '#5a606a', hills: 30, step: 3,
    dressing: [['birch', 0.45], ['snowPine', 0.3], ['snowRock', 0.25]],
  },
  // ── Blocks Series 2, the cities (31 Oct 2026) ──
  // Kyoto: moss-green temple grounds, dark grey stone, maples and stone lanterns.
  moss: {
    tops: ['#6f9a52', '#638e48'], riser: '#6a6560', deep: '#4f4c49', floor: '#638e48', bank: '#6c9750', fill: '#6a6560', hills: 14, step: 3,
    dressing: [['maple', 0.35], ['stoneLantern', 0.2], ['bush', 0.25], ['stoneRock', 0.2]],
  },
  // Marrakesh: ochre earth and terracotta walls, palms.
  souk: {
    tops: ['#d4a06a', '#c99560'], riser: '#b5643f', deep: '#8f4f33', floor: '#c99560', bank: '#cf9b66', fill: '#b5643f', hills: 12, step: 2,
    dressing: [['palmCube', 0.35], ['sandRock', 0.25], ['crates', 0.2], ['planter', 0.2]],
  },
  // Singapore: lush tropical green round the bay.
  tropic: {
    tops: ['#5f9e4e', '#549444'], riser: '#7a7f86', deep: '#3d6f86', floor: '#3d6f86', bank: '#5a9a4a', fill: '#7a7f86', hills: 14, step: 2,
    dressing: [['palmCube', 0.3], ['tree', 0.3], ['flowers', 0.2], ['lampPost', 0.2]],
  },
  // Lisbon: cream pavements, terracotta and tile-blue risers, the river below.
  azulejo: {
    tops: ['#ddd3c0', '#d2c7b2'], riser: '#5b84b0', deep: '#3f6f8a', floor: '#3f6f8a', bank: '#d8ceba', fill: '#c4703f', hills: 28, step: 4,
    dressing: [['lampPost', 0.3], ['planter', 0.3], ['tree', 0.25], ['crates', 0.15]],
  },
  // ── Blocks Series 2, the rivers (1 Nov 2026) ──
  // The Douro: steep vineyard terraces on brown schist above a green river.
  vineyard: {
    tops: ['#7f9a48', '#73903f'], riser: '#6a5a4a', deep: '#4f4338', floor: '#3f6f6a', bank: '#7a9644', fill: '#6a5a4a', hills: 30, step: 4,
    dressing: [['vineRow', 0.45], ['tree', 0.2], ['stoneRock', 0.2], ['crates', 0.15]],
  },
  // The Loire: soft green lawns and pale tuffeau stone, clipped hedges.
  chateau: {
    tops: ['#7fae5a', '#73a050'], riser: '#d8d0bc', deep: '#a89f88', floor: '#4f7f8f', bank: '#79a854', fill: '#d8d0bc', hills: 10, step: 2,
    dressing: [['hedge', 0.35], ['tree', 0.3], ['flowers', 0.2], ['bush', 0.15]],
  },
  // The Vltava: a green castle hill, sandstone walls and red roofs above the river.
  bohemia: {
    tops: ['#86a05c', '#7a9452'], riser: '#c8a878', deep: '#8a7458', floor: '#4a6f80', bank: '#82a058', fill: '#c8a878', hills: 22, step: 3,
    dressing: [['tree', 0.4], ['lampPost', 0.25], ['bush', 0.2], ['planter', 0.15]],
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
  // A puff of cloud: three white cubes.
  cloud: () => merge([cube(3.2, 1.6, 2.6, 0, 0.8, 0, '#f4f7fb'), cube(2.2, 1.4, 2.0, 1.4, 1.8, 0.3, '#ffffff'), cube(1.8, 1.0, 1.6, -1.2, 1.5, -0.2, '#eef2f8')]),
  // Shipping containers in calm harbour colours, two stacked.
  containers: (lite) => merge([
    cube(6, 2.6, 2.4, 0, 1.3, 0, '#b8584a'),
    ...(lite ? [] : [cube(6, 2.6, 2.4, 0.3, 3.9, 0.1, '#4f7f9a', 0.05)]),
  ]),
  bollards: () => merge([cube(0.8, 1, 0.8, 0, 0.5, 0, '#3a3e44'), cube(1.1, 0.25, 1.1, 0, 1.1, 0, '#3a3e44'), cube(0.8, 1, 0.8, 2.4, 0.5, 0.6, '#3a3e44')]),
  crates: () => merge([cube(1.4, 1.4, 1.4, 0, 0.7, 0, '#b08a5c'), cube(1.2, 1.2, 1.2, 1.3, 0.6, 0.4, '#9a7448', 0.3), cube(1.1, 1.1, 1.1, 0.4, 1.95, 0.1, '#b08a5c', 0.6)]),
  sandRock: () => merge([cube(2.4, 1.6, 2.0, 0, 0.8, 0, '#c9a46a', 0.3), cube(1.4, 1.0, 1.2, 0.7, 2.0, -0.2, '#d8b980', 0.3)]),
  // A cube palm: a stack of trunk cubes and a cross of leaf blocks.
  palmCube: () => merge([
    ...[0, 1, 2, 3].map((k) => cube(0.7, 1.2, 0.7, k * 0.1, 0.6 + k * 1.2, 0, '#8a6a42')),
    cube(4.4, 0.5, 1.1, 0.3, 5.1, 0, '#4f8a3f'), cube(1.1, 0.5, 4.4, 0.3, 5.1, 0, '#5a9a48'), cube(1.4, 0.8, 1.4, 0.3, 5.5, 0, '#4f8a3f'),
  ]),
  // A ruin: a broken column of sandstone cubes and a fallen block.
  ruin: () => merge([cube(1.4, 3.6, 1.4, 0, 1.8, 0, '#d8b980'), cube(1.6, 0.5, 1.6, 0, 3.85, 0, '#c9a46a'), cube(2.6, 1.3, 1.3, 2, 0.65, 0.8, '#c9a46a', 0.5)]),
  cactusCube: () => merge([cube(0.9, 3.2, 0.9, 0, 1.6, 0, '#5f8a4a'), cube(0.7, 0.7, 0.7, 0.8, 1.8, 0, '#5f8a4a'), cube(0.6, 1.2, 0.6, 1.0, 2.6, 0, '#5f8a4a')]),
  // Blocks Series 2.
  // A clump of bamboo: thin green cube stalks of different heights, a few leaf cubes.
  bamboo: (lite) => merge([
    ...[[0, 0, 6], [0.8, 0.4, 5], [-0.6, 0.7, 4.4], ...(lite ? [] : [[0.3, -0.8, 5.4]])].map(([x, z, h]) => cube(0.3, h, 0.3, x, h / 2, z, '#7fa64e')),
    cube(1.6, 0.6, 1.2, 0.2, 5.6, 0.2, '#6a9a44'),
  ]),
  // A canal-side lamp post: a dark square post, a warm lamp cube.
  lampPost: () => merge([cube(0.3, 3.6, 0.3, 0, 1.8, 0, '#2f3440'), cube(0.6, 0.6, 0.6, 0, 3.9, 0, '#f4d28e')]),
  // A planter of flowers in terracotta.
  planter: () => merge([cube(1.6, 0.8, 0.8, 0, 0.4, 0, '#b8644e'), cube(1.4, 0.5, 0.6, 0, 1.0, 0, '#5f9a48'), cube(0.3, 0.3, 0.3, -0.4, 1.35, 0, '#e86a7a'), cube(0.3, 0.3, 0.3, 0.4, 1.35, 0.1, '#f2d06a')]),
  // A larch: a slim trunk, light green stepped tiers.
  larch: (lite) => merge([
    cube(0.6, 2.2, 0.6, 0, 1.1, 0, '#6e5136'),
    ...[[2.8, 2.6], [2.0, 4.0], [1.2, 5.2]].slice(0, lite ? 2 : 3).map(([w, y]) => cube(w, 1.3, w, 0, y, 0, '#7fae52')),
  ]),
  paleRock: () => merge([cube(2.4, 1.6, 2, 0, 0.8, 0, '#c2bbad', 0.3), cube(1.3, 1.1, 1.2, 0.7, 2.1, -0.2, '#d6cfc1', 0.3)]),
  // A birch: a white trunk with dark bands, a pale yellow-green crown, snow on it.
  birch: (lite) => merge([
    cube(0.45, 4.6, 0.45, 0, 2.3, 0, '#ece8de'),
    cube(0.47, 0.35, 0.47, 0, 1.6, 0, '#2f3440'), cube(0.47, 0.3, 0.47, 0, 3.0, 0, '#2f3440'),
    cube(2.2, 1.6, 2.2, 0, 5.2, 0, '#b9b98a'),
    ...(lite ? [] : [cube(1.8, 0.3, 1.8, 0, 6.1, 0, '#f2f6fa')]),
  ]),
  // The cities (31 Oct 2026). A maple: a dark trunk, a wide red-orange crown.
  maple: (lite) => merge([
    cube(0.6, 2.4, 0.6, 0, 1.2, 0, '#5a4030'),
    cube(3.4, 1.6, 3.0, 0, 3.0, 0, '#c8553a'),
    ...(lite ? [] : [cube(2.2, 1.0, 2.0, 0.3, 4.2, -0.2, '#d8703e')]),
  ]),
  // The rivers (1 Nov 2026). A row of vines: low green blocks on a line of posts.
  vineRow: () => merge([cube(4.4, 0.9, 0.7, 0, 0.75, 0, '#5f8a3a'), cube(0.2, 1.4, 0.2, -2.2, 0.7, 0, '#6e5136'), cube(0.2, 1.4, 0.2, 2.2, 0.7, 0, '#6e5136'), cube(0.5, 0.4, 0.5, 0.8, 0.55, 0.3, '#5a2f4a')]),
  // A clipped hedge: a long dark-green box with a rounder top.
  hedge: () => merge([cube(3.6, 1.4, 1.2, 0, 0.7, 0, '#3f7a3a'), cube(3.2, 0.4, 0.9, 0, 1.6, 0, '#4a8a42')]),
  // A stone lantern: a grey post, a wide cap, a warm light in its box.
  stoneLantern: () => merge([cube(0.6, 1.4, 0.6, 0, 0.7, 0, '#8a8580'), cube(1.0, 0.7, 1.0, 0, 1.75, 0, '#f2d28e'), cube(1.4, 0.35, 1.4, 0, 2.3, 0, '#7a7570')]),
};

/** A world's dressing: [[make(lite) → geometry with colours, share], …], shares adding up to 1. */
export function blockDressing(worldKey) {
  const world = BLOCK_WORLDS[worldKey] ?? BLOCK_WORLDS.meadow;
  return world.dressing.map(([kind, share]) => [MAKE[kind], share]);
}
