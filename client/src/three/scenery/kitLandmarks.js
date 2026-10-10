/**
 * Landmarks for the city and world kit tracks (Paris, Dubai, the Amazon, Rio,
 * China): one builder each, origin on the ground, front facing +z, cartoon
 * low-poly from a few simple shapes, merged into the still scenery. A landmark
 * with a moving part (a windmill's sails) gives it as `moving`: its geometry,
 * the pivot it turns about and the axis, turned on the race clock.
 * Stylised impressions, never detailed reproductions.
 */
import { BoxGeometry, ConeGeometry, CylinderGeometry, IcosahedronGeometry, Matrix4, Quaternion, SphereGeometry, Vector3 } from 'three';
import { beam, box, merge, piece } from './parts';

const Y = new Vector3(0, 1, 0);
const M = (x, y, z) => new Matrix4().makeTranslation(x, y, z);
const S = (x, y, z, sx, sy, sz) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion(), new Vector3(sx, sy, sz));
const turned = (x, y, z, yaw, sx = 1, sy = 1, sz = 1) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(Y, yaw), new Vector3(sx, sy, sz));
const roof4 = (r, h, c, x, y, z, sx = 1, sz = 1) => piece(new ConeGeometry(r, h, 4), c, turned(x, y, z, Math.PI / 4, sx, 1, sz));
const V = (x, y, z) => new Vector3(x, y, z);

// ── Paris ───────────────────────────────────────────────────────────────────

/** Sacré-Cœur: a white basilica, its tall central dome, two small domes in front, a bell tower behind. */
function sacreCoeur() {
  const W = '#f2efe6';
  return merge([
    box(22, 12, 26, 0, 6, 0, W),
    box(16, 6, 8, 0, 3, 15, '#e9e5da'),                                      // the porch
    piece(new CylinderGeometry(6, 6.5, 8, 16), W, M(0, 16, 0)),               // the drum
    piece(new SphereGeometry(6.4, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), W, S(0, 20, 0, 1, 1.5, 1)), // the tall dome
    piece(new CylinderGeometry(1.2, 1.4, 4, 10), W, M(0, 31, 0)),
    piece(new ConeGeometry(1.4, 3, 10), W, M(0, 34.5, 0)),
    ...[-7, 7].map((x) => piece(new SphereGeometry(3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), W, S(x, 12, 12, 1, 1.4, 1))),
    box(6, 26, 6, 0, 13, -16, W),                                             // the bell tower behind
    piece(new SphereGeometry(3.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), W, S(0, 26, -16, 1, 1.5, 1)),
    box(5, 4, 0.2, 0, 3, 19.1, '#5a4e44'),                                    // the doors
  ]);
}

/** The Moulin Rouge: a red cabaret front with a red windmill on its roof; its sails turn slowly. */
function moulinRouge() {
  return merge([
    box(16, 7, 10, 0, 3.5, 0, '#b8231f'),
    box(16, 1.2, 0.3, 0, 6, 5.1, '#ffd36b'),                                 // the lit sign band
    box(3, 3, 0.2, -4, 2, 5.1, '#3a1416'), box(3, 3, 0.2, 4, 2, 5.1, '#3a1416'),
    piece(new CylinderGeometry(2.2, 2.8, 8, 8), '#c42d24', M(0, 11, 1)),      // the mill
    piece(new ConeGeometry(2.6, 2.6, 8), '#7a1c18', M(0, 16.3, 1)),
  ]);
}
function moulinSails() {
  const parts = [piece(new CylinderGeometry(0.3, 0.3, 0.6, 8), '#3a2a1e', new Matrix4().makeRotationX(Math.PI / 2))];
  for (let k = 0; k < 4; k += 1) {
    const a = (k * Math.PI) / 2;
    const m = new Matrix4().makeRotationZ(a).multiply(M(0, 4, 0));
    parts.push(piece(new BoxGeometry(1.6, 7, 0.1), '#e9e2d0', m));
    parts.push(piece(new BoxGeometry(0.2, 8, 0.15), '#5a3f2a', new Matrix4().makeRotationZ(a).multiply(M(0, 4, 0.05))));
  }
  return merge(parts);
}

/**
 * The Arc de Triomphe, stylised: two piers and the attic block over them. `width` from pier to
 * pier's outer faces, `pier` thick; over a splitter one pier stands on the divider (slender) and
 * the other on the bank, so one channel runs through the arch and the other round it.
 */
