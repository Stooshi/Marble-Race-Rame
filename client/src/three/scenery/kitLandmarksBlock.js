/**
 * Landmarks for the Block Series: one builder each, origin on the ground, front facing +z
 * (towards the track; a gateway's opening runs along +z), built of cubes in calm colours and
 * merged into the still scenery. Our own shapes, colours and layouts: no names, creatures,
 * textures or terms from any existing block game, and never the classic four-cube falling
 * pieces in a classic well.
 *
 *   build()        the still parts (lit like everything else)
 *   glow()         parts that give their own light (lamps, gems, magma): drawn unlit
 *   moving         a part turning on the race clock (a windmill's sails, a headframe's wheel)
 *   fx             a quiet effect on the race clock (buildBlockEffects below): block rows
 *                  clearing with a flash as the pack passes, rows lighting one after another,
 *                  new blocks settling on the stack, the split board's lamps, a gate's blocks
 *                  dropping into place, the drawbridge lowering, the portal's glow, the GG lit
 *                  once the winner is home
 */
import {
  BoxGeometry, Color, CylinderGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial, Object3D, Quaternion, Vector3,
} from 'three';
import { merge, piece } from './parts';

const Y = new Vector3(0, 1, 0);
const turned = (x, y, z, yaw = 0, sx = 1, sy = 1, sz = 1) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(Y, yaw), new Vector3(sx, sy, sz));
/** A cube or box of size (w, h, d) centred at (x, y, z). */
const C = (w, h, d, x, y, z, colour, yaw = 0) => piece(new BoxGeometry(w, h, d), colour, turned(x, y, z, yaw));
/** A stack of n cubes of size s from y0 up at (x, z), alternating two colours. */
const column = (n, s, x, y0, z, a, b = a) => Array.from({ length: n }, (_, k) => C(s, s * 0.98, s, x, y0 + s * (k + 0.5), z, k % 2 ? b : a));

// Calm colours shared by the series.
export const BLOCK_COLOURS = {
  stone: '#8e949b', stoneDark: '#6b7179', plank: '#b08a5c', plankDark: '#8a6a45', roof: '#5d6c8c', roofDark: '#4b5874',
  leaf: '#4f8a3f', grass: '#7fae5f', snow: '#eef3f7', basalt: '#2f292b', basaltDark: '#231e20',
  lamp: '#f4d28e', gem: '#6fd6dc', gemLilac: '#b48cf0', magma: '#ff7a33', magmaHot: '#ffc066',
  teal: '#4f9f9a', sand: '#e2c47e', coral: '#d98a70', slate: '#5d6c8c', lilac: '#9d8bbd', ink: '#20263a',
};
const B = BLOCK_COLOURS;
const PIECE_TONES = [B.teal, B.sand, B.coral, B.slate, B.lilac];

// ── Spawn Point ───────────────────────────────────────────────────────────────

/** A spawn beacon: a square stone platform, a pillar of cubes, a soft beam of light rising from it. */
function spawnBeacon() {
  const p = [];
  for (let x = -1; x <= 1; x += 1) for (let z = -1; z <= 1; z += 1) p.push(C(1.9, 0.8, 1.9, x * 2, 0.4, z * 2, (x + z) % 2 ? B.stone : B.stoneDark));
  p.push(...column(3, 1.4, 0, 0.8, 0, B.stoneDark, B.stone));
  return merge(p);
}
// Its light: a lamp cube on the pillar and a column of small light cubes floating up above it, smaller as they rise.
const spawnBeaconGlow = () => merge([C(1.0, 1.0, 1.0, 0, 5.5, 0, B.lamp), ...[0.8, 0.7, 0.6, 0.5, 0.42, 0.35, 0.28].map((s, k) => C(s, s, s, 0, 7.4 + k * 1.9, 0, k % 2 ? '#fff4d6' : '#ffe6a8'))]);

/** A cube cottage: plank walls, a stepped roof of slate cubes, lit windows, a door. */
function cubeCottage() {
  const p = [C(7, 4, 5.5, 0, 2, 0, B.plank), C(7.2, 0.6, 5.7, 0, 0.3, 0, B.stoneDark)];
  for (const x of [-3.5, 3.5]) for (const z of [-2.75, 2.75]) p.push(C(0.8, 4.2, 0.8, x, 2.1, z, B.plankDark));
  for (let k = 0; k < 4; k += 1) p.push(C(7.6 - k * 0, 0.9, 6.2 - k * 1.5, 0, 4.45 + k * 0.9, 0, k % 2 ? B.roofDark : B.roof));
  p.push(C(1.4, 2.4, 0.3, 0, 1.2, 2.8, B.plankDark));
  p.push(C(0.9, 2.2, 0.9, 2.4, 6.6, -1, B.stoneDark)); // the chimney
  return merge(p);
}
const cubeCottageGlow = () => merge([C(1.1, 1.1, 0.2, -2, 2.4, 2.8, B.lamp), C(1.1, 1.1, 0.2, 2, 2.4, 2.8, B.lamp)]);

