'use strict';

// Idol of the Jungle (Moses, 26 Nov 2026: the Pinball pack towards 20): a lost-temple pinball table. The gate stands
// below a huge stone head on a stepped temple, its eyes glowing green. Away on the clear start (the field let go in
// waves, gentle bends and nothing in the way for the first seconds), along the jungle path off a speed pad past a
// stone guardian's swinging arm and through broken pillars, the vine bends, down the temple steps and the long sweep, then the table's big feature: the idol's
// split, the field parting either side of the stone idol; the river bend off a second speed pad, the hairpin in the
// ruins round a stone guardian's swinging arm, out of the ruins and the last straight to the flippers.
const { track, opening, straight, sweep, sBends, plunge, hairpin, splitter, runIn, peg, slalom, swipe, boost } = require('../trackKit');

module.exports = track({
  slug: 'idol-of-the-jungle',
  name: 'Idol of the Jungle',
  family: 'pinball',
  difficulty: 'hard',
  description: 'A lost-temple pinball table: away from the gate in a pack, along the jungle path through broken pillars, the vine bends and down the temple steps, then the idol\'s split, the field parting either side of the stone idol; round the ruins past a stone guardian and on to the flippers.',
  surface: 'ice',
  biome: 'playfield',
  lighting: 'parlour',
  pinball: { art: 'temple', display: 'THE IDOL WAKES', finish: 'TEMPLE TREASURE' },
  signature: 'The idol\'s split',
  tvCameras: [
    // (Just past the split, looking back at the field coming out either side of the idol.)
    { section: 'Down the temple steps', at: 0.85, side: 'right', distance: 8, height: 8 },
    { section: 'River bend', at: 0.12, side: 'right', distance: 9, height: 8 },
  ],
  start: { landmark: 'stone-idol', gate: 'stalls', shots: { countdown: 'swing', launch: 'high-side' } },
  finish: {},
  opening: opening('clear-start', { side: 'left' }),
  sections: [
    {
      name: 'Jungle path', shape: straight(55, { grade: 0.12 }),
      features: [boost({ at: 0.08, kick: 4 })],
      obstacles: [swipe({ costume: 'temple-guardian', at: 0.25, side: 'right' }), slalom({ costume: 'broken-pillar', from: 0.5, to: 0.95, count: 3, loss: 0.3 })],
    },
    {
      name: 'Vine bends', shape: sBends({ first: 'left', radius: 70, degrees: 60, grade: 0.13 }), billboards: 1,
      obstacles: [peg({ costume: 'broken-pillar', at: 0.35, line: 'center' }), peg({ costume: 'broken-pillar', at: 0.7, line: 'center' })],
    },
    {
      name: 'Down the temple steps', shape: plunge(50, { grade: 0.3, from: 0.13 }), billboards: 1,
      obstacles: [slalom({ costume: 'broken-pillar', from: 0.5, to: 0.85, count: 2, loss: 0.15 })],
    },
    { name: 'Long sweep', shape: sweep({ side: 'right', radius: 90, degrees: 120, grade: 0.09 }), billboards: 1 },
    { name: 'Run to the idol', shape: straight(30, { grade: 0.12 }), obstacles: [peg({ costume: 'broken-pillar', at: 0.4, line: 'center' })] },
    {
      name: 'The idol\'s split', shape: splitter({ side: 'right', balance: { tipOffset: -2.0, left: { drag: 0.42, scrub: 0.72 }, right: { drag: 2.35, scrub: 2.35 } } }),
      landmarks: [{ name: 'stone-idol', at: 0.5, side: 'right', distance: 45 }],
    },
    {
      name: 'River bend', shape: sweep({ side: 'left', radius: 90, degrees: 100, grade: 0.1 }), billboards: 1,
      features: [boost({ at: 0.3, kick: 4 })],
      obstacles: [peg({ costume: 'broken-pillar', at: 0.55, line: 'right' }), peg({ costume: 'broken-pillar', at: 0.8, line: 'left' })],
    },
    { name: 'Run to the ruins', shape: straight(45, { grade: 0.12 }), obstacles: [slalom({ costume: 'broken-pillar', from: 0.15, to: 0.45, count: 2, loss: 0.15 })] },
    { name: 'Ruins hairpin', shape: hairpin({ side: 'left' }), obstacles: [swipe({ costume: 'temple-guardian', side: 'high' })] },
    {
      name: 'Out of the ruins', shape: plunge(45, { grade: 0.26, from: 0.16 }),
      obstacles: [slalom({ costume: 'broken-pillar', from: 0.5, to: 0.85, count: 2, loss: 0.15 })],
    },
    {
      name: 'Last straight', shape: straight(55, { grade: 0.14 }),
      obstacles: [swipe({ costume: 'temple-guardian', at: 0.15, side: 'left' }), slalom({ costume: 'broken-pillar', from: 0.4, to: 0.88, count: 4, loss: 0.3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
