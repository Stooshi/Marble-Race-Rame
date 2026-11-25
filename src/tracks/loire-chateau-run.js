'use strict';

// Loire Château Run: Blocks Series 2 (rivers), a Loire château and its gardens built from cubes by day. Off a
// château tower down the peg drop, through the garden maze of clipped hedges, the half-pipe down the moat (big
// feature one), along the river, the table top across the long stone bridge (big feature two), the hairpin by
// the vineyard and S-bends past the château.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'loire-chateau-run',
  name: 'Loire Château Run',
  family: 'block-2',
  difficulty: 'extreme',
  description: 'A Loire château built from cubes: through the hedge maze, down the half-pipe of the moat, along the river and across the long stone bridge to the vineyards.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'day',
  variants: ['sunset'],
  block: { world: 'chateau' },
  coaster: { style: 'blocks', colours: { support: '#d8d0bc', rail: '#f6f2e8', tie: '#4a5560' } },
  signature: 'The moat half-pipe',
  tvCameras: [
    { section: 'The moat half-pipe', at: 0.5, side: 'left', distance: 10, height: 15 },
    { section: 'Across the stone bridge', at: 0.6, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'river-chateau', type: 'castle-tower', gate: 'barrier', shots: { countdown: 'chase', launch: 'side' } },
  finish: { landmark: 'river-chateau' },
  designChanges: [
    'Blocks Series 2 (Moses, 30 Oct 2026): two big features, the half-pipe through the château moat and the table top along the stone bridge. Built from the peg drop and château moat, the library layout made for this track (L115).',
    'A generic Loire château built from cubes (pale stone, round towers under slate cones); no real château copied.',
  ],
  opening: opening('peg-drop', {
    costumes: { block: 'voxel-cube', slalom: 'cube-pillar' },
    names: { plunge: 'Down from the tower' },
  }),
  sections: layout('chateau-moat', {
    costumes: { slalom: 'cube-pillar', peg: 'cube-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      maze: { landmarks: [{ name: 'hedge-maze', at: 0.5, side: 'left', distance: 22 }] },
      parterre: { landmarks: [{ name: 'river-chateau', at: 0.5, side: 'right', distance: 40 }] },
      moat: { landmarks: [{ name: 'moat-towers', at: 0.3, side: 'left', distance: 22 }, { name: 'moat-towers', at: 0.75, side: 'right', distance: 22 }] },
      riverSweep: { landmarks: [{ name: 'stone-arch-bridge', at: 0.6, side: 'left', distance: 70 }] },
      bridge: { height: 10, water: true },
      brakingStraight: { landmarks: [{ name: 'vine-terraces', at: 0.5, side: 'right', distance: 24 }] },
      chateauBends: { landmarks: [{ name: 'river-chateau', at: 0.5, side: 'left', distance: 46 }] },
      lastStraight: { name: 'To the château', landmarks: [{ name: 'hedge-maze', at: 0.4, side: 'right', distance: 24 }] },
    },
  }),
});
