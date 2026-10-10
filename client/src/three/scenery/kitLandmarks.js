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

// ── Dubai ───────────────────────────────────────────────────────────────────

/** A Bedouin tent on the dune crest: black goat-hair cloth on poles, rugs, camels resting beside it. */
function bedouinCamp() {
  const parts = [
    piece(new BoxGeometry(9, 0.2, 6), '#2a2422', turned(0, 3, 0, 0).multiply(new Matrix4().makeRotationX(0.08))),  // the tent roof
    ...[-1, 1].map((k) => piece(new BoxGeometry(9, 2.8, 0.15), '#3a302a', M(0, 1.5, k * 3))),                   // its sides
    box(9, 2.6, 0.15, 0, 1.4, -3, '#3a302a'),
    box(4, 0.05, 2.5, 0, 0.05, 1.5, '#b8312f'), box(2.5, 0.05, 2, -3, 0.05, 1.2, '#2f5d9a'),                 // rugs
  ];
  for (const x of [-4.4, 0, 4.4]) for (const z of [-2.9, 2.9]) parts.push(box(0.15, 3.1, 0.15, x, 1.55, z, '#6b4a2f'));
  // Two camels resting, folded down on the sand.
  for (const [x, z, yaw] of [[7, 2, 0.4], [8, -2.5, -0.3]]) {
    parts.push(piece(new IcosahedronGeometry(0.9, 1), '#c9a06a', turned(x, 0.8, z, yaw, 0.85, 0.8, 1.5)));
    parts.push(piece(new IcosahedronGeometry(0.6, 1), '#c9a06a', turned(x, 1.5, z, yaw, 0.9, 0.95, 1.1)));
    parts.push(piece(new BoxGeometry(0.25, 0.9, 0.3), '#c9a06a', turned(x + Math.sin(yaw) * 1.1, 1.4, z + Math.cos(yaw) * 1.1, yaw)));
    parts.push(piece(new BoxGeometry(0.25, 0.25, 0.5), '#9a7647', turned(x + Math.sin(yaw) * 1.3, 1.95, z + Math.cos(yaw) * 1.3, yaw)));
  }
  return merge(parts);
}

/** An oasis: a small pool ringed with date palms (the splitter's centrepiece). */
function oasis() {
  const parts = [piece(new CylinderGeometry(3.4, 3.6, 0.2, 14), '#3f8fb0', M(0, 0.1, 0)), piece(new CylinderGeometry(4.2, 4.4, 0.12, 14), '#d9b87a', M(0, 0.04, 0))];
  for (let k = 0; k < 5; k += 1) {
    const a = (k / 5) * Math.PI * 2 + 0.3;
    const x = Math.cos(a) * 3.9;
    const z = Math.sin(a) * 2.2;
    const h = 6 + (k % 3);
    parts.push(piece(new CylinderGeometry(0.2, 0.3, h, 6), '#8a6a45', M(x, h / 2, z)));
    for (let f = 0; f < 6; f += 1) {
      const leaf = new BoxGeometry(0.6, 0.08, 3);
      leaf.translate(0, 0, 1.4);
      leaf.applyMatrix4(new Matrix4().makeRotationX(0.5));
      leaf.applyMatrix4(new Matrix4().makeRotationY((f / 6) * Math.PI * 2 + k));
      parts.push(piece(leaf, '#3f8f3a', M(x, h, z)));
    }
  }
  return merge(parts);
}

