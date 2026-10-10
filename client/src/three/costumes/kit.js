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
import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, IcosahedronGeometry, Matrix4, Mesh, Quaternion, SphereGeometry, Vector3 } from 'three';
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
  lampGreen: '#2f4a3a', lampGlass: '#f6e7b0',
  vespaMint: '#9fd8c4', vespaCream: '#f2e6c8', vespaRed: '#d84a3a', vespaSeat: '#3a2a22', vespaChrome: '#c9ccd1', tyre: '#1e1f24',
  easelWood: '#8a6a45', canvasWhite: '#f4f0e6', paintBlue: '#3f6fb5', paintYellow: '#e8b62a', paintRed: '#c84a3a',
  rallyOrange: '#f07a1f', rallyBlack: '#1f2024', rallyPole: '#e8e4da',
  buggyFrame: '#e8b62a', buggyCage: '#2c2f36', buggySeat: '#b8312f',
  carRed: '#c8141c', carGlass: '#2a3440', carChrome: '#c9ccd1',
  falcon: '#8a6a4a', falconPale: '#e8dcc8', falconDark: '#3a2e26', perch: '#6b4a2f', perchCloth: '#2f5d9a', falconBeak: '#e0b43c',
  logBark: '#5a3f2a', logEnd: '#b48a5a', moss: '#5f8a3a',
  caiman: '#4f5a3a', caimanBelly: '#a8a07a', caimanEye: '#e0b43c', caimanMouth: '#c86a6a',
  jaguar: '#d9a24a', jaguarSpot: '#3a2a1e', jaguarPale: '#f0e2c4',
  ballWhite: '#f4f4f2', ballBlack: '#1f2024', ballYellow: '#f2d23a', ballGreen: '#2f9a4a',
  flagYellow: '#f2d23a', flagPole: '#f4f4f2',
  surferSkin: '#c98f6a', surferShorts: '#2fb3a0', board1: '#e23b3b', board2: '#2f6fd0', board3: '#e8b62a', surferHair: '#3a2a1e',
  monkey: '#6b4a2f', monkeyFace: '#d9b08a', branch: '#5a4a38', leafGreen: '#3f8f3a',
  lanternRed: '#d8231f', lanternGold: '#e0b43c', lanternPost: '#3a2a22',
  xqWood: '#e8c890', xqRed: '#c8231f', xqBlack: '#1f2024',
  catWhite: '#f6f3ec', catRed: '#d8231f', catGold: '#e0b43c', catEar: '#f0a8a8',
  pigeonGrey: '#8e939c', pigeonDark: '#4f545c', pigeonNeck: '#5f8a7a', beak: '#3a3a3a',
  // Grand Prix: tyre stacks, traffic cones, the safety car, the TV camera crane, the banner gantry.
  tyreBlack: '#1c1d21', tyreBandRed: '#d8322b', tyreBandWhite: '#f2f2ee',
  coneOrange: '#f26a1b', coneWhite: '#f4f4f2', coneBase: '#202226',
  safetyWhite: '#f2f2ee', safetyStripe: '#f2b81c', safetyBlue: '#2556b8', lightAmber: '#ffb21c', lightGreen: '#3fd16a',
  craneBase: '#2c2f36', craneYellow: '#f2b81c', craneArm: '#30333a', cameraBody: '#1b1c20', cameraLens: '#5f7fa8', operatorShirt: '#2f5d9a', operatorSkin: '#c98f6a',
  simitRed: '#b8231f', simit: '#c98a3a', simitWood: '#6b4a2f', simitShade: '#f2f2ee',
  danfoYellow: '#f2c21c', danfoBlack: '#1c1d21', matatuGreen: '#2fb35a', matatuPink: '#e8317a', matatuBlue: '#2a6fd8',
  bannerPost: '#3a3d44', bannerRed: '#d8322b', bannerBlue: '#2556b8', bannerWhite: '#f2f2ee', bannerGold: '#e8b62a',
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

/** Vespa scooters parked in a row at the edge, in Paris pastels (Paris Eiffel Tower Run). */
function vespa(add, mat, group, rimCentre, q, { len, width, drop = 0 }) {
  const centre = rimCentre.clone().add(new Vector3(-(width - 0.8) / 2, -drop, 0).applyQuaternion(q));
  const count = Math.max(1, Math.round(len / 2.1));
  const each = len / count;
  const paint = ['vespaMint', 'vespaCream', 'vespaRed'];
  for (let k = 0; k < count; k += 1) {
    const z = -len / 2 + each * (k + 0.5);
    const c = paint[k % 3];
    for (const dz of [-0.6, 0.6]) add('tyre', new CylinderGeometry(0.22, 0.22, 0.12, 12), local(centre, q, 0, 0.22, z + dz).multiply(new Matrix4().makeRotationZ(Math.PI / 2)));
    add(c, new BoxGeometry(0.5, 0.45, 0.7), local(centre, q, 0, 0.55, z - 0.35));                   // the rounded rear body
    add(c, new BoxGeometry(0.42, 0.12, 0.6), local(centre, q, 0, 0.3, z + 0.15));                   // the footboard
    add(c, new BoxGeometry(0.42, 0.75, 0.12), local(centre, q, 0, 0.7, z + 0.5).multiply(new Matrix4().makeRotationX(-0.15))); // the leg shield
    add('vespaSeat', new BoxGeometry(0.3, 0.1, 0.55), local(centre, q, 0, 0.82, z - 0.3));
    add('vespaChrome', new BoxGeometry(0.6, 0.05, 0.05), local(centre, q, 0, 1.12, z + 0.55));        // handlebars
    add('vespaChrome', new CylinderGeometry(0.07, 0.07, 0.04, 8), local(centre, q, 0, 1.0, z + 0.62).multiply(new Matrix4().makeRotationX(Math.PI / 2))); // headlamp
  }
  return [];
}

