'use strict';

// Pharaoh's Tomb (Moses, 28 Nov 2026: the last of the Pinball pack's twenty paid tables): a desert-tomb pinball table
// at dusk. The gate stands by a pyramid of our own with its golden cap, a lion-bodied guardian, an obelisk and palms.
// Away on the clear start (the field let go in waves, gentle bends and nothing in the way for the first seconds), along
// the desert road off a speed pad, under the battle banners far down it on the right (the table's first obstacle); the
// oasis bends through the broken pillars, round the dune sweep, down the dune, into the tomb past a resting camel, then
// the table's big feature: the sand falls, a steep plunge through a curtain of falling sand; through the hall of
// pillars, the scarab bends off a second speed pad, round the valley of the kings and the broken pillars on the run to
// the flippers.
const { track, opening, straight, sweep, sBends, plunge, waterfall, runIn, parked, curtain, peg, slalom, boost } = require('../trackKit');

const pegs = (a, b) => [peg({ costume: 'broken-pillar', at: 0.35, line: a }), peg({ costume: 'broken-pillar', at: 0.7, line: b })];
const drops = () => [slalom({ costume: 'broken-pillar', from: 0.45, to: 0.88, count: 3, loss: 0.2 })];

module.exports = track({
  slug: 'pharaohs-tomb',
  name: 'Pharaoh\'s Tomb',
  family: 'pinball',
  difficulty: 'extreme',
  description: 'A desert-tomb pinball table at dusk: away from the pyramid in a pack along the desert road under the battle banners, through the oasis bends and the broken pillars, round the dune sweep, down the dune and into the tomb past a resting camel, then the sand falls, a steep plunge through a curtain of falling sand, through the hall of pillars, the scarab bends and round the valley of the kings to the flippers.',
  surface: 'ice',
  biome: 'playfield',
  lighting: 'parlour',
  pinball: { art: 'tomb', display: 'CURSE!', finish: 'PHARAOH' },
  signature: 'The sand falls',
  tvCameras: [
    // (At the foot of the sand falls, looking back up at the field pouring through the curtain.)
    { section: 'Hall of pillars', at: 0.3, side: 'right', distance: 8, height: 7 },
  ],
  start: { landmark: 'desert-pyramid', gate: 'trapdoor', shots: { countdown: 'above', launch: 'side' } },
  finish: {},
  opening: opening('clear-start', { side: 'left' }),
  sections: [
    {
      name: 'Desert road', shape: straight(100, { grade: 0.12 }), billboards: 1,
      features: [boost({ at: 0.1, kick: 4 })],
      obstacles: [curtain({ costume: 'battle-banners', at: 0.7, side: 'right' })],
    },
    {
      name: 'Oasis bends', shape: sBends({ first: 'left', radius: 70, degrees: 60, grade: 0.12 }),
      obstacles: [slalom({ costume: 'broken-pillar', from: 0.2, to: 0.55, count: 3, loss: 0.15 })],
    },
    { name: 'Dune sweep', shape: sweep({ side: 'left', radius: 90, degrees: 90, grade: 0.13 }), billboards: 1, obstacles: pegs('right', 'left') },
    { name: 'Down the dune', shape: plunge(50, { grade: 0.32, from: 0.12 }), obstacles: drops() },
    { name: 'Into the tomb', shape: straight(40, { grade: 0.12 }), billboards: 1, obstacles: [parked({ costume: 'camel', at: 0.5, side: 'left', length: 6 })] },
    { name: 'The sand falls', shape: waterfall(45, { grade: 0.4, curtain: true }) },
    { name: 'Hall of pillars', shape: straight(75, { grade: 0.12 }), obstacles: pegs('center', 'left') },
    { name: 'Scarab bends', shape: sBends({ first: 'left', radius: 65, degrees: 65, grade: 0.13 }), billboards: 1, features: [boost({ at: 0.1, kick: 4 })], obstacles: pegs('right', 'left') },
    { name: 'Valley of the kings', shape: sweep({ side: 'right', radius: 90, degrees: 115, grade: 0.13 }), billboards: 1, obstacles: pegs('left', 'right') },
    { name: 'Down to the flippers', shape: straight(65, { grade: 0.2 }), obstacles: [slalom({ costume: 'broken-pillar', from: 0.3, to: 0.92, count: 5, loss: 0.3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