export function arcDeTriomphe(width = 9, pier = 1.5) {
  const C = '#e3d8bf';
  const x = width / 2 - pier / 2;
  return merge([
    box(pier, 10.5, 5, -x, 5.25, 0, C), box(pier, 10.5, 5, x, 5.25, 0, C),
    box(width, 3.6, 5, 0, 12.3, 0, C),
    box(width + 0.4, 0.5, 5.4, 0, 14.35, 0, '#d4c8ad'),
    box(width + 0.4, 0.4, 5.4, 0, 10.7, 0, '#d4c8ad'),
    box(width * 0.5, 1.6, 0.2, 0, 12.4, 2.6, '#c9bc9e'),                     // the frieze
  ]);
}

/** The obelisk of the Place de la Concorde: a tall tapered stone needle with a gold tip, on a plinth. */
function obelisk() {
  return merge([
    box(3, 2.5, 3, 0, 1.25, 0, '#9a9488'),
    piece(new CylinderGeometry(0.75, 1.15, 18, 4), '#c9a876', turned(0, 11.5, 0, Math.PI / 4)),
    piece(new ConeGeometry(0.9, 1.6, 4), '#e0b43c', turned(0, 21.3, 0, Math.PI / 4)),
  ]);
}

/** A round fountain: a stone basin, a bowl on a column, water in both. */
function fountain() {
  return merge([
    piece(new CylinderGeometry(4, 4.2, 0.8, 18), '#a49c8f', M(0, 0.4, 0)),
    piece(new CylinderGeometry(3.6, 3.6, 0.1, 18), '#6aa8c8', M(0, 0.78, 0)),
    piece(new CylinderGeometry(0.4, 0.5, 2.6, 8), '#a49c8f', M(0, 1.6, 0)),
    piece(new CylinderGeometry(1.6, 0.6, 0.6, 14), '#a49c8f', M(0, 3, 0)),
    piece(new ConeGeometry(0.5, 2.2, 8), '#cfe6f3', M(0, 4.2, 0)),              // the jet
  ]);
}

/** The Louvre's glass pyramid with its three small ones, on the courtyard's stone. */
function louvrePyramid() {
  return merge([
    box(30, 0.2, 30, 0, 0.1, 0, '#d8cfbd'),
    roof4(11, 13, '#8fb3c9', 0, 6.7, 0),
    ...[[-10, 8], [10, 8], [0, -11]].map(([x, z]) => roof4(2.6, 3, '#8fb3c9', x, 1.6, z)),
    box(30, 9, 4, 0, 4.5, -17, '#d9cdb2'),                                     // a wing of the palace behind
    piece(new ConeGeometry(3, 3, 4), '#5b6470', turned(0, 10.5, -17, Math.PI / 4, 5, 1, 0.8)),
  ]);
}

/** Notre-Dame: the west front's two square towers, the nave behind and its slender spire. */
function notreDame() {
  const C = '#cfc4ad';
  return merge([
    box(14, 14, 6, 0, 7, 8, C),                                               // the west front
    box(5, 10, 6, -4.5, 19, 8, C), box(5, 10, 6, 4.5, 19, 8, C),             // the two towers
    piece(new CylinderGeometry(2.4, 2.4, 0.3, 16), '#6a7fa0', new Matrix4().makeRotationX(Math.PI / 2).premultiply(M(0, 10, 11.2))), // the rose window
    box(12, 14, 26, 0, 7, -8, C),                                             // the nave
    piece(new ConeGeometry(8, 5, 4), '#5b6470', turned(0, 16.5, -8, Math.PI / 4, 0.7, 1, 2.2)),
    piece(new ConeGeometry(0.8, 12, 6), '#5b6470', M(0, 25, -4)),             // the spire
    ...[-1, 1].map((k) => box(1, 8, 22, k * 7, 4, -8, '#bfb49c')),            // buttresses
  ]);
}

