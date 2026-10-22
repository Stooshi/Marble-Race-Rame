/**
 * Landmarks for the Rivers series: one builder each, origin on the ground (or, for a boat, on the
 * water: placed with `river: true`), front facing +z, cartoon low-poly from a few simple shapes,
 * merged into the still scenery. Stylised impressions of a river's life, never detailed
 * reproductions, and no ship's, company's or building's name anywhere.
 */
import { BoxGeometry, ConeGeometry, CylinderGeometry, IcosahedronGeometry, Matrix4, Quaternion, SphereGeometry, Vector3 } from 'three';
import { box, merge, piece } from './parts';

const Y = new Vector3(0, 1, 0);
const M = (x, y, z) => new Matrix4().makeTranslation(x, y, z);
const S = (x, y, z, sx, sy, sz) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion(), new Vector3(sx, sy, sz));
const turned = (x, y, z, yaw, sx = 1, sy = 1, sz = 1) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(Y, yaw), new Vector3(sx, sy, sz));
const roof = (w, h, d, x, y, z, colour, yaw = 0) => piece(new ConeGeometry(Math.hypot(w, d) / 2, h, 4), colour, turned(x, y + h / 2, z, Math.PI / 4 + yaw, w / Math.hypot(w, d) * Math.SQRT2, 1, d / Math.hypot(w, d) * Math.SQRT2));
/** A pointed bow along +z: a flattened four-sided cone. */
const bow = (w, h, len, z, y, colour) => piece(new ConeGeometry(w / Math.SQRT2, len, 4), colour, new Matrix4().makeTranslation(0, y, z + len / 2).multiply(new Matrix4().makeRotationX(Math.PI / 2)).multiply(new Matrix4().makeRotationY(Math.PI / 4)).multiply(S(0, 0, 0, 1, 1, h / w)));
const people = (p, spots, y) => {
  const shirts = ['#c43a2f', '#2f5d9a', '#f2c230', '#2f9a4a', '#e07a3a', '#7a4ab0'];
  spots.forEach(([x, z], k) => p.push(box(0.45, 1, 0.32, x, y + 0.5, z, shirts[k % shirts.length]), box(0.32, 0.32, 0.32, x, y + 1.2, z, k % 3 ? '#e0b894' : '#8a5a3a')));
};

// ── Boats (on the water) ─────────────────────────────────────────────────────

/** A long river cruiser: a white hull, two decks of windows, a sun deck with an awning. */
function riverCruiser() {
  const p = [box(9, 2.2, 52, 0, 0.6, 0, '#f2f2ee'), bow(9, 2.2, 7, 26, 0.6, '#f2f2ee'), box(9.1, 0.5, 52, 0, -0.3, 0, '#1f3a5a')];
  p.push(box(8, 2.6, 44, 0, 3, -2, '#f7f7f4'), box(8.1, 0.9, 44, 0, 3.1, -2, '#2b3c52')); // the first deck and its band of windows
  p.push(box(7.4, 2.4, 36, 0, 5.5, -4, '#f7f7f4'), box(7.5, 0.8, 36, 0, 5.6, -4, '#2b3c52'));
  p.push(box(5, 2, 4, 0, 7.6, 15, '#f7f7f4'), box(5.1, 0.7, 4.1, 0, 7.8, 15, '#2b3c52')); // the wheelhouse
  p.push(box(6.6, 0.2, 14, 0, 9.2, -10, '#3a7a9a'));
  for (const z of [-16, -4]) for (const x of [-3, 3]) p.push(box(0.15, 2.4, 0.15, x, 8, z, '#d8d8d8'));
  people(p, [[-2, -8], [1.5, -12], [2.5, -2], [-1, 0]], 6.8);
  return merge(p);
}

/** A longtail boat: a narrow painted wooden hull rising to a pointed prow, the long-shafted engine at the stern. */
function longtailBoat() {
  const p = [box(1.8, 0.9, 11, 0, 0.3, 0, '#7a4a2c'), bow(1.8, 0.9, 3, 5.5, 0.3, '#7a4a2c'), box(1.85, 0.25, 11, 0, 0.7, 0, '#2f7a6a')];
  p.push(piece(new CylinderGeometry(0.15, 0.15, 3, 5), '#7a4a2c', new Matrix4().makeTranslation(0, 1.6, 7.6).multiply(new Matrix4().makeRotationX(0.6))));
  p.push(box(0.9, 0.7, 1.1, 0, 1.2, -5.2, '#4a4a4e'), piece(new CylinderGeometry(0.08, 0.08, 5, 4), '#2a2a2e', new Matrix4().makeTranslation(0, 0.5, -7.6).multiply(new Matrix4().makeRotationX(1.35))));
  p.push(box(1.8, 0.1, 4, 0, 2.2, -1, '#d8b04a'), box(0.1, 1.4, 0.1, 0.8, 1.5, 0.8, '#5a3a24'), box(0.1, 1.4, 0.1, -0.8, 1.5, -2.8, '#5a3a24'));
  people(p, [[0, -3.6], [0, 0], [0, 2]], 0.5);
  return merge(p);
}