/** A cube windmill: a square stone tower; its four sails of blocks turn slowly (moving). */
function cubeWindmill() {
  const p = [];
  for (let k = 0; k < 5; k += 1) p.push(C(4.4 - k * 0.4, 2.2, 4.4 - k * 0.4, 0, 1.1 + k * 2.2, 0, k % 2 ? B.stone : B.stoneDark));
  p.push(C(3.4, 1.4, 3.4, 0, 11.7, 0, B.roof), C(2.2, 1, 2.2, 0, 12.9, 0, B.roofDark));
  p.push(C(1.2, 2, 0.3, 0, 1, 2.25, B.plankDark));
  return merge(p);
}
const windmillSails = () => {
  const p = [C(1, 1, 1.4, 0, 0, 0, B.plankDark)];
  for (let k = 0; k < 4; k += 1) {
    const a = (k * Math.PI) / 2;
    const m = new Matrix4().makeRotationZ(a);
    for (let j = 1; j <= 4; j += 1) p.push(piece(new BoxGeometry(j === 4 ? 1.6 : 0.5, 1.6, 0.3), j % 2 ? '#e9e4d6' : B.plank, m.clone().multiply(new Matrix4().makeTranslation(0, j * 1.7, 0.6))));
  }
  return merge(p);
};

/** The split board: a dark board on two cube posts; its three lamps light as the leader passes each quarter (fx). */
function splitBoard() {
  const p = [...column(5, 1.2, -6, 0, 0, B.stoneDark, B.stone), ...column(5, 1.2, 6, 0, 0, B.stoneDark, B.stone)];
  p.push(C(13.4, 4.2, 0.8, 0, 7.6, 0, B.ink), C(13.8, 0.4, 1.0, 0, 9.9, 0, B.stoneDark), C(13.8, 0.4, 1.0, 0, 5.3, 0, B.stoneDark));
  // Three time bars, set in the board (the lamps beside them are the effect).
  for (let k = 0; k < 3; k += 1) p.push(C(2.6, 0.5, 0.2, -2.5 + k * 4, 6.4, 0.45, '#39425c'));
  return merge(p);
}

/** A cube farm: a fence of posts round rows of crop cubes, a small barn. */
function cubeFarm() {
  const p = [];
  for (let x = -4; x <= 4; x += 1) for (const z of [-7, 7]) p.push(C(0.4, 1.2, 0.4, x * 1.6, 0.6, z, B.plankDark));
  for (let z = -4; z <= 4; z += 1) for (const x of [-7, 7]) p.push(C(0.4, 1.2, 0.4, x, 0.6, z * 1.6, B.plankDark));
  for (let r = -2; r <= 2; r += 1) for (let k = -3; k <= 3; k += 1) p.push(C(0.9, 0.9, 0.9, k * 1.6, 0.45, r * 2.4, r % 2 ? '#c9b25a' : '#6faa4a'));
  p.push(C(5, 3.4, 4, 10, 1.7, -2, '#a85a48'), C(5.4, 1, 4.4, 10, 3.9, -2, B.roofDark), C(3.8, 0.8, 3.2, 10, 4.8, -2, B.roof));
  return merge(p);
}

// ── Speedrun Valley / Voxel Peaks ─────────────────────────────────────────────

/** A voxel peak: a mountain of stepped cube layers, rock below, snow above (around a spiral, or beside the track). */
function voxelPeak() {
  const p = [];
  const layers = 9;
  for (let k = 0; k < layers; k += 1) {
    const w = 22 - k * 2.3;
    const colour = k >= 6 ? B.snow : k >= 5 ? '#d9e0e7' : k % 2 ? '#7f8995' : '#727c88';
    p.push(C(w, 3, w * 0.9, (k % 3 - 1) * 0.6, 1.5 + k * 3, (k % 2) * 0.5, colour));
  }
  p.push(C(2.4, 2, 2.4, 0.4, 28, 0.2, B.snow));
  return merge(p);
}

/** A beam tower: a square lattice of timber beams rising high, a lamp cube on top (around a spiral, or beside the track). */
function beamTower() {
  const p = [];
  const H = 24;
  for (const x of [-2.4, 2.4]) for (const z of [-2.4, 2.4]) p.push(C(0.6, H, 0.6, x, H / 2, z, B.plankDark));
  for (let y = 4; y <= H; y += 4) {
    p.push(C(5.4, 0.45, 0.45, 0, y, -2.4, B.plank), C(5.4, 0.45, 0.45, 0, y, 2.4, B.plank));
    p.push(C(0.45, 0.45, 5.4, -2.4, y, 0, B.plank), C(0.45, 0.45, 5.4, 2.4, y, 0, B.plank));
  }
  p.push(C(6, 0.6, 6, 0, H + 0.3, 0, B.plankDark));
  return merge(p);
}
const beamTowerGlow = () => merge([C(1.2, 1.2, 1.2, 0, 25.3, 0, B.lamp)]);

