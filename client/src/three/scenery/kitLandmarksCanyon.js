/**
 * Landmarks for the Canyon Series: one builder each, origin on the ground,
 * front facing +z (towards the track), cartoon low-poly from a few simple
 * shapes, merged into the still scenery. Stylised impressions, never detailed
 * reproductions, and no attraction's name or brand anywhere.
 */
import { BoxGeometry, ConeGeometry, CylinderGeometry, IcosahedronGeometry, Matrix4, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import { box, merge, piece } from './parts';

const Y = new Vector3(0, 1, 0);
const M = (x, y, z) => new Matrix4().makeTranslation(x, y, z);
const S = (x, y, z, sx, sy, sz) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion(), new Vector3(sx, sy, sz));
const turned = (x, y, z, yaw, sx = 1, sy = 1, sz = 1) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(Y, yaw), new Vector3(sx, sy, sz));
const roof = (w, h, d, x, y, z, colour, yaw = 0) => piece(new ConeGeometry(Math.hypot(w, d) / 2, h, 4), colour, turned(x, y + h / 2, z, Math.PI / 4 + yaw, w / Math.hypot(w, d) * Math.SQRT2, 1, d / Math.hypot(w, d) * Math.SQRT2));

// ── Shared pieces ────────────────────────────────────────────────────────────

/** A juniper or pinyon: a twisted dark trunk under a lumpy blue-green crown. */
function juniper(x, z, s = 1, crown = '#5f7a4a') {
  return [
    piece(new CylinderGeometry(0.18 * s, 0.3 * s, 1.6 * s, 5), '#5a4030', M(x, 0.8 * s, z)),
    piece(new IcosahedronGeometry(1.3 * s, 0), crown, S(x, 2.2 * s, z, 1, 0.8, 1)),
    piece(new IcosahedronGeometry(0.9 * s, 0), crown, S(x + 0.6 * s, 2.9 * s, z - 0.3 * s, 1, 0.8, 1)),
  ];
}

/** A mule (or a horse) facing +z, at (x, z) turned by yaw; `rider`: a rider's shirt colour. */
function mule(x, z, yaw = 0, rider = null, coat = '#6a4a32') {
  const at = (lx, ly, lz) => new Vector3(lx, ly, lz).applyAxisAngle(Y, yaw).add(new Vector3(x, 0, z));
  const b = (w, h, d, lx, ly, lz, c) => { const p = at(lx, ly, lz); return piece(new BoxGeometry(w, h, d), c, turned(p.x, p.y, p.z, yaw)); };
  const p = [b(0.7, 0.7, 1.6, 0, 1.25, 0, coat), b(0.4, 0.55, 0.7, 0, 1.75, 0.95, coat), b(0.3, 0.3, 0.5, 0, 1.85, 1.35, '#4a3424')];
  for (const sx of [-0.12, 0.12]) p.push(b(0.08, 0.45, 0.12, sx, 2.25, 0.95, coat)); // the long ears
  for (const [lx, lz] of [[-0.25, 0.6], [0.25, 0.6], [-0.25, -0.6], [0.25, -0.6]]) p.push(b(0.16, 0.95, 0.16, lx, 0.47, lz, '#3a2a1e'));
  p.push(b(0.8, 0.25, 0.9, 0, 1.65, -0.05, '#8a3a2a')); // saddle blanket
  if (rider) {
    p.push(b(0.5, 0.75, 0.35, 0, 2.2, -0.05, rider), b(0.3, 0.3, 0.3, 0, 2.75, -0.05, '#e0b894'));
    p.push(piece(new CylinderGeometry(0.32, 0.32, 0.06, 8), '#d8c08a', M(at(0, 2.95, -0.05).x, 2.95, at(0, 2.95, -0.05).z)), piece(new CylinderGeometry(0.16, 0.18, 0.18, 8), '#d8c08a', M(at(0, 3.04, -0.05).x, 3.04, at(0, 3.04, -0.05).z))); // a hat
  } else {
    for (const sx of [-0.45, 0.45]) p.push(b(0.3, 0.5, 0.7, sx, 1.45, -0.1, '#a88a5a')); // packs
  }
  return p;
}

// ── Grand Canyon Burst ───────────────────────────────────────────────────────

/** A stone lookout tower on the rim: a round tower of rough stone tapering up to a viewing gallery, a low kiva beside it. */
function rimLookout() {
  const STONE = '#b58a62';
  const DARK = '#8a6446';
  const p = [];
  for (let k = 0; k < 6; k += 1) {
    const r0 = 4.4 - k * 0.32;
    p.push(piece(new CylinderGeometry(r0 - 0.32, r0, 3, 12), k % 2 ? DARK : STONE, M(0, 1.5 + k * 3, 0)));
  }
  p.push(piece(new CylinderGeometry(3.2, 2.7, 1, 12), '#6f4a32', M(0, 18.5, 0)));        // the gallery's floor
  for (let k = 0; k < 12; k += 1) {
    const a = (k / 12) * Math.PI * 2;
    p.push(box(0.35, 1.4, 0.35, Math.cos(a) * 3, 19.7, Math.sin(a) * 3, '#5a3a26'));    // the gallery's posts
  }
  p.push(piece(new CylinderGeometry(3.5, 3.3, 0.4, 12), '#7a4a2c', M(0, 20.6, 0)));     // its roof
  for (let k = 0; k < 5; k += 1) p.push(box(0.9, 1.2, 0.3, Math.sin(k * 1.3) * 2.6, 5 + k * 3, 4.05 - k * 0.32, '#3a2a20')); // little windows
  p.push(piece(new CylinderGeometry(5.5, 6, 3.2, 14), STONE, M(-8, 1.6, -3)));         // the kiva beside it
  p.push(piece(new CylinderGeometry(5.6, 5.6, 0.4, 14), DARK, M(-8, 3.4, -3)));
  // A low rim wall and visitors at the edge.
  p.push(box(22, 0.9, 0.7, 0, 0.45, 6.5, STONE));
  for (const [x, c] of [[-6, '#2f5d9a'], [-3.5, '#c43a2f'], [2, '#f2c230'], [5, '#2f9a4a']]) p.push(box(0.5, 1.1, 0.35, x, 0.55 + 0.5, 5.8, c), box(0.36, 0.36, 0.36, x, 1.85, 5.8, '#e0b894'));
  p.push(...juniper(9, -2, 1.3), ...juniper(12, 3, 1), ...juniper(-15, 4, 1.1));
  return merge(p);
}

/**
 * A glass skywalk on the rim: a horseshoe-shaped walkway with a glass floor and glass walls,
 * reaching out from the rim over the drop (front +z, towards the canyon), visitors on it, and
 * a low visitors' building behind. No attraction's name on it.
 */
