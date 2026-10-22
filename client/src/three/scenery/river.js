/**
 * Rivers (kit tracks of the river family): the track is a journey along a wide river. It runs on
 * the bank beside the water, and where a section flies on its supports the river may run under it
 * (the track out over the water) or cross to the other side. Looks only: the race is exactly the
 * ice channel's.
 *
 * The river is a ribbon of water that follows the track at an offset (shaped into the land itself:
 * kitGround.js asks `heightAt`): per section, where the river runs by it (`river`: 'left', 'right',
 * 'under', 'none'; the track's own `river.side` where a section doesn't say), eased along the track so
 * it swings from one side to the other under a flying stretch. Beside a stretch on the ground the
 * water keeps BANK_GAP metres from the track's middle (the track's own bank stays whole); under a
 * flying stretch it may pass right below it. Its level falls with the track and never runs uphill
 * (white where it falls steeply: rapids). The water is only drawn where the land around holds it
 * (never floating over a lower stretch), and the land beside a stretch on the ground is never lowered.
 */
import { Color, ConeGeometry, CylinderGeometry, IcosahedronGeometry, Matrix4, Quaternion, Vector3 } from 'three';
import { merge, piece, smoothstep } from './parts';

/**
 * The rivers' colours and plants: `water` and `deep` the river (its edge and its middle), `foam` its
 * rapids, `bank` the shore by the water (`banks`: what the shore is made of, by the track file's
 * `banks`), `quay` the stone of a quay; `dressing` what grows on the land, as kit.js's dressing kinds.
 */
