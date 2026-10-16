/**
 * Canyons (kit tracks of the canyon family): the track runs along the floor of a
 * deep canyon beside its river, between stepped rock walls in bands of colour,
 * and in places climbs out over the rock on its supports (a coaster's) before
 * dropping back in. Looks only: the race is exactly the ice channel's.
 *
 * The canyon is shaped into the land itself (kitGround.js asks `heightAt`), so
 * it follows every bend: within `floor` metres of the track (wider on the river's
 * side) the land is the canyon floor, just under the track's rim; then the walls
 * climb in steps (a cliff, a ledge, the next cliff) to the rim, `depth` metres up;
 * beyond lies the plateau. Inside a tight bend the walls meet in a butte. The
 * terrain is drawn finer along the walls (`detail`), coloured in the palette's
 * bands (`colourAt`), and the river is a ribbon of water drawn with the banks (`riverTriangles`).
 *
 * Where the walls stand (a share 0–1 per sample, `walls`):
 *   - they rise from 40 to 120 m after the gate and fall away before the finish
 *     (the lift hill and the station stand in the open);
 *   - a section's `walls` (0–1) lowers them there (a basin, a gap);
 *   - where another stretch of track passes close at another height (a spiral's
 *     turns, a fold of the track) they give way to the ordinary hillside;
 *   - where the track flies high on its supports they are lower, so it climbs
 *     out over the rock and drops back in.
 * The land near every stretch, walls or not, never rises over it (each stretch's
 * floor caps it), so nothing ever stands in the track.
 */
import { Color, ConeGeometry, CylinderGeometry, IcosahedronGeometry, Matrix4, Quaternion, Vector3 } from 'three';
import { merge, piece, smoothstep } from './parts';

/**
 * The canyons' colours: `strata` the wall's bands from the floor up (the cliffs),
 * `ledge` the scree on the ledges between them, `floor` the canyon floor, `bar`
 * the sand and shingle by the river, `top` and `top2` the plateau, `water` and
 * `foam` the river; `bands` the bands' thicknesses (shares of the depth);
 * `snow`: snow on the plateau above that share of the depth.
 */