function glassSkywalk() {
  const GLASS = '#a8dceb';
  const STEEL = '#5f6670';
  const p = [];
  const R = 9;     // the horseshoe's radius
  const reach = 14; // how far its legs run out from the rim before the curve
  const w = 3.2;   // the walkway's width
  // The legs, out from the rim, and the curve at the end.
  for (const sx of [-1, 1]) {
    p.push(box(w, 0.5, reach, sx * R, 0, reach / 2, STEEL));
    p.push(box(0.12, 1.5, reach, sx * (R + w / 2), 1, reach / 2, GLASS), box(0.12, 1.5, reach, sx * (R - w / 2), 1, reach / 2, GLASS));
  }
  const SEG = 14;
  for (let k = 0; k < SEG; k += 1) {
    const a0 = (k / SEG) * Math.PI;
    const a1 = ((k + 1) / SEG) * Math.PI;
    const am = (a0 + a1) / 2;
    const cx = Math.cos(am) * R;
    const cz = reach + Math.sin(am) * R;
    const len = 2 * R * Math.sin((a1 - a0) / 2) + 0.3;
    p.push(piece(new BoxGeometry(w, 0.5, len), k % 2 ? STEEL : '#6a727c', turned(cx, 0, cz, -am)));
    for (const off of [-w / 2, w / 2]) {
      const rx = Math.cos(am) * (R + off);
      const rz = reach + Math.sin(am) * (R + off);
      p.push(piece(new BoxGeometry(0.12, 1.5, len * (R + off) / R), GLASS, turned(rx, 1, rz, -am)));
    }
  }
  p.push(box(2 * R + w + 2, 0.8, 1.2, 0, -0.6, 0.4, STEEL)); // its footing on the rim
  // Visitors out on it.
  const shirts = ['#c43a2f', '#2f5d9a', '#f2c230', '#2f9a4a', '#f2f2ee', '#7a3fb0'];
  for (let k = 0; k < 9; k += 1) {
    const a = (k / 8) * Math.PI;
    const x = k < 2 ? (k ? 1 : -1) * R : Math.cos(a) * R;
    const z = k < 2 ? 6 : reach + Math.sin(a) * R;
    p.push(box(0.5, 1.1, 0.35, x, 0.8, z, shirts[k % 6]), box(0.36, 0.36, 0.36, x, 1.55, z, '#e0b894'));
  }
  // The visitors' building behind, low and earth-coloured, and a few junipers.
  p.push(box(22, 5, 10, 0, 2.5, -12, '#c9a06a'), box(23, 0.6, 11, 0, 5.2, -12, '#8a6446'));
  for (let x = -8; x <= 8; x += 4) p.push(box(2.4, 2.6, 0.2, x, 1.8, -6.9, '#3a5a6a'));
  p.push(...juniper(-16, -6, 1.2), ...juniper(15, -9, 1), ...juniper(18, -2, 0.9));
  return merge(p);
}

/** A mule train on the trail: riders in hats on mules nose to tail, a wrangler in front, a pack mule behind. */
function muleTrain() {
  const shirts = ['#c43a2f', '#2f5d9a', '#f2c230', '#2f9a4a', '#f2f2ee'];
  const p = [];
  for (let k = 0; k < 6; k += 1) p.push(...mule(0, 10 - k * 2.6, 0, k < 5 ? shirts[k] : null, k % 2 ? '#6a4a32' : '#7a5a3a'));
  p.push(...mule(0.2, 13, 0, '#5a3a26', '#4a3424')); // the wrangler
  return merge(p);
}

/** A rafting party on the river: big red rafts with paddlers in life vests. */
function riverRafts() {
  const p = [];
  for (const [x, z, yaw] of [[-2, 6, 0.1], [2.5, -6, -0.15], [-1, -18, 0.2]]) {
    const at = (lx, ly, lz) => new Vector3(lx, ly, lz).applyAxisAngle(Y, yaw).add(new Vector3(x, 0, z));
    const b = (w, h, d, lx, ly, lz, c) => { const q = at(lx, ly, lz); return piece(new BoxGeometry(w, h, d), c, turned(q.x, q.y, q.z, yaw)); };
    for (const sx of [-1.1, 1.1]) p.push(b(0.8, 0.8, 6, sx, 0.25, 0, '#d8452f'));
    for (const sz of [-3, 3]) p.push(b(3, 0.8, 0.8, 0, 0.25, sz, '#d8452f'));
    p.push(b(1.6, 0.2, 5.2, 0, 0, 0, '#2a2c33'));
    for (let k = 0; k < 6; k += 1) {
      const lx = k % 2 ? 0.9 : -0.9;
      const lz = -2 + Math.floor(k / 2) * 1.9;
      p.push(b(0.45, 0.6, 0.35, lx, 0.95, lz, '#f2a330'), b(0.32, 0.32, 0.32, lx, 1.45, lz, '#e0b894'), b(0.07, 0.07, 1.8, lx * 1.5, 0.9, lz + 0.2, '#e8c44a'));
    }
  }
  return merge(p);
}

/** A camp by the river: stone cabins under cottonwoods, a corral of mules, picnic tables and a beach of rafts. */
function riverCamp() {
  const STONE = '#a9805a';
  const p = [];
  for (const [x, z, yaw] of [[-18, -6, 0.2], [-6, -12, 0], [7, -10, -0.15], [19, -4, -0.3]]) {
    p.push(piece(new BoxGeometry(8, 3.6, 6), STONE, turned(x, 1.8, z, yaw)), roof(9, 2.4, 7, x, 3.6, z, '#5f6a4a', yaw));
    p.push(piece(new BoxGeometry(1.2, 2, 0.2), '#4a3020', turned(x, 1, z + 3.05, yaw)));
  }
  // Cottonwoods: tall pale trunks under big bright-green crowns.
  for (const [x, z, s] of [[-26, 2, 1.3], [-12, 3, 1.1], [0, -2, 1.4], [13, 1, 1.2], [27, 4, 1]]) {
    p.push(piece(new CylinderGeometry(0.4 * s, 0.6 * s, 7 * s, 6), '#b8ae9a', M(x, 3.5 * s, z)));
    p.push(piece(new IcosahedronGeometry(4 * s, 1), '#6f9a3a', S(x, 8.5 * s, z, 1, 0.75, 1)));
  }
  // The corral and its mules.
  for (let k = 0; k <= 6; k += 1) p.push(box(0.2, 1.4, 0.2, -34 + k * 2.5, 0.7, -16, '#7a5a3a'), box(0.2, 1.4, 0.2, -34 + k * 2.5, 0.7, -24, '#7a5a3a'));
  p.push(box(15, 0.15, 0.15, -26.5, 1.2, -16, '#7a5a3a'), box(15, 0.15, 0.15, -26.5, 1.2, -24, '#7a5a3a'));
  for (const [x, z, yaw] of [[-31, -19, 0.6], [-26, -21, -0.8], [-22, -18.5, 2.2]]) p.push(...mule(x, z, yaw));
  for (const [x, z] of [[-4, 6], [5, 7]]) p.push(box(3.5, 0.2, 1.4, x, 1, z, '#8a6446'), box(3.5, 0.15, 0.4, x, 0.55, z - 1, '#8a6446'), box(3.5, 0.15, 0.4, x, 0.55, z + 1, '#8a6446'));
  // A beach with rafts pulled up on it.
  p.push(box(40, 0.3, 10, 4, 0.1, 16, '#d9b88a'));
  for (const x of [-6, 3, 12]) p.push(box(2.6, 0.7, 5.6, x, 0.5, 16, '#d8452f'), box(1.6, 0.2, 4.6, x, 0.85, 16, '#2a2c33'));
  return merge(p);
}