/** A cube cabin: walls of log blocks, a snow-capped stepped roof, a lit window. */
function cubeCabin() {
  const p = [];
  for (let k = 0; k < 4; k += 1) p.push(C(6, 0.9, 5, 0, 0.45 + k * 0.9, 0, k % 2 ? '#7a5636' : '#8e6844'));
  for (let k = 0; k < 3; k += 1) {
    p.push(C(6.6, 0.8, 5.6 - k * 1.7, 0, 4.0 + k * 0.8, 0, '#5a4430'));
    p.push(C(6.6, 0.25, 5.6 - k * 1.7, 0, 4.5 + k * 0.8, 0, B.snow));
  }
  p.push(C(1.2, 2, 0.3, -1.6, 1, 2.6, '#4a3424'));
  return merge(p);
}
const cubeCabinGlow = () => merge([C(1.1, 1, 0.2, 1.4, 1.9, 2.55, B.lamp)]);

// ── Deep Mine ─────────────────────────────────────────────────────────────────

/** A mine entrance: a face of rock blocks, a timber frame round a dark opening, two lamps. */
function mineEntrance() {
  const p = [];
  for (let x = -4; x <= 4; x += 1) for (let y = 0; y < 5; y += 1) {
    if (Math.abs(x) <= 1 && y < 3) continue;
    p.push(C(2.1, 2.1, 2.4 + ((x + y) % 3) * 0.4, x * 2.1, 1.05 + y * 2.1, -0.4, (x + y) % 2 ? '#585c63' : '#4b4f56'));
  }
  p.push(C(6.3, 6.3, 0.6, 0, 3.15, -1.4, '#0e0f12')); // the dark inside
  for (const x of [-2.3, 2.3]) p.push(C(0.6, 6.4, 0.6, x, 3.2, 0.9, B.plankDark));
  p.push(C(5.4, 0.7, 0.7, 0, 6.6, 0.9, B.plank));
  for (const x of [-1.2, 1.2]) p.push(C(0.2, 0.1, 6, x, 0.1, 3, '#5a5d64')); // rails out of it
  return merge(p);
}
const mineEntranceGlow = () => merge([C(0.6, 0.7, 0.6, -3, 5.4, 1.3, B.lamp), C(0.6, 0.7, 0.6, 3, 5.4, 1.3, B.lamp)]);

/** A gem seam: a wall of rock blocks with a band of gem cubes running through it. */
function gemSeam() {
  const p = [];
  for (let x = -5; x <= 5; x += 1) for (let y = 0; y < 4; y += 1) p.push(C(1.8, 1.8, 2 + ((x * 7 + y) % 3) * 0.5, x * 1.8, 0.9 + y * 1.8, 0, (x + y) % 2 ? '#4f535a' : '#454950'));
  return merge(p);
}
const gemSeamGlow = () => {
  const p = [];
  for (let x = -5; x <= 5; x += 1) {
    const y = 2.6 + Math.sin(x * 0.7) * 1.2;
    if (x % 3 === 2) continue;
    p.push(C(0.7, 0.7, 0.4, x * 1.8 + 0.3, y, 1.3, x % 2 ? B.gem : B.gemLilac));
  }
  return merge(p);
};

/** A cart depot: rails on sleepers, two loaded carts, a timber shed. */
function cartDepot() {
  const p = [];
  for (let k = -5; k <= 5; k += 1) p.push(C(2.6, 0.2, 0.5, 0, 0.1, k * 1.2, B.plankDark));
  for (const x of [-0.8, 0.8]) p.push(C(0.15, 0.2, 13.5, x, 0.3, 0, '#5a5d64'));
  for (const z of [-3, 1]) {
    p.push(C(2, 1.3, 2.6, 0, 1.15, z, '#6e4a2e'), C(1.7, 0.6, 2.3, 0, 2.0, z, '#4a4d54'));
    p.push(C(0.6, 0.5, 0.6, 0.3, 2.4, z + 0.4, '#e0b43c'));
  }
  p.push(C(5, 4, 5, -5, 2, 2, B.plank), C(5.6, 0.8, 5.6, -5, 4.4, 2, B.plankDark));
  return merge(p);
}

/** A shaft headframe: a tall timber frame over the shaft; its wheel turns (moving). */
function shaftHeadframe() {
  const p = [];
  for (const x of [-2.2, 2.2]) {
    p.push(C(0.7, 16, 0.7, x, 8, -1.5, B.plankDark), C(0.7, 16, 0.7, x, 8, 1.5, B.plankDark));
    for (let y = 4; y <= 16; y += 4) p.push(C(0.4, 0.4, 3.4, x, y, 0, B.plank));
  }
  p.push(C(5.2, 0.6, 0.6, 0, 16, 0, B.plank), C(6, 1, 6, 0, 0.5, 0, '#3f424a'));
  return merge(p);
}
const headframeWheel = () => {
  const p = [piece(new CylinderGeometry(2.4, 2.4, 0.4, 16, 1, true), '#3a3d44', new Matrix4().makeRotationX(Math.PI / 2))];
  for (let k = 0; k < 4; k += 1) p.push(piece(new BoxGeometry(0.25, 4.6, 0.25), '#4a4d54', new Matrix4().makeRotationZ((k * Math.PI) / 4)));
  return merge(p);
};

