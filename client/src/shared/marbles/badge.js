/**
 * The marble pictures: one description per design, the MASTER for its colours.
 *
 * Each design's look is a stack of gradient layers built from the shade's
 * colours (catalog.json). The flat shop picture is that stack as CSS (+ the
 * GLOSS shine on top); the 3D marble (materials.js) paints its textures from
 * the very same layers (paint.js rasterize), so 2D and 3D share every colour
 * value. Plain strings and numbers, no DOM: the website and the phone apps
 * both use them.
 */
import { ITEM } from './index.js';
import { T, alpha, cssDrawable, hexRgb, mixHex, toCss } from './paint.js';

// Lighter or darker versions of a colour, for depth (as CSS color-mix in srgb).
const toward = mixHex;

const STAR_DOTS = [[22, 30, 1.6, 2.4], [70, 24, 1.2, 2], [58, 66, 1.8, 2.6], [30, 74, 1, 1.8], [80, 52, 1.2, 2], [44, 40, 0.9, 1.6]]
  .map(([x, y, a, b]) => ({ type: 'radial', at: [x, y], stops: [['#FFFFFF', 0, a], [T, b]] }));

/** The shine laid over every marble picture (a highlight, a soft second glint, a darker rim): in 3D too. */
export const GLOSS_LAYERS = [
  { type: 'radial', at: [33, 27], stops: [[alpha('#FFFFFF', 0.95), 0], [alpha('#FFFFFF', 0.4), 8], [alpha('#FFFFFF', 0), 19]] },
  { type: 'radial', at: [68, 78], stops: [[alpha('#FFFFFF', 0.25), 0], [alpha('#FFFFFF', 0), 14]] },
  { type: 'radial', at: [50, 45], stops: [[alpha('#000000', 0), 50], [alpha('#000000', 0.55), 100]] },
];
export const GLOSS = toCss(GLOSS_LAYERS);

// Flakes for the Champion Shooter's picture (fixed places, so every picture is the same).
const FLAKES = [[30, 34, 1.2], [56, 26, 0.9], [72, 50, 1.3], [44, 56, 1], [28, 66, 0.8], [60, 74, 1.1], [50, 42, 0.7], [38, 22, 0.8], [66, 64, 0.9], [22, 48, 1], [78, 36, 0.7], [46, 80, 0.8], [58, 54, 0.6], [34, 46, 0.6]];

/** Northern Lights: three aurora ribbons and a few stars fixed in the ball, over the night sky. */
function auroraGlass([a, b, c, sky]) {
  const skyLayer = { type: 'solid', color: sky };
  const lights = [
    ...STAR_DOTS,
    { type: 'linear', angle: 160, stops: [[T, 20], [alpha(a, 0.9), 36], [T, 52]] },
    { type: 'linear', angle: 200, stops: [[T, 34], [alpha(b, 0.9), 52], [T, 68]] },
    { type: 'linear', angle: 170, stops: [[T, 56], [alpha(c, 0.85), 70], [T, 86]] },
  ];
  // The ribbons and stars are fixed in the ball (front and back), over the night sky.
  return { layers: [...lights, skyLayer], parts: { body: [skyLayer], pattern: { layers: lights, map: 'front', repeat: 180 }, glow: a } };
}

/**
 * Each material: shade colours (in the design's slot order) → { layers, parts }.
 * layers: the picture, top first. parts: the same layer objects and colours,
 * named, for the 3D marble (materials.js) to place:
 *   body     layers that stay put as the ball rolls (its glass, its shading);
 *   pattern  the layers fixed in the ball, rolling with it:
 *              map 'front': the picture of them painted on the ball, front and back
 *                (facing you it is the picture itself);
 *              map 'gores': a conic layer as slices from pole to pole, `twist` degrees
 *                from pole to pole (seen down the axis it is the picture's pinwheel);
 *            repeat: degrees after which the pattern looks the same again (the
 *            wagon-wheel limit: see materials.js MAX_TURN);
 *   over     layers on top of the ball, staying put (a glow at the core), under the shine.
 */