/** Market boats: a cluster of small wooden boats heaped with fruit and greens, sellers under wide hats. */
function marketBoats() {
  const p = [];
  const goods = ['#f2a330', '#e0c030', '#5a9a3a', '#c43a2f', '#8a4ab0', '#f07a8a'];
  const spots = [[0, 0, 0.1], [-4, 6, -0.3], [4.5, 5, 0.25], [-3.5, -7, 0.2], [4, -6, -0.15], [0.5, 12, 0.05]];
  spots.forEach(([x, z, yaw], k) => {
    const at = (lx, ly, lz) => new Vector3(lx, ly, lz).applyAxisAngle(Y, yaw).add(new Vector3(x, 0, z));
    const b = (w, h, d, lx, ly, lz, c) => { const q = at(lx, ly, lz); return piece(new BoxGeometry(w, h, d), c, turned(q.x, q.y, q.z, yaw)); };
    p.push(b(1.6, 0.7, 6, 0, 0.2, 0, '#6a4428'), b(1.65, 0.15, 6, 0, 0.55, 0, '#8a6038'));
    for (let g = 0; g < 4; g += 1) {
      const q = at(0, 0.85, -1.8 + g * 1.1);
      p.push(piece(new IcosahedronGeometry(0.45, 0), goods[(k + g) % goods.length], S(q.x, q.y, q.z, 1.4, 0.7, 1)));
    }
    const s = at(0, 0, 2.2);
    p.push(box(0.5, 0.8, 0.4, s.x, 0.95, s.z, '#2f5d9a'), box(0.32, 0.32, 0.32, s.x, 1.5, s.z, '#e0b894'));
    p.push(piece(new ConeGeometry(0.75, 0.4, 10), '#e8d08a', M(s.x, 1.85, s.z))); // the wide hat
  });
  return merge(p);
}

/** A paddle steamer: a white wedding-cake of decks, twin tall black stacks, a big red paddle wheel at the stern. */
function paddleSteamer() {
  const p = [box(12, 2, 40, 0, 0.5, 0, '#f4f2ea'), bow(12, 2, 6, 20, 0.5, '#f4f2ea'), box(12.1, 0.4, 40, 0, -0.3, 0, '#9a2a24')];
  for (let k = 0; k < 3; k += 1) {
    const w = 11 - k * 1.6;
    const d = 32 - k * 7;
    p.push(box(w, 2.4, d, 0, 2.7 + k * 2.6, -1 - k, '#fbfaf4'), box(w + 0.6, 0.25, d + 0.6, 0, 4 + k * 2.6, -1 - k, '#fbfaf4'));
    for (let z = -d / 2 + 1.5; z < d / 2; z += 3) for (const x of [-w / 2 - 0.15, w / 2 + 0.15]) p.push(box(0.1, 2.2, 0.1, x, 2.7 + k * 2.6, z - 1 - k, '#e4e0d4'));
  }
  p.push(box(4, 2.2, 3.5, 0, 10.6, 6, '#fbfaf4'), box(4.1, 0.7, 3.6, 0, 10.9, 6, '#2b3c52')); // the pilot house
  for (const x of [-2.2, 2.2]) {
    p.push(piece(new CylinderGeometry(0.7, 0.7, 10, 8), '#1e1e22', M(x, 13, 10)));
    p.push(piece(new CylinderGeometry(1.2, 0.8, 1, 8), '#1e1e22', M(x, 18.4, 10))); // the crowned tops
  }
  // The stern wheel: a drum with red paddles.
  for (let k = 0; k < 10; k += 1) p.push(piece(new BoxGeometry(11, 0.4, 2.6), '#c0322a', turned(0, 2.6, -22.5, 0).multiply(new Matrix4().makeRotationX((k / 10) * Math.PI)).multiply(M(0, 0, 0))));
  p.push(piece(new CylinderGeometry(3, 3, 0.4, 14), '#8a2420', new Matrix4().makeTranslation(5.6, 2.6, -22.5).multiply(new Matrix4().makeRotationZ(Math.PI / 2))));
  p.push(piece(new CylinderGeometry(3, 3, 0.4, 14), '#8a2420', new Matrix4().makeTranslation(-5.6, 2.6, -22.5).multiply(new Matrix4().makeRotationZ(Math.PI / 2))));
  people(p, [[-3, -6], [2.5, 0], [-1, 4], [3, -10]], 4.2);
  return merge(p);
}

