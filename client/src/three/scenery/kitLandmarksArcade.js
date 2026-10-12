/**
 * Landmarks for the Arcade Series: one builder each, origin on the ground, front facing +z,
 * chunky pixel scenery (cubes, not smooth models), merged into the still scenery. Every
 * cabinet, sign and character is our own design: no real games, logos or characters.
 */
import { BoxGeometry, Matrix4 } from 'three';
import { box, merge, piece } from './parts';

const NEON = ['#ff3fa8', '#3fd8ff', '#ffd23f', '#7dff6a', '#a86aff'];

/** One upright cabinet: a dark body, a coloured side, a lit screen and marquee, a little control panel. */
function cabinet(p, x, z, k, yaw = 0, s = 1) {
  const m = (dx, dy, dz) => new Matrix4().makeRotationY(yaw).premultiply(new Matrix4().makeTranslation(x, 0, z)).multiply(new Matrix4().makeTranslation(dx * s, dy * s, dz * s));
  const colour = NEON[k % NEON.length];
  p.push(piece(new BoxGeometry(3 * s, 7 * s, 3 * s), '#141018', m(0, 3.5, 0)));
  p.push(piece(new BoxGeometry(3.1 * s, 6.6 * s, 2.6 * s), colour, m(0, 3.6, -0.3)));
  p.push(piece(new BoxGeometry(2.4 * s, 2 * s, 0.2 * s), NEON[(k + 2) % NEON.length], m(0, 4.6, 1.52)));
  p.push(piece(new BoxGeometry(2.8 * s, 0.9 * s, 0.3 * s), '#fff2c4', m(0, 6.6, 1.4)));
  p.push(piece(new BoxGeometry(3 * s, 0.6 * s, 1.4 * s), '#2a2a34', m(0, 3.1, 2.1)));
}

// ── Joystick Spins ───────────────────────────────────────────────────────────

/** A giant 1980s arcade hall at night (the start): a long dark hall, its open front lit, rows of cabinets inside, a neon sign of our own. */
function arcadeHall() {
  const p = [box(60, 18, 30, 0, 9, -6, '#1a1030'), box(62, 1.4, 32, 0, 18.7, -6, '#2a1a4a')];
  for (let k = 0; k < 8; k += 1) cabinet(p, -24 + k * 7, 10, k, 0, 1.4);
  p.push(box(40, 6, 1.2, 0, 24, 9, '#0a0a12'));
  for (let k = 0; k < 10; k += 1) p.push(box(2.6, 3.4, 1.4, -15 + k * 3.4, 24, 9.4, NEON[k % NEON.length])); // the sign's lit blocks
  for (let k = 0; k < 16; k += 1) p.push(box(0.8, 0.8, 0.6, -28 + k * 3.7, 21.5, 9.6, '#fff2c4'));
  return merge(p);
}

/** A row of cabinets along the hall (beside a sweep): ten machines back to back, lit screens facing the track. */
function cabinetRow() {
  const p = [box(74, 0.6, 9, 0, 0.3, 0, '#2a1a4a')];
  for (let k = 0; k < 10; k += 1) cabinet(p, -33 + k * 7.3, 0, k + 1, 0, 1.6);
  return merge(p);
}

/** The prize counter (past the finish): a long glass counter, shelves of prizes in pixel blocks, ticket streamers. */
function prizeCounter() {
  const p = [box(40, 6, 6, 0, 3, 0, '#3fd8ff'), box(40.4, 0.6, 6.4, 0, 6.3, 0, '#c8ccd2'), box(42, 22, 2, 0, 11, -8, '#1a1030')];
  for (let r = 0; r < 3; r += 1) {
    p.push(box(40, 0.6, 3, 0, 9 + r * 5.5, -6.5, '#c8ccd2'));
    for (let k = 0; k < 9; k += 1) p.push(box(2.6, 2.6, 2.4, -16 + k * 4, 10.6 + r * 5.5, -6.5, NEON[(k + r) % NEON.length]));
  }
  for (let k = 0; k < 12; k += 1) p.push(box(0.8, 8 + (k % 3) * 3, 0.1, -18 + k * 3.3, 2 + (k % 3) * 1.5, 3.4, k % 2 ? '#ff7a1a' : '#ffd23f')); // the ticket streams
  return merge(p);
}

