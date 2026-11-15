'use strict';

// Neon Grid (Moses, 15 Nov 2026: seven more Blocks 1 tracks, the pack filled to 20; one of the two Extreme ones). A
// game world of a dark grid at night, edges lit in cyan and pink: off a beacon tower and down the rough path (the
// rumble start, the field let go in waves), a drop off the grid's edge, a sweep through a lit gate, a long drop down a
// wall of light, S-bends past the neon towers, past rows that clear and a combo stand, the hairpin, then the loop (the
// track's big feature: the field going right round a loop over the glowing grid), a half-pipe down the grid, a rise and
// the last straight past the score wall. Our own shapes and colours: no names, creatures or pieces from any existing
// game.
const {
  track, opening, straight, plunge, climb, sBends, sweep, hairpin, halfPipe, runIn, peg, slalom, brake, loop, curtain,
} = require('../trackKit');

module.exports = track({
  slug: 'neon-grid',
  name: 'Neon Grid',
  family: 'block',
  difficulty: 'extreme',
  description: 'A dark grid world at night, its edges lit in cyan and pink: off the grid\'s edge, through a lit gate and past the neon towers, past rows that clear, right round a loop over the glowing grid and past the score wall to the line.',
  surface: 'ice',
  biome: 'city',
  lighting: 'night',
  variants: ['sunset'],
  block: { world: 'neon' },
  coaster: { style: 'blocks', colours: { support: '#1a1630', rail: '#5ff2ff', tie: '#ff4ab8' } },
  signature: 'Round the loop',
  tvCameras: [
    // (Past the loop, looking back at the field coming down out of it.)
    { section: 'Round the loop', at: 0.85, side: 'left', distance: 10, height: 12 },
    { section: 'Past the neon towers', at: 0.5, side: 'right', distance: 10, height: 11 },
  ],
  start: { landmark: 'neon-gate', type: 'lighthouse', gate: 'stalls', shots: { countdown: 'crane', launch: 'low-chase' } },
  finish: { landmark: 'block-hall' },
  opening: opening('rumble-start', {
    costumes: { slalom: 'cube-pillar' },
    names: { plunge: 'Off the beacon' },
    // (Let go in short waves with more jitter, a new order every race.)
    waves: { groups: 5, gap: 0.16, jitter: 0.1 },
  }),
  sections: [
    { name: 'Off the grid\'s edge', shape: plunge(38, { grade: 0.26, from: 0.12 }) },
    {
      name: 'Through the lit gate', shape: sweep({ side: 'right', radius: 70, degrees: 110, grade: 0.16 }),
      landmarks: [{ name: 'neon-gate', at: 0.5, side: 'left', distance: 26 }],
    },
    { name: 'Down the light wall', shape: plunge(66, { grade: 0.34, from: 0.15 }) },
    {
      name: 'Past the neon towers', shape: sBends({ first: 'left', radius: 55, degrees: 90, grade: 0.14 }), billboards: 1,
      landmarks: [{ name: 'neon-towers', at: 0.5, side: 'right', distance: 44 }],
      obstacles: [peg({ costume: 'cube-pillar', at: 0.3, line: 'right' }), peg({ costume: 'cube-pillar', at: 0.7, line: 'left' })],
    },
    {
      name: 'Past the clearing rows', shape: straight(55, { grade: 0.14 }),
      landmarks: [{ name: 'clear-rows', at: 0.5, side: 'left', distance: 6 }],
      features: [brake({ at: 0.05, length: 12, drag: 0.02 })],
      obstacles: [curtain({ costume: 'vines', at: 0.35, side: 'right' }), slalom({ costume: 'cube-pillar', from: 0.55, to: 0.9, count: 3, loss: 0.25 })],
    },
    { name: 'Hairpin by the combo stand', shape: hairpin({ side: 'left' }) },
    {
      name: 'Round the loop', shape: straight(170, { grade: 0.13 }),
      landmarks: [{ name: 'combo-rows', at: 0.2, side: 'right', distance: 6 }],
      features: [brake({ at: 0.08, length: 14, drag: 0.03 }), loop({ at: 0.45, viewSide: 14 })],
    },
    { name: 'Down the grid', shape: halfPipe({ first: 'right', width: 8, swings: 2, radius: 150, degrees: 16, grade: 0.14 }) },
    { name: 'Up the ramp', shape: climb(12, { grade: -0.04, after: 0.3 }), billboards: 1 },
    {
      name: 'Last straight', shape: straight(65, { grade: 0.16 }), billboards: 2,
      landmarks: [{ name: 'score-wall', at: 0.3, side: 'left', distance: 16 }],
      obstacles: [slalom({ costume: 'cube-pillar', from: 0.55, to: 0.92, count: 4, loss: 0.35 })],
      features: [brake({ at: 0.05, length: 10, drag: 0.02 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
