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

const RECIPES = {
  stripe: ([s, b]) => `repeating-linear-gradient(45deg, ${b} 0 9%, ${s} 9% 18%)`,
  'vane-glass': ([v, v2, g]) => `radial-gradient(circle, ${T} 0 38%, ${alpha(g, 0.92)} 72%), conic-gradient(from 15deg, ${T} 0 26deg, ${v} 26deg 52deg, ${T} 52deg 116deg, ${v2} 116deg 142deg, ${T} 142deg 206deg, ${v} 206deg 232deg, ${T} 232deg 296deg, ${v2} 296deg 322deg, ${T} 322deg), radial-gradient(circle, #F4FAFF 0, ${g} 70%, #5E8FAE 100%)`,
  rings: ([l, m, d]) => `repeating-radial-gradient(circle at 40% 40%, ${l} 0 6%, ${m} 6% 12%, ${d} 12% 14%)`,
  stone: ([s, s2, f, f2]) => `radial-gradient(circle at 25% 35%, ${f} 0 4%, ${T} 5%), radial-gradient(circle at 62% 22%, ${f2} 0 3%, ${T} 4%), radial-gradient(circle at 70% 64%, ${f} 0 5%, ${T} 6%), radial-gradient(circle at 38% 72%, ${f2} 0 3%, ${T} 4%), radial-gradient(circle at 50% 48%, ${f} 0 2.5%, ${T} 3.5%), radial-gradient(circle at 82% 38%, ${f2} 0 2%, ${T} 3%), linear-gradient(135deg, ${s}, ${s2})`,
  'gem-bands': ([d, m, f, dp]) => `repeating-linear-gradient(70deg, ${d} 0 6%, ${m} 6% 14%, ${f} 14% 17%, ${dp} 17% 24%)`,
  bands: ([a, b]) => `repeating-linear-gradient(0deg, ${a} 0 16%, ${b} 16% 32%)`,
  'swirl-glass': ([d, b, f, a]) => `conic-gradient(from 0deg, ${d}, ${b}, ${f}, ${a}, ${d}, ${b}, ${f}, ${a}, ${d})`,
  melon: ([fl, p, r, s]) => `radial-gradient(circle at 42% 40%, ${s} 0 3%, ${T} 4%), radial-gradient(circle at 60% 50%, ${s} 0 3%, ${T} 4%), radial-gradient(circle at 46% 62%, ${s} 0 3%, ${T} 4%), radial-gradient(circle at 58% 32%, ${s} 0 2.5%, ${T} 3.5%), radial-gradient(circle, ${fl} 0 56%, ${p} 56% 62%, ${r} 62% 80%, color-mix(in srgb, ${r} 60%, #000) 80%)`,
  'nebula-glass': ([sp, c1, c2]) => `${STARS}, radial-gradient(circle at 62% 38%, ${alpha(c1, 0.75)} 0, ${T} 45%), radial-gradient(circle at 30% 70%, ${alpha(c2, 0.65)} 0, ${T} 42%), ${sp}`,
  lava: ([r, c, c2, core]) => `radial-gradient(circle, ${alpha(core, 0.95)} 0, ${alpha(c, 0.65)} 16%, ${T} 38%), conic-gradient(from 30deg, ${r} 0 40deg, ${c} 40deg 47deg, ${r} 47deg 110deg, ${core} 110deg 114deg, ${r} 114deg 200deg, ${c2} 200deg 208deg, ${r} 208deg 290deg, ${c} 290deg 296deg, ${r} 296deg)`,
  'core-glass': ([g, c, c2, b]) => `radial-gradient(circle at 36% 62%, ${alpha(b, 0.9)} 0 2%, ${T} 3%), radial-gradient(circle at 64% 36%, ${alpha(b, 0.9)} 0 1.5%, ${T} 2.5%), radial-gradient(circle at 50% 52%, ${c} 0, ${c2} 30%, ${T} 31%), radial-gradient(circle, ${alpha(g, 0.95)} 0, ${alpha(g, 0.85)} 80%, #6C9BB8 100%)`,
  'neon-grid': ([l, l2, b, b2]) => `repeating-linear-gradient(0deg, ${alpha(l, 0.95)} 0 2.5%, ${T} 2.5% 14%), repeating-linear-gradient(90deg, ${alpha(l2, 0.95)} 0 2.5%, ${T} 2.5% 14%), linear-gradient(180deg, ${b}, ${b2})`,
  checks: ([a, b, seam]) => `linear-gradient(0deg, ${T} 48.5%, ${seam} 48.5% 51.5%, ${T} 51.5%), repeating-conic-gradient(${a} 0 25%, ${b} 0 50%) 0 0 / 30% 30%`,
  sunfire: ([sp, g, f, e]) => `conic-gradient(from 0deg, ${T} 0 50deg, ${alpha(f, 0.95)} 50deg 80deg, ${T} 80deg 170deg, ${alpha(sp, 0.6)} 170deg 195deg, ${T} 195deg 260deg, ${alpha(e, 0.9)} 260deg 290deg, ${T} 290deg), radial-gradient(circle at 35% 30%, ${sp} 0%, ${g} 28%, ${e} 100%)`,
  'black-hole': ([r, r2, r3, core]) => `radial-gradient(circle, ${core} 0 21%, ${T} 23%), radial-gradient(circle, ${T} 0 30%, rgba(5,5,15,0.85) 72%), conic-gradient(from 0deg, ${r}, ${r2}, ${r3}, #141413, ${r3}, ${r2}, ${r})`,
  'aurora-glass': ([a, b, c, sky]) => `${STARS}, linear-gradient(160deg, ${T} 20%, ${alpha(a, 0.9)} 36%, ${T} 52%), linear-gradient(200deg, ${T} 34%, ${alpha(b, 0.9)} 52%, ${T} 68%), linear-gradient(170deg, ${T} 56%, ${alpha(c, 0.85)} 70%, ${T} 86%), ${sky}`,
};

/** Which looks turn in their badge (moving patterns), and how fast. */
const SPIN = { 'swirl-glass': 'slow', 'nebula-glass': 'slow', sunfire: 'slow', 'black-hole': 'fast', 'aurora-glass': 'slow' };
/** Which looks glow, and in what colour (slot index). */
const GLOW = { lava: 1, 'neon-grid': 0, sunfire: 1, 'black-hole': 1, 'aurora-glass': 0 };

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
