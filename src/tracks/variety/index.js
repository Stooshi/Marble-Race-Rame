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
  'spawn-meadow': 'Spawn Meadow', 'speedrun-straights': 'Speedrun Straights', 'peak-beams': 'Peak Beams', 'mine-shaft': 'Mine Shaft', 'magma-loops': 'Magma Loops',
  'clear-rows': 'Clear Rows', 'combo-steps': 'Combo Steps', 'stack-spiral': 'Stack Spiral', 'fortress-gate': 'Fortress Gate', 'final-level': 'Final Level',
  'slot-canyon': 'Slot Canyon', 'cliff-road': 'Cliff Road', 'rapids-gorge': 'Rapids Gorge', 'long-falls': 'Long Falls', 'siq-passage': 'Siq Passage',
  'island-hops': 'Island Hops', 'harbour-quays': 'Harbour Quays', 'temple-halls': 'Temple Halls', 'cascade-rows': 'Cascade Rows', 'bonus-stages': 'Bonus Stages',
  'horseshoe-sprint': 'Horseshoe Sprint', 'blue-lanes': 'Blue Lanes', 'bell-lap': 'Bell Lap', 'hurdles-straight': 'Hurdles Straight', 'nest-bend': 'Nest Bend',
  'photo-finish': 'Photo Finish', 'relay-legs': 'Relay Legs', 'steeple-water': 'Steeple Water', 'anchor-arches': 'Anchor Arches', 'golden-lap': 'Golden Lap',
  'half-pipe-run': 'Half-Pipe Run', 'mid-lottery': 'Mid Lottery', 'jib-run': 'Jib Run', 'jump-run': 'Jump Run', 'clean-drop': 'Clean Drop',
  'bridge-slalom': 'Bridge Slalom', 'market-maze': 'Market Maze', 'steamer-pass': 'Steamer Pass', 'falls-edge': 'Falls Edge', 'lock-staircase': 'Lock Staircase', 'peg-drop': 'Peg Drop', 'pipe-drop': 'Pipe Drop',
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

