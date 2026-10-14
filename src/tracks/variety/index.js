'use strict';

// The variety libraries' test tracks: one per opening (each on the classic layout) and
// one per layout (each with the classic opening). Like the Kit Proving Ground they are
// never raced for real (not in the database); each passed its full track report before
// any real track used its opening or layout. Preview: /preview/physics?track=<slug>.
const { track, opening, layout, OPENING_KINDS, LAYOUT_KINDS } = require('../../trackKit');

const NAMES = {
  classic: 'Classic', 'split-start': 'Split-and-Merge Start', 'staggered-drop': 'Staggered Drop', 'tunnel-launch': 'Tunnel Launch',
  'banked-turn': 'Banked First Turn', 'boost-launch': 'Boost-Pad Launch', 'funnel-drop': 'Funnel Drop', 'crest-start': 'Crest Start',
  'early-hairpin': 'Early Hairpin', 'twin-spirals': 'Twin Spirals', 'climb-drop': 'Climb and Drop', 'late-splitter': 'Late Splitter',
  'mid-drop': 'Mid Drop', 'two-splitters': 'Two Splitters', 'long-sweeps': 'Long Sweeps',
  'island-spins': 'Island Spins', 'sea-crossing': 'Sea Crossing', 'canopy-run': 'Canopy Run', 'terrace-run': 'Terrace Run', 'delta-skim': 'Delta Skim', 'two-spins': 'Two Spins', 'wall-dive': 'Wall Dive', staircases: 'Staircases', 'siege-routes': 'Siege Routes', 'stage-hairpin': 'Stage Hairpin', 'saucer-sweeps': 'Saucer Sweeps', 'lower-playfield': 'Lower Playfield', 'clock-tower': 'Clock Tower', 'encore-split': 'Encore Split', 'cabinet-rows': 'Cabinet Rows', 'maze-corridors': 'Maze Corridors', 'bullet-spirals': 'Bullet Spirals', 'up-up-down-down': 'Up Up Down Down', 'bracket-splits': 'Bracket Splits', 'coast-road': 'Coast Road', 'co-op-street': 'Co-op Street',
  'horseshoe-bend': 'Horseshoe Bend', 'great-bend': 'Great Bend', 'terrace-steps': 'Terrace Steps', 'rafting-run': 'Rafting Run', 'six-canyons': 'Six Canyons',
  'basalt-gorge': 'Basalt Gorge', 'twin-peaks': 'Twin Peaks', 'cliff-ledge': 'Cliff Ledge', 'free-fall': 'Free Fall', meanders: 'Meanders',
};

const base = (slug, name, description) => ({
  slug,
  name,
  family: 'test',
  difficulty: 'extreme',
  description,
  surface: 'ice',
  biome: 'alpine',
  lighting: 'day',
  start: { landmark: 'mountain-hut' },
  finish: { landmark: 'church' },
});

const openings = OPENING_KINDS.filter((k) => k !== 'classic').map((kind) => track({
  ...base(`variety-opening-${kind}`, `Variety Test: ${NAMES[kind]}`, `The opening library's test track for the ${NAMES[kind].toLowerCase()}, on the classic layout.`),
  opening: opening(kind),
  sections: layout('classic'),
}));

