'use strict';

// Baikal Clear Ice: Blocks Series 2 (winter), a great frozen lake built from cubes. Up the lift and down the pipe drop, a sweep out of an
// ice grotto, the table top across the clear blue ice (big feature one), round a rock island, the waterfall drop
// down a frozen icefall (big feature two), across the hummocks, the hairpin and a sweep along the shore.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'baikal-clear-ice',
  name: 'Baikal Clear Ice',
  family: 'block-2',
  difficulty: 'extreme',
  description: 'A great frozen lake built from cubes: out of an ice grotto, across the clear blue ice over a table top, round a rock island and down a frozen icefall to the shore.',
  surface: 'ice',
  biome: 'arctic',
  lighting: 'day',
  variants: ['sunset'],
  block: { world: 'clearice' },
  coaster: { style: 'blocks', colours: { support: '#5a6670', rail: '#f2f8fc', tie: '#3f4a54' } },
  signature: 'Down the icefall',
  tvCameras: [
    { section: 'Across the clear ice', at: 0.6, side: 'right', distance: 10, height: 12 },
    { section: 'Across the hummocks', at: 0.4, side: 'left', distance: 10, height: 12 },
  ],
  start: { landmark: 'ice-grotto', type: 'straight-lift', gate: 'paddle', shots: { countdown: 'above', launch: 'overhead' } },
  finish: { landmark: 'rock-island' },
  designChanges: [
    'Blocks Series 2 (Moses, 30 Oct 2026): two big features, the table top across the clear ice and the waterfall drop down a frozen icefall. Built from the clear ice layout made for this track (L121).',
    'A generic Lake Baikal landscape built from cubes; no real building copied and nothing on a summit.',
  ],
  opening: opening('pipe-drop', {
    side: 'left',
    costumes: { block: 'voxel-cube', slalom: 'cube-pillar' },
  }),
  sections: layout('clear-ice', {
    costumes: { slalom: 'cube-pillar', peg: 'cube-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      grotto: { landmarks: [{ name: 'ice-grotto', at: 0.3, side: 'left', distance: 16 }] },
      ice: { landmarks: [{ name: 'ice-hummocks', at: 0.5, side: 'left', distance: 26 }] },
      rockIsland: { landmarks: [{ name: 'rock-island', at: 0.5, side: 'right', distance: 26 }] },
      hummocks: { landmarks: [{ name: 'ice-hummocks', at: 0.5, side: 'right', distance: 26 }] },
      shoreSweep: { landmarks: [{ name: 'rock-island', at: 0.5, side: 'left', distance: 60 }] },
      lastStraight: { name: 'To the shore', landmarks: [{ name: 'ice-hummocks', at: 0.4, side: 'right', distance: 24 }] },
    },
  }),
});
