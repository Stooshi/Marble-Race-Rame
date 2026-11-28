/**
 * The marbles hub's marble illustrations (Moses, 26 Oct 2026: images made in the game's own style).
 *
 * Each marble type is painted the way the game paints its marbles (src/shared/marbles): flat colour
 * straight out, no lighting model, with the game's own shine laid on top (badge.js GLOSS_LAYERS,
 * painted by paint.js rasterize). Where the game already has the type (steelie, clearie, cat's eye,
 * corkscrew), its own look is used. The rest are painted here on the ball, from what collectors'
 * guides say they look like (the marble types article and its sources): a clay marble's dull, uneven
 * body, a Bennington's glaze and "eyes", a china's painted lines, an agate's bands, a handmade
 * swirl's threads and pontil, an onionskin's packed streaks, a Lutz's glittering bands, a sulphide's
 * white figure, an oxblood's red with black threads, a moonie's milky opalescent glass.
 *
 * Clear glass is drawn by looking through it: along each line of sight through the ball, whatever is
 * inside (vanes, threads, bands, a figure) is laid front to back, a little magnified as glass does.
 *
 * → PNGs with transparency, one per marble, at SIZE px (painted at twice that and scaled down).
 *   node scripts/hub-art/marbles.mjs <out dir> [name ...]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const SIZE = 900;
const N = SIZE * 2;

// ── Small maths ────────────────────────────────────────────────────────────

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const fract = (x) => x - Math.floor(x);

/** Seeded random numbers (the same marble always comes out the same). */
function seeded(seed) {
  let h = 2166136261 ^ seed;
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** 3D value noise and its fractal sum, -1…1 (soft variation: mottling, wobbles, bands). */
function makeNoise(seed) {
  const rand = seeded(seed);
  const perm = Array.from({ length: 512 }, () => rand() * 2 - 1);
  const h = (i, j, k) => perm[(((i * 73856093) ^ (j * 19349663) ^ (k * 83492791)) >>> 0) % 512];
  const lerp = (a, b, t) => a + (b - a) * t;
  const s = (t) => t * t * (3 - 2 * t);
  const noise = (x, y, z) => {
    const i = Math.floor(x); const j = Math.floor(y); const k = Math.floor(z);
    const u = s(x - i); const v = s(y - j); const w = s(z - k);
    return lerp(
      lerp(lerp(h(i, j, k), h(i + 1, j, k), u), lerp(h(i, j + 1, k), h(i + 1, j + 1, k), u), v),
      lerp(lerp(h(i, j, k + 1), h(i + 1, j, k + 1), u), lerp(h(i, j + 1, k + 1), h(i + 1, j + 1, k + 1), u), v),
      w,
    );
  };
  const fbm = (x, y, z, oct = 4) => { let a = 0; let f = 1; let amp = 0.5; for (let o = 0; o < oct; o += 1) { a += amp * noise(x * f, y * f, z * f); f *= 2.03; amp *= 0.5; } return a; };
  return { noise, fbm };
}

/** A rotation (degrees about x, then y, then z) as a function taking a view point into the ball's own frame. */
function turn(ax = 0, ay = 0, az = 0) {
  const [a, b, c] = [ax, ay, az].map((d) => (d * Math.PI) / 180);
  const [ca, sa, cb, sb, cc, sc] = [Math.cos(a), Math.sin(a), Math.cos(b), Math.sin(b), Math.cos(c), Math.sin(c)];
  return (x, y, z) => {
    // x
    let y1 = y * ca - z * sa; let z1 = y * sa + z * ca; let x1 = x;
    // y
    const x2 = x1 * cb + z1 * sb; const z2 = -x1 * sb + z1 * cb; x1 = x2; z1 = z2;
    // z
    const x3 = x1 * cc - y1 * sc; y1 = x1 * sc + y1 * cc;
    return [x3, y1, z1];
  };
}

/** Pole-to-pole coordinates in the ball's frame: the axis is y. → { lat (-1…1 = y), ang (radians round the axis), rho (distance from the axis) }. */
const polar = (x, y, z) => ({ lat: y, ang: Math.atan2(z, x), rho: Math.hypot(x, z) });
/** Shortest angle between two angles (radians, -π…π). */
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

// ── The painters ───────────────────────────────────────────────────────────
//
// Two kinds:
//   surface(x, y, z)  → [r, g, b] for a point on the ball (opaque marbles; x, y, z on the unit
//                       sphere as seen: x right, y up, z towards you).
//   glass: { tint(rr) → [r, g, b] (the glass itself, rr = distance from the middle squared),
//            inside(x, y, z) → [r, g, b, a] | null (what's in the glass at a point inside),
//            surface?(x, y, z) → [r, g, b, a] | null (on the glass's skin: a pontil) }.

/** A clay marble: dull, a little uneven, mottled, with darker specks. */
function clay({ base, seed, specks = 0.6 }) {
  const { fbm, noise } = makeNoise(seed);
  const b = hex(base);
  return {
    gloss: 0.3, // (fired clay: barely any shine)
    wobble: (a) => 1 - 0.022 * (0.5 + 0.5 * Math.sin(3 * a + seed)) - 0.012 * (0.5 + 0.5 * noise(Math.cos(a) * 2, Math.sin(a) * 2, seed)),
    surface: (x, y, z) => {
      let c = mix(b, [255, 255, 255], 0.1 * fbm(x * 3, y * 3, z * 3));
      c = mix(c, [40, 28, 20], clamp01(-fbm(x * 2 + 7, y * 2, z * 2) * 0.35));
      const sp = noise(x * 60, y * 60, z * 60);
      if (sp > 0.82) c = mix(c, [60, 40, 30], specks * smooth(0.82, 0.9, sp));
      return c;
    },
  };
}

/** A Bennington: glazed clay (brown or blue), the glaze pooled and mottled, light "eyes" where it touched others in the kiln. */
function bennington({ base, seed, eyes }) {
  const { fbm } = makeNoise(seed);
  const b = hex(base);
  const turnIt = turn(20, 30, 0);
  return {
    gloss: 1,
    surface: (x, y, z) => {
      const [u, v, w] = turnIt(x, y, z);
      let c = mix(b, [0, 0, 0], clamp01(0.25 * fbm(u * 4, v * 4, w * 4) + 0.1));
      c = mix(c, mix(b, [255, 255, 255], 0.35), clamp01(0.5 * fbm(u * 9 + 3, v * 9, w * 9)));
      for (const [ex, ey, ez, size] of eyes) {
        const n = Math.hypot(ex, ey, ez);
        const d = Math.acos(clamp01((x * ex + y * ey + z * ez) / n)) * 57.3;
        const edge = size * (1 + 0.15 * fbm(x * 30, y * 30, z * 30));
        if (d < edge + 2) {
          const eye = mix([236, 224, 200], [210, 196, 170], clamp01(d / edge));
          c = mix(c, eye, 1 - smooth(edge - 1.5, edge + 1.5, d));
        }
      }
      return c;
    },
  };
}

/** A china: white glazed porcelain with hand-painted rings round the poles and lines between. */
function china({ seed, inks }) {
  const { fbm } = makeNoise(seed);
  const turnIt = turn(-35, 0, 18);
  const [a, b] = inks.map(hex);
  return {
    gloss: 1,
    surface: (x, y, z) => {
      const [u, v, w] = turnIt(x, y, z);
      const { lat, ang } = polar(u, v, w);
      let c = mix([246, 243, 235], [226, 222, 210], clamp01(0.3 + 0.5 * fbm(u * 3, v * 3, w * 3)));
      const wav = 0.012 * fbm(u * 8, v * 8, w * 8);
      // Rings round both poles (a bull's-eye each), painted by hand: a little uneven.
      for (const [at, ink, width] of [[0.9, a, 0.022], [0.78, b, 0.016], [0.66, a, 0.012], [-0.9, a, 0.022], [-0.78, b, 0.016], [-0.66, a, 0.012]]) {
        const d = Math.abs(lat - at + wav);
        c = mix(c, ink, 1 - smooth(width * 0.7, width, d));
      }
      // Four wavy lines between them, pole to pole.
      if (Math.abs(lat) < 0.62) {
        for (let k = 0; k < 4; k += 1) {
          const line = (k * Math.PI) / 2 + 0.35 * Math.sin(lat * 5 + k);
          const d = Math.abs(angDiff(ang, line)) * Math.sqrt(1 - lat * lat);
          c = mix(c, k % 2 ? b : a, 1 - smooth(0.012, 0.02, d + wav * 0.5));
        }
      }
      return c;
    },
  };
}

/** An aggie: polished banded agate (carnelian): wavy bands of red-brown, orange and cream. */
function agate({ seed, palette }) {
  const { fbm } = makeNoise(seed);
  const cols = palette.map(hex);
  const centre = [0.55, -0.35, 0.3];
  return {
    gloss: 1,
    surface: (x, y, z) => {
      const d = Math.hypot(x - centre[0], y - centre[1], z - centre[2]) + 0.12 * fbm(x * 1.2, y * 1.2, z * 1.2) + 0.015 * fbm(x * 7, y * 7, z * 7);
      const t = fract(d * 1.9);
      const i = Math.floor(t * cols.length);
      const k = smooth(0.35, 1, fract(t * cols.length));
      let c = mix(cols[i], cols[(i + 1) % cols.length], k);
      c = mix(c, [255, 255, 255], 0.08 * clamp01(fbm(x * 20, y * 20, z * 20)));
      return c;
    },
  };
}

/**
 * A handmade swirl (latticinio core): clear glass; at its middle a funnel of fine white threads, and
 * near the surface coloured bands, all twisting from pole to pole; the pontil at one pole.
 */
function latticinioSwirl({ seed, bands }) {
  const cols = bands.map(hex);
  const turnIt = turn(-14, 20, 8);
  const { fbm } = makeNoise(seed);
  return {
    glass: {
      tint: (rr) => mix([238, 246, 248], [150, 190, 200], smooth(0.2, 1, rr)),
      turn: turnIt,
      inside: (x, y, z) => {
        const { lat, ang, rho } = polar(x, y, z);
        const cap = Math.sqrt(Math.max(0, 1 - lat * lat));
        const twist = lat * 2.4;
        // The core: 14 fine white threads round a narrow funnel.
        const coreR = 0.3 * cap;
        if (Math.abs(rho - coreR) < 0.03) {
          const k = fract(((ang - twist) / (2 * Math.PI)) * 12);
          if (k < 0.16) return [250, 250, 246, 0.6];
        }
        // The outer bands: 4 ribbons, each 2 colours side by side, near the surface.
        const bandR = 0.78 * cap;
        if (Math.abs(rho - bandR) < 0.04) {
          const k = fract(((ang - twist * 0.9) / (2 * Math.PI)) * 4);
          const i = (Math.floor(((ang - twist * 0.9) / (2 * Math.PI)) * 4) % cols.length + cols.length) % cols.length;
          if (k < 0.06) return [...cols[i], 0.5];
          if (k > 0.06 && k < 0.085) return [250, 250, 246, 0.45];
        }
        return null;
      },
      pontil: { axis: [0, 1, 0], size: 7, seed },
    },
  };
}

/** An onionskin: a layer under clear glass, covered with closely packed streaks of colour from pole to pole. */
function onionskin({ seed, streaks, under }) {
  const cols = streaks.map(hex);
  const base = hex(under);
  const turnIt = turn(-40, 25, 8);
  const { fbm, noise } = makeNoise(seed);
  const rand = seeded(seed);
  const order = Array.from({ length: 96 }, () => Math.floor(rand() * cols.length));
  return {
    glass: {
      tint: (rr) => mix([240, 246, 246], [170, 196, 200], smooth(0.4, 1, rr)),
      turn: turnIt,
      // The coloured layer: a skin just under the surface, seen through a thin clear casing.
      shell: {
        r: 0.9,
        color: (x, y, z) => {
          const { lat, ang } = polar(x, y, z);
          const a = ang - lat * 1.1 + 0.08 * fbm(x * 3, y * 3, z * 3);
          const f = (a / (2 * Math.PI) + 1) * 96;
          const i = Math.floor(f) % 96;
          const edge = fract(f);
          let c = cols[order[i]];
          c = mix(c, base, 0.25 * smooth(0.75, 1, edge) + 0.15 * clamp01(noise(f * 0.7, lat * 6, 0)));
          // (Thinner towards the poles, where the streaks all meet.)
          c = mix(c, base, smooth(0.86, 0.99, Math.abs(lat)) * 0.4);
          return c;
        },
      },
      pontil: { axis: [0, 1, 0], size: 8, seed },
    },
  };
}

/** A Lutz: clear glass with bands of glittering copper flakes (goldstone), each edged with thin white strands. */
function lutz({ seed, glass }) {
  const turnIt = turn(-16, 0, -10);
  const { noise } = makeNoise(seed);
  const g = hex(glass);
  return {
    glass: {
      tint: (rr) => mix(mix(g, [255, 255, 255], 0.55), g, smooth(0.15, 1, rr)),
      turn: turnIt,
      inside: (x, y, z) => {
        const { lat, ang, rho } = polar(x, y, z);
        const cap = Math.sqrt(Math.max(0, 1 - lat * lat));
        const r = 0.74 * cap;
        if (Math.abs(rho - r) > 0.05) return null;
        const a = ang - lat * 1.6;
        const f = ((a / (2 * Math.PI)) * 4 % 1 + 1) % 1; // 4 bands
        // The goldstone band (a third of each quarter), edged by two white strands.
        if (f > 0.04 && f < 0.2) {
          const glint = noise(x * 260, y * 260, z * 260);
          if (glint > 0.62) return [255, 236, 190, 0.9];
          if (glint > 0.45) return [236, 160, 84, 0.45];
          return [190, 104, 48, 0.12];
        }
        if ((f > 0.015 && f < 0.035) || (f > 0.205 && f < 0.225)) return [252, 252, 248, 0.4];
        return null;
      },
      pontil: { axis: [0, 1, 0], size: 8, seed },
    },
  };
}

/** A sulphide: a big clear marble with a small white figure inside (here a sitting dog), and a pontil. */
function sulphide({ seed, figure }) {
  const turnIt = turn(0, 0, 0);
  return {
    glass: {
      tint: (rr) => mix([206, 232, 232], [96, 150, 156], smooth(0.2, 1, rr)),
      turn: turnIt,
      figure, // (drawn by the plate: a white figure set in the middle of the glass, seen magnified)
      bubbles: 7,
      pontil: { axis: [0.25, 0.95, 0.2], size: 7, seed },
      seed,
    },
  };
}

/** A cat's eye: clear glass with four coloured vanes through the middle, like the pupil of a cat's eye. */
function catsEye({ seed, vanes, glass }) {
  const cols = vanes.map(hex);
  const turnIt = turn(-18, 45, 0);
  const g = hex(glass);
  return {
    glass: {
      tint: (rr) => mix([244, 250, 252], g, smooth(0.3, 1, rr)),
      turn: turnIt,
      inside: (x, y, z) => {
        const { lat, ang, rho } = polar(x, y, z);
        const cap = Math.sqrt(Math.max(0, 1 - lat * lat));
        // Four blades, each a thin leaf-shaped sheet from pole to pole (widest at the middle), meeting
        // along the axis: seen across, two of them make the cat's-eye pupil.
        const reach = 0.36 * (1 - lat * lat) ** 0.8;
        if (rho > reach || Math.abs(lat) > 0.86) return null;
        for (let k = 0; k < 4; k += 1) {
          const blade = (k * Math.PI) / 2 + 0.25 * lat;
          const d = Math.abs(angDiff(ang, blade)) * rho;
          if (d < 0.016 && Math.abs(angDiff(ang, blade)) < Math.PI / 2) return [...cols[k % cols.length], 0.9];
        }
        return null;
      },
      seed,
    },
  };
}

/** A corkscrew: opaque white with two spirals of colour winding round it from pole to pole. */
function corkscrew({ seed, spirals, base }) {
  const cols = spirals.map(hex);
  const b = hex(base);
  const turnIt = turn(-20, 0, 12);
  const { fbm } = makeNoise(seed);
  return {
    gloss: 1,
    surface: (x, y, z) => {
      const [u, v, w] = turnIt(x, y, z);
      const { lat, ang } = polar(u, v, w);
      let c = mix(b, [230, 226, 214], clamp01(0.4 * fbm(u * 3, v * 3, w * 3)));
      // Each spiral goes round about one and a half times from pole to pole.
      for (let k = 0; k < cols.length; k += 1) {
        const a = ang - lat * 4.6 + (k * 2 * Math.PI) / cols.length;
        const d = Math.abs(angDiff(a, 0)) * Math.sqrt(1 - lat * lat);
        const width = 0.42 + 0.03 * fbm(u * 6 + k, v * 6, w * 6);
        c = mix(c, cols[k], 1 - smooth(width - 0.03, width, d));
      }
      return c;
    },
  };
}

/** An oxblood: milky white glass with a swirl of deep oxblood red, fine black threads running through the red. */
function oxblood({ seed }) {
  const turnIt = turn(-30, 0, 22);
  const { fbm } = makeNoise(seed);
  return {
    gloss: 1,
    surface: (x, y, z) => {
      const [u, v, w] = turnIt(x, y, z);
      const { lat, ang } = polar(u, v, w);
      let c = mix([242, 238, 228], [222, 216, 202], clamp01(0.5 + 0.5 * fbm(u * 2, v * 2, w * 2)));
      const a = ang - lat * 2.2 + 0.25 * fbm(u * 2.5, v * 2.5, w * 2.5);
      // Two swirls of oxblood, each with black threads along it.
      for (const at of [0.2, Math.PI + 0.6]) {
        const d = Math.abs(angDiff(a, at));
        const width = 0.55 + 0.2 * fbm(u * 4 + at, v * 4, w * 4);
        if (d < width) {
          const red = mix([110, 15, 20], [150, 32, 30], clamp01(0.5 + fbm(u * 6, v * 6, w * 6)));
          c = mix(c, red, 1 - smooth(width - 0.08, width, d));
          for (const off of [-0.3, 0.05, 0.32]) {
            const t = Math.abs(d * Math.sign(angDiff(a, at)) - off * width + 0.05 * fbm(u * 12, v * 12, w * 12));
            c = mix(c, [18, 10, 10], 1 - smooth(0.012, 0.03, t));
          }
        }
      }
      return c;
    },
  };
}

/** A moonie: milky white, opalescent glass: pale and glowing, bluish where the light falls, a warm fiery edge opposite. */
function moonie({ seed }) {
  const { fbm } = makeNoise(seed);
  return {
    gloss: 0.9,
    surface: (x, y, z) => {
      const rr = x * x + y * y;
      // Milky, a little see-through: a soft warm glow deep inside, bluish milk round it.
      let c = mix([252, 246, 228], [206, 220, 238], smooth(0, 0.9, rr));
      // The opalescence: a cool blue on the lit side (top left), a fiery amber glow on the far edge (bottom right).
      const toLight = clamp01((-x + y) * 0.7 + 0.2);
      c = mix(c, [160, 192, 232], 0.55 * toLight * smooth(0.25, 1, rr));
      const away = clamp01((x - y) * 0.8);
      c = mix(c, [244, 170, 84], 0.7 * away * smooth(0.35, 1, rr));
      c = mix(c, [255, 255, 255], 0.06 * clamp01(fbm(x * 3, y * 3, z * 3)));
      return c;
    },
  };
}

// ── The renderer ───────────────────────────────────────────────────────────

let paintLib;
async function painter() {
  if (paintLib) return paintLib;
  const server = await createServer({ root: path.resolve(here, '../..'), logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' });
  const paint = await server.ssrLoadModule('/src/shared/marbles/paint.js');
  const badge = await server.ssrLoadModule('/src/shared/marbles/badge.js');
  paintLib = { paint, badge, close: () => server.close() };
  return paintLib;
}

/** The game's shine (badge.js GLOSS_LAYERS) as straight RGBA bytes at n px, scaled by `amount`. */
async function glossPixels(n, amount = 1) {
  const { paint, badge } = await painter();
  const px = paint.rasterize(badge.GLOSS_LAYERS, n, { ss: 1 });
  const out = paint.toBytes(px);
  if (amount !== 1) for (let k = 3; k < out.length; k += 4) out[k] = Math.round(out[k] * amount);
  return out;
}

/** A game look's own picture (its layers, painted by paint.js), as straight RGBA bytes at n px. */
async function gameLookPixels(slug, n) {
  const { paint, badge } = await painter();
  const look = badge.lookOf(slug);
  if (!look) throw new Error(`no game look ${slug}`);
  return paint.toBytes(paint.rasterize(look.layers, n, { ss: 1 }));
}

/** Lays `top` (straight RGBA bytes) over `under` (straight RGBA bytes), in place. */
function over(under, top) {
  for (let k = 0; k < under.length; k += 4) {
    const a = top[k + 3] / 255;
    if (a <= 0) continue;
    const b = under[k + 3] / 255;
    const outA = a + b * (1 - a);
    for (let i = 0; i < 3; i += 1) under[k + i] = Math.round((top[k + i] * a + under[k + i] * b * (1 - a)) / outA);
    under[k + 3] = Math.round(outA * 255);
  }
}

/** A pontil mark: a small rough, frosted patch on the skin round `axis` (in the ball's frame). */
function pontilAt(spec, turnIt) {
  if (!spec) return () => null;
  const n = Math.hypot(...spec.axis);
  const ax = spec.axis.map((v) => v / n);
  const { noise } = makeNoise(spec.seed + 99);
  return (x, y, z) => {
    const [u, v, w] = turnIt(x, y, z);
    const d = Math.acos(Math.min(1, u * ax[0] + v * ax[1] + w * ax[2])) * 57.3;
    const edge = spec.size * (1 + 0.25 * noise(u * 25, v * 25, w * 25));
    if (d > edge + 1) return null;
    const grain = 0.5 + 0.5 * noise(u * 220, v * 220, w * 220);
    const c = mix([214, 220, 218], [150, 160, 160], grain);
    return [...c, (1 - smooth(edge - 1, edge + 1, d)) * 0.85];
  };
}

/** Paints one marble (its painter's spec) → straight RGBA bytes, n × n. */
async function paintMarble(spec, n) {
  const out = new Uint8ClampedArray(n * n * 4);
  const turnIt = spec.glass?.turn ?? ((x, y, z) => [x, y, z]);
  const pontil = pontilAt(spec.glass?.pontil, turnIt);
  const figure = spec.glass?.figure ? await figureMask(spec.glass.figure, n) : null;
  const bubbles = spec.glass?.bubbles ? bubbleSet(spec.glass.bubbles, spec.glass.seed) : [];
  for (let j = 0; j < n; j += 1) {
    for (let i = 0; i < n; i += 1) {
      const x = (2 * (i + 0.5)) / n - 1;
      const y = 1 - (2 * (j + 0.5)) / n;
      const rr = x * x + y * y;
      const r = spec.wobble ? spec.wobble(Math.atan2(y, x)) : 1;
      if (rr > r * r) continue;
      const k = (j * n + i) * 4;
      let c;
      if (spec.surface) {
        const xs = x / r; const ys = y / r;
        const z = Math.sqrt(Math.max(0, 1 - xs * xs - ys * ys));
        c = spec.surface(xs, ys, z);
      } else {
        const g = spec.glass;
        const z = Math.sqrt(Math.max(0, 1 - rr));
        let col = g.tint(rr);
        // What's behind, inside the glass: laid back to front along the line of sight (magnified ×1.18).
        const m = 1 / 1.18;
        const ix = x * m; const iy = y * m;
        const zz = Math.sqrt(Math.max(0, 1 - (ix * ix + iy * iy)));
        if (g.shell) {
          const rs = g.shell.r;
          const r2 = ix * ix + iy * iy;
          if (r2 < rs * rs) {
            const zs = Math.sqrt(rs * rs - r2);
            const [u, v, w] = turnIt(ix / rs, iy / rs, zs / rs);
            col = g.shell.color(u, v, w);
            col = mix(col, [0, 0, 0], 0.18 * smooth(0.5, 1, r2 / (rs * rs)));
          }
        }
        if (g.inside) {
          const steps = 160;
          for (let s = steps - 1; s >= 0; s -= 1) {
            const zt = -zz + ((s + 0.5) / steps) * 2 * zz;
            const [u, v, w] = turnIt(ix, iy, zt);
            const hit = g.inside(u, v, w);
            if (hit) col = mix(col, hit.slice(0, 3), hit[3]);
          }
        }
        if (figure) {
          const fi = Math.round(((ix + 1) / 2) * n - 0.5); const fj = Math.round(((1 - iy) / 2) * n - 0.5);
          if (fi >= 0 && fj >= 0 && fi < n && fj < n) {
            const fk = (fj * n + fi) * 4;
            const a = figure[fk + 3] / 255;
            if (a > 0) col = mix(col, [figure[fk], figure[fk + 1], figure[fk + 2]], a);
          }
        }
        for (const [bx, by, br] of bubbles) {
          const d = Math.hypot(x - bx, y - by);
          if (d < br) col = mix(col, d > br * 0.6 ? [255, 255, 255] : mix(col, [255, 255, 255], 0.35), 0.7);
        }
        // The glass's own edge, darker (as the game's clear glass is).
        col = mix(col, mix(g.tint(1), [20, 40, 50], 0.35), 0.35 * smooth(0.82, 1, rr));
        const p = pontil(x, y, z);
        if (p) col = mix(col, p.slice(0, 3), p[3]);
        c = col;
      }
      out[k] = c[0]; out[k + 1] = c[1]; out[k + 2] = c[2]; out[k + 3] = 255;
    }
  }
  return out;
}

/** A few small air bubbles in the glass (view positions and sizes). */
function bubbleSet(count, seed) {
  const rand = seeded(seed + 7);
  return Array.from({ length: count }, () => {
    const a = rand() * Math.PI * 2; const d = 0.3 + rand() * 0.55;
    return [Math.cos(a) * d, Math.sin(a) * d, 0.008 + rand() * 0.014];
  });
}

/** The sulphide's figure: its SVG drawn at n px (white, softly shaded), as RGBA bytes. */
async function figureMask(svg, n) {
  const { data } = await sharp(Buffer.from(svg)).resize(n, n).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return data;
}

/** Soft edge: the ball's outline smoothed (anti-aliased by the later scale-down too). */
async function finishPng(bytes, n, file, { gloss = 1 }) {
  const shine = await glossPixels(n, gloss);
  // (The shine only on the ball.)
  for (let k = 3; k < shine.length; k += 4) if (bytes[k] === 0) shine[k] = 0;
  over(bytes, shine);
  await sharp(Buffer.from(bytes.buffer), { raw: { width: n, height: n, channels: 4 } })
    .resize(SIZE, SIZE, { kernel: 'lanczos3' })
    .png({ compressionLevel: 9 })
    .toFile(file);
}

// ── The marbles of the marble types article ───────────────────────────────

const DOG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="170 140 700 700">
  <defs>
    <radialGradient id="g" cx="38%" cy="28%" r="80%"><stop offset="0" stop-color="#ffffff"/><stop offset="0.55" stop-color="#f1f2ee"/><stop offset="1" stop-color="#b9c0bd"/></radialGradient>
    <radialGradient id="halo" cx="50%" cy="50%" r="50%"><stop offset="0.55" stop-color="#e8f4f4" stop-opacity="0.55"/><stop offset="1" stop-color="#e8f4f4" stop-opacity="0"/></radialGradient>
  </defs>
  <ellipse cx="545" cy="480" rx="230" ry="250" fill="url(#halo)"/>
  <g stroke="#8e9895" stroke-width="7" stroke-linejoin="round">
    <path fill="url(#g)" d="M630 620 C 672 614 690 594 700 568 C 705 556 718 562 714 578 C 706 612 676 642 632 642 Z"/>
    <path fill="url(#g)" d="M395 330 C 400 300 430 282 470 283 C 500 284 522 296 532 318 C 548 345 552 380 560 410 C 600 440 632 490 636 560 C 640 600 636 625 630 645 L 470 645 C 455 645 448 638 452 625 L 458 520 C 445 490 430 460 430 435 C 428 410 436 392 440 378 C 425 372 410 365 402 352 C 396 345 392 338 395 330 Z"/>
    <path fill="#dfe3e0" d="M478 292 C 500 290 520 300 522 320 C 524 345 515 360 505 362 C 496 345 488 320 478 292 Z"/>
    <path fill="none" d="M560 556 C 584 596 602 622 604 645"/>
    <path fill="none" d="M492 560 L 494 645"/>
  </g>
  <circle cx="447" cy="312" r="7" fill="#7d8784"/>
  <rect x="428" y="643" width="236" height="26" rx="10" fill="#dde2df" stroke="#8e9895" stroke-width="6"/>
</svg>`;

const ITEMS = {
  'clay-tan': () => clay({ base: '#C49A70', seed: 3 }),
  'clay-blue': () => clay({ base: '#6E86A8', seed: 11, specks: 0.4 }),
  'clay-red': () => clay({ base: '#A85A48', seed: 17, specks: 0.4 }),
  'bennington-brown': () => bennington({ base: '#6A3D1E', seed: 5, eyes: [[0.35, 0.25, 0.9, 7], [-0.7, -0.4, 0.55, 6]] }),
  'bennington-blue': () => bennington({ base: '#2C4F8E', seed: 9, eyes: [[-0.3, 0.45, 0.85, 7]] }),
  china: () => china({ seed: 4, inks: ['#2E7A4A', '#C8402E'] }),
  aggie: () => agate({ seed: 6, palette: ['#7A2312', '#B8441C', '#DE8A4A', '#F2DCC0', '#C9622C', '#8E3418'] }),
  'handmade-swirl': () => latticinioSwirl({ seed: 8, bands: ['#C8302A', '#2457B8', '#E8B62C', '#2E8A4C'] }),
  onionskin: () => onionskin({ seed: 12, streaks: ['#D8342C', '#F2C230', '#F4F0E6', '#2E7FC4', '#E5762A', '#3A9A52'], under: '#F2E6C8' }),
  lutz: () => lutz({ seed: 14, glass: '#CFE9EC' }),
  sulphide: () => sulphide({ seed: 21, figure: DOG }),
  'cats-eye': () => catsEye({ seed: 2, vanes: ['#E5322D', '#FFD21F', '#E5322D', '#FFD21F'], glass: '#9CC9DE' }),
  oxblood: () => oxblood({ seed: 13 }),
  corkscrew: () => corkscrew({ seed: 19, spirals: ['#E5322D', '#FFD21F'], base: '#F4F1EA' }),
  moonie: () => moonie({ seed: 15 }),
};
// The game's own looks for the types it has (its shop pictures, as painted for the 3D marbles).
const GAME = { steelie: 'steelie-classic', clearie: 'clearie-classic' };

async function main() {
  const [out, ...only] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const names = [...Object.keys(ITEMS), ...Object.keys(GAME)].filter((n) => !only.length || only.includes(n));
  const notesFile = path.join(out, 'notes.json');
  const notes = fs.existsSync(notesFile) ? JSON.parse(fs.readFileSync(notesFile, 'utf8')) : {};
  for (const name of names) {
    const t0 = Date.now();
    const file = path.join(out, `${name}.png`);
    if (GAME[name]) {
      const bytes = await gameLookPixels(GAME[name], N);
      // (Round, as the shop shows it.)
      for (let j = 0; j < N; j += 1) for (let i = 0; i < N; i += 1) { const x = (2 * (i + 0.5)) / N - 1; const y = 1 - (2 * (j + 0.5)) / N; if (x * x + y * y > 1) bytes[(j * N + i) * 4 + 3] = 0; }
      if (name === 'clearie') {
        // (The 3D clearie's few air bubbles, as the game paints them.)
        for (const [bx, by, br] of bubbleSet(6, 31)) for (let j = 0; j < N; j += 1) for (let i = 0; i < N; i += 1) {
          const x = (2 * (i + 0.5)) / N - 1; const y = 1 - (2 * (j + 0.5)) / N; const d = Math.hypot(x - bx, y - by);
          if (d < br) { const k = (j * N + i) * 4; for (let c = 0; c < 3; c += 1) bytes[k + c] = Math.round(bytes[k + c] + (255 - bytes[k + c]) * 0.6); }
        }
      }
      await finishPng(bytes, N, file, {});
    } else {
      const spec = ITEMS[name]();
      const bytes = await paintMarble(spec, N);
      await finishPng(bytes, N, file, { gloss: spec.gloss ?? 1 });
      // Where its pontil shows (for the picture's label): the point of the ball nearest the pontil's axis.
      const p = spec.glass?.pontil;
      if (p) {
        const t = spec.glass.turn; const n = Math.hypot(...p.axis); const ax = p.axis.map((v) => v / n);
        let best = null;
        for (let j = 0; j <= 200; j += 1) for (let i = 0; i <= 200; i += 1) {
          const x = i / 100 - 1; const y = 1 - j / 100; const rr = x * x + y * y; if (rr > 1) continue;
          const [u, v, w] = t(x, y, Math.sqrt(1 - rr)); const d = u * ax[0] + v * ax[1] + w * ax[2];
          if (!best || d > best.d) best = { d, x: (x + 1) / 2, y: (1 - y) / 2 };
        }
        notes[name] = { pontil: { x: +best.x.toFixed(3), y: +best.y.toFixed(3) } };
      }
    }
    console.log(`${name}: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
  fs.writeFileSync(notesFile, JSON.stringify(notes, null, 1));
  await paintLib?.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
