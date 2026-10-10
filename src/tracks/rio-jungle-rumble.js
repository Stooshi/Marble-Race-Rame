'use strict';

// Rio Jungle Rumble: from the jungle below Corcovado down the Selarón Steps to
// Copacabana beach. Moses's design ("New Track Designs", 2), built with the track kit.
// The figure on Corcovado appears only as a distant, stylised silhouette in the background.
const {
  track, plunge, straight, sBends, sweep, spiral, hairpin, splitter, runIn,
  block, pileUp, curtain, slalom, boost, steps,
} = require('../trackKit');

module.exports = track({
  slug: 'rio-jungle-rumble',
  name: 'Rio Jungle Rumble',
  difficulty: 'extreme',
  description: 'From the Tijuca jungle below Corcovado, past an anaconda and down the Selarón Steps, to Copacabana beach.',
  surface: 'stone',
  biome: 'jungle',
  lighting: 'day',
  variants: ['sunset'],
  signature: 'Selarón Steps',
  billboardFrame: 'plain',
  // The gate in the Tijuca jungle, Corcovado far behind with its distant silhouette and a
  // monkey in a tree beside the gate; the finish on Copacabana's promenade, Sugarloaf behind.
  start: { landmark: 'corcovado' },
  finish: { landmark: 'sugarloaf' },
  designChanges: [
    'Football corner flags down the jungle plunge after the footballs, glanced off like slalom gates: with footballs alone the strongest marbles win too often and the field reaches the splitter sorted by strength.',
    'The anaconda lies along the splitter\'s divider beside one channel, lifting its head, rather than in the channel: an obstacle inside one channel of a splitter is not a proven kind.',
    'A 50 m straight, "Run to the hairpin", before the hairpin: the recipe needs a braking zone before the one sharp bend.',
  ],
  sections: [
    {
      name: 'Jungle plunge', shape: plunge(80, { grade: 0.6 }),
      obstacles: [pileUp({ costume: 'football', at: 0.42 }), slalom({ costume: 'corner-flag', from: 0.55, to: 0.97, count: 6, loss: 0.3 })],
      figures: ['monkey'], landmarks: [{ name: 'parrot-tree', at: 0.55, side: 'left', distance: 10 }],
    },
    { name: 'Jungle S-bends', shape: sBends({ first: 'left', radius: 75, degrees: 80, grade: 0.13 }), billboards: 1 },
    {
      name: 'Anaconda splitter', shape: splitter({ side: 'left', balance: { tipOffset: -0.8, left: { drag: 1.32, scrub: 1.32 }, right: { drag: 0.42, scrub: 0.72 } } }),
      around: 'anaconda',
    },
    { name: 'Bay sweep', shape: sweep({ side: 'right', radius: 80, degrees: 160, grade: 0.07 }), features: [boost({ at: 0.08 })], billboards: 2, overhead: ['cable-car'] },
    // (Not in the design: the recipe's braking zone needs a straight before the one sharp bend.)
    { name: 'Run to the hairpin', shape: straight(50, { grade: 0.13 }), billboards: 1, scenery: ['colourful-houses'] },
    { name: 'Hairpin', shape: hairpin({ side: 'left' }), obstacles: [block({ costume: 'football', line: 'left' })], scenery: ['colourful-houses'] },
    { name: 'Selarón Steps', shape: straight(80, { grade: 0.15 }), features: [steps({ from: 0.45, to: 0.85, count: 6, tiles: 'mosaic' })], scenery: ['colourful-houses'] },
    // (The design's steep plunge after the steps, which picks the speed back up.)
    { name: 'Lapa plunge', shape: plunge(70, { grade: 0.4, from: 0.15 }) },
    { name: 'City spiral', shape: spiral({ side: 'right', radius: 45, grade: 0.17 }), landmarks: [{ name: 'maracana', at: 0.5, side: 'left', distance: 140 }] },
    { name: 'Beach plunge', shape: plunge(90, { grade: 0.3, from: 0.17 }), obstacles: [curtain({ costume: 'surfer', at: 0.5, side: 'left' })] },
    { name: 'Finish', shape: runIn(), landmarks: [{ name: 'copacabana', at: 0.5, side: 'left', distance: 16 }] },
  ],
});