/** A dune buggy parked at the edge: a yellow tube frame, a roll cage, fat tyres (Dubai Twister). */
function duneBuggy(add, mat, group, rimCentre, q, { len, width, drop = 0 }) {
  const W = 1.9;
  const centre = rimCentre.clone().add(new Vector3(-(width - W) / 2, -drop, 0).applyQuaternion(q));
  const count = Math.max(1, Math.round(len / 4));
  const each = len / count;
  for (let k = 0; k < count; k += 1) {
    const z = -len / 2 + each * (k + 0.5);
    const L = each - 0.6;
    for (const x of [-0.8, 0.8]) for (const dz of [-L / 2 + 0.5, L / 2 - 0.5]) add('tyre', new CylinderGeometry(0.42, 0.42, 0.35, 12), local(centre, q, x, 0.42, z + dz).multiply(new Matrix4().makeRotationZ(Math.PI / 2)));
    add('buggyFrame', new BoxGeometry(1.3, 0.35, L - 0.4), local(centre, q, 0, 0.65, z));
    add('buggySeat', new BoxGeometry(0.9, 0.5, 0.7), local(centre, q, 0, 1.05, z - 0.2));
    for (const x of [-0.6, 0.6]) {
      add('buggyCage', new BoxGeometry(0.08, 1.2, 0.08), local(centre, q, x, 1.4, z + 0.4));
      add('buggyCage', new BoxGeometry(0.08, 1.2, 0.08), local(centre, q, x, 1.4, z - 0.8));
      add('buggyCage', new BoxGeometry(0.08, 0.08, 1.3), local(centre, q, x, 2.0, z - 0.2));
    }
    add('buggyCage', new BoxGeometry(1.25, 0.08, 0.08), local(centre, q, 0, 2.0, z + 0.4));
  }
  return [];
}

