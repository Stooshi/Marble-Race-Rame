'use strict';

// Pinata Party (Moses, 28 Nov 2026: the Arcade pack towards 20): a party-game world inside the machine. The gate
// stands by a giant star-shaped pinata of our own on its rope, streamers hanging from it and sweets spilt under it.
// Away on the clear start (the field let go in waves, gentle bends and nothing in the way for the first seconds),
// through the party bends, along the party road over a rail (the track's first obstacle) and through the posts, the
// streamer bends, along the party lane off a speed pad, then the track's first big feature: the sweet shower, a steep
// plunge through a curtain of falling sweets; along the sugar lane off a second speed pad, the second: the pinata
// swing, a half-pipe rocking the field from wall to wall; round the candy sweep, down the last ramp and the posts on
// the run to the finish.
const { track, opening, straight, sweep, sBends, plunge, waterfall, halfPipe, runIn, rail, peg, slalom, boost } = require('../trackKit');

const pegs = (a, b) => [peg({ costume: 'bumper-post', at: 0.35, line: a }), peg({ costume: 'bumper-post', at: 0.7, line: b })];
const drops = () => [slalom({ costume: 'bumper-post', from: 0.45, to: 0.88, count: 3, loss: 0.2 })];

module.exports = track({
  slug: 'pinata-party',
  name: 'Pinata Party',
  family: 'arcade',
  difficulty: 'extreme',
  description: 'A party-game world inside the machine: away from the giant pinata in a pack, through the party bends, along the party road over a rail and through the posts, through the streamer bends and along the party lane, then the sweet shower, a steep plunge through a curtain of falling sweets, the pinata swing, a half-pipe rocking the field from wall to wall, round the candy sweep and down the last ramp to the finish.',
  surface: 'ice',
  biome: 'blacklight-carpet',
  lighting: 'synthwave',
  billboardFrame: 'marquee',
  arcade: { art: 'fiesta', finish: 'PARTY TIME!' },
  signature: 'The pinata swing',
  tvCameras: [
    // (At the end of the half-pipe, looking back at the field swinging wall to wall.)
    { section: 'The pinata swing', at: 0.75, side: 'left', distance: 6, height: 5 },
  ],
  start: { landmark: 'giant-pinata', gate: 'trapdoor', shots: { countdown: 'chase', launch: 'side' } },
  finish: {},
  opening: opening('clear-start', { side: 'left' }),
  sections: [
    { name: 'Party bends', shape: sBends({ first: 'right', radius: 80, degrees: 55, grade: 0.12 }), billboards: 1 },
    { name: 'Party road', shape: straight(90, { grade: 0.12 }), features: [rail({ at: 0.35, length: 12, line: 'right' })], obstacles: [slalom({ costume: 'bumper-post', from: 0.72, to: 0.98, count: 5, loss: 0.3 })] },
    { name: 'Streamer bends', shape: sBends({ first: 'left', radius: 65, degrees: 65, grade: 0.12 }), billboards: 1, obstacles: [slalom({ costume: 'bumper-post', from: 0.3, to: 0.85, count: 3, loss: 0.25 })] },
    { name: 'Party lane', shape: straight(60, { grade: 0.12 }), billboards: 1, features: [boost({ at: 0.15, kick: 4 })], obstacles: pegs('center', 'left') },
    { name: 'The sweet shower', shape: waterfall(45, { grade: 0.4, curtain: true }) },
    { name: 'Sugar lane', shape: straight(50, { grade: 0.12 }), features: [boost({ at: 0.15, kick: 4 })], obstacles: pegs('right', 'center') },
    { name: 'The pinata swing', shape: halfPipe({ first: 'right', width: 8, swings: 4, radius: 150, degrees: 15, grade: 0.13 }) },
    { name: 'Candy sweep', shape: sweep({ side: 'left', radius: 90, degrees: 120, grade: 0.13 }), billboards: 1, obstacles: pegs('right', 'left') },
    { name: 'Down the last ramp', shape: plunge(45, { grade: 0.26, from: 0.13 }), obstacles: drops() },
    { name: 'Down to the finish', shape: straight(70, { grade: 0.2 }), obstacles: [slalom({ costume: 'bumper-post', from: 0.3, to: 0.92, count: 5, loss: 0.3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
