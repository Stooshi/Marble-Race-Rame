'use strict';

const { track, plunge, straight, sBends, sweep, spiral, hairpin, splitter, runIn, pileUp, swipe, parked, slalom, boost, rumble } = require('../trackKit');

module.exports = track({
  slug: 'nairobi-marble-grand-prix',
  name: 'Nairobi Marble Grand Prix',
  difficulty: 'extreme',
  description: 'The city where wildlife lives beside the skyline: from the KICC tower through Uhuru Park and downtown, then along the national park\'s fence with giraffes and zebras grazing, to a grandstand finish on the plains.',
  surface: 'asphalt',
  biome: 'city',
  lighting: 'day',
  variants: ['sunset'],
  grandPrix: true,
  signature: 'Park boundary run',
  billboardFrame: 'plain',
  start: { landmark: 'kicc-tower', scenery: ['skyscrapers'] },
  finish: { landmark: 'safari-truck', scenery: ['savannah'] },
  designChanges: [
    'The traffic-cone chicane is at the foot of the City plunge, straight after the tyre stacks, rather than in the Uhuru S-bends: on the bends it left too few overtakes and the field reached the splitter sorted so that one channel never gave its marbles a fair share of wins (measured on Dubai Marble Grand Prix, the same layout).',
    'The Acacia splitter comes straight after the Uhuru S-bends, before the Downtown sweep, rather than after the Park boundary run: the proven place for a splitter is after S-bends, where the field arrives mixed, and out of the hairpin the field rides one side of the channel (measured on Dubai Marble Grand Prix).',
    'A 50 m straight, "Run to the hairpin", before the hairpin, and the parked matatu stands there rather than at the hairpin itself: the recipe needs a braking zone before the one sharp bend and keeps parked objects to straights (on a bend one traps marbles against it).',
    'The parked safety car is on a straight, "Plains straight", between the spiral and the finish rather than on the run-in: the recipe keeps the last 25 m before the line clear.',
  ],
  sections: [
    {
      name: 'City plunge', shape: plunge(80, { grade: 0.6 }),
      obstacles: [pileUp({ costume: 'tyre-stack', at: 0.42 }), slalom({ costume: 'traffic-cone', from: 0.55, to: 0.97, count: 6, loss: 0.3 })],
    },
    { name: 'Uhuru S-bends', shape: sBends({ first: 'left', radius: 75, degrees: 80, grade: 0.13 }), billboards: 2, scenery: ['jacarandas', 'crowd'] },
    {
      name: 'Acacia splitter', shape: splitter({ side: 'left', balance: { tipOffset: -0.8, left: { drag: 1.32, scrub: 1.32 }, right: { drag: 0.42, scrub: 0.72 } } }),
      around: 'acacia', scenery: ['jacarandas'],
      landmarks: [{ name: 'safari-truck', at: 0.4, side: 'right', distance: 10 }, { name: 'safari-truck', at: 0.7, side: 'left', distance: 12 }],
    },
    { name: 'Downtown sweep', shape: sweep({ side: 'right', radius: 80, degrees: 160, grade: 0.07 }), features: [boost({ at: 0.08 })], billboards: 3, scenery: ['skyscrapers'] },
    {
      name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), billboards: 1, scenery: ['skyscrapers'],
      obstacles: [parked({ costume: 'matatu', at: 0.08, side: 'right', length: 6 })],
    },
    { name: 'Hairpin', shape: hairpin({ side: 'left' }), scenery: ['grandstand'] },
    {
      name: 'Park boundary run', shape: straight(50, { grade: 0.15 }), features: [rumble({ from: 0.62, to: 0.95, count: 3 })], billboards: 1, scenery: ['savannah'],
      figures: ['giraffe', 'zebra', 'buffalo', 'zebra', 'giraffe'],
      landmarks: [{ name: 'park-fence', at: 0.5, side: 'right', distance: 3 }],
    },
    { name: 'Plains spiral', shape: spiral({ side: 'right', radius: 45, grade: 0.17 }), obstacles: [swipe({ costume: 'camera-crane', at: 0.5, side: 'high' })], scenery: ['savannah'] },
    {
      name: 'Plains straight', shape: straight(40, { grade: 0.15 }), billboards: 1, scenery: ['grandstand', 'savannah'],
      obstacles: [parked({ costume: 'safety-car', at: 0.2, side: 'right', length: 8 })],
    },
    { name: 'Finish', shape: runIn(), scenery: ['savannah'] },
  ],
});
