'use strict';

// Venice Cube Canals: Blocks Series 2 (cities), Venice built from cubes at sunset. In waves down a square bell
// tower, between the palazzi, splitting where two canals fork round a block island (big feature one), under the
// arched bridges, down the Grand Canal in a wide half-pipe that rocks the field wall to wall (big feature two),
// the hairpin by the lagoon and a sweep to the piazza.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'venice-cube-canals',
  name: 'Venice Cube Canals',
  family: 'block-2',
  difficulty: 'extreme',
  description: 'Venice built from cubes at sunset: between the palazzi, splitting where two canals fork, under arched bridges and down the Grand Canal in a half-pipe, past gondolas to the piazza.',
  surface: 'ice',
  biome: 'city',
  lighting: 'sunset',
  variants: ['day'],
  block: { world: 'canal' },
  coaster: { style: 'blocks', colours: { support: '#b98a6a', rail: '#f6efe4', tie: '#7a5a44' } },
  signature: 'Grand Canal half-pipe',
  tvCameras: [
    { section: 'The canal fork', at: 0.3, side: 'right', distance: 10, height: 12 },
    { section: 'Grand Canal half-pipe', at: 0.9, side: 'left', distance: 10, height: 15 },
  ],
  start: { landmark: 'domed-basilica', type: 'spiral-tower', gate: 'barrier', shots: { countdown: 'above', launch: 'high-behind' } },
  finish: { landmark: 'cube-campanile' },
  designChanges: [
    'Blocks Series 2 (Moses, 30 Oct 2026): two big features, the splitter where two canals fork and the Grand Canal half-pipe. Built from the staggered drop and grand canal, the library layout made for this track (L106).',
    'Generic Venetian architecture built from cubes; no real building copied.',
  ],
  opening: opening('staggered-drop', {
    costumes: { block: 'voxel-cube', slalom: 'cube-pillar' },
    names: { plunge: 'Down the bell tower' },
  }),
  sections: layout('grand-canal', {
    costumes: { slalom: 'cube-pillar', peg: 'cube-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      palazzi: { landmarks: [{ name: 'palazzo-row', at: 0.3, side: 'left', distance: 16 }, { name: 'palazzo-row', at: 0.75, side: 'right', distance: 16 }] },
      toTheFork: { height: 4, water: true, landmarks: [{ name: 'cube-gondolas', at: 0.5, side: 'left', distance: 12 }] },
      fork: { around: 'cube-campanile' },
      bridges: { height: 4, water: true, landmarks: [{ name: 'arched-cube-bridge', at: 0.3, side: 'left', distance: 14 }, { name: 'arched-cube-bridge', at: 0.7, side: 'right', distance: 14 }] },
      grandCanal: { landmarks: [{ name: 'palazzo-row', at: 0.3, side: 'left', distance: 24 }, { name: 'palazzo-row', at: 0.7, side: 'right', distance: 24 }] },
      lagoon: { landmarks: [{ name: 'domed-basilica', at: 0.5, side: 'left', distance: 40 }] },
      lastStraight: { name: 'To the piazza', landmarks: [{ name: 'palazzo-row', at: 0.4, side: 'right', distance: 18 }] },
    },
  }),
});