// ── Yarlung Tsangpo Spins ────────────────────────────────────────────────────

const FLAG_COLOURS = ['#2f6fc4', '#f4f4f0', '#c43a2f', '#2f9a4a', '#f2c230'];

/** A string of prayer flags from a to b (arrays [x, y, z]), sagging, small flags in the five colours. */
function flagLine(a, b, n = 10, sag = 1.2) {
  const p = [];
  const A = new Vector3(...a);
  const B = new Vector3(...b);
  const yaw = Math.atan2(B.x - A.x, B.z - A.z);
  for (let k = 1; k < n; k += 1) {
    const u = k / n;
    const at = A.clone().lerp(B, u).add(new Vector3(0, -Math.sin(Math.PI * u) * sag - 0.4, 0));
    p.push(piece(new BoxGeometry(0.05, 0.6, 0.5), FLAG_COLOURS[k % 5], turned(at.x, at.y, at.z, yaw)));
  }
  return p;
}

/** A Tibetan monastery on a ledge: whitewashed walls sloping inwards, a red-brown band under the roof, a golden roof, prayer flags. */
function gompa() {
  const WHITE = '#f2ede2';
  const RED = '#8a2a22';
  const GOLD = '#e0b43a';
  const p = [box(30, 2, 18, 0, 1, 0, '#a89a86')];
  // The main hall: walls taper a little, the red band, the golden roof and its finials.
  p.push(piece(new CylinderGeometry(9.8, 11, 9, 4), WHITE, turned(0, 6.5, -2, Math.PI / 4, 1, 1, 0.62)));
  p.push(box(14.2, 1.6, 9.2, 0, 11.6, -2, RED));
  p.push(roof(15, 3.2, 10, 0, 12.4, -2, GOLD));
  for (const x of [-5, 0, 5]) p.push(piece(new ConeGeometry(0.4, 1.8, 6), GOLD, M(x, 16, -2)));
  for (let x = -5; x <= 5; x += 2.5) p.push(box(1, 2, 0.2, x, 7, 4.3, '#2a2420'));
  // Side buildings, lower.
  for (const sx of [-1, 1]) p.push(box(8, 5, 10, sx * 12, 4.5, -1, WHITE), box(8.2, 0.9, 10.2, sx * 12, 7.3, -1, RED));
  // Strings of prayer flags from the roof out to poles.
  for (const [x, z] of [[-14, 8], [14, 8], [0, 12]]) {
    p.push(piece(new CylinderGeometry(0.12, 0.15, 8, 5), '#5a3a26', M(x, 4, z)));
    p.push(...flagLine([0, 15, -2], [x, 8, z], 12, 1));
  }
  return merge(p);
}

/** A chorten (stupa): a white stepped base, a dome, a spire of rings and a golden top. */
function chorten(x = 0, z = 0, k = 1) {
  return [
    box(5 * k, 1.2 * k, 5 * k, x, 0.6 * k, z, '#f2ede2'),
    box(4 * k, 1 * k, 4 * k, x, 1.7 * k, z, '#f2ede2'),
    piece(new CylinderGeometry(1.8 * k, 2 * k, 2.4 * k, 10), '#f4f0e6', M(x, 3.4 * k, z)),
    box(1.6 * k, 0.6 * k, 1.6 * k, x, 4.9 * k, z, '#c43a2f'),
    piece(new ConeGeometry(0.8 * k, 3.4 * k, 10), '#e0b43a', M(x, 6.9 * k, z)),
  ];
}

/** A row of chortens by the trail, prayer flags strung between them. */
function chortenRow() {
  const p = [];
  for (let k = 0; k < 4; k += 1) p.push(...chorten(-9 + k * 6, 0, 0.8 + (k % 2) * 0.15));
  p.push(...flagLine([-9, 5.5, 0], [9, 5.5, 0], 16, 0.8));
  return merge(p);
}

/** A snow peak (the great bend winds round it): a rocky cone with ridges, snow from halfway up. */
function snowPeak() {
  const ROCK = '#6a6560';
  const p = [
    piece(new ConeGeometry(30, 46, 9), ROCK, M(0, 23, 0)),
    piece(new ConeGeometry(17.5, 27, 9), '#f4f7fa', M(0, 32.6, 0)),
    piece(new ConeGeometry(14, 22, 5), '#5a5550', turned(9, 11, 6, 0.7)),
    piece(new ConeGeometry(11, 18, 5), '#77716b', turned(-10, 9, -7, 1.9)),
    piece(new ConeGeometry(6.5, 10, 5), '#f4f7fa', turned(9, 17.5, 6, 0.7)),
  ];
  return merge(p);
}

/** Yaks grazing: shaggy black and white bodies, horns, a herder in a red coat. */
function yakHerd() {
  const p = [];
  for (const [x, z, yaw, c] of [[-6, 0, 0.3, '#2a2420'], [-1, 3, -0.4, '#3a302a'], [4, -1, 1.2, '#f2ede2'], [8, 3, 0.1, '#2a2420'], [1, -4, 2.4, '#4a3a30']]) {
    const at = (lx, ly, lz) => new Vector3(lx, ly, lz).applyAxisAngle(Y, yaw).add(new Vector3(x, 0, z));
    const b = (w, h, d, lx, ly, lz, col) => { const q = at(lx, ly, lz); return piece(new BoxGeometry(w, h, d), col, turned(q.x, q.y, q.z, yaw)); };
    p.push(b(1.2, 1.1, 2.2, 0, 1.3, 0, c), b(1.3, 0.5, 2.3, 0, 0.75, 0, c)); // body and its shaggy skirt
    p.push(b(0.6, 0.6, 0.7, 0, 1.4, 1.35, c));
    for (const sx of [-0.35, 0.35]) p.push(b(0.12, 0.45, 0.12, sx, 1.85, 1.35, '#e8dcc0'));
    for (const [lx, lz] of [[-0.4, 0.8], [0.4, 0.8], [-0.4, -0.8], [0.4, -0.8]]) p.push(b(0.22, 0.6, 0.22, lx, 0.3, lz, '#1e1a18'));
  }
  p.push(box(0.6, 1.3, 0.4, -3, 0.65 + 0.3, 6, '#b8322a'), box(0.38, 0.38, 0.38, -3, 1.85, 6, '#c9946a'));
  return merge(p);
}

/** A Tibetan village: flat-roofed white houses with dark window frames, firewood stacked on the roofs, prayer flags, barley fields. */
function tibetanVillage() {
  const p = [];
  for (const [x, z, w, d, h] of [[-22, -6, 9, 8, 5], [-10, -12, 11, 9, 6], [3, -9, 8, 8, 5], [15, -14, 10, 9, 7], [26, -5, 8, 7, 5], [-30, 6, 8, 8, 5]]) {
    p.push(box(w, h, d, x, h / 2, z, '#f2ede2'), box(w + 0.4, 0.6, d + 0.4, x, h + 0.3, z, '#5a3a26'));
    p.push(box(w * 0.5, 0.8, d * 0.4, x - w * 0.15, h + 1, z - d * 0.2, '#8a6446')); // firewood
    for (let k = -1; k <= 1; k += 1) p.push(box(1.1, 1.3, 0.2, x + k * w * 0.28, h * 0.6, z + d / 2 + 0.05, '#2a2420'));
    p.push(piece(new CylinderGeometry(0.1, 0.12, 4, 5), '#5a3a26', M(x + w / 2 - 0.5, h + 2, z)));
    p.push(...flagLine([x + w / 2 - 0.5, h + 3.8, z], [x - w / 2, h + 0.8, z + d / 2], 8, 0.4));
  }
  for (const [x, z] of [[-12, 14], [10, 12]]) p.push(box(18, 0.3, 10, x, 0.15, z, '#c9b45a'));
  p.push(...chorten(0, 4, 0.9));
  return merge(p);
}

