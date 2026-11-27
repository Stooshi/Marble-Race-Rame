/**
 * Landmarks for Pudong (Pudong Marble Grand Prix, 3 Nov 2026): one builder each, origin on the ground (the river's
 * lights and boats on the water: a track's `sea` floats them at its level), front facing +z, cartoon low-poly from a
 * few simple shapes, merged into the still scenery. Our own modern towers at dusk, inspired by the area and copying
 * none of its buildings: plain glass slabs and prisms with slanted, stepped, ringed and bladed crowns; their windows,
 * crown bands and red aviation lights lit (`glow`: drawn unlit, one draw call for them all), the city's lights
 * reflected in the river as long rippling streaks (`haze`: drawn unlit and faint). River cruisers with lit decks,
 * a waterfront promenade, and the pit lane's garages on the splitter's divider. No names, flags or logos on anything.
 */
import { Color, CylinderGeometry, Matrix4, PlaneGeometry, Quaternion, Vector3 } from 'three';
import { box, merge, piece, seededRandom } from './parts';

const Y = new Vector3(0, 1, 0);
const M = (x, y, z) => new Matrix4().makeTranslation(x, y, z);
const turned = (x, y, z, yaw, sx = 1, sy = 1, sz = 1) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(Y, yaw), new Vector3(sx, sy, sz));

const GLASS = ['#3a4f72', '#2f4566', '#46608a', '#384a6e', '#52628a', '#2c3c5c'];
const WARM = ['#ffe2a6', '#ffd38a', '#fff1cf'];
const COOL = ['#bfe6ff', '#9fd4ff', '#e4f4ff'];
const CROWN = ['#4fd8ff', '#ff5fc0', '#ffcf4f', '#7cff9a', '#b48cff'];
const RED = '#ff3a2a';
const WATER_DUSK = '#1c2a52';

/** A lit pane: a flat rectangle `w` × `h` facing `yaw` (0: +z), at x, y, z. */
const pane = (w, h, x, y, z, yaw, colour) => piece(new PlaneGeometry(w, h), colour, turned(x, y, z, yaw));

/**
 * Our skyline's towers, by shape: [x, z, width, depth, height, crown, glass], crown one of 'slant' (a sloping top),
 * 'step' (stepped setbacks), 'ring' (a round tower with a lit ring and a spire), 'blade' (a fin standing proud of the
 * roof), 'mast' (a flat roof and a slim mast), 'pair' (two slabs side by side, a lit bridge between them at the top).
 */
const SKYLINE = [
  [-62, -6, 18, 16, 92, 'step', 0], [-40, 6, 14, 14, 118, 'slant', 1], [-22, -14, 20, 18, 150, 'blade', 2],
  [-2, 4, 16, 16, 176, 'ring', 3], [20, -10, 18, 14, 136, 'slant', 4], [40, 8, 22, 12, 104, 'pair', 5],
  [60, -8, 14, 14, 122, 'mast', 0], [76, 10, 16, 14, 84, 'step', 2], [-80, 12, 16, 12, 70, 'mast', 4],
  [-50, -34, 16, 14, 128, 'ring', 1], [8, -38, 18, 16, 158, 'step', 5], [34, -32, 14, 14, 112, 'blade', 3],
  [-26, 22, 12, 12, 64, 'slant', 2], [56, 26, 14, 12, 58, 'step', 1],
];