// ── Magma Core ────────────────────────────────────────────────────────────────

/** A magma pool: a ring of basalt blocks round glowing magma (glow). */
function magmaPool() {
  const p = [];
  for (let k = 0; k < 16; k += 1) {
    const a = (k / 16) * Math.PI * 2;
    p.push(C(2.6, 1.2 + (k % 3) * 0.5, 2.2, Math.cos(a) * 9, 0.6, Math.sin(a) * 7, k % 2 ? B.basalt : B.basaltDark, -a));
  }
  return merge(p);
}
const magmaPoolGlow = () => {
  const p = [];
  for (let x = -3; x <= 3; x += 1) for (let z = -2; z <= 2; z += 1) {
    if (Math.hypot(x / 3.6, z / 2.6) > 1) continue;
    p.push(C(2.2, 0.3, 2.2, x * 2.2, 0.15, z * 2.2, (x + z) % 2 ? B.magma : B.magmaHot));
  }
  return merge(p);
};

/** A basalt spire: a cluster of tall dark square columns (around a spiral, or beside the track). */
function basaltSpire() {
  const p = [];
  const cols = [[0, 0, 24], [2.2, 0.6, 18], [-2, 1, 15], [0.8, -2.2, 20], [-1.4, -1.8, 12], [2.6, -1.6, 9]];
  for (const [x, z, h] of cols) p.push(C(2, h, 2, x, h / 2, z, h > 16 ? B.basalt : B.basaltDark), C(2.1, 0.3, 2.1, x, h + 0.15, z, '#3d3537'));
  return merge(p);
}
const basaltSpireGlow = () => merge([C(0.5, 6, 0.5, 1.15, 5, 0.3, B.magma), C(0.5, 4, 0.5, -1.05, 3, -0.4, B.magma)]);

/** Lava falls: a basalt cliff of blocks, a fall of glowing blocks down its face into a pool (glow). */
function lavaFalls() {
  const p = [];
  for (let x = -5; x <= 5; x += 1) {
    const h = 6 - Math.abs(x) * 0.4 + (x % 2) * 0.6;
    for (let y = 0; y < h; y += 1) {
      if (Math.abs(x) <= 1 && y < h) continue; // (the fall)
      p.push(C(2, 2, 2.4, x * 2, 1 + y * 2, -1, (x + y) % 2 ? B.basalt : B.basaltDark));
    }
  }
  for (let k = -4; k <= 4; k += 1) p.push(C(2, 1, 2, k * 2, 0.5, 3.4, B.basaltDark));
  return merge(p);
}
const lavaFallsGlow = () => {
  const p = [];
  for (let y = 0; y < 11; y += 1) for (let x = -1; x <= 1; x += 1) p.push(C(1.9, 1.9, 0.8, x * 2, 1 + y * 1.9, -0.6 + ((x + y) % 2) * 0.2, (x + y) % 2 ? B.magma : B.magmaHot));
  for (let k = -3; k <= 3; k += 1) p.push(C(2, 0.3, 2.4, k * 2, 0.3, 1.2, k % 2 ? B.magma : B.magmaHot));
  return merge(p);
};

// ── Line Clear / Combo Drop / The Stack ───────────────────────────────────────

const ROWS = { cols: 9, rows: 5, size: 1.2, base: 1.0 };
// Our own arrangement: the two bottom rows full (they clear), the upper rows with gaps, coloured in our own way.
const ROW_FILL = [
  '111111111',
  '111111111',
  '110111011',
  '010110010',
  '000100010',
];

/** Clear rows: a stone plinth and frame; the coloured block rows in it are the effect (fx 'clear-rows'). */
function clearRows() {
  const { cols, rows, size, base } = ROWS;
  const W = cols * size;
  const p = [C(W + 2, base, 2.2, 0, base / 2, 0, B.stoneDark)];
  for (const x of [-1, 1]) p.push(C(0.8, rows * size + 1.2, 1.6, x * (W / 2 + 0.6), base + (rows * size + 1.2) / 2 - 0.2, 0, B.stone));
  p.push(C(W + 2, 0.6, 1.6, 0, base + rows * size + 1.1, 0, B.stone));
  return merge(p);
}

/** A block well: a wide stone basin, its floor filled with our own pieces settled in place (seven wide). */
function blockWell() {
  const p = [];
  const s = 1.4;
  for (const x of [-1, 1]) p.push(C(1, 9, 2, x * 5.6, 4.5, 0, B.stone));
  p.push(C(12.2, 1, 2.4, 0, 0.5, 0, B.stoneDark));
  const fill = ['1111101', '1101111', '0111100', '0010100'];
  fill.forEach((row, r) => [...row].forEach((v, c) => { if (v === '1') p.push(C(s * 0.96, s * 0.96, s * 0.96, (c - 3) * s, 1 + s * (r + 0.5), 0, PIECE_TONES[(c * 3 + r * 2) % 5])); }));
  return merge(p);
}

