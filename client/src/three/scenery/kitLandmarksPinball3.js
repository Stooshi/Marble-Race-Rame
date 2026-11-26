/**
 * The second set of Pinball tables of 26 Nov 2026 (Moses: the Pinball pack towards 20): one signature landmark of its
 * own per table, original shapes and colours, beside the gate. Low-faceted on purpose (the phones' triangle budget).
 * Looks only: landmarks never touch a marble.
 *   erupting-volcano   Volcano Island: a cone with a glowing crater, lava runs and a tiki totem at its foot
 *   ice-station        Ice Station: a research base on stilts, a radar dome, a wind turbine and a snowcat
 *   assembly-robot     Robot Factory: a giant jointed robot arm over a conveyor and its crates
 *   fossil-skeleton    Dino Dig: a huge dinosaur skeleton of our own in a dig pit, with the diggers' tent
 *   mine-headframe     Gold Rush: a timber mine headframe with its wheel, an ore chute and a water tower
 */
import { BoxGeometry, ConeGeometry, CylinderGeometry, IcosahedronGeometry, Matrix4, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import { box, merge, piece } from './parts';

const M = (x, y, z) => new Matrix4().makeTranslation(x, y, z);
const R = (x, y, z, rx, ry, rz, sx = 1, sy = 1, sz = 1) => new Matrix4().compose(
  new Vector3(x, y, z), new Quaternion().setFromEuler({ x: rx, y: ry, z: rz, order: 'XYZ', isEuler: true }), new Vector3(sx, sy, sz),
);

function eruptingVolcano() {
  const p = [];
  p.push(piece(new ConeGeometry(20, 24, 10, 1, true), '#3a2a24', M(0, 12, 0)));
  p.push(piece(new CylinderGeometry(4.2, 4.2, 1, 10), '#ff5a1a', M(0, 23.6, 0))); // the crater's glow
  for (let k = 0; k < 4; k += 1) { // lava runs down the slope
    const a = (k / 4) * Math.PI * 2 + 0.4;
    p.push(piece(new BoxGeometry(1.4, 22, 0.5), '#ff7a1a', R(Math.cos(a) * 10, 12, Math.sin(a) * 10, 0, -a, 0.68)));
  }
  for (const [x, z, r] of [[1, 2, 2.6], [-2, -1, 3.2], [2, -2, 2.2]]) p.push(piece(new IcosahedronGeometry(r, 0), '#8a8a8a', M(x, 27 + r, z))); // smoke
  // A tiki totem of our own at its foot: stacked carved faces.
  for (let k = 0; k < 3; k += 1) {
    p.push(box(3, 3.2, 3, 16, 1.6 + k * 3.2, 14, k % 2 ? '#8a5a2a' : '#6a4220'));
    p.push(box(2, 0.6, 0.4, 16, 2.2 + k * 3.2, 15.6, '#ffd23f'));
  }
  for (const x of [-18, 18]) {
    p.push(piece(new CylinderGeometry(0.4, 0.6, 10, 5), '#6a4a2a', M(x, 5, 18)));
    for (let k = 0; k < 4; k += 1) p.push(piece(new ConeGeometry(1, 5, 4), '#2f8a3a', R(x, 10, 18, Math.PI / 2.4, (k / 4) * Math.PI * 2, 0)));
  }
  return merge(p);
}

function iceStation() {
  const p = [];
  for (const [x, z] of [[-8, -4], [8, -4], [-8, 4], [8, 4]]) p.push(box(0.6, 5, 0.6, x, 2.5, z, '#5a6a7a'));
  p.push(box(20, 5, 10, 0, 7.5, 0, '#d8242a'));
  for (let k = 0; k < 5; k += 1) p.push(box(2, 1.4, 0.3, -7 + k * 3.5, 8, 5.1, '#ffe8a0')); // lit windows
  p.push(piece(new SphereGeometry(4, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#f2f4f8', M(-14, 0, -6))); // the radar dome
  p.push(piece(new CylinderGeometry(0.4, 0.6, 18, 6), '#e6ecf2', M(14, 9, -6))); // the wind turbine
  for (let k = 0; k < 3; k += 1) p.push(piece(new BoxGeometry(0.8, 7, 0.3), '#e6ecf2', R(14, 18, -5.6, 0, 0, (k / 3) * Math.PI * 2).multiply(M(0, 3.5, 0))));
  p.push(box(6, 2.6, 3.4, 4, 1.3, 10, '#ff7a1a')); // a snowcat
  p.push(box(7, 0.8, 4, 4, 0.4, 10, '#2a2a2a'));
  p.push(piece(new CylinderGeometry(0.15, 0.15, 6, 4), '#c8a43a', M(-2, 13, 0)));
  return merge(p);
}

function assemblyRobot() {
  const p = [];
  p.push(box(26, 1.4, 5, 0, 0.7, 6, '#3a3f4a')); // the conveyor
  for (let k = 0; k < 9; k += 1) p.push(box(0.4, 1.6, 5.2, -12 + k * 3, 0.8, 6, '#ffd23f'));
  for (const x of [-8, 0, 8]) p.push(box(3, 3, 3, x, 2.9, 6, '#a86a2a')); // crates
  p.push(piece(new CylinderGeometry(4, 5, 3, 10), '#ff7a1a', M(0, 1.5, -6))); // the arm's base
  p.push(piece(new CylinderGeometry(1.4, 1.4, 14, 8), '#ff7a1a', R(0, 9, -6, 0, 0, 0.35)));
  p.push(piece(new SphereGeometry(2, 8, 6), '#3a3f4a', M(-4.5, 15.5, -6)));
  p.push(piece(new CylinderGeometry(1.1, 1.1, 12, 8), '#ff7a1a', R(-1, 13, -6, 0, 0, -1.1)));
  p.push(piece(new SphereGeometry(1.5, 8, 6), '#3a3f4a', M(4, 10.5, -6)));
  for (const z of [-7.2, -4.8]) p.push(box(0.6, 3.6, 0.6, 4.6, 8, z, '#c8cdd6')); // the gripper
  p.push(piece(new TorusGeometry(2.6, 0.4, 5, 12), '#5affd2', R(0, 3.2, -6, Math.PI / 2, 0, 0))); // its status ring
  return merge(p);
}

function fossilSkeleton() {
  const BONE = '#ece2c6';
  const p = [];
  p.push(piece(new CylinderGeometry(16, 14, 1.4, 12), '#c89a5a', M(0, 0.7, 0))); // the dig pit's rim
  // The spine: vertebrae along an arch, the tail sweeping down, the neck rising to the skull.
  for (let k = 0; k <= 16; k += 1) {
    const t = k / 16;
    const x = -14 + t * 26;
    const y = 4 + Math.sin(t * Math.PI) * 7 + (t > 0.8 ? (t - 0.8) * 20 : 0);
    p.push(piece(new IcosahedronGeometry(0.9 + Math.sin(t * Math.PI) * 0.5, 0), BONE, M(x, y, 0)));
    if (t > 0.3 && t < 0.7 && k % 2 === 0) for (const z of [-1, 1]) p.push(piece(new TorusGeometry(3, 0.25, 4, 8, Math.PI), BONE, R(x, y - 3, 0, 0, Math.PI / 2, 0, 1, 1, z * 0.9))); // ribs
  }
  p.push(box(4.4, 2.6, 2.4, 14.5, 15, 0, BONE)); // the skull
  p.push(box(3, 0.8, 2, 15.4, 13.4, 0, BONE)); // the jaw
  for (const x of [-4, 4]) p.push(piece(new CylinderGeometry(0.5, 0.7, 7, 5), BONE, R(x, 3.4, 0, 0, 0, x > 0 ? 0.2 : -0.2))); // legs
  p.push(piece(new ConeGeometry(5, 4, 4), '#d8a43a', R(-14, 2, 12, 0, Math.PI / 4, 0))); // the diggers' tent
  return merge(p);
}

function mineHeadframe() {
  const WOOD = '#7a4a2a';
  const p = [];
  for (const [x, z] of [[-5, -3], [5, -3], [-5, 3], [5, 3]]) p.push(piece(new BoxGeometry(0.9, 22, 0.9), WOOD, R(x * 0.8, 11, z * 0.8, z * 0.04, 0, -x * 0.03)));
  for (const y of [5, 11, 17]) p.push(box(9, 0.6, 6, 0, y, 0, WOOD));
  p.push(piece(new TorusGeometry(3.2, 0.35, 5, 14), '#3a3a3a', M(0, 22, 0))); // the wheel
  for (let k = 0; k < 4; k += 1) p.push(piece(new BoxGeometry(6.2, 0.2, 0.2), '#3a3a3a', R(0, 22, 0, 0, 0, (k / 4) * Math.PI)));
  p.push(piece(new BoxGeometry(2.4, 16, 2), '#8a5a2a', R(9, 7, 0, 0, 0, 0.9))); // the ore chute
  p.push(piece(new CylinderGeometry(3, 3, 5, 10), '#8a5a2a', M(-14, 12, 4))); // the water tower
  for (const [x, z] of [[-16, 2], [-12, 2], [-16, 6], [-12, 6]]) p.push(box(0.5, 9.5, 0.5, x, 4.75, z, WOOD));
  p.push(piece(new ConeGeometry(3.4, 2, 10), '#5a3a20', M(-14, 15.5, 4)));
  p.push(box(3, 2, 2, 6, 1, 8, '#5a5a5a')); // an ore cart
  p.push(box(1.8, 1.4, 1.6, 6, 2.6, 8, '#ffd23f')); // its gold
  return merge(p);
}

export const PINBALL3_LANDMARKS = {
  'erupting-volcano': { build: eruptingVolcano, radius: 22 },
  'ice-station': { build: iceStation, radius: 18 },
  'assembly-robot': { build: assemblyRobot, radius: 15 },
  'fossil-skeleton': { build: fossilSkeleton, radius: 18 },
  'mine-headframe': { build: mineHeadframe, radius: 18 },
};
