'use strict';

// Fishing Frenzy (Moses, 28 Nov 2026: the Arcade pack towards 20): a fishing-game world inside the machine. The gate
// stands by a fishing-game tank of our own, pixel fish leaping out of its water, a rod and line over it. Away on the
// clear start (the field let go in waves, gentle bends and nothing in the way for the first seconds), up the jetty,
// through the bait bends under a curtain far down them (the track's first obstacle), along the cast lane through the
// posts, the reel bends off a speed pad, down to the water, then the track's big feature: the big wave, a half-pipe rocking
// the field from wall to wall; along the pier off a second speed pad, round the harbour sweep, down the slipway and
// the posts on the run to the finish.
const { track, opening, straight, sweep, sBends, plunge, climb, halfPipe, runIn, curtain, peg, slalom, boost } = require('../trackKit');

const pegs = (a, b) => [peg({ costume: 'bumper-post', at: 0.35, line: a }), peg({ costume: 'bumper-post', at: 0.7, line: b })];
const drops = () => [slalom({ costume: 'bumper-post', from: 0.45, to: 0.88, count: 3, loss: 0.2 })];

module.exports = track({
  slug: 'fishing-frenzy',
  name: 'Fishing Frenzy',
  family: 'arcade',
  difficulty: 'hard',
  description: 'A fishing-game world inside the machine: away from the fishing tank in a pack, up the jetty, through the bait bends under a curtain, along the cast lane through the posts, through the reel bends and down to the water, then the big wave, a half-pipe rocking the field from wall to wall, along the pier, round the harbour sweep and down the slipway to the finish.',
  surface: 'ice',
  biome: 'circuit-board',
  lighting: 'neon-night',
  billboardFrame: 'marquee',
  arcade: { art: 'fishing', finish: 'BIG CATCH!' },
  signature: 'The big wave',
  tvCameras: [
    // (At the end of the half-pipe, looking back at the field swinging wall to wall.)
    { section: 'The big wave', at: 0.75, side: 'right', distance: 6, height: 5 },
  ],
  start: { landmark: 'fish-tank', gate: 'stalls', shots: { countdown: 'low-front', launch: 'look-back' } },
  finish: {},
  opening: opening('clear-start', { side: 'right' }),
  sections: [
    { name: 'Up the jetty', shape: climb(40, { grade: -0.06, after: 0.12 }), billboards: 1 },
    { name: 'Bait bends', shape: sBends({ first: 'left', radius: 80, degrees: 60, grade: 0.12 }), obstacles: [curtain({ costume: 'stage-curtain', at: 0.6, side: 'left' })] },
    { name: 'Cast lane', shape: straight(70, { grade: 0.12 }), obstacles: [slalom({ costume: 'bumper-post', from: 0.2, to: 0.92, count: 5, loss: 0.3 })] },
    { name: 'Reel bends', shape: sBends({ first: 'right', radius: 65, degrees: 65, grade: 0.12 }), billboards: 1, features: [boost({ at: 0.1, kick: 4 })], obstacles: [slalom({ costume: 'bumper-post', from: 0.3, to: 0.85, count: 3, loss: 0.25 })] },
    { name: 'Down to the water', shape: plunge(50, { grade: 0.3, from: 0.12 }), billboards: 1, obstacles: drops() },
    { name: 'The big wave', shape: halfPipe({ first: 'left', width: 8, swings: 4, radius: 150, degrees: 15, grade: 0.13 }) },
    { name: 'Along the pier', shape: straight(70, { grade: 0.13 }), features: [boost({ at: 0.1, kick: 4 })], obstacles: pegs('center', 'left') },
    { name: 'Harbour sweep', shape: sweep({ side: 'left', radius: 90, degrees: 130, grade: 0.13 }), billboards: 1, obstacles: pegs('right', 'left') },
    { name: 'Down the slipway', shape: plunge(45, { grade: 0.26, from: 0.13 }), obstacles: drops() },
    { name: 'Down to the finish', shape: straight(70, { grade: 0.2 }), obstacles: [slalom({ costume: 'bumper-post', from: 0.3, to: 0.92, count: 5, loss: 0.3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
