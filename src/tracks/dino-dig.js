'use strict';

// Dino Dig (Moses, 26 Nov 2026: the Pinball pack towards 20, the second set): a fossil-dig pinball table. The gate
// stands by a huge dinosaur skeleton of our own in its dig pit, the diggers' tent beside it. Away on the clear start (the
// field let go in waves, gentle bends and nothing in the way for the first seconds), round the dig-site bend off a speed pad
// under hanging vines, along the dig-site path through the cairns, round the fern gully, the tar-pit bends off a second speed pad,
// down the dig trench, then the table's big feature: a banked spiral right round the skeleton's pit; round the
// valley, down the bone bank and the cairns on the run to the flippers.
const { track, opening, straight, sweep, sBends, plunge, spiral, runIn, curtain, peg, slalom, boost } = require('../trackKit');

const drops = () => [slalom({ costume: 'cairn', from: 0.5, to: 0.85, count: 2, loss: 0.15 })];
const pegs = (a, b) => [peg({ costume: 'cairn', at: 0.35, line: a }), peg({ costume: 'cairn', at: 0.7, line: b })];

module.exports = track({
  slug: 'dino-dig',
  name: 'Dino Dig',
  family: 'pinball',
  difficulty: 'hard',
  description: 'A fossil-dig pinball table: away from the gate in a pack, round the dig-site bend under hanging vines, along the path through the cairns, round the fern gully, through the tar pits and down the dig trench, then a banked spiral right round the skeleton\'s pit, round the valley and down the bone bank to the flippers.',
  surface: 'ice',
  biome: 'playfield',
  lighting: 'parlour',
  pinball: { art: 'dino', display: 'DIG IT!', finish: 'FOSSIL FINDER' },
  signature: 'Round the skeleton',
  tvCameras: [
    { section: 'Dig-site path', at: 0.7, side: 'left', distance: 9, height: 8 },
    // (Out of the spiral, looking back at the field coming off its last turn.)
    { section: 'Valley bend', at: 0.2, side: 'right', distance: 8, height: 8 },
  ],
  start: { landmark: 'fossil-skeleton', gate: 'barrier', shots: { countdown: 'side', launch: 'high-behind' } },
  finish: {},
  opening: opening('clear-start', { side: 'right' }),
  sections: [
    {
      name: 'Dig-site bend', shape: sweep({ side: 'left', radius: 90, degrees: 100, grade: 0.1 }), billboards: 1,
      features: [boost({ at: 0.1, kick: 4 })],
      obstacles: [curtain({ costume: 'vines', at: 0.4, side: 'left' }), peg({ costume: 'cairn', at: 0.8, line: 'center' })],
    },
    { name: 'Dig-site path', shape: straight(55, { grade: 0.12 }), obstacles: [slalom({ costume: 'cairn', from: 0.25, to: 0.92, count: 4, loss: 0.3 })] },
    { name: 'Fern gully', shape: sweep({ side: 'right', radius: 90, degrees: 110, grade: 0.1 }), obstacles: pegs('left', 'right') },
    {
      name: 'Tar-pit bends', shape: sBends({ first: 'left', radius: 65, degrees: 65, grade: 0.13 }), billboards: 1,
      features: [boost({ at: 0.08, kick: 4 })], obstacles: pegs('right', 'left'),
    },
    { name: 'Down the dig trench', shape: plunge(50, { grade: 0.36, from: 0.13 }), obstacles: drops() },
    { name: 'Run to the skeleton', shape: straight(40, { grade: 0.12 }), billboards: 1 },
    { name: 'Round the skeleton', shape: spiral({ side: 'right', radius: 48, turns: 1, grade: 0.15 }) },
    { name: 'Valley bend', shape: sweep({ side: 'left', radius: 90, degrees: 100, grade: 0.1 }), billboards: 1, obstacles: pegs('left', 'right') },
    { name: 'Down the bone bank', shape: plunge(45, { grade: 0.3, from: 0.1 }), obstacles: drops() },
    { name: 'Down to the flippers', shape: straight(60, { grade: 0.13 }), obstacles: [slalom({ costume: 'cairn', from: 0.3, to: 0.88, count: 4, loss: 0.3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
