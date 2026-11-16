/**
 * Landmarks for the seven World Tour tracks of 16 Nov 2026 (the World Tour pack filled to 20): one builder each,
 * origin on the ground (boats on the water: a track's `sea` floats them at its level), front facing +z, cartoon
 * low-poly from a few simple shapes, merged into the still scenery. Our own models after the real places; no
 * names, flags or logos on anything.
 */
import { ConeGeometry, CylinderGeometry, Matrix4, Quaternion, SphereGeometry, Vector3 } from 'three';
import { box, merge, piece, seededRandom } from './parts';

const Y = new Vector3(0, 1, 0);
const M = (x, y, z) => new Matrix4().makeTranslation(x, y, z);
const turned = (x, y, z, yaw, sx = 1, sy = 1, sz = 1) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(Y, yaw), new Vector3(sx, sy, sz));

// ── Santorini (Santorini Caldera Run) ───────────────────────────────────────

const WHITE = ['#f7f6f1', '#f2f0e8', '#ece9df'];
const DOOR_BLUE = '#2f6fb3';

/** A Cycladic house: a whitewashed cube with a flat roof, a blue door, sometimes a little blue dome on top. */
function cubeHouse(p, x, y, z, w, d, h, k, dome = false) {
  p.push(box(w, h, d, x, y + h / 2, z, WHITE[k % WHITE.length]));
  p.push(box(w + 0.3, 0.3, d + 0.3, x, y + h + 0.15, z, '#ffffff'));
  p.push(box(1, 1.9, 0.12, x + (k % 2 ? -w / 4 : w / 4), y + 0.95, z + d / 2 + 0.06, DOOR_BLUE));
  if (dome) p.push(piece(new SphereGeometry(Math.min(w, d) * 0.38, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), DOOR_BLUE, M(x, y + h + 0.3, z)));
}

/** A cliff-top village: white cube houses stepping up the slope behind, blue domes among them. */
function cycladicVillage() {
  const p = [];
  const r = seededRandom(31);
  let k = 0;
  for (let row = 0; row < 4; row += 1) {
    for (let i = -3; i <= 3; i += 1) {
      if (r() < 0.18) continue;
      const w = 4 + r() * 2.5;
      const d = 4 + r() * 2;
      const h = 3.2 + r() * 1.6;
      cubeHouse(p, i * 6.4 + (row % 2) * 3, row * 3.4, -row * 6.5 + r() * 1.5, w, d, h, k, r() < 0.14);
      k += 1;
    }
  }
  // (The terraced slope under the houses: one block per row.)
  for (let row = 0; row < 4; row += 1) p.push(box(48, row * 3.4 + 0.01, 7, 1.5, (row * 3.4) / 2, -row * 6.5, '#d9cbb4'));
  return merge(p);
}

/** A little church: a white nave, a big blue dome on a drum, a white bell gable beside it. */
function blueDomes() {
  const p = [];
  p.push(box(9, 5, 7, 0, 2.5, 0, '#f7f6f1'));
  p.push(piece(new CylinderGeometry(2.8, 2.8, 1.4, 14), '#f7f6f1', M(0, 5.7, 0)));
  p.push(piece(new SphereGeometry(2.9, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), DOOR_BLUE, M(0, 6.4, 0)));
  p.push(piece(new CylinderGeometry(0.12, 0.12, 1.4, 4), '#e9e4d4', M(0, 9.6, 0)));
  p.push(box(3.2, 7.5, 1.2, 5.8, 3.75, 1.5, '#f7f6f1'));
  p.push(box(1.2, 1.4, 1.3, 5.8, 5.9, 1.5, '#3a3a3a'));
  p.push(box(1.6, 1.8, 1.3, -6.5, 0.9, 2, '#f2f0e8'));
  p.push(piece(new SphereGeometry(1.5, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), DOOR_BLUE, M(-6.5, 1.8, 2)));
  return merge(p);
}

/** A row of three windmills on the ridge: white round towers, thatched cone caps, four timber sails each. */
function cycladicWindmills() {
  const p = [];
  for (const [x, z, yaw] of [[-12, 0, 0.2], [0, -3, -0.1], [12, 1, 0.35]]) {
    p.push(piece(new CylinderGeometry(2.4, 2.8, 7, 12), '#f7f6f1', M(x, 3.5, z)));
    p.push(piece(new ConeGeometry(2.8, 2.4, 12), '#8a6a48', M(x, 8.2, z)));
    for (let a = 0; a < 4; a += 1) {
      const sail = box(0.35, 5.2, 0.12, 0, 2.6, 0, '#7a5a3c');
      sail.applyMatrix4(new Matrix4().makeRotationZ(a * Math.PI / 2 + 0.4));
      sail.applyMatrix4(turned(x, 7.2, z + 2.9, yaw));
      p.push(sail);
    }
  }
  return merge(p);
}

export const WORLD2_LANDMARKS = {
  'cycladic-village': { build: cycladicVillage, radius: 26 },
  'blue-domes': { build: blueDomes, radius: 10 },
  'cycladic-windmills': { build: cycladicWindmills, radius: 16 },
};
