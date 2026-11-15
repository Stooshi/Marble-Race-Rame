'use strict';

// Kings Canyon Lost City (Moses, 15 Nov 2026: six more Canyons tracks, the pack filled to 20; one of the two Extreme
// ones). Kings Canyon in Central Australia: down off the rim and through the red sand (the sand-trap start, the field
// let go in waves), up the steep climb to the plateau, a sweep along the rim, then through the Lost City (the track's
// big feature: a loop among the beehive domes of banded sandstone, the field going right round it), a sweep past the
// Garden of Eden, a palm-ringed pool in a cleft of red rock, S-bends down a narrow crack, a long drop from the
// plateau, the hairpin, S-bends under the red walls and the line. Generic rock and plants only; no names on anything.
const {
  track, opening, straight, plunge, climb, sBends, sweep, hairpin, runIn, peg, slalom, curtain, brake, loop,
} = require('../trackKit');

module.exports = track({
  slug: 'kings-canyon-lost-city',
  name: 'Kings Canyon Lost City',
  family: 'canyon',
  difficulty: 'extreme',
  description: 'Kings Canyon in Central Australia: down through the red sand, up to the plateau, right round a loop among the beehive domes of the Lost City, past the palm-ringed Garden of Eden, down a narrow crack and under the red walls to the line.',
  surface: 'ice',
  biome: 'desert',
  lighting: 'sunset',
  variants: ['day'],
  canyon: { palette: 'kings', depth: 34, river: 'none' },
  coaster: { colours: { support: '#7a3424', rail: '#f6e8dc', tie: '#4a2218' } },
  signature: 'Through the Lost City',
  tvCameras: [
    // (Past the loop, looking back at the field coming down out of it among the domes.)
    { section: 'Through the Lost City', at: 0.85, side: 'left', distance: 10, height: 12 },
    { section: 'Under the red walls', at: 0.5, side: 'right', distance: 10, height: 11 },
  ],
  start: { landmark: 'beehive-domes', scenery: ['rocks'], type: 'rock-arch', gate: 'barrier', shots: { countdown: 'low-front', launch: 'overhead' } },
  finish: { landmark: 'rim-lookout' },
  opening: opening('sand-trap', {
    costumes: { block: 'mossy-boulder', slalom: 'cairn' },
    names: { plunge: 'Through the red sand' },
    // (Let go in waves, a new order every race: without them the front starting places won more.)
    waves: { groups: 5, gap: 0.12, jitter: 0.04 },
    dress: { plunge: { height: 0 } },
  }),
  sections: [
    { name: 'Up to the plateau', shape: climb(14, { grade: -0.06, after: 0.3 }), height: 0 },
    {
      name: 'Along the rim', shape: sweep({ side: 'left', radius: 75, degrees: 110, grade: 0.16 }), height: 0, billboards: 2,
      obstacles: [peg({ costume: 'cairn', at: 0.35, line: 'right' }), peg({ costume: 'cairn', at: 0.7, line: 'left' })],
    },
    {
      name: 'Through the Lost City', shape: straight(170, { grade: 0.13 }), height: 0,
      landmarks: [{ name: 'beehive-domes', at: 0.45, side: 'right', distance: 34 }],
      features: [brake({ at: 0.08, length: 12, drag: 0.02 }), loop({ at: 0.45, viewSide: 14 })],
    },
    {
      name: 'Past the Garden of Eden', shape: sweep({ side: 'right', radius: 70, degrees: 120, grade: 0.17 }), height: 0,
      landmarks: [{ name: 'eden-pool', at: 0.5, side: 'left', distance: 24 }],
      obstacles: [slalom({ costume: 'cairn', from: 0.3, to: 0.7, count: 4, loss: 0.25 })],
    },
    {
      name: 'Down the crack', shape: sBends({ first: 'right', radius: 60, degrees: 90, grade: 0.16 }), height: 0, walls: 1,
      obstacles: [peg({ costume: 'cairn', at: 0.3, line: 'center' }), peg({ costume: 'cairn', at: 0.7, line: 'center' })],
    },
    { name: 'Drop from the plateau', shape: plunge(68, { grade: 0.34, from: 0.15 }), height: 0 },
    { name: 'Run to the hairpin', shape: straight(50, { grade: 0.13 }), height: 0, billboards: 1 },
    { name: 'Hairpin by the gums', shape: hairpin({ side: 'right' }), height: 0 },
    {
      name: 'Under the red walls', shape: sBends({ first: 'left', radius: 65, degrees: 80, grade: 0.17 }), height: 0,
      obstacles: [peg({ costume: 'cairn', at: 0.3, line: 'right' }), peg({ costume: 'cairn', at: 0.7, line: 'left' })],
    },
    {
      name: 'To the line', shape: straight(60, { grade: 0.16 }), height: 0, billboards: 1,
      obstacles: [curtain({ costume: 'vines', at: 0.25, side: 'left' }), peg({ costume: 'cairn', at: 0.6, line: 'right' })],
    },
    { name: 'Finish', shape: runIn(), height: 0 },
  ],
});
