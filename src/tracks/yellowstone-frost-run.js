'use strict';

// Yellowstone Frost Run: Blocks Series 2 (winter), a geyser basin in winter built from cubes at dawn. Off a fire lookout down the split start,
// across the geyser basin, the spiral round a geyser cone (big feature one), the hairpin, the frosted forest, the
// two-step drop down the hot-spring terraces (big feature two) and a sweep left across the valley.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'yellowstone-frost-run',
  name: 'Yellowstone Frost Run',
  family: 'block-2',
  difficulty: 'extreme',
  description: 'A geyser basin in winter built from cubes at dawn: across the steaming basin, round a geyser cone, through the frosted forest and in two drops down the hot-spring terraces.',
  surface: 'ice',
  biome: 'arctic',
  lighting: 'dawn',
  variants: ['day'],
  block: { world: 'geyser' },
  coaster: { style: 'blocks', colours: { support: '#c8a070', rail: '#f4f6f8', tie: '#8a5a2a' } },
  signature: 'Round the geyser cone',
  tvCameras: [
    { section: 'Round the geyser cone', at: 0.7, side: 'right', distance: 12, height: 12 },
    { section: 'Across the valley', at: 0.5, side: 'left', distance: 10, height: 12 },
  ],
  start: { landmark: 'steam-vents', type: 'spiral-tower', gate: 'paddle', shots: { countdown: 'above', launch: 'look-back' } },
  finish: { landmark: 'hot-spring-terraces' },
  designChanges: [
    'Blocks Series 2 (Moses, 30 Oct 2026): two big features, the spiral round a geyser cone and the two-step drop down the hot-spring terraces. Built from the geyser terraces layout made for this track (L123).',
    'A generic Yellowstone landscape built from cubes; no real building copied and nothing on a summit.',
  ],
  opening: opening('split-start', {
    costumes: { block: 'voxel-cube', slalom: 'cube-pillar' },
  }),
  sections: layout('geyser-terraces', {
    costumes: { slalom: 'cube-pillar', peg: 'cube-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      basin: { landmarks: [{ name: 'steam-vents', at: 0.5, side: 'left', distance: 34 }] },
      vents: { landmarks: [{ name: 'steam-vents', at: 0.5, side: 'right', distance: 36 }] },
      cone: { around: 'geyser-cone' },
      terraceTop: { landmarks: [{ name: 'hot-spring-terraces', at: 0.5, side: 'right', distance: 20 }] },
      ledge: { landmarks: [{ name: 'hot-spring-terraces', at: 0.5, side: 'left', distance: 20 }] },
      valleySweep: { landmarks: [{ name: 'steam-vents', at: 0.5, side: 'left', distance: 40 }] },
      lastStraight: { name: 'To the terraces', landmarks: [{ name: 'hot-spring-terraces', at: 0.4, side: 'right', distance: 22 }] },
    },
  }),
});