export const RIVER_PALETTES = {
  // The Danube by night: a deep green-blue river between stone quays, plane trees and city land.
  danube: { water: '#2f6f82', deep: '#1f4f63', foam: '#dfeef2', bank: '#8f8a7e', quay: '#9b958a', sand: '#c9b994',
    dressing: [['broadleaf', 0.55, '#3f6a3a'], ['poplar', 0.3, '#4a7a3e'], ['bush', 0.15, '#4f7a3e']] },
  // The Mekong: wide brown water, palms and banana plants, red earth banks. (Moses, 22 Oct 2026: it read as
  // sand. Silty olive at the banks, a green-grey middle (a river players read as water), a glint of sky, white only
  // where it really falls: `rapids`.)
  mekong: { water: '#6c7452', deep: '#466467', foam: '#ece4d2', glint: '#dce8ee', rapids: [0.18, 0.32], bank: '#a8784a', quay: '#9a8f7a', sand: '#c9a06a',
    dressing: [['palm', 0.45], ['banana', 0.3], ['broadleaf', 0.25, '#3f7f3a']] },
  // The Mississippi's bayou: muddy olive-brown water, cypress hung with moss, reeds on the banks.
  mississippi: { water: '#6f6a44', deep: '#57533a', foam: '#e8e6d4', bank: '#7a6f48', quay: '#8f8676', sand: '#b8a67a',
    dressing: [['cypress', 0.5], ['broadleaf', 0.3, '#4f6f34'], ['bush', 0.2, '#5f7a3e']] },
  // The Zambezi: dark water above the great falls, rocky lips, savannah with acacias.
  zambezi: { water: '#4f7a6e', deep: '#3a5f56', foam: '#f4f8f6', bank: '#6f6656', quay: '#7a7468', sand: '#c4ac7e',
    dressing: [['acacia', 0.5], ['broadleaf', 0.25, '#5f7f3a'], ['rock', 0.25, '#5a544c']] },
  // The Yangtze: grey-green water under steep green mountains, bamboo on the banks.
  yangtze: { water: '#6f8f7e', deep: '#56746a', foam: '#eef2ee', bank: '#8a8670', quay: '#8f8b80', sand: '#b8ae8e',
    dressing: [['bamboo', 0.4], ['broadleaf', 0.4, '#3f6f3a'], ['rock', 0.2, '#6f6a60']] },
  // The Thames: a grey-green tidal river between stone embankments, plane trees and city land.
  thames: { water: '#5a7a78', deep: '#46625f', foam: '#e4ecea', bank: '#7f7a6c', quay: '#a8a090', sand: '#b8ac8e',
    dressing: [['broadleaf', 0.6, '#4a7040'], ['poplar', 0.2, '#557a42'], ['bush', 0.2, '#4f7a3e']] },
  // The Seine: a green river between pale stone quays, plane trees and willows.
  seine: { water: '#4f7f74', deep: '#3a6158', foam: '#e8f0ec', bank: '#a89c84', quay: '#c8bca2', sand: '#c8b894',
    dressing: [['broadleaf', 0.55, '#557a3a'], ['willow', 0.25], ['bush', 0.2, '#5a7f3e']] },
  // The Volga: a wide blue river on the plains, sandy banks, birch woods.
  volga: { water: '#4a7aa0', deep: '#355f84', foam: '#eef2f6', bank: '#a8946a', quay: '#9a968e', sand: '#d8c49a',
    dressing: [['birch', 0.55], ['poplar', 0.25, '#5a8a42'], ['bush', 0.2, '#5f8a42']] },
  // The Murray: dark olive-green water (it must read as water, not mud) through river red gum forest, golden sandy banks.
  murray: { water: '#56705e', deep: '#3f5648', foam: '#eceadc', bank: '#a89068', quay: '#b8a07a', sand: '#d8b880',
    dressing: [['redgum', 0.6], ['bush', 0.25, '#7a8a5a'], ['rock', 0.15, '#b8945a']] },
  // The Irrawaddy at dawn: wide grey-blue water under the dawn sky (silty, but it must read as water beside the pale sandbanks), sugar palms on a dusty green plain.
  irrawaddy: { water: '#6f8590', deep: '#566c78', foam: '#f2ead8', bank: '#b8a07a', quay: '#a89a80', sand: '#e0cfa4',
    dressing: [['sugar-palm', 0.45], ['broadleaf', 0.35, '#5f7a3a'], ['bush', 0.2, '#7a8a4a']] },
  // The meeting of the waters: a black-water river and a sandy one side by side, not mixing (`seam`: the
  // colour of each half, across the river's side vector), the line between them down its middle; rainforest.
  // (`glint`: pale streaks of sky on the water along the current, so dark or brown water reads as water.)
  amazon: { water: '#3a2a1c', deep: '#2a1e14', foam: '#efe2c8', bank: '#7a5a3a', quay: '#8a7a64', sand: '#d8c08a', seam: ['#1c2730', '#8a6640'], glint: '#d6e6f0', rapids: [0.18, 0.32],
    dressing: [['broadleaf', 0.5, '#2f6a2e'], ['palm', 0.3], ['banana', 0.2]] },
  // The Nile at the cataract: clear blue-green water between dark granite, desert sand on the land, date palms.
  nile: { water: '#2f7f86', deep: '#1f6470', foam: '#f2f6f4', bank: '#8a6e4e', quay: '#5a524c', sand: '#e0c08a', glint: '#e8f4f6', rapids: [0.18, 0.32],
    dressing: [['palm', 0.35], ['rock', 0.45, '#b8925e'], ['bush', 0.2, '#8a8a4a']] },
  // The Congo's rapids: dark tea-brown water, white where it falls, deep rainforest to the banks.
  congo: { water: '#4a4c3c', deep: '#3a3c30', foam: '#f4efe4', bank: '#6a4a32', quay: '#6f665a', sand: '#b8946a', glint: '#e4ecee', rapids: [0.18, 0.32],
    dressing: [['broadleaf', 0.6, '#2a5f2a'], ['palm', 0.2], ['banana', 0.2]] },
  // The Rhine gorge: green-grey water, slate banks, vineyards and woods on the slopes.
  rhine: { water: '#4f7a72', deep: '#3a6058', foam: '#eef2ee', bank: '#7a7466', quay: '#8a8478', sand: '#b8ae94', glint: '#e8f0f2', rapids: [0.18, 0.32],
    dressing: [['broadleaf', 0.45, '#3f6a34'], ['poplar', 0.25, '#4a7a3e'], ['bush', 0.3, '#5f7a3a']] },
  // The Ganges at dawn: wide milky grey-green water, pale sand on the far bank, a few trees.
  ganges: { water: '#7f9a96', deep: '#678480', foam: '#f2f0e8', bank: '#a89878', quay: '#b8a07a', sand: '#e0d0aa', glint: '#f6e8d4', rapids: [0.18, 0.32],
    dressing: [['broadleaf', 0.5, '#4f7a3a'], ['palm', 0.2], ['bush', 0.3, '#6f8a46']] },
};
const BANK_COLOURS = { sand: 'sand', reeds: 'bank', bayou: 'bank', rock: 'quay', quay: 'quay', grass: null };

