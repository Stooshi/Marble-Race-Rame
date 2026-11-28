'use strict';

// Prize Wheel (Moses, 28 Nov 2026: the Arcade pack towards 20): a prize-wheel world inside the machine. The gate
// stands by a giant prize wheel of our own on its stand, its coloured segments, lights round its rim and its pointer.
// Away on the clear start (the field let go in waves, gentle bends and nothing in the way for the first seconds),
// up to the wheel, along the wheel road past the gumball targets parked far down it (the track's first obstacle)
// and a slalom of drum pegs, through the spin bends off a speed pad, then the track's first big feature: the jackpot
// drop, a steep plunge through a curtain of falling prize tickets; along the lucky lane off a second speed pad, the
// second: the wheel spiral, a banked spiral right round; round the bonus sweep, down the payout and the drum pegs on
// the run to the finish.
const { track, opening, straight, sweep, sBends, plunge, climb, waterfall, spiral, runIn, parked, peg, slalom, boost } = require('../trackKit');

const pegs = (a, b) => [peg({ costume: 'drum-peg', at: 0.35, line: a }), peg({ costume: 'drum-peg', at: 0.7, line: b })];
const drops = () => [slalom({ costume: 'drum-peg', from: 0.45, to: 0.88, count: 3, loss: 0.2 })];

module.exports = track({
  slug: 'prize-wheel',
  name: 'Prize Wheel',
  family: 'arcade',
  difficulty: 'extreme',
  description: 'A prize-wheel world inside the machine: away from the giant prize wheel in a pack, up to the wheel, along the wheel road past the gumball targets and through the drum pegs, through the spin bends, then the jackpot drop, a steep plunge through a curtain of falling prize tickets, along the lucky lane, the wheel spiral, a banked spiral right round, round the bonus sweep and down the payout to the finish.',
  surface: 'ice',
  biome: 'blacklight-carpet',
  lighting: 'synthwave',
  billboardFrame: 'marquee',
  arcade: { art: 'wheel', finish: 'BIG WIN!' },
  signature: 'The wheel spiral',
  tvCameras: [
    // (Out of the spiral, looking back at the field coming off its last turn.)
    { section: 'Bonus sweep', at: 0.2, side: 'left', distance: 8, height: 8 },
  ],
  start: { landmark: 'prize-wheel', gate: 'trapdoor', shots: { countdown: 'swing', launch: 'overhead' } },
  finish: {},
  opening: opening('clear-start', { side: 'left' }),
  sections: [
    { name: 'Up to the wheel', shape: climb(40, { grade: -0.06, after: 0.12 }), billboards: 1 },
    { name: 'Wheel road', shape: straight(90, { grade: 0.12 }), obstacles: [parked({ costume: 'gumball-targets', at: 0.45, side: 'right', length: 6 }), slalom({ costume: 'drum-peg', from: 0.68, to: 0.97, count: 5, loss: 0.3 })] },
    { name: 'Spin bends', shape: sBends({ first: 'left', radius: 65, degrees: 65, grade: 0.12 }), billboards: 1, features: [boost({ at: 0.1, kick: 4 })], obstacles: [slalom({ costume: 'drum-peg', from: 0.3, to: 0.85, count: 3, loss: 0.25 })] },
    { name: 'To the brink', shape: straight(40, { grade: 0.12 }), billboards: 1 },
    { name: 'The jackpot drop', shape: waterfall(45, { grade: 0.4, curtain: true }) },
    { name: 'Lucky lane', shape: straight(60, { grade: 0.12 }), features: [boost({ at: 0.15, kick: 4 })], obstacles: [slalom({ costume: 'drum-peg', from: 0.4, to: 0.9, count: 3, loss: 0.25 })] },
    { name: 'The wheel spiral', shape: spiral({ side: 'right', radius: 48, turns: 1, grade: 0.16 }) },
    { name: 'Bonus sweep', shape: sweep({ side: 'left', radius: 90, degrees: 110, grade: 0.13 }), billboards: 1, obstacles: pegs('right', 'left') },
    { name: 'Down the payout', shape: plunge(45, { grade: 0.26, from: 0.13 }), obstacles: drops() },
    { name: 'Down to the finish', shape: straight(65, { grade: 0.2 }), obstacles: [slalom({ costume: 'drum-peg', from: 0.3, to: 0.92, count: 5, loss: 0.3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