// Openings without the pile-up and slalom are proven on the mid lottery layout (the peg drop on the
// half-pipe run), a lottery further on as well as their waves at the gate.
const OPENING_LAYOUT = { 'clean-drop': 'mid-lottery', 'peg-drop': 'half-pipe-run', 'pipe-drop': 'mid-lottery' };
// (The pipe drop's test track: a stronger lottery, 6 gates at loss 0.25, as its batches asked: its
// half-pipe gives no luck of its own.)
const OPENING_LAYOUT_OPTIONS = { 'pipe-drop': { lotteryGates: 6, lotteryLoss: 0.25 } };
const openings = OPENING_KINDS.filter((k) => k !== 'classic').map((kind) => track({
  ...base(`variety-opening-${kind}`, `Variety Test: ${NAMES[kind]}`, `The opening library's test track for the ${NAMES[kind].toLowerCase()}, on the ${NAMES[OPENING_LAYOUT[kind] ?? 'classic'].toLowerCase()} layout.`),
  opening: opening(kind),
  sections: layout(OPENING_LAYOUT[kind] ?? 'classic', OPENING_LAYOUT_OPTIONS[kind] ?? {}),
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
const OWN_OPENING = { 'bridge-slalom': 'tunnel-launch', 'market-maze': 'crest-start', 'steamer-pass': 'staggered-drop', 'lock-staircase': 'clean-drop', 'siege-routes': 'crest-start', 'saucer-sweeps': 'staggered-drop', 'clock-tower': 'funnel-drop', 'encore-split': 'split-start', 'cabinet-rows': 'funnel-drop', 'maze-corridors': 'split-start', 'bullet-spirals': 'staggered-drop', 'up-up-down-down': 'crest-start', 'bracket-splits': 'banked-turn', 'coast-road': 'boost-launch', 'co-op-street': 'tunnel-launch', 'lower-playfield': ['banked-turn', { side: 'right' }] };
// (Lower playfield: the banked turn the other way, so the test track is Tilt's exact mirror image.)
// Layouts made for one canyon are proven on a test track built as a canyon (on the canyon floor, climbing out where its canyon does).
const CANYON_LAYOUTS = ['horseshoe-bend', 'great-bend', 'terrace-steps', 'rafting-run', 'six-canyons', 'basalt-gorge', 'twin-peaks', 'cliff-ledge', 'free-fall', 'meanders',
  'slot-canyon', 'cliff-road', 'rapids-gorge', 'long-falls', 'siq-passage'];
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
  'slot-canyon': { rimRun: { height: 14 }, corkscrew: { height: 14 } },
  'cliff-road': { rimRoad: { height: 30 }, lookout: { height: 30 } },
  'rapids-gorge': { highTrail: { height: 28 } },
  'long-falls': { ridgeSweep: { height: 28 }, toTheLip: { height: 14 }, plungePool: { height: 12 }, spin: { height: 12 } },
  'siq-passage': { openSweep: { height: 24 } },
};
// Layouts made for one Block Series track are proven on a test track built as a Block Series world (on its
// voxel land, flying on block pillars where its track does).
const BLOCK_LAYOUTS = ['spawn-meadow', 'speedrun-straights', 'peak-beams', 'mine-shaft', 'magma-loops', 'clear-rows', 'combo-steps', 'stack-spiral', 'fortress-gate', 'final-level',
  'island-hops', 'harbour-quays', 'temple-halls', 'cascade-rows', 'bonus-stages'];
const BLOCK_HEIGHTS = {
  'peak-beams': { beamSweep: { height: 30 }, ridgeSweep: { height: 18 } },
  'stack-spiral': { stackSpiral: { height: 12 } },
  'final-level': { loop: { height: 14 } },
  'island-hops': { bridge1: { height: 12 }, bridge2: { height: 10 } },
  'harbour-quays': { pier: { height: 6 }, basinSweep: { height: 6 } },
  'temple-halls': { stairs1: { height: 10 }, courtyard: { height: 10 } },
  'cascade-rows': { brakingStraight: { height: 10 }, hairpin: { height: 10 }, spin: { height: 10 } },
  'bonus-stages': { stage2: { height: 10 }, spin: { height: 10 } },
};
// Layouts made for one Track and Field track are proven on a test track built as a stadium (on its ground,
// the stadium round the sections its track runs inside it).
const ATHLETICS_LAYOUTS = ['horseshoe-sprint', 'blue-lanes', 'bell-lap', 'hurdles-straight', 'nest-bend', 'photo-finish', 'relay-legs', 'steeple-water', 'anchor-arches', 'golden-lap'];
const ATHLETICS_DRESS = {
  'horseshoe-sprint': { homeStraight: { stadium: true }, hairpin: { stadium: true }, backStraight: { stadium: true } },
  'blue-lanes': { stadiumBend: { stadium: true }, colonnade: { stadium: true } },
  'bell-lap': { backStraight: { stadium: true }, sweep: { stadium: true } },
  'hurdles-straight': { sweep: { stadium: true }, hurdles: { stadium: true } },
  'nest-bend': { longBend: { stadium: true }, homeStraight: { stadium: true } },
  'photo-finish': { longSweep: { stadium: true }, lastStraight: { stadium: true } },
  'relay-legs': { leg1: { stadium: true }, sweep1: { stadium: true }, leg2: { stadium: true } },
  'steeple-water': { barrier2: { stadium: true }, waterJump: { stadium: true }, sBends: { stadium: true } },
  'anchor-arches': { sweep2: { stadium: true }, lastStraight: { stadium: true } },
  'golden-lap': { goldenSweep: { stadium: true }, sBends: { stadium: true } },
};
// Layouts made for one Rivers track are proven on a test track built as a river (on its banks, flying out
// over the water where its track does), with the opening its track races.
const RIVER_LAYOUTS = ['bridge-slalom', 'market-maze', 'steamer-pass', 'falls-edge', 'lock-staircase'];
const RIVER_HEIGHTS = {
  'bridge-slalom': { flyOut: { height: 14 } },
  'market-maze': {},
  'steamer-pass': { bayou: { height: 10 } },
  'falls-edge': { lip: { height: 14 }, lipBend: { height: 14 } },
  'lock-staircase': {},
};
const TOUCHDOWNS = { 'sea-crossing': { tunnelRun: { height: 0 } }, 'terrace-run': { swoops: { height: 0 } }, 'wall-dive': { tunnelRun: { height: 0 } } };

const layouts = LAYOUT_KINDS.map((kind) => track({
  ...base(`variety-layout-${kind}`, `Variety Test: ${NAMES[kind]} Layout`, `The layout library's test track for the ${NAMES[kind].toLowerCase()} layout, with the ${OWN_OPENING[kind] ? `${NAMES[[].concat(OWN_OPENING[kind])[0]].toLowerCase()} opening its table races` : 'classic opening'}${COASTER_LAYOUTS.includes(kind) ? ', built as a coaster' : CANYON_LAYOUTS.includes(kind) ? ', built as a canyon' : BLOCK_LAYOUTS.includes(kind) ? ', built as a Block Series world' : ATHLETICS_LAYOUTS.includes(kind) ? ', built as a stadium' : RIVER_LAYOUTS.includes(kind) ? ', built as a river' : PINBALL_LAYOUTS.includes(kind) ? ', built as a pinball table' : ARCADE_LAYOUTS.includes(kind) ? ', built as an arcade world' : ''}.`),
  ...(COASTER_LAYOUTS.includes(kind) && { series: 'coaster', coaster: { height: 18 } }),
  ...(CANYON_LAYOUTS.includes(kind) && { series: 'canyon', biome: 'desert', canyon: { palette: 'grand-canyon' } }),
  ...(BLOCK_LAYOUTS.includes(kind) && { series: 'block', biome: 'meadow', block: { world: 'meadow' } }),
  ...(ATHLETICS_LAYOUTS.includes(kind) && { series: 'athletics', biome: 'city', surface: 'tartan', athletics: { stadium: 'bislett' } }),
  ...(RIVER_LAYOUTS.includes(kind) && { series: 'river', biome: 'meadow', river: { palette: 'danube' }, start: { landmark: 'mountain-hut', type: kind === 'market-maze' ? 'river-boat' : 'pier' } }),
  ...(PINBALL_LAYOUTS.includes(kind) && { series: 'pinball', biome: 'playfield', lighting: 'parlour' }),
  ...(ARCADE_LAYOUTS.includes(kind) && { series: 'arcade', biome: 'circuit-board', lighting: 'neon-night', billboardFrame: 'marquee' }),
  opening: opening(...[].concat(OWN_OPENING[kind] ?? 'classic')),
  sections: layout(kind, COASTER_LAYOUTS.includes(kind) ? { dress: { brakingStraight: { height: 0 }, ...TOUCHDOWNS[kind] } } : CANYON_LAYOUTS.includes(kind) ? { dress: CANYON_HEIGHTS[kind] } : BLOCK_LAYOUTS.includes(kind) ? { dress: BLOCK_HEIGHTS[kind] ?? {} } : ATHLETICS_LAYOUTS.includes(kind) ? { dress: ATHLETICS_DRESS[kind] } : RIVER_LAYOUTS.includes(kind) ? { dress: RIVER_HEIGHTS[kind] } : {}),
}));

module.exports = [...openings, ...layouts];