export const CANYON_PALETTES = {
  // Layered red, orange and cream sandstone, a juniper-dotted rim, a green river.
  'grand-canyon': {
    strata: ['#8e3f26', '#b9582f', '#d98a52', '#a9492b', '#e6c08c', '#c9774a'], ledge: '#c98a5c', floor: '#b07a52', bar: '#d9b88a',
    top: '#c9a26e', top2: '#b08a58', water: '#3f8f7e', foam: '#e9f2ee', bands: [1.1, 0.8, 1.2, 0.7, 1.0, 0.9],
    bank: '#c99a6a', dressing: [['juniper', 0.45], ['rock', 0.35, '#b8693e'], ['bush', 0.2, '#8f8f5f']],
  },
  // Grey Himalayan rock, dark slate bands, snow on the tops, a milky blue-green river.
  himalaya: {
    strata: ['#5d5a57', '#7a7671', '#4a4845', '#8b8680', '#666260', '#9a948c'], ledge: '#8f897f', floor: '#8a8170', bar: '#b8b0a0',
    top: '#8a8f72', top2: '#6f7f5a', water: '#6aa7b0', foam: '#f2f7f8', bands: [1, 1.2, 0.8, 1.1, 0.9, 1], snow: 1.3,
    bank: '#a39a88', dressing: [['pine', 0.45], ['rock', 0.55, '#7a7671']],
  },
  // Andean brown rock with green terraced ledges, a brown-green river.
  andes: {
    strata: ['#6e5236', '#8a6a46', '#5f4630', '#9a7a52', '#7a5c3c'], ledge: '#6f9a45', floor: '#8f7a55', bar: '#b9a27a',
    top: '#a59a62', top2: '#7f9a54', water: '#5f8a6a', foam: '#eef2ea', bands: [1, 1, 1, 1, 1],
    bank: '#a8946a', dressing: [['bush', 0.45, '#c9b46a'], ['rock', 0.4, '#7a5c3c'], ['juniper', 0.15, '#4f7a3a']],
  },
  // Pale grey limestone with forest on every ledge and the rim, a turquoise river.
  limestone: {
    strata: ['#b9b6ae', '#a6a39b', '#cfccc4', '#9a978f', '#c2bfb6'], ledge: '#4f7f3a', floor: '#8fa070', bar: '#dcd6c4',
    top: '#4a7a36', top2: '#5f8f44', water: '#2fb3b0', foam: '#e8fbfa', bands: [1.2, 0.9, 1, 1.1, 0.8],
    bank: '#9fae80', dressing: [['pine', 0.7], ['rock', 0.3, '#b9b6ae']],
  },
  // Ochre and rust rock, green pine ledges, a copper-green river.
  copper: {
    strata: ['#a2602f', '#c98a3f', '#8a4f2a', '#b8763a', '#d4a057'], ledge: '#5f7f3a', floor: '#a08050', bar: '#d1b47a',
    top: '#6f8a3e', top2: '#9a8a4a', water: '#4f8f6a', foam: '#eef4ea', bands: [1, 0.9, 1.1, 1, 1],
    bank: '#b8955f', dressing: [['pine', 0.6], ['rock', 0.25, '#a2602f'], ['bush', 0.15, '#7f8a4a']],
  },
  // Dark basalt columns, dry grass ledges, a white-water river.
  basalt: {
    strata: ['#3a3634', '#4a4542', '#2f2c2b', '#55504c', '#423d3a'], ledge: '#a39a62', floor: '#7f7a5a', bar: '#a9a28a',
    top: '#b0a46a', top2: '#8a8a52', water: '#3f7a8a', foam: '#f4f8f8', bands: [1.1, 1, 0.9, 1.2, 0.9],
    bank: '#968f6a', dressing: [['bush', 0.5, '#b8a86a'], ['rock', 0.3, '#3a3634'], ['pine', 0.2]],
  },
  // The Karakoram: dusty brown and grey rock, khaki slopes, a silty grey-green river.
  karakoram: {
    strata: ['#6e6254', '#8a7a66', '#5a5048', '#9a8a74', '#77695a'], ledge: '#a8987a', floor: '#9a8a6e', bar: '#c4b494',
    top: '#b0a07e', top2: '#9a8c6a', water: '#7a9488', foam: '#eef2ee', bands: [1, 1.1, 0.9, 1.2, 0.8],
    bank: '#a8987a', dressing: [['rock', 0.6, '#6e6254'], ['bush', 0.25, '#8a8a5a'], ['juniper', 0.15, '#4f6a3a']],
  },
  // A slot canyon: wavy bands of orange, salmon and deep red sandstone, sand on the floor, no river.
  slot: {
    strata: ['#b8532c', '#d9783c', '#e89a5c', '#c4603a', '#f0b27a', '#a8452a', '#de8a4e'], ledge: '#d98a54', floor: '#d9a066', bar: '#e8bf88',
    top: '#d9a46a', top2: '#c48a52', water: '#5a8f8a', foam: '#eef4f2', bands: [0.8, 0.6, 0.9, 0.5, 0.8, 0.6, 0.7],
    bank: '#d9a46a', dressing: [['rock', 0.6, '#b8693e'], ['bush', 0.25, '#9a9a62'], ['juniper', 0.15]],
  },
  // White and cream limestone cliffs with green scrub on the ledges, a turquoise river, garrigue on the rim.
  verdon: {
    strata: ['#e8e4da', '#d6d1c4', '#f2efe8', '#c9c3b4', '#e0dbcf', '#bdb6a6'], ledge: '#6f8a4a', floor: '#a9a98a', bar: '#ece6d6',
    top: '#8a9a5a', top2: '#a6a36a', water: '#22c4bf', foam: '#e6fbfa', bands: [1.1, 0.8, 1.2, 0.9, 1, 0.8],
    bank: '#b8b49a', dressing: [['bush', 0.45, '#5f7a3e'], ['pine', 0.3, '#3f6a3a'], ['rock', 0.25, '#d6d1c4']],
  },
  // Grey and ochre limestone under snow peaks, pines on the ledges, a roaring khaki river white with rapids.
  jinsha: {
    strata: ['#7a746a', '#9a8f7c', '#68625a', '#a89a80', '#857c6e', '#b0a48c'], ledge: '#5f7a4a', floor: '#8f8670', bar: '#b9ad92',
    top: '#7f8f5a', top2: '#6a7f4f', water: '#8a8a62', foam: '#f4f2ea', bands: [1, 1.1, 0.9, 1.2, 0.9, 1], snow: 1.25,
    bank: '#a39a82', dressing: [['pine', 0.5], ['rock', 0.4, '#7a746a'], ['bush', 0.1, '#6a8a4a']],
  },
  // Red volcanic earth in bands under green ridges, ferns and koa on the ledges, a red-brown river.
  waimea: {
    strata: ['#9a3a22', '#b8522e', '#7a2e1e', '#c46a3a', '#8a4a2e', '#a8442a'], ledge: '#4f8a3a', floor: '#8a5a3a', bar: '#b8784e',
    top: '#4f8f3e', top2: '#5f9a46', water: '#8a5a42', foam: '#f2ece4', bands: [1, 0.8, 1.1, 0.9, 1, 1.2],
    bank: '#8a6a42', dressing: [['bush', 0.45, '#3f7a34'], ['juniper', 0.35, '#4f8a3a'], ['rock', 0.2, '#7a2e1e']],
  },
  // Deep red and rose sandstone, streaked dark, a clear green stream filling the narrow passage.
  mujib: {
    strata: ['#8a2e22', '#a8443a', '#c46a5a', '#7a2a24', '#b85a4a', '#d48a6e'], ledge: '#b87a5a', floor: '#a86a4e', bar: '#d9b08a',
    top: '#c49a72', top2: '#b0845e', water: '#4fa89a', foam: '#eaf6f2', bands: [0.9, 1, 0.7, 1.1, 0.8, 0.9],
    bank: '#b8846a', dressing: [['rock', 0.65, '#8a2e22'], ['bush', 0.25, '#7a8a4a'], ['juniper', 0.1, '#5f7a4a']],
  },
  // Namib desert: pale gneiss and dark dolerite bands, sand on the floor, a thin river.
  namib: {
    strata: ['#7a6a5a', '#a08a70', '#5a4e44', '#b49c7e', '#8a7662'], ledge: '#d9b98a', floor: '#d6b07a', bar: '#e8cf9e',
    top: '#d9b47e', top2: '#c49a62', water: '#5a8f8a', foam: '#eef4f2', bands: [1, 1.1, 0.8, 1, 1],
    bank: '#dcb880', dressing: [['rock', 0.6, '#7a6a5a'], ['bush', 0.3, '#a89a5a'], ['quiver', 0.1]],
  },
};