// Layouts made for one coaster are proven on a test track built as a coaster (up on its
// supports, touching down at the run to the hairpin and where else its coaster does), as that coaster will race them.
const COASTER_LAYOUTS = ['island-spins', 'sea-crossing', 'canopy-run', 'terrace-run', 'delta-skim', 'two-spins', 'wall-dive'];
// (Where else each touches down, as its coaster does: enough of it on the land.)
// Layouts made for one pinball table are proven on a test track built as a pinball table.
const PINBALL_LAYOUTS = ['staircases', 'siege-routes', 'stage-hairpin', 'saucer-sweeps', 'lower-playfield', 'clock-tower', 'encore-split'];
// A layout whose results depend on how the field arrives (a splitter's balance, the spread) is proven with its table's own opening.
// Layouts made for one arcade world are proven on a test track built as an arcade world.
const ARCADE_LAYOUTS = ['cabinet-rows', 'maze-corridors', 'bullet-spirals', 'up-up-down-down', 'bracket-splits', 'coast-road', 'co-op-street'];
const OWN_OPENING = { 'siege-routes': 'crest-start', 'saucer-sweeps': 'staggered-drop', 'clock-tower': 'funnel-drop', 'encore-split': 'split-start', 'cabinet-rows': 'funnel-drop', 'maze-corridors': 'split-start', 'bullet-spirals': 'staggered-drop', 'up-up-down-down': 'crest-start', 'bracket-splits': 'banked-turn', 'coast-road': 'boost-launch', 'co-op-street': 'tunnel-launch', 'lower-playfield': ['banked-turn', { side: 'right' }] };
// (Lower playfield: the banked turn the other way, so the test track is Tilt's exact mirror image.)
// Layouts made for one canyon are proven on a test track built as a canyon (on the canyon floor, climbing out where its canyon does).
const CANYON_LAYOUTS = ['horseshoe-bend', 'great-bend', 'terrace-steps', 'rafting-run', 'six-canyons', 'basalt-gorge', 'twin-peaks', 'cliff-ledge', 'free-fall', 'meanders'];
const CANYON_HEIGHTS = {
  'horseshoe-bend': { climbOut: { height: 40 }, sweep2: { height: 12 } },
  'great-bend': { ledge: { height: 36 }, greatBend: { height: 16 } },
  'terrace-steps': { highSweep: { height: 34 }, sweep2: { height: 18 } },
  'rafting-run': { whirlpool: { height: 10 }, sweep: { height: 32 } },
  'six-canyons': { hop1: { height: 30 }, hop2: { height: 28 }, hop3: { height: 32 }, spin: { height: 16 } },
  'basalt-gorge': { trestle1: { height: 32 }, trestle2: { height: 24 } },
  'twin-peaks': { sweep1: { height: 30 }, spin: { height: 14 } },
  'cliff-ledge': { ledge: { height: 26 }, ledgeBend: { height: 26 }, spin: { height: 14 } },
  'free-fall': { highSweep: { height: 30 }, sweep2: { height: 16 } },
  meanders: { highSweep: { height: 28 } },
};
const TOUCHDOWNS = { 'sea-crossing': { tunnelRun: { height: 0 } }, 'terrace-run': { swoops: { height: 0 } }, 'wall-dive': { tunnelRun: { height: 0 } } };

const layouts = LAYOUT_KINDS.map((kind) => track({
  ...base(`variety-layout-${kind}`, `Variety Test: ${NAMES[kind]} Layout`, `The layout library's test track for the ${NAMES[kind].toLowerCase()} layout, with the ${OWN_OPENING[kind] ? `${NAMES[[].concat(OWN_OPENING[kind])[0]].toLowerCase()} opening its table races` : 'classic opening'}${COASTER_LAYOUTS.includes(kind) ? ', built as a coaster' : CANYON_LAYOUTS.includes(kind) ? ', built as a canyon' : PINBALL_LAYOUTS.includes(kind) ? ', built as a pinball table' : ARCADE_LAYOUTS.includes(kind) ? ', built as an arcade world' : ''}.`),
  ...(COASTER_LAYOUTS.includes(kind) && { series: 'coaster', coaster: { height: 18 } }),
  ...(CANYON_LAYOUTS.includes(kind) && { series: 'canyon', biome: 'desert', canyon: { palette: 'grand-canyon' } }),
  ...(PINBALL_LAYOUTS.includes(kind) && { series: 'pinball', biome: 'playfield', lighting: 'parlour' }),
  ...(ARCADE_LAYOUTS.includes(kind) && { series: 'arcade', biome: 'circuit-board', lighting: 'neon-night', billboardFrame: 'marquee' }),
  opening: opening(...[].concat(OWN_OPENING[kind] ?? 'classic')),
  sections: layout(kind, COASTER_LAYOUTS.includes(kind) ? { dress: { brakingStraight: { height: 0 }, ...TOUCHDOWNS[kind] } } : CANYON_LAYOUTS.includes(kind) ? { dress: CANYON_HEIGHTS[kind] } : {}),
}));

module.exports = [...openings, ...layouts];
