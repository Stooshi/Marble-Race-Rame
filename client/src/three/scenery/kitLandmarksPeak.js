/**
 * Landmarks for the Peaks series: one builder each, origin on the ground, front facing +z, cartoon low-poly
 * from a few simple shapes, merged into the still scenery. Stylised impressions of a mountain's places, never
 * detailed reproductions. The plan's rules (project doc claude/rivers-and-peaks-plan.md, section 2): no
 * religious objects (no prayer flags, chortens, shrines, torii or offerings), no flags of any kind, no
 * expedition, guide, gear, lift or airline names, and nothing on a summit (summits live in the far backdrop).
 */
import { ConeGeometry, CylinderGeometry, IcosahedronGeometry, Matrix4, Quaternion, SphereGeometry, Vector3 } from 'three';
import { beam, box, merge, piece } from './parts';

const Y = new Vector3(0, 1, 0);
const M = (x, y, z) => new Matrix4().makeTranslation(x, y, z);
const S = (x, y, z, sx, sy, sz) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion(), new Vector3(sx, sy, sz));
const turned = (x, y, z, yaw, sx = 1, sy = 1, sz = 1) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(Y, yaw), new Vector3(sx, sy, sz));
const leaning = (x, y, z, yaw, tilt, sx, sy, sz) => turned(x, y, z, yaw, sx, sy, sz).multiply(new Matrix4().makeRotationZ(tilt));
const r01 = (k) => { const v = Math.sin(k * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

/** A camp on the glacier: tents in plain colours (domes and ridge tents), a bigger mess tent, a supply sled. No flag, no names. */
function peakCamp() {
  const p = [];
  const colours = ['#e8792a', '#f2c230', '#2f6fb0', '#3a8a4a', '#d8452f', '#e8792a'];
  [[-8, -4], [-3, -9], [3, -6], [9, -3], [-10, 5], [6, 6]].forEach(([x, z], k) => {
    if (k % 2) {
      // A dome tent: half a sphere, a darker flysheet band.
      p.push(piece(new SphereGeometry(1.6, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), colours[k], S(x, 0, z, 1.2, 0.9, 1)));
      p.push(box(0.9, 0.9, 0.12, x, 0.45, z + 1.55, '#2a2e36'));
    } else {
      // A ridge tent: a four-sided cone stretched long.
      p.push(piece(new ConeGeometry(1.4, 1.7, 4), colours[k], turned(x, 0.85, z, Math.PI / 4 + k * 0.3, 1, 1, 1.8)));
    }
  });
  // The mess tent: a long canvas hall in grey-green, its door open.
  p.push(box(5, 2.2, 8, 0, 1.1, 3, '#7a8a6a'), piece(new ConeGeometry(4.6, 1.8, 4), '#6a7a5a', turned(0, 3.1, 3, Math.PI / 4, 0.78, 1, 1.25)));
  p.push(box(1.4, 1.6, 0.1, 0, 0.8, 7.05, '#2a2e36'));
  // A supply sled loaded with crates, and a stack of supply barrels.
  p.push(box(1.4, 0.15, 3.6, 11, 0.25, 9, '#3b3f46'), box(1.2, 0.8, 1, 11, 0.75, 8.2, '#c8a66a'), box(1.2, 0.6, 1.2, 11, 0.65, 9.6, '#4f6f9a'));
  for (const [x, z] of [[-5, 10], [-4.2, 10.6], [-5.6, 11]]) p.push(piece(new CylinderGeometry(0.4, 0.4, 0.9, 7), '#2f5d9a', M(x, 0.45, z)));
  return merge(p);
}

/** A field of seracs: great leaning blocks of glacier ice, blue in their cracks, snow on their tops. */
function seracField() {
  const p = [];
  for (let k = 0; k < 14; k += 1) {
    const a = r01(k) * Math.PI * 2;
    const d = 6 + r01(k + 40) * 24;
    const h = 6 + r01(k + 80) * 10;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    p.push(piece(new IcosahedronGeometry(3, 0), k % 3 ? '#cfe8f4' : '#9fcfe8', leaning(x, h / 2, z, a, (r01(k + 9) - 0.5) * 0.4, 1.1, h / 6, 0.9)));
    p.push(piece(new IcosahedronGeometry(2.2, 0), '#f4f8fb', leaning(x, h + 0.2, z, a, 0, 1.2, 0.35, 1)));
    if (k % 3 === 0) p.push(box(0.3, h * 0.7, 2.2, x + 1.6, h * 0.45, z, '#5f9fca'));
  }
  return merge(p);
}

/** Granite needles: tall slender spires of warm grey-red granite, snow on their ledges, far off the track. */
function graniteNeedles() {
  const p = [];
  [[0, 0, 95, 9], [-22, 10, 70, 7], [20, 6, 80, 8], [-40, -6, 55, 7], [38, -10, 60, 6]].forEach(([x, z, h, r], k) => {
    p.push(piece(new ConeGeometry(r, h, 5), k % 2 ? '#8a7166' : '#7a645a', turned(x, h / 2 - 3, z, k * 0.7)));
    for (const f of [0.35, 0.6]) p.push(piece(new IcosahedronGeometry(r * (1 - f) * 0.9, 0), '#f2f6fa', S(x, h * f, z, 1.2, 0.18, 1.2)));
  });
  // Their glacier at the foot.
  p.push(piece(new IcosahedronGeometry(30, 1), '#e8f0f6', S(0, -4, 8, 2.2, 0.25, 1.1)));
  return merge(p);
}

/** Nunataks: dark rock peaks standing out of the ice, snow on their shoulders. */
function nunataks() {
  const p = [];
  [[0, 0, 42, 22], [-30, 12, 28, 16], [28, 16, 34, 18], [-12, -26, 20, 12]].forEach(([x, z, h, r], k) => {
    p.push(piece(new ConeGeometry(r, h, 6), k % 2 ? '#3a3633' : '#2f2c2a', turned(x, h / 2 - 2, z, k * 0.9)));
    p.push(piece(new ConeGeometry(r * 0.45, h * 0.25, 6), '#f4f7fa', turned(x + r * 0.15, h * 0.62, z, k * 0.9 + 0.3)));
    p.push(piece(new IcosahedronGeometry(r * 0.9, 0), '#e8eef4', S(x, 0.5, z, 1.4, 0.2, 1.4))); // (drifted snow round its foot)
  });
  return merge(p);
}

/** A ski plane parked on the glacier: a small high-wing plane on skis, in red and white, no markings. */
export function skiPlaneModel() {
  const p = [];
  p.push(box(1.6, 1.7, 9, 0, 2.1, 0, '#f2f2ee'), box(1.65, 0.5, 9.05, 0, 1.6, 0, '#c8302a'));
  p.push(piece(new ConeGeometry(0.9, 2, 6), '#f2f2ee', new Matrix4().makeTranslation(0, 2.2, 5.5).multiply(new Matrix4().makeRotationX(Math.PI / 2))));
  p.push(box(14, 0.25, 1.8, 0, 3.15, 1, '#c8302a')); // the high wing
  for (const sx of [-1, 1]) p.push(beam(new Vector3(sx * 4.5, 3.05, 1), new Vector3(sx * 0.8, 1.4, 1), 0.12, '#8a8f99')); // wing struts
  p.push(box(4.4, 0.18, 1.1, 0, 2.6, -4.2, '#f2f2ee'), box(0.18, 1.6, 1.2, 0, 3.4, -4.3, '#c8302a')); // the tail
  for (const sx of [-1, 1]) {
    p.push(beam(new Vector3(sx * 0.6, 1.4, 1.8), new Vector3(sx * 1.4, 0.35, 1.8), 0.12, '#3b3f46'));
    p.push(box(0.4, 0.15, 3.4, sx * 1.4, 0.2, 1.6, '#e8e4dc')); // the skis
  }
  p.push(box(0.3, 0.12, 1.4, 0, 0.3, -3.6, '#e8e4dc'));
  p.push(box(0.12, 2.2, 0.2, 0, 2.2, 6.6, '#3b3f46')); // the propeller, standing still
  return merge(p);
}
function skiPlane() {
  return skiPlaneModel();
}

/** The crater's ice cliffs, seen from far below: stepped white-blue walls with vertical stripes, on a dark rock shelf. */
function craterIceCliffs() {
  const p = [];
  for (let k = -4; k <= 4; k += 1) {
    const h = 18 + ((k * 7 + 40) % 5) * 3;
    p.push(box(14, h, 8, k * 13, h / 2 + 4, (k % 2) * 3, k % 2 ? '#eaf4fa' : '#d6ecf6'));
    for (const x of [-4, 0, 4]) p.push(box(0.6, h * 0.8, 0.3, k * 13 + x, h * 0.45 + 4, (k % 2) * 3 + 4.1, '#9ccbe4'));
  }
  p.push(box(130, 4, 16, 0, 2, 0, '#4a423c'));
  return merge(p);
}

/** Giant groundsels and lobelias of the high moorland, a stand of them. */
function giantGroundsels() {
  const p = [];
  for (let k = 0; k < 9; k += 1) {
    const a = r01(k + 3) * Math.PI * 2;
    const d = r01(k + 17) * 11;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    const h = 3 + r01(k + 5) * 3;
    p.push(piece(new CylinderGeometry(0.5, 0.55, h * 0.6, 6), '#b8ae8e', M(x, h * 0.3, z)));
    p.push(piece(new CylinderGeometry(0.28, 0.35, h * 0.4, 5), '#8a8a7a', M(x, h * 0.8, z)));
    p.push(piece(new IcosahedronGeometry(1.1, 0), '#5f8f3e', S(x, h + 0.2, z, 1, 0.55, 1)));
    if (k % 2) {
      // A branch with its own rosette.
      p.push(beam(new Vector3(x, h * 0.75, z), new Vector3(x + 1.2, h * 0.95, z + 0.4), 0.3, '#8a8a7a'));
      p.push(piece(new IcosahedronGeometry(0.8, 0), '#5f8f3e', S(x + 1.3, h + 0.15, z + 0.45, 1, 0.55, 1)));
    }
  }
  // Lobelias: tall green-grey spikes.
  for (let k = 0; k < 5; k += 1) p.push(piece(new ConeGeometry(0.45, 2.6, 6), '#7a8a6a', M(-8 + k * 4, 1.3, 9 + (k % 2) * 2)));
  return merge(p);
}

/** Braided meltwater streams across the black sand: pale winding ribbons, gravel bars between them. */
function meltwaterStreams() {
  const p = [];
  for (let k = -3; k <= 3; k += 1) {
    for (let j = -6; j <= 6; j += 1) {
      const x = k * 12 + Math.sin(j * 0.8 + k) * 4;
      const z = j * 8;
      p.push(box(2.2 + (k % 2), 0.12, 8.6, x, 0.06, z, k % 2 ? '#9fc4d4' : '#8ab8cc'));
    }
  }
  for (let k = 0; k < 8; k += 1) p.push(piece(new IcosahedronGeometry(2.2, 0), '#4f4c4a', S(-30 + k * 9, 0.2, (k % 3) * 9 - 9, 1.6, 0.18, 1)));
  return merge(p);
}

/** A cairn at a pass: flat stones stacked into a tall marker (only at passes and ridges on mountains without a sacred-summit request). */
function passCairn() {
  const p = [];
  for (let k = 0; k < 7; k += 1) {
    const w = 1.1 - k * 0.11;
    p.push(piece(new IcosahedronGeometry(w, 0), ['#8a8580', '#6f6a66', '#a39e98'][k % 3], turned(0, 0.4 + k * 0.42, 0, k * 1.1, 1, 0.35 / w, 1)));
  }
  return merge(p);
}

/** A glacier's tongue: its front a wall of blue-white ice with bands of dark ash, crevassed along the top. */
function glacierTongue() {
  const p = [];
  for (let k = -5; k <= 5; k += 1) {
    const h = 20 + ((k * 13 + 50) % 4) * 3;
    p.push(box(12, h, 18, k * 11.5, h / 2 - 1, 0, k % 2 ? '#cfe6f2' : '#b8dcef'));
    p.push(box(12.1, 1.4, 18.1, k * 11.5, h * 0.35, 0, '#3a3836'), box(12.1, 0.8, 18.1, k * 11.5, h * 0.6, 0, '#4f4c4a'));
    p.push(box(0.8, h * 0.3, 18.2, k * 11.5 + 5.7, h * 0.85, 0, '#5f96c8')); // (a crevasse in the top)
  }
  p.push(piece(new IcosahedronGeometry(30, 1), '#e8f2f8', S(0, 18, -26, 2.4, 0.4, 1.2)));
  return merge(p);
}

export const PEAK_LANDMARKS = {
  'peak-camp': { build: peakCamp, radius: 16 },
  'serac-field': { build: seracField, radius: 34 },
  'granite-needles': { build: graniteNeedles, radius: 70 },
  nunataks: { build: nunataks, radius: 50 },
  'ski-plane': { build: skiPlane, radius: 9 },
  'crater-ice-cliffs': { build: craterIceCliffs, radius: 70 },
  'giant-groundsels': { build: giantGroundsels, radius: 14 },
  'meltwater-streams': { build: meltwaterStreams, radius: 50 },
  'pass-cairn': { build: passCairn, radius: 3 },
  'glacier-tongue': { build: glacierTongue, radius: 70 },
};
