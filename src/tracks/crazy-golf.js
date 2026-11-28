'use strict';

// Crazy Golf (Moses, 28 Nov 2026: the Arcade pack towards 20): a crazy-golf world inside the machine. The gate stands
// by a crazy-golf windmill of our own, its sails turning over the tunnel, a flag in the hole and a ball on the green.
// Away on the clear start (the field let go in waves, gentle bends and nothing in the way for the first seconds), up
// the first tee, along the fairway past a row of targets far down it (the track's first obstacle) and a slalom of posts, the
// windmill bends off a speed pad, round the dogleg off a second speed pad, then the track's big feature: the windmill split,
// the field split either side of the windmill, one channel quick and one rough; the bunker bends, down the last hole
// and the posts on the run to the finish.
const { track, opening, straight, sweep, sBends, plunge, climb, splitter, runIn, parked, peg, slalom, boost } = require('../trackKit');

const pegs = (a, b) => [peg({ costume: 'bumper-post', at: 0.35, line: a }), peg({ costume: 'bumper-post', at: 0.7, line: b })];
const drops = () => [slalom({ costume: 'bumper-post', from: 0.45, to: 0.88, count: 3, loss: 0.2 })];

module.exports = track({
  slug: 'crazy-golf',
  name: 'Crazy Golf',
  family: 'arcade',
  difficulty: 'extreme',
  description: 'A crazy-golf world inside the machine: away from the windmill in a pack up the first tee, along the fairway past a row of targets and through the posts, through the windmill bends, round the dogleg, then the windmill split, the field split either side of the windmill, through the bunker bends and down the last hole to the finish.',
  surface: 'ice',
  biome: 'circuit-board',
  lighting: 'synthwave',
  billboardFrame: 'marquee',
  arcade: { art: 'golf', finish: 'HOLE IN ONE!' },
  signature: 'The windmill split',
  tvCameras: [
    // (Out of the split, looking back at the field coming through its two channels.)
    { section: 'Bunker bends', at: 0.3, side: 'right', distance: 8, height: 7 },
  ],
  start: { landmark: 'golf-windmill', gate: 'trapdoor', shots: { countdown: 'side', launch: 'low-chase' } },
  finish: {},
  opening: opening('clear-start', { side: 'left' }),
  sections: [
    { name: 'Up the first tee', shape: climb(40, { grade: -0.06, after: 0.12 }), billboards: 1 },
    {
      name: 'Fairway', shape: straight(100, { grade: 0.12 }),
      obstacles: [parked({ costume: 'standup-targets', at: 0.45, side: 'left', length: 6 }), slalom({ costume: 'bumper-post', from: 0.68, to: 0.97, count: 5, loss: 0.3 })],
    },
    { name: 'Windmill bends', shape: sBends({ first: 'right', radius: 70, degrees: 65, grade: 0.12 }), billboards: 1, features: [boost({ at: 0.08, kick: 4 })], obstacles: [slalom({ costume: 'bumper-post', from: 0.3, to: 0.85, count: 3, loss: 0.25 })] },
    { name: 'Dogleg sweep', shape: sweep({ side: 'right', radius: 90, degrees: 110, grade: 0.12 }), billboards: 1, features: [boost({ at: 0.08, kick: 4 })], obstacles: [slalom({ costume: 'bumper-post', from: 0.3, to: 0.85, count: 3, loss: 0.25 })] },
    { name: 'Run to the windmill', shape: straight(30, { grade: 0.12 }), obstacles: [peg({ costume: 'bumper-post', at: 0.4, line: 'center' })] },
    { name: 'The windmill split', shape: splitter({ side: 'right', balance: { tipOffset: -2.0, left: { drag: 0.15, scrub: 0.5 }, right: { drag: 2.4, scrub: 2.3 } } }) },
    { name: 'Bunker bends', shape: sBends({ first: 'left', radius: 70, degrees: 55, grade: 0.13 }), billboards: 1, obstacles: pegs('right', 'left') },
    { name: 'Down the last hole', shape: plunge(45, { grade: 0.26, from: 0.13 }), obstacles: drops() },
    { name: 'Down to the finish', shape: straight(60, { grade: 0.18 }), obstacles: [slalom({ costume: 'bumper-post', from: 0.3, to: 0.92, count: 5, loss: 0.3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
