'use strict';

// Coin Pusher (Moses, 28 Nov 2026: the Arcade pack towards 20): a coin-pusher world inside the machine. The gate
// stands by a coin-pusher machine of our own, its shelves stacked with gold coins, the pusher sliding across them,
// a lit sign and a prize box on top. Away on the clear start (the field let go in waves, gentle bends and nothing in
// the way for the first seconds), up the coin ramp, along the prize road under a curtain far down it (the track's
// first obstacle), through the token bends and the posts, round the shelf sweep off a speed pad, down a shelf, then
// the track's big feature: the coin cascade, a steep plunge through a curtain of falling coins; along the jackpot
// lane off a second speed pad, round the payout sweep, down the payout chute and the posts on the run to the finish.
const { track, opening, straight, sweep, sBends, plunge, climb, waterfall, runIn, curtain, peg, slalom, boost } = require('../trackKit');

const pegs = (a, b) => [peg({ costume: 'bumper-post', at: 0.35, line: a }), peg({ costume: 'bumper-post', at: 0.7, line: b })];
const drops = () => [slalom({ costume: 'bumper-post', from: 0.45, to: 0.88, count: 3, loss: 0.2 })];

module.exports = track({
  slug: 'coin-pusher',
  name: 'Coin Pusher',
  family: 'arcade',
  difficulty: 'extreme',
  description: 'A coin-pusher world inside the machine: away from the coin-pusher machine in a pack up the coin ramp, along the prize road under a curtain, through the token bends and the posts, round the shelf sweep and down a shelf, then the coin cascade, a steep plunge through a curtain of falling coins, along the jackpot lane, round the payout sweep and down the payout chute to the finish.',
  surface: 'ice',
  biome: 'blacklight-carpet',
  lighting: 'neon-night',
  billboardFrame: 'marquee',
  arcade: { art: 'coins', finish: 'JACKPOT!' },
  signature: 'The coin cascade',
  tvCameras: [
    // (At the foot of the cascade, looking back up at the field pouring through the curtain.)
    { section: 'Jackpot lane', at: 0.3, side: 'right', distance: 8, height: 7 },
  ],
  start: { landmark: 'coin-pusher', gate: 'barrier', shots: { countdown: 'swing', launch: 'side' } },
  finish: {},
  opening: opening('clear-start', { side: 'left' }),
  sections: [
    { name: 'Up the coin ramp', shape: climb(40, { grade: -0.06, after: 0.12 }), billboards: 1 },
    {
      name: 'Prize road', shape: straight(90, { grade: 0.12 }),
      obstacles: [curtain({ costume: 'banner-gantry', at: 0.6, side: 'left' })],
    },
    { name: 'Token bends', shape: sBends({ first: 'right', radius: 75, degrees: 55, grade: 0.12 }), obstacles: [slalom({ costume: 'bumper-post', from: 0.2, to: 0.92, count: 5, loss: 0.3 })] },
    { name: 'Shelf sweep', shape: sweep({ side: 'left', radius: 90, degrees: 100, grade: 0.12 }), billboards: 1, features: [boost({ at: 0.1, kick: 4 })], obstacles: pegs('right', 'left') },
    { name: 'Down a shelf', shape: plunge(50, { grade: 0.3, from: 0.12 }), obstacles: drops() },
    { name: 'To the edge', shape: straight(40, { grade: 0.12 }), billboards: 1 },
    { name: 'The coin cascade', shape: waterfall(45, { grade: 0.4, curtain: true }) },
    { name: 'Jackpot lane', shape: straight(60, { grade: 0.12 }), features: [boost({ at: 0.15, kick: 4 })], obstacles: pegs('center', 'left') },
    { name: 'Payout sweep', shape: sweep({ side: 'right', radius: 90, degrees: 130, grade: 0.13 }), billboards: 1, obstacles: pegs('left', 'right') },
    { name: 'Down the payout chute', shape: plunge(45, { grade: 0.27, from: 0.13 }), obstacles: drops() },
    { name: 'Down to the finish', shape: straight(72, { grade: 0.2 }), obstacles: [slalom({ costume: 'bumper-post', from: 0.3, to: 0.92, count: 5, loss: 0.3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
