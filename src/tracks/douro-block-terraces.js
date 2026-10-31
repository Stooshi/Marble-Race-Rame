'use strict';

// Douro Block Terraces: Blocks Series 2 (rivers), the Douro valley's vineyard terraces built from cubes in the
// evening sun. Down a curving lift and the staggered drop, S-bends past the wine lodges, the long quay with a
// table top (big feature one), the hairpin by a wine farmhouse, S-bends along the river past the boats, up into
// the vineyards and the two-step drop down the terraces (big feature two) and a sweep under the iron bridge.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'douro-block-terraces',
  name: 'Douro Block Terraces',
  family: 'block-2',
  difficulty: 'extreme',
  description: 'The Douro valley built from cubes at sunset: past the wine lodges, across the long river quay, down the stepped vineyard terraces in two drops and under the iron bridge.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'sunset',
  variants: ['day'],
  block: { world: 'vineyard' },
  coaster: { style: 'blocks', colours: { support: '#6a5a4a', rail: '#efe8da', tie: '#4f4338' } },
  signature: 'Down the first terrace',
  tvCameras: [
    { section: 'Along the quay', at: 0.6, side: 'right', distance: 10, height: 12 },
    { section: 'Down to the river', at: 0.5, side: 'left', distance: 10, height: 12 },
  ],
  start: { landmark: 'vine-terraces', type: 'curving-lift', gate: 'paddle', shots: { countdown: 'side', launch: 'high-behind' } },
  finish: { landmark: 'iron-arch-bridge' },
  designChanges: [
    'Blocks Series 2 (Moses, 30 Oct 2026): two big features, the table top along the river quay and the two-step drop down the vineyard terraces. Built from the staggered drop and quay terraces, the library layout made for this track (L114).',
    'Generic Douro landscape built from cubes: terraced vineyards, wine lodges, river boats and an iron arch bridge; no real building or brand copied.',
  ],
  opening: opening('staggered-drop', {
    costumes: { block: 'voxel-cube', slalom: 'cube-pillar' },
    names: { plunge: 'Down from the vineyards' },
  }),
  sections: layout('quay-terraces', {
    costumes: { slalom: 'cube-pillar', peg: 'cube-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      lodges: { landmarks: [{ name: 'wine-lodges', at: 0.3, side: 'left', distance: 24 }, { name: 'wine-lodges', at: 0.75, side: 'right', distance: 24 }] },
      quay: { height: 4, water: true, landmarks: [{ name: 'rabelo-boats', at: 0.5, side: 'right', distance: 14 }] },
      riverBends: { landmarks: [{ name: 'rabelo-boats', at: 0.5, side: 'left', distance: 22 }] },
      vines: { landmarks: [{ name: 'vine-terraces', at: 0.5, side: 'right', distance: 24 }] },
      ledge: { landmarks: [{ name: 'vine-terraces', at: 0.5, side: 'left', distance: 24 }] },
      brakingStraight: { landmarks: [{ name: 'quinta-house', at: 0.6, side: 'right', distance: 16 }] },
      bridgeSweep: { landmarks: [{ name: 'iron-arch-bridge', at: 0.5, side: 'left', distance: 60 }] },
      lastStraight: { name: 'To the bridge', landmarks: [{ name: 'wine-lodges', at: 0.4, side: 'right', distance: 26 }] },
    },
  }),
});
