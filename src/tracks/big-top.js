'use strict';

// Big Top (Moses, 26 Nov 2026: the Pinball pack towards 20): a circus pinball table. The gate stands beside a striped
// big top with its flags, the human cannon aimed at the sky beside it. Away on the clear start (the field let go in
// waves, gentle bends and nothing in the way for the first seconds), the ringmaster's walk off a speed pad through
// the drums, off the high wire, then the table's big feature: the trapeze, a half-pipe swinging the field wall to
// wall; round the ring, clown alley off a second speed pad, down to the globe and the globe of
// death (a full loop), down into the sawdust, the victory lap and the drums on the run to the flippers.
const { track, opening, straight, sweep, sBends, plunge, halfPipe, loop, runIn, peg, slalom, swipe, brake, boost } = require('../trackKit');

module.exports = track({
  slug: 'big-top',
  name: 'Big Top',
  family: 'pinball',
  difficulty: 'extreme',
  description: 'A circus pinball table: away from the gate in a pack, through the drums and off the high wire, then the trapeze, a half-pipe swinging the field wall to wall, round the ring, clown alley, the globe of death, a full loop, down into the sawdust and a victory lap to the flippers.',
  surface: 'ice',
  biome: 'playfield',
  lighting: 'parlour',
  pinball: { art: 'circus', display: 'ROLL UP!', finish: 'STAR OF THE SHOW' },
  signature: 'The trapeze',
  tvCameras: [
    // (At the end of the half-pipe, looking back at the field swinging wall to wall.)
    { section: 'The trapeze', at: 0.75, side: 'left', distance: 6, height: 5 },
    // (Before the loop, looking back: a camera just past a loop draws the whole table on a computer.)
    { section: 'The globe of death', at: 0.25, side: 'right', distance: 9, height: 7 },
  ],
  start: { landmark: 'big-top-tent', gate: 'stalls', shots: { countdown: 'crane', launch: 'overhead' } },
  finish: {},
  opening: opening('clear-start', { side: 'left' }),
  sections: [
    {
      name: 'The ringmaster\'s walk', shape: straight(70, { grade: 0.12 }),
      features: [boost({ at: 0.07, kick: 4 })],
      obstacles: [peg({ costume: 'drum-peg', at: 0.2, line: 'center' }), slalom({ costume: 'drum-peg', from: 0.4, to: 0.78, count: 3, loss: 0.3 }), peg({ costume: 'drum-peg', at: 0.92, line: 'left' })],
    },
    {
      name: 'Off the high wire', shape: plunge(55, { grade: 0.32, from: 0.12 }), billboards: 1,
      obstacles: [slalom({ costume: 'drum-peg', from: 0.5, to: 0.85, count: 2, loss: 0.15 })],
    },
    { name: 'The trapeze', shape: halfPipe({ first: 'right', width: 8, swings: 3, radius: 150, degrees: 18, grade: 0.13 }) },
    {
      name: 'Round the ring', shape: sweep({ side: 'left', radius: 90, degrees: 110, grade: 0.1 }), billboards: 1,
      obstacles: [peg({ costume: 'drum-peg', at: 0.4, line: 'right' }), peg({ costume: 'drum-peg', at: 0.7, line: 'left' })],
    },
    {
      name: 'Clown alley', shape: sBends({ first: 'right', radius: 65, degrees: 65, grade: 0.13 }), billboards: 1,
      features: [boost({ at: 0.08, kick: 4 })],
      obstacles: [peg({ costume: 'drum-peg', at: 0.4, line: 'right' }), peg({ costume: 'drum-peg', at: 0.75, line: 'left' })],
    },
    {
      name: 'Down to the globe', shape: plunge(50, { grade: 0.36, from: 0.13 }),
      obstacles: [slalom({ costume: 'drum-peg', from: 0.5, to: 0.85, count: 2, loss: 0.15 })],
    },
    {
      name: 'The globe of death', shape: straight(170, { grade: 0.11 }),
      features: [brake({ at: 0.08, length: 12, drag: 0.02 }), loop({ at: 0.4, viewSide: 14 })],
    },
    {
      name: 'Into the sawdust', shape: plunge(50, { grade: 0.3, from: 0.11 }),
      obstacles: [slalom({ costume: 'drum-peg', from: 0.5, to: 0.85, count: 2, loss: 0.15 })],
    },
    {
      name: 'Victory lap', shape: sweep({ side: 'right', radius: 90, degrees: 110, grade: 0.09 }), billboards: 1,
      obstacles: [peg({ costume: 'drum-peg', at: 0.35, line: 'left' }), peg({ costume: 'drum-peg', at: 0.65, line: 'right' })],
    },
    {
      name: 'Down to the flippers', shape: straight(60, { grade: 0.13 }),
      obstacles: [swipe({ costume: 'flipper-bat', at: 0.15, side: 'left' }), slalom({ costume: 'drum-peg', from: 0.4, to: 0.88, count: 4, loss: 0.3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
