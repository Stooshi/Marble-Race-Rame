'use strict';

// Paris Eiffel Tower Run: from the hilltop of Montmartre through the heart of Paris
// to the Eiffel Tower. Moses's design ("New Track Designs", 3), built with the track
// kit. Daylight only: the tower's evening light show is protected, so no night lighting.
const {
  track, plunge, straight, sBends, sweep, spiral, hairpin, splitter, runIn,
  pileUp, curtain, parked, slalom, boost, brake,
} = require('../trackKit');

module.exports = track({
  slug: 'paris-eiffel-tower-run',
  name: 'Paris Eiffel Tower Run',
  difficulty: 'extreme',
  description: 'From Montmartre through the Arc de Triomphe and round the Concorde obelisk, down to the Seine and the Eiffel Tower.',
  surface: 'stone',
  biome: 'city',
  lighting: 'day',
  variants: ['rain', 'fog'], // (daylight only)
  signature: 'Arc de Triomphe splitter',
  billboardFrame: 'column',
  // The gate on the cobbled square before Sacré-Cœur, the roofs of Paris below; the finish
  // on the Champ de Mars, the Eiffel Tower rising straight behind the line.
  start: { landmark: 'sacre-coeur', scenery: ['haussmann'] },
  finish: { landmark: 'eiffel-tower', scenery: ['plane-trees'] },
  designChanges: [
    'Street lamps down the Montmartre plunge after the café tables, glanced off like slalom gates: with café tables alone the strongest marbles win too often and the field reaches the splitter sorted by strength.',
    'A 50 m straight, "Run to the Concorde", before the hairpin: the recipe needs a braking zone before the one sharp bend; its first 15 m are rough cobbles (a braking stretch), which bunches the field so it overtakes enough.',
  ],
  sections: [
    {
      name: 'Montmartre plunge', shape: plunge(80, { grade: 0.6 }),
      obstacles: [pileUp({ costume: 'cafe-table', at: 0.42 }), slalom({ costume: 'street-lamp', from: 0.55, to: 0.97, count: 6, loss: 0.3 })],
      figures: ['painter', 'painter'], scenery: ['haussmann'],
    },
    {
      name: 'Moulin Rouge S-bends', shape: sBends({ first: 'left', radius: 75, degrees: 80, grade: 0.13 }),
      landmarks: [{ name: 'moulin-rouge', at: 0.5, side: 'right', distance: 16 }], scenery: ['haussmann'], billboards: 1,
    },
    {
      name: 'Arc de Triomphe splitter', shape: splitter({ side: 'left', balance: { tipOffset: -0.8, left: { drag: 1.36, scrub: 1.36 }, right: { drag: 0.42, scrub: 0.72 } } }),
      around: 'arc-de-triomphe', scenery: ['plane-trees'],
    },
    { name: 'Champs-Élysées sweep', shape: sweep({ side: 'right', radius: 80, degrees: 160, grade: 0.08 }), features: [boost({ at: 0.08 })], billboards: 2, scenery: ['plane-trees', 'haussmann'] },
    // (Not in the design: the recipe's braking zone needs a straight before the one sharp bend.)
    { name: 'Run to the Concorde', shape: straight(50, { grade: 0.13 }), features: [brake({ at: 0.25, length: 15 })], billboards: 1, landmarks: [{ name: 'fountains', at: 0.6, side: 'left', distance: 10 }], scenery: ['plane-trees'] },
    { name: 'Concorde hairpin', shape: hairpin({ side: 'left' }), around: 'obelisk' },
    {
      name: 'Louvre run', shape: straight(110, { grade: 0.18 }),
      obstacles: [parked({ costume: 'vespa', at: 0.45, side: 'right', length: 8 })],
      landmarks: [{ name: 'louvre-pyramid', at: 0.5, side: 'left', distance: 14 }],
    },
    { name: 'Notre-Dame spiral', shape: spiral({ side: 'right', radius: 45, grade: 0.18 }), around: 'notre-dame', scenery: ['plane-trees'] },
    {
      name: 'Seine plunge', shape: plunge(100, { grade: 0.3, from: 0.18 }),
      obstacles: [curtain({ costume: 'easel', at: 0.45, side: 'left' })], figures: ['pigeon', 'pigeon', 'pigeon'],
      landmarks: [{ name: 'seine', at: 0.5, side: 'right', distance: 22 }, { name: 'bookstalls', at: 0.3, side: 'left', distance: 6 }],
    },
    { name: 'Finish', shape: runIn(), scenery: ['plane-trees'] },
  ],
});