/** What grows by a river (its palette's `dressing`), as kit.js's dressing kinds: [make(lite), share]. */
export function riverDressing(paletteKey) {
  const pal = RIVER_PALETTES[paletteKey] ?? RIVER_PALETTES.danube;
  const T = (x, y, z, sx = 1, sy = 1, sz = 1) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion(), new Vector3(sx, sy, sz));
  const Ry = (x, y, z, ry, sx = 1, sy = 1, sz = 1) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), ry), new Vector3(sx, sy, sz));
  const make = {
    broadleaf: (colour = '#3f6a3a') => (lite) => merge([
      piece(new CylinderGeometry(0.25, 0.4, 3, 5, 1, true), '#5a4030', T(0, 1.5, 0)),
      piece(new IcosahedronGeometry(2.6, lite ? 0 : 1), colour, T(0, 4.4, 0, 1, 0.85, 1)),
    ]),
    poplar: (colour = '#4a7a3e') => () => merge([
      piece(new CylinderGeometry(0.2, 0.3, 2, 5, 1, true), '#5a4a36', T(0, 1, 0)),
      piece(new IcosahedronGeometry(1.5, 0), colour, T(0, 5, 0, 1, 2.6, 1)),
    ]),
    palm: () => (lite) => merge([
      piece(new CylinderGeometry(0.2, 0.32, 7, 5, 1, true), '#8a6a48', Ry(0.4, 3.5, 0, -0.12)),
      ...Array.from({ length: lite ? 4 : 6 }, (_, k) => {
        const a = (k / (lite ? 4 : 6)) * Math.PI * 2;
        const m = new Matrix4().compose(new Vector3(0.8 + Math.cos(a) * 1.4, 7, Math.sin(a) * 1.4), new Quaternion().setFromAxisAngle(new Vector3(-Math.sin(a), 0, Math.cos(a)), 0.5), new Vector3(1, 1, 1));
        return piece(new ConeGeometry(0.7, 3.4, 4, 1, true), '#3f7f34', m.multiply(new Matrix4().makeRotationZ(Math.PI / 2)));
      }),
    ]),
    banana: () => () => merge([
      piece(new CylinderGeometry(0.22, 0.3, 2.2, 5, 1, true), '#7f8a4a', T(0, 1.1, 0)),
      piece(new IcosahedronGeometry(1.5, 0), '#5f9a3e', T(0, 2.6, 0, 1.3, 0.7, 1.3)),
    ]),
    // A bald cypress: a flared trunk, a narrow crown, grey moss hanging from it.
    cypress: () => (lite) => merge([
      piece(new CylinderGeometry(0.3, 0.75, 4, 6, 1, true), '#5f4e3a', T(0, 2, 0)),
      piece(new ConeGeometry(2, 6, 6, 1, true), '#4a6a34', T(0, 6.5, 0)),
      ...(lite ? [] : [piece(new ConeGeometry(1.4, 3, 5, 1, true), '#9a9a8a', T(0.4, 4.6, 0, 1, 1, 0.6))]),
    ]),
    acacia: () => () => merge([
      piece(new CylinderGeometry(0.18, 0.28, 3.4, 5, 1, true), '#6a5038', T(0, 1.7, 0)),
      piece(new CylinderGeometry(3, 2.2, 0.9, 7, 1), '#6f7f3a', T(0, 3.8, 0)),
    ]),
    bamboo: () => (lite) => merge(Array.from({ length: lite ? 3 : 5 }, (_, k) => piece(
      new CylinderGeometry(0.1, 0.12, 6 + (k % 3), 5, 1, true), '#7f9a4a', Ry(Math.cos(k * 2.1) * 0.8, 3 + (k % 3) / 2, Math.sin(k * 2.1) * 0.8, (k - 2) * 0.06),
    ))),
    // A clump of reeds: thin green-gold blades.
    reeds: () => (lite) => merge(Array.from({ length: lite ? 4 : 7 }, (_, k) => piece(
      new ConeGeometry(0.12, 2.4 + (k % 3) * 0.5, 3, 1, true), k % 2 ? '#8a9a4a' : '#a8a05a', Ry(Math.cos(k * 1.9) * 0.6, 1.2, Math.sin(k * 1.9) * 0.6, (k - 3) * 0.08),
    ))),
    // A birch: a slim white trunk with dark marks, a light airy crown.
    birch: () => (lite) => merge([
      piece(new CylinderGeometry(0.16, 0.24, 6, 5, 1, true), '#eeeae2', T(0, 3, 0)),
      ...(lite ? [] : [piece(new CylinderGeometry(0.25, 0.25, 0.3, 5, 1, true), '#2a2a2a', T(0, 2.2, 0))]),
      piece(new IcosahedronGeometry(1.8, 0), '#8ab04a', T(0, 6.4, 0, 1, 1.6, 1)),
    ]),
    // A weeping willow: a short trunk, a dome of drooping pale green.
    willow: () => () => merge([
      piece(new CylinderGeometry(0.35, 0.55, 3, 5, 1, true), '#5a4a38', T(0, 1.5, 0)),
      piece(new ConeGeometry(3.4, 6, 7, 1, true), '#8aa84a', T(0, 4.2, 0)),
    ]),
    // A river red gum: a pale mottled trunk, leaning limbs, a broad grey-green crown.
    redgum: () => (lite) => merge([
      piece(new CylinderGeometry(0.45, 0.8, 5, 6, 1, true), '#d8d0c0', Ry(0, 2.5, 0, 0.12)),
      ...(lite ? [] : [piece(new CylinderGeometry(0.15, 0.35, 3.4, 5, 1, true), '#d0c8b8', Ry(-1.2, 5.4, 0, 0.7))]),
      piece(new IcosahedronGeometry(2.8, 0), '#7a8a5a', T(0.4, 6.8, 0, 1.4, 0.65, 1.3)),
    ]),
    // A sugar palm: a tall straight trunk, a round ball of fan leaves.
    'sugar-palm': () => () => merge([
      piece(new CylinderGeometry(0.22, 0.3, 9, 5, 1, true), '#6a5a48', T(0, 4.5, 0)),
      piece(new IcosahedronGeometry(1.9, 0), '#4f7a34', T(0, 9.6, 0, 1.2, 0.9, 1.2)),
    ]),
    rock: (colour = '#7a756c') => () => merge([piece(new IcosahedronGeometry(1.5, 0), colour, T(0, 0.5, 0, 1.3, 0.75, 1.1))]),
    bush: (colour = '#4d8a3c') => () => merge([piece(new IcosahedronGeometry(0.9, 0), colour, T(0, 0.5, 0, 1.3, 0.7, 1.2))]),
  };
  return pal.dressing.map(([kind, share, colour]) => [make[kind](colour), share]);
}

