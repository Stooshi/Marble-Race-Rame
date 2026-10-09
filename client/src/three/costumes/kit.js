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
  'ore-cart': { places: 'parked', build: oreCart },
  'kick-sled': { places: 'parked', build: kickSled },
  'slalom-gate': { places: 'slalom', build: slalomGate },
  'go-stone': { places: 'slalom', build: goStone },
};
