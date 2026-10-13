/**
 * Flat marble pictures for cards, lists and certificates: a CSS background per
 * look, painted from the shade's colours (the same recipes as the design's
 * cards). Plain strings, no DOM: the website and the phone apps both use them.
 * The 3D looks (materials.js) are what races draw; these are the 2D badges.
 */
import { ITEM } from './index.js';

const T = 'rgba(0,0,0,0)';
const STARS = [
  [22, 30, 1.6, 2.4], [70, 24, 1.2, 2], [58, 66, 1.8, 2.6], [30, 74, 1, 1.8], [80, 52, 1.2, 2], [44, 40, 0.9, 1.6],
].map(([x, y, a, b]) => `radial-gradient(circle at ${x}% ${y}%, #FFF 0 ${a}%, ${T} ${b}%)`).join(', ');

/** The shine laid over every badge (a highlight, a soft second glint, a darker rim). */
export const GLOSS = 'radial-gradient(circle at 33% 27%, rgba(255,255,255,0.95) 0, rgba(255,255,255,0.4) 8%, rgba(255,255,255,0) 19%), '
  + 'radial-gradient(circle at 68% 78%, rgba(255,255,255,0.25) 0, rgba(255,255,255,0) 14%), '
  + 'radial-gradient(circle at 50% 45%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.55) 100%)';

const alpha = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// Darker or lighter shades of a colour, for depth.
const shade = (hex, to, k) => `color-mix(in srgb, ${hex} ${Math.round((1 - k) * 100)}%, ${to})`;
// Flakes for the Champion Shooter (fixed places, so every badge is the same).
const FLAKES = [[30, 34, 1.2], [56, 26, 0.9], [72, 50, 1.3], [44, 56, 1], [28, 66, 0.8], [60, 74, 1.1], [50, 42, 0.7], [38, 22, 0.8], [66, 64, 0.9], [22, 48, 1], [78, 36, 0.7], [46, 80, 0.8], [58, 54, 0.6], [34, 46, 0.6]];

const RECIPES = {
  'clear-glass': ([g, d]) => `radial-gradient(circle, ${shade(g, '#fff', 0.45)} 0, ${alpha(g, 0.9)} 70%, ${d} 100%)`,
  'agate-rings': ([d, m, l]) => `repeating-radial-gradient(circle at 30% 70%, ${d} 0 5%, ${m} 5% 9%, ${l} 9% 11%, ${shade(d, '#000', 0.25)} 11% 16%)`,
  patch: ([p, p2, b]) => `radial-gradient(circle at 70% 30%, ${p} 0 38%, ${T} 40%), radial-gradient(circle at 25% 75%, ${p2} 0 30%, ${T} 32%), ${b}`,
  'vane-glass': ([v, v2, g]) => `radial-gradient(circle, ${T} 0 38%, ${alpha(g, 0.92)} 72%), conic-gradient(from 15deg, ${T} 0 26deg, ${v} 26deg 52deg, ${T} 52deg 116deg, ${v2} 116deg 142deg, ${T} 142deg 206deg, ${v} 206deg 232deg, ${T} 232deg 296deg, ${v2} 296deg 322deg, ${T} 322deg), radial-gradient(circle, #F4FAFF 0, ${g} 70%, #5E8FAE 100%)`,
  corkscrew: ([a, b, base]) => `conic-gradient(${a} 0 12%, ${base} 12% 25%, ${b} 25% 37%, ${base} 37% 50%, ${a} 50% 62%, ${base} 62% 75%, ${b} 75% 87%, ${base} 87%)`,
  'bee-bands': ([s, b]) => `repeating-linear-gradient(0deg, ${s} 0 16%, ${b} 16% 32%)`,
  oxblood: ([s, s2, b]) => `repeating-conic-gradient(from 15deg, ${T} 0 25deg, ${alpha(s, 0.95)} 25deg 32deg, ${T} 32deg 50deg, ${alpha(s2, 0.8)} 50deg 53deg, ${T} 53deg 72deg), radial-gradient(circle, ${b} 0, ${shade(b, '#000', 0.12)} 100%)`,
  steel: ([s, d]) => `linear-gradient(180deg, ${shade(s, '#fff', 0.7)} 0%, ${s} 38%, ${shade(d, '#fff', 0.25)} 48%, ${d} 52%, ${shade(s, '#000', 0.2)} 70%, ${shade(s, '#fff', 0.5)} 100%)`,
  'flame-swirl': ([f, f2, b]) => `radial-gradient(circle, #FFFFFF 0 10%, ${T} 28%), repeating-conic-gradient(from 0deg, ${b} 0 8deg, ${f} 8deg 14deg, ${f2} 14deg 20deg, ${b} 20deg 30deg)`,
  champion: ([g, d, fl]) => `${FLAKES.map(([x, y, r]) => `radial-gradient(circle at ${x}% ${y}%, ${fl} 0 ${r}%, ${T} ${r + 0.8}%)`).join(', ')}, radial-gradient(circle at 40% 35%, ${g} 0, ${shade(g, d, 0.6)} 55%, ${d} 100%)`,
  'aurora-glass': ([a, b, c, sky]) => `${STARS}, linear-gradient(160deg, ${T} 20%, ${alpha(a, 0.9)} 36%, ${T} 52%), linear-gradient(200deg, ${T} 34%, ${alpha(b, 0.9)} 52%, ${T} 68%), linear-gradient(170deg, ${T} 56%, ${alpha(c, 0.85)} 70%, ${T} 86%), ${sky}`,
};

/** Which looks turn in their badge (moving patterns), and how fast. */
const SPIN = { corkscrew: 'fast', 'flame-swirl': 'slow', 'aurora-glass': 'slow' };
/** Which looks glow, and in what colour (slot index). */
const GLOW = { 'flame-swirl': 0, champion: 0, 'aurora-glass': 0 };

/** { background, spin, glow } for an item's badge. */
export function badgeOf(slug) {
  const item = ITEM[slug];
  if (!item) return { background: '#888', spin: null, glow: null };
  const colours = item.shade.colours.map((c) => c.hex);
  const recipe = RECIPES[item.design.material];
  const g = GLOW[item.design.material];
  return {
    background: recipe ? recipe(colours) : colours[0],
    spin: SPIN[item.design.material] ?? null,
    glow: g === undefined ? null : alpha(colours[g], 0.5),
  };
}

/** A plain Original (old one-colour marble): its colours as a simple badge. */
export function plainBadge({ color_primary: a = '#888888', color_secondary: b, pattern } = {}) {
  if (!b || pattern === 'solid') return { background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${a} 70%, #fff) 0, ${a} 45%, color-mix(in srgb, ${a} 55%, #000) 100%)`, spin: null, glow: null };
  if (pattern === 'striped') return { background: RECIPES.stripe([b, a]), spin: null, glow: null };
  return { background: `conic-gradient(from 0deg, ${a}, ${b}, ${a}, ${b}, ${a})`, spin: pattern === 'galaxy' ? 'slow' : null, glow: null };
}
