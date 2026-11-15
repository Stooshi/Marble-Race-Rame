'use strict';

// Moon Base (Moses, 15 Nov 2026: seven more Blocks 1 tracks, the pack filled to 20; one of the two Extreme ones). A game
// world of grey dust and craters under a black sky: off a launch ramp and through the moon dust (the sand-trap start,
// the field let go in waves), a sweep past the base's white domes, S-bends among the rocks, a straight past the launch tower
// and its rocket and the hairpin, then into the great crater (the track's big feature: a long drop over the crater's
// rim to its floor), across the crater floor, a half-pipe down a channel, a rise up the far rim, past a score wall and
// the last straight. Our own shapes and colours: no names, creatures or pieces from any existing game.
const {
  track, opening, straight, plunge, climb, sBends, sweep, hairpin, halfPipe, runIn, peg, slalom, brake,
} = require('../trackKit');

module.exports = track({
  slug: 'moon-base',
  name: 'Moon Base',
  family: 'block',
  difficulty: 'extreme',
  description: 'A world of grey dust and craters under a black sky: through the moon dust past the base\'s white domes and the rocket on its launch tower, over the rim and down into the great crater, up the far side and past a score wall to the line.',
  surface: 'ice',
  biome: 'arctic',
  lighting: 'night',
  variants: ['sunset'],
  block: { world: 'moon' },
  coaster: { style: 'blocks', colours: { support: '#6a6a70', rail: '#f2f4f6', tie: '#3a3a3f' } },
  signature: 'Into the crater',
  tvCameras: [
    // (On the crater floor, looking back up the drop at the field pouring over the rim.)
    { section: 'Across the crater floor', at: 0.3, side: 'left', distance: 10, height: 12 },
    { section: 'Among the rocks', at: 0.5, side: 'right', distance: 10, height: 11 },
  ],
  start: { landmark: 'moon-domes', type: 'ski-jump', gate: 'paddle', shots: { countdown: 'crane', launch: 'high-behind' } },
  finish: { landmark: 'block-hall' },
  opening: opening('sand-trap', {
    costumes: { block: 'voxel-cube', slalom: 'cube-pillar' },
    names: { plunge: 'Through the moon dust' },
    // (Let go in short waves with more jitter, a new order every race.)
    waves: { groups: 5, gap: 0.12, jitter: 0.1 },
  }),
  sections: [
    {
      name: 'Past the domes', shape: sweep({ side: 'left', radius: 75, degrees: 100, grade: 0.16 }), billboards: 1,
      landmarks: [{ name: 'moon-domes', at: 0.5, side: 'right', distance: 40 }],
      obstacles: [peg({ costume: 'cube-pillar', at: 0.35, line: 'left' }), peg({ costume: 'cube-pillar', at: 0.7, line: 'right' })],
    },
    {
      name: 'Among the rocks', shape: sBends({ first: 'right', radius: 65, degrees: 80, grade: 0.16 }),
      obstacles: [slalom({ costume: 'cube-pillar', from: 0.3, to: 0.7, count: 4, loss: 0.25 })],
    },
    {
      name: 'Past the launch tower', shape: straight(70, { grade: 0.15 }),
      landmarks: [{ name: 'launch-tower', at: 0.5, side: 'right', distance: 24 }],
      features: [brake({ at: 0.05, length: 12, drag: 0.02 })],
      obstacles: [slalom({ costume: 'cube-pillar', from: 0.45, to: 0.9, count: 4, loss: 0.25 })],
    },
    { name: 'Hairpin by the crater', shape: hairpin({ side: 'left' }) },
    { name: 'To the rim', shape: straight(30, { grade: 0.12 }) },
    { name: 'Into the crater', shape: plunge(66, { grade: 0.34, from: 0.15 }) },
    {
      name: 'Across the crater floor', shape: straight(55, { grade: 0.14 }),
      obstacles: [peg({ costume: 'cube-pillar', at: 0.3, line: 'right' }), peg({ costume: 'cube-pillar', at: 0.55, line: 'left' }), peg({ costume: 'cube-pillar', at: 0.8, line: 'center' })],
    },
    { name: 'Down the channel', shape: halfPipe({ first: 'right', width: 8, swings: 2, radius: 150, degrees: 16, grade: 0.13 }) },
    { name: 'Up the far rim', shape: climb(12, { grade: -0.04, after: 0.3 }), billboards: 1 },
    {
      name: 'Past the score wall', shape: straight(55, { grade: 0.14 }),
      landmarks: [{ name: 'score-wall', at: 0.5, side: 'left', distance: 16 }],
      features: [brake({ at: 0.05, length: 10, drag: 0.02 })],
    },
    {
      name: 'Last straight', shape: straight(65, { grade: 0.16 }), billboards: 2,
      obstacles: [slalom({ costume: 'cube-pillar', from: 0.6, to: 0.92, count: 3, loss: 0.3 })],
      features: [brake({ at: 0.05, length: 10, drag: 0.02 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