/** The Rivers scenery's own trees (a section's `scenery`: 'cypress', 'reeds'), for the dressing's extra kinds. */
export function riverExtras() {
  const T = (x, y, z) => new Matrix4().makeTranslation(x, y, z);
  return {
    cypress: (lite) => merge([
      piece(new CylinderGeometry(0.3, 0.75, 4, 6, 1, true), '#5f4e3a', T(0, 2, 0)),
      piece(new ConeGeometry(2, 6, 6, 1, true), '#4a6a34', T(0, 6.5, 0)),
      ...(lite ? [] : [piece(new ConeGeometry(1.4, 3, 5, 1, true), '#9a9a8a', T(0.4, 4.6, 0))]),
    ]),
    reeds: (lite) => merge(Array.from({ length: lite ? 4 : 7 }, (_, k) => piece(new ConeGeometry(0.12, 2.4 + (k % 3) * 0.5, 3, 1, true), k % 2 ? '#8a9a4a' : '#a8a05a', T(Math.cos(k * 1.9) * 0.6, 1.2, Math.sin(k * 1.9) * 0.6)))),
  };
}

const BANK_GAP = 15;      // metres from the track's middle to the water's edge beside a stretch on the ground
const UNDER_HEIGHT = 5;   // metres: a stretch flying at least this high may have the water right under it
const EASE_M = 45;        // metres along the track over which the river swings from one side to the other
const SHORE = 9;          // metres of shore from the water's edge up to the land
const KEEP = 11;          // metres from a stretch on the ground within which the land is never lowered
const GRID = 10;          // metres: the lookup grid of the nearest samples
const BED = 2.2;          // metres from the water's surface to its bed in the middle

/**
 * The river around a kit track: { heightAt(x, z, base), colourAt(x, y, z, steep), detail(cell),
 * riverTriangles({ lite, corridor, groundAt }), dressable(x, z), centreAt(i), waterAt(i), halfAt(i), palette }.
 * flight: the coaster's heights; liftAt(i): the channel's rim above its floor; bounds: the land's extent.
 */