// ── Colca Spin ───────────────────────────────────────────────────────────────

/** A white Andean church: a broad facade with a carved doorway, twin bell towers, a red-tiled roof. */
function andeanChurch() {
  const WHITE = '#f2ede2';
  const STONE = '#c9b896';
  const p = [box(12, 9, 24, 0, 4.5, -6, WHITE), roof(13, 4, 25, 0, 9, -6, '#b8592f')];
  for (const sx of [-1, 1]) {
    p.push(box(4, 15, 4, sx * 8, 7.5, 5, WHITE), box(4.4, 0.6, 4.4, sx * 8, 15.3, 5, STONE));
    p.push(box(3, 3.5, 3, sx * 8, 17.4, 5, WHITE), piece(new ConeGeometry(1.8, 3, 4), '#b8592f', turned(sx * 8, 20.6, 5, Math.PI / 4)));
    p.push(box(1, 1.8, 0.2, sx * 8, 17.6, 6.55, '#3a2a20'));
  }
  p.push(box(12, 12, 1.2, 0, 6, 6.2, WHITE), box(5, 7, 0.4, 0, 4, 6.9, STONE), box(2.4, 4, 0.2, 0, 2, 7.15, '#5a3a26'));
  p.push(piece(new ConeGeometry(0.3, 1.4, 4), STONE, M(0, 12.7, 6.2)), box(0.2, 1.4, 0.2, 0, 13.6, 6.2, '#3a2a20'), box(0.9, 0.2, 0.2, 0, 13.8, 6.2, '#3a2a20'));
  p.push(box(34, 0.4, 16, 0, 0.2, 14, '#d8cdb4')); // the plaza
  return merge(p);
}

/** Terraces down a slope: curved stone-walled steps of green fields, one below another. */
function andeanTerraces() {
  const p = [];
  for (let k = 0; k < 7; k += 1) {
    const r = 30 - k * 3.6;
    const y = k * 1.8;
    p.push(piece(new CylinderGeometry(r, r, 1.8, 14, 1, false, -0.9, 1.8), k % 2 ? '#7f9a54' : '#6f9a45', M(0, y + 0.9, -18)));
    p.push(piece(new CylinderGeometry(r + 0.3, r + 0.3, 1.9, 14, 1, true, -0.9, 1.8), '#8a7a62', M(0, y + 0.9, -18)));
  }
  return merge(p);
}

/** A viewpoint on the rim where people watch the condors: a stone wall, a cross, visitors with cameras. */
function condorViewpoint() {
  const p = [box(24, 1, 10, 0, 0.5, 0, '#a8946e'), box(24, 1.1, 0.8, 0, 1.5, 4.6, '#8f7a5a')];
  p.push(box(0.5, 6, 0.5, 8, 3.5, 2, '#6a5a44'), box(2.6, 0.5, 0.5, 8, 5.3, 2, '#6a5a44'));
  const shirts = ['#c43a2f', '#2f5d9a', '#f2c230', '#2f9a4a', '#e86a9a', '#7a3fb0'];
  for (let k = 0; k < 8; k += 1) p.push(box(0.5, 1.1, 0.35, -9 + k * 2.3, 1.55, 3.6, shirts[k % 6]), box(0.36, 0.36, 0.36, -9 + k * 2.3, 2.3, 3.6, '#c9946a'));
  return merge(p);
}

/** Llamas and alpacas grazing, woolly in cream, brown and black, a herder in a bright woven shawl. */
function llamaHerd() {
  const p = [];
  for (const [x, z, yaw, c] of [[-5, 0, 0.4, '#f2ede2'], [-1, 3, -0.6, '#8a5a3a'], [3, -1, 1.4, '#3a302a'], [6, 3, 0.2, '#d8b88a'], [0, -4, 2.6, '#f2ede2']]) {
    const at = (lx, ly, lz) => new Vector3(lx, ly, lz).applyAxisAngle(Y, yaw).add(new Vector3(x, 0, z));
    const b = (w, h, d, lx, ly, lz, col) => { const q = at(lx, ly, lz); return piece(new BoxGeometry(w, h, d), col, turned(q.x, q.y, q.z, yaw)); };
    p.push(b(0.8, 0.8, 1.5, 0, 1.2, 0, c), b(0.35, 1.2, 0.35, 0, 2, 0.6, c), b(0.35, 0.35, 0.6, 0, 2.6, 0.8, c));
    for (const sx of [-0.1, 0.1]) p.push(b(0.08, 0.3, 0.08, sx, 2.9, 0.7, c));
    for (const [lx, lz] of [[-0.25, 0.5], [0.25, 0.5], [-0.25, -0.5], [0.25, -0.5]]) p.push(b(0.15, 0.85, 0.15, lx, 0.42, lz, c));
  }
  p.push(box(0.8, 1.2, 0.5, -3, 0.9, 6, '#c43a2f'), box(0.9, 0.3, 0.6, -3, 1.3, 6, '#f2c230'), box(0.36, 0.36, 0.36, -3, 1.8, 6, '#a8744a'), piece(new CylinderGeometry(0.35, 0.35, 0.15, 8), '#3a2a20', M(-3, 2.05, 6)));
  return merge(p);
}

/** An Andean village: stone houses with straw and tin roofs, a little square with a fountain, terraces behind. */
function andeanVillage() {
  const p = [];
  for (const [x, z, yaw, tin] of [[-20, -8, 0.1, false], [-9, -14, -0.1, true], [3, -10, 0.15, false], [15, -15, 0, false], [25, -6, -0.2, true], [-28, 4, 0.3, false]]) {
    p.push(piece(new BoxGeometry(8, 4, 6), '#a8946e', turned(x, 2, z, yaw)), roof(9, 2.6, 7, x, 4, z, tin ? '#9aa0a8' : '#d8b45a', yaw));
    p.push(piece(new BoxGeometry(1.2, 2, 0.2), '#3a6a9a', turned(x, 1, z + 3.05, yaw)));
  }
  p.push(box(16, 0.3, 12, 0, 0.15, 6, '#c9b896'), piece(new CylinderGeometry(1.4, 1.6, 1, 10), '#a8946e', M(0, 0.5, 6)), piece(new CylinderGeometry(0.3, 0.3, 2.2, 6), '#a8946e', M(0, 1.6, 6)));
  for (let k = 0; k < 4; k += 1) p.push(box(60 - k * 6, 1.6, 6, 0, 0.8 + k * 1.6, -26 - k * 5, k % 2 ? '#7f9a54' : '#6f9a45'));
  return merge(p);
}

// ── Tara River Spins ─────────────────────────────────────────────────────────

