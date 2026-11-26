'use strict';

// Mushroom Grove (Moses, 15 Nov 2026: seven more Blocks 1 tracks, the pack filled to 20; one of the two Easy ones). A
// soft green game world of giant cube mushrooms: off a ramp and a rolling start across the grass (the field let go in
// waves), a straight across the meadow, then off the giant mushroom (the track's big feature: a drop off the edge of a
// great spotted cap), a straight below it past a score wall, a sweep round a ring of little mushrooms, through a
// checkpoint arch, the hairpin, a rise, S-bends through the grove and the run to the line. Our own shapes and colours:
// no names, creatures or pieces from any existing game.
const {
  track, opening, straight, plunge, climb, sBends, sweep, hairpin, runIn, slalom, brake,
} = require('../trackKit');

module.exports = track({
  slug: 'mushroom-grove',
  name: 'Mushroom Grove',
  family: 'block',
  difficulty: 'easy',
  description: 'A soft green world of giant cube mushrooms: across the meadow, off the edge of a great spotted cap, past a score wall and round a ring of little mushrooms, through a checkpoint and down through the grove to the line.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'day',
  variants: ['sunset'],
  block: { world: 'mushroom' },
  coaster: { style: 'blocks', colours: { support: '#8a6a4a', rail: '#f4efe4', tie: '#5a4430' } },
  signature: 'Off the giant mushroom',
  tvCameras: [
    // (At the foot of the drop, looking back up at the field coming off the cap.)
    { section: 'Below the cap', at: 0.2, side: 'left', distance: 10, height: 12 },
    { section: 'Through the grove', at: 0.5, side: 'right', distance: 10, height: 11 },
  ],
  start: { landmark: 'mushroom-ring', type: 'ski-jump', gate: 'barrier', shots: { countdown: 'chase', launch: 'side' } },
  finish: { landmark: 'block-hall' },
  opening: opening('rolling-start', {
    side: 'right',
    costumes: { slalom: 'cube-pillar' },
    names: { run: 'Down the ramp', turn: 'Round the first caps' },
    // (Let go in shorter waves, a new order every race: the opening's own longer waves favour one starting group.)
    waves: { groups: 5, gap: 0.16, jitter: 0.1 },
  }),
  sections: [
    { name: 'Across the meadow', shape: straight(60, { grade: 0.1 }), billboards: 1 },
    {
      name: 'Off the giant mushroom', shape: plunge(48, { grade: 0.34, from: 0.12 }),
      landmarks: [{ name: 'giant-mushroom', at: 0.4, side: 'left', distance: 22 }],
    },
    {
      name: 'Below the cap', shape: straight(65, { grade: 0.1 }),
      landmarks: [{ name: 'score-wall', at: 0.55, side: 'right', distance: 12 }],
      features: [brake({ at: 0.08, length: 14, drag: 0.02 })],
      obstacles: [slalom({ costume: 'toadstool', from: 0.35, to: 0.8, count: 3, loss: 0.2 })],
    },
    {
      name: 'Round the ring', shape: sBends({ first: 'left', radius: 70, degrees: 75, grade: 0.1 }), billboards: 1,
      landmarks: [{ name: 'mushroom-ring', at: 0.5, side: 'right', distance: 22 }],
    },
    {
      name: 'Past the checkpoint', shape: straight(65, { grade: 0.1 }),
      landmarks: [{ name: 'checkpoint-arch', at: 0.5, side: 'left', distance: 14 }],
      features: [brake({ at: 0.06, length: 12, drag: 0.02 })],
    },
    { name: 'Hairpin by the caps', shape: hairpin({ side: 'left' }) },
    { name: 'Up the bank', shape: climb(12, { grade: -0.04, after: 0.3 }) },
    {
      name: 'Through the grove', shape: sweep({ side: 'right', radius: 80, degrees: 110, grade: 0.1 }), billboards: 1,
      obstacles: [slalom({ costume: 'toadstool', from: 0.3, to: 0.7, count: 3, loss: 0.2 })],
    },
    {
      name: 'To the line', shape: straight(75, { grade: 0.1 }), billboards: 1,
      features: [brake({ at: 0.05, length: 12, drag: 0.02 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