/** One tower's body (into `p`) and its lights (into `g`). k: its index, for the window pattern. */
function tower(p, g, [x, z, w, d, h, crown, c], k, { dense = 1, footing = 40 } = {}) {
  const glass = GLASS[c % GLASS.length];
  const r = seededRandom(31 + k * 7);
  const tint = k % 3 === 0 ? COOL : WARM;
  let top = h;
  // (A foundation going down into the ground: on a slope no tower's foot shows in the air.)
  p.push(box(w * 0.98, footing, d * 0.98, x, -footing / 2, z, glass));
  if (crown === 'ring') {
    const rad = w / 2;
    p.push(piece(new CylinderGeometry(rad * 0.82, rad, h, 12), glass, M(x, h / 2, z)));
    p.push(piece(new CylinderGeometry(0.5, 0.5, 26, 5), '#c9d2de', M(x, h + 13, z)));
    g.push(piece(new CylinderGeometry(rad * 0.86, rad * 0.86, 2.2, 12, 1, true), CROWN[k % CROWN.length], M(x, h - 4, z)));
    g.push(piece(new CylinderGeometry(0.7, 0.7, 1.2, 5), RED, M(x, h + 26.5, z)));
    // (Lit floors round the drum: a band of panes on the front half.)
    for (let y = 8; y < h - 8; y += 7 / dense) {
      if (r() < 0.22) continue;
      for (let a = -2; a <= 2; a += 1) {
        const ang = a * 0.5;
        const rr = rad * (1 - 0.18 * (y / h)) + 0.08;
        g.push(pane(rad * 0.42, 1.2, x + Math.sin(ang) * rr, y, z + Math.cos(ang) * rr, ang, tint[(k + a + 9) % 3]));
      }
    }
    return;
  }
  if (crown === 'pair') {
    for (const s of [-1, 1]) p.push(box(w * 0.42, h - s * 6, d, x + s * w * 0.29, (h - s * 6) / 2, z, glass));
    p.push(box(w * 0.3, 4, d * 0.7, x, h - 14, z, '#8a96aa'));
    g.push(box(w * 0.3, 1, d * 0.72, x, h - 12.2, z, CROWN[k % CROWN.length]));
    top = h - 6;
  } else if (crown === 'step') {
    p.push(box(w, h * 0.62, d, x, h * 0.31, z, glass), box(w * 0.78, h * 0.26, d * 0.78, x, h * 0.75, z, glass), box(w * 0.52, h * 0.12, d * 0.52, x, h * 0.94, z, glass));
    g.push(box(w * 0.8, 0.8, d * 0.8, x, h * 0.62 + 0.5, z, CROWN[k % CROWN.length]), box(w * 0.54, 0.8, d * 0.54, x, h * 0.88 + 0.5, z, CROWN[(k + 2) % CROWN.length]));
  } else if (crown === 'slant') {
    p.push(box(w, h * 0.9, d, x, h * 0.45, z, glass));
    const roof = box(w * 1.02, w * 0.9, d * 1.02, 0, 0, 0, glass);
    roof.applyMatrix4(new Matrix4().makeRotationX(0.62).premultiply(M(x, h * 0.9, z - d * 0.12)));
    p.push(roof);
    g.push(box(w * 1.04, 0.7, 0.3, x, h * 0.9 + 0.3, z + d / 2 + 0.2, CROWN[k % CROWN.length]));
  } else if (crown === 'blade') {
    p.push(box(w, h, d, x, h / 2, z, glass), box(w * 0.18, h * 0.22, d * 1.1, x + w * 0.3, h + h * 0.11, z, '#9aa8bc'));
    g.push(box(w * 0.2, h * 0.2, 0.3, x + w * 0.3, h + h * 0.11, z + d * 0.56, CROWN[k % CROWN.length]));
    top = h * 1.22;
  } else {
    p.push(box(w, h, d, x, h / 2, z, glass), box(w * 0.6, 3, d * 0.6, x, h + 1.5, z, '#5a667a'));
    p.push(piece(new CylinderGeometry(0.35, 0.35, 18, 4), '#c9d2de', M(x, h + 12, z)));
    top = h + 21;
    g.push(box(w * 1.01, 1, d * 1.01, x, h - 2, z, CROWN[k % CROWN.length]));
  }
  g.push(box(1, 1, 1, x, top + 0.6, z, RED));
  // Lit floors: strips across the front and the side facing out, some floors dark, warm or cool by tower.
  const bodyH = crown === 'step' ? h * 0.6 : crown === 'slant' ? h * 0.86 : crown === 'pair' ? h - 16 : h - 3;
  for (let y = 6; y < bodyH; y += 5 / dense) {
    if (r() < 0.25) continue;
    const col = tint[Math.floor(r() * 3)];
    const span = 0.55 + r() * 0.35;
    g.push(pane(w * span, 1.3, x + (r() - 0.5) * w * (1 - span), y, z + d / 2 + 0.06, 0, col));
    if (dense >= 1 && r() < 0.7) g.push(pane(d * span, 1.3, x + (x >= 0 ? 1 : -1) * (w / 2 + 0.06), y, z + (r() - 0.5) * d * (1 - span), x >= 0 ? Math.PI / 2 : -Math.PI / 2, col));
  }
}

const skylineParts = (list, dense = 1) => {
  const p = [];
  const g = [];
  list.forEach((t, k) => tower(p, g, t, k, { dense, footing: dense < 1 ? 12 : 40 }));
  return { p, g };
};

/**
 * The city's lights in the river in front of a row of towers (`front`: where the water starts, +z towards the
 * track): under each tower a long streak broken by the ripples, its windows' and crown's colours, as long as the
 * tower is tall, lying on the water (drawn faint, `haze`).
 */
