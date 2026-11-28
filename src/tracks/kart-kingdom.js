'use strict';

// Kart Kingdom (Moses, 28 Nov 2026: the Arcade pack towards 20): a kart-racing world inside the machine. The gate
// stands by a pixel go-kart of our own on a winners' podium, a chequered arch over it and stacked tyres beside it.
// Away on the clear start (the field let go in waves, gentle bends and nothing in the way for the first seconds),
// up to the grid, along the start straight over a raised kerb far down it (the track's first obstacle) and through
// the drum pegs, the pit bends off a speed pad, round the grandstand sweep, down the hill, then the track's big
// feature: the kart loop, a full loop; the chicane off a second speed pad, down the last hill and the tyre stacks on
// the run to the finish.
const { track, opening, straight, sweep, sBends, plunge, climb, runIn, tableTop, peg, slalom, boost, brake, loop } = require('../trackKit');

const pegs = (a, b) => [peg({ costume: 'drum-peg', at: 0.35, line: a }), peg({ costume: 'drum-peg', at: 0.7, line: b })];
const drops = () => [slalom({ costume: 'drum-peg', from: 0.45, to: 0.88, count: 3, loss: 0.2 })];

module.exports = track({
  slug: 'kart-kingdom',
  name: 'Kart Kingdom',
  family: 'arcade',
  difficulty: 'extreme',
  description: 'A kart-racing world inside the machine: away from the winners\' podium in a pack, up to the grid, along the start straight over a raised kerb and through the drum pegs, through the pit bends, round the grandstand sweep and down the hill, then the kart loop, a full loop, through the chicane and down the last hill to the finish.',
  surface: 'ice',
  biome: 'circuit-board',
  lighting: 'synthwave',
  billboardFrame: 'marquee',
  arcade: { art: 'karts', finish: 'POLE POSITION!' },
  signature: 'The kart loop',
  tvCameras: [
    // (Through the chicane, low, looking back at the field out of the loop.)
    { section: 'The chicane', at: 0.6, side: 'right', distance: 7, height: 5 },
  ],
  start: { landmark: 'kart-podium', gate: 'stalls', shots: { countdown: 'swing', launch: 'low-chase' } },
  finish: {},
  opening: opening('clear-start', { side: 'right' }),
  sections: [
    { name: 'Up to the grid', shape: climb(40, { grade: -0.06, after: 0.12 }), billboards: 1 },
    { name: 'Start straight', shape: straight(100, { grade: 0.12 }), features: [tableTop({ at: 0.35, length: 20 })], obstacles: [slalom({ costume: 'drum-peg', from: 0.72, to: 0.98, count: 5, loss: 0.3 })] },
    { name: 'Pit bends', shape: sBends({ first: 'left', radius: 65, degrees: 65, grade: 0.12 }), billboards: 1, features: [boost({ at: 0.1, kick: 4 })], obstacles: [slalom({ costume: 'drum-peg', from: 0.3, to: 0.85, count: 3, loss: 0.25 })] },
    { name: 'Grandstand sweep', shape: sweep({ side: 'right', radius: 90, degrees: 100, grade: 0.12 }), billboards: 1, obstacles: pegs('left', 'right') },
    { name: 'Down the hill', shape: plunge(45, { grade: 0.28, from: 0.12 }), obstacles: drops() },
    {
      name: 'The kart loop', shape: straight(185, { grade: 0.11 }),
      features: [brake({ at: 0.08, length: 12, drag: 0.02 }), loop({ at: 0.36, viewSide: 10 })],
    },
    { name: 'The chicane', shape: sBends({ first: 'right', radius: 65, degrees: 65, grade: 0.12 }), billboards: 1, features: [boost({ at: 0.1, kick: 4 })], obstacles: pegs('right', 'left') },
    { name: 'Down the last hill', shape: plunge(45, { grade: 0.26, from: 0.12 }), obstacles: drops() },
    { name: 'Down to the finish', shape: straight(65, { grade: 0.2 }), obstacles: [slalom({ costume: 'drum-peg', from: 0.3, to: 0.92, count: 5, loss: 0.3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
