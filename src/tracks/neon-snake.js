'use strict';

// Neon Snake (Moses, 28 Nov 2026: the Arcade pack towards 20): a snake-game world inside the machine. The gate stands
// by a long pixel snake of our own, coiled on its grid of tiles, a pixel apple by its head. Away on the clear start
// (the field let go in waves, gentle bends and nothing in the way for the first seconds), through the grid bends, a
// pixel wall far down them (the track's first obstacle), along the tail straight through the pixel walls, down a
// level, round the apple sweep off a speed pad, along the score straight off a second speed pad, then the track's big
// feature: the snake coil, a banked spiral a turn and a quarter round; round the long tail sweep and the pixel walls
// on the run to the finish.
const { track, opening, straight, sweep, sBends, plunge, spiral, runIn, peg, slalom, boost } = require('../trackKit');

const pegs = (a, b) => [peg({ costume: 'pixel-wall', at: 0.35, line: a }), peg({ costume: 'pixel-wall', at: 0.7, line: b })];
const drops = () => [slalom({ costume: 'pixel-wall', from: 0.45, to: 0.88, count: 3, loss: 0.2 })];

module.exports = track({
  slug: 'neon-snake',
  name: 'Neon Snake',
  family: 'arcade',
  difficulty: 'hard',
  description: 'A snake-game world inside the machine: away from the coiled pixel snake in a pack through the grid bends past a pixel wall, along the tail straight through the pixel walls, down a level, round the apple sweep and along the score straight, then the snake coil, a banked spiral a turn and a quarter round, round the long tail sweep and on to the finish.',
  surface: 'ice',
  biome: 'circuit-board',
  lighting: 'neon-night',
  billboardFrame: 'marquee',
  arcade: { art: 'snake', finish: 'LONGEST SNAKE!' },
  signature: 'The snake coil',
  tvCameras: [
    // (Out of the coil, looking back at the field coming off its last turn.)
    { section: 'Long tail sweep', at: 0.2, side: 'left', distance: 8, height: 8 },
  ],
  start: { landmark: 'pixel-snake', gate: 'stalls', shots: { countdown: 'crane', launch: 'side' } },
  finish: {},
  opening: opening('clear-start', { side: 'right' }),
  sections: [
    {
      name: 'Grid bends', shape: sBends({ first: 'right', radius: 80, degrees: 60, grade: 0.12 }), billboards: 1,
      obstacles: [peg({ costume: 'pixel-wall', at: 0.8, line: 'center' })],
    },
    {
      name: 'Tail straight', shape: straight(70, { grade: 0.12 }),
      obstacles: [slalom({ costume: 'pixel-wall', from: 0.2, to: 0.92, count: 5, loss: 0.3 })],
    },
    { name: 'Down a level', shape: plunge(50, { grade: 0.32, from: 0.12 }), billboards: 1, obstacles: drops() },
    { name: 'Apple sweep', shape: sweep({ side: 'right', radius: 90, degrees: 100, grade: 0.12 }), billboards: 1, features: [boost({ at: 0.1, kick: 4 })], obstacles: pegs('left', 'right') },
    { name: 'Score straight', shape: straight(50, { grade: 0.12 }), features: [boost({ at: 0.1, kick: 4 })], obstacles: [slalom({ costume: 'pixel-wall', from: 0.4, to: 0.9, count: 3, loss: 0.25 })] },
    { name: 'The snake coil', shape: spiral({ side: 'right', radius: 48, turns: 1.25, grade: 0.16 }) },
    { name: 'Long tail sweep', shape: sweep({ side: 'left', radius: 90, degrees: 110, grade: 0.13 }), billboards: 1, obstacles: pegs('right', 'left') },
    { name: 'Down to the finish', shape: straight(65, { grade: 0.2 }), obstacles: [slalom({ costume: 'pixel-wall', from: 0.3, to: 0.92, count: 5, loss: 0.3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
