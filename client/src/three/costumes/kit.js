/**
 * Costumes made for the track kit's tracks. Each builds itself out of a few
 * simple shapes in a frame (origin on the ground, +z facing the marbles coming,
 * +y up, turned by q), sized to the footprint of the obstacle it dresses, so
 * what you see is what the marbles hit. Small idle movements only (a head
 * nodding, an ear twitching): returned as moving parts, driven by race time.
 *
 * Builder: (add, mat, group, point, q, size) → moving parts
 *   add(colourKey, geometry, matrix)  merged into one mesh per colour
 *   mat(colourKey)                    a material for a moving part
 *   size                              the footprint: { radius, height } for blocks
 *                                     and pegs; { len, width, height } for parked ones
 */
import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, IcosahedronGeometry, Matrix4, Mesh, Vector3 } from 'three';
import { local } from './animals';

export const COSTUME_COLORS = {
  pandaW: '#f4f2ec', pandaB: '#1f2024', bamboo: '#5f9e3a', bambooLeaf: '#7cc14b',
  camel: '#c9a06a', camelDark: '#9a7647', camelBlanket: '#b8312f',
  cafeTop: '#f3efe6', cafeMetal: '#2c2f36', cafeChair: '#a7713d',
  reindeer: '#7a5a3f', reindeerPale: '#e9e0d0', antler: '#d8c7a4', reindeerNose: '#3a2b22',
  oreCart: '#7d4a2d', oreRim: '#4a3427', ore: '#4d4f55', oreGold: '#e0b43c', oreWood: '#6e5136', oreRail: '#3a3b40', oreWheel: '#1e1f24',
  sledWood: '#b4783f', sledMetal: '#2c2f36',
  gateRed: '#e23b3b', gateBlue: '#2f6fd0', gatePole: '#f4f4f4',
  goBlack: '#1b1c20', goWhite: '#f1efe8',
  cowWhite: '#f2efe9', cowBrown: '#8a4b2a', cowNose: '#e8b4a0', cowHorn: '#e8dcc0', cowBell: '#d8a93a', cowStrap: '#5a3a24',
  marmot: '#9a7b56', marmotPale: '#d8c3a0', marmotDark: '#3a2e24', burrow: '#6e5a48',
  groomerRed: '#d8312a', groomerTrack: '#26282d', groomerGlass: '#2d3e52', groomerBlade: '#b8bcc2', groomerLight: '#ffd36b',
  elk: '#7b5536', elkDark: '#4a3424', elkPale: '#c9ab84', elkAntler: '#e3d4b4',
  chamois: '#b88a5a', chamoisDark: '#3a2a20', chamoisPale: '#f0e6d4', chamoisHorn: '#202024',
  snowmobile: '#2b62c9', snowmobileSeat: '#202226', snowmobileSki: '#9aa1aa', snowmobileGlass: '#9cc8e8',
  dogGrey: '#8a8d93', dogWhite: '#eef0f2', dogDark: '#3a3c42', dogHarness: '#e2462f',
  muskox: '#4a3426', muskoxPale: '#a08466', muskoxHorn: '#d9ccb4',
  foxWhite: '#f4f5f7', foxDark: '#2a2b30',
  flagOrange: '#f07a1f',
};

/** A part's head (or other moving piece) as its own little group at local (x, y, z), turned with the body. */
function movingPart(group, point, q, x, y, z, meshes) {
  const part = new Group();
  part.position.copy(point.clone().add(new Vector3(x, y, z).applyQuaternion(q)));
  part.quaternion.copy(q);
  for (const m of meshes) part.add(m);
  group.add(part);
  return part;
}

