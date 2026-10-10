'use strict';

// Portes du Soleil Run (France and Switzerland): from car-free Avoriaz across the
// border and down the Swiss Wall to a Swiss village square. Moses's design
// ("New Track Designs", 6), built with the track kit.
const {
  track, plunge, straight, sBends, sweep, spiral, hairpin, splitter, runIn,
  block, pileUp, parked, slalom, boost, moguls,
} = require('../trackKit');

module.exports = track({
  slug: 'portes-du-soleil-run',
  name: 'Portes du Soleil Run',
  difficulty: 'extreme',
  description: 'From car-free Avoriaz across the French–Swiss border and down the Swiss Wall to a Swiss village square.',
  surface: 'snow',
  biome: 'alpine',
  lighting: 'day',
  signature: 'The Swiss Wall',
  billboardFrame: 'wood',
  // The gate in Avoriaz among its wood-clad buildings, the Dents du Midi on the horizon; the
  // finish in a Swiss village square, chalets with flower boxes round it and a church spire.
  start: { scenery: ['wood-clad'] },
  designChanges: [
    'A 50 m straight, "Run to the hairpin", before the hairpin: the recipe needs a braking zone before the one sharp bend.',
    'Cows wandered onto the Avoriaz plunge (a pile-up before the slalom gates): without it the strongest marbles win too often, as on Åre Run.',
  ],
  finish: { landmark: 'church', scenery: ['chalets'] },
  sections: [
    {
      name: 'Avoriaz plunge', shape: plunge(80, { grade: 0.6 }),
      obstacles: [pileUp({ costume: 'cow', at: 0.42 }), slalom({ from: 0.55, to: 0.97, count: 6, loss: 0.3 })],
      landmarks: [{ name: 'horse-sleigh', at: 0.5, side: 'right', distance: 12 }], scenery: ['wood-clad'],
    },
    { name: 'Piste S-bends', shape: sBends({ first: 'right', radius: 75, degrees: 80, grade: 0.13 }), figures: ['skier', 'snowboarder', 'skier'], scenery: ['pines'], billboards: 1 },
    { name: 'Splitter', shape: splitter({ side: 'right', balance: { tipOffset: 0.8, left: { drag: 0.42, scrub: 0.72 }, right: { drag: 1.42, scrub: 1.42 } } }), around: 'mountain-restaurant', scenery: ['pines'] },
    {
      name: 'Border sweep', shape: sweep({ side: 'left', radius: 85, degrees: 150, grade: 0.08 }), features: [boost({ at: 0.08 })],
      billboards: 2, overhead: ['chairlift'], landmarks: [{ name: 'border-post', at: 0.5, side: 'right', distance: 10 }], scenery: ['pines'],
    },
    // (Not in the design: the recipe's braking zone needs a straight before the one sharp bend.)
    { name: 'Run to the hairpin', shape: straight(50, { grade: 0.13 }), billboards: 1, scenery: ['pasture'] },
    { name: 'Hairpin', shape: hairpin({ side: 'right' }), obstacles: [block({ costume: 'cow', line: 'high' })], scenery: ['pasture'] },
    {
      // The Swiss Wall (Le Mur Suisse): the steepest stretch after the start, low moguls down it.
      name: 'The Swiss Wall', shape: plunge(120, { grade: 0.42, from: 0.16 }),
      features: [moguls({ from: 0.4, to: 0.95, count: 8 })], figures: ['skier', 'skier'], scenery: ['bare'],
    },
    { name: 'Forest spiral', shape: spiral({ side: 'right', radius: 45, grade: 0.18 }), figures: ['marmot'], scenery: ['pines'] },
    {
      name: 'Final plunge', shape: straight(90, { grade: 0.2 }),
      obstacles: [parked({ costume: 'piste-groomer', at: 0.4, side: 'right', length: 8 })], scenery: ['chalets'],
    },
    { name: 'Finish', shape: runIn(), scenery: ['chalets'] },
  ],
});