/** A low red sports car parked at the edge (Dubai Twister). */
function sportsCar(add, mat, group, rimCentre, q, { len, width, drop = 0 }) {
  const W = 1.95;
  const centre = rimCentre.clone().add(new Vector3(-(width - W) / 2, -drop, 0).applyQuaternion(q));
  const L = Math.min(len, 4.6);
  for (let n = 0; n < Math.max(1, Math.floor(len / 4.6)); n += 1) {
    const z = -len / 2 + L / 2 + n * L;
    for (const x of [-0.85, 0.85]) for (const dz of [-1.4, 1.4]) add('tyre', new CylinderGeometry(0.34, 0.34, 0.25, 12), local(centre, q, x, 0.34, z + dz).multiply(new Matrix4().makeRotationZ(Math.PI / 2)));
    add('carRed', new BoxGeometry(1.9, 0.55, L - 0.2), local(centre, q, 0, 0.6, z));
    add('carRed', new BoxGeometry(1.6, 0.4, L * 0.38), local(centre, q, 0, 1.05, z - 0.2).multiply(new Matrix4().makeRotationX(0.05)));
    add('carGlass', new BoxGeometry(1.5, 0.32, L * 0.36), local(centre, q, 0, 1.08, z - 0.2));
    add('carChrome', new BoxGeometry(1.7, 0.08, 0.08), local(centre, q, 0, 0.75, z + L / 2 - 0.12));
    add('carRed', new BoxGeometry(1.7, 0.08, 0.35), local(centre, q, 0, 1.05, z - L / 2 + 0.3));   // the rear wing
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

/** A desert rally marker: a pole with an orange-and-black flag, marking the way down the dunes (Dubai Twister's slalom poles). */
function rallyFlag(add, mat, group, point, q, { height, l }) {
  add('rallyPole', new CylinderGeometry(0.035, 0.045, height + 0.5, 5), local(point, q, 0, (height + 0.5) / 2, 0));
  const side = l >= 0 ? 1 : -1;
  add('rallyOrange', new BoxGeometry(0.5, 0.17, 0.03), local(point, q, side * 0.27, height + 0.32, 0));
  add('rallyBlack', new BoxGeometry(0.5, 0.17, 0.03), local(point, q, side * 0.27, height + 0.15, 0));
  return [];
}

/** Dubai Twister's falcon on its perch beyond the rim (its wing, spread on the swipe's timetable, is the arm). */
function falconBody(add, base, q) {
  add('perch', new CylinderGeometry(0.1, 0.12, 1.6, 6), local(base, q, 0, 0.8, 0));
  add('perch', new CylinderGeometry(0.5, 0.6, 0.12, 8), local(base, q, 0, 0.06, 0));
  add('perchCloth', new CylinderGeometry(0.28, 0.28, 0.12, 8), local(base, q, 0, 1.62, 0));
  add('falcon', new IcosahedronGeometry(0.32, 1), local(base, q, 0, 1.98, 0, 0.85, 1.25, 0.9));      // body, upright
  add('falconPale', new IcosahedronGeometry(0.22, 0), local(base, q, 0, 1.92, 0.12, 0.8, 1.2, 0.6)); // the pale speckled breast
  add('falconDark', new IcosahedronGeometry(0.17, 1), local(base, q, 0, 2.43, 0.04));              // head
  add('falconBeak', new ConeGeometry(0.05, 0.12, 4), local(base, q, 0, 2.39, 0.22).multiply(new Matrix4().makeRotationX(Math.PI / 2 + 0.4)));
  add('falconDark', new BoxGeometry(0.22, 0.04, 0.5), local(base, q, 0, 1.7, -0.3).multiply(new Matrix4().makeRotationX(0.6))); // tail
}

/** A floating log, mossy, bobbing gently on the river (Amazon Water Run's blocks). The whole log is the moving part. */
function floatingLog(add, mat, group, point, q) {
  add('canvasWhite', new CylinderGeometry(0.85, 0.85, 0.02, 14, 1, true), local(point, q, 0, 0.05, 0)); // a ring of foam round it
  const log = movingPart(group, point, q, 0, 0.42, 0, [
    mesh(new CylinderGeometry(0.4, 0.45, 1.3, 9), mat('logBark')).rotateZ(Math.PI / 2),
    ...[-1, 1].map((k) => mesh(new CylinderGeometry(0.36, 0.36, 0.04, 9), mat('logEnd'), k * 0.66, 0, 0).rotateZ(Math.PI / 2)),
    mesh(new IcosahedronGeometry(0.25, 0), mat('moss'), 0.2, 0.3, 0.05, 1.6, 0.4, 1),
    mesh(new CylinderGeometry(0.06, 0.08, 0.5, 5), mat('logBark'), -0.2, 0.45, 0.1).rotateZ(0.6),
  ]);
  return [{ part: log, base: q.clone(), axis: new Vector3(1, 0, 0), swing: 0.12, period: 2.2 }];
}

/** A caiman lying curled on the high line, its jaws slowly opening (Amazon Water Run). */
function caiman(add, mat, group, point, q) {
  // Its body curled round in a U, so all of it lies within the block's footprint.
  for (let k = 0; k < 7; k += 1) {
    const a = -1.2 + k * 0.42;
    const r = 0.5;
    const w = 0.42 - Math.abs(k - 2) * 0.04;
    add('caiman', new BoxGeometry(w, 0.28, 0.32), local(point, q, Math.sin(a) * r, 0.16, Math.cos(a) * r - 0.1).multiply(new Matrix4().makeRotationY(a)));
    add('caimanBelly', new BoxGeometry(w * 0.9, 0.06, 0.3), local(point, q, Math.sin(a) * r, 0.03, Math.cos(a) * r - 0.1).multiply(new Matrix4().makeRotationY(a)));
  }
  add('caiman', new ConeGeometry(0.12, 0.6, 5), local(point, q, -0.55, 0.12, -0.45).multiply(new Matrix4().makeRotationZ(Math.PI / 2))); // tail tip
  for (const x of [-0.3, 0.3]) add('caiman', new BoxGeometry(0.1, 0.14, 0.25), local(point, q, x + 0.2, 0.07, 0.3));
  const jaw = movingPart(group, point, q, 0.45, 0.2, -0.1, [
    mesh(new BoxGeometry(0.26, 0.1, 0.5), mat('caiman'), 0, 0.04, 0.25),
    mesh(new BoxGeometry(0.22, 0.03, 0.45), mat('caimanMouth'), 0, -0.02, 0.24),
    ...[-1, 1].map((k) => mesh(new IcosahedronGeometry(0.04, 0), mat('caimanEye'), k * 0.08, 0.12, 0.05)),
  ]);
  add('caiman', new BoxGeometry(0.24, 0.08, 0.5), local(point, q, 0.45, 0.12, 0.15)); // the lower jaw
  return [{ part: jaw, base: q.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -0.15)), axis: new Vector3(1, 0, 0), swing: 0.25, period: 5.5 }];
}

