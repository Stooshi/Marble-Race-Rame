'use strict';

// Volcano Island (Moses, 27 Nov 2026: the last eight tables of the Pinball pack, toward 20): a tropical volcano
// pinball table. The gate stands under an erupting volcano of our own, lava running down its slopes, a tiki totem at
// its foot. Away on the clear start (the field let go in waves, gentle bends and nothing in the way for the first
// seconds), along the lava field off a speed pad, a lava rock far down it on the left (the table's first obstacle),
// down the crater wall, round the ash slope through the lava pillars, the tiki bends off a second speed pad, down into the
// jungle, then the table's big feature: the lava jump, a boost-pad jump over a lava gap; the fire hairpin, round the
// cone and the lava pillars on the run to the flippers.
const { track, opening, straight, sweep, sBends, plunge, hairpin, spiral, runIn, block, slalom, boost, boostJump } = require('../trackKit');

const drops = () => [slalom({ costume: 'magma-pillar', from: 0.5, to: 0.85, count: 2, loss: 0.15 })];

module.exports = track({
  slug: 'volcano-island',
  name: 'Volcano Island',
  family: 'pinball',
  difficulty: 'hard',
  description: 'A tropical volcano pinball table: away from the gate in a pack along the lava field, down the crater wall, round the ash slope through the lava pillars, through the tiki bends, then the lava jump over a lava gap, the fire hairpin, down into the jungle and round the cone to the flippers.',
  surface: 'ice',
  biome: 'playfield',
  lighting: 'parlour',
  pinball: { art: 'volcano', display: 'ERUPTION!', finish: 'FIRE KING' },
  signature: 'The lava jump',
  tvCameras: [
    { section: 'Ash slope', at: 0.5, side: 'left', distance: 9, height: 8 },
    // (Past the landing deck, looking back at the field flying the lava gap.)
    { section: 'Round the cone', at: 0.5, side: 'right', distance: 7, height: 5 },
  ],
  start: { landmark: 'erupting-volcano', gate: 'paddle', shots: { countdown: 'low-front', launch: 'look-back' } },
  finish: {},
  opening: opening('clear-start', { side: 'left' }),
  sections: [
    {
      name: 'Lava field', shape: straight(85, { grade: 0.12 }), billboards: 1,
      features: [boost({ at: 0.1, kick: 4 })],
      obstacles: [block({ costume: 'mossy-boulder', at: 0.85, line: 'left', loss: 0.15 })],
    },
    { name: 'Down the crater wall', shape: plunge(50, { grade: 0.34, from: 0.12 }), obstacles: drops() },
    { name: 'Ash slope', shape: sweep({ side: 'left', radius: 90, degrees: 100, grade: 0.1 }), billboards: 1, obstacles: [slalom({ costume: 'magma-pillar', from: 0.3, to: 0.7, count: 3, loss: 0.2 })] },
    {
      name: 'Tiki bends', shape: sBends({ first: 'right', radius: 65, degrees: 65, grade: 0.12 }), billboards: 1,
      features: [boost({ at: 0.1, kick: 4 })], obstacles: [slalom({ costume: 'magma-pillar', from: 0.35, to: 0.75, count: 3, loss: 0.25 })],
    },
    { name: 'Into the jungle', shape: plunge(45, { grade: 0.3, from: 0.12 }), obstacles: drops() },
    { name: 'The lava jump', shape: straight(235, { grade: 0.1 }), billboards: 1, features: [boostJump({ at: 0.17, look: 'river-jump' })], obstacles: [slalom({ costume: 'magma-pillar', from: 0.82, to: 0.95, count: 2, loss: 0.25 })] },
    { name: 'Fire hairpin', shape: hairpin({ side: 'left' }) },
    { name: 'Round the cone', shape: spiral({ side: 'right', radius: 48, turns: 1, grade: 0.14 }) },
    { name: 'Down to the flippers', shape: straight(60, { grade: 0.13 }), obstacles: [slalom({ costume: 'magma-pillar', from: 0.3, to: 0.88, count: 4, loss: 0.3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