/** A river barge: a long low dark hull, heaped cargo holds, a little wheelhouse at the stern. */
function riverBarge() {
  const p = [box(10, 2, 60, 0, 0.4, 0, '#2a3036'), bow(10, 2, 4, 30, 0.4, '#2a3036'), box(10.1, 0.5, 60, 0, 1.3, 0, '#9a2a24')];
  for (let k = 0; k < 4; k += 1) p.push(box(8.6, 1.4, 10, 0, 2, 18 - k * 12, '#5a5048'), piece(new ConeGeometry(4.6, 2, 4), ['#3a3530', '#8a6a3a', '#a89a7a', '#3a3530'][k], turned(0, 3.6, 18 - k * 12, Math.PI / 4, 1, 1, 2.1)));
  p.push(box(6, 3.6, 5, 0, 3.1, -26, '#f2f0ea'), box(6.1, 0.9, 5.1, 0, 4.2, -26, '#2b3c52'), box(1, 2, 1, 2, 5.8, -27, '#1e1e22'));
  return merge(p);
}

/** A river ferry: a wide flat deck with a few cars, a white cabin on a bridge over it, ramps at both ends. */
function riverFerry() {
  const p = [box(12, 1.6, 30, 0, 0.3, 0, '#2f5d9a'), box(12.1, 0.3, 30, 0, 1.2, 0, '#e8e4da')];
  for (const z of [-17, 17]) p.push(box(8, 0.3, 4, 0, 1, z, '#7a7a7a'));
  const cars = ['#c43a2f', '#f2f2ee', '#3a3a40', '#f2c230', '#2f9a4a', '#8aa0b8'];
  for (let k = 0; k < 6; k += 1) {
    const x = k % 2 ? 2.6 : -2.6;
    const z = -9 + Math.floor(k / 2) * 8;
    p.push(box(2, 1, 4, x, 1.9, z, cars[k]), box(1.8, 0.7, 2.2, x, 2.7, z - 0.2, '#9ab8d0'));
  }
  for (const x of [-5.6, 5.6]) p.push(box(0.8, 4, 6, x, 3.2, 0, '#f2f2ee'));
  p.push(box(12, 2.6, 6, 0, 6.4, 0, '#f7f7f4'), box(12.1, 0.8, 6.1, 0, 6.6, 0, '#2b3c52'), box(1, 1.8, 1, 0, 8.6, 0, '#c43a2f'));
  return merge(p);
}

/** A pontoon line of floats: big orange buoys and drums roped together across the water, a few gulls on them. */
function pontoonFloats() {
  const p = [];
  for (let k = -6; k <= 6; k += 1) {
    const big = k % 3 === 0;
    p.push(piece(new CylinderGeometry(big ? 1.6 : 1, big ? 1.6 : 1, big ? 1.8 : 1.2, 10), k % 2 ? '#f07a2a' : '#f2f0ea', M(k * 5, big ? 0.5 : 0.3, 0)));
    if (big) p.push(piece(new ConeGeometry(0.9, 1.6, 8), '#f07a2a', M(k * 5, 2.2, 0)));
  }
  p.push(box(61, 0.2, 0.2, 0, 0.9, 0, '#d8c08a'));
  for (const x of [-12, 3, 18]) p.push(box(0.3, 0.3, 0.6, x, 1.5, 0, '#f4f4f4'));
  return merge(p);
}

// ── On the banks ─────────────────────────────────────────────────────────────

/** A great domed hall on a quay: a long arcaded front of pale stone, rows of slim pinnacles, a high ribbed dome in the middle. */
function domedHall() {
  const STONE = '#efe6d2';
  const SHADE = '#cfc3a8';
  const ROOF = '#9a3a2a';
  const p = [box(110, 16, 26, 0, 8, 0, STONE), box(110.6, 1.2, 26.6, 0, 16.4, 0, SHADE)];
  p.push(roof(110, 7, 26, 0, 16.8, 0, ROOF));
  for (let x = -52; x <= 52; x += 4) p.push(box(1.6, 10, 0.4, x, 8, 13.2, SHADE)); // the arcade's piers
  for (let x = -52; x <= 52; x += 8) p.push(box(0.9, 0.9, 0.9, x, 26, 12.4, STONE), piece(new ConeGeometry(0.8, 6, 4), STONE, M(x, 29.5, 12.4))); // pinnacles
  for (const x of [-30, 30]) p.push(box(14, 24, 28, x, 12, 0, STONE), roof(14, 8, 28, x, 24, 0, ROOF));
  p.push(piece(new CylinderGeometry(11, 12, 14, 16), STONE, M(0, 23, 0)));
  for (let k = 0; k < 16; k += 1) { const a = (k / 16) * Math.PI * 2; p.push(box(0.8, 13, 0.8, Math.cos(a) * 12, 23, Math.sin(a) * 12, SHADE)); }
  p.push(piece(new SphereGeometry(11.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), ROOF, S(0, 30, 0, 1, 1.4, 1)));
  p.push(piece(new ConeGeometry(1.4, 12, 6), STONE, M(0, 52, 0)));
  for (const x of [-46, -14, 14, 46]) p.push(piece(new ConeGeometry(2, 14, 6), STONE, M(x, 28, 10)));
  return merge(p);
}
/** A row of quay lamps along a stone embankment: iron posts with round lanterns (lit at night). */
function quayLamps() {
  const p = [box(64, 1.2, 4, 0, 0.6, 0, '#b8b0a0')];
  for (let x = -30; x <= 30; x += 6) p.push(piece(new CylinderGeometry(0.14, 0.2, 5, 6), '#2a2e30', M(x, 3.6, 1)), box(0.8, 0.3, 0.3, x, 6, 1, '#2a2e30'));
  for (let x = -31; x <= 31; x += 1.6) p.push(box(0.12, 1, 0.12, x, 1.7, 1.8, '#2a2e30'));
  p.push(box(64, 0.12, 0.12, 0, 2.2, 1.8, '#2a2e30'));
  return merge(p);
}
function quayLampsGlow() {
  const p = [];
  for (let x = -30; x <= 30; x += 6) p.push(piece(new SphereGeometry(0.55, 8, 6), '#ffd98a', M(x, 6.6, 1)));
  return merge(p);
}

