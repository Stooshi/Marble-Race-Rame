'use strict';

const { track, plunge, straight, sBends, sweep, spiral, hairpin, splitter, runIn, pileUp, swipe, parked, slalom, boost, rumble } = require('../trackKit');

module.exports = track({
  slug: 'sydney-marble-grand-prix',
  name: 'Sydney Marble Grand Prix',
  difficulty: 'extreme',
  description: 'A harbour race from the top of the Harbour Bridge arch, through The Rocks and round the Opera House to a grandstand finish at Circular Quay.',
  surface: 'asphalt',
  biome: 'city',
  lighting: 'day',
  variants: ['sunset'],
  grandPrix: true,
  signature: 'Arch plunge',
  billboardFrame: 'plain',
  start: { scenery: ['sandstone-terraces'] },
  finish: { landmark: 'opera-house', scenery: ['grandstand'] },
  designChanges: [
    'The traffic-cone chicane is at the foot of the Arch plunge, straight after the tyre stacks, rather than in The Rocks S-bends: on the bends it left too few overtakes and the field reached the splitter sorted so that one channel never gave its marbles a fair share of wins (measured on Dubai Marble Grand Prix, the same layout).',
    'The Opera splitter comes straight after The Rocks S-bends, before the Harbour sweep, rather than after the Botanic hairpin: out of the hairpin the whole field rides one side of the channel and the splitter cannot share it out fairly (measured on Dubai Marble Grand Prix).',
    'A 50 m straight, "Gardens straight", before the Botanic hairpin: the recipe needs a braking zone before the one sharp bend.',
    'The rumble strips and the parked safety car are on a straight, "Quay straight", between the spiral and the finish rather than on the spiral and the run-in: the recipe keeps bumps off bends and the last 25 m before the line clear.',
  ],
  sections: [
    {
      name: 'Arch plunge', shape: plunge(80, { grade: 0.6 }), bridge: 'steel',
      obstacles: [pileUp({ costume: 'tyre-stack', at: 0.42 }), slalom({ costume: 'traffic-cone', from: 0.55, to: 0.97, count: 6, loss: 0.3 })],
    },
    { name: 'The Rocks S-bends', shape: sBends({ first: 'right', radius: 75, degrees: 80, grade: 0.13 }), billboards: 2, scenery: ['sandstone-terraces', 'crowd'] },
    {
      name: 'Opera splitter', shape: splitter({ side: 'right', balance: { tipOffset: 0.8, left: { drag: 0.42, scrub: 0.72 }, right: { drag: 1.32, scrub: 1.32 } } }),
      around: 'opera-house', scenery: ['crowd'],
    },
    {
      name: 'Harbour sweep', shape: sweep({ side: 'left', radius: 80, degrees: 160, grade: 0.07 }), features: [boost({ at: 0.08 })], billboards: 3,
      landmarks: [{ name: 'harbour', at: 0.5, side: 'right', distance: 28 }],
    },
    { name: 'Gardens straight', shape: straight(50, { grade: 0.12 }), billboards: 1, scenery: ['plane-trees'] },
    { name: 'Botanic hairpin', shape: hairpin({ side: 'right' }), obstacles: [swipe({ costume: 'camera-crane', side: 'high' })], scenery: ['plane-trees'] },
    { name: 'Quay spiral', shape: spiral({ side: 'left', radius: 45, grade: 0.17 }) },
    {
      name: 'Quay straight', shape: straight(90, { grade: 0.15 }),
      obstacles: [parked({ costume: 'safety-car', at: 0.15, side: 'left', length: 8 })],
      features: [rumble({ from: 0.55, to: 0.95, count: 4 })], billboards: 2, scenery: ['grandstand'],
      landmarks: [{ name: 'harbour', at: 0.6, side: 'right', distance: 26 }],
    },
    { name: 'Finish', shape: runIn(), scenery: ['grandstand'] },
  ],
});