/** The Eiffel Tower, stylised: four lattice legs rising from the corners, two platforms, the narrowing top. */
function eiffelTower() {
  const C = '#7a5b45';
  const parts = [];
  // The legs, going round the corners in order; each from its foot to the first platform, then to the second.
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const at = (sx, sz, t) => (t <= 1 ? V(sx * (14 - 7 * t), 22 * t, sz * (14 - 7 * t)) : V(sx * (7 - 3.8 * (t - 1)), 22 + 24 * (t - 1), sz * (7 - 3.8 * (t - 1))));
  for (const [sx, sz] of corners) parts.push(beam(at(sx, sz, 0), at(sx, sz, 1), 2.2, C), beam(at(sx, sz, 1), at(sx, sz, 2), 1.5, C));
  // Lattice bracing: rings of girders between the legs at a few heights.
  for (const t of [0.35, 0.7, 1.35, 1.7]) {
    corners.forEach(([sx, sz], k) => {
      const [nx, nz] = corners[(k + 1) % 4];
      parts.push(beam(at(sx, sz, t), at(nx, nz, t), 0.35, C));
    });
  }
  for (const [y, w] of [[22, 17], [46, 8.5]]) parts.push(box(w, 1.4, w, 0, y, 0, '#6b4e3a'));
  parts.push(...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => beam(V(sx * 3.2, 46, sz * 3.2), V(sx * 0.7, 74, sz * 0.7), 1.1, C))));
  parts.push(box(2.2, 2, 2.2, 0, 75, 0, '#6b4e3a'), piece(new CylinderGeometry(0.15, 0.25, 6, 5), C, M(0, 79, 0)));
  // The great arches between the legs at the bottom.
  for (const yaw of [0, Math.PI / 2]) {
    for (let n = 0; n <= 6; n += 1) {
      const a = Math.PI * (n / 6);
      const b = Math.PI * ((n + 1) / 6);
      if (n === 6) break;
      const p = (t) => new Vector3(Math.cos(t) * 10.5, 8 + Math.sin(t) * 6, 0).applyAxisAngle(Y, yaw);
      for (const s of [-1, 1]) parts.push(beam(p(a).add(new Vector3(0, 0, s * 10.5).applyAxisAngle(Y, yaw)), p(b).add(new Vector3(0, 0, s * 10.5).applyAxisAngle(Y, yaw)), 0.6, C));
    }
  }
  return merge(parts);
}

/** The Seine beside the quays: a long reach of green water, a bateau-mouche gliding on it, the quay walls. */
function seine() {
  return merge([
    box(80, 0.3, 18, 0, 0.15, 0, '#3f6e6a'),
    box(80, 2, 1, 0, 1, 9.5, '#c9bea4'), box(80, 2, 1, 0, 1, -9.5, '#c9bea4'),
    box(22, 1.4, 5, 6, 0.9, -2, '#f2efe8'),                                    // the bateau-mouche
    box(16, 1.6, 4.4, 6, 2.4, -2, '#9cc8e8'),
    box(16.4, 0.15, 4.8, 6, 3.25, -2, '#f2efe8'),
  ]);
}

/** A row of the bouquinistes' green bookstalls on the quay wall. */
function bookstalls() {
  const parts = [box(16, 1.2, 1.4, 0, 0.6, 0, '#c9bea4')];
  for (let k = 0; k < 4; k += 1) {
    parts.push(box(3.2, 0.9, 1.1, -6 + k * 4, 1.65, 0, '#2f5d3a'));
    parts.push(piece(new BoxGeometry(3.2, 1.2, 0.08), '#2f5d3a', turned(-6 + k * 4, 2.6, -0.5, 0).multiply(new Matrix4().makeRotationX(-0.3)))); // the open lid
  }
  return merge(parts);
}

/** Landmarks by name: builder, footprint radius, and for some the half-width that has to fit a splitter or bend. */
export const WORLD_LANDMARKS = {
  'sacre-coeur': { build: sacreCoeur, radius: 20 },
  'moulin-rouge': { build: moulinRouge, radius: 9, moving: { build: moulinSails, pivot: [0, 12, 3.4], axis: [0, 0, 1], speed: 0.35 } },
  'arc-de-triomphe': { build: arcDeTriomphe, radius: 6, fit: 4.5 },
  obelisk: { build: obelisk, radius: 3, fit: 1.6 },
  fountains: { build: fountain, radius: 5 },
  'louvre-pyramid': { build: louvrePyramid, radius: 18 },
  'notre-dame': { build: notreDame, radius: 16, fit: 8 },
  'eiffel-tower': { build: eiffelTower, radius: 18 },
  seine: { build: seine, radius: 40 },
  bookstalls: { build: bookstalls, radius: 9 },
};