/** A riverside temple: tiered red and gold roofs with upswept tips, white walls, a slim gilded spire, palms. */
function watRoofs() {
  const p = [box(20, 6, 32, 0, 3, 0, '#f4efe4'), box(22, 1, 34, 0, 0.5, 0, '#d8cdb4')];
  for (let k = 0; k < 3; k += 1) {
    const w = 22 - k * 5;
    const d = 34 - k * 6;
    p.push(roof(w, 4, d, 0, 6 + k * 3.2, 0, k % 2 ? '#2f6a4a' : '#b8322a'));
    for (const z of [d / 2 - 0.5, -d / 2 + 0.5]) p.push(piece(new ConeGeometry(0.35, 2.4, 4), '#e8b830', turned(0, 9 + k * 3.2, z, 0).multiply(new Matrix4().makeRotationX(z > 0 ? 0.5 : -0.5))));
  }
  p.push(piece(new ConeGeometry(2.2, 18, 8), '#e8b830', M(-18, 9, -6)), piece(new CylinderGeometry(3, 3.4, 3, 8), '#f4efe4', M(-18, 1.5, -6)));
  for (const [x, z] of [[16, 10], [18, -8], [-16, 14]]) p.push(piece(new CylinderGeometry(0.3, 0.4, 9, 5), '#7a5a3a', M(x, 4.5, z)), piece(new IcosahedronGeometry(3, 0), '#3f7a3a', S(x, 9.5, z, 1.2, 0.5, 1.2)));
  return merge(p);
}

/**
 * The lip of a great falls: a long ragged edge of dark basalt where the river pours over into a gorge
 * (front +z towards the track), white water along the lip, its spray (haze) rising.
 */
function fallsLip() {
  const p = [];
  for (let k = -9; k <= 9; k += 1) {
    const h = 3 + ((k * 7919) % 5 + 5) % 5 * 0.6;
    p.push(box(9, h, 6, k * 8.5, h / 2 - 1, -4, k % 2 ? '#3a3632' : '#4a4540'));
    p.push(box(8.6, 0.6, 3, k * 8.5, h - 0.6, -0.4, '#f4f8f8')); // white water at the lip
    p.push(box(8, 24, 1.2, k * 8.5, -12, 1.2, '#e8f2f4')); // the curtain falling away
  }
  for (let k = -8; k <= 8; k += 3) p.push(piece(new IcosahedronGeometry(3.5, 0), '#2f5a2a', S(k * 9, 6, -14, 1.1, 1.3, 1.1)));
  return merge(p);
}
function fallsSpray() {
  const p = [];
  for (let k = -4; k <= 4; k += 1) p.push(piece(new SphereGeometry(10, 8, 6), '#ffffff', S(k * 18, 6 + (k % 2) * 4, 8, 1.4, 1.6, 1)));
  return merge(p);
}

