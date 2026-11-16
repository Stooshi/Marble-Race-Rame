'use strict';

// Portes du Soleil Run (France and Switzerland): from car-free Avoriaz across the
// border and down the Swiss Wall to a Swiss village square. Moses's design
// ("New Track Designs", 6), built with the track kit.
const {
  track, opening, plunge, straight, sBends, sweep, spiral, hairpin, runIn,
  parked, slalom, moguls, peg, brake,
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
  tvCameras: [
    // (At the foot of the Wall, looking back up it at the field coming down.)
    { section: 'Run to the hairpin', at: 0.2, side: 'left', distance: 6, height: 8 },
    { section: 'Forest spiral', at: 0.6, side: 'left', distance: 6, height: 8 },
  ],
  billboardFrame: 'wood',
  // The gate in Avoriaz among its wood-clad buildings, the Dents du Midi on the horizon; the
  // finish in a Swiss village square, chalets with flower boxes round it and a church spire.
  start: { scenery: ['wood-clad'], gate: 'stalls', shots: { countdown: 'side', launch: 'overhead' } },
  designChanges: [
    'Its own layout (Moses, 15 Nov 2026: World Tour re-layouts): down from Avoriaz past the cows, a sweep across the border under the chairlift, down the Swiss Wall from Chavanette (the big feature: the steepest stretch, low moguls down it), the hairpin, S-bends into the Swiss village, the forest spiral and the run to the square.',
    'A straight, "Run to the hairpin", before the hairpin: the recipe needs a braking zone before the one sharp bend.',
    'Cows wandered onto the Avoriaz plunge (a pile-up before the slalom gates): without it the strongest marbles win too often.',
  ],
  finish: { landmark: 'church', scenery: ['chalets'] },
  // (The classic start: down from Avoriaz past the cows and through the gates; let go in jittered waves, a new
  // order every race, as the front places won more without them.)
  opening: opening('classic', {
    costumes: { block: 'cow' },
    names: { plunge: 'Avoriaz plunge' },
    dress: { plunge: { scenery: ['wood-clad'], landmarks: [{ name: 'horse-sleigh', at: 0.5, side: 'right', distance: 20 }] } },
    waves: { groups: 5, gap: 0.12, jitter: 0.1 },
  }),
  sections: [
    {
      name: 'Border sweep', shape: sweep({ side: 'right', radius: 80, degrees: 140, grade: 0.13 }), figures: ['skier', 'snowboarder', 'skier'],
      billboards: 2, overhead: ['chairlift'], landmarks: [{ name: 'border-post', at: 0.5, side: 'left', distance: 18 }], scenery: ['pines'],
      obstacles: [peg({ costume: 'cowbell-post', at: 0.3, line: 'left' }), peg({ costume: 'cowbell-post', at: 0.65, line: 'right' })],
    },
    { name: 'To Chavanette', shape: straight(40, { grade: 0.12 }), scenery: ['bare'] },
    {
      // The Swiss Wall (Le Mur Suisse): the track's big feature, the steepest stretch after the start, low moguls down it.
      name: 'The Swiss Wall', shape: plunge(100, { grade: 0.42, from: 0.16 }),
      features: [moguls({ from: 0.4, to: 0.95, count: 8 })], figures: ['skier', 'skier'], scenery: ['bare'],
    },
    // (Not in the design: the recipe's braking zone needs a straight before the one sharp bend.)
    {
      name: 'Run to the hairpin', shape: straight(60, { grade: 0.13 }), scenery: ['pasture'], billboards: 1,
      obstacles: [slalom({ from: 0.35, to: 0.7, count: 3, loss: 0.3 })],
    },
    { name: 'Hairpin', shape: hairpin({ side: 'left' }), scenery: ['pasture'] },
    {
      name: 'Village S-bends', shape: sBends({ first: 'right', radius: 70, degrees: 80, grade: 0.13 }), scenery: ['chalets'], billboards: 1,
      obstacles: [peg({ costume: 'cowbell-post', at: 0.35, line: 'left' }), peg({ costume: 'cowbell-post', at: 0.7, line: 'right' })],
    },
    { name: 'Forest spiral', shape: spiral({ side: 'left', radius: 45, grade: 0.15 }), figures: ['marmot'], scenery: ['pines'] },
    {
      name: 'Village square run', shape: straight(75, { grade: 0.14 }), scenery: ['chalets'],
      features: [brake({ at: 0.05, length: 10, drag: 0.02 })],
      obstacles: [parked({ costume: 'piste-groomer', at: 0.3, side: 'right', length: 8 }), slalom({ from: 0.55, to: 0.9, count: 3, loss: 0.35 })],
    },
    { name: 'Finish', shape: runIn(), scenery: ['chalets'] },
  ],
});
