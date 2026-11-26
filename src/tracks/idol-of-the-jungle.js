'use strict';

// Idol of the Jungle (Moses, 26 Nov 2026: the Pinball pack towards 20): a lost-temple pinball table. The gate stands
// below a huge stone head on a stepped temple, its eyes glowing green. Away on the clear start (the field let go in
// waves, gentle bends and nothing in the way for the first seconds), along the jungle path off a speed pad past a
// stone guardian, the vine bends through broken pillars, down the temple steps, the hairpin in the ruins, out of the
// ruins, the river bend off a second speed pad and the long sweep, then the table's big feature: the idol's split,
// the field parting either side of the stone idol, and the last straight to the flippers.
const { track, opening, straight, sweep, sBends, plunge, hairpin, splitter, runIn, peg, swipe, boost } = require('../trackKit');

module.exports = track({
  slug: 'idol-of-the-jungle',
  name: 'Idol of the Jungle',
  family: 'pinball',
  difficulty: 'hard',
  description: 'A lost-temple pinball table: away from the gate in a pack, along the jungle path past a stone guardian, through the vine bends, down the temple steps and round the ruins, then the idol\'s split, the field parting either side of the stone idol, on the last straight to the flippers.',
  surface: 'ice',
  biome: 'playfield',
  lighting: 'parlour',
  pinball: { art: 'temple', display: 'THE IDOL WAKES', finish: 'TEMPLE TREASURE' },
  signature: 'The idol\'s split',
  tvCameras: [
    // (Past the split, looking back at the field coming out either side of the idol.)
    { section: 'Last straight', at: 0.3, side: 'left', distance: 8, height: 7 },
    { section: 'Down the temple steps', at: 0.85, side: 'right', distance: 8, height: 8 },
  ],
  start: { landmark: 'stone-idol', gate: 'stalls', shots: { countdown: 'swing', launch: 'high-side' } },
  finish: {},
  opening: opening('clear-start', { side: 'left' }),
  sections: [
    {
      name: 'Jungle path', shape: straight(50, { grade: 0.12 }), billboards: 1,
      features: [boost({ at: 0.1, kick: 4 })],
      obstacles: [swipe({ costume: 'temple-guardian', at: 0.6, side: 'right' })],
    },
    {
      name: 'Vine bends', shape: sBends({ first: 'left', radius: 70, degrees: 60, grade: 0.13 }), billboards: 1,
      obstacles: [peg({ costume: 'broken-pillar', at: 0.35, line: 'center' }), peg({ costume: 'broken-pillar', at: 0.7, line: 'center' })],
    },
    { name: 'Down the temple steps', shape: plunge(50, { grade: 0.3, from: 0.13 }) },
    { name: 'Run to the ruins', shape: straight(40, { grade: 0.12 }) },
    { name: 'Ruins hairpin', shape: hairpin({ side: 'right' }), obstacles: [swipe({ costume: 'temple-guardian', side: 'high' })] },
    { name: 'Out of the ruins', shape: plunge(45, { grade: 0.26, from: 0.16 }) },
    {
      name: 'River bend', shape: sweep({ side: 'left', radius: 90, degrees: 100, grade: 0.1 }), billboards: 1,
      features: [boost({ at: 0.1, kick: 4 })],
      obstacles: [peg({ costume: 'broken-pillar', at: 0.45, line: 'right' }), peg({ costume: 'broken-pillar', at: 0.75, line: 'left' })],
    },
    { name: 'Long sweep', shape: sweep({ side: 'right', radius: 90, degrees: 120, grade: 0.09 }), billboards: 1 },
    { name: 'Run to the idol', shape: straight(30, { grade: 0.12 }), obstacles: [peg({ costume: 'broken-pillar', at: 0.4, line: 'center' })] },
    {
      name: 'The idol\'s split', shape: splitter({ side: 'right', balance: { tipOffset: -2.0, left: { drag: 0.42, scrub: 0.72 }, right: { drag: 2.1, scrub: 2.1 } } }),
    },
    {
      name: 'Last straight', shape: straight(40, { grade: 0.15 }),
      obstacles: [peg({ costume: 'broken-pillar', at: 0.4, line: 'left' }), peg({ costume: 'broken-pillar', at: 0.6, line: 'right' })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
