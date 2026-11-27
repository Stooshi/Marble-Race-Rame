'use strict';

// Torres del Paine Block Run: Blocks Series 2 (mountains), the granite towers of Patagonia built from cubes at sunset. Off a curving lift into
// the banked turn, along the turquoise lake, the splitter round a granite island (big feature one), the windy
// plain, the waterfall drop at the big falls (big feature two), the hairpin below the towers and a sweep to the lodge.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'torres-del-paine-block-run',
  name: 'Torres del Paine Block Run',
  family: 'block-2',
  difficulty: 'extreme',
  description: 'The granite towers of Patagonia built from cubes at sunset: along the turquoise lake, round a granite island in two channels, across the windy plain and over the big falls to a lodge below the towers.',
  surface: 'ice',
  biome: 'alpine',
  lighting: 'sunset',
  variants: ['day'],
  block: { world: 'patagonia' },
  coaster: { style: 'blocks', colours: { support: '#8a8a8e', rail: '#f2ede2', tie: '#5a5a60' } },
  signature: 'Round the island',
  tvCameras: [
    { section: 'Round the island', at: 0.5, side: 'right', distance: 10, height: 12 },
    { section: 'Plain S-bends', at: 0.5, side: 'left', distance: 10, height: 12 },
  ],
  start: { landmark: 'granite-towers', type: 'curving-lift', gate: 'paddle', shots: { countdown: 'front', launch: 'low-chase' } },
  finish: { landmark: 'cube-lodge' },
  designChanges: [
    'Blocks Series 2 (Moses, 30 Oct 2026): two big features, the splitter round a granite island in the lake and the waterfall drop at the big falls. Built from the lake towers layout made for this track (L117).',
    'A generic Torres del Paine landscape built from cubes; no real building copied and nothing on a summit.',
  ],
  opening: opening('banked-turn', {
    side: 'left',
    costumes: { block: 'voxel-cube', slalom: 'cube-pillar' },
  }),
  sections: layout('lake-towers', {
    costumes: { slalom: 'cube-pillar', peg: 'cube-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      lakeShore: { height: 4, water: true, landmarks: [{ name: 'granite-towers', at: 0.5, side: 'left', distance: 140 }] },
      toTheIsland: { height: 4, water: true },
      split: { around: 'granite-island' },
      plain: { landmarks: [{ name: 'granite-towers', at: 0.5, side: 'right', distance: 150 }] },
      hairpin: { landmarks: [{ name: 'cube-lodge', at: 0.5, side: 'high', distance: 18 }] },
      lodgeSweep: { landmarks: [{ name: 'granite-towers', at: 0.5, side: 'left', distance: 160 }] },
      lastStraight: { name: 'Run-in by the lodge', landmarks: [{ name: 'cube-lodge', at: 0.5, side: 'right', distance: 20 }] },
    },
  }),
});