/** Combo rows: a stand of five steps rising back from the track; the lamp rows on them are the effect (fx 'combo-rows'). */
function comboRows() {
  const p = [];
  for (let k = 0; k < 5; k += 1) p.push(C(10, 1.2 * (k + 1), 1.6, 0, 0.6 * (k + 1), -k * 1.6, k % 2 ? B.stone : B.stoneDark));
  return merge(p);
}

/** The settling stack: a tower of our own block pieces; new blocks settle on its top (fx 'settling-stack'). */
function settlingStack() {
  const p = [];
  const s = 2;
  for (let layer = 0; layer < 8; layer += 1) {
    for (let x = -1; x <= 1; x += 1) for (let z = -1; z <= 1; z += 1) {
      const k = layer * 9 + (x + 1) * 3 + (z + 1);
      if ((k * 7) % 11 === 3 && layer > 1) continue; // (a gap here and there)
      p.push(C(s * 0.97, s * 0.97, s * 0.97, x * s + (layer % 2) * 0.15, s * (layer + 0.5), z * s, PIECE_TONES[(k * 3 + layer) % 5]));
    }
  }
  return merge(p);
}
const STACK_TOP = 16; // metres: the stack's top, where new blocks settle

/** A block hall: a long hall of stone blocks with square pillars and a stepped roof. */
function blockHall() {
  const p = [C(18, 1, 9, 0, 0.5, 0, B.stoneDark)];
  for (let k = -4; k <= 4; k += 1) p.push(...column(4, 1.2, k * 2.1, 1, 3.6, B.stone, B.stoneDark));
  p.push(C(18, 5, 6, 0, 3.5, -1.2, '#7a8089'));
  for (let k = 0; k < 3; k += 1) p.push(C(19 - k * 2, 0.9, 9.6 - k * 2.4, 0, 6.4 + k * 0.9, 0, k % 2 ? B.roofDark : B.roof));
  return merge(p);
}

// ── Block Fortress ────────────────────────────────────────────────────────────

/** A voxel castle: walls with square battlements, four corner towers, a keep in the middle. */
function voxelCastle() {
  const p = [];
  const W = 30;
  for (const [x, z, w, d] of [[0, W / 2, W, 2], [0, -W / 2, W, 2], [W / 2, 0, 2, W], [-W / 2, 0, 2, W]]) {
    p.push(C(w, 7, d, x, 3.5, z, B.stone));
    const n = Math.round(Math.max(w, d) / 2.4);
    for (let k = 0; k < n; k += 2) {
      const t = -Math.max(w, d) / 2 + 1.2 + k * 2.4;
      p.push(C(w > d ? 1.4 : 2.2, 1.4, w > d ? 2.2 : 1.4, x + (w > d ? t : 0), 7.7, z + (w > d ? 0 : t), B.stoneDark));
    }
  }
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    p.push(C(5, 11, 5, x * W / 2, 5.5, z * W / 2, B.stoneDark));
    p.push(C(5.8, 1.2, 5.8, x * W / 2, 11.6, z * W / 2, B.stone));
  }
  p.push(C(10, 16, 10, 0, 8, -2, '#7a8089'), C(11, 1.4, 11, 0, 16.7, -2, B.stoneDark), C(6, 4, 6, 0, 19.4, -2, B.roof));
  p.push(C(6, 5, 2.2, 0, 2.5, W / 2 + 0.1, '#2a2c33')); // the gate
  return merge(p);
}

/** A drawbridge: a gatehouse of two towers over a moat; its bridge of planks lowers as the pack comes (fx 'drawbridge'). */
function drawbridge() {
  const p = [];
  for (const x of [-4, 4]) p.push(C(3.6, 12, 3.6, x, 6, -1, B.stoneDark), C(4.2, 1.2, 4.2, x, 12.6, -1, B.stone));
  p.push(C(4.4, 4, 3.2, 0, 9, -1, B.stone), C(4.4, 7, 0.6, 0, 3.5, -2.4, '#1c1d22'));
  p.push(C(12, 0.8, 8, 0, -0.6, 4.2, '#3f6a86')); // the moat's water, a little below the land
  return merge(p);
}
const DRAWBRIDGE = { hingeZ: 0.9, length: 7, width: 4.2 };

/** The block gate: two pillars of cubes either side of the track; its lintel blocks drop into place as the pack comes (fx 'block-gate'). */
function blockGate() {
  const p = [];
  for (const x of [-9, 9]) p.push(...column(6, 1.8, x, 0, 0, B.stone, B.stoneDark), C(2.4, 0.6, 2.4, x, 11.1, 0, B.stoneDark));
  return merge(p);
}
const GATE = { cubes: 9, size: 2.0, y: 12.4, drop: 16 };

