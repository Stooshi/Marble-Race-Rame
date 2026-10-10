'use strict';

const { track, plunge, straight, sBends, sweep, spiral, hairpin, splitter, runIn, pileUp, swipe, parked, slalom, boost, rumble } = require('../trackKit');

module.exports = track({
  slug: 'delhi-red-fort-marble-grand-prix',
  name: 'Delhi Red Fort Marble Grand Prix',
  difficulty: 'extreme',
  description: 'From the ramparts of the Red Fort and out under its great gateway, through the bustle of Chandni Chowk and past the Jama Masjid, down onto the ceremonial avenue to India Gate.',
  surface: 'asphalt',
  biome: 'city',
  lighting: 'day',
  variants: ['sunset'],
  grandPrix: { barrier: 'marigolds' },
  signature: 'Rampart plunge',
  billboardFrame: 'plain',
  start: { landmark: 'red-fort', scenery: ['grandstand'] },
  finish: { landmark: 'india-gate', scenery: ['grandstand'] },
  designChanges: [
    'The traffic-cone chicane is at the foot of the Rampart plunge, straight after the tyre stacks, rather than on the finish straight: a start with only the tyre stacks lets the strongest marbles win too often and sends the field into the splitter sorted by strength.',
    'The fort\'s gateway stands over the foot of the plunge, 85 m from the gate, rather than at its top: higher up the channel is still the starting funnel, wider than the gateway\'s arch.',
    'The parked auto-rickshaw stands on a straight, "Run to the hairpin", rather than in the Chandni Chowk S-bends: the recipe keeps parked objects to straights (on a bend one traps marbles against it).',
    'The Garden splitter comes straight after the Chandni Chowk S-bends, before the Mosque sweep, rather than after the hairpin: out of the hairpin the whole field rides one side of the channel and the splitter cannot share it out fairly (measured on Dubai Marble Grand Prix).',
    'A 50 m straight before the hairpin: the recipe needs a braking zone before the one sharp bend.',
    'The rumble strips are on a straight, "Kartavya Path", between the spiral and the finish rather than on the spiral: the recipe keeps bumps off bends (marbles high on the wall are thrown off them). The marigold garlands hang on the barriers round every bend.',
  ],
  sections: [
    {
      name: 'Rampart plunge', shape: plunge(80, { grade: 0.6 }),
      obstacles: [pileUp({ costume: 'tyre-stack', at: 0.42 }), slalom({ costume: 'traffic-cone', from: 0.55, to: 0.97, count: 6, loss: 0.3 })],
      landmarks: [{ name: 'red-fort-gate', at: 0.86, over: true }],
    },
    { name: 'Chandni Chowk S-bends', shape: sBends({ first: 'left', radius: 75, degrees: 80, grade: 0.13 }), billboards: 2, scenery: ['market-stalls', 'crowd'] },
    {
      name: 'Garden splitter', shape: splitter({ side: 'left', balance: { tipOffset: -0.8, left: { drag: 1.32, scrub: 1.32 }, right: { drag: 0.42, scrub: 0.72 } } }),
      around: 'mughal-fountain', scenery: ['plane-trees'],
    },
    {
      name: 'Mosque sweep', shape: sweep({ side: 'right', radius: 80, degrees: 160, grade: 0.07 }), features: [boost({ at: 0.08 })], billboards: 3,
      landmarks: [{ name: 'jama-masjid', at: 0.5, side: 'left', distance: 40 }],
    },
    {
      name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), billboards: 1, scenery: ['market-stalls'],
      obstacles: [parked({ costume: 'auto-rickshaw', at: 0.08, side: 'right', length: 5 })],
    },
    { name: 'Hairpin', shape: hairpin({ side: 'left' }), obstacles: [swipe({ costume: 'camera-crane', side: 'high' })] },
    { name: 'Avenue spiral', shape: spiral({ side: 'right', radius: 45, grade: 0.17 }), scenery: ['plane-trees'] },
    {
      name: 'Kartavya Path', shape: straight(90, { grade: 0.15 }), features: [rumble({ from: 0.45, to: 0.95, count: 5 })], billboards: 2,
      scenery: ['grandstand', 'plane-trees'],
    },
    { name: 'Finish', shape: runIn(), scenery: ['grandstand'] },
  ],
});
