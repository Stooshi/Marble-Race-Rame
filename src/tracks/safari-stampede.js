'use strict';

// Safari Stampede (Moses, 27 Nov 2026: the last eight tables of the Pinball pack, toward 20): a savanna pinball table
// at sunset. The gate stands by a flat-topped acacia, a lookout tower on stilts and a safari tent of our own. Away on
// the clear start (the field let go in waves, gentle bends and nothing in the way for the first seconds), along the
// savanna track off a speed pad, a pile-up of termite mounds far down it (the table's first obstacle), round the acacia
// sweep off a second speed pad through the river stakes, down to the river, round the herd bend, then the table's big
// feature: the watering-hole jump, a boost-pad jump over the water; the lion's hairpin, the stampede bends, down the
// gorge and the river stakes on the run to the flippers.
const { track, opening, straight, sweep, sBends, plunge, hairpin, runIn, pileUp, peg, slalom, boost, boostJump } = require('../trackKit');

const pegs = (a, b) => [peg({ costume: 'river-stake', at: 0.35, line: a }), peg({ costume: 'river-stake', at: 0.7, line: b })];
const drops = () => [slalom({ costume: 'river-stake', from: 0.5, to: 0.85, count: 2, loss: 0.15 })];

module.exports = track({
  slug: 'safari-stampede',
  name: 'Safari Stampede',
  family: 'pinball',
  difficulty: 'hard',
  description: 'A savanna pinball table at sunset: away from the lookout in a pack along the savanna track past a pile-up of termite mounds, round the acacia sweep through the river stakes, down to the river and round the herd bend, then the watering-hole jump, a boost-pad jump over the water, the lion\'s hairpin, the stampede bends and down the gorge to the flippers.',
  surface: 'ice',
  biome: 'playfield',
  lighting: 'parlour',
  pinball: { art: 'safari', display: 'STAMPEDE!', finish: 'PLAINS KING' },
  signature: 'The watering-hole jump',
  tvCameras: [
    { section: 'Stampede bends', at: 0.5, side: 'left', distance: 9, height: 8 },
  ],
  start: { landmark: 'safari-lookout', gate: 'barrier', shots: { countdown: 'chase', launch: 'look-back' } },
  finish: {},
  opening: opening('clear-start', { side: 'right' }),
  sections: [
    {
      name: 'Savanna track', shape: straight(90, { grade: 0.12 }), billboards: 1,
      features: [boost({ at: 0.1, kick: 4 })],
      obstacles: [pileUp({ costume: 'termite-mound', at: 0.6 })],
    },
    {
      name: 'Acacia sweep', shape: sweep({ side: 'right', radius: 90, degrees: 100, grade: 0.12 }), billboards: 1,
      features: [boost({ at: 0.1, kick: 4 })], obstacles: [slalom({ costume: 'river-stake', from: 0.25, to: 0.92, count: 5, loss: 0.3 })],
    },
    { name: 'Down to the river', shape: plunge(50, { grade: 0.32, from: 0.12 }), obstacles: drops() },
    { name: 'Herd bend', shape: sweep({ side: 'left', radius: 90, degrees: 110, grade: 0.12 }), billboards: 1, obstacles: pegs('left', 'right') },
    {
      name: 'The watering-hole jump', shape: straight(200, { grade: 0.1 }), billboards: 1,
      features: [boostJump({ at: 0.19, look: 'river-jump' })], obstacles: [slalom({ costume: 'river-stake', from: 0.8, to: 0.95, count: 2, loss: 0.25 })],
    },
    { name: 'Lion\'s hairpin', shape: hairpin({ side: 'right' }) },
    { name: 'Stampede bends', shape: sBends({ first: 'left', radius: 65, degrees: 65, grade: 0.12 }), billboards: 1, obstacles: pegs('right', 'left') },
    { name: 'Down the gorge', shape: plunge(45, { grade: 0.3, from: 0.12 }), obstacles: drops() },
    { name: 'Down to the flippers', shape: straight(65, { grade: 0.2 }), obstacles: [slalom({ costume: 'river-stake', from: 0.3, to: 0.92, count: 5, loss: 0.3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
