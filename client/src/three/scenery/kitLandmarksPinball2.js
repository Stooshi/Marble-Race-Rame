/**
 * The Pinball tables of 26 Nov 2026 (Moses: the Pinball pack towards 20): one signature landmark of its own per
 * table, original shapes and colours, standing on the playfield beside the track. Looks only: landmarks never
 * touch a marble.
 *   kraken          Kraken Deep: a giant octopus rising from the sea floor, tentacles curling up round a wreck's mast
 *   launch-tower    Moonshot: a rocket on its launch tower, the service arms and a cloud of steam at its foot
 *   stone-idol      Idol of the Jungle: a huge stone head in a stepped temple, its eyes glowing
 *   storm-galleon   Pirate Plunder: a three-masted galleon heeling in the storm, its sails torn
 *   big-top-tent    Big Top: a striped circus tent with flags, and the human cannon aimed at the sky
 */
import { BoxGeometry, ConeGeometry, CylinderGeometry, IcosahedronGeometry, Matrix4, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import { box, merge, piece } from './parts';

const M = (x, y, z) => new Matrix4().makeTranslation(x, y, z);
const R = (x, y, z, rx, ry, rz, sx = 1, sy = 1, sz = 1) => new Matrix4().compose(
  new Vector3(x, y, z), new Quaternion().setFromEuler({ x: rx, y: ry, z: rz, order: 'XYZ', isEuler: true }), new Vector3(sx, sy, sz),
);

/** A curling tentacle: a chain of shrinking spheres along a rising spiral. */
function tentacle(p, x0, z0, yaw, height, colour, sucker) {
  const n = 9;
  for (let k = 0; k < n; k += 1) {
    const t = k / (n - 1);
    const r = 2.1 * (1 - t * 0.75);
    const curl = t * t * 2.6;
    const out = 3 + t * 5 - Math.sin(curl) * 3;
    const x = x0 + Math.cos(yaw) * out;
    const z = z0 + Math.sin(yaw) * out;
    const y = 1 + t * height + Math.cos(curl) * (t > 0.6 ? -2 * (t - 0.6) : 0);
    p.push(piece(new SphereGeometry(r, 6, 4), colour, M(x, y, z)));
    if (k % 4 === 1) p.push(box(r * 0.5, r * 0.5, r * 0.5, x - Math.cos(yaw) * r * 0.8, y, z - Math.sin(yaw) * r * 0.8, sucker));
  }
}

function kraken() {
  const BODY = '#8a2a6a';
  const p = [];
  // The head, half out of the sand, with two big eyes.
  p.push(piece(new SphereGeometry(7, 12, 9), BODY, R(0, 6, 0, 0, 0, 0, 1, 1.35, 1)));
  for (const x of [-3, 3]) {
    p.push(piece(new SphereGeometry(1.8, 12, 10), '#f2e6b8', M(x, 7.5, 5.6)));
    p.push(piece(new SphereGeometry(0.9, 10, 8), '#0b0612', M(x, 7.5, 7.1)));
  }
  for (let k = 0; k < 6; k += 1) tentacle(p, 0, 0, (k / 6) * Math.PI * 2 + 0.3, 9 + (k % 3) * 3, BODY, '#f2a8d0');
  // A wreck's broken mast the tentacles curl round, and the sand mound.
  p.push(piece(new CylinderGeometry(0.6, 0.8, 18, 8), '#5a3f2a', R(-11, 8, -4, 0, 0, 0.22)));
  p.push(box(7, 0.4, 0.4, -12.5, 14, -4, '#5a3f2a'));
  p.push(piece(new CylinderGeometry(13, 15, 1.4, 20), '#c8b07a', M(0, 0.7, 0)));
  return merge(p);
}

function launchTower() {
  const p = [];
  // The tower: a red lattice (four legs, cross beams), and the service arms reaching to the rocket.
  for (const [x, z] of [[-9, -3], [-5, -3], [-9, 1], [-5, 1]]) p.push(box(0.6, 34, 0.6, x, 17, z, '#c8342a'));
  for (let k = 0; k < 11; k += 1) p.push(box(4.6, 0.35, 4.6, -7, 1.5 + k * 3.2, -1, '#c8342a'));
  for (const y of [14, 22, 29]) p.push(box(5, 0.6, 1.2, -2.4, y, -1, '#8a8f99'));
  // The rocket: white stages, a black band, the capsule and its escape tower, fins.
  p.push(piece(new CylinderGeometry(2.4, 2.4, 16, 10), '#f2f4f8', M(2, 10, -1)));
  p.push(piece(new CylinderGeometry(2.4, 2.4, 2, 10), '#14141a', M(2, 17, -1)));
  p.push(piece(new CylinderGeometry(1.9, 2.4, 9, 10), '#f2f4f8', M(2, 22.5, -1)));
  p.push(piece(new ConeGeometry(1.9, 4, 10), '#d8dde6', M(2, 29, -1)));
  p.push(piece(new CylinderGeometry(0.15, 0.15, 3.5, 6), '#c8342a', M(2, 32.6, -1)));
  for (let k = 0; k < 4; k += 1) {
    const a = (k / 4) * Math.PI * 2;
    p.push(box(0.3, 3, 2.2, 2 + Math.cos(a) * 2.6, 2.8, -1 + Math.sin(a) * 2.6, '#14141a'));
  }
  // The pad, and the steam rolling off it.
  p.push(box(26, 1.4, 18, -2, 0.7, -1, '#8a8f99'));
  for (const [x, z, r] of [[8, 4, 3.2], [10, -3, 2.6], [-1, 6, 2.8], [12, 1, 2.2], [5, 7, 2.4]]) p.push(piece(new IcosahedronGeometry(r, 0), '#e6ecf2', M(x, 1.8 + r * 0.5, z)));
  return merge(p);
}

function stoneIdol() {
  const STONE = '#7a8a6a';
  const DARK = '#4a5a40';
  const p = [];
  // A stepped temple, five tiers.
  for (let k = 0; k < 5; k += 1) p.push(box(30 - k * 5, 2.4, 22 - k * 4, 0, 1.2 + k * 2.4, 0, k % 2 ? DARK : STONE));
  // The head on top: brow, nose, mouth, ears, a headdress of slabs.
  const top = 12;
  p.push(box(9, 11, 7, 0, top + 5.5, 0, STONE));
  p.push(box(9.6, 1.6, 7.6, 0, top + 7.6, 0.2, DARK));
  p.push(box(1.8, 4, 2, 0, top + 4.8, 3.8, DARK));
  p.push(box(5, 0.9, 0.6, 0, top + 1.8, 3.6, '#2a3424'));
  for (const x of [-4.8, 4.8]) p.push(box(0.8, 5, 2.4, x, top + 5, 0, DARK));
  for (let k = 0; k < 5; k += 1) p.push(box(1.6, 3.2 + (k === 2 ? 1.6 : 0), 0.8, -3.6 + k * 1.8, top + 12.3, 1.2, k % 2 ? '#c8a43a' : DARK));
  // The glowing eyes.
  for (const x of [-2.2, 2.2]) p.push(box(1.8, 1, 0.4, x, top + 6.6, 3.6, '#7dff6a'));
  // Vines and two palms.
  for (const x of [-13, 13]) {
    p.push(piece(new CylinderGeometry(0.4, 0.6, 12, 6), '#6a4a2a', R(x, 6, 8, 0, 0, x > 0 ? -0.12 : 0.12)));
    for (let k = 0; k < 5; k += 1) p.push(piece(new ConeGeometry(1, 6, 4), '#2f8a3a', R(x + (x > 0 ? -0.7 : 0.7), 12, 8, Math.PI / 2.4, (k / 5) * Math.PI * 2, 0)));
  }
  return merge(p);
}

function stormGalleon() {
  const HULL = '#4a2a18';
  const p = [];
  const heel = 0.18; // the whole ship heels in the storm
  const g = (x, y, z) => R(x * Math.cos(heel) - y * Math.sin(heel), x * Math.sin(heel) + y * Math.cos(heel), z, 0, 0, heel);
  p.push(piece(new CylinderGeometry(4, 2.4, 30, 10, 1), HULL, R(0, 4, 0, 0, 0, Math.PI / 2 + heel, 1, 1, 0.75)));
  p.push(box(8, 4, 7, 12.5, 8, 0, HULL));
  p.push(box(2.4, 0.6, 7.2, 12.5, 10.2, 0, '#c8a43a'));
  for (const [x, h] of [[-8, 18], [1, 24], [9, 17]]) {
    const m = g(x, 5 + h / 2, 0);
    p.push(piece(new CylinderGeometry(0.35, 0.45, h, 6), '#3a2a20', m));
    for (const [y, w] of [[0.45, 10], [0.75, 8]]) {
      p.push(piece(new CylinderGeometry(0.15, 0.15, w, 5), '#3a2a20', g(x, 5 + h * y, 0).multiply(R(0, 0, 0, Math.PI / 2, 0, 0))));
      p.push(piece(new BoxGeometry(0.3, h * 0.22, w * 0.9), '#e8dcc0', g(x + 0.4, 5 + h * y - h * 0.12, 0)));
    }
  }
  // The flag: black, with a white cross-bones mark of our own (two crossed bars).
  p.push(box(0.2, 2.2, 3.2, 1.5, 30.5, -1.6, '#0a0a0a'));
  p.push(box(0.3, 0.4, 2.4, 1.6, 30.5, -1.6, '#f2f2f2'));
  p.push(box(0.3, 1.8, 0.4, 1.6, 30.5, -1.6, '#f2f2f2'));
  // Waves breaking against the hull.
  for (const [x, z, r] of [[-12, 5, 3], [-4, 6, 2.6], [6, 5.5, 3.2], [14, 4.5, 2.4], [-14, -5, 2.8], [4, -6, 3]]) p.push(piece(new IcosahedronGeometry(r, 1), '#cfe8f2', M(x, 1 + r * 0.4, z)));
  p.push(piece(new CylinderGeometry(20, 22, 1.6, 20), '#1f5a7a', M(0, 0.8, 0)));
  return merge(p);
}

function bigTopTent() {
  const p = [];
  // The tent: a striped drum and a striped cone roof (alternating red and white segments).
  const n = 16;
  for (let k = 0; k < n; k += 1) {
    const a0 = (k / n) * Math.PI * 2;
    const c = k % 2 ? '#f2efe6' : '#d8242a';
    p.push(piece(new CylinderGeometry(16, 16, 9, 2, 1, true, a0, Math.PI * 2 / n), c, M(0, 4.5, 0)));
    p.push(piece(new ConeGeometry(18, 12, 2, 1, true, a0, Math.PI * 2 / n), c, M(0, 15, 0)));
  }
  p.push(piece(new TorusGeometry(16.6, 0.5, 6, 32), '#ffd23f', R(0, 9, 0, Math.PI / 2, 0, 0)));
  // Poles and flags.
  for (const [x, z, h] of [[0, 0, 28], [-10, 0, 20], [10, 0, 20]]) {
    p.push(piece(new CylinderGeometry(0.3, 0.3, h, 6), '#c8a43a', M(x, h / 2, z)));
    p.push(box(0.2, 1.8, 3, x, h - 1, z + 1.6, '#ffd23f'));
  }
  // The human cannon beside it, aimed at the sky, on its wheeled carriage.
  p.push(piece(new CylinderGeometry(1.6, 2.2, 12, 14), '#1a3a8a', R(22, 7, 6, 0, 0, -0.7)));
  p.push(piece(new TorusGeometry(1.7, 0.35, 6, 14), '#ffd23f', R(25.6, 11.3, 6, 0, Math.PI / 2, -0.7 + Math.PI / 2)));
  for (const z of [3.2, 8.8]) p.push(piece(new CylinderGeometry(2.6, 2.6, 0.6, 14), '#c8342a', R(19, 2.6, z, Math.PI / 2, 0, 0)));
  p.push(box(8, 2, 5, 19, 2.6, 6, '#c8342a'));
  return merge(p);
}

export const PINBALL2_LANDMARKS = {
  kraken: { build: kraken, radius: 15 },
  'launch-tower': { build: launchTower, radius: 16 },
  'stone-idol': { build: stoneIdol, radius: 17 },
  'storm-galleon': { build: stormGalleon, radius: 22 },
  'big-top-tent': { build: bigTopTent, radius: 26 },
};
