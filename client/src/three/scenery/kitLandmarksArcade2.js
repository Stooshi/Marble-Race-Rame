/**
 * The Arcade tables of 28 Nov 2026 (Moses: the Arcade pack towards 20): one signature landmark of its own per track,
 * beside the gate, in the series' chunky pixel style (cubes, not smooth models). Every shape is our own design: no
 * real game's characters, logos or cabinets. Looks only: landmarks never touch a marble.
 *   brick-paddle    Brick Breaker: a wall of coloured bricks with a gap knocked in it, a paddle and a ball under it
 *   pixel-snake     Neon Snake: a long pixel snake coiled on a grid of tiles, a pixel apple by its head
 *   dance-pad       Rhythm Rush: a giant dance pad with its four lit arrows, a speaker stack and falling notes
 *   mole-machine    Mole Mayhem: a whack-the-mole machine, its holes and pixel moles popping up, a big mallet
 *   bubble-cannon   Bubble Pop: a bubble cannon on its base, a ceiling of stacked coloured bubbles over it
 *   skee-lanes      Skee Hall: three ramped prize lanes with their target rings and a prize ticket stack
 *   pixel-keep      Pixel Dungeon: a pixel keep with its towers and lit windows, a pixel torch and a treasure chest
 */
import { box, merge } from './parts';

const NEON = ['#ff3fa8', '#3fd8ff', '#ffd23f', '#7dff6a', '#a86aff', '#ff7a1a'];

function brickPaddle() {
  const p = [];
  for (let r = 0; r < 6; r += 1) {
    for (let c = 0; c < 10; c += 1) {
      if (r < 3 && c >= 4 && c <= 5) continue; // the gap knocked in it
      p.push(box(2.6, 1.2, 1.4, -12.6 + c * 2.8, 14 + r * 1.4, 0, NEON[r % NEON.length]));
    }
  }
  for (const x of [-14.6, 14.6]) p.push(box(1, 24, 1.6, x, 12, 0, '#2a2a34')); // the side walls
  p.push(box(30.2, 1, 1.6, 0, 23.6, 0, '#2a2a34'));
  p.push(box(7, 1, 1.4, 3, 3, 0, '#f2f6fa')); // the paddle
  p.push(box(1.4, 1.4, 1.4, 0, 9, 0, '#ffd23f')); // the ball, on its way up
  return merge(p);
}

function pixelSnake() {
  const p = [box(26, 0.4, 26, 0, 0.2, 0, '#0a1a14')];
  for (let k = -6; k <= 6; k += 1) { p.push(box(26, 0.1, 0.2, 0, 0.45, k * 2, '#1f5a3a')); p.push(box(0.2, 0.1, 26, k * 2, 0.45, 0, '#1f5a3a')); }
  // The snake: a square spiral of cubes, darker every other one, its head lifted.
  const cells = [];
  let x = 0; let z = 0; let step = 1; let dir = 0;
  const D = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  while (cells.length < 40) {
    for (let r = 0; r < 2 && cells.length < 40; r += 1) {
      for (let s = 0; s < step && cells.length < 40; s += 1) { cells.push([x, z]); x += D[dir][0]; z += D[dir][1]; }
      dir = (dir + 1) % 4;
    }
    step += 1;
  }
  cells.forEach(([cx, cz], k) => p.push(box(1.8, 1.8, 1.8, cx * 2, 1.4, cz * 2, k % 2 ? '#3fe86a' : '#2ab84a')));
  const [hx, hz] = cells[cells.length - 1];
  p.push(box(2.2, 2.2, 2.2, hx * 2, 3.2, hz * 2, '#7dff6a'));
  p.push(box(0.5, 0.5, 0.5, hx * 2 + 0.6, 3.8, hz * 2 + 1.1, '#0a0a12'));
  p.push(box(1.8, 1.8, 1.8, hx * 2 + 4, 1.4, hz * 2, '#ff3f3f')); // the apple
  p.push(box(0.4, 0.8, 0.4, hx * 2 + 4, 2.7, hz * 2, '#3a2a1a'));
  return merge(p);
}

function dancePad() {
  const p = [box(18, 1, 18, 0, 0.5, 0, '#1a1a24')];
  for (const [ax, az, c] of [[0, -5.5, '#ff3fa8'], [0, 5.5, '#3fd8ff'], [-5.5, 0, '#ffd23f'], [5.5, 0, '#7dff6a']]) {
    p.push(box(5, 0.3, 5, ax, 1.15, az, '#2a2a34'));
    p.push(box(2.6, 0.3, 2.6, ax, 1.4, az, c));
  }
  for (const x of [-12, 12]) { // the speaker stacks
    for (let k = 0; k < 3; k += 1) { p.push(box(5, 4, 4, x, 2 + k * 4.2, -4, '#14141e')); p.push(box(3, 3, 0.3, x, 2 + k * 4.2, -1.9, '#3a3a4a')); }
  }
  for (const [x, y, c] of [[-5, 16, '#ff3fa8'], [0, 20, '#3fd8ff'], [5, 15, '#ffd23f'], [-2, 24, '#7dff6a']]) { // falling notes
    p.push(box(1.6, 1.6, 0.6, x, y, -4, c)); p.push(box(0.4, 3, 0.4, x + 0.6, y + 2, -4, c));
  }
  return merge(p);
}

