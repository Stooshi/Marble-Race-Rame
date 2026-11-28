'use strict';

// Dodgem Derby (Moses, 28 Nov 2026: the Arcade pack towards 20): a bumper-car world inside the machine. The gate
// stands by a bumper-car arena of our own, its netted poles sparking overhead and two bumper cars nose to nose.
// Away on the clear start (the field let go in waves, gentle bends and nothing in the way for the first seconds),
// along the arena road over a rail far down it (the track's first obstacle) and through the posts, the bump bends off
// a speed pad, round the arena sweep off a second speed pad, along the arena lane, then the track's big feature: the
// dodgem ring, a banked turn right round the arena; the spin-out bends, the crash lane, down the exit ramp and the
// posts on the run to the finish.
const { track, opening, straight, sweep, sBends, plunge, runIn, rail, peg, slalom, boost } = require('../trackKit');

const pegs = (a, b) => [peg({ costume: 'bumper-post', at: 0.35, line: a }), peg({ costume: 'bumper-post', at: 0.7, line: b })];
const drops = () => [slalom({ costume: 'bumper-post', from: 0.45, to: 0.88, count: 3, loss: 0.2 })];

module.exports = track({
  slug: 'dodgem-derby',
  name: 'Dodgem Derby',
  family: 'arcade',
  difficulty: 'hard',
  description: 'A bumper-car world inside the machine: away from the bumper-car arena in a pack, along the arena road over a rail and through the posts, through the bump bends, round the arena sweep and along the arena lane, then the dodgem ring, a banked turn right round the arena, through the spin-out bends, along the crash lane and down the exit ramp to the finish.',
  surface: 'ice',
  biome: 'circuit-board',
  lighting: 'neon-night',
  billboardFrame: 'marquee',
  arcade: { art: 'dodgems', finish: 'DERBY CHAMP!' },
  signature: 'The dodgem ring',
  tvCameras: [
    // (Out of the ring, looking back at the field coming round it.)
    { section: 'Spin-out bends', at: 0.2, side: 'left', distance: 8, height: 8 },
  ],
  start: { landmark: 'bumper-arena', gate: 'paddle', shots: { countdown: 'low-front', launch: 'low-chase' } },
  finish: {},
  opening: opening('clear-start', { side: 'right' }),
  sections: [
    { name: 'Arena road', shape: straight(120, { grade: 0.12 }), billboards: 1, features: [rail({ at: 0.4, length: 12, line: 'right' })], obstacles: [slalom({ costume: 'bumper-post', from: 0.72, to: 0.98, count: 5, loss: 0.3 })] },
    { name: 'Bump bends', shape: sBends({ first: 'right', radius: 65, degrees: 65, grade: 0.12 }), billboards: 1, features: [boost({ at: 0.1, kick: 4 })], obstacles: [slalom({ costume: 'bumper-post', from: 0.3, to: 0.85, count: 3, loss: 0.25 })] },
    { name: 'Arena sweep', shape: sweep({ side: 'left', radius: 90, degrees: 130, grade: 0.12 }), billboards: 1, features: [boost({ at: 0.1, kick: 4 })], obstacles: pegs('right', 'left') },
    { name: 'Arena lane', shape: straight(45, { grade: 0.13 }), obstacles: [peg({ costume: 'bumper-post', at: 0.5, line: 'center' })] },
    { name: 'The dodgem ring', shape: sweep({ side: 'right', radius: 50, degrees: 200, grade: 0.14 }) },
    { name: 'Spin-out bends', shape: sBends({ first: 'left', radius: 65, degrees: 65, grade: 0.13 }), billboards: 1, obstacles: pegs('right', 'left') },
    { name: 'Crash lane', shape: straight(70, { grade: 0.13 }), obstacles: [slalom({ costume: 'bumper-post', from: 0.3, to: 0.9, count: 3, loss: 0.25 })] },
    { name: 'Down the exit ramp', shape: plunge(45, { grade: 0.26, from: 0.13 }), obstacles: drops() },
    { name: 'Down to the finish', shape: straight(80, { grade: 0.18 }), obstacles: [slalom({ costume: 'bumper-post', from: 0.3, to: 0.92, count: 5, loss: 0.3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
