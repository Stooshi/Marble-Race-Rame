'use strict';

const { track, plunge, straight, sBends, sweep, spiral, hairpin, splitter, runIn, pileUp, swipe, parked, slalom, boost, rumble } = require('../trackKit');

module.exports = track({
  slug: 'stockholm-marble-grand-prix',
  name: 'Stockholm Marble Grand Prix',
  difficulty: 'extreme',
  description: 'A home race across Stockholm\'s islands and bridges: down the Södermalm cliffs, through Gamla Stan\'s narrow lanes, over the water past City Hall and round Djurgården to the steamboats on Strandvägen.',
  surface: 'asphalt',
  biome: 'city',
  lighting: 'day',
  variants: ['sunset', 'midnight-sun'],
  grandPrix: true,
  signature: 'Bridge sweep',
  billboardFrame: 'plain',
  start: { scenery: ['colourful-houses'] },
  finish: { landmark: 'steamboats', scenery: ['grandstand'] },
  designChanges: [
    'The traffic-cone chicane is at the foot of the Södermalm plunge, straight after the tyre stacks, rather than in the Gamla Stan S-bends: on the bends it left too few overtakes and the field reached the splitter sorted so that one channel never gave its marbles a fair share of wins (measured on Dubai Marble Grand Prix, the same layout).',
    'The Island splitter comes straight after the Gamla Stan S-bends, before the Bridge sweep, rather than after the City Hall hairpin: out of the hairpin the whole field rides one side of the channel and the splitter cannot share it out fairly (measured on Dubai Marble Grand Prix).',
    'At the Island splitter the two channels run on the island\'s shores either side of it rather than each on its own bridge: the recipe allows no bridge under a splitter (its two channels have nothing proven to stand on).',
    'The Bridge sweep\'s billboards stand along the straight to City Hall instead: the recipe has nowhere to stand a billboard on a bridge.',
    'A 50 m straight, "Run to City Hall", before the City Hall hairpin: the recipe needs a braking zone before the one sharp bend.',
    'The rumble strips and the parked safety car are on a straight, "Strandvägen", between the spiral and the finish rather than on the spiral and the run-in: the recipe keeps bumps off bends and the last 25 m before the line clear.',
  ],
  sections: [
    {
      name: 'Södermalm plunge', shape: plunge(80, { grade: 0.6 }),
      obstacles: [pileUp({ costume: 'tyre-stack', at: 0.42 }), slalom({ costume: 'traffic-cone', from: 0.55, to: 0.97, count: 6, loss: 0.3 })],
      scenery: ['colourful-houses'],
    },
    {
      name: 'Gamla Stan S-bends', shape: sBends({ first: 'right', radius: 75, degrees: 80, grade: 0.13 }), billboards: 2, scenery: ['merchant-houses', 'crowd'],
      landmarks: [{ name: 'royal-palace', at: 0.7, side: 'left', distance: 34 }],
    },
    {
      name: 'Island splitter', shape: splitter({ side: 'right', balance: { tipOffset: 0.8, left: { drag: 0.42, scrub: 0.72 }, right: { drag: 1.32, scrub: 1.32 } } }),
      around: 'river-island', landmarks: [{ name: 'harbour', at: 0.5, side: 'left', distance: 24 }],
    },
    { name: 'Bridge sweep', shape: sweep({ side: 'left', radius: 80, degrees: 160, grade: 0.07 }), features: [boost({ at: 0.08 })], bridge: 'steel' },
    {
      name: 'Run to City Hall', shape: straight(50, { grade: 0.12 }), billboards: 2,
      landmarks: [{ name: 'city-hall', at: 0.9, side: 'left', distance: 36 }],
    },
    { name: 'City Hall hairpin', shape: hairpin({ side: 'right' }), obstacles: [swipe({ costume: 'camera-crane', side: 'high' })] },
    {
      name: 'Djurgården spiral', shape: spiral({ side: 'left', radius: 45, grade: 0.17 }), scenery: ['birches'],
      landmarks: [{ name: 'vasa-museum', at: 0.6, side: 'right', distance: 30 }],
    },
    {
      name: 'Strandvägen', shape: straight(90, { grade: 0.15 }),
      obstacles: [parked({ costume: 'safety-car', at: 0.15, side: 'left', length: 8 })],
      features: [rumble({ from: 0.55, to: 0.95, count: 4 })], billboards: 2, scenery: ['grandstand', 'haussmann'],
    },
    { name: 'Finish', shape: runIn(), scenery: ['grandstand'] },
  ],
});
