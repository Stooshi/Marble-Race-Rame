'use strict';

// Volcano Island (Moses, 27 Nov 2026: the last eight tables of the Pinball pack, toward 20): a tropical volcano
// pinball table. The gate stands under an erupting volcano of our own, lava running down its slopes, a tiki totem at
// its foot. Away on the clear start (the field let go in waves, gentle bends and nothing in the way for the first
// seconds), along the lava field off a speed pad, a lava rock far down it on the left (the table's first obstacle),
// across the ash flats off a second speed pad through the lava pillars, round the ash slope, down the crater wall, the
// tiki bends, down into the jungle, then the table's big feature: the lava jump, a boost-pad jump over a lava gap; the
// fire hairpin, round the lagoon and the lava pillars on the run to the flippers.
const { track, opening, straight, sweep, sBends, plunge, hairpin, runIn, block, peg, slalom, boost, boostJump } = require('../trackKit');

const pegs = (a, b) => [peg({ costume: 'magma-pillar', at: 0.35, line: a }), peg({ costume: 'magma-pillar', at: 0.7, line: b })];
const drops = () => [slalom({ costume: 'magma-pillar', from: 0.5, to: 0.85, count: 2, loss: 0.15 })];

module.exports = track({
  slug: 'volcano-island',
  name: 'Volcano Island',
  family: 'pinball',
  difficulty: 'hard',
  description: 'A tropical volcano pinball table: away from the gate in a pack along the lava field, across the ash flats through the lava pillars, round the ash slope, down the crater wall, through the tiki bends and down into the jungle, then the lava jump over a lava gap, the fire hairpin and round the lagoon to the flippers.',
  surface: 'ice',
  biome: 'playfield',
  lighting: 'parlour',
  pinball: { art: 'volcano', display: 'ERUPTION!', finish: 'FIRE KING' },
  signature: 'The lava jump',
  tvCameras: [
    // (Round the lagoon, looking back at the field out of the fire hairpin; a camera on the jump straight looking back
    // drew the whole table on a computer.)
    { section: 'Lagoon sweep', at: 0.4, side: 'right', distance: 9, height: 8 },
  ],
  start: { landmark: 'erupting-volcano', gate: 'paddle', shots: { countdown: 'low-front', launch: 'look-back' } },
  finish: {},
  opening: opening('clear-start', { side: 'left' }),
  sections: [
    {
      name: 'Lava field', shape: straight(90, { grade: 0.12 }), billboards: 1,
      features: [boost({ at: 0.1, kick: 4 })],
      obstacles: [block({ costume: 'mossy-boulder', at: 0.7, line: 'left', loss: 0.15 })],
    },
    {
      name: 'Ash flats', shape: straight(55, { grade: 0.12 }),
      features: [boost({ at: 0.08, kick: 4 })], obstacles: [slalom({ costume: 'magma-pillar', from: 0.25, to: 0.92, count: 5, loss: 0.3 })],
    },
    { name: 'Ash slope', shape: sweep({ side: 'left', radius: 90, degrees: 100, grade: 0.12 }), billboards: 1, obstacles: pegs('right', 'left') },
    { name: 'Down the crater wall', shape: plunge(50, { grade: 0.34, from: 0.12 }), obstacles: drops() },
    { name: 'Tiki bends', shape: sBends({ first: 'right', radius: 65, degrees: 65, grade: 0.12 }), billboards: 1, obstacles: pegs('left', 'right') },
    { name: 'Into the jungle', shape: plunge(45, { grade: 0.3, from: 0.12 }), obstacles: drops() },
    { name: 'The lava jump', shape: straight(200, { grade: 0.1 }), billboards: 1, features: [boostJump({ at: 0.19, look: 'river-jump' })], obstacles: [slalom({ costume: 'magma-pillar', from: 0.8, to: 0.95, count: 2, loss: 0.25 })] },
    { name: 'Fire hairpin', shape: hairpin({ side: 'left' }) },
    { name: 'Lagoon sweep', shape: sweep({ side: 'right', radius: 90, degrees: 100, grade: 0.13 }), obstacles: pegs('left', 'right') },
    { name: 'Down to the flippers', shape: straight(65, { grade: 0.2 }), obstacles: [slalom({ costume: 'magma-pillar', from: 0.3, to: 0.92, count: 5, loss: 0.3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