/** A jaguar resting on the bank, sitting up like a sphinx, its head turning (Amazon Water Run; a figure). */
function jaguar(add, mat, group, point, q) {
  add('jaguar', new BoxGeometry(0.5, 0.42, 1.0), local(point, q, 0, 0.3, -0.1));
  add('jaguarPale', new BoxGeometry(0.4, 0.1, 0.9), local(point, q, 0, 0.1, -0.1));
  for (const [x, z] of [[-0.12, 0.2], [0.18, -0.35], [-0.15, -0.45], [0.12, 0.05]]) add('jaguarSpot', new BoxGeometry(0.12, 0.02, 0.12), local(point, q, x, 0.52, z));
  for (const x of [-0.14, 0.14]) add('jaguar', new BoxGeometry(0.12, 0.1, 0.45), local(point, q, x, 0.06, 0.55));   // front paws
  add('jaguar', new CylinderGeometry(0.05, 0.07, 0.8, 5), local(point, q, 0.25, 0.08, -0.55).multiply(new Matrix4().makeRotationX(Math.PI / 2 - 0.2)));
  const head = movingPart(group, point, q, 0, 0.62, 0.42, [
    mesh(new BoxGeometry(0.32, 0.26, 0.3), mat('jaguar')),
    mesh(new BoxGeometry(0.18, 0.12, 0.12), mat('jaguarPale'), 0, -0.06, 0.18),
    ...[-1, 1].map((k) => mesh(new ConeGeometry(0.05, 0.1, 4), mat('jaguar'), k * 0.11, 0.16, -0.04)),
  ]);
  return [{ part: head, base: q.clone(), axis: new Vector3(0, 1, 0), swing: 0.45, period: 4.4 }];
}

/** A river marker stake: a bamboo pole with a strip of red cloth, as river pilots mark the channel (Amazon Water Run's slalom poles). */
function riverStake(add, mat, group, point, q, { height, l }) {
  add('bamboo', new CylinderGeometry(0.04, 0.05, height + 0.3, 5), local(point, q, 0, (height + 0.3) / 2, 0));
  for (let k = 0; k < 3; k += 1) add('logBark', new CylinderGeometry(0.055, 0.055, 0.04, 5), local(point, q, 0, 0.4 + k * 0.45, 0));
  const side = l >= 0 ? 1 : -1;
  add('gateRed', new BoxGeometry(0.4, 0.12, 0.02), local(point, q, side * 0.22, height + 0.12, 0).multiply(new Matrix4().makeRotationZ(-side * 0.3)));
  return [];
}

/** A football on the track, rocking gently in place (Rio Jungle Rumble's blocks): white with dark patches. */
function football(add, mat, group, point, q, size = {}) {
  const r = Math.min(0.7, (size.radius ?? 0.75) - 0.05);
  const dark = Math.round(((size.l ?? 0) + 1) * 5) % 2 ? 'ballBlack' : 'ballGreen';
  add('ballBlack', new CylinderGeometry(r * 0.6, r * 0.6, 0.02, 12, 1, true), local(point, q, 0, 0.02, 0)); // the dent it sits in
  const ball = movingPart(group, point, q, 0, r, 0, [
    mesh(new IcosahedronGeometry(r, 1), mat('ballWhite')),
    ...[[0, 1, 0], [0.9, 0.3, 0.3], [-0.6, 0.2, 0.8], [0.2, -0.4, -0.9], [-0.8, -0.3, -0.5], [0.5, 0.5, -0.7]].map(([x, y, z]) => {
      const n = new Vector3(x, y, z).normalize();
      return mesh(new IcosahedronGeometry(r * 0.32, 0), mat(dark), n.x * r * 0.86, n.y * r * 0.86, n.z * r * 0.86, 1, 1, 1);
    }),
  ]);
  return [{ part: ball, base: q.clone(), axis: new Vector3(1, 0, 0), swing: 0.15, period: 1.8 }];
}

/** A football corner flag: a white pole with a yellow flag (Rio Jungle Rumble's slalom poles). */
function cornerFlag(add, mat, group, point, q, { height, l }) {
  add('flagPole', new CylinderGeometry(0.035, 0.045, height + 0.3, 6), local(point, q, 0, (height + 0.3) / 2, 0));
  const side = l >= 0 ? 1 : -1;
  add('flagYellow', new BoxGeometry(0.45, 0.32, 0.02), local(point, q, side * 0.24, height + 0.1, 0));
  return [];
}

/** A surfer standing at the edge, a surfboard stood up beside them (Rio Jungle Rumble's curtain). */
function surfer(add, mat, group, point, q) {
  const k = Math.round((point.x * 3.1 + point.z * 1.7) * 10) % 3;
  for (const x of [-0.12, 0.12]) add('surferSkin', new BoxGeometry(0.16, 0.8, 0.18), local(point, q, x, 0.4, 0));
  add('surferShorts', new BoxGeometry(0.4, 0.3, 0.24), local(point, q, 0, 0.82, 0));
  add('surferSkin', new BoxGeometry(0.44, 0.55, 0.24), local(point, q, 0, 1.25, 0));
  add('surferSkin', new SphereGeometry(0.15, 8, 6), local(point, q, 0, 1.68, 0));
  add('surferHair', new SphereGeometry(0.16, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), local(point, q, 0, 1.7, 0));
  add(['board1', 'board2', 'board3'][(k + 3) % 3], new BoxGeometry(0.5, 2.0, 0.07), local(point, q, 0.42, 1.0, 0.05).multiply(new Matrix4().makeRotationZ(0.08)));
  return [];
}