/** The Museum of the Future, stylised: a silver ring standing on a green mound. */
function museumOfTheFuture() {
  const ring = new CylinderGeometry(9, 9, 6, 20, 1, true);
  ring.rotateX(Math.PI / 2);
  ring.scale(1, 1.35, 1);
  const inner = new CylinderGeometry(5, 5, 6.02, 20, 1, true);
  inner.rotateX(Math.PI / 2);
  inner.scale(1, 1.6, 1);
  return merge([
    piece(new SphereGeometry(9, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#5f9a48', S(0, 0, 0, 1.3, 0.35, 0.9)),
    piece(ring, '#c9ccd1', M(0, 13, 0)),
    piece(inner, '#9aa1aa', M(0, 13, 0)),
    piece(new BoxGeometry(18, 0.4, 6.1), '#c9ccd1', M(0, 1.2, 0)),
  ]);
}

/** The Dubai Frame, stylised: a giant golden picture frame standing on end, a glass bridge across its top. */
function dubaiFrame() {
  const G = '#d8a93a';
  return merge([
    box(4, 40, 4, -10, 20, 0, G), box(4, 40, 4, 10, 20, 0, G),
    box(24, 4, 4, 0, 42, 0, '#9cc8e8'),
    box(24.2, 0.6, 4.2, 0, 40, 0, G), box(24.2, 0.6, 4.2, 0, 44, 0, G),
  ]);
}

/** A twisting skyscraper: glass floors each turned a little more than the one below (the Twister's centrepiece). */
function twistedTower() {
  const parts = [];
  for (let k = 0; k < 24; k += 1) parts.push(piece(new BoxGeometry(8, 2.4, 8), k % 2 ? '#7fb3d0' : '#a9cce0', turned(0, 1.2 + k * 2.5, 0, k * 0.065)));
  parts.push(piece(new ConeGeometry(2, 8, 4), '#c9ccd1', turned(0, 64, 0, 1.6)));
  return merge(parts);
}

/** The Burj Al Arab, stylised: a white sail on its own island, the mast-like spine behind. */
function burjAlArab() {
  const parts = [piece(new CylinderGeometry(9, 10, 1.5, 14), '#d9c49a', M(0, 0.75, 0))];
  for (let k = 0; k < 12; k += 1) {
    const t = k / 12;
    const w = 12 * Math.sin(Math.PI * (0.15 + t * 0.85)) * (1 - t * 0.6);
    parts.push(box(w, 3.4, 2.5, 0, 2.5 + k * 3.3, -3 + t * 7 * t, '#f4f4f2'));
  }
  parts.push(beam(V(0, 1.5, -6), V(0, 46, 2), 1.4, '#c9ccd1'));
  parts.push(box(6, 0.4, 6, 4, 34, -2, '#c9ccd1'));                              // the helipad
  return merge(parts);
}

/** The Burj Khalifa, stylised: a stepped silver needle, far off behind the finish. */
function burjKhalifa() {
  const parts = [];
  let w = 18;
  let y = 0;
  for (let k = 0; k < 9; k += 1) {
    const h = 14 - k * 0.6;
    parts.push(piece(new CylinderGeometry(w / 2, w / 2, h, 6), k % 2 ? '#b9c4cf' : '#cfd8e0', M(k % 2 ? 0.4 * k : -0.3 * k, y + h / 2, 0)));
    y += h;
    w *= 0.8;
  }
  parts.push(piece(new ConeGeometry(0.8, 30, 6), '#cfd8e0', M(0, y + 15, 0)));
  return merge(parts);
}

/** Palm Jumeirah's boardwalk: wooden decking, date palms, the sea beyond. */
function palmBoardwalk() {
  const parts = [box(70, 0.4, 8, 0, 0.2, 0, '#b4895a'), box(70, 0.3, 26, 0, 0.1, -17, '#2f8fb5')];
  for (let k = 0; k < 7; k += 1) {
    const x = -30 + k * 10;
    parts.push(piece(new CylinderGeometry(0.2, 0.28, 7, 6), '#8a6a45', M(x, 3.5, 3)));
    for (let f = 0; f < 6; f += 1) {
      const leaf = new BoxGeometry(0.6, 0.08, 3);
      leaf.translate(0, 0, 1.4);
      leaf.applyMatrix4(new Matrix4().makeRotationX(0.5));
      leaf.applyMatrix4(new Matrix4().makeRotationY((f / 6) * Math.PI * 2 + k));
      parts.push(piece(leaf, '#3f8f3a', M(x, 7, 3)));
    }
  }
  return merge(parts);
}

/** A dune buggy parked on the sand: yellow tube frame, roll cage, fat tyres. */
function duneBuggyParked() {
  const parts = [];
  for (const x of [-0.8, 0.8]) for (const z of [-1.1, 1.1]) parts.push(piece(new CylinderGeometry(0.42, 0.42, 0.35, 12), '#1e1f24', new Matrix4().makeRotationZ(Math.PI / 2).premultiply(M(x, 0.42, z))));
  parts.push(box(1.3, 0.35, 2.8, 0, 0.65, 0, '#e8b62a'), box(0.9, 0.5, 0.7, 0, 1.05, -0.2, '#b8312f'));
  for (const x of [-0.6, 0.6]) parts.push(box(0.08, 1.2, 0.08, x, 1.4, 0.4, '#2c2f36'), box(0.08, 1.2, 0.08, x, 1.4, -0.8, '#2c2f36'), box(0.08, 0.08, 1.3, x, 2, -0.2, '#2c2f36'));
  return merge(parts);
}

// ── The Amazon ──────────────────────────────────────────────────────────────

const leafy = (r, c, x, y, z, sy = 0.8) => piece(new IcosahedronGeometry(r, 0), c, S(x, y, z, 1, sy, 1));

/** A giant rainforest tree over the gate, toucans on its branches (yellow-and-black, big orange bills). */
function toucanTree() {
  const parts = [
    piece(new CylinderGeometry(1.2, 1.8, 18, 8), '#5a4a38', M(0, 9, 0)),
    beam(V(0, 14, 0), V(9, 17, 3), 0.6, '#5a4a38'), beam(V(0, 12, 0), V(-7, 15, -2), 0.5, '#5a4a38'),
    leafy(6, '#2f6e2c', 0, 21, 0), leafy(4.5, '#3f8f3a', 8, 18.5, 3), leafy(4, '#3f8f3a', -7, 16.5, -2),
  ];
  for (let k = 0; k < 6; k += 1) parts.push(beam(V(-1 + k * 0.9, 13 - k * 0.3, 1), V(-0.6 + k * 1.3, 2 + (k % 3), 1.5 + (k % 2)), 0.08, '#4b7a2e')); // hanging vines
  for (const [x, y, z, yaw] of [[6, 16.6, 2.6, 0.4], [4, 15.9, 1.9, -0.3], [-5, 14.5, -1.6, 2.8]]) {
    parts.push(piece(new IcosahedronGeometry(0.28, 0), '#16171b', turned(x, y + 0.25, z, yaw, 0.8, 1.3, 0.9)));
    parts.push(piece(new IcosahedronGeometry(0.16, 0), '#f2d23a', turned(x, y + 0.48, z + 0.08, yaw)));
    parts.push(piece(new ConeGeometry(0.11, 0.45, 5), '#f07a1f', turned(x + Math.sin(yaw) * 0.3, y + 0.55, z + Math.cos(yaw) * 0.3, yaw).multiply(new Matrix4().makeRotationX(Math.PI / 2))));
  }
  return merge(parts);
}

/** A river island: a mound of jungle, one big tree, a sloth hanging from a branch. */
function riverIsland() {
  return merge([
    piece(new SphereGeometry(5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#4b7a2e', S(0, 0, 0, 1, 0.3, 1.6)),
    piece(new CylinderGeometry(0.4, 0.6, 8, 7), '#5a4a38', M(0, 4, 0)),
    beam(V(0, 6.5, 0), V(2.6, 7.5, 0.5), 0.25, '#5a4a38'),
    leafy(3.2, '#2f6e2c', 0, 9, 0), leafy(2.2, '#3f8f3a', 2, 8, 1),
    piece(new IcosahedronGeometry(0.42, 0), '#8a7a5a', S(2.2, 6.7, 0.45, 0.9, 1.3, 0.8)),     // the sloth, hanging under the branch
    piece(new IcosahedronGeometry(0.2, 0), '#d9c8a4', M(2.2, 6.2, 0.75)),                     // its pale face
    ...[-0.25, 0.25].map((dx) => beam(V(2.2 + dx, 6.95, 0.45), V(2.2 + dx * 1.5, 7.4, 0.5), 0.08, '#6e5e44')),
    ...[0.4, 0.6].map((dx) => piece(new IcosahedronGeometry(0.5, 0), '#7a7268', M(-2 - dx * 3, 0.3, 2 * dx))),
  ]);
}

/** A still backwater beside the river: giant water-lily pads; the pink river dolphin surfaces in it now and then. */
function riverPool() {
  const parts = [piece(new CylinderGeometry(13, 13.5, 0.4, 20), '#3f6e5a', M(0, 0.2, 0)), piece(new CylinderGeometry(14, 14.5, 0.25, 20), '#6b5a3a', M(0, 0.05, 0))];
  for (let k = 0; k < 9; k += 1) {
    const a = k * 2.4;
    const r = 3 + (k % 4) * 2.3;
    parts.push(piece(new CylinderGeometry(1.4 + (k % 3) * 0.4, 1.4 + (k % 3) * 0.4, 0.12, 12), '#4f9a3a', M(Math.cos(a) * r, 0.45, Math.sin(a) * r)));
    parts.push(piece(new CylinderGeometry(1.5 + (k % 3) * 0.4, 1.5 + (k % 3) * 0.4, 0.05, 12, 1, true), '#c8344a', M(Math.cos(a) * r, 0.5, Math.sin(a) * r))); // the red rims
  }
  return merge(parts);
}
/** The pink river dolphin: carried round a pivot under the water, so it arcs up out of it and back under. */
function riverDolphin() {
  return merge([
    piece(new IcosahedronGeometry(0.9, 1), '#e8a0a8', S(0, 3.2, 0, 0.6, 0.55, 1.8)),
    piece(new ConeGeometry(0.18, 0.9, 6), '#e8a0a8', new Matrix4().makeRotationX(Math.PI / 2).premultiply(M(0, 3.15, 2.0))), // the long beak
    piece(new BoxGeometry(1.2, 0.08, 0.4), '#d98a94', M(0, 3.2, -1.7)),                                                         // tail flukes
    piece(new BoxGeometry(0.06, 0.3, 0.6), '#d98a94', M(0, 3.7, 0)),
  ]);
}

/** The Teatro Amazonas: a rose-pink opera house under its green-and-gold tiled dome. */
function teatroAmazonas() {
  return merge([
    box(22, 10, 16, 0, 5, 0, '#e8a8a0'),
    box(14, 4, 4, 0, 2, 9, '#f2efe8'), ...[-5, -2, 2, 5].map((x) => box(0.8, 6, 0.8, x, 6, 10.5, '#f2efe8')),
    box(15, 1.2, 5, 0, 9.6, 9.5, '#f2efe8'),
    piece(new CylinderGeometry(5, 5.4, 4, 16), '#f2efe8', M(0, 12, -2)),
    piece(new SphereGeometry(5.4, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), '#2f8f5a', S(0, 14, -2, 1, 1.3, 1)),
    ...[0, 1, 2, 3].map((k) => piece(new BoxGeometry(0.3, 6.6, 0.3), '#e8b62a', turned(Math.sin(k * Math.PI / 2) * 4.2, 16.5, -2 + Math.cos(k * Math.PI / 2) * 4.2, k * Math.PI / 2).multiply(new Matrix4().makeRotationX(0.6)))),
    piece(new ConeGeometry(0.8, 2.4, 8), '#e8b62a', M(0, 22, -2)),
  ]);
}

/** A wooden river dock at the finish, a long canoe tied to it. */
function riverDock() {
  const parts = [box(24, 0.3, 5, 0, 1.2, 0, '#8a6a45'), box(26, 0.3, 14, 0, 0.1, -9, '#3f6e5a')];
  for (const x of [-11, -6, -1, 4, 9]) for (const z of [-2.2, 2.2]) parts.push(box(0.4, 2.2, 0.4, x, 0.5, z, '#5a3f2a'));
  parts.push(piece(new IcosahedronGeometry(1, 0), '#6b4a2f', S(2, 0.5, -4.5, 6, 0.4, 0.8)));
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
  'bedouin-camp': { build: bedouinCamp, radius: 10 },
  oasis: { build: oasis, radius: 5, fit: 4.3 },
  'museum-of-the-future': { build: museumOfTheFuture, radius: 13 },
  'dubai-frame': { build: dubaiFrame, radius: 13 },
  'twisted-tower': { build: twistedTower, radius: 6 },
  'burj-al-arab': { build: burjAlArab, radius: 12 },
  'burj-khalifa': { build: burjKhalifa, radius: 10 },
  'palm-boardwalk': { build: palmBoardwalk, radius: 36 },
  'dune-buggy': { build: duneBuggyParked, radius: 2 },
  'toucan-tree': { build: toucanTree, radius: 8 },
  'river-island': { build: riverIsland, radius: 6, fit: 3.6 },
  'river-pool': { build: riverPool, radius: 15, moving: { build: riverDolphin, pivot: [0, -2.6, 0], axis: [1, 0, 0], speed: 0.6 } },
  'teatro-amazonas': { build: teatroAmazonas, radius: 16 },
  'river-dock': { build: riverDock, radius: 14 },
};
