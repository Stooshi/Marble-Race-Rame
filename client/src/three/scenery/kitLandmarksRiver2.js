/**
 * Landmarks for the five Rivers tracks of 13 Nov 2026 (Moses: the Rivers pack filled to 20): the Hudson, the Arno,
 * the Chao Phraya, the Yukon and the Iguazú. Like kitLandmarksRiver.js: one builder each, origin on the ground (or,
 * for a boat or anything standing in the river, on the water: placed with `river: true`), front facing +z, cartoon
 * low-poly from a few simple shapes, merged into the still scenery. Stylised impressions of the places, never
 * detailed reproductions, and no name on anything.
 */
import { BoxGeometry, ConeGeometry, CylinderGeometry, IcosahedronGeometry, Matrix4, Quaternion, SphereGeometry, Vector3 } from 'three';
import { box, merge, piece } from './parts';

const Y = new Vector3(0, 1, 0);
const M = (x, y, z) => new Matrix4().makeTranslation(x, y, z);
const S = (x, y, z, sx, sy, sz) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion(), new Vector3(sx, sy, sz));
const turned = (x, y, z, yaw, sx = 1, sy = 1, sz = 1) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(Y, yaw), new Vector3(sx, sy, sz));
const roof = (w, h, d, x, y, z, colour) => piece(new ConeGeometry(Math.hypot(w, d) / 2, h, 4), colour, turned(x, y + h / 2, z, Math.PI / 4, w / Math.hypot(w, d) * Math.SQRT2, 1, d / Math.hypot(w, d) * Math.SQRT2));
const rnd = (k) => (((k * 7919) % 97) + 97) % 97 / 97;

// ── The Hudson ───────────────────────────────────────────────────────────────

/** Dark cliffs of columned rock along the river (the Palisades): a long ragged wall, its columns in ribs, woods on top in autumn colours. */
function palisadeCliffs() {
  const p = [];
  const leaves = ['#c0602a', '#d8a23a', '#9a3a28', '#6f7a3a'];
  for (let k = -16; k <= 16; k += 1) {
    const h = 34 + rnd(k + 40) * 10;
    p.push(box(6.4, h, 10 + rnd(k) * 4, k * 6, h / 2 - 1, -5, k % 2 ? '#3f3c3a' : '#4a4644'));
    p.push(box(5.6, 6, 4, k * 6, 3, 1.5, '#5a5650')); // the scree at its foot
    if (k % 2 === 0) p.push(piece(new IcosahedronGeometry(4, 0), leaves[(k / 2 + 16) % 4], S(k * 6, h + 2, -6, 1.3, 0.7, 1.2)));
  }
  return merge(p);
}

/** Two sailing sloops on the river: white hulls, one tall mast each, a big mainsail and a jib. */
function riverSloops() {
  const p = [];
  for (const [x, z, yaw] of [[0, 0, 0.3], [16, -10, -0.2]]) {
    const at = (dx, dy, dz) => turned(x, 0, z, yaw).multiply(M(dx, dy, dz));
    p.push(piece(new BoxGeometry(3, 1.2, 12), '#f4f2ec', at(0, 0.3, 0)), piece(new ConeGeometry(2.1, 3, 4), '#f4f2ec', at(0, 0.3, 7.5).multiply(new Matrix4().makeRotationX(Math.PI / 2)).multiply(new Matrix4().makeRotationY(Math.PI / 4)).multiply(S(0, 0, 0, 1, 1, 0.4))));
    p.push(piece(new BoxGeometry(3.05, 0.3, 12), '#2f4f6e', at(0, -0.2, 0)));
    p.push(piece(new CylinderGeometry(0.12, 0.15, 16, 5), '#e8e4da', at(0, 8.6, 1)));
    p.push(piece(new ConeGeometry(4, 14, 3), '#fbfaf6', at(0, 8.4, -2.4).multiply(S(0, 0, 0, 0.05, 1, 1)))); // the mainsail
    p.push(piece(new ConeGeometry(2.4, 11, 3), '#f2efe6', at(0, 7, 4.2).multiply(S(0, 0, 0, 0.05, 1, 1)))); // the jib
  }
  return merge(p);
}

/** A little rocky island in the river with a ruined castle on it: broken walls, an empty tower, trees growing through. */
function islandRuin() {
  const STONE = '#b8a888';
  const p = [piece(new IcosahedronGeometry(10, 1), '#6a6458', S(0, -2, 0, 1.5, 0.45, 1.1))];
  p.push(box(14, 7, 1.2, 0, 5, -5, STONE), box(1.2, 5, 9, -7, 4, -0.5, STONE), box(1.2, 8, 6, 7, 5.5, -2, STONE)); // the broken walls
  for (let x = -6; x <= 6; x += 2) if (x !== 0) p.push(box(1, 1.2, 1.2, x, 9.1, -5, STONE)); // battlements, a gap where they fell
  p.push(piece(new CylinderGeometry(2.4, 2.8, 13, 8, 1, true), STONE, M(-4, 7.5, -2))); // the empty tower
  for (const [x, z] of [[3, -1], [-1, 2], [8, 3]]) p.push(piece(new IcosahedronGeometry(2.4, 0), '#c0602a', S(x, 6 + rnd(x + z) * 2, z, 1, 1.2, 1)));
  return merge(p);
}