/** A monkey on a low branch, scratching its head and looking round (Rio Jungle Rumble; a figure beside the track). */
function monkey(add, mat, group, point, q) {
  add('branch', new CylinderGeometry(0.08, 0.1, 1.6, 6), local(point, q, 0, 0.9, 0).multiply(new Matrix4().makeRotationZ(Math.PI / 2)));
  add('branch', new CylinderGeometry(0.1, 0.12, 0.9, 6), local(point, q, -0.6, 0.45, 0));
  add('leafGreen', new IcosahedronGeometry(0.5, 0), local(point, q, -0.6, 1.3, -0.1, 1.2, 0.8, 1));
  add('monkey', new IcosahedronGeometry(0.2, 1), local(point, q, 0.15, 1.18, 0, 0.9, 1.2, 0.8));          // body, sitting on the branch
  add('monkey', new CylinderGeometry(0.03, 0.04, 0.7, 5), local(point, q, 0.3, 0.75, -0.1).multiply(new Matrix4().makeRotationZ(0.3))); // its tail hanging down
  const head = movingPart(group, point, q, 0.15, 1.5, 0.02, [
    mesh(new IcosahedronGeometry(0.14, 1), mat('monkey')),
    mesh(new IcosahedronGeometry(0.09, 0), mat('monkeyFace'), 0, -0.02, 0.09, 1, 0.9, 0.6),
    ...[-1, 1].map((k) => mesh(new IcosahedronGeometry(0.05, 0), mat('monkeyFace'), k * 0.14, 0.02, 0)),
    mesh(new BoxGeometry(0.06, 0.28, 0.06), mat('monkey'), 0.16, 0.08, 0.02).rotateZ(-0.8), // the scratching arm
  ]);
  return [{ part: head, base: q.clone(), axis: new Vector3(0, 1, 0), swing: 0.6, period: 2.8 }];
}

/** A red paper lantern on a slim post (China Wall Twister's slalom poles). */
function lanternPole(add, mat, group, point, q, { height }) {
  add('lanternPost', new CylinderGeometry(0.04, 0.06, height + 0.6, 6), local(point, q, 0, (height + 0.6) / 2, 0));
  add('lanternRed', new SphereGeometry(0.22, 10, 8), local(point, q, 0, height + 0.85, 0, 1, 1.25, 1));
  add('lanternGold', new CylinderGeometry(0.1, 0.1, 0.06, 8), local(point, q, 0, height + 1.15, 0));
  add('lanternGold', new BoxGeometry(0.04, 0.3, 0.04), local(point, q, 0, height + 0.45, 0));
  return [];
}

/** A Xiangqi piece lying on the board: a round wooden disc ringed in red or black (no characters). */
function xiangqiPiece(add, mat, group, point, q, { radius, at, l = 0 }) {
  const red = l ? l > 0 : Math.round(at * 991) % 2 === 1; // (a pair across the channel: one of each side's)
  add('xqWood', new CylinderGeometry(radius, radius, radius * 0.5, 16), local(point, q, 0, radius * 0.25, 0));
  add(red ? 'xqRed' : 'xqBlack', new CylinderGeometry(radius * 0.72, radius * 0.72, radius * 0.52, 16, 1, true), local(point, q, 0, radius * 0.25, 0));
  add(red ? 'xqRed' : 'xqBlack', new CylinderGeometry(radius * 0.3, radius * 0.3, radius * 0.53, 8), local(point, q, 0, radius * 0.25, 0));
  return [];
}

/** China Wall Twister's fortune cat, sitting just beyond the rim (its raised paw, waving into the high line, is the arm). */
function fortuneCatBody(add, base, q) {
  add('catWhite', new IcosahedronGeometry(0.9, 1), local(base, q, 0, 1.0, 0, 1, 1.15, 0.9));          // body, sitting up
  add('catWhite', new IcosahedronGeometry(0.75, 1), local(base, q, 0, 2.3, 0.05));                     // the big round head
  for (const x of [-0.45, 0.45]) {
    add('catWhite', new ConeGeometry(0.25, 0.45, 4), local(base, q, x, 3.0, 0));
    add('catEar', new ConeGeometry(0.14, 0.3, 4), local(base, q, x, 2.98, 0.08));
  }
  add('catRed', new CylinderGeometry(0.62, 0.62, 0.12, 14), local(base, q, 0, 1.75, 0));               // the red collar
  add('catGold', new IcosahedronGeometry(0.2, 0), local(base, q, 0, 1.6, 0.6));                        // its bell
  add('catGold', new BoxGeometry(0.7, 0.45, 0.12), local(base, q, -0.4, 1.0, 0.75));                   // the gold coin it holds
  for (const x of [-0.25, 0.25]) add('xqBlack', new IcosahedronGeometry(0.07, 0), local(base, q, x, 2.4, 0.7));
}

/** A Paris street lamp: a dark green iron post and its lantern (Paris Eiffel Tower Run's slalom poles). */
function streetLamp(add, mat, group, point, q, { height }) {
  const h = height + 1.6;
  add('lampGreen', new CylinderGeometry(0.06, 0.13, h, 8), local(point, q, 0, h / 2, 0));
  add('lampGreen', new CylinderGeometry(0.14, 0.14, 0.25, 8), local(point, q, 0, 0.12, 0));
  add('lampGlass', new CylinderGeometry(0.2, 0.12, 0.45, 6), local(point, q, 0, h + 0.2, 0));
  add('lampGreen', new ConeGeometry(0.26, 0.25, 6), local(point, q, 0, h + 0.55, 0));
  return [];
}

