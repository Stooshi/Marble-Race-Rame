/**
 * Northern Lights, four new design options (for Moses's review on /preview/marbles/northern-lights).
 * Preview only: nothing here is in the catalogue or the shop. Each option is a look as badge.js
 * makes them ({ material, layers, parts, glow }), from the same layer vocabulary (paint.js), so its
 * flat shop picture and its 3D marble are painted from the very same layers and colours.
 */
import { T, alpha } from '../../shared/marbles/paint';

const GREEN = '#3DDC97';
const VIOLET = '#8E5CF5';
const TEAL = '#13A8A8';
const NIGHT = '#0B1430';

// Tiny stars, fixed places (as the current design's), more and smaller.
const STARS = [
  [18, 22, 0.7], [31, 14, 0.5], [47, 19, 0.8], [63, 11, 0.6], [78, 24, 0.7], [86, 40, 0.5], [12, 46, 0.6], [24, 61, 0.5],
  [70, 58, 0.6], [83, 69, 0.8], [36, 80, 0.6], [55, 86, 0.5], [16, 75, 0.4], [92, 55, 0.4], [58, 34, 0.4], [40, 48, 0.4],
].map(([x, y, r]) => ({ type: 'radial', at: [x, y], stops: [['#FFFFFF', 0, r], [alpha('#FFFFFF', 0.4), r + 0.4], [T, r + 1.4]] }));

/** A. Aurora Swirl: green, teal and violet ribbons swirling round the ball, glowing from a pale core. */
function auroraSwirl() {
  const swirl = {
    type: 'conic',
    stops: [
      [NIGHT, 0], [GREEN, 28], ['#B8FFDF', 40], [GREEN, 52], [TEAL, 78], [NIGHT, 104], [VIOLET, 132], ['#D9C8FF', 146], [VIOLET, 160],
      [NIGHT, 190], [GREEN, 218], ['#B8FFDF', 230], [GREEN, 242], [TEAL, 268], [NIGHT, 294], [VIOLET, 318], ['#D9C8FF', 330], [VIOLET, 342], [NIGHT, 360],
    ],
  };
  const core = { type: 'radial', stops: [[alpha('#E9FFF4', 0.85), 0], [alpha(GREEN, 0.35), 18], [T, 34]] };
  // The ribbons twist half a turn and a bit from pole to pole; the picture is the ball seen down its axis.
  const pattern = { layers: [swirl], map: 'gores', twist: 200, repeat: 180 };
  return { material: 'aurora-swirl', layers: [core, { type: 'ball', pattern, view: 'axis' }], parts: { pattern, over: [core] }, glow: GREEN, spin: 'slow' };
}

/** B. Starry Aurora: a deep night sky full of tiny stars, curtains of green light with violet hems hanging across it. */
function starryAurora() {
  const sky = { type: 'radial', at: [45, 40], stops: [['#1B2A5C', 0], [NIGHT, 55], ['#050914', 100]] };
  const lights = [
    ...STARS,
    // Two curtains, each a bright lower hem fading up into faint rays.
    { type: 'linear', angle: 168, stops: [[T, 16], [alpha(GREEN, 0.25), 26], [alpha(GREEN, 0.75), 38], [alpha('#C9FFE6', 0.9), 41], [alpha(VIOLET, 0.55), 44], [T, 50]] },
    { type: 'linear', angle: 196, stops: [[T, 46], [alpha(TEAL, 0.2), 56], [alpha(GREEN, 0.7), 66], [alpha('#C9FFE6', 0.85), 68.5], [alpha(VIOLET, 0.5), 71], [T, 77]] },
    // (A soft glow of green light in the sky above the curtains.)
    { type: 'radial', at: [38, 30], stops: [[alpha(GREEN, 0.22), 0], [T, 42]] },
  ];
  return { material: 'starry-aurora', layers: [...lights, sky], parts: { body: [sky], pattern: { layers: lights, map: 'front', repeat: 180 } }, glow: GREEN, spin: 'slow' };
}

/** C. Iridescent: pearly glass that shimmers through the aurora's colours, rose, mint, sky and lilac, as it turns. */
function iridescent() {
  const pearl = { type: 'radial', at: [42, 38], stops: [['#FBF9FF', 0], ['#DCE6F7', 45], ['#8E9CC4', 100]] };
  const sheen = {
    type: 'conic',
    stops: [
      [alpha('#FF9AD5', 0.55), 0], [alpha('#FFE08A', 0.5), 45], [alpha('#8CFFC0', 0.6), 95], [alpha('#7FE8FF', 0.6), 150],
      [alpha('#B79BFF', 0.6), 210], [alpha('#FF9AD5', 0.5), 265], [alpha('#8CFFC0', 0.55), 315], [alpha('#FF9AD5', 0.55), 360],
    ],
  };
  // The sheen twists gently through the glass; the picture is the ball seen down its axis.
  const pattern = { layers: [sheen], map: 'gores', twist: 70, repeat: 180 };
  return { material: 'iridescent-aurora', layers: [{ type: 'ball', pattern, view: 'axis' }, pearl], parts: { body: [pearl], pattern }, glow: '#B79BFF', spin: 'slow' };
}

/**
 * D. Aurora World (our own idea): the marble is a little night-side planet seen from space, its
 * two auroral ovals glowing green round the poles with violet edges, a blue atmosphere at its rim.
 * The ovals turn with the ball as it rolls.
 */
function auroraWorld() {
  const globe = { type: 'radial', at: [44, 42], stops: [['#203a6e', 0], ['#0E1A3A', 55], ['#071026', 86], [alpha('#4FA8FF', 0.9), 96], ['#9FD6FF', 100]] };
  const ring = (radius) => [
    { radius: radius - 4, width: 3, soft: 3, color: alpha(VIOLET, 0.7) },
    { radius, width: 5, soft: 4, color: alpha(GREEN, 0.95) },
    { radius: radius + 3.5, width: 2, soft: 3, color: alpha('#D2FFE9', 0.8) },
  ];
  const pattern = { map: 'rings', axis: [0.25, 1, 0.75], rings: [...ring(28), ...ring(152)], view: 'front' };
  return { material: 'aurora-world', layers: [{ type: 'ball', pattern, view: 'front' }, globe], parts: { body: [globe], pattern: { ...pattern, repeat: 180 } }, glow: GREEN, spin: null };
}

export const AURORA_OPTIONS = [
  { key: 'swirl', letter: 'A', name: 'Aurora Swirl', idea: 'Glowing green, teal and violet ribbons swirling round the ball from a pale glowing core. Bold and bright, reads well small in the shop and fast in a race.', look: auroraSwirl() },
  { key: 'starry', letter: 'B', name: 'Starry Aurora', idea: 'A deep night sky full of tiny stars, with two curtains of green light, white-hot at their hems and fringed in violet. The closest to the real sky; calm and premium.', look: starryAurora() },
  { key: 'iridescent', letter: 'C', name: 'Iridescent', idea: 'Pearly glass that shimmers through rose, gold, mint, sky and lilac as it turns, like the aurora reflected in ice. Light and jewel-like, stands out on dark tracks.', look: iridescent() },
  { key: 'world', letter: 'D', name: 'Aurora World', idea: 'Our own idea: a tiny night-side planet seen from space, its two auroral ovals glowing round the poles, a blue atmosphere at its rim. The ovals tumble as it rolls.', look: auroraWorld() },
];

