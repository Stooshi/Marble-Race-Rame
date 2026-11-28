'use strict';

// Bubble Pop (Moses, 28 Nov 2026: the Arcade pack towards 20): a bubble-shooter world inside the machine. The gate
// stands by a bubble cannon of our own, a bubble in its barrel, under a ceiling of stacked coloured bubbles. Away on
// the clear start (the field let go in waves, gentle bends and nothing in the way for the first seconds), along the
// cannon road, a ray-gun curtain far down it on the left (the track's first obstacle), along the aim lane
// through the bumper posts, round the pop sweep off a speed pad, then the track's first big feature: the bubble falls,
// a steep plunge through a curtain of falling bubbles; along the popper lane off a second speed pad, the second: the
// bubble loop, a full loop; round the ceiling sweep, the ceiling bends, down the chute and the bumper posts on the run
// to the finish.
const { track, opening, straight, sweep, sBends, plunge, waterfall, runIn, peg, slalom, boost, brake, loop, parked, swipe, curtain } = require('../trackKit');

const drops = () => [slalom({ costume: 'bumper-post', from: 0.45, to: 0.88, count: 3, loss: 0.2 })];
const pegs = (a, b) => [peg({ costume: 'bumper-post', at: 0.35, line: a }), peg({ costume: 'bumper-post', at: 0.7, line: b })];

module.exports = track({
  slug: 'bubble-pop',
  name: 'Bubble Pop',
  family: 'arcade',
  difficulty: 'extreme',
  description: 'A bubble-shooter world inside the machine: away from the bubble cannon in a pack along the cannon road under a ray-gun curtain, along the aim lane through the bumper posts, round the pop sweep, then the bubble falls, a steep plunge through a curtain of falling bubbles, along the popper lane, the bubble loop, a full loop, round the ceiling sweep, through the ceiling bends and down the chute to the finish.',
  surface: 'ice',
  biome: 'blacklight-carpet',
  lighting: 'synthwave',
  billboardFrame: 'marquee',
  arcade: { art: 'bubbles', finish: 'ALL CLEAR!' },
  signature: 'The bubble loop',
  tvCameras: [
    // (Round the ceiling sweep, low, looking back at the field out of the loop.)
    { section: 'Ceiling sweep', at: 0.6, side: 'right', distance: 7, height: 5 },
  ],
  start: { landmark: 'bubble-cannon', gate: 'paddle', shots: { countdown: 'low-front', launch: 'high-side' } },
  finish: {},
  opening: opening('clear-start', { side: 'left' }),
  sections: [
    {
      name: 'Cannon road', shape: straight(100, { grade: 0.12 }), billboards: 1,
      obstacles: [curtain({ costume: 'ray-gun', at: 0.7, side: 'left' })],
    },
    {
      name: 'Aim lane', shape: straight(70, { grade: 0.12 }),
      obstacles: [slalom({ costume: 'bumper-post', from: 0.2, to: 0.92, count: 5, loss: 0.3 })],
    },
    { name: 'Pop sweep', shape: sweep({ side: 'right', radius: 90, degrees: 100, grade: 0.12 }), billboards: 1, features: [boost({ at: 0.1, kick: 4 })], obstacles: [slalom({ costume: 'bumper-post', from: 0.35, to: 0.85, count: 3, loss: 0.25 })] },
    { name: 'To the brink', shape: straight(40, { grade: 0.12 }), billboards: 1 },
    { name: 'The bubble falls', shape: waterfall(45, { grade: 0.4, curtain: true }) },
    { name: 'Popper lane', shape: straight(55, { grade: 0.12 }), features: [boost({ at: 0.1, kick: 4 })], obstacles: [slalom({ costume: 'bumper-post', from: 0.4, to: 0.9, count: 3, loss: 0.25 })] },
    {
      name: 'The bubble loop', shape: straight(170, { grade: 0.11 }),
      features: [brake({ at: 0.08, length: 12, drag: 0.02 }), loop({ at: 0.4, viewSide: 10 })],
    },
    { name: 'Ceiling sweep', shape: sweep({ side: 'right', radius: 90, degrees: 110, grade: 0.12 }), obstacles: pegs('left', 'right') },
    { name: 'Ceiling bends', shape: sBends({ first: 'left', radius: 65, degrees: 65, grade: 0.12 }), billboards: 1, obstacles: [slalom({ costume: 'bumper-post', from: 0.25, to: 0.85, count: 3, loss: 0.25 })] },
    { name: 'Down the chute', shape: plunge(45, { grade: 0.3, from: 0.12 }), obstacles: drops() },
    { name: 'Down to the finish', shape: straight(65, { grade: 0.2 }), obstacles: [slalom({ costume: 'bumper-post', from: 0.3, to: 0.92, count: 5, loss: 0.3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