/** A rafting camp on the river bank: wooden cabins under pines, a jetty, rafts and kayaks pulled up, a campfire. */
function raftingCamp() {
  const WOOD = '#8a5a34';
  const p = [];
  for (const [x, z, yaw] of [[-16, -8, 0.15], [-4, -12, 0], [9, -10, -0.1], [21, -6, -0.25]]) {
    p.push(piece(new BoxGeometry(7, 3.4, 5.5), WOOD, turned(x, 1.7, z, yaw)), roof(8, 3, 6.5, x, 3.4, z, '#3a4a3a', yaw));
    p.push(piece(new BoxGeometry(6.8, 0.3, 2), '#6a4428', turned(x, 0.3, z + 3.6, yaw)));
  }
  for (const [x, z, sc] of [[-24, -2, 1.2], [-10, -2, 1], [2, -20, 1.3], [16, -18, 1.1], [28, -14, 1]]) {
    p.push(piece(new CylinderGeometry(0.3, 0.4, 3, 5), '#5a3a26', M(x, 1.5 * sc, z)));
    for (let k = 0; k < 3; k += 1) p.push(piece(new ConeGeometry((2.6 - k * 0.7) * sc, 3.6 * sc, 7), '#2f5f3a', M(x, (3.4 + k * 2.2) * sc, z)));
  }
  p.push(box(4, 0.4, 16, 0, 0.4, 10, '#8a6446'));
  for (const x of [-9, -5, 7]) p.push(box(2.6, 0.7, 5.6, x, 0.4, 8, '#d8452f'), box(1.6, 0.2, 4.6, x, 0.75, 8, '#2a2c33'));
  for (const x of [11, 13]) p.push(box(0.8, 0.5, 4.2, x, 0.3, 7, '#f2c230'));
  p.push(piece(new CylinderGeometry(1.4, 1.6, 0.4, 8), '#7a7470', M(-1, 0.2, 2)), piece(new ConeGeometry(0.7, 1.4, 6), '#f2843a', M(-1, 1, 2)));
  return merge(p);
}

// ── Copper Spins ─────────────────────────────────────────────────────────────

/** An old mission church in the canyon: adobe walls, a bell tower with arched openings, a cross. */
function adobeMission() {
  const ADOBE = '#c99a6a';
  const DARK = '#a0744a';
  const p = [box(10, 8, 22, 0, 4, -6, ADOBE), roof(10.6, 2.4, 22.6, 0, 8, -6, '#8a4a2a')];
  p.push(box(5, 16, 5, -6, 8, 5, ADOBE), box(5.4, 0.6, 5.4, -6, 16.3, 5, DARK), box(3.6, 3.4, 3.6, -6, 18.3, 5, ADOBE));
  p.push(piece(new SphereGeometry(1.9, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), ADOBE, M(-6, 20, 5)));
  for (const [x, z] of [[-6, 6.85], [-7.85, 5], [-4.15, 5]]) p.push(box(z === 5 ? 0.2 : 1.4, 2, z === 5 ? 1.4 : 0.2, x, 18.4, z, '#3a2a20'));
  p.push(box(0.25, 2, 0.25, -6, 22, 5, '#3a2a20'), box(1.1, 0.25, 0.25, -6, 22.4, 5, '#3a2a20'));
  p.push(box(10, 10, 1, 1, 5, 5.2, ADOBE), box(2.6, 4, 0.2, 1, 2, 5.8, '#5a3a26'), piece(new CylinderGeometry(1.3, 1.3, 0.2, 12, 1, false, 0, Math.PI), '#5a3a26', new Matrix4().makeRotationX(Math.PI / 2).premultiply(M(1, 4, 5.8))));
  p.push(box(30, 1.2, 0.8, 0, 0.6, 12, DARK), box(30, 0.3, 14, 0, 0.15, 5, '#d8b88a'));
  return merge(p);
}

/** A canyon railway station: a long timber platform and station house, a water tower, a train in red and cream. */
function canyonStation() {
  const p = [box(60, 1, 6, 0, 0.5, -4, '#8a6446')];
  p.push(box(16, 5, 7, -6, 3.5, -10, '#e8dcc0'), roof(17, 2.6, 8, -6, 6, -10, '#8a4a2a'));
  for (let x = -12; x <= 0; x += 3) p.push(box(1.4, 2, 0.2, x, 2.2, -6.4, '#3a5a6a'));
  p.push(piece(new CylinderGeometry(2.4, 2.4, 4, 10), '#6a4428', M(18, 9, -10)));
  for (const [x, z] of [[16.5, -11.5], [19.5, -11.5], [16.5, -8.5], [19.5, -8.5]]) p.push(box(0.4, 7, 0.4, x, 3.5, z, '#4f3622'));
  for (const sz of [0.75, -0.75]) p.push(box(80, 0.15, 0.15, 0, 0.1, 2 + sz, '#3a3b40'));
  for (let k = 0; k < 5; k += 1) {
    const x = -24 + k * 10.5;
    p.push(box(9.6, 3.2, 3, x, 2.3, 2, k ? (k % 2 ? '#b8322a' : '#e8dcc0') : '#2a3a4a'), box(9.8, 0.4, 3.2, x, 4.1, 2, '#2a2a2e'));
    for (let w = -3; w <= 3; w += 2) p.push(box(1.2, 1, 0.1, x + w, 2.8, 3.55, '#bfe0f0'));
  }
  return merge(p);
}

/** Homes in the cliff: whitewashed walls and doorways tucked into a rock overhang, ladders, a cooking fire, laundry. */
function cliffDwellings() {
  const ROCK = '#a2602f';
  const p = [
    piece(new BoxGeometry(30, 14, 12), ROCK, M(0, 7, -8)),
    piece(new BoxGeometry(32, 4, 16), '#8a4f2a', M(0, 15, -6)),
  ];
  for (const [x, w, h] of [[-9, 6, 4], [0, 7, 5], [9, 6, 4.5]]) {
    p.push(box(w, h, 4, x, h / 2, -1, '#e8dcc0'), box(1.2, 2, 0.2, x, 1, 1.1, '#3a2a20'));
  }
  p.push(box(0.2, 6, 0.2, 13, 3, 1, '#6a4428'), box(0.2, 6, 0.2, 14, 3, 1, '#6a4428'));
  for (let y = 0.6; y < 6; y += 0.9) p.push(box(1.2, 0.12, 0.12, 13.5, y, 1, '#6a4428'));
  p.push(piece(new ConeGeometry(0.6, 1, 6), '#f2843a', M(-4, 0.5, 5)));
  for (const [x, c] of [[-7, '#c43a2f'], [-6, '#2f6fc4'], [-5, '#f2c230'], [-4, '#2f9a4a']]) p.push(box(0.8, 1, 0.05, x, 3.2, 3, c));
  return merge(p);
}

// ── Hells Burst ──────────────────────────────────────────────────────────────

