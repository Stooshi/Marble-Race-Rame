'use strict';

// Safari Stampede (Moses, 27 Nov 2026: the last eight tables of the Pinball pack, toward 20): a savanna pinball table
// at sunset. The gate stands by a flat-topped acacia, a lookout tower on stilts and a safari tent of our own. Away on
// the clear start (the field let go in waves, gentle bends and nothing in the way for the first seconds), along the
// savanna track, a hippo swinging its head in far down it (the table's first obstacle), then through the river stakes;
// round the acacia sweep off a speed pad, down to the river, then the table's big feature: the watering-hole jump, a
// boost-pad jump over the water; the lion's hairpin, round the stampede sweep, down the gorge, the baobab loop (a
// full loop), the sunset bends off a second speed pad and the river stakes on the run to the flippers.
const { track, opening, straight, sweep, sBends, plunge, hairpin, loop, runIn, swipe, peg, slalom, brake, boost, boostJump } = require('../trackKit');

const pegs = (a, b) => [peg({ costume: 'river-stake', at: 0.35, line: a }), peg({ costume: 'river-stake', at: 0.7, line: b })];
const drops = () => [slalom({ costume: 'river-stake', from: 0.45, to: 0.88, count: 3, loss: 0.2 })];

module.exports = track({
  slug: 'safari-stampede',
  name: 'Safari Stampede',
  family: 'pinball',
  difficulty: 'extreme',
  description: 'A savanna pinball table at sunset: away from the lookout in a pack along the savanna track past a hippo and through the river stakes, round the acacia sweep and down to the river, then the watering-hole jump, a boost-pad jump over the water, the lion\'s hairpin, round the stampede sweep, down the gorge, the baobab loop, a full loop, and through the sunset bends to the flippers.',
  surface: 'ice',
  biome: 'playfield',
  lighting: 'parlour',
  pinball: { art: 'safari', display: 'STAMPEDE!', finish: 'PLAINS KING' },
  signature: 'The watering-hole jump',
  tvCameras: [
    // (Through the sunset bends, looking back at the field out of the baobab loop: cameras early on a table, looking
    // back, draw the whole table on a computer.)
    { section: 'Sunset bends', at: 0.5, side: 'right', distance: 9, height: 8 },
  ],
  start: { landmark: 'safari-lookout', gate: 'barrier', shots: { countdown: 'chase', launch: 'look-back' } },
  finish: {},
  opening: opening('clear-start', { side: 'right' }),
  sections: [
    {
      name: 'Savanna track', shape: straight(110, { grade: 0.12 }), billboards: 1,
      obstacles: [swipe({ costume: 'hippo', at: 0.5, side: 'right' }), slalom({ costume: 'river-stake', from: 0.72, to: 0.97, count: 5, loss: 0.25 })],
    },
    { name: 'Acacia sweep', shape: sweep({ side: 'right', radius: 90, degrees: 80, grade: 0.13 }), billboards: 1, features: [boost({ at: 0.1, kick: 4 })], obstacles: pegs('left', 'right') },
    { name: 'Down to the river', shape: plunge(50, { grade: 0.32, from: 0.12 }), obstacles: drops() },
    { name: 'The watering-hole jump', shape: straight(200, { grade: 0.1 }), billboards: 1, features: [boostJump({ at: 0.19, look: 'river-jump' })] },
    { name: 'Lion\'s hairpin', shape: hairpin({ side: 'right' }) },
    { name: 'Stampede sweep', shape: sweep({ side: 'left', radius: 90, degrees: 80, grade: 0.13 }), billboards: 1, obstacles: pegs('right', 'left') },
    { name: 'Down the gorge', shape: plunge(45, { grade: 0.3, from: 0.12 }), obstacles: drops() },
    {
      name: 'The baobab loop', shape: straight(170, { grade: 0.11 }),
      features: [brake({ at: 0.08, length: 12, drag: 0.02 }), loop({ at: 0.4, viewSide: 10 })],
    },
    { name: 'Sunset bends', shape: sBends({ first: 'right', radius: 65, degrees: 65, grade: 0.13 }), billboards: 1, features: [boost({ at: 0.1, kick: 4 })], obstacles: pegs('left', 'right') },
    { name: 'Down to the flippers', shape: straight(55, { grade: 0.2 }), obstacles: [slalom({ costume: 'river-stake', from: 0.3, to: 0.92, count: 5, loss: 0.3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
