'use strict';

// Angkor Temple Run (Moses, 15 Nov 2026: seven new World Tour tracks fill the pack to 20; one of the two Extreme
// ones). The temples in the forest at sunrise: down the bowl below the hilltop temple past the fallen stones (the
// funnel-drop start, the field let go in waves), onto the causeway, a sweep along the moat facing the great temple's
// five lotus-bud towers (signature feature one), the hairpin by the gate, up the temple terraces and straight down its
// steep stairs (the track's big feature: a long steep drop), S-bends through the temple the tree roots have swallowed
// (signature feature two), a sweep along the great reservoir and the run to the causeway. Our own temples and trees;
// place names only.
const {
  track, opening, straight, plunge, climb, sBends, sweep, hairpin, runIn, peg, slalom, brake,
} = require('../trackKit');

module.exports = track({
  slug: 'angkor-temple-run',
  name: 'Angkor Temple Run',
  difficulty: 'extreme',
  description: 'The temples in the forest at sunrise: along the moat facing the five lotus-bud towers, up the temple terraces and straight down its steep stairs, through the temple the tree roots have swallowed and along the great reservoir.',
  surface: 'stone',
  biome: 'jungle',
  lighting: 'dawn',
  variants: ['day'],
  signature: 'Down the temple stairs',
  tvCameras: [
    // (At the foot of the stairs, looking back up them at the field coming down.)
    { section: 'Through the root temple', at: 0.2, side: 'left', distance: 8, height: 10 },
    { section: 'Along the moat', at: 0.6, side: 'right', distance: 8, height: 8 },
  ],
  billboardFrame: 'wood',
  start: { landmark: 'root-temple', gate: 'paddle', shots: { countdown: 'crane', launch: 'look-back' } },
  finish: { landmark: 'lotus-temple' },
  designChanges: [
    'Two big features from the real place: the great temple\'s five lotus-bud towers across the moat, then up its terraces and straight down its steep stairs (the big feature); and the temple the tree roots have swallowed.',
    'Our own temples and trees; place names only.',
  ],
  // (The funnel-drop start: a long bowl below the hilltop temple, fallen stones lying in it, then a row of stone
  // posts; let go in jittered waves, a new order every race.)
  opening: opening('funnel-drop', {
    costumes: { block: 'rock', slalom: 'street-lamp' },
    names: { plunge: 'Down from the hill temple' },
    waves: { groups: 5, gap: 0.12, jitter: 0.1 },
  }),
  sections: [
    {
      name: 'Onto the causeway', shape: straight(45, { grade: 0.12 }), features: [brake({ at: 0.15, length: 12 })],
      obstacles: [peg({ costume: 'street-lamp', at: 0.65, line: 'center' })],
    },
    {
      name: 'Along the moat', shape: sweep({ side: 'left', radius: 90, degrees: 130, grade: 0.11 }), billboards: 2,
      landmarks: [{ name: 'lotus-temple', at: 0.5, side: 'right', distance: 70 }],
      obstacles: [peg({ costume: 'street-lamp', at: 0.3, line: 'left' }), peg({ costume: 'street-lamp', at: 0.65, line: 'right' })],
    },
    {
      name: 'Run to the gate', shape: straight(60, { grade: 0.12 }), billboards: 1,
      obstacles: [slalom({ costume: 'street-lamp', from: 0.2, to: 0.6, count: 3, loss: 0.3 })],
    },
    { name: 'Hairpin by the gate', shape: hairpin({ side: 'right' }) },
    { name: 'Up the terraces', shape: climb(12, { grade: -0.04, after: 0.3 }) },
    // The track's big feature: straight down the temple's steep stairs.
    { name: 'Down the temple stairs', shape: plunge(80, { grade: 0.38, from: 0.16 }) },
    {
      name: 'Through the root temple', shape: sBends({ first: 'right', radius: 65, degrees: 90, grade: 0.13 }), billboards: 1,
      landmarks: [{ name: 'root-temple', at: 0.6, side: 'left', distance: 24 }],
      obstacles: [peg({ costume: 'street-lamp', at: 0.3, line: 'right' }), peg({ costume: 'street-lamp', at: 0.7, line: 'left' })],
    },
    { name: 'Along the reservoir', shape: sweep({ side: 'left', radius: 85, degrees: 110, grade: 0.12 }) },
    {
      name: 'To the causeway', shape: straight(80, { grade: 0.12 }), billboards: 1,
      features: [brake({ at: 0.05, length: 10, drag: 0.02 })],
      obstacles: [slalom({ costume: 'street-lamp', from: 0.5, to: 0.9, count: 3, loss: 0.35 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
