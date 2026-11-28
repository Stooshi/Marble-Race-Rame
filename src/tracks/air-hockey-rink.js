'use strict';

// Air Hockey Rink (Moses, 28 Nov 2026: the Arcade pack towards 20): an air-hockey world inside the machine. The gate
// stands by a giant air-hockey table of our own, its goals, two mallets, a puck and a scoreboard over it. Away on the
// clear start (the field let go in waves, gentle bends and nothing in the way for the first seconds), up to the
// rink, along the rink road past a joystick swinging in far down it (the track's first obstacle), through the
// puck bends and the posts, down the chute to the rink, along the blue line off a speed pad, then the track's big
// feature: the rink bank, a banked turn right round the end of the rink; the face-off bends off a second speed pad,
// down the last chute, round the goal sweep and the posts on the run to the finish.
const { track, opening, straight, sweep, sBends, plunge, climb, runIn, swipe, peg, slalom, boost } = require('../trackKit');

const pegs = (a, b) => [peg({ costume: 'bumper-post', at: 0.35, line: a }), peg({ costume: 'bumper-post', at: 0.7, line: b })];
const drops = () => [slalom({ costume: 'bumper-post', from: 0.45, to: 0.88, count: 3, loss: 0.2 })];

module.exports = track({
  slug: 'air-hockey-rink',
  name: 'Air Hockey Rink',
  family: 'arcade',
  difficulty: 'hard',
  description: 'An air-hockey world inside the machine: away from the giant air-hockey table in a pack, up to the rink, along the rink road past a swinging joystick, through the puck bends and the posts, down the chute to the rink, along the blue line, then the rink bank, a banked turn right round the end of the rink, through the face-off bends, down the last chute and round the goal sweep to the finish.',
  surface: 'ice',
  biome: 'circuit-board',
  lighting: 'neon-night',
  billboardFrame: 'marquee',
  arcade: { art: 'rink', finish: 'GOAL! 7-0' },
  signature: 'The rink bank',
  tvCameras: [
    // (Out of the bank, looking back at the field coming round it.)
    { section: 'Face-off bends', at: 0.2, side: 'right', distance: 8, height: 8 },
  ],
  start: { landmark: 'hockey-rink', gate: 'paddle', shots: { countdown: 'crane', launch: 'low-chase' } },
  finish: {},
  opening: opening('clear-start', { side: 'right' }),
  sections: [
    { name: 'Up to the rink', shape: climb(40, { grade: -0.06, after: 0.12 }), billboards: 1 },
    {
      name: 'Rink road', shape: straight(90, { grade: 0.12 }),
      obstacles: [swipe({ costume: 'joystick', at: 0.6, side: 'right' })],
    },
    { name: 'Puck bends', shape: sBends({ first: 'left', radius: 75, degrees: 55, grade: 0.12 }), obstacles: [slalom({ costume: 'bumper-post', from: 0.2, to: 0.92, count: 5, loss: 0.3 })] },
    { name: 'Down the chute', shape: plunge(50, { grade: 0.3, from: 0.12 }), billboards: 1, obstacles: drops() },
    { name: 'Blue line', shape: straight(55, { grade: 0.12 }), billboards: 1, features: [boost({ at: 0.1, kick: 4 })], obstacles: [slalom({ costume: 'bumper-post', from: 0.4, to: 0.9, count: 3, loss: 0.25 })] },
    { name: 'The rink bank', shape: sweep({ side: 'left', radius: 50, degrees: 190, grade: 0.14 }) },
    { name: 'Face-off bends', shape: sBends({ first: 'right', radius: 65, degrees: 65, grade: 0.13 }), billboards: 1, features: [boost({ at: 0.1, kick: 4 })], obstacles: pegs('right', 'left') },
    { name: 'Down the last chute', shape: plunge(45, { grade: 0.28, from: 0.13 }), obstacles: drops() },
    { name: 'Goal sweep', shape: sweep({ side: 'right', radius: 90, degrees: 130, grade: 0.12 }), billboards: 1, obstacles: pegs('left', 'right') },
    { name: 'Down to the finish', shape: straight(70, { grade: 0.18 }), obstacles: [slalom({ costume: 'bumper-post', from: 0.3, to: 0.92, count: 5, loss: 0.3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
