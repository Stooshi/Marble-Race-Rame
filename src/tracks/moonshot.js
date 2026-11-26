'use strict';

// Moonshot (Moses, 26 Nov 2026: the Pinball pack towards 20): a space-race pinball table. The gate stands at the foot
// of a rocket on its launch tower, steam rolling off the pad. Away on the clear start (the field let go in waves,
// gentle bends and nothing in the way for the first seconds), past mission control off a speed pad and the laser
// posts, down the gantry and S-bends through it, the countdown hairpin round the crane arm and the drop off the pad
// (lift-off), then the table's big feature: the orbit, a full loop; re-entry through S-bends off a second speed pad,
// a drop falling back to Earth past the laser posts, the splashdown sweep and the laser posts on the run to the flippers.
const { track, opening, straight, sweep, sBends, plunge, hairpin, loop, runIn, peg, slalom, swipe, brake, boost } = require('../trackKit');

module.exports = track({
  slug: 'moonshot',
  name: 'Moonshot',
  family: 'pinball',
  difficulty: 'extreme',
  description: 'A space-race pinball table: away from the launch pad in a pack, past mission control through the laser posts, the gantry bends, the countdown hairpin and lift-off, then the orbit, a full loop, re-entry and splashdown on the run to the flippers.',
  surface: 'ice',
  biome: 'playfield',
  lighting: 'parlour',
  pinball: { art: 'rocket', display: 'LIFT OFF!', finish: 'MOON LANDING' },
  signature: 'The orbit',
  tvCameras: [
    // (Before the loop, looking back up the track at the field coming off lift-off: a camera just past a loop draws
    // the whole table on a computer.)
    { section: 'The orbit', at: 0.25, side: 'right', distance: 9, height: 7 },
    { section: 'Splashdown', at: 0.45, side: 'left', distance: 9, height: 9 },
  ],
  start: { landmark: 'launch-tower', gate: 'barrier', shots: { countdown: 'low-front', launch: 'high-behind' } },
  finish: {},
  opening: opening('clear-start', { side: 'right' }),
  sections: [
    {
      name: 'Past mission control', shape: straight(50, { grade: 0.12 }), billboards: 1,
      features: [boost({ at: 0.1, kick: 4 })],
      obstacles: [slalom({ costume: 'laser-pylon', from: 0.45, to: 0.95, count: 4, loss: 0.3 })],
    },
    { name: 'Down the gantry', shape: plunge(45, { grade: 0.3, from: 0.12 }), obstacles: [slalom({ costume: 'laser-pylon', from: 0.45, to: 0.85, count: 2, loss: 0.15 })] },
    {
      name: 'Gantry bends', shape: sBends({ first: 'right', radius: 70, degrees: 60, grade: 0.13 }), billboards: 1,
      obstacles: [peg({ costume: 'laser-pylon', at: 0.35, line: 'center' }), peg({ costume: 'laser-pylon', at: 0.7, line: 'center' })],
    },
    { name: 'Run to the countdown', shape: straight(40, { grade: 0.12 }) },
    { name: 'Countdown hairpin', shape: hairpin({ side: 'right' }), obstacles: [swipe({ costume: 'claw-arm', side: 'high' })] },
    { name: 'Lift-off', shape: plunge(55, { grade: 0.36, from: 0.16 }), obstacles: [slalom({ costume: 'laser-pylon', from: 0.45, to: 0.85, count: 2, loss: 0.15 })] },
    {
      name: 'The orbit', shape: straight(170, { grade: 0.11 }),
      features: [brake({ at: 0.08, length: 12, drag: 0.02 }), loop({ at: 0.4, viewSide: 14 })],
    },
    {
      name: 'Re-entry', shape: sBends({ first: 'left', radius: 65, degrees: 65, grade: 0.13 }), billboards: 1,
      features: [boost({ at: 0.08, kick: 4 })],
      obstacles: [peg({ costume: 'laser-pylon', at: 0.4, line: 'right' }), peg({ costume: 'laser-pylon', at: 0.75, line: 'left' })],
    },
    { name: 'Falling back to Earth', shape: plunge(50, { grade: 0.36, from: 0.13 }), obstacles: [slalom({ costume: 'laser-pylon', from: 0.45, to: 0.85, count: 2, loss: 0.15 })] },
    {
      name: 'Splashdown', shape: sweep({ side: 'right', radius: 90, degrees: 120, grade: 0.09 }), billboards: 1,
      obstacles: [peg({ costume: 'laser-pylon', at: 0.35, line: 'left' }), peg({ costume: 'laser-pylon', at: 0.65, line: 'right' })],
    },
    {
      name: 'Down to the flippers', shape: straight(60, { grade: 0.13 }),
      obstacles: [swipe({ costume: 'claw-arm', at: 0.15, side: 'left' }), slalom({ costume: 'laser-pylon', from: 0.4, to: 0.88, count: 4, loss: 0.3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
