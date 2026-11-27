'use strict';

// Kraken Deep (Moses, 26 Nov 2026: the Pinball pack towards 20): a deep-sea pinball table. A giant octopus of our own
// rises from the sea floor beside the gate. Away on the clear start (the field let go in waves, gentle bends and nothing
// in the way for the first seconds), over the reef off a speed pad and through the coral posts, then the table's big
// feature, the dive in three drops: down to the wreck, a spin round it, down past the kelp; S-bends through the kelp
// off a second speed pad, the hairpin round the wreck's flipper and the long plunge into the trench; along the trench floor, the deep, the coral garden and the run past the treasure chests through the bumper posts to the flippers.
const { track, opening, straight, sweep, sBends, plunge, spiral, hairpin, runIn, peg, slalom, swipe, parked, boost } = require('../trackKit');

module.exports = track({
  slug: 'kraken-deep',
  name: 'Kraken Deep',
  family: 'pinball',
  difficulty: 'extreme',
  description: 'A deep-sea pinball table: away from the gate in a pack, over the reef through the coral posts, then the dive: down to the wreck, a spin round it, down past the kelp, round the wreck\'s flipper and into the trench where the kraken waits, through the deep to the flippers.',
  surface: 'ice',
  biome: 'playfield',
  lighting: 'parlour',
  pinball: { art: 'deep-sea', display: 'RELEASE IT!', finish: 'KRAKEN KING' },
  signature: 'Into the trench',
  tvCameras: [
    // (At the foot of the trench, looking back up at the field diving in.)
    { section: 'Into the trench', at: 0.9, side: 'right', distance: 9, height: 7 },
    { section: 'Down to the wreck', at: 0.85, side: 'right', distance: 8, height: 8 },
  ],
  start: { landmark: 'kraken', gate: 'trapdoor', shots: { countdown: 'crane', launch: 'side' } },
  finish: {},
  opening: opening('clear-start', { side: 'left' }),
  sections: [
    {
      name: 'Over the reef', shape: straight(50, { grade: 0.12 }),
      features: [boost({ at: 0.1, kick: 4 })],
      obstacles: [slalom({ costume: 'bumper-post', from: 0.45, to: 0.95, count: 4, loss: 0.3 })],
    },
    { name: 'Down to the wreck', shape: plunge(55, { grade: 0.36, from: 0.12 }) },
    { name: 'Round the wreck', shape: spiral({ side: 'right', radius: 48, turns: 1, grade: 0.15 }) },
    { name: 'Down past the kelp', shape: plunge(50, { grade: 0.36, from: 0.15 }) },
    {
      name: 'Kelp bends', shape: sBends({ first: 'left', radius: 65, degrees: 65, grade: 0.13 }), billboards: 1,
      features: [boost({ at: 0.08, kick: 4 })],
      obstacles: [peg({ costume: 'bumper-post', at: 0.4, line: 'right' }), peg({ costume: 'bumper-post', at: 0.75, line: 'left' })],
    },
    { name: 'Run to the wreck\'s flipper', shape: straight(40, { grade: 0.12 }), billboards: 1 },
    { name: 'Wreck hairpin', shape: hairpin({ side: 'left' }), obstacles: [swipe({ costume: 'flipper-bat', side: 'high' })] },
    { name: 'Into the trench', shape: plunge(60, { grade: 0.36, from: 0.16 }), billboards: 1 },
    { name: 'Trench floor', shape: straight(35, { grade: 0.12 }) },
    {
      name: 'The deep', shape: sweep({ side: 'right', radius: 90, degrees: 110, grade: 0.09 }), billboards: 1,
      obstacles: [peg({ costume: 'mooring-pole', at: 0.35, line: 'left' }), peg({ costume: 'mooring-pole', at: 0.65, line: 'right' })],
    },
    {
      name: 'Coral garden', shape: sBends({ first: 'left', radius: 70, degrees: 60, grade: 0.12 }),
      obstacles: [peg({ costume: 'bumper-post', at: 0.3, line: 'center' }), peg({ costume: 'bumper-post', at: 0.7, line: 'center' })],
    },
    {
      name: 'Down to the flippers', shape: straight(70, { grade: 0.13 }),
      obstacles: [parked({ costume: 'treasure-chests', at: 0.18, side: 'left', length: 6 }), slalom({ costume: 'bumper-post', from: 0.4, to: 0.85, count: 5, loss: 0.3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