export function makeRiver(centerline, channel, kit, { flight, liftAt, bounds }) {
  const cfg = kit.river ?? {};
  const pal = RIVER_PALETTES[cfg.palette] ?? RIVER_PALETTES.danube;
  const width = cfg.width ?? 90;
  const calm = cfg.calm === true; // (a slow lowland river: hardly any white water where it falls with the track)
  const homeSide = cfg.side === 'right' ? -1 : 1; // (+1: the left, as a track file's sides)
  const { samples, segments } = centerline;
  const step = channel.arc / segments;
  const n = segments + 1;
  const px = new Float64Array(n);
  const pz = new Float64Array(n);
  const tx = new Float64Array(n);
  const tz = new Float64Array(n);
  const groundY = new Float64Array(n);
  const air = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    const s = samples[i];
    px[i] = s.pos.x;
    pz[i] = s.pos.z;
    air[i] = flight ? flight[i] : 0;
    groundY[i] = s.pos.y - air[i] + liftAt(i) - 0.25 - 0.6;
    const l = Math.hypot(s.side.x, s.side.z) || 1;
    tx[i] = s.side.x / l;
    tz[i] = s.side.z / l;
  }

  // Where the river runs by each sample: its middle's offset from the track (+ left) and its half-width.
  const rawOff = new Float64Array(n);
  const rawHalf = new Float64Array(n);
  const half0 = width / 2;
  for (let i = 0; i < n; i += 1) {
    const p = i / segments;
    const sec = (kit.sections ?? []).find((x) => p >= x.from && p <= x.to);
    const by = sec?.river ?? (homeSide > 0 ? 'left' : 'right');
    if (by === 'under') { rawOff[i] = 0; rawHalf[i] = half0; }
    else if (by === 'none') { rawOff[i] = homeSide * (half0 + BANK_GAP + 30); rawHalf[i] = 0; }
    else { const sg = by === 'right' ? -1 : 1; rawOff[i] = sg * (half0 + BANK_GAP); rawHalf[i] = half0; }
  }
  const ease = (raw) => {
    const out = new Float64Array(n);
    const reach = Math.max(1, Math.round(EASE_M / 2 / step));
    let sum = 0;
    let cnt = 0;
    for (let k = 0; k <= Math.min(segments, reach); k += 1) { sum += raw[k]; cnt += 1; }
    for (let i = 0; i < n; i += 1) {
      out[i] = sum / cnt;
      const add = i + reach + 1;
      const drop = i - reach;
      if (add <= segments) { sum += raw[add]; cnt += 1; }
      if (drop >= 0) { sum -= raw[drop]; cnt -= 1; }
    }
    return out;
  };
  const off = ease(rawOff);
  const halfW = ease(rawHalf);
  // (Beside a stretch on the ground the water never comes nearer than BANK_GAP, however the swing eases.)
  for (let i = 0; i < n; i += 1) {
    if (air[i] >= UNDER_HEIGHT) continue;
    const near = Math.abs(off[i]) - halfW[i];
    if (near < BANK_GAP) {
      const sg = off[i] >= 0 ? 1 : -1;
      const need = BANK_GAP - near;
      halfW[i] = Math.max(0, halfW[i] - need * 0.5);
      off[i] += sg * need * 0.5;
      if (Math.abs(off[i]) - halfW[i] < BANK_GAP) off[i] = sg * (halfW[i] + BANK_GAP);
    }
  }
  // The river's middle on the plan, and its level: just under the land by the track, falling with it,
  // never running uphill unless the land makes it (then it steps up).
  const cx = new Float64Array(n);
  const cz = new Float64Array(n);
  const level = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    cx[i] = px[i] + tx[i] * off[i];
    cz[i] = pz[i] + tz[i] * off[i];
    const want = groundY[i] - 1.4;
    level[i] = i ? Math.max(Math.min(level[i - 1], want), groundY[i] - 4) : want;
  }

  // The lookup grid: for each square, the nearest track sample and the nearest river sample.
  const minX = bounds.minX;
  const minZ = bounds.minZ;
  const gw = Math.ceil((bounds.maxX - minX) / GRID) + 1;
  const gh = Math.ceil((bounds.maxZ - minZ) / GRID) + 1;
  const gTrack = new Int32Array(gw * gh);
  const gRiver = new Int32Array(gw * gh);
  {
    const every = Math.max(1, Math.round(5 / step));
    const keep = [];
    for (let i = 0; i < n; i += every) keep.push(i);
    if (keep[keep.length - 1] !== segments) keep.push(segments);
    const wet = keep.filter((i) => halfW[i] > 1);
    for (let gz = 0; gz < gh; gz += 1) {
      const z = minZ + gz * GRID;
      for (let gx = 0; gx < gw; gx += 1) {
        const x = minX + gx * GRID;
        let best = Infinity;
        let bi = 0;
        for (const i of keep) { const d = (px[i] - x) ** 2 + (pz[i] - z) ** 2; if (d < best) { best = d; bi = i; } }
        gTrack[gz * gw + gx] = bi;
        best = Infinity;
        let bj = -1;
        for (const i of wet) { const d = (cx[i] - x) ** 2 + (cz[i] - z) ** 2 - halfW[i] ** 2; if (d < best) { best = d; bj = i; } }
        gRiver[gz * gw + gx] = bj;
      }
    }
  }
  const gridAt = (x, z) => {
    const gx = Math.min(gw - 1, Math.max(0, Math.round((x - minX) / GRID)));
    const gz = Math.min(gh - 1, Math.max(0, Math.round((z - minZ) / GRID)));
    return gz * gw + gx;
  };
  const window = Math.ceil((GRID * 2 + 30) / step) + 2;
  // The nearest point of a polyline (xs, zs) around sample i0: { d, i, u }.
  const nearestOn = (xs, zs, x, z, i0) => {
    let best = Infinity;
    let bi = i0;
    let bu = 0;
    for (let i = Math.max(0, i0 - window); i < Math.min(segments, i0 + window); i += 1) {
      const ax = xs[i + 1] - xs[i];
      const az = zs[i + 1] - zs[i];
      const u = Math.max(0, Math.min(1, ((x - xs[i]) * ax + (z - zs[i]) * az) / (ax * ax + az * az || 1)));
      const d2 = (xs[i] + ax * u - x) ** 2 + (zs[i] + az * u - z) ** 2;
      if (d2 < best) { best = d2; bi = i; bu = u; }
    }
    return { d: Math.sqrt(best), i: bi, u: bu };
  };
  const lerp = (arr, c) => arr[c.i] + (arr[Math.min(segments, c.i + 1)] - arr[c.i]) * c.u;

  // How far (x, z) is from a stretch on the ground (Infinity if the nearest stretch flies).
  const groundStretch = (x, z, g) => {
    const c = nearestOn(px, pz, x, z, gTrack[g]);
    return lerp(air, c) >= UNDER_HEIGHT - 1 ? Infinity : c.d;
  };
  // The river at (x, z): { d (from its edge, negative inside), level, c } or null where there is none near.
  const riverAt = (x, z, g) => {
    const j = gRiver[g];
    if (j < 0) return null;
    const c = nearestOn(cx, cz, x, z, j);
    const h = lerp(halfW, c);
    if (h < 1) return null;
    return { d: c.d - h, level: lerp(level, c), c, half: h };
  };

  /** The land's height at (x, z), given the ordinary land's `base` there. */
  function heightAt(x, z, base) {
    const g = gridAt(x, z);
    const r = riverAt(x, z, g);
    if (!r || r.d > SHORE) return base;
    // (Never lowered beside a stretch on the ground: its bank stays whole.)
    const dg = groundStretch(x, z, g);
    const keep = 1 - smoothstep(KEEP, KEEP + 6, dg);
    const inside = Math.max(0, -r.d);
    const bed = r.level - 0.6 - Math.min(BED, inside * 0.25);
    const shore = r.level + 0.3 + Math.max(0, r.d) * 0.55;
    const want = r.d <= 0 ? bed : Math.min(shore, r.level + 0.3 + r.d * 0.55);
    const h = Math.min(base, want);
    return base + (h - base) * (1 - keep);
  }

  const C = (hex) => new Color(hex);
  const bankKey = BANK_COLOURS[cfg.banks ?? 'grass'];
  const shoreC = bankKey ? C(pal[bankKey]) : null;
  const wetC = C(pal.bank);
  const out = new Color();
  /** A triangle's colour at its middle: the shore's by the water; null elsewhere (the land's own). */
  function colourAt(x, y, z, steep) {
    const g = gridAt(x, z);
    const r = riverAt(x, z, g);
    if (!r || r.d > SHORE) return null;
    if (y < r.level + 0.6) return out.copy(wetC);
    if (shoreC) return out.copy(shoreC).lerp(wetC, steep > 2 ? 0.2 : 0);
    return out.copy(wetC).lerp(C('#6f8f4a'), smoothstep(1, SHORE, r.d));
  }

  /** Where the land is drawn finer: along both banks. */
  function detail(cell) {
    const pts = [];
    const every = Math.max(1, Math.round(Math.min(cell / 2.2, 8) / step));
    for (let i = 0; i < n; i += every) {
      if (halfW[i] < 2) continue;
      for (const sg of [1, -1]) {
        for (let d = -3; d <= SHORE + 2; d += Math.min(cell / 2.2, 5)) {
          const e = halfW[i] + d;
          // (The bank's edge, either side of the river's middle, across the river: the track's side vector.)
          pts.push({ x: cx[i] + tx[i] * sg * e, z: cz[i] + tz[i] * sg * e });
        }
      }
    }
    return pts;
  }

  /**
   * The river's water: a ribbon along its middle, the deeper colour in the middle, white where it
   * falls steeply. Drawn only where the land holds it (both banks no lower than the water), never
   * into the track. Triangles ({ pos, col }, flat lists) are drawn with the banks (kitGround.js).
   */
  function riverTriangles({ lite = false, corridor = null, groundAt = null } = {}) {
    const pos = [];
    const col = [];
    const water = C(pal.water);
    const deep = C(pal.deep);
    const foam = C(pal.foam);
    const seam = pal.seam ? pal.seam.map(C) : null;
    const glint = pal.glint ? C(pal.glint) : null;
    // (How steeply the water falls before it turns white: `rapids`, a palette's own, so a river beside a
    // steadily falling track stays water and only its real rapids foam.)
    const rapids = pal.rapids ?? [0.04, 0.22];
    const every = Math.max(1, Math.round((lite ? 7 : 3.5) / step));
    const across = lite ? [-1, 0, 1] : [-1, -0.5, 0, 0.5, 1];
    const pt = (i, f) => ({ x: cx[i] + tx[i] * f * (halfW[i] + 0.6), y: level[i], z: cz[i] + tz[i] * f * (halfW[i] + 0.6) });
    // (The land under it is the river's bed, never far below: water over a lower stretch or a valley would float.)
    const holds = (p) => !groundAt || groundAt(p.x, p.z) > p.y - BED - 2.2;
    const hits = (a, b, cc) => corridor && corridor.hitsTriangle(a, b, cc);
    for (let i = 0; i + every <= segments; i += every) {
      const j = i + every;
      if (halfW[i] < 2 || halfW[j] < 2) continue;
      const fall = (level[i] - level[j]) / (every * step);
      for (let k = 0; k + 1 < across.length; k += 1) {
        const a0 = pt(i, across[k]);
        const a1 = pt(i, across[k + 1]);
        const b0 = pt(j, across[k]);
        const b1 = pt(j, across[k + 1]);
        // (On the inside of a bend tighter than the river is wide, the ribbon would fold over itself: left out.)
        const c1 = (b0.x - a0.x) * (a1.z - a0.z) - (b0.z - a0.z) * (a1.x - a0.x);
        const c2 = (b1.x - a1.x) * (a1.z - a0.z) - (b1.z - a1.z) * (a1.x - a0.x);
        if (Math.sign(c1) !== Math.sign(c2)) continue;
        const mid = 1 - Math.abs((across[k] + across[k + 1]) / 2);
        // (A calm lowland river, `river.calm`: a little white water only where it falls steeply, so it reads as water.)
        // (Two rivers side by side without mixing: each half its own colour, the line between them sharp.)
        const base = seam ? seam[(across[k] + across[k + 1]) / 2 < 0 ? 0 : 1] : null;
        const white = calm ? 0.18 * smoothstep(0.12, 0.3, fall) : Math.min(0.65, smoothstep(rapids[0], rapids[1], fall) + (base ? 0 : 0.04 * Math.sin(i * 0.37 + k)));
        const c = base
          ? new Color().copy(base).lerp(glint ?? foam, glint ? 0.05 + 0.035 * Math.sin(i * 0.23 + k * 1.7) : 0).lerp(foam, Math.max(0, white))
          : new Color().copy(water).lerp(deep, mid * 0.8).lerp(foam, Math.max(0, white));
        for (const v of [[a0, b0, b1], [a0, b1, a1]]) {
          if (hits(...v) || !v.every(holds)) continue;
          for (const o of v) { pos.push(o.x, o.y, o.z); col.push(c.r, c.g, c.b); }
        }
        // (`glint`: pale streaks of sky on the water, along the current, so a brown or dark river reads as water.)
        if (seam && across[k + 1] === 0) {
          // (The line where the two waters meet: a narrow band of pale swirls.)
          const wI = 1.2 / (halfW[i] + 0.6);
          const wJ = 1.2 / (halfW[j] + 0.6);
          const up = (o) => ({ x: o.x, y: o.y + 0.03, z: o.z });
          const e = [up(pt(i, -wI)), up(pt(j, -wJ)), up(pt(j, wJ)), up(pt(i, wI))];
          const fc = new Color().copy(seam[1]).lerp(foam, 0.35 + 0.15 * Math.sin(i * 0.9));
          for (const v of [[e[0], e[1], e[2]], [e[0], e[2], e[3]]]) {
            if (hits(...v) || !v.every(holds)) continue;
            for (const o of v) { pos.push(o.x, o.y, o.z); col.push(fc.r, fc.g, fc.b); }
          }
        }
        if (glint && !lite && (k === 0 || k === across.length - 2)) {
          // (A pale line of ripples along each shore.)
          const edge = k === 0 ? across[0] : across[k + 1];
          const inI = edge - Math.sign(edge) * (1.6 / (halfW[i] + 0.6));
          const inJ = edge - Math.sign(edge) * (1.6 / (halfW[j] + 0.6));
          const up = (o) => ({ x: o.x, y: o.y + 0.03, z: o.z });
          const e = [up(pt(i, edge)), up(pt(j, edge)), up(pt(j, inJ)), up(pt(i, inI))];
          const fc = new Color().copy(c).lerp(foam, 0.5);
          for (const v of [[e[0], e[1], e[2]], [e[0], e[2], e[3]]]) {
            if (hits(...v) || !v.every(holds)) continue;
            for (const o of v) { pos.push(o.x, o.y, o.z); col.push(fc.r, fc.g, fc.b); }
          }
        }
        if (glint) {
          // (Short wavelets across the current, scattered at random: never in rows, so never a road's markings.)
          const n = lite ? 1 : 3;
          for (let g = 0; g < n; g += 1) {
            const h = Math.sin(i * 12.9898 + k * 78.233 + g * 37.719) * 43758.5453;
            const r = h - Math.floor(h);
            if (r > 0.45) continue;
            const f = across[k] + (across[k + 1] - across[k]) * ((r * 7.31) % 1);
            const pa = pt(i, f);
            const pb = pt(j, f);
            const s0 = (r * 3.17) % 1;
            const m = { x: pa.x + (pb.x - pa.x) * s0, y: pa.y + (pb.y - pa.y) * s0 + 0.04, z: pa.z + (pb.z - pa.z) * s0 };
            const fl = Math.hypot(pb.x - pa.x, pb.z - pa.z) || 1;
            const ax = (pb.x - pa.x) / fl;
            const az = (pb.z - pa.z) / fl;
            const tilt = ((r * 13.7) % 1) - 0.5; // (a wavelet lies roughly across the flow, never square to it)
            const cxv = -az + ax * tilt;
            const czv = ax + az * tilt;
            const cl = Math.hypot(cxv, czv);
            const L = (lite ? 1.6 : 1.1) + ((r * 9.13) % 1) * (lite ? 1.8 : 1.4);
            const W = lite ? 0.35 : 0.22;
            const ux = (cxv / cl) * L;
            const uz = (czv / cl) * L;
            const q = [
              { x: m.x - ux - ax * W, y: m.y, z: m.z - uz - az * W }, { x: m.x + ux - ax * W, y: m.y, z: m.z + uz - az * W },
              { x: m.x + ux * 0.8 + ax * W, y: m.y, z: m.z + uz * 0.8 + az * W }, { x: m.x - ux * 0.8 + ax * W, y: m.y, z: m.z - uz * 0.8 + az * W },
            ];
            const gc = new Color().copy(c).lerp(glint, 0.22 + 0.22 * ((r * 5.7) % 1));
            for (const v of [[q[0], q[1], q[2]], [q[0], q[2], q[3]]]) {
              if (hits(...v) || !v.every(holds)) continue;
              for (const o of v) { pos.push(o.x, o.y, o.z); col.push(gc.r, gc.g, gc.b); }
            }
          }
        }
      }
    }
    return pos.length ? { pos, col } : null;
  }

  /** Can trees and rocks stand here? Not in the water, nor on the wet shore. */
  function dressable(x, z) {
    const r = riverAt(x, z, gridAt(x, z));
    return !r || r.d > 3;
  }
  /** Is (x, z) by the water, on the shore (for reeds)? */
  const onShore = (x, z) => {
    const r = riverAt(x, z, gridAt(x, z));
    return Boolean(r && r.d > 0.5 && r.d < 4);
  };

  return {
    heightAt, colourAt, detail, riverTriangles, dressable, onShore, palette: pal, width,
    centreAt: (i) => ({ x: cx[i], z: cz[i] }), waterAt: (i) => level[i], halfAt: (i) => halfW[i], offsetAt: (i) => off[i],
    sideVec: (i) => ({ x: tx[i], z: tz[i] }),
  };
}