function reflections(list, front, waterY = 0, { dim = false, every = 1 } = {}) {
  const p = [];
  list.forEach(([x, , w, , h, , c], k) => {
    if (k % every) return;
    const r = seededRandom(97 + k * 13);
    const tint = k % 3 === 0 ? COOL : WARM;
    let z = front + 1 + r() * 2;
    const end = front + Math.min(150, h * 0.85);
    while (z < end) {
      const len = 2.5 + r() * 5;
      const fade = 1 - (z - front) / (end - front);
      const width = w * (0.25 + 0.35 * fade) * (0.7 + r() * 0.6);
      const pick = r() < 0.18 ? CROWN[k % CROWN.length] : tint[Math.floor(r() * 3)];
      // (On phones the reflections are drawn with the lit parts, solid: their colours mixed into the dark water's instead of faint.)
      const col = dim ? new Color(WATER_DUSK).lerp(new Color(pick), 0.42) : pick;
      p.push(piece(new PlaneGeometry(width, len), col, new Matrix4().makeRotationX(-Math.PI / 2).premultiply(M(x + (r() - 0.5) * w * 0.3, waterY, z + len / 2))));
      z += len + 0.6 + r() * 2.4 * (1 - fade + 0.3);
    }
  });
  return merge(p);
}

/** The skyline: fourteen of our own towers, the tallest in the middle, standing behind the loop as its camera sees it. */
const pudongSkyline = () => merge(skylineParts(SKYLINE).p);
const pudongSkylineGlow = () => merge(skylineParts(SKYLINE).g);

/**
 * The far bank across the river: the same kind of towers in another order and other heights, on a stone river
 * bank (its front at z = 46, the river beyond it, a row of promenade lamps along it), their lights in the water in
 * front of it.
 */
const FAR = SKYLINE.map(([x, z, w, d, h, crown, c], k) => [-x * 0.9, z, w, d, Math.round(h * (0.7 + ((k * 5) % 7) * 0.08)), crown, (c + 2) % 6]);
const FAR_BANK = 46;
const farBank = () => merge([...skylineParts(FAR).p, box(210, 9, 110, 0, -3.4, -9, '#4a4b52'), box(210, 1.2, 1.2, 0, 1.7, FAR_BANK - 0.5, '#8a8a90')]);
const farBankGlow = (dense = 1) => {
  const g = skylineParts(FAR, dense).g;
  for (let x = -100; x <= 100; x += 8) g.push(box(0.7, 0.5, 0.7, x, 2.6, FAR_BANK - 1.5, '#fff1cf'));
  return merge(g);
};
const farBankHaze = () => reflections(FAR, FAR_BANK, 0.65);


/** A smaller cluster of towers (the start's and the finish straight's backdrop). */
const CLUSTER = [[-26, -4, 14, 12, 74, 'slant', 2], [-6, -14, 16, 14, 96, 'step', 0], [14, -2, 12, 12, 62, 'mast', 4], [32, -12, 16, 12, 84, 'blade', 1], [0, 14, 10, 10, 40, 'pair', 3]];
const pudongTowers = () => merge(skylineParts(CLUSTER).p);
const pudongTowersGlow = () => merge(skylineParts(CLUSTER).g);

/**
 * The river's lights: the towers' and the far bank's lights reflected in the water as long streaks broken by the
 * ripples, in the towers' colours, lying on the surface (floating at the sea's level; drawn faint, `haze`).
 */
const RIVER_TOWERS = Array.from({ length: 16 }, (_, k) => [-90 + k * 12, 0, 6 + (k % 4) * 3, 0, 60 + ((k * 37) % 5) * 22, '', k]);
const riverLights = () => reflections(RIVER_TOWERS, -40, 0.65);
const riverLightsLite = () => reflections(RIVER_TOWERS, -40, 0.65, { dim: true, every: 2 });
// (Nothing solid: the reflections are all there is, a near-invisible float under them.)
const riverLightsBody = () => box(1, 0.1, 1, 0, 0.4, 0, '#1a2440');

/** A river cruiser: a long low hull, two glazed decks, a lit band along each deck (floating). */
function cruiser(p, g, x, z, len, yaw, k) {
  const q = turned(x, 0, z, yaw);
  const b = [box(6, 2, len, 0, 0.9, 0, '#e9ecf2'), box(6.05, 0.5, len, 0, 0.1, 0, '#1c2638'), box(5, 2, len * 0.75, 0, 2.9, -len * 0.04, '#d8dde6'), box(4, 1.6, len * 0.5, 0, 4.7, -len * 0.08, '#d8dde6')];
  const l = [box(5.1, 0.8, len * 0.74, 0, 3, -len * 0.04, k % 2 ? '#ffd89a' : '#9fe0ff'), box(4.1, 0.7, len * 0.49, 0, 4.8, -len * 0.08, k % 2 ? '#ff8fd0' : '#ffe9b8')];
  const bm = merge(b);
  bm.applyMatrix4(q);
  p.push(bm);
  const lm = merge(l);
  lm.applyMatrix4(q);
  g.push(lm);
}
const CRUISERS = [[0, 0, 34, 0.3], [-46, 22, 26, -0.2], [44, -18, 28, 0.5]];
const cruiserParts = () => {
  const p = [];
  const g = [];
  CRUISERS.forEach(([x, z, len, yaw], k) => cruiser(p, g, x, z, len, yaw, k));
  return { p, g };
};
const riverCruisers = () => merge(cruiserParts().p);
const riverCruisersGlow = () => merge(cruiserParts().g);