// The shop card's colour: a see-through picture is laid on it, so it looks the same everywhere.
const CARD = '#1A2133';
const LOOKS = {
  'clear-glass': ([g, d]) => {
    const glass = { type: 'radial', stops: [[toward(g, '#FFFFFF', 0.45), 0], [alpha(g, 0.9), 70], [d, 100]] };
    const card = { type: 'solid', color: CARD };
    return { layers: [glass, card], parts: { body: [glass, card], bubbles: toward(g, '#FFFFFF', 0.7) } };
  },
  'agate-rings': ([d, m, l]) => {
    const rings = { type: 'radial', repeat: true, at: [30, 70], stops: [[d, 0, 5], [m, 5, 9], [l, 9, 11], [toward(d, '#000000', 0.25), 11, 16]] };
    // (The rings repeat every 16% of the picture: about 18° of the ball facing you.)
    return { layers: [rings], parts: { pattern: { layers: [rings], map: 'front', repeat: 18 } } };
  },
  patch: ([p, p2, b]) => {
    // Round patches all over the ball (not only front and back), so it looks the same from every
    // side; the picture is the ball seen from the front.
    const caps = [
      { at: [0.5, 0.45, 0.74], size: 44, color: p }, { at: [-0.55, -0.6, 0.58], size: 36, color: p2 },
      { at: [-0.6, 0.55, -0.58], size: 40, color: p }, { at: [0.62, -0.5, -0.6], size: 38, color: p2 },
      { at: [-0.98, 0.15, 0.05], size: 30, color: p2 }, { at: [0.97, -0.1, -0.15], size: 30, color: p },
    ];
    const pattern = { map: 'caps', caps, base: b, view: 'front' };
    return { layers: [{ type: 'ball', pattern, view: 'front' }], parts: { pattern } };
  },
  'vane-glass': ([v, v2, g]) => {
    const tint = { type: 'radial', stops: [[T, 0, 38], [alpha(g, 0.92), 72]] };
    const back = { type: 'radial', stops: [['#F4FAFF', 0], [g, 70], ['#5E8FAE', 100]] };
    const vanes = {
      type: 'conic', from: 15,
      stops: [[T, 0, 26], [v, 26, 52], [T, 52, 116], [v2, 116, 142], [T, 142, 206], [v, 206, 232], [T, 232, 296], [v2, 296, 322], [T, 322]],
    };
    return {
      layers: [tint, vanes, back],
      parts: { tint, back, vaneLayer: vanes, vanes: [v, v2], body: [back], pattern: { layers: [vanes], map: 'gores', twist: 0, repeat: 90 }, over: [tint] },
    };
  },
  corkscrew: ([a, b, base]) => {
    const spiral = { type: 'conic', stops: [[a, 0, 43.2], [base, 43.2, 90], [b, 90, 133.2], [base, 133.2, 180], [a, 180, 223.2], [base, 223.2, 270], [b, 270, 313.2], [base, 313.2]] };
    // A corkscrew's stripes wind round the ball: the slices twist a half turn from pole to pole,
    // and the picture is the same ball seen down its axis (a spiral).
    const pattern = { layers: [spiral], map: 'gores', twist: 180, repeat: 90 };
    return { layers: [{ type: 'ball', pattern, view: 'axis' }], parts: { pattern } };
  },
  'bee-bands': ([s, b]) => {
    const bands = { type: 'linear', repeat: true, angle: 0, stops: [[s, 0, 16], [b, 16, 32]] };
    // (A stripe and a band every 32% of the picture: about 37° of the ball facing you.)
    return { layers: [bands], parts: { pattern: { layers: [bands], map: 'front', repeat: 37 } } };
  },
  oxblood: ([s, s2, b]) => {
    const streaks = { type: 'conic', repeat: true, from: 15, stops: [[T, 0, 25], [alpha(s, 0.95), 25, 32], [T, 32, 50], [alpha(s2, 0.8), 50, 53], [T, 53, 72]] };
    const glass = { type: 'radial', stops: [[b, 0], [toward(b, '#000000', 0.12), 100]] };
    // The streaks swirl through the glass (60° from pole to pole); the picture is the same ball seen down its axis.
    const pattern = { layers: [streaks], map: 'gores', twist: 60, repeat: 72 };
    return { layers: [{ type: 'ball', pattern, view: 'axis' }, glass], parts: { body: [glass], pattern } };
  },
  steel: ([s, d]) => {
    const body = {
      type: 'linear', angle: 180,
      stops: [[toward(s, '#FFFFFF', 0.7), 0], [s, 38], [toward(d, '#FFFFFF', 0.25), 48], [d, 52], [toward(s, '#000000', 0.2), 70], [toward(s, '#FFFFFF', 0.5), 100]],
    };
    return { layers: [body], parts: { body, lines: d } };
  },
  'flame-swirl': ([f, f2, b]) => {
    const core = { type: 'radial', stops: [['#FFFFFF', 0, 10], [T, 28]] };
    const flames = { type: 'conic', repeat: true, stops: [[b, 0, 8], [f, 8, 14], [f2, 14, 20], [b, 20, 30]] };
    // The flames swirl round the ball (twisting as they go); the white-hot core glows in the middle.
    // The picture is the same ball seen down its axis.
    const pattern = { layers: [flames], map: 'gores', twist: 90, repeat: 30 };
    return { layers: [core, { type: 'ball', pattern, view: 'axis' }], parts: { pattern, over: [core] } };
  },
  champion: ([g, d, fl]) => {
    const body = { type: 'radial', at: [40, 35], stops: [[g, 0], [toward(g, d, 0.6), 55], [d, 100]] };
    const flakes = FLAKES.map(([x, y, r]) => ({ type: 'radial', at: [x, y], stops: [[fl, 0, r], [T, r + 0.8]] }));
    return { layers: [...flakes, body], parts: { body, flake: fl, glow: g } };
  },
  'aurora-glass': (colours) => auroraGlass(colours),
  /**
   * Northern Lights, upgraded (the launch edition): the very same night sky, ribbons, stars and
   * colours, with a stronger glow round it (GLOW_STRENGTH) and a soft shimmer over the ribbons as it
   * rolls (SHIMMER: the 3D ribbons brighten and fade with the ball's turning; the picture's sheen drifts).
   */
  'aurora-glow': (colours) => auroraGlass(colours),
  // Plain striped Originals.
  stripe: ([s, b]) => {
    const bands = { type: 'linear', repeat: true, angle: 0, stops: [[s, 0, 16], [b, 16, 32]] };
    return { layers: [bands], parts: { pattern: { layers: [bands], map: 'front', repeat: 37 } } };
  },
};

