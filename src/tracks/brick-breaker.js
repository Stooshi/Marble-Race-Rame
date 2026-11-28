'use strict';

// Brick Breaker (Moses, 28 Nov 2026: the Arcade pack towards 20): a brick-breaking world inside the machine. The gate
// stands by a wall of coloured bricks of our own, a gap knocked in it, a paddle and a ball on its way up. Away on the
// clear start (the field let go in waves, gentle bends and nothing in the way for the first seconds), along the
// paddle road, a pixel wall far down it (the track's first obstacle) and a slalom of pixel walls, down the wall, the
// brick bends off a speed pad, round the ball sweep off a second speed pad, then the track's big
// feature: the paddle split, the field split either side of a giant paddle, one channel quick and one rough; down
// the chute, along the bounce lane, down the last wall and the pixel walls on the run to the finish.
const { track, opening, straight, sweep, sBends, plunge, splitter, runIn, peg, slalom, boost } = require('../trackKit');

const pegs = (a, b) => [peg({ costume: 'pixel-wall', at: 0.35, line: a }), peg({ costume: 'pixel-wall', at: 0.7, line: b })];
const drops = () => [slalom({ costume: 'pixel-wall', from: 0.45, to: 0.88, count: 3, loss: 0.2 })];

module.exports = track({
  slug: 'brick-breaker',
  name: 'Brick Breaker',
  family: 'arcade',
  difficulty: 'extreme',
  description: 'A brick-breaking world inside the machine: away from the brick wall in a pack, along the paddle road through the pixel walls, down the wall, through the brick bends, round the ball sweep, then the paddle split, the field split either side of a giant paddle, down the chute, along the bounce lane and down the last wall to the finish.',
  surface: 'ice',
  biome: 'circuit-board',
  lighting: 'synthwave',
  billboardFrame: 'marquee',
  arcade: { art: 'bricks', finish: 'WALL CLEARED!' },
  signature: 'The paddle split',
  tvCameras: [
    // (Out of the split, looking back at the field coming through its two channels.)
    { section: 'Down the chute', at: 0.6, side: 'left', distance: 8, height: 7 },
  ],
  start: { landmark: 'brick-paddle', gate: 'barrier', shots: { countdown: 'chase', launch: 'high-side' } },
  finish: {},
  opening: opening('clear-start', { side: 'left' }),
  sections: [
    {
      name: 'Paddle road', shape: straight(125, { grade: 0.12 }), billboards: 1,
      obstacles: [peg({ costume: 'pixel-wall', at: 0.45, line: 'center' }), slalom({ costume: 'pixel-wall', from: 0.68, to: 0.97, count: 5, loss: 0.3 })],
    },
    { name: 'Down the wall', shape: plunge(50, { grade: 0.27, from: 0.12 }), billboards: 1, obstacles: drops() },
    { name: 'Brick bends', shape: sBends({ first: 'left', radius: 65, degrees: 65, grade: 0.12 }), billboards: 1, features: [boost({ at: 0.08, kick: 4 })], obstacles: pegs('right', 'left') },
    { name: 'Ball sweep', shape: sweep({ side: 'right', radius: 90, degrees: 110, grade: 0.12 }), billboards: 1, features: [boost({ at: 0.08, kick: 4 })], obstacles: pegs('left', 'right') },
    { name: 'Run to the paddle', shape: straight(30, { grade: 0.12 }), obstacles: [peg({ costume: 'pixel-wall', at: 0.4, line: 'center' })] },
    { name: 'The paddle split', shape: splitter({ side: 'right', balance: { tipOffset: -2.0, left: { drag: 0.15, scrub: 0.5 }, right: { drag: 2.2, scrub: 2.2 } } }) },
    { name: 'Down the chute', shape: plunge(50, { grade: 0.26, from: 0.14 }), billboards: 1, obstacles: drops() },
    { name: 'Bounce lane', shape: straight(50, { grade: 0.15 }), obstacles: [peg({ costume: 'pixel-wall', at: 0.5, line: 'center' })] },
    { name: 'Down the last wall', shape: plunge(45, { grade: 0.3, from: 0.12 }), obstacles: drops() },
    { name: 'Down to the finish', shape: straight(55, { grade: 0.2 }), obstacles: [slalom({ costume: 'pixel-wall', from: 0.3, to: 0.92, count: 5, loss: 0.3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
