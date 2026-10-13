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
import { T, alpha, mixHex, toCss } from './paint.js';

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

/**
 * Each material: shade colours (in the design's slot order) → { layers, parts }.
 * layers: the picture, top first. parts: the same layer objects and colours,
 * named, for the 3D marble to place (the parts that stay put as the ball
 * rolls, like its shading, and the parts that turn with it, like flakes).
 */
const LOOKS = {
  'clear-glass': ([g, d]) => ({ layers: [{ type: 'radial', stops: [[toward(g, '#FFFFFF', 0.45), 0], [alpha(g, 0.9), 70], [d, 100]] }] }),
  'agate-rings': ([d, m, l]) => ({
    layers: [{ type: 'radial', repeat: true, at: [30, 70], stops: [[d, 0, 5], [m, 5, 9], [l, 9, 11], [toward(d, '#000000', 0.25), 11, 16]] }],
  }),
  patch: ([p, p2, b]) => ({
    layers: [
      { type: 'radial', at: [70, 30], stops: [[p, 0, 38], [T, 40]] },
      { type: 'radial', at: [25, 75], stops: [[p2, 0, 30], [T, 32]] },
      { type: 'solid', color: b },
    ],
  }),
  'vane-glass': ([v, v2, g]) => {
    const tint = { type: 'radial', stops: [[T, 0, 38], [alpha(g, 0.92), 72]] };
    const back = { type: 'radial', stops: [['#F4FAFF', 0], [g, 70], ['#5E8FAE', 100]] };
    const vanes = {
      type: 'conic', from: 15,
      stops: [[T, 0, 26], [v, 26, 52], [T, 52, 116], [v2, 116, 142], [T, 142, 206], [v, 206, 232], [T, 232, 296], [v2, 296, 322], [T, 322]],
    };
    return { layers: [tint, vanes, back], parts: { tint, back, vaneLayer: vanes, vanes: [v, v2] } };
  },
  corkscrew: ([a, b, base]) => ({
    layers: [{ type: 'conic', stops: [[a, 0, 43.2], [base, 43.2, 90], [b, 90, 133.2], [base, 133.2, 180], [a, 180, 223.2], [base, 223.2, 270], [b, 270, 313.2], [base, 313.2]] }],
  }),
  'bee-bands': ([s, b]) => ({ layers: [{ type: 'linear', repeat: true, angle: 0, stops: [[s, 0, 16], [b, 16, 32]] }] }),
  oxblood: ([s, s2, b]) => ({
    layers: [
      { type: 'conic', repeat: true, from: 15, stops: [[T, 0, 25], [alpha(s, 0.95), 25, 32], [T, 32, 50], [alpha(s2, 0.8), 50, 53], [T, 53, 72]] },
      { type: 'radial', stops: [[b, 0], [toward(b, '#000000', 0.12), 100]] },
    ],
  }),
  steel: ([s, d]) => {
    const body = {
      type: 'linear', angle: 180,
      stops: [[toward(s, '#FFFFFF', 0.7), 0], [s, 38], [toward(d, '#FFFFFF', 0.25), 48], [d, 52], [toward(s, '#000000', 0.2), 70], [toward(s, '#FFFFFF', 0.5), 100]],
    };
    return { layers: [body], parts: { body, lines: d } };
  },
  'flame-swirl': ([f, f2, b]) => ({
    layers: [
      { type: 'radial', stops: [['#FFFFFF', 0, 10], [T, 28]] },
      { type: 'conic', repeat: true, stops: [[b, 0, 8], [f, 8, 14], [f2, 14, 20], [b, 20, 30]] },
    ],
  }),
  champion: ([g, d, fl]) => {
    const body = { type: 'radial', at: [40, 35], stops: [[g, 0], [toward(g, d, 0.6), 55], [d, 100]] };
    const flakes = FLAKES.map(([x, y, r]) => ({ type: 'radial', at: [x, y], stops: [[fl, 0, r], [T, r + 0.8]] }));
    return { layers: [...flakes, body], parts: { body, flake: fl, glow: g } };
  },
  'aurora-glass': ([a, b, c, sky]) => {
    const ribbons = [[a, 0.9], [b, 0.9], [c, 0.85]];
    const skyLayer = { type: 'solid', color: sky };
    return {
      layers: [
        ...STAR_DOTS,
        { type: 'linear', angle: 160, stops: [[T, 20], [alpha(a, 0.9), 36], [T, 52]] },
        { type: 'linear', angle: 200, stops: [[T, 34], [alpha(b, 0.9), 52], [T, 68]] },
        { type: 'linear', angle: 170, stops: [[T, 56], [alpha(c, 0.85), 70], [T, 86]] },
        skyLayer,
      ],
      parts: { sky: skyLayer, ribbons, glow: a },
    };
  },
  // Plain striped Originals.
  stripe: ([s, b]) => ({ layers: [{ type: 'linear', repeat: true, angle: 0, stops: [[s, 0, 16], [b, 16, 32]] }] }),
};

/** Which looks turn in their picture (moving patterns), and how fast. */
const SPIN = { corkscrew: 'fast', 'flame-swirl': 'slow', 'aurora-glass': 'slow' };
/** Which looks glow, and in what colour (slot index). */
const GLOW = { 'flame-swirl': 0, champion: 0, 'aurora-glass': 0 };

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
    background: toCss(look.layers),
    spin: SPIN[look.material] ?? null,
    glow: look.glow ? cssAlpha(look.glow, 0.5) : null,
  };
}

/** A plain Original (old one-colour marble): its colours as a simple picture. */
export function plainBadge({ color_primary: a = '#888888', color_secondary: b, pattern } = {}) {
  if (!b || pattern === 'solid') return { background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${a} 70%, #fff) 0, ${a} 45%, color-mix(in srgb, ${a} 55%, #000) 100%)`, spin: null, glow: null };
  if (pattern === 'striped') return { background: toCss(LOOKS.stripe([b, a]).layers), spin: null, glow: null };
  return { background: `conic-gradient(from 0deg, ${a}, ${b}, ${a}, ${b}, ${a})`, spin: pattern === 'galaxy' ? 'slow' : null, glow: null };
}
