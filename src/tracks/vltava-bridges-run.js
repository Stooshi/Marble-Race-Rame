'use strict';

// Vltava Bridges Run: Blocks Series 2 (rivers), a castle hill over the Vltava built from cubes at dawn. Out of the
// castle hill's tunnel, banked switchbacks down the hill (big feature one), across the old square, along the river
// under the bridges, through the curtain of water at the weir (big feature two), the hairpin on the island and a
// sweep to the bridge tower.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'vltava-bridges-run',
  name: 'Vltava Bridges Run',
  family: 'block-2',
  difficulty: 'extreme',
  description: 'A castle city on the Vltava built from cubes at dawn: down the castle hill in banked switchbacks, across the old square, under the statue bridge and through the curtain of water at the weir.',
  surface: 'ice',
  biome: 'city',
  lighting: 'dawn',
  variants: ['day'],
  block: { world: 'bohemia' },
  coaster: { style: 'blocks', colours: { support: '#a8936e', rail: '#f2ede2', tie: '#5a4e40' } },
  signature: 'Through the weir',
  tvCameras: [
    { section: 'Lower switchbacks', at: 0.5, side: 'left', distance: 10, height: 12 },
    { section: 'Onto the island', at: 0.3, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'castle-hill', type: 'castle-tower', gate: 'stalls', shots: { countdown: 'above', launch: 'side' } },
  finish: { landmark: 'bridge-tower' },
  designChanges: [
    'Blocks Series 2 (Moses, 30 Oct 2026): two big features, banked switchbacks down the castle hill and the curtain waterfall at the river weir. Built from the tunnel launch and castle weir, the library layout made for this track (L116).',
    'A generic castle city built from cubes (a castle on its hill, a statue bridge, an old square with two spires, a gothic bridge tower); no real building copied.',
  ],
  opening: opening('tunnel-launch', {
    costumes: { block: 'voxel-cube', slalom: 'cube-pillar' },
  }),
  sections: layout('castle-weir', {
    costumes: { slalom: 'cube-pillar', peg: 'cube-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      switch1: { landmarks: [{ name: 'castle-hill', at: 0.3, side: 'left', distance: 50 }] },
      square: { landmarks: [{ name: 'twin-spires', at: 0.5, side: 'right', distance: 30 }] },
      riverSweep: { height: 4, water: true, landmarks: [{ name: 'statue-bridge', at: 0.5, side: 'right', distance: 50 }] },
      toTheWeir: { height: 4, water: true },
      island: { landmarks: [{ name: 'river-weir', at: 0.5, side: 'left', distance: 50 }] },
      towerSweep: { landmarks: [{ name: 'statue-bridge', at: 0.6, side: 'left', distance: 64 }] },
      lastStraight: { name: 'Under the gate tower', landmarks: [{ name: 'twin-spires', at: 0.4, side: 'right', distance: 34 }] },
    },
  }),
});
