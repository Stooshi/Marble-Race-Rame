'use strict';

// Kirkjufell Block Falls: Blocks Series 2 (mountains), Iceland's arrowhead mountain built from cubes. Off a lighthouse over the crest start, a short run past
// the lighthouse, along the fjord, the waterfall drop over the twin falls (big feature one), the lava field, the
// spiral round the arrowhead peak (big feature two), the hairpin and a sweep along the shore.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'kirkjufell-block-falls',
  name: 'Kirkjufell Block Falls',
  family: 'block-2',
  difficulty: 'extreme',
  description: 'The arrowhead mountain of Iceland built from cubes: off the fjord lighthouse, along the fjord, over the twin falls, across the lava field and round the arrowhead peak to the shore.',
  surface: 'ice',
  biome: 'arctic',
  lighting: 'day',
  variants: ['sunset'],
  block: { world: 'iceland' },
  coaster: { style: 'blocks', colours: { support: '#3a3a3e', rail: '#f2f2ee', tie: '#2a2a2e' } },
  signature: 'Round the arrowhead',
  tvCameras: [
    { section: 'Along the fjord', at: 0.6, side: 'right', distance: 10, height: 12 },
    { section: 'Round the arrowhead', at: 0.8, side: 'left', distance: 12, height: 12 },
  ],
  start: { landmark: 'turf-houses', type: 'lighthouse', gate: 'paddle', shots: { countdown: 'side', launch: 'look-back' } },
  finish: { landmark: 'turf-houses' },
  designChanges: [
    'Blocks Series 2 (Moses, 30 Oct 2026): two big features, the waterfall drop over the twin falls and the spiral round the arrowhead peak. Built from the arrowhead spiral layout made for this track (L120).',
    'A generic Kirkjufell landscape built from cubes; no real building copied and nothing on a summit.',
  ],
  opening: opening('crest-start', {
    costumes: { block: 'voxel-cube', slalom: 'cube-pillar' },
  }),
  sections: layout('arrowhead-spiral', {
    costumes: { slalom: 'cube-pillar', peg: 'cube-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      fjord: { landmarks: [{ name: 'turf-houses', at: 0.5, side: 'left', distance: 30 }] },
      toTheFalls: { landmarks: [{ name: 'twin-falls', at: 0.5, side: 'right', distance: 16 }] },
      lava: { landmarks: [{ name: 'twin-falls', at: 0.3, side: 'left', distance: 24 }] },
      peak: { around: 'arrowhead-peak' },
      shore: { height: 4, water: true },
      lastStraight: { name: 'To the village', landmarks: [{ name: 'turf-houses', at: 0.4, side: 'right', distance: 22 }] },
    },
  }),
});