/** A wooden fire lookout on the rim: a cabin with windows all round on a tall timber tower, a stair up. */
function fireLookout() {
  const WOOD = '#7a5434';
  const p = [];
  for (const [x, z] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) p.push(piece(new CylinderGeometry(0.25, 0.3, 14, 5), WOOD, turned(x * 0.85, 7, z * 0.85, 0)));
  for (let y = 3; y < 14; y += 3.5) for (const [a, b] of [[[-2.6, -2.6], [2.6, 2.6]], [[2.6, -2.6], [-2.6, 2.6]]]) p.push(piece(new BoxGeometry(0.18, 0.18, 7.4), WOOD, turned(0, y, 0, Math.atan2(b[0] - a[0], b[1] - a[1]))));
  p.push(box(6.4, 0.5, 6.4, 0, 14.2, 0, '#5a3a26'), box(5.6, 2.6, 5.6, 0, 15.7, 0, '#e8dcc0'));
  for (const [x, z, w, d] of [[0, 2.85, 4.4, 0.1], [0, -2.85, 4.4, 0.1], [2.85, 0, 0.1, 4.4], [-2.85, 0, 0.1, 4.4]]) p.push(box(w, 1.3, d, x, 16, z, '#8fc4dc'));
  p.push(roof(7, 2, 7, 0, 17, 0, '#4a3a2e'), box(0.2, 1.8, 0.2, 0, 19.6, 0, '#2a2a2e'));
  return merge(p);
}

/** A cliff of basalt columns: tall dark hexagonal columns standing side by side, some broken off lower. */
function basaltColumns() {
  const p = [];
  for (let k = 0; k < 26; k += 1) {
    const x = -14 + (k % 13) * 2.3 + (k >= 13 ? 1.15 : 0);
    const z = k >= 13 ? -2 : 0;
    const h = 10 + ((k * 7) % 9) + (k >= 13 ? 4 : 0);
    p.push(piece(new CylinderGeometry(1.25, 1.25, h, 6), ['#3a3634', '#45403d', '#2f2c2b'][k % 3], M(x, h / 2, z)));
  }
  p.push(box(34, 4, 8, 0, 20, -5, '#4a4542'));
  return merge(p);
}

/** Bighorn sheep on a ledge: stocky brown bodies, pale rumps, the rams' great curled horns. */
function bighornSheep() {
  const p = [box(16, 1.2, 6, 0, 0.6, 0, '#4a4542')];
  for (const [x, z, yaw, ram] of [[-5, 0, 0.3, true], [-1, 1.5, -0.5, false], [3, -0.5, 1.3, true], [6, 1, 0.2, false]]) {
    const at = (lx, ly, lz) => new Vector3(lx, ly, lz).applyAxisAngle(Y, yaw).add(new Vector3(x, 1.2, z));
    const b = (w, h, d, lx, ly, lz, col) => { const q = at(lx, ly, lz); return piece(new BoxGeometry(w, h, d), col, turned(q.x, q.y, q.z, yaw)); };
    p.push(b(0.8, 0.8, 1.5, 0, 1.1, 0, '#8a6a4a'), b(0.7, 0.6, 0.3, 0, 1.1, -0.75, '#e8dcc0'), b(0.4, 0.5, 0.6, 0, 1.7, 0.85, '#8a6a4a'));
    for (const [lx, lz] of [[-0.25, 0.5], [0.25, 0.5], [-0.25, -0.5], [0.25, -0.5]]) p.push(b(0.14, 0.8, 0.14, lx, 0.4, lz, '#5a4030'));
    if (ram) for (const sx of [-1, 1]) { const q = at(sx * 0.3, 1.9, 0.7); p.push(piece(new TorusGeometry(0.28, 0.1, 4, 8, Math.PI * 1.4), '#c9b48a', turned(q.x, q.y, q.z, yaw + Math.PI / 2))); }
  }
  return merge(p);
}

/** A jet boat on the river: a long aluminium hull, a cabin, passengers in life vests. */
function jetBoat() {
  const p = [box(3, 1, 9, 0, 0.3, 0, '#c9ced6'), piece(new ConeGeometry(1.5, 2.6, 4), '#c9ced6', new Matrix4().makeRotationX(Math.PI / 2).premultiply(M(0, 0.3, 5.7)).multiply(new Matrix4().makeRotationY(Math.PI / 4)).multiply(S(0, 0, 0, 1, 1, 0.45)))];
  p.push(box(2.6, 0.2, 1.4, 0, 1.4, 2, '#2a5ad8'), box(0.1, 1, 0.1, 1.2, 0.9, 2, '#2a2a2e'), box(0.1, 1, 0.1, -1.2, 0.9, 2, '#2a2a2e'));
  for (let k = 0; k < 8; k += 1) p.push(box(0.45, 0.55, 0.35, k % 2 ? 0.7 : -0.7, 1.05, -2.6 + Math.floor(k / 2) * 1.3, '#f2a330'), box(0.3, 0.3, 0.3, k % 2 ? 0.7 : -0.7, 1.5, -2.6 + Math.floor(k / 2) * 1.3, '#e0b894'));
  p.push(box(3.2, 0.15, 3, 0, 0.05, -6, '#f4f8f8')); // its wake
  return merge(p);
}

/** A ranch by the river: a log ranch house, a barn, a corral of horses, a dock with a jet boat. */
function riverRanch() {
  const p = [box(14, 4.5, 9, -8, 2.25, -10, '#8a5a34'), roof(15, 3.2, 10, -8, 4.5, -10, '#4a3a2e'), box(14, 0.3, 3, -8, 0.3, -4.5, '#6a4428')];
  p.push(box(12, 7, 10, 14, 3.5, -14, '#9a3a2a'), roof(13, 4, 11, 14, 7, -14, '#5a5550'));
  for (let k = 0; k <= 7; k += 1) p.push(box(0.2, 1.4, 0.2, 2 + k * 2.5, 0.7, 0, '#7a5a3a'), box(0.2, 1.4, 0.2, 2 + k * 2.5, 0.7, -8, '#7a5a3a'));
  p.push(box(17.5, 0.15, 0.15, 10.75, 1.2, 0, '#7a5a3a'), box(17.5, 0.15, 0.15, 10.75, 1.2, -8, '#7a5a3a'));
  for (const [x, z, yaw, c] of [[6, -3, 0.5, '#6a4a32'], [11, -5, -0.7, '#3a2a20'], [16, -2.5, 2, '#d8c8a8']]) p.push(...mule(x, z, yaw, null, c));
  p.push(box(4, 0.4, 14, -2, 0.4, 9, '#8a6446'));
  for (const [x, z] of [[-14, -16], [-20, -4], [24, -4]]) p.push(...juniper(x, z, 1.6, '#4f6a3a'));
  return merge(p);
}

// ── Kali Gandaki Burst, Indus Spins ─────────────────────────────────────────

/** A giant snow peak far off: a great rock pyramid with snowfields and a snow-plumed summit. */
function giantPeak() {
  const p = [
    piece(new ConeGeometry(110, 170, 7), '#5f5a55', M(0, 85, 0)),
    piece(new ConeGeometry(70, 108, 7), '#f4f7fa', M(0, 116, 0)),
    piece(new ConeGeometry(60, 80, 5), '#6a6560', turned(70, 40, 20, 0.6)),
    piece(new ConeGeometry(36, 48, 5), '#f4f7fa', turned(70, 56, 20, 0.6)),
    piece(new ConeGeometry(55, 70, 5), '#57524d', turned(-75, 35, -10, 1.7)),
    piece(new ConeGeometry(30, 38, 5), '#f4f7fa', turned(-75, 51, -10, 1.7)),
    piece(new IcosahedronGeometry(14, 0), '#ffffff', S(26, 166, 0, 2.4, 0.5, 1)), // the plume blowing off the summit
  ];
  return merge(p);
}