// ── Final Level ───────────────────────────────────────────────────────────────

/** The block portal: a square ring of dark blocks over the track; its inner frame glows (fx 'block-portal'). */
function blockPortal() {
  const p = [];
  for (const x of [-9, 9]) p.push(...column(8, 1.8, x, 0, 0, '#2a2e48', '#20243c'));
  for (let k = -5; k <= 5; k += 1) p.push(C(1.8, 1.8, 1.8, k * 1.8, 15.3, 0, k % 2 ? '#2a2e48' : '#20243c'));
  return merge(p);
}

/** Level pillars: a ring of square pillars of blocks, lamps on top (around a spiral). */
function levelPillars() {
  const p = [];
  for (let k = 0; k < 8; k += 1) {
    const a = (k / 8) * Math.PI * 2;
    const h = 5 + (k % 3) * 2;
    p.push(...column(h, 1.4, Math.cos(a) * 9, 0, Math.sin(a) * 9, '#2a2e48', '#353a5a'));
  }
  p.push(C(6, 0.8, 6, 0, 0.4, 0, '#20243c'));
  return merge(p);
}
const levelPillarsGlow = () => merge(Array.from({ length: 8 }, (_, k) => {
  const a = (k / 8) * Math.PI * 2;
  const h = 5 + (k % 3) * 2;
  return C(0.9, 0.9, 0.9, Math.cos(a) * 9, h * 1.4 + 0.5, Math.sin(a) * 9, k % 2 ? B.gem : B.gemLilac);
}));

// "GG" in cubes, five wide and seven high a letter (our own lettering).
const GG = ['01110', '10001', '10000', '10111', '10001', '10001', '01110'];
const GG_CELL = 1.1;
/** The GG arch past the finish: two cube posts and a lintel; the GG on top lights up once the winner is home (fx 'gg-arch'). */
function ggArch() {
  const p = [];
  for (const x of [-10, 10]) p.push(...column(7, 1.6, x, 0, 0, '#2a2e48', '#353a5a'));
  p.push(C(22, 1.6, 1.8, 0, 12, 0, '#20243c'));
  return merge(p);
}

export const BLOCK_LANDMARKS = {
  'spawn-beacon': { build: spawnBeacon, glow: spawnBeaconGlow, radius: 5 },
  'cube-cottage': { build: cubeCottage, glow: cubeCottageGlow, radius: 7 },
  'cube-windmill': { build: cubeWindmill, radius: 6, moving: { build: windmillSails, pivot: [0, 9.5, 2.6], axis: [0, 0, 1], speed: 0.5 } },
  'split-board': { build: splitBoard, radius: 8, fx: 'split-board' },
  'cube-farm': { build: cubeFarm, radius: 14 },
  'voxel-peak': { build: voxelPeak, radius: 14, fit: 11 },
  'beam-tower': { build: beamTower, glow: beamTowerGlow, radius: 5, fit: 3.2 },
  'cube-cabin': { build: cubeCabin, glow: cubeCabinGlow, radius: 6 },
  'mine-entrance': { build: mineEntrance, glow: mineEntranceGlow, radius: 10 },
  'gem-seam': { build: gemSeam, glow: gemSeamGlow, radius: 11 },
  'cart-depot': { build: cartDepot, radius: 9 },
  'shaft-headframe': { build: shaftHeadframe, radius: 5, moving: { build: headframeWheel, pivot: [0, 16.8, 0], axis: [0, 0, 1], speed: 0.8 } },
  'magma-pool': { build: magmaPool, glow: magmaPoolGlow, radius: 11 },
  'basalt-spire': { build: basaltSpire, glow: basaltSpireGlow, radius: 5, fit: 3.6 },
  'lava-falls': { build: lavaFalls, glow: lavaFallsGlow, radius: 12 },
  'clear-rows': { build: clearRows, radius: 7, fx: 'clear-rows' },
  'block-well': { build: blockWell, radius: 7 },
  'combo-rows': { build: comboRows, radius: 7, fx: 'combo-rows' },
  'settling-stack': { build: settlingStack, radius: 5, fit: 3.2, fx: 'settling-stack' },
  'block-hall': { build: blockHall, radius: 10 },
  'voxel-castle': { build: voxelCastle, radius: 24 },
  drawbridge: { build: drawbridge, radius: 8, fx: 'drawbridge' },
  'block-gate': { build: blockGate, radius: 10, fx: 'block-gate' },
  'block-portal': { build: blockPortal, radius: 10, fx: 'block-portal' },
  'gg-arch': { build: ggArch, radius: 11, fx: 'gg-arch' },
  'level-pillars': { build: levelPillars, glow: levelPillarsGlow, radius: 10, fit: 10 },
};

// ── The quiet effects, on the race clock ──────────────────────────────────────

const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const fall = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t); // (speeding up as it falls)
const lambert = () => new MeshLambertMaterial({ flatShading: true });
const basic = () => new MeshBasicMaterial();
const dummy = new Object3D();
const tint = new Color();