/** What grows and lies about in a canyon (its palette's `dressing`), as kit.js's dressing kinds: [make(lite), share]. */
export function canyonDressing(paletteKey) {
  const pal = CANYON_PALETTES[paletteKey] ?? CANYON_PALETTES['grand-canyon'];
  const T = (x, y, z, sx = 1, sy = 1, sz = 1) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion(), new Vector3(sx, sy, sz));
  const make = {
    // A juniper: a short twisted trunk under a lumpy blue-green crown.
    juniper: (colour = '#5f7a4a') => () => merge([
      piece(new CylinderGeometry(0.18, 0.3, 1.4, 5, 1, true), '#5a4030', T(0, 0.7, 0)),
      piece(new IcosahedronGeometry(1.4, 0), colour, T(0, 2.1, 0, 1, 0.8, 1)),
    ]),
    // A pine (a canyon's forest).
    pine: (colour = '#2f6b3f') => (lite) => merge([
      piece(new CylinderGeometry(0.22, 0.3, 2, 5, 1, true), '#6b4a2f', T(0, 1, 0)),
      ...[0, 1].slice(0, lite ? 1 : 2).map((k) => piece(new ConeGeometry(2 - k * 0.7, 3.6, 6, 1, true), colour, T(0, 3 + k * 2.2, 0))),
    ]),
    rock: (colour = '#8b8681') => () => merge([piece(new IcosahedronGeometry(1.5, 0), colour, T(0, 0.5, 0, 1.3, 0.75, 1.1))]),
    bush: (colour = '#4d8a3c') => () => merge([piece(new IcosahedronGeometry(0.9, 0), colour, T(0, 0.5, 0, 1.3, 0.7, 1.2))]),
    // A quiver tree (Namib): a pale trunk forking into a rounded crown of grey-green.
    quiver: () => () => merge([
      piece(new CylinderGeometry(0.35, 0.6, 3.2, 6, 1, true), '#d8c49a', T(0, 1.6, 0)),
      piece(new IcosahedronGeometry(1.8, 0), '#8f9a6a', T(0, 3.8, 0, 1, 0.6, 1)),
    ]),
  };
  return (pal.dressing ?? [['rock', 1]]).map(([kind, share, colour]) => [make[kind](colour), share]);
}