/** A trail village: stone houses with flat roofs stacked with firewood, apple trees, a gateway chorten with prayer wheels. */
function trailVillage() {
  const p = [];
  for (const [x, z, w, d, h] of [[-20, -8, 8, 7, 5], [-9, -13, 10, 8, 6], [4, -10, 8, 7, 5], [16, -14, 9, 8, 6], [26, -6, 7, 7, 5]]) {
    p.push(box(w, h, d, x, h / 2, z, '#a89a86'), box(w + 0.4, 0.5, d + 0.4, x, h + 0.25, z, '#6a5a48'), box(w * 0.6, 0.9, d * 0.35, x, h + 0.9, z - d * 0.25, '#8a6446'));
    for (let k = -1; k <= 1; k += 2) p.push(box(1, 1.2, 0.2, x + k * w * 0.25, h * 0.6, z + d / 2 + 0.05, '#3a2a20'));
  }
  for (const [x, z] of [[-14, 8], [-6, 10], [8, 9], [15, 7]]) p.push(piece(new CylinderGeometry(0.25, 0.3, 2, 5), '#5a3a26', M(x, 1, z)), piece(new IcosahedronGeometry(1.8, 0), '#5f8f3a', M(x, 3, z)), box(0.3, 0.3, 0.3, x + 0.8, 3.2, z + 1.2, '#c43a2f'));
  // The gateway chorten over the trail, prayer wheels along its wall.
  p.push(box(8, 5, 3, 0, 2.5, 4, '#f2ede2'), box(3, 3.4, 3.2, 0, 1.7, 4, '#3a2a20'), box(8.4, 0.8, 3.4, 0, 5.4, 4, '#8a2a22'));
  for (let k = 0; k < 6; k += 1) p.push(piece(new CylinderGeometry(0.35, 0.35, 0.9, 8), '#c9a03a', M(-3 + k * 1.2, 1, 2.3)));
  return merge(p);
}

/** A decorated truck on the mountain road: painted panels in every colour, a crown over the cab, chains and tassels. */
function jingleTruck() {
  const COLOURS = ['#e2242a', '#f2c230', '#2f9a4a', '#2a6ad8', '#e86a9a', '#f2843a'];
  const p = [box(2.6, 1.2, 9, 0, 1.1, 0, '#2a2a2e')];
  p.push(box(2.6, 2.4, 2.4, 0, 2.6, 3.4, COLOURS[0]), box(2.4, 1, 0.1, 0, 3, 4.65, '#8fc4dc'));
  p.push(box(2.9, 1.6, 2.2, 0, 4.4, 3.2, COLOURS[1])); // the painted crown over the cab
  for (let k = 0; k < 5; k += 1) p.push(box(2.8, 3, 1.2, 0, 3.2, 1.6 - k * 1.25, COLOURS[(k + 2) % 6]));
  for (let k = 0; k < 10; k += 1) p.push(box(0.12, 0.6, 0.12, -1.4 + (k % 2) * 2.8, 0.4, 4.4 - k * 0.9, '#d8d8e0')); // chains
  for (const z of [3.4, -3.4]) for (const x of [-1.3, 1.3]) p.push(piece(new CylinderGeometry(0.55, 0.55, 0.4, 10), '#1e1e22', new Matrix4().makeRotationZ(Math.PI / 2).premultiply(M(x, 0.55, z))));
  return merge(p);
}

/** A hill fort over the valley: tall stone and timber walls, a watchtower, carved wooden balconies. */
function hillFort() {
  const p = [box(20, 9, 14, 0, 4.5, -4, '#c9b896'), box(8, 16, 8, 6, 8, -6, '#d8c8a8'), box(8.6, 1, 8.6, 6, 16.5, -6, '#6a4428')];
  for (const y of [3, 6.5]) p.push(box(20.4, 0.5, 14.4, 0, y, -4, '#6a4428'));
  for (let x = -7; x <= 7; x += 3.5) p.push(box(2.2, 2, 0.8, x, 7, 3.3, '#8a5a34'));
  p.push(roof(9, 3, 9, 6, 17, -6, '#5a4a3a'), box(30, 1, 22, 0, 0.5, -4, '#a8946e'));
  return merge(p);
}

// ── Cotahuasi Free Fall, Fish River Burst ───────────────────────────────────

/** Giant puya plants: tall flower spikes on rosettes of spiky leaves, high in the Andes. */
function puyaPlants() {
  const p = [];
  for (const [x, z, h] of [[-6, 0, 9], [0, 3, 11], [5, -2, 8], [9, 2, 7]]) {
    p.push(piece(new IcosahedronGeometry(1.8, 0), '#6f8a5a', S(x, 1.2, z, 1, 0.7, 1)));
    p.push(piece(new CylinderGeometry(0.45, 0.8, h, 7), '#c9c07a', M(x, 2 + h / 2, z)));
    p.push(piece(new ConeGeometry(0.6, 1.4, 7), '#b8b06a', M(x, 2.7 + h, z)));
  }
  return merge(p);
}

/** Hot springs: steaming pools of blue water in stone rims, a low resort building, palms. */
function hotSprings() {
  const p = [];
  for (const [x, z, r] of [[-10, 4, 6], [3, 6, 5], [12, 0, 4.5]]) {
    p.push(piece(new CylinderGeometry(r + 0.8, r + 0.9, 0.8, 14), '#b8a07a', M(x, 0.4, z)), piece(new CylinderGeometry(r, r, 0.85, 14), '#6ac4d0', M(x, 0.45, z)));
    for (let k = 0; k < 3; k += 1) p.push(piece(new IcosahedronGeometry(1.4 + k * 0.4, 0), '#f4f7fa', S(x + k * 0.6, 2 + k * 1.6, z - k * 0.4, 1, 0.7, 1))); // steam
  }
  p.push(box(26, 4, 8, 0, 2, -12, '#e8dcc0'), box(27, 0.5, 9, 0, 4.2, -12, '#a0744a'));
  for (let x = -10; x <= 10; x += 4) p.push(box(2, 2, 0.2, x, 2, -7.9, '#3a5a6a'));
  for (const [x, z] of [[-18, -4], [18, 6], [20, -6]]) p.push(piece(new CylinderGeometry(0.3, 0.4, 7, 5), '#8a6a4a', M(x, 3.5, z)), piece(new ConeGeometry(3, 1.2, 7), '#4f8a3a', M(x, 7.3, z)));
  return merge(p);
}

