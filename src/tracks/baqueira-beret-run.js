'use strict';

// Baqueira-Beret Run (Spain): a sunny Pyrenees run down to the stone villages of
// the Val d'Aran. Moses's design ("New Track Designs", 8), built with the track kit.
const {
  track, plunge, straight, sBends, sweep, spiral, hairpin, splitter, runIn,
  block, pileUp, parked, slalom, boost,
} = require('../trackKit');

module.exports = track({
  slug: 'baqueira-beret-run',
  name: 'Baqueira-Beret Run',
  difficulty: 'extreme',
  description: 'A sunny Pyrenees run past a circling vulture and round a Romanesque bell tower to a stone village in the Val d\'Aran.',
  surface: 'snow',
  biome: 'alpine',
  lighting: 'day',
  signature: 'Bell-tower spiral',
  billboardFrame: 'wood',
  // The gate on a high sunlit ridge, wide views over the valley; the finish in an Aranese
  // village of grey stone houses and slate roofs, beside a Romanesque church.
  start: { scenery: ['bare'] },
  finish: { landmark: 'church', scenery: ['stone-houses'] },
  designChanges: [
    'A 50 m straight, "Run to the hairpin", before the hairpin: the recipe needs a braking zone before the one sharp bend.',
    'A few chamois on the ridge plunge (a pile-up before the slalom gates): without it the strongest marbles win too often, as on Åre Run.',
  ],
  sections: [
    {
      name: 'Ridge plunge', shape: plunge(80, { grade: 0.6 }),
      obstacles: [pileUp({ costume: 'chamois', at: 0.42 }), slalom({ from: 0.55, to: 0.97, count: 6, loss: 0.3 })], scenery: ['bare'],
    },
    { name: 'Open-bowl S-bends', shape: sBends({ first: 'left', radius: 85, degrees: 72, grade: 0.13 }), figures: ['skier', 'skier', 'snowboarder', 'skier'], scenery: ['bare'], billboards: 1 },
    {
      name: 'Splitter', shape: splitter({ side: 'left', balance: { tipOffset: -0.8, left: { drag: 1.42, scrub: 1.42 }, right: { drag: 0.42, scrub: 0.72 } } }),
      around: 'big-rock', overhead: ['vulture'], scenery: ['rocks'],
    },
    { name: 'Valley sweep', shape: sweep({ side: 'right', radius: 80, degrees: 160, grade: 0.07 }), features: [boost({ at: 0.08 })], billboards: 2, overhead: ['chairlift'], scenery: ['pines'] },
    // (Not in the design: the recipe's braking zone needs a straight before the one sharp bend.)
    { name: 'Run to the hairpin', shape: straight(50, { grade: 0.13 }), billboards: 1, scenery: ['rocks'] },
    { name: 'Hairpin', shape: hairpin({ side: 'left' }), obstacles: [block({ costume: 'chamois', line: 'high', size: 'large' })], scenery: ['rocks'] },
    { name: 'Bell-tower spiral', shape: spiral({ side: 'right', radius: 45, grade: 0.17 }), around: 'bell-tower', scenery: ['pines'] },
    {
      name: 'Forest run', shape: straight(80, { grade: 0.18 }),
      obstacles: [parked({ costume: 'snowmobile', at: 0.4, side: 'right', length: 8 })], scenery: ['pines'],
    },
    { name: 'Final plunge', shape: plunge(110, { grade: 0.3, from: 0.18 }), scenery: ['stone-houses'] },
    { name: 'Finish', shape: runIn(), scenery: ['stone-houses'] },
  ],
});