// ── The Arno ─────────────────────────────────────────────────────────────────

const OCHRE = ['#d8a85a', '#c8904a', '#e0b870', '#b8783a'];

/**
 * The old bridge with its shops along the top: two wide stone arches over the track's two channels, the middle pier
 * on the divider, the deck lined with little ochre shops under red-tiled roofs, overhanging on brackets, and a
 * covered passage running along the top of them. `width`: across, pier to pier; local x across the track, origin on
 * the channels' rim at the middle pier.
 */
export function shopBridge(width = 26, pier = 1.2) {
  const STONE = '#c8b48a';
  const p = [];
  const half = width / 2;
  const up = 3.5; // (the arches high enough for the follow camera to pass under them, as the Arc de Triomphe's)
  for (const x of [-half, 0, half]) p.push(box(x === 0 ? pier : 2.4, 7.2 + up, 9, x, 3.1 + up / 2, 0, STONE)); // the piers
  for (const side of [-1, 1]) {
    // Each arch: a flat stone deck over the channel, stepped corbels down to the piers (a segmental arch).
    const cx = side * half / 2;
    p.push(box(half, 1.6, 9, cx, 7.4 + up, 0, STONE));
    for (const [d, h] of [[0.9, 1.1], [1.8, 0.7], [2.7, 0.35]]) for (const e of [-1, 1]) p.push(box(0.9, h, 9, cx + e * (half / 2 - d + 0.45), 6.6 + up - h / 2, 0, STONE));
  }
  p.push(box(width + 2.4, 0.4, 9.6, 0, 8.4 + up, 0, '#b8a07a'));
  // The shops: little houses side by side along both edges, overhanging the arches.
  let k = 0;
  for (let x = -half + 1.5; x <= half - 1.5; x += 3) {
    for (const z of [-3.4, 3.4]) {
      const h = 3.2 + rnd(k) * 1.4;
      p.push(box(2.8, h, 3, x, 8.6 + up + h / 2, z + Math.sign(z) * 0.8, OCHRE[k % 4]));
      p.push(box(0.9, 1, 0.1, x, 9.6 + up + h / 2 - 0.4, z + Math.sign(z) * 2.32, '#3a2a1e')); // a shuttered window
      p.push(roof(3, 1.2, 3.4, x, 8.6 + up + h, z + Math.sign(z) * 0.8, '#b0482a'));
      for (const e of [-1, 1]) p.push(box(0.25, 0.9, 0.9, x + e * 1.1, 8.1 + up, z + Math.sign(z) * 2, '#8a6a48')); // the brackets
      k += 1;
    }
  }
  p.push(box(width - 2, 2, 2.4, 0, 14.4 + up, -0.2, '#e0c890'), roof(width - 2, 1, 2.8, 0, 15.4 + up, -0.2, '#b0482a')); // the covered passage on top
  for (let x = -half + 3; x <= half - 3; x += 2.4) p.push(box(0.7, 0.9, 0.1, x, 14.6 + up, 1.02, '#4a3a2a'));
  return merge(p);
}

/** The stepped weir across the river: a long band of low stone steps from bank to bank, white water spilling down them. Long along z (across the river). */
function stoneWeir() {
  const p = [];
  for (let k = 0; k < 4; k += 1) {
    p.push(box(2.4, 0.5, 104, k * 2.4 - 3.6, 0.1 - k * 0.35, 0, '#b8a888'));
    p.push(box(1.2, 0.12, 104, k * 2.4 - 2.6, 0.38 - k * 0.35, 0, '#f2f6f4')); // white water over each lip
  }
  return merge(p);
}

// ── The Chao Phraya ──────────────────────────────────────────────────────────

/**
 * The riverside temple's tall tower: a great tiered spire of pale stone set with coloured porcelain, rising in
 * tapering stages to a slim tip, four smaller spires round it on a broad terrace, steep stairs up each face.
 */
function templePrang() {
  const PALE = '#ece4d4';
  const p = [box(36, 3, 36, 0, 1.5, 0, '#d8ccb4'), box(28, 3, 28, 0, 4.5, 0, PALE)];
  const tiers = [[9, 8, 6], [7.6, 7, 14], [6.2, 6.5, 21], [4.8, 6, 27.5], [3.4, 6, 33.5], [2.1, 6, 39.5]];
  tiers.forEach(([r, h, y], k) => {
    p.push(piece(new CylinderGeometry(r * 0.82, r, h, 12), k % 2 ? '#f2ecdc' : PALE, M(0, y + h / 2, 0)));
    p.push(piece(new CylinderGeometry(r * 0.9, r * 0.9, 0.5, 12), ['#c84a3a', '#2f8a6a', '#e8b830', '#3a6ab8'][k % 4], M(0, y + h - 0.2, 0))); // a band of porcelain
  });
  p.push(piece(new ConeGeometry(1.2, 12, 8), '#e8dcc0', M(0, 51.5, 0)), piece(new CylinderGeometry(0.15, 0.2, 4, 5), '#e8b830', M(0, 59, 0)));
  for (const [x, z] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) {
    p.push(piece(new CylinderGeometry(2.4, 3, 6, 8), PALE, M(x, 9, z)), piece(new CylinderGeometry(1.6, 2.2, 5, 8), '#f2ecdc', M(x, 14.5, z)), piece(new ConeGeometry(1.4, 8, 8), '#e8dcc0', M(x, 21, z)));
  }
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) p.push(piece(new BoxGeometry(3, 1, 16), '#d8ccb4', turned(0, 12, 0, yaw).multiply(M(0, 0, 9)).multiply(new Matrix4().makeRotationX(-0.95)))); // the steep stairs
  return merge(p);
}