/** Which looks turn in their picture (moving patterns), and how fast. */
const SPIN = { corkscrew: 'fast', 'flame-swirl': 'slow', 'aurora-glass': 'slow', 'aurora-glow': 'slow' };
/** Which looks glow, and in what colour (slot index). */
const GLOW = { 'flame-swirl': 0, champion: 0, 'aurora-glass': 0, 'aurora-glow': 0 };
/** How strong a look's glow is in its picture (the shadow's opacity; 0.5 unless set here). */
export const GLOW_STRENGTH = { 'aurora-glow': 0.72 };
/** Which looks shimmer as they roll (the 3D ribbons brighten and fade; the picture's sheen drifts). */
export const SHIMMER = new Set(['aurora-glow']);

/** An item's look: { material, colours, layers, parts, glow } (the master for 2D and 3D; made once per item). */
const looks = new Map();
export function lookOf(slug) {
  if (looks.has(slug)) return looks.get(slug);
  const item = ITEM[slug];
  if (!item) return null;
  const colours = item.shade.colours.map((c) => c.hex);
  const material = item.design.material;
  const look = LOOKS[material]?.(colours) ?? { layers: [{ type: 'solid', color: colours[0] }] };
  const g = GLOW[material];
  const out = { material, colours, layers: look.layers, parts: look.parts ?? {}, glow: g === undefined ? null : colours[g] };
  looks.set(slug, out);
  return out;
}

const cssAlpha = (hex, a) => toCss([{ type: 'solid', color: alpha(hex, a) }]);

/** { background, spin, glow } for an item's flat picture. */
export function badgeOf(slug) {
  const look = lookOf(slug);
  if (!look) return { background: '#888', spin: null, glow: null };
  return {
    // (A picture with the ball's own pattern needs the painter: background null, the page draws `layers`.)
    background: cssDrawable(look.layers) ? toCss(look.layers) : null,
    layers: look.layers,
    spin: SPIN[look.material] ?? null,
    glow: look.glow ? cssAlpha(look.glow, GLOW_STRENGTH[look.material] ?? 0.5) : null,
    shimmer: SHIMMER.has(look.material),
  };
}

/**
 * A plain marble (the free starters, the other Originals, the computer players'
 * marbles): its colours and pattern as a look, the master for 2D and 3D like a
 * collection item's. → { material, colours, layers, parts, glow: null, key }.
 */
const plainLooks = new Map();
export function plainLookOf({ color_primary: a = '#888888', color_secondary: b = null, pattern = 'solid' } = {}) {
  const key = `plain:${a}|${b ?? ''}|${pattern}`;
  if (plainLooks.has(key)) return plainLooks.get(key);
  let look;
  if (!b || pattern === 'solid') {
    // One colour: glossy, lit from the top left, darker towards its edge (its shading stays put as it rolls).
    const body = { type: 'radial', at: [35, 30], stops: [[toward(a, '#FFFFFF', 0.3), 0], [a, 45], [toward(a, '#000000', 0.45), 100]] };
    // A faint band round the ball so you can see it roll: a little lighter (darker on a pale marble).
    const [r, g, bl] = hexRgb(a);
    const pale = 0.2126 * r + 0.7152 * g + 0.0722 * bl > 190;
    const band = { map: 'band', axis: [0.35, 0.9, 0.25], width: 10, soft: 5, color: alpha(toward(a, pale ? '#000000' : '#FFFFFF', 0.45), 0.3), view: 'front', repeat: 180 };
    look = { material: 'plain-solid', layers: [{ type: 'ball', pattern: band, view: 'front' }, body], parts: { body: [body], pattern: band } };
  } else if (pattern === 'striped') {
    look = { material: 'plain-striped', ...LOOKS.stripe([b, a]) };
  } else {
    // Two colours swirled: slices twisting round the ball; the picture is the ball seen down its axis.
    const swirl = { type: 'conic', stops: [[a], [b], [a], [b], [a]] };
    const twirl = { layers: [swirl], map: 'gores', twist: 120, repeat: 180 };
    look = { material: `plain-${pattern}`, layers: [{ type: 'ball', pattern: twirl, view: 'axis' }], parts: { pattern: twirl } };
  }
  const out = { ...look, colours: [a, b].filter(Boolean), glow: null, key };
  plainLooks.set(key, out);
  return out;
}

/** A plain Original (old one-colour marble): its colours as a simple picture. */
export function plainBadge(marble = {}) {
  const look = plainLookOf(marble);
  return { background: cssDrawable(look.layers) ? toCss(look.layers) : null, layers: look.layers, key: look.key, spin: marble.pattern === 'galaxy' ? 'slow' : null, glow: null };
}
