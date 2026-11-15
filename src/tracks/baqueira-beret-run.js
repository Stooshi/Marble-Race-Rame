'use strict';

// Baqueira-Beret Run (Spain): a sunny Pyrenees run down to the stone villages of
// the Val d'Aran. Moses's design ("New Track Designs", 8), built with the track kit.
const {
  track, opening, plunge, straight, sBends, sweep, spiral, hairpin, runIn,
  parked, slalom, peg, brake, moguls,
} = require('../trackKit');

module.exports = track({
  slug: 'baqueira-beret-run',
  name: 'Baqueira-Beret Run',
  difficulty: 'extreme',
  description: 'A sunny Pyrenees run past a circling vulture and round a Romanesque bell tower to a stone village in the Val d\'Aran.',
  surface: 'snow',
  biome: 'alpine',
  lighting: 'day',
  signature: 'Escornacrabes',
  tvCameras: [
    // (At the foot of the couloir, looking back up it at the field coming down.)
    { section: 'Forest S-bends', at: 0.15, side: 'left', distance: 6, height: 10 },
    { section: 'Bell-tower spiral', at: 0.5, side: 'right', distance: 6, height: 8 },
  ],
  billboardFrame: 'wood',
  // The gate on a high sunlit ridge, wide views over the valley; the finish in an Aranese
  // village of grey stone houses and slate roofs, beside a Romanesque church.
  start: { scenery: ['bare'], gate: 'paddle', shots: { countdown: 'front', launch: 'side' } },
  finish: { landmark: 'church', scenery: ['stone-houses'] },
  designChanges: [
    'Its own layout and opening (Moses, 15 Nov 2026: World Tour re-layouts): down the ridge and a wide turn across the open bowl under the chairlift (the rolling start, the field let go in waves), over the moguls, the spiral round the Romanesque bell tower, the hairpin, down the Escornacrabes couloir under a circling vulture (the big feature: the resort\'s steepest run, a long steep drop), a sweep down the valley, S-bends through the forest and the run into the village.',
    'A straight, "Run to the hairpin", before the hairpin: the recipe needs a braking zone before the one sharp bend.',
  ],
  // (The rolling start: down the ridge through the gates, then a wide turn across the open bowl under the
  // chairlift; let go in jittered waves, a new order every race.)
  opening: opening('rolling-start', {
    side: 'left',
    names: { run: 'Ridge run', turn: 'Open-bowl turn' },
    dress: { turn: { overhead: ['chairlift'] } },
    waves: { groups: 5, gap: 0.14, jitter: 0.1 },
  }),
  sections: [
    { name: 'Bowl moguls', shape: straight(70, { grade: 0.14 }), features: [moguls({ from: 0.55, to: 0.92, count: 4 })], obstacles: [slalom({ from: 0.12, to: 0.4, count: 3, loss: 0.3 })], scenery: ['bare'], billboards: 1, figures: ['skier', 'skier', 'snowboarder', 'skier'] },
    {
      name: 'Bell-tower spiral', shape: spiral({ side: 'right', radius: 45, grade: 0.14 }), around: 'bell-tower', scenery: ['pines'],
      obstacles: [peg({ costume: 'snowman', at: 0.35, line: 'right' }), peg({ costume: 'snowman', at: 0.7, line: 'left' })],
    },
    // (Not in the design: the recipe's braking zone needs a straight before the one sharp bend.)
    {
      name: 'Run to the hairpin', shape: straight(60, { grade: 0.13 }), scenery: ['rocks'],
      obstacles: [slalom({ from: 0.15, to: 0.6, count: 3, loss: 0.3 })],
    },
    { name: 'Hairpin', shape: hairpin({ side: 'left' }), scenery: ['rocks'] },
    // The track's big feature: down the Escornacrabes, the resort's steepest couloir, a long steep drop.
    { name: 'Escornacrabes', shape: plunge(80, { grade: 0.4, from: 0.16 }), overhead: ['vulture'], scenery: ['rocks'] },
    {
      name: 'Valley sweep', shape: sweep({ side: 'left', radius: 80, degrees: 130, grade: 0.12 }), scenery: ['pines'], billboards: 2,
      obstacles: [peg({ costume: 'snowman', at: 0.3, line: 'right' }), peg({ costume: 'snowman', at: 0.65, line: 'left' })],
    },
    {
      name: 'Forest S-bends', shape: sBends({ first: 'right', radius: 60, degrees: 100, grade: 0.14 }), scenery: ['pines'], billboards: 1,
      obstacles: [peg({ costume: 'snowman', at: 0.3, line: 'left' }), peg({ costume: 'snowman', at: 0.7, line: 'right' })],
    },
    {
      name: 'Into the village', shape: straight(80, { grade: 0.14 }), scenery: ['stone-houses'], billboards: 1,
      features: [brake({ at: 0.05, length: 12, drag: 0.02 })],
      obstacles: [parked({ costume: 'snowmobile', at: 0.3, side: 'right', length: 8 }), slalom({ from: 0.5, to: 0.9, count: 4, loss: 0.3 })],
    },
    { name: 'Finish', shape: runIn(), scenery: ['stone-houses'] },
  ],
});
