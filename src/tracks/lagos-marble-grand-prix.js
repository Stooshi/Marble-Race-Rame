'use strict';

const { track, plunge, straight, sBends, sweep, spiral, hairpin, splitter, runIn, pileUp, swipe, parked, slalom, boost, rumble } = require('../trackKit');

module.exports = track({
  slug: 'lagos-marble-grand-prix',
  name: 'Lagos Marble Grand Prix',
  difficulty: 'extreme',
  description: 'A loud, colourful race across Lagos: down from a ramp above Lagos Island, through a busy market, over the lagoon on a long bridge and down to the National Theatre.',
  surface: 'asphalt',
  biome: 'city',
  lighting: 'day',
  variants: ['sunset'],
  grandPrix: true,
  signature: 'Lagoon bridge sweep',
  billboardFrame: 'led',
  start: { landmark: 'lagos-skyline', scenery: ['grandstand'] },
  finish: { landmark: 'national-theatre', scenery: ['grandstand'] },
  designChanges: [
    'The traffic-cone chicane is at the foot of the Island plunge, straight after the tyre stacks, rather than on the finish straight: a start with only the tyre stacks lets the strongest marbles win too often and sends the field into the splitter sorted by strength.',
    'The parked danfo minibus stands on a straight, "Beach straight", before the finish rather than in the Market S-bends: the recipe keeps parked objects to straights (on a bend one traps marbles against it).',
    'The splitter round the roundabout monument comes straight after the Market S-bends, before the Lagoon bridge, rather than after the Lekki hairpin: out of the hairpin the whole field rides one side of the channel and the splitter cannot share it out fairly (measured on Dubai Marble Grand Prix).',
    'The Lagoon bridge sweep\'s billboards stand along the market and the straights instead: the recipe has nowhere to stand a billboard on a bridge.',
    'A 50 m straight, "Lekki straight", before the Lekki hairpin: the recipe needs a braking zone before the one sharp bend.',
    'The rumble strips are on the Beach straight between the spiral and the finish rather than on the spiral: the recipe keeps bumps off bends (marbles high on the wall are thrown off them).',
  ],
  sections: [
    {
      name: 'Island plunge', shape: plunge(80, { grade: 0.6 }),
      obstacles: [pileUp({ costume: 'tyre-stack', at: 0.42 }), slalom({ costume: 'traffic-cone', from: 0.55, to: 0.97, count: 6, loss: 0.3 })],
    },
    { name: 'Market S-bends', shape: sBends({ first: 'right', radius: 75, degrees: 80, grade: 0.13 }), billboards: 2, scenery: ['market-stalls', 'crowd'] },
    {
      name: 'Roundabout splitter', shape: splitter({ side: 'right', balance: { tipOffset: 0.8, left: { drag: 0.42, scrub: 0.72 }, right: { drag: 1.32, scrub: 1.32 } } }),
      around: 'roundabout-monument',
    },
    { name: 'Lagoon bridge sweep', shape: sweep({ side: 'left', radius: 80, degrees: 160, grade: 0.07 }), features: [boost({ at: 0.08 })], bridge: 'steel' },
    { name: 'Lekki straight', shape: straight(50, { grade: 0.12 }), billboards: 2, scenery: ['crowd'] },
    { name: 'Lekki hairpin', shape: hairpin({ side: 'right' }), obstacles: [swipe({ costume: 'camera-crane', side: 'high' })] },
    { name: 'Beach spiral', shape: spiral({ side: 'left', radius: 45, grade: 0.17 }), scenery: ['palms'] },
    {
      name: 'Beach straight', shape: straight(90, { grade: 0.15 }),
      obstacles: [parked({ costume: 'danfo-bus', at: 0.15, side: 'left', length: 8 })],
      features: [rumble({ from: 0.55, to: 0.95, count: 4 })], billboards: 2, scenery: ['palms', 'grandstand'],
    },
    { name: 'Finish', shape: runIn(), scenery: ['palms', 'grandstand'] },
  ],
});
