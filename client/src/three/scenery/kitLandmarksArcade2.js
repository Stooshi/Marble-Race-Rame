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
 *   hockey-rink     Air Hockey Rink: a giant air-hockey table, its goals, two mallets and a puck, a scoreboard over it
 *   coin-pusher     Coin Pusher: a coin-pusher machine, its shelves stacked with coins, the pusher and a prize on top
 *   golf-windmill   Crazy Golf: a crazy-golf windmill with its sails, a flag in the hole and a ball on the green
 *   prize-wheel     Prize Wheel: a giant prize wheel on its stand, its coloured segments, lights round the rim
 *   fish-tank       Fishing Frenzy: a fishing-game tank, pixel fish leaping out of its water, a rod over it
 *   laser-fort      Laser Tag: a laser-tag fort of stacked blocks, its lookout towers and beams criss-crossing it
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

function hockeyRink() {
  const p = [box(24, 4, 14, 0, 2, 0, '#14141e'), box(23, 0.3, 13, 0, 4.15, 0, '#e8f2fa')];
  for (const [w, d, x, z] of [[24.4, 0.8, 0, 6.8], [24.4, 0.8, 0, -6.8], [0.8, 14.4, 12, 0], [0.8, 14.4, -12, 0]]) p.push(box(w, 1.2, d, x, 4.6, z, '#3fd8ff'));
  for (const x of [-11.6, 11.6]) p.push(box(0.6, 0.9, 4, x, 4.5, 0, '#0a0a12')); // the goals
  p.push(box(0.2, 0.32, 13, 0, 4.3, 0, '#ff3f3f'));
  for (const [x, c] of [[-6, '#ff3fa8'], [6, '#7dff6a']]) { p.push(box(2.2, 0.8, 2.2, x, 4.7, 0, c)); p.push(box(1, 1.4, 1, x, 5.6, 0, c)); } // the mallets
  p.push(box(1.4, 0.3, 1.4, 2, 4.45, 2, '#ffd23f')); // the puck
  p.push(box(12, 5, 1, 0, 14, -7, '#0a0a12'), box(1, 8, 1, -5, 8, -7, '#2a2a34'), box(1, 8, 1, 5, 8, -7, '#2a2a34'));
  for (let k = 0; k < 4; k += 1) p.push(box(1.6, 2.6, 0.4, -3.6 + k * 2.4 + (k > 1 ? 0.6 : 0), 14, -6.4, k < 2 ? '#ff3fa8' : '#7dff6a'));
  return merge(p);
}

function coinPusher() {
  const p = [box(16, 8, 12, 0, 4, 0, '#2a1a4a'), box(16.4, 16, 1, 0, 16, -5.5, '#14141e')];
  for (let k = 0; k < 2; k += 1) {
    p.push(box(14, 0.6, 7, 0, 8.3 + k * 4, 1 - k * 2, '#5a5a6a')); // the shelves
    for (let c = 0; c < 9; c += 1) for (let r = 0; r < 3; r += 1) p.push(box(1.2, 0.3, 1.2, -5.6 + c * 1.4, 8.8 + k * 4 + (c + r) % 2 * 0.3, 3 - r * 1.6 - k * 2, '#ffd23f'));
  }
  p.push(box(14, 2.2, 1.6, 0, 9.7, -2.6, '#8a8a9a')); // the pusher
  for (let k = 0; k < 12; k += 1) p.push(box(0.8, 0.8, 0.4, -6.2 + (k % 6) * 2.5, 22.5 + Math.floor(k / 6) * 1.6, -5, NEON[k % NEON.length])); // the lit sign
  p.push(box(3, 3, 3, 0, 26.5, -4, '#ff3fa8'), box(3.4, 0.6, 3.4, 0, 28.3, -4, '#ffd23f')); // a prize box on top
  return merge(p);
}

function golfWindmill() {
  const p = [box(22, 0.6, 22, 0, 0.3, 0, '#2a8a3a')];
  p.push(box(7, 12, 7, -4, 6.6, -3, '#c84a3a'), box(7.8, 1, 7.8, -4, 13, -3, '#8a2a1a'));
  for (let k = 0; k < 3; k += 1) p.push(box(5 - k * 1.6, 1.2, 5 - k * 1.6, -4, 14 + k * 1.2, -3, '#8a2a1a')); // the roof
  p.push(box(2, 3, 0.4, -4, 2.1, 0.6, '#1a0a04')); // the tunnel the ball goes through
  for (const [w, h, y] of [[1.2, 14, 9], [14, 1.2, 9]]) p.push(box(w, h, 0.4, -4, y + 2, 0.8, '#f2f6fa')); // the sails
  p.push(box(1.4, 1.4, 0.5, -4, 11, 1, '#2a2a34'));
  p.push(box(1.6, 0.2, 1.6, 6, 0.7, 5, '#0a0a12'), box(0.2, 7, 0.2, 6, 4, 5, '#f2f6fa'), box(2.4, 1.6, 0.2, 7.3, 6.6, 5, '#ff3f3f')); // the hole and flag
  p.push(box(0.8, 0.8, 0.8, 2, 1, 6, '#f2f6fa')); // the ball
  for (const [x, z, c] of [[8, -6, '#ffd23f'], [-9, 7, '#3fd8ff']]) p.push(box(2, 1.2, 2, x, 1.2, z, c)); // bumpers
  return merge(p);
}

