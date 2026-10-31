'use strict';

// Lisbon Cube Hills: Blocks Series 2 (cities), Lisbon's steep hills built from cubes by day. Off a miradouro roof
// down the classic plunge, the big drop down the tram hill (big feature one), past tiled houses, across a square,
// two pairs of banked switchbacks down the old quarter to the river (big feature two), along the quay, the hairpin
// and a sweep along the river to a great arch.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'lisbon-cube-hills',
  name: 'Lisbon Cube Hills',
  family: 'block-2',
  difficulty: 'extreme',
  description: 'Lisbon built from cubes: down the steep tram hill, past tiled houses and across a square, in banked switchbacks through the old quarter to the river and a great arch.',
  surface: 'ice',
  biome: 'city',
  lighting: 'day',
  variants: ['sunset'],
  block: { world: 'azulejo' },
  coaster: { style: 'blocks', colours: { support: '#c4703f', rail: '#f2ede2', tie: '#5b84b0' } },
  signature: 'Down the tram hill',
  tvCameras: [
    { section: 'Old quarter switchbacks', at: 0.6, side: 'left', distance: 10, height: 12 },
    { section: 'Along the river', at: 0.5, side: 'left', distance: 10, height: 12 },
  ],
  start: { landmark: 'tiled-houses', type: 'rooftop', gate: 'trapdoor', shots: { countdown: 'front', launch: 'look-back' } },
  finish: { landmark: 'cube-arch' },
  designChanges: [
    'Blocks Series 2 (Moses, 30 Oct 2026): two big features, the big drop down the tram hill and banked switchbacks down the old quarter. Built from the classic opening and tram hills, the library layout made for this track (L113).',
    'Generic Lisbon architecture built from cubes; no real building copied.',
  ],
  opening: opening('classic', {
    costumes: { block: 'voxel-cube', slalom: 'cube-pillar' },
    names: { plunge: 'Off the miradouro' },
  }),
  sections: layout('tram-hills', {
    costumes: { slalom: 'cube-pillar', peg: 'cube-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      hillTop: { landmarks: [{ name: 'yellow-tram', at: 0.5, side: 'left', distance: 12 }] },
      houses: { landmarks: [{ name: 'tiled-houses', at: 0.3, side: 'left', distance: 18 }, { name: 'tiled-houses', at: 0.7, side: 'right', distance: 18 }] },
      square: { landmarks: [{ name: 'cube-arch', at: 0.5, side: 'left', distance: 34 }] },
      switch2: { landmarks: [{ name: 'tiled-houses', at: 0.5, side: 'right', distance: 22 }] },
      brakingStraight: { height: 4, water: true, landmarks: [{ name: 'river-ferry', at: 0.5, side: 'right', distance: 16 }] },
      river: { landmarks: [{ name: 'river-ferry', at: 0.5, side: 'right', distance: 30 }] },
      lastStraight: { name: 'To the arch', landmarks: [{ name: 'yellow-tram', at: 0.4, side: 'left', distance: 14 }] },
    },
  }),
});
