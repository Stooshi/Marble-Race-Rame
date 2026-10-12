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
  'island-spins': 'Island Spins', 'sea-crossing': 'Sea Crossing', 'canopy-run': 'Canopy Run', 'terrace-run': 'Terrace Run', 'delta-skim': 'Delta Skim', 'two-spins': 'Two Spins', 'wall-dive': 'Wall Dive', staircases: 'Staircases',
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
const PINBALL_LAYOUTS = ['staircases'];
const TOUCHDOWNS = { 'sea-crossing': { tunnelRun: { height: 0 } }, 'terrace-run': { swoops: { height: 0 } }, 'wall-dive': { tunnelRun: { height: 0 } } };

const layouts = LAYOUT_KINDS.map((kind) => track({
  ...base(`variety-layout-${kind}`, `Variety Test: ${NAMES[kind]} Layout`, `The layout library's test track for the ${NAMES[kind].toLowerCase()} layout, with the classic opening${COASTER_LAYOUTS.includes(kind) ? ', built as a coaster' : PINBALL_LAYOUTS.includes(kind) ? ', built as a pinball table' : ''}.`),
  ...(COASTER_LAYOUTS.includes(kind) && { series: 'coaster', coaster: { height: 18 } }),
  ...(PINBALL_LAYOUTS.includes(kind) && { series: 'pinball', biome: 'playfield', lighting: 'parlour' }),
  opening: opening('classic'),
  sections: layout(kind, COASTER_LAYOUTS.includes(kind) ? { dress: { brakingStraight: { height: 0 }, ...TOUCHDOWNS[kind] } } : {}),
}));

module.exports = [...openings, ...layouts];