/** A street artist's easel with a half-painted canvas, standing on the high line (Paris; a curtain). */
function easel(add, mat, group, point, q) {
  for (const x of [-0.28, 0.28]) add('easelWood', new BoxGeometry(0.05, 1.7, 0.05), local(point, q, x, 0.82, 0.1).multiply(new Matrix4().makeRotationZ(-x * 0.25)));
  add('easelWood', new BoxGeometry(0.05, 1.7, 0.05), local(point, q, 0, 0.8, -0.3).multiply(new Matrix4().makeRotationX(-0.35)));
  add('easelWood', new BoxGeometry(0.7, 0.05, 0.08), local(point, q, 0, 0.85, 0.12));
  add('canvasWhite', new BoxGeometry(0.8, 0.65, 0.04), local(point, q, 0, 1.22, 0.14));
  add('paintBlue', new BoxGeometry(0.7, 0.2, 0.01), local(point, q, 0, 1.38, 0.165));
  add('paintYellow', new IcosahedronGeometry(0.1, 0), local(point, q, 0.18, 1.2, 0.165, 1, 1, 0.1));
  add('paintRed', new BoxGeometry(0.3, 0.12, 0.01), local(point, q, -0.15, 1.05, 0.165));
  return [];
}

/** A pigeon pecking at the ground, its head bobbing (Paris; a figure beside the track). */
function pigeon(add, mat, group, point, q) {
  add('pigeonGrey', new IcosahedronGeometry(0.13, 1), local(point, q, 0, 0.14, 0, 0.85, 0.8, 1.3));
  add('pigeonDark', new BoxGeometry(0.1, 0.03, 0.16), local(point, q, 0, 0.15, -0.2));                   // tail
  for (const x of [-0.04, 0.04]) add('beak', new BoxGeometry(0.015, 0.06, 0.015), local(point, q, x, 0.03, 0.02));
  const head = movingPart(group, point, q, 0, 0.24, 0.1, [
    mesh(new IcosahedronGeometry(0.06, 0), mat('pigeonNeck'), 0, 0, 0.04),
    mesh(new ConeGeometry(0.015, 0.05, 4), mat('beak'), 0, -0.01, 0.11).rotateX(Math.PI / 2),
  ]);
  return [{ part: head, base: q.clone(), axis: new Vector3(1, 0, 0), swing: 0.5, period: 0.7 }];
}

/** A round Go stone lying on the board, black or white (China Wall Twister's board-game run). */
function goStone(add, mat, group, point, q, { radius, at, l = 0 }) {
  const white = l ? l > 0 : Math.round(at * 997) % 2 === 1; // (a pair across the channel: one black, one white)
  add(white ? 'goWhite' : 'goBlack', new IcosahedronGeometry(radius, 2), local(point, q, 0, radius * 0.42, 0, 1, 0.42, 1));
  return [];
}

// ── Grand Prix ──────────────────────────────────────────────────────────────

/** A stack of three racing tyres, a red or white band painted round the middle one (Grand Prix blocks). */
function tyreStack(add, mat, group, point, q, { radius, at }) {
  const r = radius * 0.95;
  const band = Math.round(at * 977) % 2 ? 'tyreBandRed' : 'tyreBandWhite';
  for (let k = 0; k < 3; k += 1) {
    add('tyreBlack', new CylinderGeometry(r, r, 0.36, 12), local(point, q, 0, 0.2 + k * 0.38, 0));
    add(k === 1 ? band : 'tyreBlack', new CylinderGeometry(r * 1.01, r * 1.01, 0.1, 12, 1, true), local(point, q, 0, 0.2 + k * 0.38, 0));
  }
  add('coneBase', new CylinderGeometry(r * 0.55, r * 0.55, 0.02, 10), local(point, q, 0, 0.39 + 2 * 0.38, 0)); // the hole down the middle
  return [];
}

/** An orange traffic cone with a white reflective band, on a square black base (a Grand Prix chicane's slalom poles). */
function trafficCone(add, mat, group, point, q, { height }) {
  const h = Math.max(0.9, height * 0.7);
  // (Slim: no wider than the slalom pole's footprint, so what you see is what the marbles glance off.)
  add('coneBase', new BoxGeometry(0.26, 0.06, 0.26), local(point, q, 0, 0.03, 0));
  add('coneOrange', new ConeGeometry(0.16, h, 10), local(point, q, 0, 0.06 + h / 2, 0));
  add('coneWhite', new CylinderGeometry(0.085, 0.11, h * 0.16, 10, 1, true), local(point, q, 0, 0.06 + h * 0.48, 0));
  return [];
}

