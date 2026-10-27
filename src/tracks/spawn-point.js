'use strict';

// Spawn Point: Block Series track 1. A calm meadow of cubes at dawn: from the spawn beacon over a
// crest, round a long sweep past a cube windmill, through S-bends beside a cube farm, out over the
// brook on block pillars and down round the spiral to the cube cottage.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'spawn-point',
  name: 'Spawn Point',
  family: 'block',
  difficulty: 'extreme',
  description: 'A calm meadow built of cubes at dawn: from the spawn beacon over a crest, round a long sweep past a windmill and a cube farm, out over the brook on block pillars and down the spiral to the cottage.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'dawn',
  block: { world: 'meadow' },
  coaster: { style: 'blocks', colours: { support: '#9a9fa6', rail: '#f2ede2', tie: '#5b616b' } },
  signature: 'Over the brook',
  tvCameras: [
    { section: 'Over the brook', at: 0.8, side: 'right', distance: 10, height: 12 },
    { section: 'Dawn sweep', at: 0.8, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'spawn-beacon', type: 'straight-lift', gate: 'paddle', shots: { countdown: 'front', launch: 'high-behind' } },
  finish: { landmark: 'cube-cottage' },
  designChanges: [
    'Built from the crest start and the spawn meadow, the library layout made for this track: a long sweep with a boost, S-bends, a peg straight, the hairpin, a second sweep, a drop and a spiral.',
    'Everything on the land of cubes, except the second sweep, which flies over the brook on block pillars.',
  ],
  opening: opening('crest-start', {
    costumes: { block: 'voxel-cube', slalom: 'cube-pillar' },
    names: { plunge: 'Spawn drop', climb: 'First crest', drop: 'Over the top' },
  }),
  sections: layout('spawn-meadow', {
    costumes: { slalom: 'cube-pillar', peg: 'cube-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      meadowSweep: { name: 'Dawn sweep', landmarks: [{ name: 'cube-windmill', at: 0.55, side: 'right', distance: 16 }] },
      sBends: { name: 'Farm bends', landmarks: [{ name: 'cube-farm', at: 0.5, side: 'left', distance: 14 }] },
      pegRun: { name: 'Meadow straight' },
      brakingStraight: { name: 'Run to the hairpin' },
      hairpin: { name: 'Crane hairpin' },
      sweep2: { name: 'Over the brook', height: 12 },
      drop: { name: 'Down to the meadow' },
      spin: { name: 'Meadow spiral' },
      lastStraight: { name: 'Run to the cottage' },
    },
  }),
});
