/**
 * Peaks (kit tracks of the peak family; Moses, 25 Oct 2026, plan: project doc claude/rivers-and-peaks-plan.md,
 * section 2): a run down one of the world's great mountains, from its snow and ice down through its own zones,
 * under its own sky. The track runs on the mountain's snow unless a section flies (a coaster, as every series
 * built on the ground): along a knife-edge ridge (the land falls away steeply on both sides), over a crevasse
 * (a dark slot cut across under it, crossed on a ladder or an ice-arch bridge: structures.js).
 *
 * Looks only: the race never sees any of it.
 *
 * Respect for mountains held sacred (the plan, 2): the summit is scenery, never track. It stands in the far
 * backdrop (one far mesh, `buildPeakBackdrop`), with nothing of ours on it: no cairn, sign, flag or prop.
 *
 * Phone budget (plan 2.1; at most 32 calls, 55k triangles at the busiest): the ground is one mesh (its zones,
 * snow, ice, rock, moraine and crevasses in vertex colours), the backdrop one mesh, the sea of clouds one mesh,
 * the spindrift one point cloud.
 */
import {
  AdditiveBlending, BufferGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute, IcosahedronGeometry,
  Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial, Points, PointsMaterial, Quaternion, SphereGeometry, Vector3,
} from 'three';
import { merge, piece, smoothstep } from './parts';

/**
 * Each mountain's colours and what it shows: `zone` the land's default zone (a section's `peak.zone` overrides it
 * near that section), `zones` each zone's colours ([flat, steep]), `snow`/`ice`/`rock` the shared ground colours,
 * `crevasses` whether the glacier near the track shows crevasse lines and moraine stripes, `summits` the backdrop's
 * mountains ({ bearing: radians from the track's mean heading, dist: metres out, height, radius, snowline: share
 * of the height, colour }), `plume` a snow plume streaming off the first summit, `dressing` what stands on the land,
 * per zone, as [kind, share].
 */