/** A giant claw machine for the middle of a spiral: a tall glass case on a pink base, a heap of prizes, the claw hanging inside. */
function clawTower() {
  const p = [box(10, 6, 10, 0, 3, 0, '#ff3fa8'), box(10.4, 0.6, 10.4, 0, 6.3, 0, '#c8ccd2'), box(9.6, 12, 9.6, 0, 12.6, 0, '#9ad8ff'), box(10.4, 2, 10.4, 0, 19.6, 0, '#ff3fa8')];
  for (let k = 0; k < 8; k += 1) p.push(box(2, 2, 2, -3 + (k % 4) * 2, 7.6 + Math.floor(k / 4) * 2, -1 + (k % 2) * 2, NEON[k % NEON.length]));
  p.push(box(0.3, 6, 0.3, 0, 15.6, 0, '#c8ccd8'), box(2.4, 0.6, 0.6, 0, 12.4, 0, '#c8ccd8'));
  return merge(p);
}

// ── Kill Screen ──────────────────────────────────────────────────────────────

/** A stretch of the huge neon maze beside the track: low glowing walls in a pattern of our own, rows of dots between them. */
function neonMaze() {
  const p = [];
  const walls = [[-30, -12, 24, 1], [-30, 12, 24, 1], [-6, 0, 1, 24], [6, -12, 1, 14], [6, 12, 1, 14], [18, 0, 24, 1], [30, -12, 1, 18], [-18, 0, 1, 12]];
  for (const [x, z, w, d] of walls) p.push(box(w + 0.8, 2.4, d + 0.8, x + w / 2, 1.2, z, '#3a2aff'), box(w, 2.6, d, x + w / 2, 1.3, z, '#ff3fd8'));
  for (let k = 0; k < 14; k += 1) p.push(box(0.9, 0.9, 0.9, -28 + k * 4.2, 0.6, 6, '#ffe9a8'));
  for (let k = 0; k < 10; k += 1) p.push(box(0.9, 0.9, 0.9, 10 + (k % 5) * 4, 0.6, -6 + Math.floor(k / 5) * 12, '#ffe9a8'));
  return merge(p);
}

/** A glitched column for the middle of a spiral: a stack of blocks slipping sideways, half of it scrambled into stray colours. */
function glitchTower() {
  const p = [];
  for (let k = 0; k < 12; k += 1) {
    const slip = k > 5 ? ((k * 7) % 5 - 2) * 0.8 : 0;
    const colour = k > 5 ? ['#0a0a12', '#ff3fa8', '#3fd8ff', '#7dff6a'][k % 4] : '#3a2aff';
    p.push(box(5, 2, 5, slip, 1 + k * 2, (k > 5 ? ((k * 3) % 3 - 1) * 0.6 : 0), colour));
  }
  return merge(p);
}

/** The level sign past the finish: a big dark board, LEVEL in blocks over a counter of three lit digits, the right half breaking into noise. */
function levelSign() {
  const p = [box(30, 16, 2, 0, 20, 0, '#0a0a12'), box(1.2, 14, 1.2, -10, 6, 0, '#2a2a34'), box(1.2, 14, 1.2, 10, 6, 0, '#2a2a34')];
  for (let k = 0; k < 3; k += 1) p.push(box(5, 7, 0.6, -8 + k * 6.5, 19, 1.2, '#ffd23f'));
  for (let k = 0; k < 18; k += 1) p.push(box(1.4, 1.4, 0.7, 3 + (k * 7) % 12, 13 + ((k * 5) % 14), 1.3, ['#ff3fa8', '#3fd8ff', '#7dff6a', '#ffffff'][k % 4])); // the noise
  return merge(p);
}

export const ARCADE_LANDMARKS = {
  'arcade-hall': { build: arcadeHall, radius: 32 },
  'cabinet-row': { build: cabinetRow, radius: 38 },
  'prize-counter': { build: prizeCounter, radius: 22 },
  'claw-tower': { build: clawTower, radius: 6, fit: 6 },
  'neon-maze': { build: neonMaze, radius: 34 },
  'glitch-tower': { build: glitchTower, radius: 5, fit: 5 },
  'level-sign': { build: levelSign, radius: 16 },
};