/** A hippo pool in the shallows: a few hippos' backs, ears and eyes above the water, a heron on a rock. */
function hippoPool() {
  const p = [];
  for (const [x, z, yaw, s] of [[0, 0, 0.2, 1.2], [5, 3, -0.8, 1], [-4.5, 4, 1.6, 0.9], [2, -5, 2.6, 1.1], [-6, -3, -2.2, 0.7]]) {
    const at = (lx, lz) => new Vector3(lx, 0, lz).applyAxisAngle(Y, yaw).add(new Vector3(x, 0, z));
    const b = at(0, 0);
    const h = at(0, 1.8 * s);
    p.push(piece(new SphereGeometry(1.4 * s, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#6a5a5e', S(b.x, -0.1, b.z, 1, 0.55, 1.6)));
    p.push(piece(new SphereGeometry(0.7 * s, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), '#7a6a6c', S(h.x, -0.05, h.z, 1, 0.6, 1.1)));
    for (const sx of [-0.35, 0.35]) { const e = at(sx * s, 1.5 * s); p.push(box(0.16 * s, 0.25 * s, 0.12 * s, e.x, 0.42 * s, e.z, '#5a4a4e')); }
  }
  p.push(piece(new IcosahedronGeometry(1.4, 0), '#7a7268', S(9, 0.2, -2, 1.2, 0.6, 1)), box(0.3, 1, 0.5, 9, 1.4, -2, '#9aa4ac'), box(0.06, 0.8, 0.06, 9, 0.8, -2, '#d8b040'));
  return merge(p);
}

/** Ship locks: a long concrete lock chamber with tall gates, control towers, and a ship waiting in it (front +z). */
function shipLocks() {
  const CONCRETE = '#c8c4bc';
  const p = [];
  for (const x of [-11, 11]) p.push(box(5, 12, 120, x, 6, 0, CONCRETE), box(5.4, 0.6, 120, x, 12.3, 0, '#9a968e'));
  for (const z of [-58, 0, 58]) {
    p.push(box(17, 14, 2.4, 0, 6, z, '#5a6a72'));
    for (const x of [-11, 11]) p.push(box(6, 9, 6, x, 16.5, z, '#e8e4dc'), box(6.1, 1.4, 6.1, x, 19, z, '#2b3c52'));
  }
  p.push(box(16.4, 1, 112, 0, 2.5, 0, '#3a6a8a')); // the water in the chamber
  p.push(box(8, 3, 36, 0, 4.4, -20, '#3a4048'), box(8.1, 0.6, 36, 0, 5.8, -20, '#c43a2f'), box(6, 4, 6, 0, 7.6, -34, '#f2f0ea'), box(6.1, 1, 6.1, 0, 8.6, -34, '#2b3c52'));
  return merge(p);
}

/** Green karst-like peaks far off: steep rounded towers of rock under green cloaks, mist at their feet. */
function greenPeaks() {
  const p = [];
  for (const [x, z, h, r] of [[0, 0, 70, 18], [-40, -20, 55, 15], [36, -14, 62, 16], [-70, 10, 40, 13], [68, 12, 46, 14], [10, -45, 80, 20]]) {
    p.push(piece(new CylinderGeometry(r * 0.55, r, h, 9), '#5a6a58', M(x, h / 2, z)));
    p.push(piece(new SphereGeometry(r * 0.75, 9, 6), '#3f7a3a', S(x, h, z, 1, 0.8, 1)));
    p.push(piece(new CylinderGeometry(r * 0.95, r * 1.02, h * 0.5, 9), '#4a7a40', M(x, h * 0.62, z)));
  }
  return merge(p);
}

/** Houses along a levee: a grassy bank with a road on top, pastel wooden houses with porches behind it, live oaks. */
function leveeHouses() {
  const p = [box(90, 4, 14, 0, 2, 8, '#6f9a4a'), box(90, 0.2, 5, 0, 4.1, 8, '#7a746a')];
  const walls = ['#f2e8c8', '#cfe4ec', '#f0d0c0', '#e0ecd0', '#f4f0ea'];
  for (let k = 0; k < 7; k += 1) {
    const x = -39 + k * 13;
    p.push(box(9, 5, 8, x, 2.5, -6, walls[k % walls.length]), roof(10, 3, 9, x, 5, -6, '#5a5550'), box(9, 0.3, 3, x, 1.2, -0.8, '#e8e2d4'));
    for (const px of [-4, 0, 4]) p.push(box(0.3, 3.6, 0.3, x + px, 2.4, 0.5, '#f4f4f0'));
  }
  for (const x of [-46, -20, 6, 32, 50]) p.push(piece(new CylinderGeometry(0.6, 0.9, 5, 6), '#5a4436', M(x, 2.5, -16)), piece(new IcosahedronGeometry(6, 0), '#4a6a3a', S(x, 7, -16, 1.4, 0.6, 1.2)));
  return merge(p);
}

// ── Rivers, the second ten ───────────────────────────────────────────────────

/** A river clipper: a fast low catamaran river bus, a long glazed cabin on twin white hulls, a dark roof. */
function riverClipper() {
  const p = [];
  for (const x of [-2.6, 2.6]) {
    p.push(box(2, 1.6, 34, x, 0.3, 0, '#f2f2ee'), box(2.05, 0.4, 34, x, -0.3, 0, '#1f3a5a'));
    p.push(piece(new ConeGeometry(1.4, 4, 4), '#f2f2ee', new Matrix4().makeTranslation(x, 0.3, 19).multiply(new Matrix4().makeRotationX(Math.PI / 2)).multiply(new Matrix4().makeRotationY(Math.PI / 4))));
  }
  p.push(box(7.4, 0.5, 34, 0, 1.3, 0, '#e8e8e4'));
  p.push(box(6.8, 2.2, 26, 0, 2.6, -2, '#f7f7f4'), box(6.9, 1.3, 25, 0, 2.8, -2, '#2b3c52'));
  p.push(box(7, 0.4, 27, 0, 3.9, -2, '#3a4048'), box(3, 1.4, 3.4, 0, 4.6, 9, '#f7f7f4'), box(3.1, 0.6, 3.5, 0, 4.8, 9, '#2b3c52'));
  return merge(p);
}

/** Glass towers on the far bank: a tall tapering shard, a rounded egg-like tower, slab towers, all in blue-green glass. */
function glassTowers() {
  const GLASS = '#7fa4b8';
  const p = [];
  p.push(piece(new ConeGeometry(14, 140, 4), '#9ab8c8', turned(0, 70, 0, Math.PI / 4))); // the shard
  p.push(piece(new SphereGeometry(13, 12, 10), '#7f9aa8', S(-46, 30, 20, 1, 2.4, 1))); // the egg
  for (const [x, z, w, h, d, c] of [[40, 10, 22, 90, 18, GLASS], [64, -20, 18, 70, 18, '#6f94a8'], [-78, -10, 20, 60, 22, '#8aaab8'], [-30, -40, 24, 100, 20, '#6a8a9c'], [20, -50, 16, 120, 16, '#86a8ba']]) {
    p.push(box(w, h, d, x, h / 2, z, c));
    for (let y = 8; y < h; y += 12) p.push(box(w + 0.3, 0.6, d + 0.3, x, y, z, '#c8d4da'));
  }
  return merge(p);
}

/** A weeping willow at an island's tip: a stout leaning trunk, a dome of drooping green curtains to the water, a low stone prow. */
function weepingWillow() {
  const p = [box(16, 2, 10, 0, 0.5, 0, '#bfb196'), bow(16, 2, 8, 5, 0.5, '#bfb196')];
  p.push(piece(new CylinderGeometry(0.9, 1.4, 7, 7), '#5a4a38', turned(0, 4.5, 0, 0).multiply(new Matrix4().makeRotationZ(0.2))));
  p.push(piece(new SphereGeometry(7, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#8aa84a', S(1.2, 7.5, 0, 1.1, 1.1, 1.1)));
  for (let k = 0; k < 14; k += 1) {
    const a = (k / 14) * Math.PI * 2;
    p.push(piece(new ConeGeometry(1.6, 7, 4), k % 2 ? '#9ab85a' : '#7f9a3e', turned(1.2 + Math.cos(a) * 6.2, 5, Math.sin(a) * 6.2, a).multiply(new Matrix4().makeRotationX(Math.PI))));
  }
  p.push(box(1.6, 0.9, 0.6, -4, 1.9, 2, '#2f5a3a'), box(1.6, 0.9, 0.6, 3, 1.9, -2.5, '#2f5a3a')); // two benches
  return merge(p);
}

/** Quay cranes at a river port: two ship-to-shore container cranes on the quay, their booms up, stacks of containers. */
function quayCranes() {
  const RED = '#c8442f';
  const p = [box(90, 1, 34, 0, 0.5, 0, '#8a8a84')];
  for (const x of [-22, 18]) {
    for (const [dx, dz] of [[-5, -7], [5, -7], [-5, 7], [5, 7]]) p.push(box(1.4, 30, 1.4, x + dx, 15, dz, RED));
    p.push(box(12, 1.6, 1.6, x, 30, -7, RED), box(12, 1.6, 1.6, x, 30, 7, RED), box(1.6, 1.6, 16, x, 18, 0, RED));
    // (The boom reaches away from the track, +z being towards it: out over the water when the cranes stand between them.)
    p.push(box(3, 2.4, 60, x, 32, -12, RED), box(4, 3, 4, x, 29.5, -18, '#f2efe6')); // the boom out over the water, the cab
    p.push(box(1.2, 14, 1.2, x, 40, 6, RED), box(4, 4, 6, x, 33, 16, '#5a5e66'));
  }
  const cols = ['#2f7fc4', '#f2c230', '#4aa35a', '#d8442f', '#e8e4dc', '#7a4ab0'];
  for (let k = 0; k < 24; k += 1) p.push(box(12, 2.6, 2.6, -36 + (k % 6) * 13.5, 2.3 + Math.floor(k / 12) * 2.6, 9 + (Math.floor(k / 6) % 2) * 3, cols[k % cols.length]));
  return merge(p);
}

/** A stand of river red gums in the flood: pale mottled trunks rising from the water, twisting limbs, grey-green crowns. */
function redGums() {
  const p = [];
  for (const [x, z, h, r] of [[0, 0, 14, 1.3], [-9, 6, 12, 1.1], [8, 7, 15, 1.4], [-6, -8, 11, 1], [12, -6, 13, 1.2], [-15, -2, 10, 0.9]]) {
    p.push(piece(new CylinderGeometry(r * 0.6, r, h, 7), '#d8d0c0', M(x, h / 2 - 1, z)));
    p.push(piece(new CylinderGeometry(r * 0.62, r * 0.85, h * 0.3, 7), '#a89a86', M(x, h * 0.25, z))); // the darker water-stained foot
    for (const a of [0.6, 2.7, 4.5]) p.push(piece(new CylinderGeometry(0.2, r * 0.4, 6, 5), '#d0c8b8', turned(x + Math.cos(a) * 2, h - 1, z + Math.sin(a) * 2, a).multiply(new Matrix4().makeRotationZ(0.7))));
    p.push(piece(new IcosahedronGeometry(4.2, 0), '#7a8a5a', S(x, h + 2.5, z, 1.4, 0.6, 1.4)));
  }
  return merge(p);
}

/** Pelicans on the water: big white birds with black wingtips and long pale bills, a few gliding in a line. */
function pelicans() {
  const p = [];
  for (const [x, z, yaw] of [[0, 0, 0.2], [3.4, 2, 0.3], [6.8, 4.2, 0.1], [-4, 3, 2.6], [-2, -4, 1.4]]) {
    const at = (lx, ly, lz) => new Vector3(lx, ly, lz).applyAxisAngle(Y, yaw).add(new Vector3(x, 0, z));
    const b = at(0, 0.3, 0);
    p.push(piece(new SphereGeometry(0.75, 8, 5), '#f4f4f0', S(b.x, b.y, b.z, 0.8, 0.6, 1.4)));
    const n = at(0, 1.1, 0.8);
    p.push(piece(new SphereGeometry(0.28, 6, 4), '#f4f4f0', M(n.x, n.y, n.z)));
    const bill = at(0, 1, 1.5);
    p.push(piece(new ConeGeometry(0.16, 1.4, 4), '#f2c88a', turned(bill.x, bill.y, bill.z, yaw).multiply(new Matrix4().makeRotationX(Math.PI / 2))));
    const t = at(0, 0.5, -0.9);
    p.push(box(0.9, 0.2, 0.5, t.x, t.y, t.z, '#2a2a2e'));
  }
  return merge(p);
}

/** A lock and weir across a river: a concrete lock chamber with its gates and a keeper's cottage, the weir's row of piers and trestles, white water below. */
function lockWeir() {
  const CONC = '#cfc8b8';
  const p = [];
  for (const x of [-7, 7]) p.push(box(3, 7, 70, x, 2, 0, CONC));
  for (const z of [-34, 34]) p.push(box(11, 6, 1.6, 0, 2, z, '#5a4a3a'), box(0.4, 0.4, 8, 4, 5.6, z + Math.sign(z) * 3, '#f2f0ea'));
  p.push(box(11, 0.3, 66, 0, 3.6, 0, '#4f7a8a'));
  p.push(box(9, 5, 7, -14, 3, 10, '#f2ece0'), roof(10, 3, 8, -14, 5.5, 10, '#b84a3a'), box(10, 0.3, 8, -14, 1, 10, '#a89a86')); // the keeper's cottage
  for (let k = 0; k < 12; k += 1) {
    const x = 12 + k * 6;
    p.push(box(1.6, 7, 4, x, 2, 0, CONC), box(6, 0.8, 1.2, x + 3, 5.8, -1.2, '#7a5a3a'));
    p.push(box(4.4, 1.6, 0.4, x + 3, 1.6, 0.6, '#5a4a3a'));
  }
  p.push(box(74, 0.5, 6, 45, 0.3, 5, '#eef4f4')); // white water under the weir
  return merge(p);
}

/** Golden limestone cliffs along the river: a long wall of banded ochre rock, its top fringed with scrub. */
function limestoneCliffs() {
  const p = [];
  for (let k = -6; k <= 6; k += 1) {
    const h = 24 + ((k * 7919) % 7 + 7) % 7 * 2;
    for (let b = 0; b < 3; b += 1) p.push(box(15, h / 3, 10 - b * 1.5, k * 14, (h / 3) * (b + 0.5), -b * 1.2, ['#d8a860', '#c8944a', '#e0b874'][(k + b + 9) % 3]));
    p.push(piece(new IcosahedronGeometry(3, 0), '#6f7a4a', S(k * 14 + 3, h + 1, -4, 1.4, 0.5, 1.2)));
  }
  return merge(p);
}

/** A plain of old brick temples far off (distant architecture only): many red-brown stupas and terraced shrines on a dusty green plain. */
function brickTemples() {
  const p = [];
  const brick = ['#a85a3a', '#b8683f', '#9a4f34', '#c07850'];
  for (let k = 0; k < 26; k += 1) {
    const x = ((k * 37) % 26 - 13) * 18;
    const z = ((k * 53) % 9 - 4) * 26;
    const s = 0.6 + ((k * 13) % 7) / 6;
    const c = brick[k % brick.length];
    if (k % 3) {
      // A stupa: stepped square terraces, a bell dome and a slim spire.
      for (let t = 0; t < 3; t += 1) p.push(box((12 - t * 3) * s, 2.4 * s, (12 - t * 3) * s, x, (1.2 + t * 2.4) * s, z, c));
      p.push(piece(new SphereGeometry(3.2 * s, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), c, M(x, 7.2 * s, z)));
      p.push(piece(new ConeGeometry(1.2 * s, 7 * s, 6), '#8a4a30', M(x, 13 * s, z)));
    } else {
      // A terraced shrine: a square hall on a plinth, a tiered roof rising to a curved tower.
      p.push(box(16 * s, 7 * s, 16 * s, x, 3.5 * s, z, c), box(12 * s, 3 * s, 12 * s, x, 8.5 * s, z, c));
      p.push(piece(new CylinderGeometry(1.4 * s, 4.2 * s, 10 * s, 6), c, M(x, 15 * s, z)), piece(new ConeGeometry(1.2 * s, 4 * s, 6), '#8a4a30', M(x, 22 * s, z)));
    }
  }
  return merge(p);
}

/**
 * Hot-air balloons drifting high over a section (a section's `overhead`: 'hot-air-balloons'): envelopes in plain
 * stripes of colour (no lettering or logos), baskets under them, spread over about 180 m, the lowest 16 m up.
 * Origin at the group's middle, on the track's level; one mesh (it drifts as a whole: kit.js).
 */
export function hotAirBalloons(lite = false) {
  const p = [];
  const sets = [['#d8442f', '#f2c230'], ['#2f6fa8', '#f2efe6'], ['#4aa35a', '#f2c230'], ['#e07a3a', '#7a3fd0'], ['#c8302a', '#f2efe6'], ['#f2c230', '#2f7fc4']];
  const spots = [[0, 18, 0], [-90, 26, 80], [80, 22, -70], [-50, 32, -140], [120, 28, 110], [-140, 20, -40]].slice(0, lite ? 4 : 6);
  spots.forEach(([x, y, z], k) => {
    const [a, b] = sets[k % sets.length];
    const bands = lite ? 4 : 6;
    for (let q = 0; q < bands; q += 1) {
      p.push(piece(new SphereGeometry(7, lite ? 8 : 12, 8, (q / bands) * Math.PI * 2, (Math.PI * 2) / bands, 0, Math.PI * 0.62), q % 2 ? a : b, S(x, y + 2, z, 1, 1.15, 1)));
    }
    p.push(piece(new CylinderGeometry(4.9, 1.6, 6, lite ? 8 : 12, 1, true), a, M(x, y - 6.4, z)));
    p.push(box(1.6, 1.3, 1.6, x, y - 12, z, '#8a6440'));
    for (const [dx, dz] of [[-0.7, -0.7], [0.7, 0.7]]) p.push(box(0.08, 2.6, 0.08, x + dx, y - 10.4, z + dz, '#3a2e24'));
  });
  return merge(p);
}

export const RIVER_LANDMARKS = {
  'river-clipper': { build: riverClipper, radius: 18 },
  'glass-towers': { build: glassTowers, radius: 90 },
  'weeping-willow': { build: weepingWillow, radius: 12 },
  'quay-cranes': { build: quayCranes, radius: 48 },
  'red-gums': { build: redGums, radius: 20 },
  pelicans: { build: pelicans, radius: 8 },
  'lock-weir': { build: lockWeir, radius: 60 },
  'limestone-cliffs': { build: limestoneCliffs, radius: 95 },
  'brick-temples': { build: brickTemples, radius: 240 },
  'river-cruiser': { build: riverCruiser, radius: 28 },
  'longtail-boat': { build: longtailBoat, radius: 8 },
  'market-boats': { build: marketBoats, radius: 12 },
  'paddle-steamer': { build: paddleSteamer, radius: 26 },
  'river-barge': { build: riverBarge, radius: 32 },
  'river-ferry': { build: riverFerry, radius: 18 },
  'pontoon-floats': { build: pontoonFloats, radius: 32 },
  'domed-hall': { build: domedHall, radius: 60 },
  'quay-lamps': { build: quayLamps, glow: quayLampsGlow, radius: 33 },
  'wat-roofs': { build: watRoofs, radius: 24 },
  'falls-lip': { build: fallsLip, haze: fallsSpray, radius: 80 },
  'hippo-pool': { build: hippoPool, radius: 12 },
  'ship-locks': { build: shipLocks, radius: 62 },
  'green-peaks': { build: greenPeaks, radius: 90 },
  'levee-houses': { build: leveeHouses, radius: 48 },
};
