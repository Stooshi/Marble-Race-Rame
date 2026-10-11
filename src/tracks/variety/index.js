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

const layouts = LAYOUT_KINDS.map((kind) => track({
  ...base(`variety-layout-${kind}`, `Variety Test: ${NAMES[kind]} Layout`, `The layout library's test track for the ${NAMES[kind].toLowerCase()} layout, with the classic opening.`),
  opening: opening('classic'),
  sections: layout(kind),
}));

module.exports = [...openings, ...layouts];
