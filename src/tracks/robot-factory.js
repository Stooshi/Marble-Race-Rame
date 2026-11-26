'use strict';

// Robot Factory (Moses, 26 Nov 2026: the Pinball pack towards 20, the second set): an assembly-line pinball table. The
// gate stands under a giant jointed robot arm of our own over a conveyor of crates. Away on the clear start (the field
// let go in waves, gentle bends and nothing in the way for the first seconds), down the loading ramp through a spinner,
// along the conveyor belt off a speed pad through the bollards, round the loading bay, the welding bay off a second speed pad, the hairpin round the press's swinging crane, out of the press and round the paint shop, then the table's big
// feature: the sorting gate, a splitter parting the field in two; the quality check's bollards on the run to the
// flippers.
const { track, opening, straight, sweep, sBends, plunge, hairpin, splitter, runIn, curtain, peg, slalom, swipe, boost } = require('../trackKit');

const drops = () => [slalom({ costume: 'bollard', from: 0.5, to: 0.85, count: 2, loss: 0.15 })];

module.exports = track({
  slug: 'robot-factory',
  name: 'Robot Factory',
  family: 'pinball',
  difficulty: 'extreme',
  description: 'An assembly-line pinball table: away from the gate in a pack, down the loading ramp, along the conveyor belt through the bollards, round the loading bay and through the welding bay, round the press, then the sorting gate, a splitter parting the field in two, and the quality check to the flippers.',
  surface: 'ice',
  biome: 'playfield',
  lighting: 'parlour',
  pinball: { art: 'factory', display: 'POWER ON!', finish: 'MADE TO WIN' },
  signature: 'The sorting gate',
  tvCameras: [
    { section: 'Welding bay', at: 0.4, side: 'left', distance: 8, height: 8 },
    // (On the run to the split, looking back at the field coming round the paint shop.)
    { section: 'Run to the sorting gate', at: 0.6, side: 'left', distance: 8, height: 8 },
  ],
  start: { landmark: 'assembly-robot', gate: 'paddle', shots: { countdown: 'crane', launch: 'low-chase' } },
  finish: {},
  opening: opening('clear-start', { side: 'right' }),
  sections: [
    {
      name: 'Down the loading ramp', shape: plunge(50, { grade: 0.3, from: 0.12 }),
      obstacles: [curtain({ costume: 'spinner', at: 0.25, side: 'left' }), slalom({ costume: 'bollard', from: 0.5, to: 0.85, count: 2, loss: 0.15 })],
    },
    {
      name: 'Conveyor belt', shape: straight(55, { grade: 0.12 }), billboards: 1,
      features: [boost({ at: 0.08, kick: 4 })],
      obstacles: [slalom({ costume: 'bollard', from: 0.35, to: 0.92, count: 4, loss: 0.3 })],
    },
    {
      name: 'Loading bay', shape: sweep({ side: 'left', radius: 90, degrees: 100, grade: 0.1 }),
      obstacles: [peg({ costume: 'bollard', at: 0.35, line: 'left' }), peg({ costume: 'bollard', at: 0.7, line: 'right' })],
    },
    {
      name: 'Welding bay', shape: sBends({ first: 'right', radius: 65, degrees: 65, grade: 0.13 }), billboards: 1,
      features: [boost({ at: 0.08, kick: 4 })],
      obstacles: [peg({ costume: 'bollard', at: 0.4, line: 'right' }), peg({ costume: 'bollard', at: 0.75, line: 'left' })],
    },
    { name: 'Run to the press', shape: straight(40, { grade: 0.12 }) },
    { name: 'Press hairpin', shape: hairpin({ side: 'left' }), obstacles: [swipe({ costume: 'block-crane', side: 'high' })] },
    { name: 'Out of the press', shape: plunge(50, { grade: 0.36, from: 0.16 }), billboards: 1, obstacles: drops() },
    { name: 'Paint shop', shape: sweep({ side: 'right', radius: 90, degrees: 110, grade: 0.1 }), billboards: 1 },
    { name: 'Run to the sorting gate', shape: straight(30, { grade: 0.12 }), obstacles: [peg({ costume: 'bollard', at: 0.4, line: 'center' })] },
    { name: 'The sorting gate', shape: splitter({ side: 'right', balance: { tipOffset: -2.0, left: { drag: 0.42, scrub: 0.72 }, right: { drag: 2.4, scrub: 2.4 } } }) },
    { name: 'Quality check', shape: straight(42, { grade: 0.14 }), obstacles: [slalom({ costume: 'bollard', from: 0.4, to: 0.88, count: 4, loss: 0.3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
