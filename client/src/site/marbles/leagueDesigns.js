/**
 * The league marble: three options for Moses's review on /preview/marbles/league (preview only:
 * nothing here is in the catalogue or the shop). One marble for every league; only league winners
 * get it. Each is a look as badge.js makes them ({ material, layers, parts, glow, spin }), from the
 * same layer vocabulary (paint.js), so its flat picture and its 3D marble are painted from the same layers.
 */
import { T, alpha } from '../../shared/marbles/paint';

const dot = (x, y, r, color, glow = 0) => ({
  type: 'radial', at: [x, y],
  stops: glow ? [[color, 0, r], [alpha(color, 0.35), r + glow * 0.5], [T, r + glow]] : [[color, 0, r], [T, r + 0.9]],
});

/** A. Champion's Laurel: warm gold glass, a wreath of pale leaves in pairs round its middle, a bright star at its heart. */
function championsLaurel() {
  const gold = { type: 'radial', at: [40, 34], stops: [['#FFE9A8', 0], ['#E8B53C', 38], ['#A8701A', 78], ['#5E3A08', 100]] };
  const leaves = [];
  for (let k = 0; k < 16; k += 1) {
    const x = 5 + k * 6;
    for (const dy of [-3.6, 3.6]) leaves.push({ type: 'radial', at: [x + 1.5, 50 + dy], stops: [[alpha('#FFF8E0', 0.98), 0, 2], [alpha('#FFF6D6', 0.5), 2.9], [T, 3.8]] });
  }
  const stem = { type: 'linear', angle: 180, stops: [[T, 49], [alpha('#FFF1C2', 0.9), 49.6], [alpha('#FFF1C2', 0.9), 50.4], [T, 51]] };
  const shade = { type: 'linear', angle: 180, stops: [[T, 43], [alpha('#7A4A0C', 0.55), 45], [alpha('#7A4A0C', 0.55), 55], [T, 57]] };
  const heart = { type: 'radial', at: [50, 28], stops: [['#FFFFFF', 0], [alpha('#FFF4C9', 0.85), 3], [alpha('#FFE39A', 0.35), 8], [T, 13]] };
  const twinkles = [[38, 22], [62, 22], [44, 34], [56, 34], [50, 16]].map(([x, y]) => dot(x, y, 0.6, '#FFFFFF', 1.8));
  const pattern = [heart, ...twinkles, ...leaves, stem, shade];
  return { material: 'league-laurel', layers: [...pattern, gold], parts: { body: [gold], pattern: { layers: pattern, map: 'front', repeat: 180 } }, glow: '#FFD05A', spin: 'slow' };
}

/** B. Racing Stripes: midnight-blue glass with two white racing stripes edged in gold, as on a race car, and a few gold sparks. */
function racingStripes() {
  const night = { type: 'radial', at: [42, 36], stops: [['#2B3D7A', 0], ['#152154', 55], ['#080D26', 100]] };
  const stripe = (from, to) => ({ type: 'linear', angle: 90, stops: [[T, from - 0.9], [alpha('#FFC94A', 0.95), from - 0.3], [alpha('#F4F6FB', 0.97), from + 0.3], [alpha('#F4F6FB', 0.97), to - 0.3], [alpha('#FFC94A', 0.95), to + 0.3], [T, to + 0.9]] });
  const sparks = [[22, 22], [76, 20], [80, 74], [24, 80], [70, 46]].map(([x, y]) => dot(x, y, 0.8, '#FFC94A', 2.4));
  const pattern = [stripe(40, 46), stripe(54, 60), ...sparks];
  return { material: 'league-racing-stripes', layers: [...pattern, night], parts: { body: [night], pattern: { layers: pattern, map: 'front', repeat: 180 } }, glow: '#FFC94A', spin: 'slow' };
}

/** C. Victory Lap (our own): deep teal glass with three gold orbits looping round it like laps, a small sun where they meet. */
function victoryLap() {
  const teal = { type: 'radial', at: [44, 38], stops: [['#3FD3C1', 0], ['#14806F', 50], ['#06372F', 100]] };
  const orbit = (angle, at) => ({ type: 'linear', angle, stops: [[T, at - 2], [alpha('#FFD86B', 0.95), at - 0.6], [alpha('#FFE9A8', 0.95), at + 0.6], [T, at + 2]] });
  const orbits = [orbit(140, 50), orbit(180, 50), orbit(220, 50)];
  const sun = { type: 'radial', at: [50, 50], stops: [['#FFFFFF', 0], [alpha('#FFE59A', 0.9), 3], [alpha('#FFD86B', 0.35), 8], [T, 16]] };
  const sparks = [[18, 30], [82, 34], [26, 70], [74, 68]].map(([x, y]) => dot(x, y, 0.9, '#FFF2C4', 2.2));
  const pattern = [sun, ...orbits, ...sparks];
  return { material: 'league-victory-lap', layers: [...pattern, teal], parts: { body: [teal], pattern: { layers: pattern, map: 'front', repeat: 180 } }, glow: '#FFD86B', spin: 'slow' };
}

export const LEAGUE_OPTIONS = [
  { key: 'laurel', letter: 'A', name: "Champion's Laurel", idea: 'Warm gold glass with a wreath of pale leaves in pairs round its middle and a bright star at its heart. The classic winner\'s look: reads as "champion" at any size.', look: championsLaurel() },
  { key: 'stripes', letter: 'B', name: 'Racing Stripes', idea: 'Midnight-blue glass with two white racing stripes edged in gold, as on a race car, and a few gold sparks. The most "racing" of the three, and it stands out on light and dark tracks.', look: racingStripes() },
  { key: 'lap', letter: 'C', name: 'Victory Lap', idea: 'Our own idea: deep teal glass with three gold orbits looping round it like laps, a small sun where they cross. Different from every marble in the shop; calm, and still gold enough to feel like a prize.', look: victoryLap() },
];
