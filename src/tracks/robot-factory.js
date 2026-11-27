'use strict';

// Robot Factory (Moses, 27 Nov 2026: the last eight tables of the Pinball pack, toward 20): a robot-factory pinball
// table. The gate stands under a giant jointed robot arm over its conveyor and crates. Away on the clear start (the
// field let go in waves, gentle bends and nothing in the way for the first seconds), down the assembly line off a
// speed pad, an oil drum far down it on the right (the table's first obstacle), the welding bends off a second speed
// pad through the bollards, round the paint shop, then the table's big feature: the sorting gate, the field split
// either side of a sorting machine and merged again; down the chute, round the packing spiral, down to dispatch and the
// bollards on the run to the flippers.
const { track, opening, straight, sweep, sBends, plunge, spiral, splitter, runIn, block, peg, slalom, boost } = require('../trackKit');

const drops = () => [slalom({ costume: 'bollard', from: 0.5, to: 0.85, count: 2, loss: 0.15 })];

module.exports = track({
  slug: 'robot-factory',
  name: 'Robot Factory',
  family: 'pinball',
  difficulty: 'extreme',
  description: 'A robot-factory pinball table: away from the robot arm in a pack down the assembly line, through the welding bends and round the paint shop, then the sorting gate, the field split either side of a sorting machine, down the chute, round the packing spiral and down to dispatch to the flippers.',
  surface: 'ice',
  biome: 'playfield',
  lighting: 'parlour',
  pinball: { art: 'factory', display: 'POWER ON!', finish: 'MADE TO WIN' },
  signature: 'The sorting gate',
  tvCameras: [
    { section: 'Welding bends', at: 0.5, side: 'left', distance: 9, height: 8 },
    // (Just past the merge, looking back at the field coming out either side of the sorting machine.)
    { section: 'Down the chute', at: 0.12, side: 'right', distance: 8, height: 8 },
  ],
  start: { landmark: 'assembly-robot', gate: 'trapdoor', shots: { countdown: 'low-front', launch: 'overhead' } },
  finish: {},
  opening: opening('clear-start', { side: 'right' }),
  sections: [
    {
      name: 'Assembly line', shape: straight(85, { grade: 0.12 }), billboards: 1,
      features: [boost({ at: 0.1, kick: 4 })],
      obstacles: [block({ costume: 'oil-drum', at: 0.85, line: 'right', loss: 0.15 })],
    },
    {
      name: 'Welding bends', shape: sBends({ first: 'left', radius: 65, degrees: 65, grade: 0.12 }), billboards: 1,
      features: [boost({ at: 0.1, kick: 4 })], obstacles: [slalom({ costume: 'bollard', from: 0.35, to: 0.75, count: 3, loss: 0.25 })],
    },
    { name: 'Paint shop', shape: sweep({ side: 'right', radius: 90, degrees: 120, grade: 0.09 }), billboards: 1 },
    { name: 'Run to the sorting gate', shape: straight(30, { grade: 0.12 }), obstacles: [peg({ costume: 'bollard', at: 0.4, line: 'center' })] },
    { name: 'The sorting gate', shape: splitter({ side: 'right', balance: { tipOffset: -2.0, left: { drag: 0.42, scrub: 0.72 }, right: { drag: 2.35, scrub: 2.35 } } }) },
    { name: 'Down the chute', shape: plunge(50, { grade: 0.3, from: 0.14 }), billboards: 1, obstacles: drops() },
    { name: 'Packing spiral', shape: spiral({ side: 'left', radius: 48, turns: 1, grade: 0.14 }) },
    { name: 'Down to dispatch', shape: plunge(45, { grade: 0.3, from: 0.12 }), obstacles: drops() },
    { name: 'Down to the flippers', shape: straight(60, { grade: 0.13 }), obstacles: [slalom({ costume: 'bollard', from: 0.3, to: 0.88, count: 4, loss: 0.3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
