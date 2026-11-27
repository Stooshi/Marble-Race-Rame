'use strict';

// Viking Raid (Moses, 27 Nov 2026: the last eight tables of the Pinball pack, toward 20): a Viking pinball table on a
// stormy fjord. The gate stands beside a longship of our own, its striped sail up, its shields along the side and its
// carved prow, riding a wave. Away on the clear start (the field let go in waves, gentle bends and nothing in the way
// for the first seconds), along the harbour road off a speed pad, a pile-up of barrels far down it (the table's first
// obstacle), round the fjord off a second speed pad through the rope posts, down the cliffs, then the table's big feature:
// the longship's swell, a half-pipe rocking the field from wall to wall; the mead-hall bends, round the raiders'
// bend, over the rapids, past the longhouse and the rope posts on the run to the flippers.
const { track, opening, straight, sweep, sBends, plunge, halfPipe, runIn, pileUp, peg, slalom, boost } = require('../trackKit');

const pegs = (a, b) => [peg({ costume: 'rope-post', at: 0.35, line: a }), peg({ costume: 'rope-post', at: 0.7, line: b })];
const drops = () => [slalom({ costume: 'rope-post', from: 0.5, to: 0.85, count: 2, loss: 0.15 })];

module.exports = track({
  slug: 'viking-raid',
  name: 'Viking Raid',
  family: 'pinball',
  difficulty: 'hard',
  description: 'A Viking pinball table on a stormy fjord: away from the longship in a pack along the harbour road past a pile-up of barrels, round the fjord through the rope posts, down the cliffs, then the longship\'s swell, a half-pipe rocking the field from wall to wall, through the mead-hall bends, round the raiders\' bend, over the rapids and past the longhouse to the flippers.',
  surface: 'ice',
  biome: 'playfield',
  lighting: 'parlour',
  pinball: { art: 'viking', display: 'RAID!', finish: 'FJORD KING' },
  signature: 'The longship\'s swell',
  tvCameras: [
    // (At the end of the half-pipe, looking back at the field swinging wall to wall.)
    { section: 'The longship\'s swell', at: 0.75, side: 'left', distance: 6, height: 5 },
  ],
  start: { landmark: 'viking-longship', gate: 'paddle', shots: { countdown: 'crane', launch: 'high-side' } },
  finish: {},
  opening: opening('clear-start', { side: 'left' }),
  sections: [
    {
      name: 'Harbour road', shape: straight(90, { grade: 0.12 }), billboards: 1,
      features: [boost({ at: 0.1, kick: 4 })],
      obstacles: [pileUp({ costume: 'barrel', at: 0.6 })],
    },
    {
      name: 'Fjord sweep', shape: sweep({ side: 'left', radius: 90, degrees: 100, grade: 0.12 }), billboards: 1,
      features: [boost({ at: 0.1, kick: 4 })], obstacles: [slalom({ costume: 'rope-post', from: 0.25, to: 0.92, count: 5, loss: 0.3 })],
    },
    { name: 'Down the cliffs', shape: plunge(50, { grade: 0.32, from: 0.12 }), billboards: 1, obstacles: drops() },
    { name: 'The longship\'s swell', shape: halfPipe({ first: 'right', width: 8, swings: 3, radius: 150, degrees: 18, grade: 0.13 }) },
    { name: 'Mead-hall bends', shape: sBends({ first: 'left', radius: 65, degrees: 65, grade: 0.12 }), billboards: 1, obstacles: pegs('right', 'left') },
    { name: 'Raiders\' bend', shape: sweep({ side: 'right', radius: 90, degrees: 150, grade: 0.12 }), billboards: 1, obstacles: pegs('left', 'right') },
    { name: 'Over the rapids', shape: plunge(45, { grade: 0.3, from: 0.12 }), obstacles: drops() },
    { name: 'Longhouse straight', shape: straight(50, { grade: 0.12 }), obstacles: pegs('center', 'left') },
    { name: 'Down to the flippers', shape: straight(65, { grade: 0.2 }), obstacles: [slalom({ costume: 'rope-post', from: 0.3, to: 0.92, count: 5, loss: 0.3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
