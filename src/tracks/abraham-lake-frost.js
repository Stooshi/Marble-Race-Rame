'use strict';

// Abraham Lake Frost: Blocks Series 2 (winter), a frozen mountain lake built from cubes. Off a ski-jump tower down the pipe drop, the big drop
// down the mountainside (big feature one), through the pines, onto the bubble ice, the curtain of the half-frozen
// fall (big feature two), the hairpin and a sweep along the mountain shore.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'abraham-lake-frost',
  name: 'Abraham Lake Frost',
  family: 'block-2',
  difficulty: 'extreme',
  description: 'A frozen mountain lake built from cubes: off a ski-jump tower, the big drop down the mountainside, across the turquoise ice with its frozen bubbles and through a half-frozen fall.',
  surface: 'ice',
  biome: 'arctic',
  lighting: 'day',
  variants: ['sunset'],
  block: { world: 'rockies' },
  coaster: { style: 'blocks', colours: { support: '#5a5e66', rail: '#f4f8fb', tie: '#3f434a' } },
  signature: 'Down the mountainside',
  tvCameras: [
    { section: 'Down the mountainside', at: 0.6, side: 'left', distance: 10, height: 12 },
    { section: 'Across the bubble ice', at: 0.6, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'rocky-peaks', type: 'ski-jump', gate: 'stalls', shots: { countdown: 'side', launch: 'side' } },
  finish: { landmark: 'frozen-falls' },
  designChanges: [
    'Blocks Series 2 (Moses, 30 Oct 2026): two big features, the big drop down the mountainside and the curtain waterfall through a half-frozen fall. Built from the bubble lake layout made for this track (L124).',
    'A generic Abraham Lake landscape built from cubes; no real building copied and nothing on a summit.',
  ],
  opening: opening('pipe-drop', {
    side: 'right',
    costumes: { block: 'voxel-cube', slalom: 'cube-pillar' },
  }),
  sections: layout('bubble-lake', {
    costumes: { slalom: 'cube-pillar', peg: 'cube-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      shoulder: { landmarks: [{ name: 'rocky-peaks', at: 0.5, side: 'left', distance: 260 }] },
      lakeBends: { landmarks: [{ name: 'rocky-peaks', at: 0.5, side: 'right', distance: 280 }] },
      bubbles: { landmarks: [{ name: 'bubble-ice', at: 0.5, side: 'left', distance: 24 }] },
      toTheFall: { landmarks: [{ name: 'frozen-falls', at: 0.5, side: 'right', distance: 22 }] },
      shoreSweep: { landmarks: [{ name: 'bubble-ice', at: 0.5, side: 'right', distance: 30 }] },
      lastStraight: { name: 'Along the shore', landmarks: [{ name: 'rocky-peaks', at: 0.4, side: 'left', distance: 260 }] },
    },
  }),
});
