'use strict';

// Greenland Expedition: an expedition race from the ice sheet down a glacier to the
// icefjord harbour of Ilulissat, in the low golden light of the midnight sun. Moses's
// design ("New Track Designs", 10), built with the track kit. (Sled dogs, a musk ox,
// an Arctic fox and whales: Bobsleigh Run has the polar bear and the icicles.)
const {
  track, plunge, straight, sBends, sweep, spiral, hairpin, splitter, runIn,
  pileUp, slalom, swipe, parked, boost, moguls,
} = require('../trackKit');

module.exports = track({
  slug: 'greenland-expedition',
  name: 'Greenland Expedition',
  difficulty: 'extreme',
  description: 'From an expedition base camp on the ice sheet, over a crevasse and through an ice cave to the icefjord harbour of Ilulissat, under the midnight sun.',
  surface: 'ice',
  biome: 'arctic',
  lighting: 'midnight-sun',
  signature: 'Crevasse bridge',
  billboardFrame: 'crates',
  // The gate at a base camp on the ice sheet (orange tents, flags, a loaded dog sled); the
  // finish on Ilulissat's harbour front, painted wooden houses and icebergs in the bay.
  start: { landmark: 'base-camp', scenery: ['bare'] },
  finish: { scenery: ['colourful-houses', 'icefjord'] },
  designChanges: [
    'Route-marker flags (bamboo poles with orange flags, as expeditions mark their way across the ice) down the ice-sheet plunge after the sled dogs, glanced off like slalom gates: with dogs alone the field reached the splitter sorted by strength (the report\'s splitter check failed) and overtook too little.',
    'The crevasse bridge comes just after the glacier splitter, not before it: with a straight in front of the splitter the leaders all reach it on one side and take the same channel, so the splitter decides who wins (the report\'s splitter check fails).',
    'The sastrugi ridges lie on a 50 m straight of their own after the glacier splitter ("Sastrugi ridges"), not on the S-bends: the recipe keeps rows of bumps off bends, and ridges just before the splitter sorted the field by strength.',
    'A 50 m straight, "Run to the hairpin", before the hairpin: the recipe needs a braking zone before the one sharp bend.',
  ],
  sections: [
    {
      // Sled dogs resting on the track, then the expedition's route-marker flags down the rest of it.
      name: 'Ice-sheet plunge', shape: plunge(80, { grade: 0.6 }),
      obstacles: [pileUp({ costume: 'sled-dog', at: 0.42 }), slalom({ costume: 'route-flag', from: 0.55, to: 0.97, count: 6, loss: 0.3 })],
      scenery: ['bare'],
    },
    {
      name: 'Sastrugi S-bends', shape: sBends({ first: 'left', radius: 75, degrees: 80, grade: 0.13 }),
      scenery: ['bare'], billboards: 1,
    },
    {
      name: 'Glacier splitter', shape: splitter({ side: 'left', balance: { tipOffset: -0.8, left: { drag: 1.36, scrub: 1.36 }, right: { drag: 0.42, scrub: 0.72 } } }),
      around: 'nunatak', scenery: ['rocks'],
    },
    // The sastrugi: low wind-carved ridges across the ice (on a straight: the recipe keeps rows of bumps off bends).
    { name: 'Sastrugi ridges', shape: straight(50, { grade: 0.15 }), features: [moguls({ from: 0.1, to: 0.9, count: 5 })], scenery: ['bare'] },
    { name: 'Crevasse bridge', shape: straight(50, { grade: 0.15 }), bridge: 'ice' },
    { name: 'Glacier sweep', shape: sweep({ side: 'right', radius: 80, degrees: 140, grade: 0.07 }), features: [boost({ at: 0.08 })], billboards: 2, scenery: ['bare'] },
    // (Not in the design: the recipe's braking zone needs a straight before the one sharp bend.)
    { name: 'Run to the hairpin', shape: straight(50, { grade: 0.15 }), billboards: 1, scenery: ['rocks'] },
    { name: 'Hairpin', shape: hairpin({ side: 'left' }), obstacles: [swipe({ costume: 'musk-ox', side: 'high' })], scenery: ['rocks'] },
    { name: 'Ice cave', shape: plunge(120, { grade: 0.42, from: 0.16 }), tunnel: 'ice-cave' },
    { name: 'Fjord spiral', shape: spiral({ side: 'right', radius: 45, grade: 0.17 }), figures: ['arctic-fox'], scenery: ['rocks'] },
    {
      name: 'Final plunge', shape: straight(80, { grade: 0.2 }),
      obstacles: [parked({ costume: 'snowmobile', at: 0.4, side: 'right', length: 8 })], scenery: ['colourful-houses'],
    },
    { name: 'Finish', shape: runIn(), scenery: ['colourful-houses', 'icefjord'] },
  ],
});