function moleMachine() {
  const p = [box(20, 6, 12, 0, 3, 0, '#7a3a1a'), box(20.4, 0.6, 12.4, 0, 6.3, 0, '#ffd23f')];
  for (let r = 0; r < 2; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      const x = -6 + c * 6; const z = -2.5 + r * 5;
      p.push(box(3.4, 0.3, 3.4, x, 6.7, z, '#0a0a12')); // the hole
      if ((r + c) % 2 === 0) { // a mole popping up
        p.push(box(2.4, 3, 2.4, x, 8.2, z, '#8a5a3a'));
        p.push(box(1, 0.8, 0.6, x, 8.6, z + 1.3, '#f2b8a0'));
        for (const s of [-0.6, 0.6]) p.push(box(0.4, 0.4, 0.3, x + s, 9.4, z + 1.25, '#0a0a12'));
      }
    }
  }
  p.push(box(14, 6, 1, 0, 12, -6, '#14141e')); // the score sign
  for (let k = 0; k < 5; k += 1) p.push(box(1.6, 2.4, 0.4, -4.4 + k * 2.2, 12, -5.4, NEON[k]));
  p.push(box(1, 10, 1, 13, 5, 3, '#c89a5a')); // the mallet
  p.push(box(4, 3.4, 3.4, 13, 11, 3, '#ff3f3f'));
  return merge(p);
}

function bubbleCannon() {
  const p = [box(6, 3, 6, 0, 1.5, 0, '#2a2a34'), box(3, 3, 3, 0, 4.5, 0, '#5a5a6a')];
  for (let k = 0; k < 4; k += 1) p.push(box(1.8, 1.8, 1.8, 0, 6.5 + k * 1.4, 0.6 + k * 0.9, '#8a8a9a')); // the barrel, tipped up
  p.push(box(2.4, 2.4, 2.4, 0, 6.6 + 4 * 1.4, 0.6 + 4 * 0.9, '#3fd8ff')); // a bubble in it
  // The ceiling of stacked bubbles: three rows of coloured cubes on a dark beam.
  p.push(box(30, 1, 3, 0, 24, -2, '#14141e'));
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 10 - r; c += 1) p.push(box(2.4, 2.4, 2.4, -11.7 + c * 2.6 + r * 1.3, 22 - r * 2.3, -2, NEON[(c + r * 2) % NEON.length]));
  }
  for (const x of [-15, 15]) p.push(box(1, 24, 1, x, 12, -2, '#2a2a34'));
  return merge(p);
}

function skeeLanes() {
  const p = [];
  for (let k = 0; k < 3; k += 1) {
    const x = -8 + k * 8;
    p.push(box(6, 1, 16, x, 0.5, 0, '#7a4a2a')); // the lane
    p.push(box(6.4, 2, 0.6, x, 1, 8, '#5a3418'));
    for (let s = 0; s < 6; s += 1) p.push(box(6, 0.5 + s * 0.9, 1.4, x, 0.25 + s * 0.45 + 1, -7 + s * 0.9, '#8a5a3a')); // the ramp up
    p.push(box(6.4, 7, 1, x, 6.5, -10, '#14141e')); // the target board
    for (const [w, y, c] of [[5, 6, '#ffd23f'], [3.4, 7.2, '#ff3fa8'], [1.6, 8.4, '#3fd8ff']]) p.push(box(w, 1.2, 0.4, x, y, -9.4, c));
    p.push(box(6.4, 1.8, 1, x, 11, -10, NEON[k + 2]));
  }
  for (let k = 0; k < 8; k += 1) p.push(box(3, 0.3, 1.6, 15, 0.3 + k * 0.32, 4, k % 2 ? '#ff7a1a' : '#ffd23f')); // the ticket stack
  return merge(p);
}

function pixelKeep() {
  const STONE = '#5a5a7a';
  const p = [box(16, 12, 10, 0, 6, 0, STONE), box(4, 6, 0.6, 0, 3, 5.1, '#2a1a12')];
  for (let k = 0; k < 6; k += 1) p.push(box(1.8, 1.8, 10.2, -6.6 + k * 2.64, 12.9, 0, k % 2 ? STONE : '#4a4a6a')); // battlements
  for (const x of [-10, 10]) {
    p.push(box(6, 20, 6, x, 10, 0, '#4a4a6a'));
    p.push(box(7, 1.6, 7, x, 20.8, 0, STONE));
    for (const y of [9, 15]) p.push(box(1.4, 2, 0.4, x, y, 3.1, '#ffd23f')); // lit windows
    p.push(box(0.3, 4, 0.3, x, 24, 0, '#2a2a34'));
    p.push(box(2.6, 1.6, 0.2, x + 1.4, 25.2, 0, x < 0 ? '#ff3f3f' : '#3fd8ff')); // pennants
  }
  p.push(box(0.8, 5, 0.8, 4, 2.5, 8, '#5a3418'), box(1.6, 1.6, 1.6, 4, 5.6, 8, '#ff7a1a'), box(0.8, 1, 0.8, 4, 6.8, 8, '#ffd23f')); // the torch
  p.push(box(4, 2.4, 2.6, -5, 1.2, 8, '#7a4a1a'), box(4.2, 0.5, 2.8, -5, 2.5, 8, '#ffd23f')); // the treasure chest
  return merge(p);
}

export const ARCADE2_LANDMARKS = {
  'brick-paddle': { build: brickPaddle, radius: 16 },
  'pixel-snake': { build: pixelSnake, radius: 14 },
  'dance-pad': { build: dancePad, radius: 15 },
  'mole-machine': { build: moleMachine, radius: 16 },
  'bubble-cannon': { build: bubbleCannon, radius: 16 },
  'skee-lanes': { build: skeeLanes, radius: 16 },
  'pixel-keep': { build: pixelKeep, radius: 14 },
};
