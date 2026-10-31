'use strict';

// Marrakesh Cube Souk: Blocks Series 2 (cities), Marrakesh built from cubes by day. Off a riad roof the field
// squeezes out of the souk bowl (the funnel, big feature one), through the covered souk alleys and past the stalls,
// round the big square under the minaret, along the kasbah walls and the two-step drop off them (big feature two),
// the hairpin, the palm-garden slalom and S-bends to the gate.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'marrakesh-cube-souk',
  name: 'Marrakesh Cube Souk',
  family: 'block-2',
  difficulty: 'extreme',
  description: 'Marrakesh built from cubes: out of the souk bowl, through covered alleys of stalls, round the big square under the minaret and in two drops off the kasbah walls to the palm garden.',
  surface: 'ice',
  biome: 'city',
  lighting: 'day',
  variants: ['sunset'],
  block: { world: 'souk' },
  coaster: { style: 'blocks', colours: { support: '#b5643f', rail: '#f2e6c8', tie: '#8f4f33' } },
  signature: 'Off the kasbah walls',
  tvCameras: [
    { section: 'Round the big square', at: 0.5, side: 'right', distance: 10, height: 12 },
    { section: 'Palm garden slalom', at: 0.3, side: 'left', distance: 10, height: 12 },
  ],
  start: { landmark: 'cube-minaret', type: 'rooftop', gate: 'paddle', shots: { countdown: 'side', launch: 'low-chase' } },
  finish: { landmark: 'kasbah-walls' },
  designChanges: [
    'Blocks Series 2 (Moses, 30 Oct 2026): two big features, the funnel out of the souk bowl and the two-step drop off the kasbah walls. Built from the funnel drop and souk walls, the library layout made for this track (L111).',
    'Generic Moroccan architecture built from cubes; no real building copied.',
  ],
  opening: opening('funnel-drop', {
    costumes: { block: 'voxel-cube', slalom: 'cube-pillar' },
    names: { plunge: 'The souk bowl' },
  }),
  sections: layout('souk-walls', {
    costumes: { slalom: 'cube-pillar', peg: 'cube-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      alleys: { landmarks: [{ name: 'souk-arcade', at: 0.5, side: 'left', distance: 20 }] },
      stalls: { landmarks: [{ name: 'souk-arcade', at: 0.5, side: 'right', distance: 20 }] },
      square: { landmarks: [{ name: 'cube-minaret', at: 0.5, side: 'left', distance: 30 }] },
      walls: { landmarks: [{ name: 'kasbah-walls', at: 0.5, side: 'right', distance: 24 }] },
      palms: { landmarks: [{ name: 'palm-grove', at: 0.5, side: 'left', distance: 18 }] },
      gateBends: { landmarks: [{ name: 'kasbah-walls', at: 0.5, side: 'left', distance: 36 }] },
      lastStraight: { name: 'To the kasbah gate', landmarks: [{ name: 'palm-grove', at: 0.4, side: 'right', distance: 18 }] },
    },
  }),
});