export const PEAK_PALETTES = {
  // Everest's icefall: blue-white seracs and snow, dark rock, the great pyramid in the backdrop with its plume.
  everest: {
    zone: 'ice', crevasses: true, plume: true,
    snow: '#f2f6fa', snowShade: '#cfdbe8', ice: '#a9d4ec', iceDeep: '#5f9fca', rock: '#55524f', rockDark: '#3d3a38', moraine: '#8a8580',
    summits: [
      { bearing: 0, dist: 1500, height: 820, radius: 520, snowline: 0.22, colour: '#5f5a56' },
      { bearing: 0.55, dist: 1450, height: 560, radius: 430, snowline: 0.2, colour: '#66605b' },
      { bearing: -0.6, dist: 1500, height: 620, radius: 460, snowline: 0.2, colour: '#625c58' },
    ],
    dressing: { ice: [['serac', 0.55], ['snow-rock', 0.45]], snow: [['snow-rock', 0.7], ['serac', 0.3]], rock: [['boulder', 0.7], ['snow-rock', 0.3]] },
  },
  // Mont Blanc: granite needles, a wide glacier, larch and pine low down; alpenglow in the backdrop.
  'mont-blanc': {
    zone: 'snow', crevasses: true,
    snow: '#f4f7fb', snowShade: '#d2dce8', ice: '#b4d8ec', iceDeep: '#6aa6cc', rock: '#7a6a62', rockDark: '#57493f', moraine: '#8f877e',
    summits: [
      { bearing: 0.15, dist: 1350, height: 640, radius: 560, snowline: 0.25, colour: '#6f6058' },
      { bearing: -0.45, dist: 1300, height: 520, radius: 300, snowline: 0.55, colour: '#7a675c', needle: true },
      { bearing: 0.7, dist: 1350, height: 480, radius: 280, snowline: 0.6, colour: '#6f5f56', needle: true },
    ],
    dressing: { snow: [['snow-rock', 0.6], ['pine', 0.4]], ice: [['serac', 0.4], ['snow-rock', 0.6]], rock: [['boulder', 0.6], ['pine', 0.4]] },
  },
  // Vinson: a wide plain of wind-polished blue ice, dark nunataks, the low sun circling all night.
  vinson: {
    zone: 'ice', crevasses: false,
    snow: '#f5f8fb', snowShade: '#d6e1ec', ice: '#8cc4e8', iceDeep: '#4f92c4', rock: '#3a3633', rockDark: '#262321', moraine: '#6f6a66',
    summits: [
      { bearing: 0.1, dist: 1500, height: 560, radius: 650, snowline: 0.12, colour: '#3a3633' },
      { bearing: -0.75, dist: 1400, height: 380, radius: 420, snowline: 0.15, colour: '#3d3936' },
      { bearing: 0.85, dist: 1450, height: 420, radius: 480, snowline: 0.15, colour: '#36322f' },
    ],
    dressing: { ice: [['sastrugi', 0.7], ['nunatak', 0.3]], snow: [['sastrugi', 0.8], ['nunatak', 0.2]], rock: [['nunatak', 0.6], ['boulder', 0.4]] },
  },
  // Kilimanjaro: the crater's ice cliffs high above, the zones below (alpine desert, moorland with giant
  // groundsels, heath, cloud forest), a sea of clouds round it at sunrise. Nothing on the summit.
  kilimanjaro: {
    zone: 'alpine-desert', crevasses: false,
    snow: '#f4f6f8', snowShade: '#d8dee6', ice: '#d6ecf6', iceDeep: '#9ccbe4', rock: '#6a5f58', rockDark: '#4a423c', moraine: '#8a7f74',
    summits: [
      { bearing: Math.PI, dist: 1400, height: 760, radius: 900, snowline: 0.82, colour: '#5a4f48', flat: true },
      { bearing: Math.PI - 0.9, dist: 1500, height: 420, radius: 420, snowline: 1.1, colour: '#5f544c' },
    ],
    dressing: {
      'alpine-desert': [['boulder', 0.7], ['scree-rock', 0.3]], moorland: [['groundsel', 0.6], ['tussock', 0.4]],
      heath: [['heather', 0.7], ['groundsel', 0.3]], 'cloud-forest': [['forest-tree', 0.8], ['heather', 0.2]],
      ice: [['snow-rock', 1]], snow: [['snow-rock', 1]], rock: [['boulder', 1]],
    },
  },
  // Vatnajökull: the ice cap's front, black volcanic sand and braided meltwater streams, under a grey arctic sky.
  vatnajokull: {
    zone: 'black-sand', crevasses: true,
    snow: '#eef3f7', snowShade: '#c9d4de', ice: '#9fd2ec', iceDeep: '#4f96c8', rock: '#2e2c2b', rockDark: '#1f1e1d', moraine: '#4f4c4a',
    summits: [
      { bearing: 0.0, dist: 1300, height: 360, radius: 1100, snowline: 0.05, colour: '#3a3836', cap: true },
      { bearing: 0.9, dist: 1400, height: 300, radius: 700, snowline: 0.2, colour: '#353331' },
      { bearing: -0.9, dist: 1400, height: 280, radius: 650, snowline: 0.25, colour: '#3a3836' },
    ],
    dressing: { 'black-sand': [['moss-rock', 0.7], ['boulder', 0.3]], ice: [['serac', 0.4], ['snow-rock', 0.6]], snow: [['snow-rock', 1]], rock: [['boulder', 1]] },
  },
};

/** The zones' own colours: [flat land, steep land]. (`snow`, `ice`, `rock` come from the palette.) */
const ZONE_COLOURS = {
  'alpine-desert': ['#8f8378', '#6f655c'],
  moorland: ['#a8a05a', '#7f7a4a'],
  heath: ['#6f7f42', '#55603a'],
  'cloud-forest': ['#3f6a34', '#2f522a'],
  'black-sand': ['#2c2b2b', '#3a3836'],
};

const GRID = 10;            // metres: the lookup grid of the nearest track sample
const RIDGE_EASE_M = 25;    // metres along the track over which a ridge eases in and out
const RIDGE_CREST = 4.5;    // metres: a ridge's crest lies this far under the track
const RIDGE_FALL = 1.35;    // the land falls away from the crest this steeply (metres down per metre out)
const CREVASSE_HALF = 4.5;  // metres: half a crevasse's width (along the track)
const CREVASSE_REACH = 55;  // metres: how far a crevasse runs out either side of the track
const CREVASSE_DEPTH = 22;  // metres below the land at the track

/**
 * The mountain shaped round the track: { heightAt(x, z, base), colourAt(x, y, z, steep), dressable(x, z),
 * zoneAt(x, z), palette, crevasses (their spots, for the bridges) }.
 */
