/**
 * Holiday Season designs for Moses's review on /preview/marbles/holiday (preview only: nothing here is
 * in the catalogue or the shop):
 *   SEASON_OPTIONS: three options for the season marble (the pass holders' marble);
 *   WINTER_DESIGNS: the five designs of the Winter collection (its own prices, on sale 1 Dec–7 Jan).
 * Each is a look as badge.js makes them ({ material, layers, parts, glow, spin }), from the same layer
 * vocabulary (paint.js), so its flat shop picture and its 3D marble are painted from the same layers.
 */
import { T, alpha } from '../../shared/marbles/paint';

const dot = (x, y, r, color, glow = 0) => ({
  type: 'radial', at: [x, y],
  stops: glow ? [[color, 0, r], [alpha(typeof color === 'string' ? color : color.hex, 0.35), r + glow * 0.5], [T, r + glow]] : [[color, 0, r], [T, r + 0.9]],
});

// Snowflakes and frost specks: fixed places, so the picture and the ball match.
const FLAKES = [
  [20, 24, 0.9], [34, 13, 0.6], [52, 18, 0.7], [68, 12, 0.6], [81, 27, 0.8], [88, 46, 0.6], [13, 44, 0.7], [22, 64, 0.6],
  [71, 62, 0.7], [84, 72, 0.6], [38, 82, 0.8], [57, 88, 0.6], [15, 78, 0.5], [92, 58, 0.5], [62, 36, 0.5], [42, 52, 0.5], [30, 38, 0.4], [76, 44, 0.4],
];

/** A. Winter Solstice: deep blue glass, a frosted star burst at its heart, snowflakes drifting through it. */
function winterSolstice() {
  const sky = { type: 'radial', at: [44, 40], stops: [['#1D4F99', 0], ['#0E2A5C', 55], ['#071433', 100]] };
  const rays = { type: 'conic', repeat: true, stops: [[alpha('#DDEFFF', 0.32), 0, 1.2], [T, 2.6, 15]] };
  const core = { type: 'radial', stops: [['#FFFFFF', 0], [alpha('#CFE8FF', 0.85), 7], [alpha('#8FC4FF', 0.35), 20], [T, 38]] };
  const flakes = FLAKES.map(([x, y, r]) => dot(x, y, r, '#FFFFFF', 1.4));
  const lights = [...flakes, core, rays];
  return { material: 'winter-solstice', layers: [...lights, sky], parts: { body: [sky], pattern: { layers: lights, map: 'front', repeat: 180 } }, glow: '#8FC4FF', spin: 'slow' };
}

/** B. Holiday Lights: dark glass with two strings of warm coloured lights looping round it. */
function holidayLights() {
  const glass = { type: 'radial', at: [42, 36], stops: [['#2A3140', 0], ['#141922', 60], ['#07090D', 100]] };
  const colours = ['#FF4D4D', '#FFC83D', '#3DDC6B', '#4DA6FF', '#FF7AD9'];
  const string = (y0, amp, phase) => Array.from({ length: 12 }, (_, k) => {
    const x = 6 + k * 8;
    return [x, y0 + amp * Math.sin((x / 100) * Math.PI * 2 + phase)];
  });
  const lights = [...string(36, 9, 0), ...string(66, 8, 2.2)].map(([x, y], k) => dot(x, y, 1.6, colours[k % colours.length], 4.5));
  const wire = [
    { type: 'linear', angle: 172, stops: [[T, 33], [alpha('#0A0D12', 0.9), 34.5], [T, 36]] },
    { type: 'linear', angle: 188, stops: [[T, 63], [alpha('#0A0D12', 0.9), 64.5], [T, 66]] },
  ];
  const layers = [...lights, ...wire];
  return { material: 'holiday-lights', layers: [...layers, glass], parts: { body: [glass], pattern: { layers, map: 'front', repeat: 180 } }, glow: '#FFC83D', spin: 'slow' };
}

/** C. Midnight Fireworks (our own): a night sky with gold, magenta and silver bursts, for New Year at the end of the season. */
function midnightFireworks() {
  const night = { type: 'radial', at: [50, 42], stops: [['#1A1F4A', 0], ['#0B0F2A', 62], ['#04060F', 100]] };
  const burst = (cx, cy, R, colour) => {
    const out = [];
    for (let k = 0; k < 14; k += 1) {
      const a = (k / 14) * Math.PI * 2;
      out.push(dot(cx + R * Math.cos(a), cy + R * Math.sin(a), 1.1, colour, 2.6));
      out.push(dot(cx + R * 0.55 * Math.cos(a + 0.22), cy + R * 0.55 * Math.sin(a + 0.22), 0.7, '#FFFFFF', 1.6));
    }
    out.push({ type: 'radial', at: [cx, cy], stops: [[alpha('#FFFFFF', 0.95), 0, 1.2], [alpha(colour, 0.4), 4], [T, R * 0.9]] });
    return out;
  };
  const sparks = [...burst(36, 38, 15, '#FFC83D'), ...burst(68, 58, 12, '#FF5BC8'), ...burst(30, 74, 8, '#CFE0FF')];
  return { material: 'midnight-fireworks', layers: [...sparks, night], parts: { body: [night], pattern: { layers: sparks, map: 'front', repeat: 180 } }, glow: '#FF5BC8', spin: 'slow' };
}