// ── The Yukon ────────────────────────────────────────────────────────────────

/** Five Finger Rapids: four tall rock pillars standing in the river in a row, spruce on their tops, white water between them. */
function rockFingers() {
  const p = [];
  [-27, -9, 9, 27].forEach((z, k) => {
    const h = 12 + rnd(k + 3) * 5;
    p.push(piece(new CylinderGeometry(3.4, 4.6, h, 7), k % 2 ? '#4a4a48' : '#55534e', S(0, h / 2 - 1, z, 1.4, 1, 1)));
    for (const dx of [-2, 1.5]) p.push(piece(new ConeGeometry(1.2, 5, 6), '#2f4f34', M(dx, h + 1.6, z + dx * 0.4)));
    if (k < 3) p.push(box(6, 0.15, 8, 0, 0.1, z + 9, '#f2f8f8')); // the white water between
  });
  return merge(p);
}

// ── The Iguazú ───────────────────────────────────────────────────────────────

/** The great horseshoe of falls: a U-shaped rim of dark rock open towards the track, a curtain of white water all the way round, a misty pool below. */
function horseshoeCataract() {
  const p = [piece(new CylinderGeometry(46, 46, 0.4, 28), '#cfe0e0', M(0, -10, -20))];
  for (let k = 0; k <= 16; k += 1) {
    const a = Math.PI * (k / 16); // round the back, from one side to the other
    const x = Math.cos(a) * 40;
    const z = -20 - Math.sin(a) * 40;
    const yaw = Math.atan2(-x, -20 - z) ;
    p.push(piece(new BoxGeometry(8.2, 6, 10), k % 2 ? '#3a3a2e' : '#4a463a', turned(x, 22, z, yaw).multiply(M(0, 0, -4))));
    p.push(piece(new BoxGeometry(8, 34, 1), '#eef4f4', turned(x, 4, z, yaw).multiply(M(0, 0, 1.2)))); // the falling water
    p.push(piece(new IcosahedronGeometry(4, 0), '#2a6a2c', turned(x, 27, z, yaw).multiply(M(0, 0, -6)))); // rainforest on the rim
  }
  return merge(p);
}
function cataractSpray() {
  const p = [];
  for (let k = 0; k <= 6; k += 1) {
    const a = Math.PI * (k / 6);
    p.push(piece(new SphereGeometry(12, 8, 6), '#ffffff', S(Math.cos(a) * 32, 0, -20 - Math.sin(a) * 32, 1.4, 1.2, 1.4)));
  }
  return merge(p);
}

/** A catwalk over the upper river: a long steel walkway on thin legs just above the water, railings, a few walkers. Long along x. */
function rainforestCatwalk() {
  const p = [box(80, 0.3, 2.4, 0, 2, 0, '#7a7a72')];
  for (const z of [-1.15, 1.15]) p.push(box(80, 0.08, 0.08, 0, 3.1, z, '#a8a8a0'));
  for (let x = -38; x <= 38; x += 4) {
    for (const z of [-1.1, 1.1]) p.push(box(0.15, 2.4, 0.15, x, 0.8, z, '#5a5a54'), box(0.06, 1.1, 0.06, x, 2.6, z, '#a8a8a0'));
  }
  const shirts = ['#c43a2f', '#2f5d9a', '#f2c230', '#2f9a4a', '#e07a3a'];
  [-30, -17, -4, 9, 22, 33].forEach((x, k) => p.push(box(0.45, 1, 0.32, x, 2.65, (k % 2) - 0.5, shirts[k % 5]), box(0.32, 0.32, 0.32, x, 3.35, (k % 2) - 0.5, k % 3 ? '#e0b894' : '#8a5a3a')));
  return merge(p);
}

export const RIVER2_LANDMARKS = {
  'palisade-cliffs': { build: palisadeCliffs, radius: 100 },
  'river-sloops': { build: riverSloops, radius: 16 },
  'island-ruin': { build: islandRuin, radius: 16 },
  'shop-bridge': { build: shopBridge, radius: 14 },
  'stone-weir': { build: stoneWeir, radius: 52 },
  'temple-prang': { build: templePrang, radius: 20 },
  'rock-fingers': { build: rockFingers, radius: 32 },
  'horseshoe-cataract': { build: horseshoeCataract, haze: cataractSpray, radius: 70 },
  'rainforest-catwalk': { build: rainforestCatwalk, radius: 40 },
};
