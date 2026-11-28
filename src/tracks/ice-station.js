'use strict';

// Ice Station (Moses, 26 Nov 2026: the Pinball pack towards 20, the second set): a polar pinball table under the
// northern lights. The gate stands by a research base of our own on stilts, its radar dome, a wind turbine and a
// snowcat. Away on the clear start (the field let go in waves, gentle bends and nothing in the way for the first
// seconds), the crevasse bends off a speed pad through a spinner, off the ice shelf through the ice lanterns, down the ice
// cliff, round the penguin colony off a second speed pad and down to the aurora, then the table's big feature: the
// aurora, a full loop under the northern lights; the snowfield bends, over the ice wall, round base camp and the ice
// lanterns on the run to the flippers.
const { track, opening, straight, sweep, sBends, plunge, loop, runIn, curtain, peg, slalom, brake, boost } = require('../trackKit');

const drops = () => [slalom({ costume: 'ice-lantern', from: 0.5, to: 0.85, count: 2, loss: 0.15 })];
const pegs = (a, b) => [peg({ costume: 'ice-lantern', at: 0.35, line: a }), peg({ costume: 'ice-lantern', at: 0.7, line: b })];

module.exports = track({
  slug: 'ice-station',
  name: 'Ice Station',
  family: 'pinball',
  difficulty: 'extreme',
  description: 'A polar pinball table under the northern lights: away from the research base in a pack, through the crevasse bends, off the ice shelf through the ice lanterns and down the ice cliff, round the penguin colony, then the aurora, a full loop, and over the ice wall past base camp to the flippers.',
  surface: 'ice',
  biome: 'playfield',
  lighting: 'parlour',
  pinball: { art: 'polar', display: 'WHITEOUT!', finish: 'POLAR STAR' },
  signature: 'The aurora',
  tvCameras: [
    { section: 'Off the ice shelf', at: 0.6, side: 'left', distance: 9, height: 8 },
    // (Before the loop, looking back: a camera just past a loop draws the whole table on a computer.)
    { section: 'The aurora', at: 0.25, side: 'right', distance: 9, height: 7 },
  ],
  start: { landmark: 'ice-station', gate: 'trapdoor', shots: { countdown: 'above', launch: 'high-side' } },
  finish: {},
  opening: opening('clear-start', { side: 'left' }),
  sections: [
    {
      name: 'Crevasse bends', shape: sBends({ first: 'left', radius: 70, degrees: 60, grade: 0.13 }), billboards: 1,
      features: [boost({ at: 0.08, kick: 4 })],
      obstacles: [curtain({ costume: 'spinner', at: 0.3, side: 'left' }), peg({ costume: 'ice-lantern', at: 0.7, line: 'center' })],
    },
    { name: 'Off the ice shelf', shape: straight(55, { grade: 0.12 }), obstacles: [slalom({ costume: 'ice-lantern', from: 0.25, to: 0.92, count: 4, loss: 0.3 })] },
    { name: 'Down the ice cliff', shape: plunge(50, { grade: 0.36, from: 0.12 }), obstacles: drops() },
    {
      name: 'Penguin colony', shape: sweep({ side: 'right', radius: 90, degrees: 110, grade: 0.1 }), billboards: 1,
      features: [boost({ at: 0.15, kick: 4 })], obstacles: pegs('left', 'right'),
    },
    { name: 'Down to the aurora', shape: plunge(50, { grade: 0.36, from: 0.1 }), obstacles: drops() },
    {
      name: 'The aurora', shape: straight(170, { grade: 0.11 }),
      features: [brake({ at: 0.08, length: 12, drag: 0.02 }), loop({ at: 0.4, viewSide: 14 })],
    },
    { name: 'Snowfield bends', shape: sBends({ first: 'right', radius: 65, degrees: 65, grade: 0.13 }), billboards: 1, obstacles: pegs('right', 'left') },
    { name: 'Over the ice wall', shape: plunge(45, { grade: 0.3, from: 0.13 }), obstacles: drops() },
    { name: 'Base camp', shape: sweep({ side: 'left', radius: 90, degrees: 100, grade: 0.1 }), billboards: 1, obstacles: pegs('left', 'right') },
    { name: 'Down to the flippers', shape: straight(60, { grade: 0.13 }), obstacles: [slalom({ costume: 'ice-lantern', from: 0.3, to: 0.88, count: 4, loss: 0.3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