export const SEASON_OPTIONS = [
  { key: 'solstice', letter: 'A', name: 'Winter Solstice', idea: 'Deep blue glass with a frosted star burst glowing at its heart and snowflakes drifting through it. Calm and wintry; reads well small.', look: winterSolstice() },
  { key: 'lights', letter: 'B', name: 'Holiday Lights', idea: 'Dark glass wrapped in two strings of warm coloured lights (red, gold, green, blue, pink) that glow as it rolls. Festive in every country, not tied to snow.', look: holidayLights() },
  { key: 'fireworks', letter: 'C', name: 'Midnight Fireworks', idea: 'Our own idea: a night sky with gold, magenta and silver bursts, for the New Year at the end of the season. Bright on dark tracks, at home on the summer tracks too.', look: midnightFireworks() },
];

// ── The Winter collection: five designs, one shade each ─────────────────────

/** Snowball (Common): soft white snow, shaded blue, flecked with frost. */
function snowball() {
  const body = { type: 'radial', at: [38, 32], stops: [['#FFFFFF', 0], ['#E6EEF7', 45], ['#AFC0D6', 100]] };
  const specks = FLAKES.map(([x, y, r]) => dot(x, y, r * 0.6, alpha('#9FB6D1', 0.8)));
  return { material: 'snowball', layers: [...specks, body], parts: { body: [body], pattern: { layers: specks, map: 'front', repeat: 180 } } };
}

/** Frost Clearie (Common): clear ice-blue glass with feathers of frost twisting through it. */
function frostClearie() {
  const glass = { type: 'radial', at: [40, 36], stops: [['#F2FBFF', 0], [alpha('#A9DDF5', 0.95), 55], ['#4E9CC8', 100]] };
  const frost = { type: 'conic', repeat: true, stops: [[alpha('#FFFFFF', 0.55), 0, 2], [T, 5, 24]] };
  const pattern = { layers: [frost], map: 'gores', twist: 50, repeat: 24 };
  return { material: 'frost-clearie', layers: [{ type: 'ball', pattern, view: 'axis' }, glass], parts: { body: [glass], pattern } };
}

/** Candy Cane (Uncommon): white with red and pale-pink stripes twisting round it. */
function candyCane() {
  const stripes = { type: 'conic', repeat: true, stops: [['#F7F4F0', 0, 22], ['#D62B35', 22, 36], ['#F7F4F0', 36, 46], ['#F2A9B0', 46, 52], ['#F7F4F0', 52, 60]] };
  const pattern = { layers: [stripes], map: 'gores', twist: 170, repeat: 60 };
  const shine = { type: 'radial', at: [36, 30], stops: [[alpha('#FFFFFF', 0.35), 0], [T, 40]] };
  const base = { type: 'solid', color: '#F7F4F0' };
  return { material: 'candy-cane', layers: [shine, { type: 'ball', pattern, view: 'axis' }], parts: { body: [base], pattern, over: [shine] }, spin: 'slow' };
}

/** Evergreen (Rare): bands of forest green like an agate, a cap of fresh snow on top. */
function evergreen() {
  const snow = { type: 'radial', at: [50, 2], stops: [['#FFFFFF', 0], ['#F4F8FC', 15], [alpha('#E8F0F8', 0.8), 19], [T, 23]] };
  const rings = { type: 'radial', repeat: true, at: [40, 70], stops: [['#0F3D2A', 0, 5], ['#1F6B45', 5, 9], ['#6FB48A', 9, 11], ['#14492F', 11, 16]] };
  return { material: 'evergreen', layers: [snow, rings], parts: { pattern: { layers: [snow, rings], map: 'front', repeat: 18 } } };
}

/** Midwinter Star (Epic): midnight-indigo glass with a glowing eight-point gold star at its heart. */
function midwinterStar() {
  const body = { type: 'radial', at: [46, 40], stops: [['#2E2470', 0], ['#17123F', 60], ['#08061C', 100]] };
  const star = { type: 'conic', repeat: true, from: -6, stops: [['#FFD45C', 0, 12], [T, 15, 45]] };
  const fade = { type: 'radial', stops: [[T, 0, 26], [alpha('#17123F', 0.92), 40], ['#17123F', 48]] };
  const halo = { type: 'radial', stops: [['#FFFFFF', 0, 3], ['#FFD45C', 9], [alpha('#FFB020', 0.45), 20], [T, 42]] };
  const sparkles = FLAKES.slice(0, 10).map(([x, y, r]) => dot(x, y, r * 0.7, '#FFE8A8', 1.2));
  const lights = [halo, ...sparkles];
  return { material: 'midwinter-star', layers: [...lights, fade, star, body], parts: { body: [body], pattern: { layers: [fade, star], map: 'front', repeat: 180 }, over: lights }, glow: '#FFD45C', spin: 'slow' };
}

export const WINTER_PRICES = { common: 800, uncommon: 2000, rare: 4500, epic: 9000 };
export const WINTER_DESIGNS = [
  { key: 'snowball', rarity: 'common', name: 'Snowball', idea: 'Soft white snow shaded blue, flecked with frost. The simplest and cheapest of the five.', look: snowball() },
  { key: 'frost', rarity: 'common', name: 'Frost Clearie', idea: 'Clear ice-blue glass with feathers of frost twisting through it as it rolls.', look: frostClearie() },
  { key: 'candy', rarity: 'uncommon', name: 'Candy Cane', idea: 'White with red and pale-pink stripes twisting round the ball, like a candy cane.', look: candyCane() },
  { key: 'evergreen', rarity: 'rare', name: 'Evergreen', idea: 'Bands of forest green like an agate, with a cap of fresh snow on top.', look: evergreen() },
  { key: 'star', rarity: 'epic', name: 'Midwinter Star', idea: 'Midnight-indigo glass with a glowing gold star of eight points at its heart and a few sparkles round it.', look: midwinterStar() },
];