/**
 * The waterfront at the finish: a stone promenade along the river with a low glass pavilion, a row of lamp posts,
 * and a cluster of towers behind it.
 */
function waterfrontParts(dense = 1) {
  const p = [box(90, 1.2, 10, 0, 0.6, 6, '#a9a6a0'), box(90, 1.4, 0.6, 0, 1.3, 11, '#7e7c78'), box(30, 7, 12, -20, 3.5, -6, '#6f86a8'), box(31, 0.8, 13, -20, 7.4, -6, '#c9d2de')];
  const g = [box(29, 1.2, 0.2, -20, 4, 0.12, '#ffe2a6')];
  for (let x = -42; x <= 42; x += 7) {
    p.push(piece(new CylinderGeometry(0.15, 0.2, 5, 5), '#3a3e48', M(x, 3.5, 10)));
    g.push(box(0.8, 0.5, 0.8, x, 6.2, 10, '#fff1cf'));
  }
  const t = skylineParts(CLUSTER.map(([x, z, w, d, h, c, gl]) => [x + 6, z - 34, w, d, h, c, gl]), dense);
  return { p: [...p, ...t.p], g: [...g, ...t.g] };
}
const pudongWaterfront = () => merge(waterfrontParts().p);
const pudongWaterfrontGlow = () => merge(waterfrontParts().g);

/**
 * The pit lane's garages on the splitter's divider: a long low garage block along the track (local x along it) with
 * a row of lit bays, a pit wall and its gantry. Plain numbers of nothing: no names or logos.
 */
function pitParts() {
  const p = [box(26, 3.2, 3, 0, 1.6, 0, '#d6dbe2'), box(27, 0.5, 3.6, 0, 3.45, 0, '#3a4252'), box(26, 0.9, 0.3, 0, 0.45, 1.7, '#e8e8e8')];
  const g = [];
  for (let k = 0; k < 6; k += 1) {
    const x = -10.8 + k * 4.3;
    p.push(box(3.4, 2.2, 0.1, x, 1.3, 1.52, '#1e2430'));
    g.push(box(3.2, 0.4, 0.1, x, 2.7, 1.56, k % 2 ? '#ffe2a6' : '#bfe6ff'));
  }
  return { p, g };
}
const pitGarages = () => merge(pitParts().p);
const pitGaragesGlow = () => merge(pitParts().g);

// (`lite`: on phones, a third of the lit floors, shorter footings, every other tower's reflection drawn solid with the lit
// parts instead of faint: the same look in fewer triangles and draw calls.)
export const PUDONG_LANDMARKS = {
  'pudong-skyline': { build: pudongSkyline, glow: pudongSkylineGlow, lite: { build: () => merge(skylineParts(SKYLINE, 0.34).p), glow: () => merge(skylineParts(SKYLINE, 0.34).g) }, radius: 90 },
  'far-bank-skyline': {
    build: farBank, glow: () => farBankGlow(), haze: farBankHaze, radius: 100,
    lite: { build: () => merge([...skylineParts(FAR, 0.34).p, box(210, 9, 110, 0, -3.4, -9, '#4a4b52')]), glow: () => merge([farBankGlow(0.34), reflections(FAR, FAR_BANK, 0.65, { dim: true, every: 2 })]), haze: null },
  },
  'pudong-towers': { build: pudongTowers, glow: pudongTowersGlow, lite: { build: () => merge(skylineParts(CLUSTER, 0.34).p), glow: () => merge(skylineParts(CLUSTER, 0.34).g) }, radius: 34 },
  'pudong-waterfront': { build: pudongWaterfront, glow: pudongWaterfrontGlow, lite: { glow: () => merge(waterfrontParts(0.34).g) }, radius: 46 },
  'river-lights': { build: riverLightsBody, haze: riverLights, lite: { glow: riverLightsLite, haze: null }, radius: 2 },
  'river-cruisers': { build: riverCruisers, glow: riverCruisersGlow, radius: 40 },
  'pit-garages': { build: pitGarages, glow: pitGaragesGlow, radius: 13, fit: 1.9 },
};
