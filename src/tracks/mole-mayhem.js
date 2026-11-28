'use strict';

// Mole Mayhem (Moses, 28 Nov 2026: the Arcade pack towards 20): a whack-the-mole world inside the machine. The gate
// stands by a whack-the-mole machine of our own, its holes with pixel moles popping up, a score sign and a big mallet.
// Away on the clear start (the field let go in waves, gentle bends and nothing in the way for the first seconds),
// along the molehill road, a token pusher far down it on the left (the track's first obstacle), through the burrow
// bends and the drum pegs, the hole bends off a speed pad, along the lawn, then the track's first big feature: the
// mole drop, a steep plunge through a curtain of falling soil; through the tunnels off a second speed pad, the second:
// the mallet swing, a half-pipe rocking the field from wall to wall; round the
// score sweep, down the last burrow and the drum pegs on the run to the finish.
const { track, opening, straight, sweep, sBends, plunge, waterfall, halfPipe, runIn, block, peg, slalom, boost } = require('../trackKit');

const pegs = (a, b) => [peg({ costume: 'drum-peg', at: 0.35, line: a }), peg({ costume: 'drum-peg', at: 0.7, line: b })];
const drops = () => [slalom({ costume: 'drum-peg', from: 0.45, to: 0.88, count: 3, loss: 0.2 })];

module.exports = track({
  slug: 'mole-mayhem',
  name: 'Mole Mayhem',
  family: 'arcade',
  difficulty: 'extreme',
  description: 'A whack-the-mole world inside the machine: away from the mole machine in a pack, along the molehill road past a token pusher, through the burrow bends and the drum pegs, through the hole bends and along the lawn, then the mole drop, a steep plunge through a curtain of falling soil, through the tunnels, the mallet swing, a half-pipe rocking the field from wall to wall, round the score sweep and down the last burrow to the finish.',
  surface: 'ice',
  biome: 'blacklight-carpet',
  lighting: 'neon-night',
  billboardFrame: 'marquee',
  arcade: { art: 'moles', finish: 'WHACK MASTER!' },
  signature: 'The mallet swing',
  tvCameras: [
    // (At the end of the half-pipe, looking back at the field swinging wall to wall.)
    { section: 'The mallet swing', at: 0.75, side: 'left', distance: 6, height: 5 },
  ],
  start: { landmark: 'mole-machine', gate: 'paddle', shots: { countdown: 'above', launch: 'high-side' } },
  finish: {},
  opening: opening('clear-start', { side: 'left' }),
  sections: [
    {
      name: 'Molehill road', shape: straight(100, { grade: 0.12 }), billboards: 1,
      obstacles: [block({ costume: 'token-pusher', at: 0.7, line: 'left', loss: 0.1 })],
    },
    {
      name: 'Burrow bends', shape: sBends({ first: 'left', radius: 75, degrees: 55, grade: 0.12 }),
      obstacles: [slalom({ costume: 'drum-peg', from: 0.2, to: 0.92, count: 5, loss: 0.3 })],
    },
    { name: 'Hole bends', shape: sBends({ first: 'right', radius: 65, degrees: 65, grade: 0.12 }), billboards: 1, features: [boost({ at: 0.1, kick: 4 })], obstacles: [slalom({ costume: 'drum-peg', from: 0.35, to: 0.85, count: 3, loss: 0.25 })] },
    { name: 'The lawn', shape: straight(45, { grade: 0.12 }), billboards: 1 },
    { name: 'The mole drop', shape: waterfall(45, { grade: 0.4, curtain: true }) },
    { name: 'Through the tunnels', shape: straight(60, { grade: 0.12 }), billboards: 1, features: [boost({ at: 0.1, kick: 4 })], obstacles: pegs('center', 'left') },
    { name: 'The mallet swing', shape: halfPipe({ first: 'right', width: 8, swings: 4, radius: 150, degrees: 18, grade: 0.13 }) },
    { name: 'Score sweep', shape: sweep({ side: 'left', radius: 90, degrees: 140, grade: 0.13 }), billboards: 1, obstacles: pegs('right', 'left') },
    { name: 'Down the last burrow', shape: plunge(45, { grade: 0.3, from: 0.12 }), obstacles: drops() },
    { name: 'Down to the finish', shape: straight(75, { grade: 0.2 }), obstacles: [slalom({ costume: 'drum-peg', from: 0.3, to: 0.92, count: 5, loss: 0.3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
