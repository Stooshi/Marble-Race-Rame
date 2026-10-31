'use strict';

// Kyoto Block Gardens: Blocks Series 2 (cities), Kyoto built from cubes at dawn. Over a crest off the temple
// platform, three pairs of banked switchbacks down the hillside temple terraces (big feature one), a path through
// the red gates, the moss-garden straight, the spiral round a five-storey pagoda (big feature two), the hairpin by
// the pond and a sweep to the gate.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'kyoto-block-gardens',
  name: 'Kyoto Block Gardens',
  family: 'block-2',
  difficulty: 'extreme',
  description: 'Kyoto built from cubes at dawn: down the temple terraces in banked switchbacks, through a path of red gates and a moss garden, round a five-storey pagoda to the pond.',
  surface: 'ice',
  biome: 'city',
  lighting: 'dawn',
  variants: ['day'],
  block: { world: 'moss' },
  coaster: { style: 'blocks', colours: { support: '#6a6560', rail: '#f2ede2', tie: '#6b3f2a' } },
  signature: 'Round the pagoda',
  tvCameras: [
    { section: 'Second switchbacks', at: 0.5, side: 'left', distance: 10, height: 12 },
    { section: 'Round the pagoda', at: 0.7, side: 'left', distance: 9, height: 12 },
  ],
  start: { landmark: 'temple-hall', type: 'stepped-platform', gate: 'barrier', shots: { countdown: 'front', launch: 'high-behind' } },
  finish: { landmark: 'red-gates' },
  designChanges: [
    'Blocks Series 2 (Moses, 30 Oct 2026): two big features, banked switchbacks down the temple terraces and the spiral round a five-storey pagoda. Built from the crest start (the clean drop is used twice in the series already) and temple terraces, the library layout made for this track (L110).',
    'Generic Japanese temple architecture built from cubes; no real temple copied.',
  ],
  opening: opening('crest-start', {
    costumes: { block: 'voxel-cube', slalom: 'cube-pillar' },
    names: { plunge: 'Off the temple platform' },
  }),
  sections: layout('temple-terraces', {
    costumes: { slalom: 'cube-pillar', peg: 'cube-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      templeSteps: { landmarks: [{ name: 'temple-hall', at: 0.4, side: 'left', distance: 24 }] },
      switch2: { landmarks: [{ name: 'moss-garden', at: 0.5, side: 'right', distance: 22 }] },
      gatePath: { landmarks: [{ name: 'red-gates', at: 0.5, side: 'left', distance: 12 }] },
      mossGarden: { landmarks: [{ name: 'moss-garden', at: 0.5, side: 'left', distance: 18 }] },
      pagoda: { around: 'cube-pagoda' },
      pondSweep: { landmarks: [{ name: 'temple-hall', at: 0.5, side: 'left', distance: 40 }] },
      lastStraight: { name: 'To the gate', landmarks: [{ name: 'red-gates', at: 0.4, side: 'right', distance: 14 }] },
    },
  }),
});
