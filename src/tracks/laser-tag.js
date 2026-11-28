'use strict';

// Laser Tag (Moses, 28 Nov 2026: the Arcade pack towards 20): a laser-tag world inside the machine. The gate stands
// by a laser-tag fort of our own, stacked blocks with lookout towers either side and beams criss-crossing it. Away on
// the clear start (the field let go in waves, gentle bends and nothing in the way for the first seconds), up the
// ramp, round the fort sweep past a laser pylon far down it (the track's first obstacle), along the laser lane
// through the pylons, the base bends off a speed pad, then the track's big feature: the drop zone, three steep drops one after another
// through the laser pylons; along the bunker lane off a second speed pad, round the respawn sweep, the tag bends and
// the pylons on the run to the finish.
const { track, opening, straight, sweep, sBends, plunge, climb, runIn, peg, slalom, boost } = require('../trackKit');

const pegs = (a, b) => [peg({ costume: 'laser-pylon', at: 0.35, line: a }), peg({ costume: 'laser-pylon', at: 0.7, line: b })];
const drops = () => [slalom({ costume: 'laser-pylon', from: 0.45, to: 0.88, count: 3, loss: 0.2 })];

module.exports = track({
  slug: 'laser-tag',
  name: 'Laser Tag',
  family: 'arcade',
  difficulty: 'extreme',
  description: 'A laser-tag world inside the machine: away from the laser-tag fort in a pack, up the ramp, round the fort sweep past a laser pylon, along the laser lane through the pylons, through the base bends, then the drop zone, three steep drops one after another through the laser pylons, along the bunker lane, round the respawn sweep and through the tag bends to the finish.',
  surface: 'ice',
  biome: 'blacklight-carpet',
  lighting: 'neon-night',
  billboardFrame: 'marquee',
  arcade: { art: 'laser', finish: 'TAGGED OUT!' },
  signature: 'The drop zone',
  tvCameras: [
    // (At the foot of the third drop, looking back up the drop zone.)
    { section: 'Bunker lane', at: 0.3, side: 'left', distance: 8, height: 7 },
  ],
  start: { landmark: 'laser-fort', gate: 'barrier', shots: { countdown: 'side', launch: 'look-back' } },
  finish: {},
  opening: opening('clear-start', { side: 'left' }),
  sections: [
    { name: 'Up the ramp', shape: climb(40, { grade: -0.06, after: 0.12 }), billboards: 1 },
    { name: 'Fort sweep', shape: sweep({ side: 'left', radius: 110, degrees: 60, grade: 0.12 }), obstacles: [peg({ costume: 'laser-pylon', at: 0.7, line: 'right' })] },
    { name: 'Laser lane', shape: straight(70, { grade: 0.12 }), obstacles: [slalom({ costume: 'laser-pylon', from: 0.2, to: 0.92, count: 5, loss: 0.3 })] },
    { name: 'Base bends', shape: sBends({ first: 'right', radius: 65, degrees: 65, grade: 0.12 }), billboards: 1, features: [boost({ at: 0.1, kick: 4 })], obstacles: [slalom({ costume: 'laser-pylon', from: 0.3, to: 0.85, count: 3, loss: 0.25 })] },
    { name: 'The drop zone', shape: plunge(45, { grade: 0.32, from: 0.12 }), billboards: 1, obstacles: drops() },
    { name: 'Between the drops', shape: straight(25, { grade: 0.14 }) },
    { name: 'Second drop', shape: plunge(45, { grade: 0.32, from: 0.14 }), obstacles: drops() },
    { name: 'Before the last', shape: straight(25, { grade: 0.14 }) },
    { name: 'Third drop', shape: plunge(45, { grade: 0.3, from: 0.14 }), obstacles: drops() },
    { name: 'Bunker lane', shape: straight(70, { grade: 0.15 }), features: [boost({ at: 0.3, kick: 4 })], obstacles: pegs('center', 'left') },
    { name: 'Respawn sweep', shape: sweep({ side: 'left', radius: 90, degrees: 130, grade: 0.13 }), billboards: 1, obstacles: pegs('right', 'left') },
    { name: 'Tag bends', shape: sBends({ first: 'right', radius: 70, degrees: 55, grade: 0.13 }), obstacles: pegs('left', 'right') },
    { name: 'Down to the finish', shape: straight(70, { grade: 0.2 }), obstacles: [slalom({ costume: 'laser-pylon', from: 0.3, to: 0.92, count: 5, loss: 0.3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
