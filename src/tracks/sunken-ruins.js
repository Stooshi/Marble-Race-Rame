'use strict';

// Sunken Ruins (Moses, 15 Nov 2026: seven more Blocks 1 tracks, the pack filled to 20; one of the two Easy ones). A teal
// game world as if under the sea, pale stone ruins among swaying kelp: off a stepped pyramid's top and through the silt (the
// sand-trap start, the field let go in waves), a straight past a row of broken arches, down the old steps, S-bends through the
// kelp, then round the sunken dome (the track's big feature: a dramatic banked turn on high supports right round a
// great stepped dome, its top broken open), past a wall of clearing rows, the hairpin, S-bends along the sea floor and
// the run to the line. Our own shapes and colours: no names, creatures or pieces from any existing game.
const {
  track, opening, straight, plunge, sBends, sweep, hairpin, runIn, slalom, brake,
} = require('../trackKit');

module.exports = track({
  slug: 'sunken-ruins',
  name: 'Sunken Ruins',
  family: 'block',
  difficulty: 'easy',
  description: 'A teal world as if under the sea: off a stepped pyramid, past a row of broken arches, down the old steps and through the kelp, right round a great sunken dome high on its supports and along the sea floor to the line.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'day',
  variants: ['sunset'],
  block: { world: 'sunken' },
  coaster: { style: 'blocks', colours: { support: '#4a7a7a', rail: '#eef4f2', tie: '#2a4a4a' } },
  signature: 'Round the sunken dome',
  tvCameras: [
    // (At the end of the turn, looking back round it at the field coming off the dome.)
    { section: 'Round the sunken dome', at: 0.8, side: 'left', distance: 10, height: 12 },
    { section: 'Along the sea floor', at: 0.75, side: 'right', distance: 10, height: 11 },
  ],
  start: { landmark: 'sunken-arches', type: 'block-pyramid', gate: 'paddle', shots: { countdown: 'crane', launch: 'overhead' } },
  finish: { landmark: 'block-hall' },
  opening: opening('sand-trap', {
    costumes: { block: 'voxel-cube', slalom: 'cube-pillar' },
    names: { plunge: 'Through the silt' },
    // (Let go in short jittered waves, a new order every race.)
    waves: { groups: 5, gap: 0.12, jitter: 0.1 },
  }),
  sections: [
    {
      name: 'Past the arches', shape: straight(60, { grade: 0.11 }), billboards: 1,
      landmarks: [{ name: 'sunken-arches', at: 0.5, side: 'left', distance: 26 }],
      features: [brake({ at: 0.06, length: 12, drag: 0.02 })],
    },
    { name: 'Down the old steps', shape: plunge(40, { grade: 0.26, from: 0.14 }) },
    {
      name: 'Through the kelp', shape: sBends({ first: 'right', radius: 70, degrees: 75, grade: 0.11 }),
    },
    {
      name: 'Round the sunken dome', shape: sweep({ side: 'left', radius: 45, degrees: 170, grade: 0.11 }), height: 8, billboards: 1,
      landmarks: [{ name: 'sunken-dome', at: 0.5, side: 'right', distance: 34 }],
    },
    {
      name: 'Past the clearing rows', shape: straight(60, { grade: 0.11 }),
      landmarks: [{ name: 'clear-rows', at: 0.5, side: 'left', distance: 6 }],
      features: [brake({ at: 0.05, length: 12, drag: 0.02 })],
    },
    { name: 'Hairpin by the columns', shape: hairpin({ side: 'right' }) },
    { name: 'Along the sea floor', shape: sBends({ first: 'left', radius: 75, degrees: 80, grade: 0.11 }), billboards: 1 },
    {
      name: 'To the line', shape: straight(80, { grade: 0.11 }), billboards: 1,
      features: [brake({ at: 0.05, length: 12, drag: 0.02 })],
      obstacles: [slalom({ costume: 'cube-pillar', from: 0.55, to: 0.9, count: 3, loss: 0.3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
