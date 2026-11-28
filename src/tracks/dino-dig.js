'use strict';

// Dino Dig (Moses, 27 Nov 2026: the last eight tables of the Pinball pack, toward 20): a fossil-dig pinball table. The
// gate stands by a huge dinosaur skeleton of our own in its dig pit, the diggers' tent beside it. Away on the clear
// start (the field let go in waves, gentle bends and nothing in the way for the first seconds), along the dig-site road
// off a speed pad, the diggers' jeep parked far down it on the left (the table's first obstacle), the fern bends off a
// second speed pad through the cairns, round the tar-pit sweep, down the dig trench, through the bone yard, then the
// table's big feature: a banked spiral right round the skeleton's pit; the valley bends, down the bone bank and the
// cairns on the run to the flippers.
const { track, opening, straight, sweep, sBends, plunge, spiral, runIn, parked, peg, slalom, brake, boost } = require('../trackKit');

const pegs = (a, b) => [peg({ costume: 'cairn', at: 0.35, line: a }), peg({ costume: 'cairn', at: 0.7, line: b })];
const drops = () => [slalom({ costume: 'cairn', from: 0.45, to: 0.88, count: 3, loss: 0.2 })];

module.exports = track({
  slug: 'dino-dig',
  name: 'Dino Dig',
  family: 'pinball',
  difficulty: 'hard',
  description: 'A fossil-dig pinball table: away from the skeleton in a pack along the dig-site road past the diggers\' jeep, through the fern bends and the cairns, round the tar-pit sweep, down the dig trench and through the bone yard, then a banked spiral right round the skeleton\'s pit, the valley bends and down the bone bank to the flippers.',
  surface: 'ice',
  biome: 'playfield',
  lighting: 'parlour',
  pinball: { art: 'dino', display: 'DIG IT!', finish: 'FOSSIL FINDER' },
  signature: 'Round the skeleton',
  tvCameras: [
    // (Out of the spiral, looking back at the field coming off its last turn.)
    { section: 'Valley bends', at: 0.2, side: 'right', distance: 8, height: 8 },
  ],
  start: { landmark: 'fossil-skeleton', gate: 'stalls', shots: { countdown: 'side', launch: 'high-behind' } },
  finish: {},
  opening: opening('clear-start', { side: 'left' }),
  sections: [
    {
      name: 'Dig-site road', shape: straight(90, { grade: 0.12 }), billboards: 1,
      features: [boost({ at: 0.1, kick: 4 })],
      obstacles: [parked({ costume: 'safari-jeep', at: 0.7, side: 'left', length: 6 })],
    },
    {
      name: 'Fern bends', shape: sBends({ first: 'right', radius: 70, degrees: 60, grade: 0.12 }),
      features: [boost({ at: 0.08, kick: 4 })],
      obstacles: [peg({ costume: 'cairn', at: 0.18, line: 'center' }), slalom({ costume: 'cairn', from: 0.32, to: 0.92, count: 5, loss: 0.3 })],
    },
    { name: 'Tar-pit sweep', shape: sweep({ side: 'left', radius: 90, degrees: 100, grade: 0.12 }), billboards: 1, obstacles: pegs('right', 'left') },
    { name: 'Down the dig trench', shape: plunge(50, { grade: 0.34, from: 0.12 }), obstacles: drops() },
    { name: 'Bone yard', shape: straight(50, { grade: 0.12 }), billboards: 1, features: [brake({ at: 0.1, length: 12, drag: 0.02 })], obstacles: [slalom({ costume: 'cairn', from: 0.4, to: 0.9, count: 3, loss: 0.25 })] },
    { name: 'Round the skeleton', shape: spiral({ side: 'right', radius: 48, turns: 1, grade: 0.16 }) },
    { name: 'Valley bends', shape: sBends({ first: 'left', radius: 65, degrees: 65, grade: 0.12 }), billboards: 1, obstacles: pegs('left', 'right') },
    { name: 'Down the bone bank', shape: plunge(45, { grade: 0.3, from: 0.12 }), obstacles: drops() },
    { name: 'Down to the flippers', shape: straight(65, { grade: 0.2 }), obstacles: [slalom({ costume: 'cairn', from: 0.3, to: 0.92, count: 5, loss: 0.3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