export function makePeak(centerline, channel, kit, { flight, liftAt, bounds }) {
  const pal = PEAK_PALETTES[kit.peak?.palette] ?? PEAK_PALETTES.everest;
  const { samples, segments } = centerline;
  const step = channel.arc / segments;
  const n = segments + 1;
  const px = new Float64Array(n);
  const pz = new Float64Array(n);
  const ty = new Float64Array(n);
  const gy = new Float64Array(n);
  const ridgeRaw = new Float64Array(n);
  const zoneOf = new Array(n);
  for (let i = 0; i < n; i += 1) {
    const s = samples[i];
    px[i] = s.pos.x;
    pz[i] = s.pos.z;
    ty[i] = s.pos.y;
    gy[i] = s.pos.y - (flight ? flight[i] : 0) + liftAt(i) - 0.85;
    const p = i / segments;
    const sec = (kit.sections ?? []).find((x) => p >= x.from && p <= x.to);
    ridgeRaw[i] = sec?.peak?.ridge ? 1 : 0;
    zoneOf[i] = sec?.peak?.zone ?? pal.zone;
  }
  // A ridge eases in and out along the track.
  const ridge = new Float64Array(n);
  const reach = Math.max(1, Math.round(RIDGE_EASE_M / step));
  for (let i = 0; i < n; i += 1) {
    let best = 0;
    for (let k = Math.max(0, i - reach); k <= Math.min(segments, i + reach); k += 1) {
      if (ridgeRaw[k]) best = Math.max(best, 1 - Math.abs(k - i) / reach);
    }
    ridge[i] = smoothstep(0, 1, best);
  }
  // The crevasses: one across the middle of each section that crosses one.
  const crevasses = [];
  for (const sec of kit.sections ?? []) {
    if (!sec.peak?.crevasse) continue;
    const i = Math.round(((sec.from + sec.to) / 2) * segments);
    const s = samples[i];
    const along = new Vector3(s.tangent.x, 0, s.tangent.z).normalize();
    const side = new Vector3(s.side.x, 0, s.side.z).normalize();
    crevasses.push({ i, x: px[i], z: pz[i], ax: along.x, az: along.z, sx: side.x, sz: side.z, floor: gy[i] - CREVASSE_DEPTH, kind: sec.peak.crevasse, from: sec.from, to: sec.to });
  }

  // The lookup grid: the nearest kept track sample for each square.
  const minX = bounds.minX;
  const minZ = bounds.minZ;
  const gw = Math.ceil((bounds.maxX - minX) / GRID) + 1;
  const gh = Math.ceil((bounds.maxZ - minZ) / GRID) + 1;
  const gTrack = new Int32Array(gw * gh);
  {
    const every = Math.max(1, Math.round(5 / step));
    const keep = [];
    for (let i = 0; i < n; i += every) keep.push(i);
    if (keep[keep.length - 1] !== segments) keep.push(segments);
    for (let gz = 0; gz < gh; gz += 1) {
      const z = minZ + gz * GRID;
      for (let gx = 0; gx < gw; gx += 1) {
        const x = minX + gx * GRID;
        let best = Infinity;
        let bi = 0;
        for (const i of keep) { const d = (px[i] - x) ** 2 + (pz[i] - z) ** 2; if (d < best) { best = d; bi = i; } }
        gTrack[gz * gw + gx] = bi;
      }
    }
  }
  const gridAt = (x, z) => {
    const gx = Math.min(gw - 1, Math.max(0, Math.round((x - minX) / GRID)));
    const gz = Math.min(gh - 1, Math.max(0, Math.round((z - minZ) / GRID)));
    return gz * gw + gx;
  };
  const window = Math.ceil((GRID * 2 + 30) / step) + 2;
  const nearest = (x, z) => {
    const i0 = gTrack[gridAt(x, z)];
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
    return { d: Math.sqrt(best), i: bi, u: bu };
  };
  const lerp = (arr, c) => arr[c.i] + (arr[Math.min(segments, c.i + 1)] - arr[c.i]) * c.u;
  // How deep in a crevasse (x, z) is: 0 outside, 1 in its middle.
  const inCrevasse = (x, z, pad = 0) => {
    let best = 0;
    for (const c of crevasses) {
      const a = Math.abs((x - c.x) * c.ax + (z - c.z) * c.az);
      const b = Math.abs((x - c.x) * c.sx + (z - c.z) * c.sz);
      if (a > CREVASSE_HALF + pad || b > CREVASSE_REACH + pad) continue;
      best = Math.max(best, (1 - smoothstep(CREVASSE_HALF - 2, CREVASSE_HALF, a)) * (1 - smoothstep(CREVASSE_REACH - 10, CREVASSE_REACH, b)));
    }
    return best;
  };

  /** The land's height at (x, z), given the ordinary land's `base` there. */
  function heightAt(x, z, base) {
    let h = base;
    const c = nearest(x, z);
    const r = lerp(ridge, c);
    if (r > 0.01) {
      // A knife-edge ridge: the crest just under the track, the land falling away steeply on both sides.
      const crest = lerp(ty, c) - RIDGE_CREST;
      const profile = crest - RIDGE_FALL * Math.max(0, c.d - 3);
      const shaped = Math.min(base, profile) + (profile - Math.min(base, profile)) * (1 - smoothstep(6, 22, c.d));
      h += (shaped - h) * r;
    }
    if (crevasses.length) {
      const k = inCrevasse(x, z);
      if (k > 0) {
        let floor = Infinity;
        for (const cv of crevasses) floor = Math.min(floor, cv.floor);
        h += (Math.min(h, floor) - h) * k;
      }
    }
    return h;
  }

  const C = (hex) => new Color(hex);
  const SNOW = C(pal.snow);
  const SNOW_SHADE = C(pal.snowShade);
  const ICE = C(pal.ice);
  const ICE_DEEP = C(pal.iceDeep);
  const ROCK = C(pal.rock);
  const ROCK_DARK = C(pal.rockDark);
  const MORAINE = C(pal.moraine);
  const zoneCols = Object.fromEntries(Object.entries(ZONE_COLOURS).map(([k, [a, b]]) => [k, [C(a), C(b)]]));
  const STREAM = C('#9fc4d4');
  const out = new Color();
  const hash = (x, z, s = 9) => {
    const v = Math.sin(Math.floor(x / s) * 12.9898 + Math.floor(z / s) * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  /** A triangle's colour at its middle (`rise`: metres between its highest and lowest corner; `span`: its widest reach). */
  function colourAt(x, y, z, rise, span = 0) {
    const steep = span > 0.5 ? rise / span : rise; // (metres up per metre across)
    if (crevasses.length && inCrevasse(x, z, 1) > 0.3) return out.copy(ICE_DEEP).lerp(ROCK_DARK, 0.35);
    const c = nearest(x, z);
    const i = Math.min(segments, c.i + (c.u > 0.5 ? 1 : 0));
    const zone = zoneOf[i];
    const noise = hash(x, z);
    const cliff = steep > 1.15;
    if (zone === 'snow' || zone === 'ice' || zone === 'rock') {
      if (cliff || zone === 'rock') return out.copy(noise > 0.5 ? ROCK : ROCK_DARK).lerp(SNOW, zone === 'rock' && !cliff ? 0.15 : 0.05);
      if (steep > 0.75) return out.copy(SNOW_SHADE).lerp(ROCK, 0.45 * smoothstep(0.75, 1.15, steep));
      // The glacier near the track: crevasse lines across it and moraine stripes along it, blue ice in patches.
      if (pal.crevasses && c.d > 12 && c.d < 140 && steep < 0.45) {
        const s = samples[i];
        const along = (x - px[i]) * s.tangent.x + (z - pz[i]) * s.tangent.z;
        const across = Math.abs((x - px[i]) * s.side.x + (z - pz[i]) * s.side.z);
        if (((along % 19) + 19) % 19 < 1.1 && across > 18) return out.copy(ICE_DEEP).lerp(ROCK_DARK, 0.2);
        if (Math.abs((across % 70) - 48) < 3) return out.copy(MORAINE).lerp(ROCK_DARK, noise * 0.3);
      }
      // (Blue ice in broad patches, snow between them: cells of 40 m, never a speckle of single triangles.)
      const patch = hash(x + 17, z - 31, 40);
      if (zone === 'ice' && patch > 0.5) return out.copy(ICE).lerp(SNOW, 0.25 + (patch - 0.5) * 0.9);
      return out.copy(SNOW).lerp(SNOW_SHADE, smoothstep(0.15, 0.6, steep) * 0.8 + hash(x, z, 25) * 0.15);
    }
    const [flat, slope] = zoneCols[zone] ?? [ROCK, ROCK_DARK];
    if (cliff) return out.copy(ROCK).lerp(ROCK_DARK, noise);
    if (zone === 'black-sand') {
      // Braided meltwater streams across the black sand, pale and winding.
      const w = Math.sin(x * 0.045 + Math.sin(z * 0.02) * 2.2) + Math.sin(z * 0.05 + x * 0.013);
      if (Math.abs(w) < 0.09 && steep < 0.3) return out.copy(STREAM);
    }
    return out.copy(flat).lerp(slope, Math.min(1, steep * 0.9 + (noise - 0.5) * 0.25));
  }

  /** Whether something may stand at (x, z): never in a crevasse. */
  function dressable(x, z) {
    return !(crevasses.length && inCrevasse(x, z, 3) > 0);
  }

  /** The zone at (x, z): its nearest stretch of track's. */
  function zoneAt(x, z) {
    const c = nearest(x, z);
    return zoneOf[Math.min(segments, c.i + (c.u > 0.5 ? 1 : 0))];
  }

  return { heightAt, colourAt, dressable, zoneAt, palette: pal, crevasses };
}

/** What stands on a mountain's land, as kit.js's dressing kinds: { kinds: [[make(lite), share]], byZone: zone → [[index, share]] }. */
export function peakDressing(paletteKey) {
  const pal = PEAK_PALETTES[paletteKey] ?? PEAK_PALETTES.everest;
  const T = (x, y, z, sx = 1, sy = 1, sz = 1, ry = 0) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), ry), new Vector3(sx, sy, sz));
  const make = {
    // A snow-rimed rock: dark stone under a cap of snow.
    'snow-rock': () => () => merge([
      piece(new IcosahedronGeometry(1.4, 0), pal.rock, T(0, 0.4, 0, 1.3, 0.8, 1.1)),
      piece(new IcosahedronGeometry(1.1, 0), pal.snow, T(0.1, 1, 0, 1.2, 0.35, 1)),
    ]),
    boulder: () => () => merge([piece(new IcosahedronGeometry(1.5, 0), pal.rockDark, T(0, 0.5, 0, 1.3, 0.8, 1.1))]),
    'scree-rock': () => () => merge([
      piece(new IcosahedronGeometry(0.7, 0), pal.rock, T(0, 0.2, 0)), piece(new IcosahedronGeometry(0.5, 0), pal.rockDark, T(1, 0.15, 0.4)),
    ]),
    // A leaning block of glacier ice.
    serac: () => () => merge([
      piece(new IcosahedronGeometry(2.2, 0), pal.ice, T(0, 1.6, 0, 1, 1.5, 0.9)),
      piece(new IcosahedronGeometry(1.4, 0), pal.snow, T(0.4, 3.4, 0, 1, 0.4, 0.9)),
    ]),
    // A dark rock spire out of the ice, snow on its shoulders.
    nunatak: () => () => merge([
      piece(new ConeGeometry(3.2, 9, 5), pal.rock, T(0, 4, 0)),
      piece(new ConeGeometry(1.8, 3, 5), pal.snow, T(0.3, 6.6, 0, 1, 1, 1, 0.4)),
    ]),
    // Sastrugi: wind-carved ridges in the snow, low and white.
    sastrugi: () => () => merge([
      piece(new ConeGeometry(0.9, 4, 3), pal.snowShade, T(0, 0.25, 0, 1, 0.12, 1, 0.3).multiply(new Matrix4().makeRotationZ(Math.PI / 2))),
      piece(new ConeGeometry(0.7, 3, 3), pal.snow, T(1.2, 0.2, 0.9, 1, 0.12, 1, 0.6).multiply(new Matrix4().makeRotationZ(Math.PI / 2))),
    ]),
    pine: () => (lite) => merge([
      piece(new CylinderGeometry(0.18, 0.28, 2, 5, 1, true), '#5a4632', T(0, 1, 0)),
      piece(new ConeGeometry(1.9, 4.6, lite ? 5 : 7), '#2f5a3a', T(0, 3.6, 0)),
      ...(lite ? [] : [piece(new ConeGeometry(1.2, 1.4, 7), pal.snow, T(0, 5.3, 0))]),
    ]),
    // A giant groundsel of the high moorland: a thick trunk in its skirt of dead leaves, rosettes on top.
    groundsel: () => (lite) => merge([
      piece(new CylinderGeometry(0.45, 0.5, 2.6, 6), '#b8ae8e', T(0, 1.3, 0)),
      piece(new CylinderGeometry(0.25, 0.32, 1.6, 5), '#8a8a7a', T(0, 3.2, 0)),
      piece(new IcosahedronGeometry(0.9, 0), '#5f8f3e', T(0, 4.2, 0, 1, 0.55, 1)),
      ...(lite ? [] : [piece(new CylinderGeometry(0.2, 0.25, 1.2, 5), '#8a8a7a', T(0.7, 3.4, 0, 1, 1, 1).multiply(new Matrix4().makeRotationZ(-0.4))), piece(new IcosahedronGeometry(0.7, 0), '#5f8f3e', T(1, 4, 0, 1, 0.55, 1))]),
    ]),
    tussock: () => () => merge([piece(new ConeGeometry(0.9, 1, 5), '#b8a85a', T(0, 0.45, 0))]),
    heather: () => () => merge([piece(new IcosahedronGeometry(1.1, 0), '#6f7f42', T(0, 0.6, 0, 1.4, 0.8, 1.3)), piece(new IcosahedronGeometry(0.6, 0), '#a87fa0', T(0.5, 1, 0.2, 1, 0.6, 1))]),
    'forest-tree': () => (lite) => merge([
      piece(new CylinderGeometry(0.3, 0.45, 4, 5, 1, true), '#5a4632', T(0, 2, 0)),
      piece(new IcosahedronGeometry(2.8, lite ? 0 : 1), '#3a6a32', T(0, 5.4, 0, 1, 0.85, 1)),
      ...(lite ? [] : [piece(new ConeGeometry(1.2, 2.6, 5, 1, true), '#8a9a6a', T(0.6, 4, 0))]), // (moss hanging from it)
    ]),
    // A mossy lava rock on the black sand.
    'moss-rock': () => () => merge([piece(new IcosahedronGeometry(1.2, 0), '#2f2d2c', T(0, 0.35, 0, 1.4, 0.6, 1.2)), piece(new IcosahedronGeometry(0.9, 0), '#6f8a4a', T(0.2, 0.7, 0, 1.2, 0.3, 1))]),
  };
  const names = [...new Set(Object.values(pal.dressing).flatMap((list) => list.map(([k]) => k)))];
  const kinds = names.map((k) => [make[k](), 0]);
  const byZone = Object.fromEntries(Object.entries(pal.dressing).map(([zone, list]) => [zone, list.map(([k, share]) => [names.indexOf(k), share])]));
  return { kinds, byZone };
}

