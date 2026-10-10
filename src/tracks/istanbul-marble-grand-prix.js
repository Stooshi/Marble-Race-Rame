'use strict';

const { track, plunge, straight, sBends, sweep, spiral, hairpin, splitter, runIn, pileUp, swipe, parked, slalom, boost, rumble } = require('../trackKit');

module.exports = track({
  slug: 'istanbul-marble-grand-prix',
  name: 'Istanbul Marble Grand Prix',
  difficulty: 'extreme',
  description: 'From the Galata Tower down to the Golden Horn, through the vaulted halls of the Grand Bazaar and past Hagia Sophia and the Blue Mosque to the Bosphorus.',
  surface: 'asphalt',
  biome: 'city',
  lighting: 'day',
  variants: ['sunset'],
  grandPrix: true,
  signature: 'Grand Bazaar tunnel',
  billboardFrame: 'plain',
  start: { landmark: 'galata-tower', scenery: ['colourful-houses'] },
  finish: { landmark: 'bosphorus-bridge', scenery: ['grandstand'] },
  designChanges: [
    'The traffic-cone chicane is at the foot of the Galata plunge, straight after the tyre stacks, rather than on the finish straight: a start with only the tyre stacks lets the strongest marbles win too often and sends the field into the splitter sorted by strength.',
    'The parked simit cart stands on the waterfront straight before the finish rather than in the Golden Horn S-bends: the recipe keeps parked objects to straights (on a bend one traps marbles against it).',
    'The Tulip splitter comes straight after the Golden Horn S-bends, before the Grand Bazaar, rather than after the Palace hairpin: out of the hairpin the whole field rides one side of the channel and the splitter cannot share it out fairly (measured on Dubai Marble Grand Prix).',
    'The Grand Bazaar\'s vaulted halls are the 50 m straight before the Palace hairpin, its braking zone, rather than a stretch of their own between the S-bends and the Old City sweep: the recipe needs a braking zone before the one sharp bend, and a longer straight after the splitter left too few overtakes (59 a race; 60 needed).',
    'The rumble strips are on the waterfront straight between the spiral and the finish rather than on the spiral: the recipe keeps bumps off bends (marbles high on the wall are thrown off them).',
  ],
  sections: [
    {
      name: 'Galata plunge', shape: plunge(80, { grade: 0.6 }),
      obstacles: [pileUp({ costume: 'tyre-stack', at: 0.42 }), slalom({ costume: 'traffic-cone', from: 0.55, to: 0.97, count: 6, loss: 0.3 })],
      scenery: ['colourful-houses'],
    },
    {
      name: 'Golden Horn S-bends', shape: sBends({ first: 'left', radius: 75, degrees: 80, grade: 0.13 }), billboards: 2, scenery: ['crowd'],
      landmarks: [{ name: 'harbour', at: 0.5, side: 'right', distance: 26 }],
    },
    {
      name: 'Tulip splitter', shape: splitter({ side: 'left', balance: { tipOffset: -0.8, left: { drag: 1.32, scrub: 1.32 }, right: { drag: 0.42, scrub: 0.72 } } }),
      around: 'tulip-garden',
    },
    {
      name: 'Old City sweep', shape: sweep({ side: 'right', radius: 80, degrees: 160, grade: 0.07 }), features: [boost({ at: 0.08 })], billboards: 4,
      landmarks: [{ name: 'hagia-sophia', at: 0.15, side: 'left', distance: 45 }, { name: 'blue-mosque', at: 0.45, side: 'left', distance: 45 }],
    },
    { name: 'Grand Bazaar tunnel', shape: straight(50, { grade: 0.12 }), tunnel: 'bazaar' },
    { name: 'Palace hairpin', shape: hairpin({ side: 'left' }), obstacles: [swipe({ costume: 'camera-crane', side: 'high' })], scenery: ['plane-trees'] },
    { name: 'Waterfront spiral', shape: spiral({ side: 'right', radius: 45, grade: 0.17 }) },
    {
      name: 'Waterfront straight', shape: straight(90, { grade: 0.15 }),
      obstacles: [parked({ costume: 'simit-cart', at: 0.15, side: 'right', length: 4 })],
      features: [rumble({ from: 0.55, to: 0.95, count: 4 })], billboards: 2, scenery: ['grandstand'],
      landmarks: [{ name: 'harbour', at: 0.5, side: 'left', distance: 26 }],
    },
    { name: 'Finish', shape: runIn(), scenery: ['grandstand'] },
  ],
});