/** Hikers' camp on the canyon floor: little tents, packs, a campfire, hikers resting. */
function hikersCamp() {
  const p = [];
  for (const [x, z, c] of [[-6, 0, '#f2843a'], [-1, -3, '#2f9a4a'], [5, -1, '#2a6ad8']]) p.push(piece(new ConeGeometry(1.8, 1.8, 4), c, turned(x, 0.9, z, Math.PI / 4, 1, 1, 1.6)));
  p.push(piece(new CylinderGeometry(1, 1.1, 0.3, 8), '#7a7470', M(0, 0.15, 4)), piece(new ConeGeometry(0.5, 1, 6), '#f2843a', M(0, 0.7, 4)));
  for (const [x, z, c] of [[-2, 5, '#c43a2f'], [2, 5.5, '#f2c230'], [1.5, 2.6, '#2f5d9a']]) p.push(box(0.5, 0.7, 0.4, x, 0.35, z, c), box(0.32, 0.32, 0.32, x, 0.9, z, '#c9946a'));
  return merge(p);
}

/** A grove of quiver trees: pale forked trunks, rounded crowns of grey-green leaves, rocks between. */
function quiverGrove() {
  const p = [];
  for (const [x, z, s] of [[-8, 0, 1.2], [-2, 4, 1], [4, -2, 1.3], [9, 3, 0.9], [0, -6, 1.1]]) {
    p.push(piece(new CylinderGeometry(0.4 * s, 0.75 * s, 4 * s, 6), '#d8c49a', M(x, 2 * s, z)));
    for (const a of [0, 2.1, 4.2]) p.push(piece(new CylinderGeometry(0.2 * s, 0.3 * s, 2 * s, 5), '#d8c49a', turned(x + Math.cos(a) * 0.7 * s, 4.6 * s, z + Math.sin(a) * 0.7 * s, a).multiply(new Matrix4().makeRotationX(0.5))));
    p.push(piece(new IcosahedronGeometry(2.4 * s, 0), '#8f9a6a', S(x, 6 * s, z, 1, 0.55, 1)));
  }
  for (const [x, z] of [[-4, -3], [6, 4], [12, -4]]) p.push(piece(new IcosahedronGeometry(1.6, 0), '#7a6a5a', S(x, 0.6, z, 1.3, 0.7, 1)));
  return merge(p);
}

/**
 * A tall waterfall pouring off the rim down the canyon wall (origin at the lip on the rim, front
 * +z towards the track): a white sheet of water falling the wall's height in steps, a pool and spray
 * at its foot. `drop`: the wall's height; `run`: how far out the wall's foot is.
 */
function canyonWaterfall(drop = 50, run = 24) {
  const WATER = '#dff3f6';
  const DEEP = '#9fd4dc';
  const p = [];
  const steps = 8;
  for (let k = 0; k < steps; k += 1) {
    const y0 = -(drop * k) / steps;
    const y1 = -(drop * (k + 1)) / steps;
    const z0 = 1.5 + (run * k) / steps;
    const z1 = 1.5 + (run * (k + 1)) / steps;
    const w = 7 + k * 0.8;
    const len = Math.hypot(y1 - y0, z1 - z0);
    const tilt = Math.atan2(z1 - z0, y0 - y1);
    p.push(piece(new BoxGeometry(w, len, 0.5), k % 2 ? WATER : DEEP, new Matrix4().makeRotationX(tilt).premultiply(M(0, (y0 + y1) / 2, (z0 + z1) / 2 + 2.2))));
  }
  p.push(piece(new CylinderGeometry(9, 9.5, 0.6, 14), DEEP, M(0, -drop + 0.4, run + 6)));
  for (let k = 0; k < 4; k += 1) p.push(piece(new IcosahedronGeometry(3 + k * 0.6, 0), '#f4fbfc', S(Math.sin(k * 2) * 3, -drop + 2 + k * 1.6, run + 5 + Math.cos(k * 2) * 2, 1.2, 0.7, 1)));
  p.push(box(10, 1.2, 4, 0, 0.3, 1, '#7a6a52')); // the lip
  return merge(p);
}

export const CANYON_LANDMARKS = {
  'rim-lookout': { build: rimLookout, radius: 16 },
  'glass-skywalk': { build: glassSkywalk, radius: 18 },
  'mule-train': { build: muleTrain, radius: 9 },
  'river-rafts': { build: riverRafts, radius: 8 },
  'river-camp': { build: riverCamp, radius: 40 },
  gompa: { build: gompa, radius: 18 },
  'chorten-row': { build: chortenRow, radius: 12 },
  'snow-peak': { build: snowPeak, radius: 30, fit: 26 },
  'yak-herd': { build: yakHerd, radius: 10 },
  'tibetan-village': { build: tibetanVillage, radius: 36 },
  'andean-church': { build: andeanChurch, radius: 16 },
  'andean-terraces': { build: andeanTerraces, radius: 30 },
  'condor-viewpoint': { build: condorViewpoint, radius: 13 },
  'llama-herd': { build: llamaHerd, radius: 9 },
  'andean-village': { build: andeanVillage, radius: 34 },
  'rafting-camp': { build: raftingCamp, radius: 32 },
  'adobe-mission': { build: adobeMission, radius: 16 },
  'canyon-station': { build: canyonStation, radius: 40 },
  'cliff-dwellings': { build: cliffDwellings, radius: 17 },
  'fire-lookout': { build: fireLookout, radius: 6 },
  'basalt-columns': { build: basaltColumns, radius: 17 },
  'bighorn-sheep': { build: bighornSheep, radius: 9 },
  'jet-boat': { build: jetBoat, radius: 6 },
  'river-ranch': { build: riverRanch, radius: 30 },
  'giant-peak': { build: giantPeak, radius: 120 },
  'trail-village': { build: trailVillage, radius: 32 },
  'jingle-truck': { build: jingleTruck, radius: 6 },
  'hill-fort': { build: hillFort, radius: 18 },
  'puya-plants': { build: puyaPlants, radius: 10 },
  'hot-springs': { build: hotSprings, radius: 26 },
  'hikers-camp': { build: hikersCamp, radius: 9 },
  'quiver-grove': { build: quiverGrove, radius: 14 },
  'canyon-waterfall': { build: () => canyonWaterfall(), radius: 12 },
};

/** An Andean condor gliding: black, a white ruff round its neck, white patches on its broad wings. */
export function condor() {
  return merge([
    piece(new BoxGeometry(0.55, 0.45, 1.5), '#1e1e22', M(0, 0, 0)),
    piece(new TorusGeometry(0.3, 0.12, 5, 8), '#f2f0ea', new Matrix4().makeRotationX(Math.PI / 2).premultiply(M(0, 0.05, 0.75))),
    piece(new BoxGeometry(0.3, 0.3, 0.42), '#c98a7a', M(0, 0.08, 1.05)),
    piece(new BoxGeometry(6.2, 0.08, 1.0), '#1e1e22', M(0, 0.1, 0.05)),
    piece(new BoxGeometry(2.6, 0.1, 0.45), '#f2f0ea', M(0, 0.12, -0.2)),
    piece(new ConeGeometry(0.45, 1.1, 4), '#1e1e22', new Matrix4().compose(new Vector3(0, 0, -1.2), new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2), new Vector3(1, 0.3, 1))),
    // The splayed primary feathers at each wing tip.
    ...[-1, 1].flatMap((sx) => [0, 1, 2].map((k) => piece(new BoxGeometry(0.7, 0.05, 0.16), '#1e1e22', turned(sx * 3.35, 0.1, 0.35 - k * 0.3, sx * (0.25 - k * 0.2))))),
  ]);
}
