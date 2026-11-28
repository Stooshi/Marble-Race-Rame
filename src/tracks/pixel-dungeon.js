'use strict';

// Pixel Dungeon (Moses, 28 Nov 2026: the Arcade pack towards 20): a dungeon-crawler world inside the machine. The gate
// stands by a pixel keep of our own, its two towers with lit windows and pennants, a torch and a treasure chest. Away
// on the clear start (the field let go in waves, gentle bends and nothing in the way for the first seconds), round the
// moat sweep, a joystick swinging in far down it (the track's first obstacle), along the torch corridor through the
// torches, the crypt bends off a speed pad, down the stairs, then the track's big feature: the dungeon swing, a
// half-pipe rocking the field from wall to wall; along the bone corridor, round the treasure sweep off a second speed pad, down the well and
// the torches on the run to the finish.
const { track, opening, straight, sweep, sBends, plunge, halfPipe, runIn, swipe, peg, slalom, boost } = require('../trackKit');

const pegs = (a, b) => [peg({ costume: 'lantern-pole', at: 0.35, line: a }), peg({ costume: 'lantern-pole', at: 0.7, line: b })];
const drops = () => [slalom({ costume: 'lantern-pole', from: 0.45, to: 0.88, count: 3, loss: 0.2 })];

module.exports = track({
  slug: 'pixel-dungeon',
  name: 'Pixel Dungeon',
  family: 'arcade',
  difficulty: 'hard',
  description: 'A dungeon-crawler world inside the machine: away from the pixel keep in a pack round the moat sweep past a swinging joystick, along the torch corridor through the torches, through the crypt bends and down the stairs, then the dungeon swing, a half-pipe rocking the field from wall to wall, along the bone corridor, round the treasure sweep and down the well to the finish.',
  surface: 'ice',
  biome: 'circuit-board',
  lighting: 'neon-night',
  billboardFrame: 'marquee',
  arcade: { art: 'dungeon', finish: 'QUEST COMPLETE!' },
  signature: 'The dungeon swing',
  tvCameras: [
    // (At the end of the half-pipe, looking back at the field swinging wall to wall.)
    { section: 'The dungeon swing', at: 0.75, side: 'right', distance: 6, height: 5 },
  ],
  start: { landmark: 'pixel-keep', gate: 'barrier', shots: { countdown: 'low-front', launch: 'overhead' } },
  finish: {},
  opening: opening('clear-start', { side: 'right' }),
  sections: [
    {
      name: 'Moat sweep', shape: sweep({ side: 'left', radius: 110, degrees: 70, grade: 0.12 }), billboards: 1,
      obstacles: [swipe({ costume: 'joystick', at: 0.7, side: 'right' })],
    },
    {
      name: 'Torch corridor', shape: straight(70, { grade: 0.12 }),
      obstacles: [slalom({ costume: 'lantern-pole', from: 0.2, to: 0.92, count: 5, loss: 0.3 })],
    },
    { name: 'Crypt bends', shape: sBends({ first: 'right', radius: 65, degrees: 65, grade: 0.13 }), billboards: 1, features: [boost({ at: 0.1, kick: 4 })], obstacles: pegs('right', 'left') },
    { name: 'Down the stairs', shape: plunge(50, { grade: 0.32, from: 0.12 }), billboards: 1, obstacles: drops() },
    { name: 'The dungeon swing', shape: halfPipe({ first: 'left', width: 8, swings: 4, radius: 150, degrees: 18, grade: 0.13 }) },
    { name: 'Bone corridor', shape: straight(90, { grade: 0.12 }), obstacles: pegs('center', 'left') },
    { name: 'Treasure sweep', shape: sweep({ side: 'right', radius: 90, degrees: 140, grade: 0.13 }), billboards: 1, features: [boost({ at: 0.1, kick: 4 })], obstacles: pegs('left', 'right') },
    { name: 'Down the well', shape: plunge(45, { grade: 0.3, from: 0.12 }), obstacles: drops() },
    { name: 'Down to the finish', shape: straight(75, { grade: 0.2 }), obstacles: [slalom({ costume: 'lantern-pole', from: 0.3, to: 0.92, count: 5, loss: 0.3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