function prizeWheel() {
  const p = [box(10, 2, 6, 0, 1, 0, '#2a2a34'), box(1.6, 12, 1.6, -3, 7, 0, '#5a5a6a'), box(1.6, 12, 1.6, 3, 7, 0, '#5a5a6a')];
  const N = 12; const R = 9; const cy = 15;
  for (let k = 0; k < N; k += 1) {
    const a = (k / N) * Math.PI * 2;
    for (let r = 2; r < R; r += 1.6) p.push(box(1.6, 1.6, 1, Math.cos(a) * r, cy + Math.sin(a) * r, 1, NEON[k % NEON.length]));
    p.push(box(1, 1, 1.2, Math.cos(a + 0.26) * (R + 0.6), cy + Math.sin(a + 0.26) * (R + 0.6), 1, '#ffd23f')); // the rim's lights
  }
  p.push(box(2.6, 2.6, 1.6, 0, cy, 1.4, '#f2f6fa'));
  p.push(box(1.2, 2.4, 1.2, 0, cy + R + 2, 1.4, '#ff3f3f')); // the pointer
  return merge(p);
}

function fishTank() {
  const p = [box(20, 6, 12, 0, 3, 0, '#14141e'), box(19, 0.4, 11, 0, 5.8, 0, '#2a6aaa')];
  for (let k = 0; k < 7; k += 1) p.push(box(1.6, 0.3, 1.6, -7.5 + k * 2.5, 6.1, (k % 2) * 3 - 1.5, '#9ae8ff')); // ripples
  for (const [x, y, z, c] of [[-5, 9, 0, '#ff7a1a'], [2, 11, 2, '#ffd23f'], [6, 8, -2, '#ff3fa8']]) { // fish leaping
    p.push(box(3, 1.4, 1, x, y, z, c), box(1, 1.8, 0.6, x - 1.8, y, z, c), box(0.4, 0.4, 0.3, x + 1, y + 0.3, z + 0.5, '#0a0a12'));
  }
  p.push(box(0.6, 16, 0.6, 11, 8, -5, '#c89a5a'), box(12, 0.5, 0.5, 5.5, 16, -5, '#c89a5a'), box(0.1, 6, 0.1, 0, 13, -5, '#f2f6fa'));
  p.push(box(20.4, 1, 1, 0, 6.5, 6, '#ffd23f'), box(20.4, 1, 1, 0, 6.5, -6, '#ffd23f'));
  return merge(p);
}

function laserFort() {
  const p = [];
  for (let r = 0; r < 3; r += 1) for (let c = 0; c < 6; c += 1) {
    if (r === 0 && (c === 2 || c === 3)) continue; // the way in
    p.push(box(3.4, 3, 3, -8.5 + c * 3.4, 1.5 + r * 3, 0, (r + c) % 2 ? '#2a2a4a' : '#3a3a5a'));
  }
  for (const x of [-11, 11]) {
    p.push(box(4, 16, 4, x, 8, 0, '#2a2a4a'), box(5, 1.2, 5, x, 16.6, 0, '#3a3a5a'));
    p.push(box(1.2, 1.2, 0.4, x, 12, 2.1, '#7dff6a'));
  }
  // The beams: thin glowing bars criss-crossing the fort.
  for (const [y, c] of [[11, '#ff3f3f'], [13.5, '#3fd8ff']]) p.push(box(22, 0.2, 0.2, 0, y, 1.6, c));
  for (let k = 0; k < 5; k += 1) p.push(box(0.2, 6, 0.2, -8 + k * 4, 12, 1.6, k % 2 ? '#ff3fa8' : '#7dff6a'));
  return merge(p);
}

export const ARCADE2_LANDMARKS = {
  'laser-fort': { build: laserFort, radius: 14 },
  'golf-windmill': { build: golfWindmill, radius: 12 },
  'prize-wheel': { build: prizeWheel, radius: 11 },
  'fish-tank': { build: fishTank, radius: 12 },
  'hockey-rink': { build: hockeyRink, radius: 15 },
  'coin-pusher': { build: coinPusher, radius: 11 },
  'brick-paddle': { build: brickPaddle, radius: 16 },
  'pixel-snake': { build: pixelSnake, radius: 14 },
  'dance-pad': { build: dancePad, radius: 15 },
  'mole-machine': { build: moleMachine, radius: 16 },
  'bubble-cannon': { build: bubbleCannon, radius: 16 },
  'skee-lanes': { build: skeeLanes, radius: 16 },
  'pixel-keep': { build: pixelKeep, radius: 14 },
};