const mesh = (geometry, material, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
  const m = new Mesh(geometry, material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
};

// ── Blocks: sitting or standing in the pack's line ──────────────────────────

/** A giant panda sitting on the track eating bamboo, its head nodding as it chews (China Wall Twister). */
function panda(add, mat, group, point, q) {
  add('pandaW', new IcosahedronGeometry(0.55, 1), local(point, q, 0, 0.55, 0, 1, 1.05, 0.95));              // body, sitting up
  for (const x of [-0.3, 0.3]) add('pandaB', new IcosahedronGeometry(0.25, 1), local(point, q, x, 0.2, 0.38, 1, 0.7, 1.3)); // legs out in front
  for (const x of [-0.42, 0.42]) add('pandaB', new IcosahedronGeometry(0.18, 1), local(point, q, x, 0.78, 0.22, 0.8, 1.4, 0.8)); // arms
  add('pandaB', new IcosahedronGeometry(0.42, 1), local(point, q, 0, 0.82, -0.05, 1.12, 0.35, 1.05));      // the black band across the shoulders
  // Bamboo held up to its mouth.
  add('bamboo', new CylinderGeometry(0.04, 0.045, 1.25, 5), local(point, q, 0.28, 1.0, 0.42).multiply(new Matrix4().makeRotationZ(0.35)));
  for (const k of [0, 1]) add('bambooLeaf', new IcosahedronGeometry(0.12, 0), local(point, q, 0.05 + k * 0.12, 1.55 + k * 0.08, 0.42, 1.4, 0.3, 0.6));
  const head = movingPart(group, point, q, 0, 1.3, 0.1, [
    mesh(new IcosahedronGeometry(0.33, 1), mat('pandaW')),
    ...[-1, 1].map((k) => mesh(new IcosahedronGeometry(0.11, 0), mat('pandaB'), k * 0.23, 0.26, -0.02)), // ears
    ...[-1, 1].map((k) => mesh(new IcosahedronGeometry(0.08, 0), mat('pandaB'), k * 0.12, 0.03, 0.28, 1, 1.35, 0.6)), // eye patches
    mesh(new IcosahedronGeometry(0.05, 0), mat('pandaB'), 0, -0.08, 0.33), // nose
  ]);
  return [{ part: head, base: q.clone(), axis: new Vector3(1, 0, 0), swing: 0.12, period: 1.2 }];
}

/** A camel kneeling on the track, chewing and slowly turning its head (Dubai Twister). */
function camel(add, mat, group, point, q) {
  add('camel', new IcosahedronGeometry(0.5, 1), local(point, q, 0, 0.5, -0.15, 0.85, 0.8, 1.5));            // body, kneeling low
  add('camel', new IcosahedronGeometry(0.36, 1), local(point, q, 0, 1.0, -0.25, 0.9, 0.95, 1.1));          // hump
  add('camelBlanket', new BoxGeometry(0.98, 0.32, 0.55), local(point, q, 0, 0.78, -0.25));                 // a red blanket over it
  for (const x of [-0.32, 0.32]) {
    for (const z of [0.4, -0.58]) add('camelDark', new BoxGeometry(0.2, 0.18, 0.5), local(point, q, x, 0.09, z)); // folded legs
  }
  add('camel', new CylinderGeometry(0.12, 0.19, 0.9, 6), local(point, q, 0, 0.98, 0.62).multiply(new Matrix4().makeRotationX(0.55))); // neck
  const head = movingPart(group, point, q, 0, 1.4, 0.88, [
    mesh(new BoxGeometry(0.22, 0.24, 0.5), mat('camel'), 0, 0, 0.14),
    mesh(new BoxGeometry(0.18, 0.12, 0.16), mat('camelDark'), 0, -0.08, 0.4), // muzzle
    ...[-1, 1].map((k) => mesh(new ConeGeometry(0.04, 0.14, 4), mat('camelDark'), k * 0.09, 0.17, -0.04)), // ears
  ]);
  return [{ part: head, base: q.clone(), axis: new Vector3(0, 1, 0), swing: 0.45, period: 5.1 }];
}

/** A Paris café table with two chairs, out on the cobbles (Paris Eiffel Tower Run). Stands still. */
function cafeTable(add, mat, group, point, q) {
  add('cafeTop', new CylinderGeometry(0.5, 0.5, 0.06, 16), local(point, q, 0, 0.92, 0));
  add('cafeMetal', new CylinderGeometry(0.045, 0.045, 0.9, 6), local(point, q, 0, 0.46, 0));
  add('cafeMetal', new CylinderGeometry(0.28, 0.3, 0.04, 12), local(point, q, 0, 0.02, 0));
  for (const x of [-0.58, 0.58]) {
    const face = x < 0 ? 1 : -1; // facing the table
    add('cafeChair', new BoxGeometry(0.4, 0.05, 0.4), local(point, q, x, 0.5, 0));
    add('cafeChair', new BoxGeometry(0.05, 0.5, 0.4), local(point, q, x - face * 0.19, 0.76, 0));
    for (const dx of [-0.16, 0.16]) {
      for (const dz of [-0.16, 0.16]) add('cafeMetal', new BoxGeometry(0.03, 0.5, 0.03), local(point, q, x + dx, 0.25, dz));
    }
  }
  return [];
}

/** A reindeer standing in the pack's line, turning its head (Åre Run). */
function reindeer(add, mat, group, point, q) {
  add('reindeer', new BoxGeometry(0.55, 0.55, 1.2), local(point, q, 0, 1.0, -0.05));                       // body, along the track
  add('reindeerPale', new BoxGeometry(0.5, 0.2, 1.0), local(point, q, 0, 0.75, -0.05));                    // pale belly
  add('reindeerPale', new BoxGeometry(0.45, 0.4, 0.2), local(point, q, 0, 1.05, -0.68));                   // pale rump
  for (const [x, z] of [[-0.18, -0.48], [0.18, -0.48], [-0.18, 0.42], [0.18, 0.42]]) add('reindeer', new BoxGeometry(0.12, 0.75, 0.12), local(point, q, x, 0.38, z));
  add('reindeer', new BoxGeometry(0.24, 0.55, 0.28), local(point, q, 0, 1.38, 0.58).multiply(new Matrix4().makeRotationX(0.45))); // neck
  add('reindeerPale', new BoxGeometry(0.26, 0.3, 0.3), local(point, q, 0, 1.25, 0.66));                     // the shaggy white throat
  const antler = (k) => {
    const branch = [];
    branch.push(mesh(new CylinderGeometry(0.03, 0.04, 0.5, 5), mat('antler'), k * 0.16, 0.36, -0.04));
    branch[0].rotation.z = -k * 0.45;
    const tine = mesh(new CylinderGeometry(0.02, 0.03, 0.28, 5), mat('antler'), k * 0.3, 0.56, 0.06);
    tine.rotation.x = 0.7;
    branch.push(tine);
    const top = mesh(new CylinderGeometry(0.02, 0.03, 0.3, 5), mat('antler'), k * 0.36, 0.66, -0.12);
    top.rotation.z = -k * 0.2;
    branch.push(top);
    return branch;
  };
  const head = movingPart(group, point, q, 0, 1.68, 0.78, [
    mesh(new BoxGeometry(0.22, 0.24, 0.48), mat('reindeer'), 0, 0, 0.14),
    mesh(new IcosahedronGeometry(0.06, 0), mat('reindeerNose'), 0, -0.03, 0.4),
    ...[-1, 1].map((k) => mesh(new ConeGeometry(0.05, 0.16, 4), mat('reindeer'), k * 0.14, 0.12, -0.04)), // ears
    ...antler(-1), ...antler(1),
  ]);
  return [{ part: head, base: q.clone(), axis: new Vector3(0, 1, 0), swing: 0.35, period: 4.6 }];
}

/** A brown-and-white Swiss cow with a big bell, standing in the pack's line, nodding as she chews (Portes du Soleil Run). */
function cow(add, mat, group, point, q) {
  add('cowWhite', new BoxGeometry(0.62, 0.62, 1.28), local(point, q, 0, 1.0, -0.05));                       // body, along the track
  for (const [w, h, d, x, y, z] of [[0.02, 0.34, 0.5, 0.32, 1.1, -0.3], [0.02, 0.3, 0.45, -0.32, 0.95, 0.2], [0.4, 0.02, 0.5, 0, 1.32, -0.2]]) {
    add('cowBrown', new BoxGeometry(w, h, d), local(point, q, x, y, z));                                    // brown patches
  }
  for (const [x, z] of [[-0.2, -0.5], [0.2, -0.5], [-0.2, 0.42], [0.2, 0.42]]) add('cowWhite', new BoxGeometry(0.14, 0.72, 0.14), local(point, q, x, 0.36, z));
  add('cowNose', new IcosahedronGeometry(0.12, 0), local(point, q, 0, 0.62, -0.2, 1, 0.6, 1.2));           // udder
  add('cowStrap', new BoxGeometry(0.3, 0.08, 0.32), local(point, q, 0, 1.12, 0.66));                       // the bell's strap round her neck
  add('cowBell', new CylinderGeometry(0.1, 0.15, 0.24, 8), local(point, q, 0, 0.98, 0.72));               // the bell
  const head = movingPart(group, point, q, 0, 1.38, 0.72, [
    mesh(new BoxGeometry(0.34, 0.34, 0.4), mat('cowBrown'), 0, 0, 0.1),
    mesh(new BoxGeometry(0.3, 0.2, 0.16), mat('cowNose'), 0, -0.1, 0.34), // muzzle
    ...[-1, 1].map((k) => mesh(new BoxGeometry(0.16, 0.06, 0.1), mat('cowBrown'), k * 0.25, 0.08, 0)), // ears
    ...[-1, 1].map((k) => mesh(new ConeGeometry(0.035, 0.18, 5), mat('cowHorn'), k * 0.12, 0.25, 0)),  // horns
  ]);
  return [{ part: head, base: q.clone(), axis: new Vector3(1, 0, 0), swing: 0.1, period: 1.4 }];
}

/** A marmot sitting up at its burrow, peeking about (Portes du Soleil Run's forest; a figure beside the track). */
function marmot(add, mat, group, point, q) {
  add('burrow', new CylinderGeometry(0.45, 0.6, 0.18, 9), local(point, q, 0, 0.06, 0));                    // the mound of its burrow
  add('marmotDark', new CylinderGeometry(0.22, 0.22, 0.05, 9), local(point, q, 0.15, 0.16, 0.15));         // the hole
  add('marmot', new IcosahedronGeometry(0.22, 1), local(point, q, 0, 0.42, 0, 1, 1.45, 0.9));              // body, sitting up
  add('marmotPale', new IcosahedronGeometry(0.15, 0), local(point, q, 0, 0.42, 0.1, 1, 1.4, 0.7));        // pale belly
  const head = movingPart(group, point, q, 0, 0.78, 0.02, [
    mesh(new IcosahedronGeometry(0.13, 1), mat('marmot')),
    mesh(new IcosahedronGeometry(0.07, 0), mat('marmotPale'), 0, -0.04, 0.1), // muzzle
    mesh(new IcosahedronGeometry(0.025, 0), mat('marmotDark'), 0, -0.02, 0.16), // nose
  ]);
  return [{ part: head, base: q.clone(), axis: new Vector3(0, 1, 0), swing: 0.7, period: 2.3 }];
}

/** A bull elk standing in the pack's line, turning its head (Park City Run). */
function elk(add, mat, group, point, q) {
  add('elk', new BoxGeometry(0.58, 0.6, 1.3), local(point, q, 0, 1.05, -0.05));
  add('elkPale', new BoxGeometry(0.5, 0.45, 0.22), local(point, q, 0, 1.1, -0.72));                       // pale rump
  for (const [x, z] of [[-0.2, -0.52], [0.2, -0.52], [-0.2, 0.45], [0.2, 0.45]]) add('elkDark', new BoxGeometry(0.13, 0.8, 0.13), local(point, q, x, 0.4, z));
  add('elkDark', new BoxGeometry(0.3, 0.6, 0.32), local(point, q, 0, 1.45, 0.6).multiply(new Matrix4().makeRotationX(0.45))); // dark shaggy neck
  const antler = (k) => {
    const beam = mesh(new CylinderGeometry(0.03, 0.045, 0.7, 5), mat('elkAntler'), k * 0.22, 0.42, -0.12);
    beam.rotation.z = -k * 0.55;
    beam.rotation.x = -0.35;
    const tines = [0.25, 0.45].map((y, j) => {
      const t = mesh(new CylinderGeometry(0.018, 0.028, 0.26, 4), mat('elkAntler'), k * (0.3 + j * 0.1), y + 0.18, 0.02 - j * 0.12);
      t.rotation.x = 0.5;
      return t;
    });
    return [beam, ...tines];
  };
  const head = movingPart(group, point, q, 0, 1.8, 0.82, [
    mesh(new BoxGeometry(0.24, 0.26, 0.55), mat('elk'), 0, 0, 0.16),
    mesh(new BoxGeometry(0.2, 0.18, 0.14), mat('elkDark'), 0, -0.05, 0.44),
    ...[-1, 1].map((k) => mesh(new ConeGeometry(0.05, 0.18, 4), mat('elk'), k * 0.15, 0.13, -0.04)),
    ...antler(-1), ...antler(1),
  ]);
  return [{ part: head, base: q.clone(), axis: new Vector3(0, 1, 0), swing: 0.3, period: 5.2 }];
}

/** A Pyrenean chamois standing in the pack's line, its head turning (Baqueira-Beret Run). */
function chamois(add, mat, group, point, q) {
  add('chamois', new BoxGeometry(0.42, 0.45, 0.95), local(point, q, 0, 0.88, -0.05));
  add('chamoisDark', new BoxGeometry(0.44, 0.08, 0.95), local(point, q, 0, 1.12, -0.05));                  // the dark stripe along its back
  for (const [x, z] of [[-0.14, -0.38], [0.14, -0.38], [-0.14, 0.32], [0.14, 0.32]]) add('chamoisDark', new BoxGeometry(0.08, 0.68, 0.08), local(point, q, x, 0.34, z));
  add('chamois', new BoxGeometry(0.18, 0.42, 0.2), local(point, q, 0, 1.18, 0.45).multiply(new Matrix4().makeRotationX(0.35))); // neck
  const head = movingPart(group, point, q, 0, 1.42, 0.55, [
    mesh(new BoxGeometry(0.16, 0.18, 0.36), mat('chamoisPale'), 0, 0, 0.1),
    ...[-1, 1].map((k) => mesh(new BoxGeometry(0.03, 0.2, 0.36), mat('chamoisDark'), k * 0.07, 0.01, 0.12)), // the dark face stripes
    ...[-1, 1].map((k) => {
      const horn = mesh(new CylinderGeometry(0.012, 0.025, 0.24, 4), mat('chamoisHorn'), k * 0.05, 0.2, 0.02);
      horn.rotation.x = -0.35; // (hooked back at the tips)
      return horn;
    }),
    ...[-1, 1].map((k) => mesh(new ConeGeometry(0.035, 0.12, 4), mat('chamois'), k * 0.1, 0.12, -0.04)),
  ]);
  return [{ part: head, base: q.clone(), axis: new Vector3(0, 1, 0), swing: 0.5, period: 3.1 }];
}

/** A Greenland sled dog lying in the snow, ears up, its head turning (Greenland Expedition's pile-up). */
function sledDog(add, mat, group, point, q, size = {}) {
  const l = size.l ?? 0;
  const k = l < -0.1 ? 0 : l > 0.2 ? 1 : 2; // (a grey, a dark and a pale one in the pile-up)
  const coat = ['dogGrey', 'dogDark', 'dogWhite'][k];
  add(coat, new BoxGeometry(0.42, 0.34, 0.95), local(point, q, 0, 0.24, -0.08));                          // body, lying down
  add('dogWhite', new BoxGeometry(0.36, 0.12, 0.8), local(point, q, 0, 0.1, -0.06));                      // pale belly
  for (const x of [-0.13, 0.13]) add('dogWhite', new BoxGeometry(0.1, 0.1, 0.42), local(point, q, x, 0.06, 0.48)); // front paws out ahead
  add(coat, new IcosahedronGeometry(0.16, 0), local(point, q, 0.1, 0.4, -0.62, 1, 1, 1));                 // curled tail
  add('dogHarness', new BoxGeometry(0.46, 0.06, 0.12), local(point, q, 0, 0.42, 0.18));                   // harness
  const head = movingPart(group, point, q, 0, 0.56, 0.42, [
    mesh(new BoxGeometry(0.26, 0.24, 0.3), mat(coat)),
    mesh(new BoxGeometry(0.16, 0.12, 0.18), mat('dogWhite'), 0, -0.05, 0.2),          // muzzle
    mesh(new IcosahedronGeometry(0.03, 0), mat('dogDark'), 0, -0.01, 0.3),            // nose
    ...[-1, 1].map((k2) => mesh(new ConeGeometry(0.055, 0.15, 4), mat(coat), k2 * 0.08, 0.18, -0.05)), // ears up
  ]);
  return [{ part: head, base: q.clone(), axis: new Vector3(0, 1, 0), swing: 0.4, period: 2.6 + k * 0.7 }];
}

/** An Arctic fox sitting on a rock, watching (Greenland Expedition; a figure beside the track). */
function arcticFox(add, mat, group, point, q) {
  add('burrow', new IcosahedronGeometry(0.5, 0), local(point, q, 0, 0.15, 0, 1.2, 0.5, 1));               // its rock
  add('foxWhite', new IcosahedronGeometry(0.2, 1), local(point, q, 0, 0.55, -0.05, 0.9, 1.3, 1.1));       // body, sitting up
  add('foxWhite', new IcosahedronGeometry(0.16, 0), local(point, q, 0.2, 0.36, -0.25, 1.4, 0.6, 1.8));    // bushy tail round its feet
  const head = movingPart(group, point, q, 0, 0.86, 0.04, [
    mesh(new IcosahedronGeometry(0.12, 1), mat('foxWhite')),
    mesh(new ConeGeometry(0.06, 0.16, 5), mat('foxWhite'), 0, -0.03, 0.14).rotateX(Math.PI / 2),
    mesh(new IcosahedronGeometry(0.02, 0), mat('foxDark'), 0, -0.03, 0.23),
    ...[-1, 1].map((k) => mesh(new ConeGeometry(0.045, 0.1, 4), mat('foxWhite'), k * 0.07, 0.12, -0.02)),
  ]);
  return [{ part: head, base: q.clone(), axis: new Vector3(0, 1, 0), swing: 0.6, period: 3.4 }];
}

/** Greenland Expedition's musk ox: its shaggy body beyond the rim (its head on its neck is the swiping arm). */
function muskoxBody(add, base, q) {
  add('muskox', new IcosahedronGeometry(1, 1), local(base, q, 0, 1.3, -0.5, 0.95, 0.9, 1.5));              // shaggy body
  add('muskox', new IcosahedronGeometry(0.75, 1), local(base, q, 0, 1.7, 0.2, 1, 0.9, 1));                 // the hump over its shoulders
  add('muskoxPale', new BoxGeometry(1.1, 0.4, 0.9), local(base, q, 0, 1.75, -0.6));                        // pale saddle
  for (const [x, z] of [[-0.45, -1.3], [0.45, -1.3], [-0.45, 0.3], [0.45, 0.3]]) add('muskoxPale', new CylinderGeometry(0.16, 0.18, 0.7, 6), local(base, q, x, 0.35, z));
  add('muskox', new BoxGeometry(1.5, 0.5, 2.2), local(base, q, 0, 0.75, -0.5));                            // the long skirt of hair
  for (const x of [-1, 1]) add('muskoxHorn', new ConeGeometry(0.1, 0.6, 5), local(base, q, x * 0.45, 1.95, 0.85).multiply(new Matrix4().makeRotationZ(-x * 1.9)));
}

// ── Parked along a wall: filling the footprint, `len` metres down the track ─
// Frame: +x out of the channel, +z down the track, centred on the footprint.

/** Old mine ore carts coupled on a short stretch of rails, loaded with ore (Park City Run). */
function oreCart(add, mat, group, rimCentre, q, { len, width, drop = 0 }) {
  // Run in on a rail spur down the wall, so the carts' inner sides stand where marbles hit them.
  const cartW = 1.7;
  const centre = rimCentre.clone().add(new Vector3(-(width - cartW) / 2, -drop, 0).applyQuaternion(q));
  for (const x of [-0.45, 0.45]) add('oreRail', new BoxGeometry(0.08, 0.1, len + 0.6), local(centre, q, x, 0.05, 0));
  for (let z = -len / 2; z <= len / 2 + 1e-6; z += 1) add('oreWood', new BoxGeometry(1.3, 0.08, 0.22), local(centre, q, 0, 0.02, z));
  const carts = Math.max(1, Math.round(len / 3.4));
  const each = len / carts;
  for (let k = 0; k < carts; k += 1) {
    const z = -len / 2 + each * (k + 0.5);
    const long = each - 0.5;
    add('oreCart', new BoxGeometry(cartW, 0.85, long), local(centre, q, 0, 0.82, z));
    add('oreRim', new BoxGeometry(cartW + 0.1, 0.1, long + 0.1), local(centre, q, 0, 1.26, z));
    for (let j = -1; j <= 1; j += 1) add('ore', new IcosahedronGeometry(0.42, 0), local(centre, q, (j % 2) * 0.25, 1.32, z + j * long * 0.28, 1.2, 0.55, 1.1));
    for (const j of [-1, 1]) add('oreGold', new IcosahedronGeometry(0.08, 0), local(centre, q, j * 0.3, 1.45, z + j * 0.4));
    for (const x of [-0.55, 0.55]) {
      for (const dz of [-0.35, 0.35]) {
        add('oreWheel', new CylinderGeometry(0.26, 0.26, 0.12, 10), local(centre, q, x, 0.3, z + dz * long).multiply(new Matrix4().makeRotationZ(Math.PI / 2)));
      }
    }
  }
  return [];
}

/** Swedish kick-sleds parked in a row at the edge, leaning on the rim (Åre Run). */
function kickSled(add, mat, group, rimCentre, q, { len, width, drop = 0 }) {
  // Standing on the wall where the footprint's inner edge is, so marbles hit what they see.
  const centre = rimCentre.clone().add(new Vector3(-(width - 0.7) / 2, -drop, 0).applyQuaternion(q));
  const sleds = Math.max(1, Math.round(len / 2.2));
  const each = len / sleds;
  for (let k = 0; k < sleds; k += 1) {
    const z = -len / 2 + each * (k + 0.5);
    for (const x of [-0.25, 0.25]) {
      add('sledMetal', new BoxGeometry(0.04, 0.04, 1.8), local(centre, q, x, 0.04, z));                       // runners
      add('sledMetal', new BoxGeometry(0.04, 1.1, 0.04), local(centre, q, x, 0.6, z - 0.6).multiply(new Matrix4().makeRotationX(-0.15))); // uprights
    }
    add('sledMetal', new BoxGeometry(0.6, 0.05, 0.05), local(centre, q, 0, 1.15, z - 0.68));                  // handlebar
    add('sledWood', new BoxGeometry(0.5, 0.05, 0.42), local(centre, q, 0, 0.5, z - 0.3));                     // seat
    add('sledWood', new BoxGeometry(0.5, 0.45, 0.05), local(centre, q, 0, 0.74, z - 0.52));                   // seat back
    for (const x of [-0.22, 0.22]) add('sledMetal', new BoxGeometry(0.03, 0.48, 0.03), local(centre, q, x, 0.26, z - 0.3)); // seat legs
  }
  return [];
}

/** A red piste groomer parked at the edge, blade down, cab windows dark (Portes du Soleil Run). */
function pisteGroomer(add, mat, group, rimCentre, q, { len, width, drop = 0 }) {
  const W = 2.3;
  const centre = rimCentre.clone().add(new Vector3(-(width - W) / 2, -drop, 0).applyQuaternion(q));
  const body = len - 2.2;
  for (const x of [-0.8, 0.8]) {
    add('groomerTrack', new BoxGeometry(0.7, 0.7, body), local(centre, q, x, 0.35, 0));                  // the caterpillar tracks
    for (let z = -body / 2 + 0.3; z <= body / 2 - 0.3; z += 0.6) add('groomerBlade', new BoxGeometry(0.72, 0.06, 0.1), local(centre, q, x, 0.71, z));
  }
  add('groomerRed', new BoxGeometry(W - 0.1, 0.9, body - 0.4), local(centre, q, 0, 1.15, -0.1));        // the body
  add('groomerRed', new BoxGeometry(W - 0.3, 1.2, 2.2), local(centre, q, 0, 2.2, body / 2 - 1.4));      // the cab
  for (const x of [-1, 1]) add('groomerGlass', new BoxGeometry(0.04, 0.7, 1.7), local(centre, q, x * (W - 0.28) / 2, 2.35, body / 2 - 1.4));
  add('groomerGlass', new BoxGeometry(W - 0.4, 0.7, 0.04), local(centre, q, 0, 2.35, body / 2 - 0.28));
  add('groomerLight', new BoxGeometry(1.2, 0.12, 0.12), local(centre, q, 0, 2.86, body / 2 - 0.5));    // lights on the cab roof
  add('groomerBlade', new BoxGeometry(W + 0.2, 0.9, 0.18), local(centre, q, 0, 0.5, len / 2 - 0.3).multiply(new Matrix4().makeRotationX(-0.25))); // the blade
  for (const x of [-0.6, 0.6]) add('groomerTrack', new BoxGeometry(0.12, 0.12, 0.9), local(centre, q, x, 0.8, len / 2 - 0.9));
  add('groomerTrack', new BoxGeometry(W, 0.5, 0.9), local(centre, q, 0, 0.45, -len / 2 + 0.45));        // the tiller behind
  add('groomerBlade', new BoxGeometry(W, 0.05, 0.6), local(centre, q, 0, 0.04, -len / 2 + 0.3));        // the comb
  return [];
}

/** Snowmobiles parked in a row at the edge (Baqueira-Beret Run, Greenland Expedition). */
function snowmobile(add, mat, group, rimCentre, q, { len, width, drop = 0 }) {
  const centre = rimCentre.clone().add(new Vector3(-(width - 1.2) / 2, -drop, 0).applyQuaternion(q));
  const count = Math.max(1, Math.round(len / 3.2));
  const each = len / count;
  for (let k = 0; k < count; k += 1) {
    const z = -len / 2 + each * (k + 0.5);
    add('snowmobileSeat', new BoxGeometry(0.75, 0.35, 2.2), local(centre, q, 0, 0.25, z - 0.2));            // the track underneath
    add('snowmobile', new BoxGeometry(1.0, 0.5, 1.4), local(centre, q, 0, 0.62, z + 0.55));                 // the hood
    add('snowmobileSeat', new BoxGeometry(0.55, 0.3, 1.2), local(centre, q, 0, 0.75, z - 0.6));              // seat
    add('snowmobileGlass', new BoxGeometry(0.8, 0.4, 0.05), local(centre, q, 0, 1.05, z + 0.25).multiply(new Matrix4().makeRotationX(-0.4))); // windscreen
    add('snowmobileSki', new BoxGeometry(1.0, 0.06, 0.06), local(centre, q, 0, 0.88, z + 0.05));             // handlebar
    for (const x of [-0.45, 0.45]) add('snowmobileSki', new BoxGeometry(0.14, 0.06, 1.2), local(centre, q, x, 0.03, z + 1.0)); // skis
  }
  return [];
}

// ── Slalom gates and pegs: thin poles and small round pieces ────────────────

/** A slalom pole with its little flag, red on the left of the middle, blue on the right (ski tracks). */
function slalomGate(add, mat, group, point, q, { height, l }) {
  const colour = l >= 0 ? 'gateRed' : 'gateBlue';
  add('gatePole', new CylinderGeometry(0.04, 0.05, height, 6), local(point, q, 0, height / 2, 0));
  for (let k = 0; k < 3; k += 1) add(colour, new CylinderGeometry(0.055, 0.055, height * 0.12, 6), local(point, q, 0, height * (0.2 + 0.3 * k), 0));
  // The flag hangs off the pole towards its own side of the channel.
  const side = l >= 0 ? 1 : -1;
  add(colour, new BoxGeometry(0.55, 0.42, 0.03), local(point, q, side * 0.3, height - 0.28, 0));
  return [];
}

/** An expedition's route-marker flag: a bamboo pole with a small orange flag, marking the way down the ice (Greenland Expedition). */
function routeFlag(add, mat, group, point, q, { height, l }) {
  add('bamboo', new CylinderGeometry(0.035, 0.045, height + 0.4, 5), local(point, q, 0, (height + 0.4) / 2, 0));
  const side = l >= 0 ? 1 : -1;
  add('flagOrange', new BoxGeometry(0.5, 0.34, 0.03), local(point, q, side * 0.27, height + 0.15, 0));
  return [];
}

/** A round Go stone lying on the board, black or white (China Wall Twister's board-game run). */
function goStone(add, mat, group, point, q, { radius, at }) {
  const white = Math.round(at * 997) % 2 === 1;
  add(white ? 'goWhite' : 'goBlack', new IcosahedronGeometry(radius, 2), local(point, q, 0, radius * 0.42, 0, 1, 0.42, 1));
  return [];
}

/**
 * The kit's costumes by name: where each is placed (`places`: the kind of
 * obstacle it dresses) and how it is built.
 */
export const KIT_COSTUMES = {
  panda: { places: 'block', build: panda },
  camel: { places: 'block', build: camel },
  'cafe-table': { places: 'block', upright: true, build: cafeTable },
  reindeer: { places: 'block', upright: true, build: reindeer },
  cow: { places: 'block', upright: true, build: cow },
  marmot: { places: 'block', upright: true, build: marmot },
  elk: { places: 'block', upright: true, build: elk },
  chamois: { places: 'block', upright: true, build: chamois },
  'sled-dog': { places: 'block', build: sledDog },
  'arctic-fox': { places: 'block', upright: true, build: arcticFox },
  'musk-ox': {
    places: 'swipe',
    body: muskoxBody,
    standOff: 2.2, // metres out beyond the rim
    sink: -0.3,
    // Its neck and head, from the shoulder to the head, swung in on the swipe's timetable (horns on top).
    arm: { colour: 'muskox', shoulder: [0, 1.6, 0.9], radii: [0.22, 0.32], segments: 7, tip: 0.36, tipDetail: 1, end: 0.16, endDetail: 0, lift: 0.4, outLift: 0.4, nose: 0.2 },
  },
  'ore-cart': { places: 'parked', build: oreCart },
  'piste-groomer': { places: 'parked', build: pisteGroomer },
  snowmobile: { places: 'parked', build: snowmobile },
  'kick-sled': { places: 'parked', build: kickSled },
  'slalom-gate': { places: 'slalom', build: slalomGate },
  'go-stone': { places: 'slalom', build: goStone },
  'route-flag': { places: 'slalom', build: routeFlag },
};