/** Instanced cubes: { mesh, set(k, x, y, z, s, colour) }. */
function cubes(name, count, material, size = 1) {
  const mesh = new InstancedMesh(new BoxGeometry(size, size, size), material, count);
  mesh.name = name;
  mesh.frustumCulled = false;
  const set = (k, x, y, z, s = 1, colour = null, sy = s) => {
    dummy.position.set(x, y, z);
    dummy.scale.set(s, sy, s);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(k, dummy.matrix);
    if (colour) mesh.setColorAt(k, tint.set(colour));
  };
  return { mesh, set, done: () => { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; } };
}

/**
 * The effects of the placed Block Series landmarks. `placed`: [{ name, foot, q, scale, p }]
 * (p: where along the track, 0 to 1). → { group, update(t, ctx) } or null.
 * Every effect follows the race clock and the leader's progress (ctx.frame.p), so every
 * viewer and every replay sees the same; rewound past its moment, an effect is undone.
 */
export function buildBlockEffects(placed, { lite = false } = {}) {
  const mine = placed.filter((x) => BLOCK_LANDMARKS[x.name]?.fx);
  if (!mine.length) return null;
  const group = new Group();
  group.name = 'block effects';
  const effects = [];
  for (const pl of mine) {
    const root = new Group();
    root.position.copy(pl.foot);
    root.quaternion.copy(pl.q);
    root.scale.setScalar(pl.scale ?? 1);
    group.add(root);
    const fx = BLOCK_LANDMARKS[pl.name].fx;
    let from = null; // (the race time its moment came)
    const moment = (t, lead, at) => {
      if (lead < at) from = null;
      else if (from === null || t < from) from = t;
      return from === null ? null : (t - from) / 1000;
    };
    if (fx === 'clear-rows') {
      // The full rows flash and clear as the leader passes; the rows above settle down into their place.
      const { cols, rows, size, base } = ROWS;
      const cells = [];
      ROW_FILL.forEach((row, r) => [...row].forEach((v, c) => { if (v === '1') cells.push({ r, c, colour: PIECE_TONES[(c * 2 + r * 3) % 5] }); }));
      const clearing = cells.filter((x) => x.r < 2);
      const above = cells.filter((x) => x.r >= 2);
      const flashMat = lambert();
      flashMat.emissive = new Color('#ffffff');
      const low = cubes('clear rows: clearing', clearing.length, flashMat, size * 0.96);
      const high = cubes('clear rows: above', above.length, lambert(), size * 0.96);
      root.add(low.mesh, high.mesh);
      const xOf = (c) => (c - (cols - 1) / 2) * size;
      const yOf = (r) => base + size * (r + 0.5);
      effects.push((t, lead) => {
        const s = moment(t, lead, pl.p - 0.006);
        const flash = s === null ? 0 : s < 0.25 ? s / 0.25 : Math.max(0, 1 - (s - 0.25) / 0.3);
        flashMat.emissiveIntensity = 0.85 * flash;
        const gone = s === null ? 0 : ease((s - 0.3) / 0.3);
        clearing.forEach((x, k) => low.set(k, xOf(x.c), yOf(x.r), 0, Math.max(0.001, 1 - gone), x.colour));
        const drop = s === null ? 0 : fall((s - 0.6) / 0.35) * 2 * size;
        above.forEach((x, k) => high.set(k, xOf(x.c), yOf(x.r) - drop, 0, 1, x.colour));
        low.done();
        high.done();
      });
      continue;
    }
    if (fx === 'combo-rows') {
      // Five rows of lamp blocks on the steps light one after another, from the track back, as the leader passes.
      const n = 5;
      const per = 7;
      const lamps = cubes('combo rows', n * per, basic(), 1.0);
      root.add(lamps.mesh);
      const dim = '#2f3648';
      effects.push((t, lead) => {
        const s = moment(t, lead, pl.p - 0.01);
        for (let k = 0; k < n; k += 1) {
          const lit = s !== null && s >= k * 0.45;
          for (let j = 0; j < per; j += 1) lamps.set(k * per + j, (j - (per - 1) / 2) * 1.35, 1.2 * (k + 1) + 0.5, -k * 1.6 + 0.3, 1, lit ? PIECE_TONES[(k + j) % 5] : dim);
        }
        lamps.done();
      });
      continue;
    }
    if (fx === 'settling-stack') {
      // Every 6 s a new block drops onto the stack's top and settles; when four have filled the
      // layer, it flashes and clears, and the next layer begins (a 30 s cycle).
      const s = 2;
      const slots = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
      const mat = lambert();
      mat.emissive = new Color('#ffffff');
      const top = cubes('settling stack', slots.length, mat, s * 1.94);
      root.add(top.mesh);
      effects.push((t) => {
        const c = ((t / 1000) % 30 + 30) % 30;
        const clearing = c >= 26 ? (c - 26) / 1.2 : 0;
        mat.emissiveIntensity = clearing > 0 ? 0.7 * Math.max(0, 1 - Math.abs(clearing - 0.3) / 0.3) : 0;
        slots.forEach(([x, z], k) => {
          const u = (c - (2 + k * 6)) / 1.4; // (each falls for 1.4 s)
          const y = u < 0 ? STACK_TOP + 40 : STACK_TOP + s + 18 * (1 - fall(Math.min(1, u)));
          const scale = clearing > 0.5 ? Math.max(0.001, 1 - (clearing - 0.5) / 0.5) : 1;
          top.set(k, (x * s) / 2, y, (z * s) / 2, u < 0 ? 0.001 : scale, PIECE_TONES[(k * 2 + 1) % 5]);
        });
        top.done();
      });
      continue;
    }
    if (fx === 'split-board') {
      // Three lamps beside the time bars light as the leader passes each quarter; all three turn gold once the winner is home.
      const lamps = cubes('split lamps', 3, basic(), 0.7);
      root.add(lamps.mesh);
      effects.push((t, lead) => {
        for (let k = 0; k < 3; k += 1) lamps.set(k, -4.3 + k * 4, 6.4, 0.5, 1, lead >= 1 ? '#ffd27a' : lead >= (k + 1) / 4 ? '#7fe0a0' : '#3a4256');
        lamps.done();
      });
      continue;
    }
    if (fx === 'block-gate') {
      // The lintel's blocks hang high above the gate; as the pack comes they drop into place one by one.
      const { cubes: n, size, y, drop } = GATE;
      const lintel = cubes('gate blocks', n, lambert(), size * 0.97);
      root.add(lintel.mesh);
      effects.push((t, lead) => {
        const s = moment(t, lead, pl.p - 0.035);
        for (let k = 0; k < n; k += 1) {
          const u = s === null ? 0 : fall((s - k * 0.12) / 0.6);
          lintel.set(k, (k - (n - 1) / 2) * size, y + (drop + (k % 3) * 2) * (1 - u), 0, 1, k % 2 ? B.stone : B.stoneDark);
        }
        lintel.done();
      });
      continue;
    }
    if (fx === 'drawbridge') {
      // The bridge stands up against the gatehouse, and lowers over the moat as the pack comes.
      const { hingeZ, length, width } = DRAWBRIDGE;
      const hinge = new Group();
      hinge.position.set(0, 0.2, hingeZ);
      const deck = new Mesh(merge([C(width, 0.4, length, 0, 0, length / 2, B.plank), ...[0.25, 0.5, 0.75].map((f) => C(width + 0.1, 0.45, 0.25, 0, 0, length * f, B.plankDark))]), new MeshLambertMaterial({ vertexColors: true, flatShading: true }));
      deck.name = 'drawbridge deck';
      hinge.add(deck);
      root.add(hinge);
      effects.push((t, lead) => {
        const s = moment(t, lead, pl.p - 0.03);
        hinge.rotation.x = -(Math.PI / 2) * (1 - ease(s === null ? 0 : s / 2.5));
      });
      continue;
    }
    if (fx === 'block-portal') {
      // The inner frame glows, slowly shifting from blue to violet; brighter for a moment as the leader passes through.
      const frame = new Mesh(merge([
        ...[-1, 1].map((x) => C(0.6, 13.2, 0.6, x * 7.7, 7.6, 0, '#ffffff')),
        C(15.4, 0.6, 0.6, 0, 14.0, 0, '#ffffff'),
      ]), new MeshBasicMaterial({ vertexColors: true }));
      frame.name = 'portal glow';
      root.add(frame);
      const a = new Color('#6fb8ff');
      const b = new Color('#b48cf0');
      effects.push((t, lead) => {
        const s = moment(t, lead, pl.p - 0.004);
        const boost = s === null ? 0 : Math.max(0, 1 - s / 1.2);
        frame.material.color.copy(a).lerp(b, 0.5 + 0.5 * Math.sin(t / 1000 * 0.8)).lerp(new Color('#ffffff'), 0.6 * boost);
      });
      continue;
    }
    if (fx === 'gg-arch') {
      // GG on top of the arch: dim until the winner is home, then lit warm white.
      const cells = [];
      for (const [letter, dx] of [[GG, -3.4], [GG, 3.4]]) letter.forEach((row, r) => [...row].forEach((v, c) => { if (v === '1') cells.push([dx + (c - 2) * GG_CELL, 13.5 + (6 - r) * GG_CELL]); }));
      const gg = cubes('GG', cells.length, basic(), GG_CELL * 0.92);
      root.add(gg.mesh);
      effects.push((t, lead) => {
        const lit = lead >= 1;
        cells.forEach(([x, y], k) => gg.set(k, x, y, 0, 1, lit ? '#fff1cf' : '#3a4060'));
        gg.done();
      });
    }
  }
  const update = (t, ctx = {}) => {
    const p = ctx.frame?.p ?? [];
    let lead = 0;
    for (const x of p) if (x > lead) lead = x;
    for (const e of effects) e(t, lead);
  };
  update(0);
  return { group, update, lite };
}