/** A safety car with no maker's badge: white, a chequer of yellow and blue down its flanks, a light bar on the roof (parked). */
function safetyCar(add, mat, group, rimCentre, q, { len, width, drop = 0 }) {
  const W = 1.95;
  const centre = rimCentre.clone().add(new Vector3(-(width - W) / 2, -drop, 0).applyQuaternion(q));
  const L = Math.min(len, 4.7);
  for (let n = 0; n < Math.max(1, Math.floor(len / 4.7)); n += 1) {
    const z = -len / 2 + L / 2 + n * L;
    for (const x of [-0.85, 0.85]) for (const dz of [-1.45, 1.45]) add('tyreBlack', new CylinderGeometry(0.34, 0.34, 0.25, 12), local(centre, q, x, 0.34, z + dz).multiply(new Matrix4().makeRotationZ(Math.PI / 2)));
    add('safetyWhite', new BoxGeometry(1.9, 0.55, L - 0.2), local(centre, q, 0, 0.6, z));
    add('safetyWhite', new BoxGeometry(1.6, 0.42, L * 0.42), local(centre, q, 0, 1.08, z - 0.15));
    add('carGlass', new BoxGeometry(1.52, 0.34, L * 0.4), local(centre, q, 0, 1.1, z - 0.15));
    for (const x of [-0.96, 0.96]) {
      for (let k = 0; k < 6; k += 1) add(k % 2 ? 'safetyBlue' : 'safetyStripe', new BoxGeometry(0.02, 0.22, (L - 0.6) / 6), local(centre, q, x, 0.62, z - (L - 0.6) / 2 + ((k + 0.5) * (L - 0.6)) / 6));
    }
    add('carChrome', new BoxGeometry(1.2, 0.1, 0.25), local(centre, q, 0, 1.34, z - 0.15));
    add('lightAmber', new BoxGeometry(0.45, 0.14, 0.22), local(centre, q, -0.32, 1.42, z - 0.15));
    add('lightGreen', new BoxGeometry(0.45, 0.14, 0.22), local(centre, q, 0.32, 1.42, z - 0.15));
  }
  return [];
}

/** A simit seller's cart: a red cart with a glass case of sesame rings on top, two big wheels, a sunshade (Istanbul; parked). */
function simitCart(add, mat, group, rimCentre, q, { len, width, drop = 0 }) {
  const W = 1.6;
  const centre = rimCentre.clone().add(new Vector3(-(width - W) / 2, -drop, 0).applyQuaternion(q));
  const L = Math.max(2.4, len - 0.4);
  add('simitRed', new BoxGeometry(W, 0.9, L), local(centre, q, 0, 0.95, 0));
  add('carGlass', new BoxGeometry(W - 0.2, 0.6, L - 0.3), local(centre, q, 0, 1.7, 0));
  add('simitRed', new BoxGeometry(W, 0.08, L), local(centre, q, 0, 2.04, 0));
  for (let k = 0; k < 4; k += 1) add('simit', new CylinderGeometry(0.28, 0.28, 0.1, 10), local(centre, q, (k % 2 ? -0.35 : 0.35), 2.14, -L / 4 + Math.floor(k / 2) * (L / 2)));
  for (const x of [-W / 2 - 0.05, W / 2 + 0.05]) add('tyreBlack', new CylinderGeometry(0.5, 0.5, 0.1, 12), local(centre, q, x, 0.5, 0).multiply(new Matrix4().makeRotationZ(Math.PI / 2)));
  add('simitWood', new CylinderGeometry(0.04, 0.04, 1.6, 5), local(centre, q, 0, 2.8, L / 2 - 0.3));
  add('simitShade', new ConeGeometry(1.3, 0.5, 8), local(centre, q, 0, 3.7, L / 2 - 0.3));
  return [];
}

/** A yellow danfo minibus with black bands, parked at the edge (Lagos; parked). */
function danfoBus(add, mat, group, rimCentre, q, { len, width, drop = 0 }, body = 'danfoYellow', bands = ['danfoBlack', 'danfoBlack']) {
  const W = 2;
  const centre = rimCentre.clone().add(new Vector3(-(width - W) / 2, -drop, 0).applyQuaternion(q));
  const L = Math.max(4, len - 0.2);
  for (const x of [-0.9, 0.9]) for (const dz of [-L / 2 + 0.9, L / 2 - 0.9]) add('tyreBlack', new CylinderGeometry(0.4, 0.4, 0.3, 12), local(centre, q, x, 0.4, dz).multiply(new Matrix4().makeRotationZ(Math.PI / 2)));
  add(body, new BoxGeometry(W, 1.9, L), local(centre, q, 0, 1.45, 0));
  add('carGlass', new BoxGeometry(W + 0.02, 0.7, L - 1.2), local(centre, q, 0, 1.95, -0.2));
  for (const [k, y] of [0.85, 1.45].entries()) add(bands[k], new BoxGeometry(W + 0.04, 0.16, L + 0.02), local(centre, q, 0, y, 0));
  add(body, new BoxGeometry(W - 0.2, 0.3, L - 0.6), local(centre, q, 0, 2.55, 0));
  return [];
}

