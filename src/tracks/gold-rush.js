'use strict';

// Gold Rush (Moses, 26 Nov 2026: the Pinball pack towards 20, the second set): a Wild West mining pinball table. The
// gate stands under a timber mine headframe of our own with its wheel, its ore chute, a water tower and a cart of gold.
// Away on the clear start (the field let go in waves, gentle bends and nothing in the way for the first seconds), round
// the boomtown bend off a speed pad under a banner and between the fence posts, down main street through the posts,
// down the mine shaft, then the table's big feature: the canyon bank, a long, steep banked turn round the canyon; the
// mine tunnels off a second speed pad, down the ore chute, the saloon bends, round the mesa and the posts on the run to the flippers.
const { track, opening, straight, sweep, sBends, plunge, runIn, curtain, peg, slalom, boost } = require('../trackKit');

const drops = () => [slalom({ costume: 'fence-post', from: 0.5, to: 0.85, count: 2, loss: 0.15 })];
const pegs = (a, b, at = [0.35, 0.7]) => [peg({ costume: 'fence-post', at: at[0], line: a }), peg({ costume: 'fence-post', at: at[1], line: b })];

module.exports = track({
  slug: 'gold-rush',
  name: 'Gold Rush',
  family: 'pinball',
  difficulty: 'hard',
  description: 'A Wild West mining pinball table: away from the headframe in a pack, round the boomtown bend, down main street through the fence posts, down the mine shaft, then the canyon bank, a long, steep banked turn round the canyon, through the tunnels, down the ore chute, past the saloon and round the mesa to the flippers.',
  surface: 'ice',
  biome: 'playfield',
  lighting: 'parlour',
  pinball: { art: 'goldrush', display: 'STRIKE GOLD!', finish: 'GOLD KING' },
  signature: 'The canyon bank',
  tvCameras: [
    { section: 'Boomtown bend', at: 0.5, side: 'left', distance: 9, height: 8 },
    // (On the outside at the end of the banking, looking back at the field coming round the canyon wall.)
    { section: 'The canyon bank', at: 0.85, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'mine-headframe', gate: 'stalls', shots: { countdown: 'chase', launch: 'high-side' } },
  finish: {},
  opening: opening('clear-start', { side: 'right' }),
  sections: [
    {
      name: 'Boomtown bend', shape: sweep({ side: 'right', radius: 90, degrees: 100, grade: 0.1 }),
      features: [boost({ at: 0.1, kick: 4 })],
      obstacles: [curtain({ costume: 'banner-gantry', at: 0.3, side: 'left' }), ...pegs('left', 'right', [0.6, 0.85])],
    },
    { name: 'Main street', shape: straight(55, { grade: 0.12 }), obstacles: [slalom({ costume: 'fence-post', from: 0.25, to: 0.92, count: 4, loss: 0.3 })] },
    { name: 'Down the mine shaft', shape: plunge(50, { grade: 0.36, from: 0.12 }), billboards: 1, obstacles: drops() },
    { name: 'Run to the canyon', shape: straight(45, { grade: 0.12 }), billboards: 1 },
    { name: 'The canyon bank', shape: sweep({ side: 'left', radius: 50, degrees: 190, grade: 0.14 }) },
    {
      name: 'Mine tunnels', shape: sBends({ first: 'right', radius: 65, degrees: 65, grade: 0.13 }), billboards: 1,
      features: [boost({ at: 0.08, kick: 4 })], obstacles: pegs('right', 'left', [0.4, 0.75]),
    },
    { name: 'Down the ore chute', shape: plunge(45, { grade: 0.3, from: 0.13 }), obstacles: drops() },
    { name: 'Saloon bends', shape: sBends({ first: 'left', radius: 70, degrees: 60, grade: 0.11 }), obstacles: pegs('center', 'center') },
    { name: 'Mesa bend', shape: sweep({ side: 'right', radius: 90, degrees: 100, grade: 0.1 }), billboards: 1, obstacles: pegs('left', 'right') },
    { name: 'Down to the flippers', shape: straight(60, { grade: 0.13 }), obstacles: [slalom({ costume: 'fence-post', from: 0.3, to: 0.88, count: 4, loss: 0.3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