/** One kind from a zone's list by `pick` (0 to 1), or -1. */
export function pickKind(byZone, zone, pick) {
  const list = byZone[zone] ?? byZone.snow ?? Object.values(byZone)[0];
  let acc = 0;
  for (const [k, share] of list) if ((acc += share) >= pick) return k;
  return list.length ? list[list.length - 1][0] : -1;
}

/**
 * The mountain itself and its neighbours as one far mesh round the scene (the summit lives here, never on the
 * track), and a ring of lesser mountains all round: low triangles, no shadows. Its first summit stands ahead of
 * the track's mean heading, where the follow camera looks; a `plume` streams off it (Everest).
 * → { mesh, plume } (plume: a faint see-through mesh, or null).
 */
export function buildPeakBackdrop(centerline, kit, { lite = false, floorY = -66 } = {}) {
  const pal = PEAK_PALETTES[kit.peak?.palette] ?? PEAK_PALETTES.everest;
  const { samples } = centerline;
  const centre = new Vector3();
  let hx = 0;
  let hz = 0;
  for (const s of samples) { centre.add(s.pos); hx += s.tangent.x; hz += s.tangent.z; }
  centre.multiplyScalar(1 / samples.length);
  const heading = Math.atan2(hx, hz);
  let spread = 0;
  for (const s of samples) spread = Math.max(spread, Math.hypot(s.pos.x - centre.x, s.pos.z - centre.z));
  const topY = Math.max(...samples.map((s) => s.pos.y));
  const parts = [];
  const mountain = (bearing, dist, height, radius, snowline, colour, { needle = false, flat = false, cap = false, seed = 1, haze = 0 } = {}) => {
    const a = heading + bearing;
    const at = new Vector3(centre.x + Math.sin(a) * (spread + dist), floorY, centre.z + Math.cos(a) * (spread + dist));
    const segs = lite ? 7 : 9;
    const rings = lite ? 3 : 5;
    // A rough cone (a dome with a crater rim for a flat-topped volcano, a broad dome for an ice cap, a slender spire for a needle).
    const geo = new ConeGeometry(radius, height, segs, rings, false);
    const pos = geo.getAttribute('position');
    const colours = [];
    const rock = new Color(colour).lerp(new Color(pal.snowShade), haze); // (the far ring's rock in the haze of distance: never a black wall)
    const snow = new Color(pal.snow);
    const shade = new Color(pal.snowShade);
    for (let k = 0; k < pos.count; k += 1) {
      let x = pos.getX(k);
      let y = pos.getY(k) + height / 2; // 0 at the foot, `height` at the top
      let z = pos.getZ(k);
      const t = y / height;
      const wob = Math.sin(k * 2.7 + seed) * 0.12 + Math.sin(k * 1.3 + seed * 2) * 0.06;
      if (t > 0.02 && t < 0.98) { x *= 1 + wob; z *= 1 + wob; y *= 1 + wob * 0.3; }
      if (flat && t > 0.8) y = height * 0.8 + (y - height * 0.8) * 0.15; // (a flat crater top)
      if (cap) y = height * Math.sqrt(Math.max(0, 1 - (1 - t) ** 2)) * 0.6; // (a broad ice cap)
      if (needle) { x *= 1 - t * 0.35; z *= 1 - t * 0.35; }
      pos.setXYZ(k, x, y, z);
    }
    geo.translate(at.x, at.y, at.z);
    const nonIndexed = geo.toNonIndexed();
    const p2 = nonIndexed.getAttribute('position');
    for (let k = 0; k < p2.count; k += 3) {
      const y = (p2.getY(k) + p2.getY(k + 1) + p2.getY(k + 2)) / 3 - floorY;
      const c = y / height > snowline ? ((k / 3) % 3 ? snow : shade) : rock;
      for (let j = 0; j < 3; j += 1) colours.push(c.r, c.g, c.b);
    }
    nonIndexed.setAttribute('color', new Float32BufferAttribute(colours, 3));
    nonIndexed.deleteAttribute('uv');
    nonIndexed.deleteAttribute('normal');
    parts.push(nonIndexed);
    return { at, height };
  };
  const main = pal.summits.map((s, k) => mountain(s.bearing, s.dist, s.height, s.radius, s.snowline, s.colour, { needle: s.needle, flat: s.flat, cap: s.cap, seed: k + 1 }));
  // The lesser mountains all round, lower, beyond the land (never in front of the first summit).
  const ring = lite ? 9 : 14;
  for (let k = 0; k < ring; k += 1) {
    const b = (k / ring) * Math.PI * 2 + 0.2;
    const off = Math.abs(((b + Math.PI) % (Math.PI * 2)) - Math.PI);
    if (off < 0.35) continue;
    mountain(b, 1700 + (k % 3) * 160, 220 + ((k * 37) % 5) * 50 + Math.max(0, topY - floorY) * 0.2, 420 + (k % 4) * 70, 0.18, pal.rock, { seed: k + 9, haze: 0.35 });
  }
  const geometry = merge(parts);
  geometry.computeVertexNormals();
  const mesh = new Mesh(geometry, new MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  mesh.name = 'peak backdrop';
  mesh.frustumCulled = false;
  mesh.userData.backdrop = true;
  let plume = null;
  if (pal.plume && main[0]) {
    // A snow plume streaming off the first summit downwind: a few long, faint, flattened puffs.
    const { at, height } = main[0];
    const puffs = [];
    const wind = new Vector3(Math.cos(heading), 0, -Math.sin(heading));
    for (let k = 0; k < (lite ? 4 : 7); k += 1) {
      const c = at.clone().addScaledVector(wind, 90 + k * 120).setY(at.y + height * (0.97 - k * 0.025));
      puffs.push(piece(new SphereGeometry(70 + k * 14, 8, 5), '#ffffff', new Matrix4().compose(c, new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), heading + Math.PI / 2), new Vector3(1.9, 0.35, 0.8))));
    }
    plume = new Mesh(merge(puffs), new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.32, depthWrite: false, fog: true }));
    plume.name = 'peak plume';
    plume.frustumCulled = false;
  }
  return { mesh, plume };
}

