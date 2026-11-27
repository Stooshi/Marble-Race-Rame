'use strict';

// Sugar Rush (Moses, 27 Nov 2026: the last eight tables of the Pinball pack, toward 20): a candy-land pinball table.
// The gate stands beside a giant cupcake of our own with a cherry on top, lollipops and a candy-striped pole. Away on
// the clear start (the field let go in waves, gentle bends and nothing in the way for the first seconds), along candy
// lane off a speed pad, a magic wand swinging in far down it on the right (the table's first obstacle), the gumdrop
// bends off a second speed pad through the candy canes, round the frosting sweep, down the chocolate falls, then the
// table's big feature: the lollipop loop, a full loop; round the toffee sweep, the jelly bends, down the sugar slope and
// the candy canes on the run to the flippers.
const { track, opening, straight, sweep, sBends, plunge, loop, runIn, swipe, peg, slalom, brake, boost } = require('../trackKit');

const pegs = (a, b) => [peg({ costume: 'candy-cane', at: 0.35, line: a }), peg({ costume: 'candy-cane', at: 0.7, line: b })];
const drops = () => [slalom({ costume: 'candy-cane', from: 0.45, to: 0.88, count: 3, loss: 0.2 })];

module.exports = track({
  slug: 'sugar-rush',
  name: 'Sugar Rush',
  family: 'pinball',
  difficulty: 'extreme',
  description: 'A candy-land pinball table: away from the giant cupcake in a pack along candy lane past a swinging magic wand, through the gumdrop bends and the candy canes, round the frosting sweep and down the chocolate falls, then the lollipop loop, a full loop, round the toffee sweep, through the jelly bends and down the sugar slope to the flippers.',
  surface: 'ice',
  biome: 'playfield',
  lighting: 'parlour',
  pinball: { art: 'sweets', display: 'SUGAR RUSH!', finish: 'CANDY CHAMP' },
  signature: 'The lollipop loop',
  tvCameras: [
    // (Before the loop, looking back: a camera just past a loop draws the whole table on a computer.)
    { section: 'The lollipop loop', at: 0.25, side: 'right', distance: 9, height: 7 },
  ],
  start: { landmark: 'giant-cupcake', gate: 'stalls', shots: { countdown: 'low-front', launch: 'low-chase' } },
  finish: {},
  opening: opening('clear-start', { side: 'right' }),
  sections: [
    {
      name: 'Candy lane', shape: straight(90, { grade: 0.12 }), billboards: 1,
      features: [boost({ at: 0.1, kick: 4 })],
      obstacles: [swipe({ costume: 'magic-wand', at: 0.7, side: 'right' })],
    },
    {
      name: 'Gumdrop bends', shape: sBends({ first: 'left', radius: 65, degrees: 65, grade: 0.12 }), billboards: 1,
      features: [boost({ at: 0.08, kick: 4 })],
      obstacles: [peg({ costume: 'candy-cane', at: 0.18, line: 'center' }), slalom({ costume: 'candy-cane', from: 0.32, to: 0.92, count: 5, loss: 0.3 })],
    },
    { name: 'Frosting sweep', shape: sweep({ side: 'right', radius: 90, degrees: 100, grade: 0.12 }), billboards: 1, obstacles: pegs('left', 'right') },
    { name: 'Down the chocolate falls', shape: plunge(50, { grade: 0.36, from: 0.12 }), obstacles: drops() },
    {
      name: 'The lollipop loop', shape: straight(170, { grade: 0.11 }),
      features: [brake({ at: 0.08, length: 12, drag: 0.02 }), loop({ at: 0.4, viewSide: 14 })],
    },
    { name: 'Toffee sweep', shape: sweep({ side: 'left', radius: 90, degrees: 110, grade: 0.12 }), billboards: 1, obstacles: pegs('right', 'left') },
    { name: 'Jelly bends', shape: sBends({ first: 'right', radius: 65, degrees: 65, grade: 0.12 }), obstacles: pegs('left', 'right') },
    { name: 'Down the sugar slope', shape: plunge(45, { grade: 0.3, from: 0.12 }), billboards: 1, obstacles: drops() },
    { name: 'Down to the flippers', shape: straight(65, { grade: 0.2 }), obstacles: [slalom({ costume: 'candy-cane', from: 0.3, to: 0.92, count: 5, loss: 0.3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