const RISE_FROM = 40;      // metres after the gate the walls start to rise…
const RISE_TO = 120;       // …and where they stand full height
const FALL_M = 90;         // metres before the finish they start to fall away…
const GONE_M = 30;         // …and where they are gone (the station stands in the open)
const OTHER_M = 60;        // metres along the track that make another stretch "another stretch"
const FOLD_STEP = 6;       // metres of height between two stretches close by that count as a fold…
const FOLD_NEAR = 32;      // …within this far of each other on the plan (a spiral's turns over each other, a tight fold)
const FLOOR = 20;          // metres from the track to the foot of the wall (the side without the river)
const RIVER = { centre: 21, half: 5, foot: 34 }; // the river's middle and half-width, and the wall's foot on its side
const RUN = 22;            // metres from the foot of a wall to its rim
const NARROW = { floor: 15.5, run: 14 }; // a slot canyon's (`narrow: true`): its walls' foot never nearer than 12 m, wobble and all
const DIP = 0.45;          // share the walls are lower where the track flies highest
const BELOW_RIM = 0.6;     // metres the canyon floor lies under the track's rim
const GRID = 10;           // metres: the lookup grid of the nearest samples
const CAP = 1.0;           // beside a stretch without walls, the land rises at most this steeply from its floor
const OPEN_START = [45, 120]; // metres round the gate…
const OPEN_END = [70, 160];   // …and the station where the land is the ordinary land

/** Smooth wobble along the walls (cheap, seed-free). */
const wobble = (a, k) => Math.sin(a * 0.031 + k) * 0.6 + Math.sin(a * 0.087 + 2.1 * k) * 0.3 + Math.sin(a * 0.19 + 0.7 * k) * 0.1;
function rolling(x, z) {
  return Math.sin(x * 0.011 + 1.3) * Math.cos(z * 0.013 - 0.7) * 0.6 + Math.sin((x + z) * 0.023 + 2.1) * 0.25 + Math.cos((x - z) * 0.031 - 1.2) * 0.15;
}

/**
 * The canyon around a kit track: { heightAt(x, z, base), colourAt(x, y, z, steep),
 * detail (points along the walls where the land is drawn finer), walls (per sample),
 * floorAt(i), rimAt(i), rimOut(i, side), waterAt(i), riverTriangles({ lite, corridor }), dressable(x, z) }.
 * flight: the coaster's heights; liftAt(i): the channel's rim above its floor;
 * bounds: the land's extent; landRadius, seaLevel: as the rest of the land's.
 */