/**
 * A sea of clouds below the track (a section's or the finish's `scenery: 'sea-of-clouds'`): cloud tops covering
 * the far valleys, at `y` (under the track's lowest point), opaque and soft-shaded, one mesh. The land near the
 * track rises through it, so the clouds lie only where the land falls away.
 */
export function buildSeaOfClouds(centerline, { y, lite = false, radius = 1500 } = {}) {
  const { samples } = centerline;
  const centre = new Vector3();
  for (const s of samples) centre.add(s.pos);
  centre.multiplyScalar(1 / samples.length);
  const rings = lite ? 10 : 18;
  const segs = lite ? 24 : 40;
  const pos = [];
  const col = [];
  const top = new Color('#ffffff');
  const shade = new Color('#e3e9f2');
  const at = (r, a) => {
    const bump = r > 0 ? (Math.sin(a * 7 + r * 0.01) + Math.sin(a * 13 + r * 0.023)) * 4 + Math.sin(r * 0.02) * 3 : 0;
    return new Vector3(centre.x + Math.sin(a) * r, y + bump, centre.z + Math.cos(a) * r);
  };
  for (let i = 0; i < rings; i += 1) {
    const r0 = (radius * i) / rings;
    const r1 = (radius * (i + 1)) / rings;
    for (let j = 0; j < segs; j += 1) {
      const a0 = (j / segs) * Math.PI * 2;
      const a1 = ((j + 1) / segs) * Math.PI * 2;
      const quad = [at(r0, a0), at(r1, a0), at(r1, a1), at(r0, a1)];
      for (const [p, q, r] of [[quad[0], quad[1], quad[2]], [quad[0], quad[2], quad[3]]]) {
        const c = (i + j) % 3 ? top : shade;
        for (const v of [p, q, r]) { pos.push(v.x, v.y, v.z); col.push(c.r, c.g, c.b); }
      }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  const mesh = new Mesh(g, new MeshLambertMaterial({ vertexColors: true, side: DoubleSide }));
  mesh.name = 'sea of clouds';
  mesh.userData.ground = true;
  return mesh;
}

/**
 * Spindrift: snow blown off the outside of the track's fast bends and the lips of its drops, on the race clock
 * (looks only), as one point cloud. → { points, update(t) }.
 */
export function buildSpindrift(centerline, channel, kit, { lite = false } = {}) {
  const { samples, segments } = centerline;
  const spots = [];
  for (const sec of kit.sections ?? []) {
    if (!['sweep', 'plunge', 'sBends', 'spiral'].includes(sec.shape)) continue;
    if (sec.tunnel) continue;
    const i = Math.round(((sec.from + sec.to) / 2) * segments);
    const s = samples[i];
    // (On the outside of a bend: away from its centre; a drop's lip either side.)
    const k = Math.min(segments, i + 4);
    const turn = Math.sign((samples[k].tangent.x - s.tangent.x) * s.side.x + (samples[k].tangent.z - s.tangent.z) * s.side.z) || 1;
    spots.push({ x: s.pos.x - s.side.x * turn * 6, y: s.pos.y + 0.6, z: s.pos.z - s.side.z * turn * 6, ax: s.tangent.x, az: s.tangent.z, sx: -s.side.x * turn, sz: -s.side.z * turn });
  }
  if (!spots.length) return null;
  const per = lite ? 14 : 40;
  const count = spots.length * per;
  const base = new Float32Array(count * 3);
  const vel = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  for (let k = 0; k < count; k += 1) {
    const sp = spots[Math.floor(k / per)];
    const r = Math.sin(k * 12.9898) * 43758.5453;
    const f = r - Math.floor(r);
    const g = Math.sin(k * 78.233) * 9573.21;
    const h = g - Math.floor(g);
    base[k * 3] = sp.x + sp.ax * (f - 0.5) * 30;
    base[k * 3 + 1] = sp.y;
    base[k * 3 + 2] = sp.z + sp.az * (f - 0.5) * 30;
    vel[k * 3] = sp.sx * (3 + h * 4) + sp.ax * 2;
    vel[k * 3 + 1] = 1.5 + h * 2.5;
    vel[k * 3 + 2] = sp.sz * (3 + h * 4) + sp.az * 2;
    phase[k] = f * 3;
  }
  const g = new BufferGeometry();
  const pos = new Float32Array(count * 3);
  pos.set(base);
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  const points = new Points(g, new PointsMaterial({ color: '#ffffff', size: lite ? 0.55 : 0.4, transparent: true, opacity: 0.75, depthWrite: false, blending: AdditiveBlending }));
  points.name = 'spindrift';
  points.frustumCulled = false;
  const update = (t) => {
    const a = g.getAttribute('position');
    const sec = Math.max(0, t) / 1000;
    for (let k = 0; k < count; k += 1) {
      const life = (sec + phase[k]) % 3;
      a.array[k * 3] = base[k * 3] + vel[k * 3] * life;
      a.array[k * 3 + 1] = base[k * 3 + 1] + vel[k * 3 + 1] * life - 1.2 * life * life;
      a.array[k * 3 + 2] = base[k * 3 + 2] + vel[k * 3 + 2] * life;
    }
    a.needsUpdate = true;
  };
  update(0);
  return { points, update };
}