/** A TV camera crane on its dolly beyond the rim, an operator at the controls (its boom, swinging in, is the arm; the camera at its tip). */
function cameraCraneBody(add, base, q) {
  add('craneBase', new BoxGeometry(1.6, 0.4, 1.6), local(base, q, 0, 0.3, 0));
  for (const x of [-0.65, 0.65]) for (const z of [-0.65, 0.65]) add('tyreBlack', new CylinderGeometry(0.16, 0.16, 0.12, 8), local(base, q, x, 0.16, z).multiply(new Matrix4().makeRotationZ(Math.PI / 2)));
  add('craneYellow', new CylinderGeometry(0.16, 0.2, 2.4, 8), local(base, q, 0, 1.7, 0));
  add('craneBase', new BoxGeometry(0.5, 0.5, 0.5), local(base, q, 0, 2.95, 0));
  add('craneBase', new BoxGeometry(0.6, 0.6, 0.6), local(base, q, 0, 2.95, -1.4)); // the counterweight
  add('craneArm', new BoxGeometry(0.12, 0.12, 1.5), local(base, q, 0, 2.95, -0.7));
  add('operatorShirt', new BoxGeometry(0.45, 0.65, 0.3), local(base, q, 0.75, 1.0, -0.6));
  add('operatorSkin', new IcosahedronGeometry(0.15, 0), local(base, q, 0.75, 1.48, -0.6));
  add('tyreBlack', new BoxGeometry(0.5, 0.5, 0.3), local(base, q, 0.75, 0.42, -0.6));
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
  'street-lamp': { places: 'slalom', build: streetLamp },
  'rally-flag': { places: 'slalom', build: rallyFlag },
  log: { places: 'block', build: floatingLog },
  football: { places: 'block', upright: true, build: football },
  'corner-flag': { places: 'slalom', build: cornerFlag },
  'lantern-pole': { places: 'slalom', build: lanternPole },
  'xiangqi-piece': { places: 'slalom', build: xiangqiPiece },
  'fortune-cat': {
    places: 'swipe',
    body: fortuneCatBody,
    standOff: 1.6, // metres out beyond the rim
    sink: -0.2,
    // The raised paw, from the shoulder out to the paw, beckoning into the high line on the swipe's timetable.
    arm: { colour: 'catWhite', shoulder: [0.55, 1.6, 0.3], radii: [0.14, 0.22], segments: 7, tip: 0.24, tipDetail: 1, end: 0.1, endDetail: 0, lift: 0.4, outLift: 0.6, nose: 0.12 },
  },
  surfer: { places: 'curtain', build: surfer },
  monkey: { places: 'block', upright: true, build: monkey },
  'river-stake': { places: 'slalom', build: riverStake },
  caiman: { places: 'block', build: caiman },
  jaguar: { places: 'block', upright: true, build: jaguar },
  'dune-buggy': { places: 'parked', build: duneBuggy },
  'sports-car': { places: 'parked', build: sportsCar },
  falcon: {
    places: 'swipe',
    body: falconBody,
    standOff: 1.2, // metres out beyond the rim
    sink: 0,
    // The wing, from the shoulder out to its tip, spread into the high line on the swipe's timetable.
    arm: { colour: 'falcon', shoulder: [0, 2.05, 0.2], radii: [0.06, 0.2], segments: 5, tip: 0.18, tipDetail: 0, end: 0.08, endDetail: 0, lift: 0.5, outLift: 0.6, nose: 0.1 },
  },
  easel: { places: 'curtain', build: easel },
  pigeon: { places: 'block', upright: true, build: pigeon },
  vespa: { places: 'parked', build: vespa },
  'tyre-stack': { places: 'block', upright: true, build: tyreStack },
  'traffic-cone': { places: 'slalom', build: trafficCone },
  'safety-car': { places: 'parked', build: safetyCar },
  'simit-cart': { places: 'parked', build: simitCart },
  'danfo-bus': { places: 'parked', build: danfoBus },
  // Nairobi's matatu: the same minibus, brightly painted (green, its stripes pink and blue).
  matatu: { places: 'parked', build: (add, mat, group, c, q, size) => danfoBus(add, mat, group, c, q, size, 'matatuGreen', ['matatuPink', 'matatuBlue']) },
  'camera-crane': {
    places: 'swipe',
    body: cameraCraneBody,
    standOff: 1.6, // metres out beyond the rim
    sink: -0.2,
    // The boom, from the head of the column out to the camera, swung in over the high line on the swipe's timetable.
    arm: { colour: 'craneArm', shoulder: [0, 2.95, 0.2], radii: [0.09, 0.12], segments: 6, tip: 0.3, tipDetail: 0, tipBox: [0.42, 0.36, 0.6], tipColour: 'cameraBody', end: 0.12, endDetail: 0, endColour: 'cameraLens', lift: 0.7, outLift: 1.2, nose: 0.2 },
  },
  // A gantry over the channel with banners hanging into the high line (a curtain): drawn whole by the curtain's placement.
  'banner-gantry': { places: 'curtain', gantry: true, banners: ['bannerRed', 'bannerWhite', 'bannerBlue'], post: 'bannerPost', build: () => [] },
};