export function makeCanyon(centerline, channel, kit, { flight, liftAt, bounds, landRadius, seaLevel }) {
  const cfg = kit.canyon ?? {};
  const pal = CANYON_PALETTES[cfg.palette] ?? CANYON_PALETTES['grand-canyon'];
  const depth = cfg.depth ?? 40;
  const riverSign = cfg.river === 'none' ? 0 : cfg.river === 'right' ? -1 : 1; // (+1: the left, as a track file's sides)
  // (A slot canyon, `narrow`: the walls stand closer and climb faster.)
  const floorW = cfg.narrow ? NARROW.floor : FLOOR;
  const runW = cfg.narrow ? NARROW.run : RUN;
  const { samples, segments } = centerline;
  const step = channel.arc / segments;
  const n = segments + 1;
  const px = new Float64Array(n);
  const pz = new Float64Array(n);
  const floorY = new Float64Array(n);
  const tx = new Float64Array(n);
  const tz = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    const s = samples[i];
    px[i] = s.pos.x;
    pz[i] = s.pos.z;
    floorY[i] = s.pos.y - (flight ? flight[i] : 0) + liftAt(i) - 0.25 - BELOW_RIM;
    const l = Math.hypot(s.side.x, s.side.z) || 1;
    // (side points to the track's left)
    tx[i] = s.side.x / l;
    tz[i] = s.side.z / l;
  }

  // Where the walls stand: a section's share, risen after the gate and gone before the finish,
  // given way where another stretch passes close at another height, lower where the track flies high.
  const share = new Float64Array(n);
  const total = segments * step;
  for (let i = 0; i < n; i += 1) {
    const p = i / segments;
    const sec = (kit.sections ?? []).find((x) => p >= x.from && p <= x.to);
    const a = i * step;
    share[i] = (sec?.walls ?? 1) * smoothstep(RISE_FROM, RISE_TO, a) * (1 - smoothstep(total - FALL_M, total - GONE_M, a));
  }
  // (The folds: checked on every fourth sample against every fourth, then spread.)
  const fold = new Uint8Array(n);
  const near = FOLD_NEAR ** 2;
  for (let i = 0; i < n; i += 4) {
    for (let j = 0; j < n; j += 4) {
      if (Math.abs(j - i) * step < OTHER_M) continue;
      if ((px[i] - px[j]) ** 2 + (pz[i] - pz[j]) ** 2 < near && Math.abs(floorY[i] - floorY[j]) > FOLD_STEP) {
        for (let k = Math.max(0, i - 4); k <= Math.min(segments, i + 4); k += 1) fold[k] = 1;
        break;
      }
    }
  }
  const raw = Array.from(share, (v, i) => (fold[i] ? 0 : v));
  // Eased along the track (an average over 30 m either side), so walls rise and fall gently.
  const reach = Math.max(1, Math.round(30 / step));
  const walls = new Float64Array(n);
  {
    let sum = 0;
    let cnt = 0;
    for (let k = 0; k <= Math.min(segments, reach); k += 1) { sum += raw[k]; cnt += 1; }
    for (let i = 0; i < n; i += 1) {
      walls[i] = sum / cnt;
      const add = i + reach + 1;
      const drop = i - reach;
      if (add <= segments) { sum += raw[add]; cnt += 1; }
      if (drop >= 0) { sum -= raw[drop]; cnt -= 1; }
    }
    // (Never where a fold is, however the average falls; and none at all where the average is all but none.)
    for (let i = 0; i < n; i += 1) if (fold[i] || walls[i] < 1e-3) walls[i] = 0;
  }
  const heightOf = (i) => depth * walls[i] * (1 - DIP * smoothstep(10, 40, flight ? flight[i] : 0));

  // The river's level: just under the floor, never running uphill unless the floor makes it (then it steps up).
  const waterY = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    const want = floorY[i] - 1.1;
    waterY[i] = i ? Math.max(Math.min(waterY[i - 1], want), floorY[i] - 3.2) : want;
  }

  // The lookup grid: for each square, the nearest sample and the nearest of another stretch.
  const minX = bounds.minX;
  const minZ = bounds.minZ;
  const gw = Math.ceil((bounds.maxX - minX) / GRID) + 1;
  const gh = Math.ceil((bounds.maxZ - minZ) / GRID) + 1;
  const gNear = new Int32Array(gw * gh);
  const gOther = new Int32Array(gw * gh).fill(-1);
  const gWall = new Float32Array(gw * gh);
  const gRim = new Float32Array(gw * gh);
  {
    const every = Math.max(1, Math.round(6 / step));
    const keep = [];
    for (let i = 0; i < n; i += every) keep.push(i);
    if (keep[keep.length - 1] !== segments) keep.push(segments);
    const other = Math.round(OTHER_M / step);
    for (let gz = 0; gz < gh; gz += 1) {
      const z = minZ + gz * GRID;
      for (let gx = 0; gx < gw; gx += 1) {
        const x = minX + gx * GRID;
        let best = Infinity;
        let bi = 0;
        for (const i of keep) {
          const d = (px[i] - x) ** 2 + (pz[i] - z) ** 2;
          if (d < best) { best = d; bi = i; }
        }
        let best2 = Infinity;
        let bj = -1;
        for (const j of keep) {
          if (Math.abs(j - bi) < other) continue;
          const d = (px[j] - x) ** 2 + (pz[j] - z) ** 2;
          if (d < best2) { best2 = d; bj = j; }
        }
        gNear[gz * gw + gx] = bi;
        gOther[gz * gw + gx] = bj;
        // (Smoothed over the samples near by, weighted by distance: where walls stand, and the rim's
        // height, out on the plateau. The nearest sample alone would jump from one stretch to another.)
        let sw = 0;
        let sW = 0;
        let sP = 0;
        for (const i of keep) {
          const d2 = (px[i] - x) ** 2 + (pz[i] - z) ** 2;
          const t = d2 + 900;
          const k = 1 / (t * Math.sqrt(t));
          sw += k;
          sW += k * walls[i];
          sP += k * (floorY[i] + heightOf(i));
        }
        gWall[gz * gw + gx] = sW / sw;
        gRim[gz * gw + gx] = sP / sw;
      }
    }
  }
  const window = Math.ceil((GRID * 1.5 + 6) / step) + 2;
  // The nearest point of the track around sample i0: { d (metres), side (+1 left, -1 right), i, u (between i and i + 1) }.
  const closest = (x, z, i0) => {
    let best = Infinity;
    let bi = i0;
    let bu = 0;
    for (let i = Math.max(0, i0 - window); i < Math.min(segments, i0 + window); i += 1) {
      const ax = px[i + 1] - px[i];
      const az = pz[i + 1] - pz[i];
      const u = Math.max(0, Math.min(1, ((x - px[i]) * ax + (z - pz[i]) * az) / (ax * ax + az * az || 1)));
      const d2 = (px[i] + ax * u - x) ** 2 + (pz[i] + az * u - z) ** 2;
      if (d2 < best) { best = d2; bi = i; bu = u; }
    }
    const cx = px[bi] + (px[Math.min(segments, bi + 1)] - px[bi]) * bu;
    const cz = pz[bi] + (pz[Math.min(segments, bi + 1)] - pz[bi]) * bu;
    const side = (x - cx) * tx[bi] + (z - cz) * tz[bi] >= 0 ? 1 : -1;
    return { d: Math.sqrt(best), side, i: bi, u: bu };
  };
  const lerpAt = (arr, c) => arr[c.i] + (arr[Math.min(segments, c.i + 1)] - arr[c.i]) * c.u;
  // A smoothed grid's value at (x, z), between its four nearest squares.
  const smooth = (grid, x, z) => {
    const fx = Math.min(gw - 1.001, Math.max(0, (x - minX) / GRID));
    const fz = Math.min(gh - 1.001, Math.max(0, (z - minZ) / GRID));
    const ix = Math.floor(fx);
    const iz = Math.floor(fz);
    const u = fx - ix;
    const v = fz - iz;
    const g = (a, b) => grid[(iz + b) * gw + ix + a];
    return (g(0, 0) * (1 - u) + g(1, 0) * u) * (1 - v) + (g(0, 1) * (1 - u) + g(1, 1) * u) * v;
  };
  const gridAt = (x, z) => {
    const gx = Math.min(gw - 1, Math.max(0, Math.round((x - minX) / GRID)));
    const gz = Math.min(gh - 1, Math.max(0, Math.round((z - minZ) / GRID)));
    return gz * gw + gx;
  };

  const bands = pal.bands ?? [1, 1, 1, 1, 1];
  const bandSum = bands.reduce((a, b) => a + b, 0);
  const cum = [0];
  for (const b of bands) cum.push(cum[cum.length - 1] + b / bandSum);
  // A wall's height (share of its full height) a share u of the way from its foot to its rim:
  // each band a steep cliff, then a ledge sloping gently back to the next.
  const profile = (u) => {
    if (u <= 0) return 0;
    if (u >= 1) return 1;
    const x = u * bands.length;
    const k = Math.min(bands.length - 1, Math.floor(x));
    const f = x - k;
    const cliff = 0.48;
    const up = f < cliff ? 0.93 * smoothstep(0, cliff, f) : 0.93 + 0.07 * (f - cliff) / (1 - cliff);
    return cum[k] + (cum[k + 1] - cum[k]) * up;
  };
  // Where a wall's foot is, on each side (the river's side further out), wobbling along the canyon.
  const footAt = (side, a) => (side === riverSign ? RIVER.foot : floorW) + 2.6 * wobble(a, side > 0 ? 0.4 : 2.7);
  const runAt = (side, a) => runW + 3 * wobble(a, side > 0 ? 5.1 : 1.3);

  // One stretch's canyon at a spot: the land's height, and what the spot is (floor, river, wall, top).
  const stretch = (x, z, c) => {
    const a = (c.i + c.u) * step;
    const floor = lerpAt(floorY, c);
    const w = lerpAt(walls, c);
    const H = heightOf(c.i) + (heightOf(Math.min(segments, c.i + 1)) - heightOf(c.i)) * c.u;
    const foot = footAt(c.side, a);
    const run = runAt(c.side, a);
    const u = (c.d - foot) / run;
    let y = floor + H * profile(u);
    // (Without walls here, the land still never rises over this stretch: at most CAP beside it.)
    y = Math.max(y, floor + Math.max(0, c.d - foot) * CAP * (1 - w));
    let kind = u <= 0 ? 'floor' : u >= 1 ? 'top' : 'wall';
    if (u >= 1) {
      // The plateau: at this rim's height by the edge, then at the rims' height round about
      // (smoothed), rolling further out, falling to the sea at the edges.
      const out = c.d - foot - run;
      y += (smooth(gRim, x, z) - y) * smoothstep(8, 70, out);
      y += 9 * rolling(x, z) * smoothstep(20, 220, out) * Math.max(w, 0.3);
    }
    if (riverSign && c.side === riverSign && w > 0.05) {
      const r = Math.abs(c.d - RIVER.centre);
      const bed = lerpAt(waterY, c) - 1.5;
      const k = 1 - smoothstep(RIVER.half - 1.5, RIVER.half + 2.2, r);
      if (k > 0) {
        y += (Math.min(y, bed) - y) * k * Math.min(1, w * 3);
        if (r < RIVER.half + 1) kind = 'river';
      }
    }
    return { y, kind, floor, H, u, w };
  };

  // The canyon's land at a spot: the nearest stretch's, capped by any other close by (smoothly).
  const at = (x, z) => {
    const g = gridAt(x, z);
    const c = closest(x, z, gNear[g]);
    const s = stretch(x, z, c);
    let { y } = s;
    if (gOther[g] >= 0) {
      const c2 = closest(x, z, gOther[g]);
      if (c2.d < c.d + 2 * (runW + RIVER.foot)) {
        const s2 = stretch(x, z, c2);
        const k = 6;
        const h = Math.max(0, Math.min(1, 0.5 + (s2.y - y) / (2 * k)));
        y = s2.y + (y - s2.y) * h - k * h * (1 - h); // (a smooth minimum)
      }
    }
    return { ...s, y, c };
  };

  // The lift hill and the station stand in the open: round the gate and past the finish the canyon
  // gives way to the ordinary land, out to OPEN_START and OPEN_END metres (its full height beyond).
  const startAt = { x: px[0], z: pz[0] };
  const endAt = { x: px[segments] + (px[segments] - px[segments - 1]) / step * 10, z: pz[segments] + (pz[segments] - pz[segments - 1]) / step * 10 };
  const open = (x, z) => smoothstep(OPEN_START[0], OPEN_START[1], Math.hypot(x - startAt.x, z - startAt.z))
    * smoothstep(OPEN_END[0], OPEN_END[1], Math.hypot(x - endAt.x, z - endAt.z));

  const sink = (y, d) => {
    const k = smoothstep(landRadius * 0.62, landRadius, d);
    return y + (seaLevel - 6 - y) * k;
  };

  /** The land's height at (x, z), given the ordinary land's `base` there. */
  function heightAt(x, z, base) {
    const s = at(x, z);
    // (Near the track, how much of the canyon there is follows the nearest stretch; further out, the
    // smoothed share round about, so the plateau never ends in a cliff where one stretch gives way to another.)
    const near = Math.min(1, 1.5 * (s.w + (smooth(gWall, x, z) - s.w) * smoothstep(floorW, floorW + runW + 30, s.c.d)));
    // (And far out it is all the canyon's plateau, even beyond a stretch without walls: the land
    // round the start and the finish rises to the plateau rather than falling away below it.)
    const W = (near + (1 - near) * smoothstep(floorW + runW + 50, floorW + runW + 160, s.c.d)) * open(x, z);
    // (Round the station the land lies no higher than its floor, rising gently away from it: a basin
    // at the canyon's end, so the station never stands in a cutting.)
    const dEnd = Math.hypot(x - endAt.x, z - endAt.z);
    const basin = s.c.d > 12 && dEnd < OPEN_END[1] ? floorY[segments] - 0.5 + Math.max(0, dEnd - 20) * 0.35 : Infinity;
    if (W <= 0) return Math.min(base, basin);
    const y = sink(s.y, s.c.d);
    const h = Math.min(base + (y - base) * W, basin);
    // (Right beside the track the ordinary land's own fit to the channel always wins where it is lower.)
    return s.c.d < FLOOR - 4 ? Math.min(h, base) : h; // (as for every canyon, a slot's too)
  }

  const C = (hex) => new Color(hex);
  const strata = pal.strata.map(C);
  const ledge = C(pal.ledge);
  const floorC = C(pal.floor);
  const bar = C(pal.bar);
  const top = C(pal.top);
  const top2 = C(pal.top2);
  const snow = C('#f4f7fa');
  const out = new Color();
  /** A triangle's colour at its middle (x, y, z), steep: its rise in metres; null where the canyon has none. */
  function colourAt(x, y, z, steep) {
    const s = at(x, z);
    // (As heightAt: the nearest stretch's share near the track, the plateau's colours far out.)
    // (Where the walls give way to the hillside, it is the plateau's ground: its rock where steep.)
    if (open(x, z) < 0.5) return null; // (the open land round the gate and the station: the landscape's own colours)
    if (s.w < 0.12) {
      out.copy(top).lerp(top2, 0.5 + 0.5 * rolling(x * 1.7, z * 1.7));
      if (steep > 4) out.lerp(strata[1], 0.6);
      return out;
    }
    const rel = y - s.floor;
    if (s.kind === 'river' || (s.kind === 'floor' && rel < 0.6)) return out.copy(s.kind === 'river' ? bar : floorC);
    if (s.kind === 'floor') return out.copy(floorC).lerp(bar, 0.25);
    if (s.kind === 'top' || rel > s.H * 0.985) {
      out.copy(top).lerp(top2, 0.5 + 0.5 * rolling(x * 1.7, z * 1.7));
      if (pal.snow !== undefined && rel > depth * pal.snow) out.lerp(snow, 0.85);
      return out;
    }
    // On the wall: its band's colour on the cliffs, scree on the ledges between them.
    const f = Math.max(0, Math.min(0.999, rel / Math.max(1, s.H)));
    let k = 0;
    while (k < bands.length - 1 && f >= cum[k + 1]) k += 1;
    out.copy(strata[k % strata.length]);
    if (steep < 1.4) out.lerp(ledge, 0.65);
    if (pal.snow !== undefined && rel > depth * pal.snow) out.lerp(snow, 0.6);
    return out;
  }

  // Where the land is drawn finer: along both walls (and the river's banks) wherever walls stand.
  function detail(cell) {
    const pts = [];
    const every = Math.max(1, Math.round(Math.min(cell / 2.5, 8) / step));
    for (let i = 0; i < n; i += every) {
      if (walls[i] < 0.04) continue;
      const a = i * step;
      for (const side of [1, -1]) {
        const from = side === riverSign ? RIVER.centre - RIVER.half - 3 : footAt(side, a) - 3;
        const to = footAt(side, a) + runAt(side, a) + 4;
        for (let d = from; d <= to; d += Math.min(cell / 2.5, 6)) pts.push({ x: px[i] + tx[i] * side * d, z: pz[i] + tz[i] * side * d });
      }
    }
    return pts;
  }

  /**
   * The river: a ribbon of water down the canyon floor on its side, white where it falls steeply.
   * Its triangles ({ pos, col }, flat lists) are drawn with the banks (kitGround.js: one draw call less).
   */
  function riverTriangles({ lite = false, corridor = null } = {}) {
    if (!riverSign) return null;
    const pos = [];
    const col = [];
    const water = C(pal.water);
    const foam = C(pal.foam);
    const every = Math.max(1, Math.round((lite ? 6 : 3) / step));
    const edge = (i, d) => ({ x: px[i] + tx[i] * riverSign * d, y: waterY[i], z: pz[i] + tz[i] * riverSign * d });
    const hits = (a, b, cc) => corridor && corridor.hitsTriangle(a, b, cc);
    for (let i = 0; i + every <= segments; i += every) {
      const j = i + every;
      if (walls[i] < 0.08 || walls[j] < 0.08) continue;
      const a0 = edge(i, RIVER.centre - RIVER.half - 0.4);
      const a1 = edge(i, RIVER.centre + RIVER.half + 0.4);
      const b0 = edge(j, RIVER.centre - RIVER.half - 0.4);
      const b1 = edge(j, RIVER.centre + RIVER.half + 0.4);
      // (On the inside of a bend tighter than the river is wide, the ribbon would fold over itself: left out.)
      const cross = (b0.x - a0.x) * (a1.z - a0.z) - (b0.z - a0.z) * (a1.x - a0.x);
      const cross2 = (b1.x - a1.x) * (a1.z - a0.z) - (b1.z - a1.z) * (a1.x - a0.x);
      if (Math.sign(cross) !== Math.sign(cross2)) continue;
      const fall = (waterY[i] - waterY[j]) / (every * step);
      const c = new Color().copy(water).lerp(foam, Math.min(0.6, smoothstep(0.05, 0.3, fall) + 0.05 * Math.sin(i * 0.37)));
      for (const v of [[a0, b0, b1], [a0, b1, a1]]) {
        if (hits(...v)) continue;
        for (const o of v) { pos.push(o.x, o.y, o.z); col.push(c.r, c.g, c.b); }
      }
    }
    return pos.length ? { pos, col } : null;
  }

  /** Can trees and rocks stand here? Not on the walls, nor in the river. */
  function dressable(x, z) {
    const s = at(x, z);
    if (s.w < 0.12) return true;
    return s.kind === 'top' || (s.kind === 'floor' && s.c.d > 9);
  }

  /** The rim's height beside sample i (its floor plus the walls' height there). */
  const rimAt = (i) => floorY[i] + heightOf(i);
  /** How far out the rim is beside sample i, on a side (+1 left, -1 right). */
  const rimOut = (i, side) => footAt(side, i * step) + runAt(side, i * step);

  return { heightAt, colourAt, detail, riverTriangles, dressable, walls, floorAt: (i) => floorY[i], rimAt, rimOut, waterAt: (i) => waterY[i], riverSign, river: RIVER, depth, palette: pal };
}
