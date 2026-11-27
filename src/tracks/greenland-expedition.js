'use strict';

// Greenland Expedition: an expedition race from the ice sheet down a glacier to the
// icefjord harbour of Ilulissat, in the low golden light of the midnight sun. Moses's
// design ("New Track Designs", 10), built with the track kit. (Sled dogs, a musk ox,
// an Arctic fox and whales: Bobsleigh Run has the polar bear and the icicles.)
const {
  track, opening, plunge, straight, sBends, sweep, spiral, hairpin, runIn,
  slalom, swipe, parked, moguls, peg, brake,
} = require('../trackKit');

module.exports = track({
  slug: 'greenland-expedition',
  name: 'Greenland Expedition',
  difficulty: 'extreme',
  description: 'From an expedition base camp on the ice sheet, over a crevasse and through an ice cave to the icefjord harbour of Ilulissat, under the midnight sun.',
  surface: 'ice',
  biome: 'arctic',
  lighting: 'midnight-sun',
  signature: 'Ice cave',
  tvCameras: [
    // (Out of the ice cave, looking back up into its mouth at the field dropping through it.)
    { section: 'Out of the cave', at: 0.3, side: 'left', distance: 6, height: 8 },
    { section: 'Fjord spiral', at: 0.5, side: 'right', distance: 6, height: 8 },
  ],
  billboardFrame: 'crates',
  // The gate at a base camp on the ice sheet (orange tents, flags, a loaded dog sled); the
  // finish on Ilulissat's harbour front, painted wooden houses and icebergs in the bay.
  start: { landmark: 'base-camp', scenery: ['bare'], gate: 'trapdoor', shots: { countdown: 'side', launch: 'look-back' } },
  finish: { scenery: ['colourful-houses', 'icefjord'] },
  designChanges: [
    'Its own layout (Moses, 15 Nov 2026: World Tour re-layouts): over the sastrugi, a sweep down the glacier, the hairpin past the musk ox, over the crevasse bridge, down through the ice cave (the big feature: a long steep drop inside the glacier), S-bends along the fjord and the run to the harbour.',
    'A snowdrift start (the sand-trap opening, since 15 Nov 2026), the field let go in jittered waves: sled dogs resting on the ice sheet, then route-marker flags (bamboo poles with orange flags, as expeditions mark their way across the ice), glanced off like slalom gates.',
    'The sastrugi ridges lie on a straight of their own: the recipe keeps rows of bumps off bends.',
    'A straight, "Run to the hairpin", before the hairpin: the recipe needs a braking zone before the one sharp bend.',
  ],
  // (The sand-trap start, here a snowdrift: down the ice sheet through deep snow, past the sled dogs resting and the
  // expedition's route-marker flags; let go in jittered waves, a new order every race.)
  opening: opening('sand-trap', {
    costumes: { block: 'sled-dog', slalom: 'route-flag' },
    names: { plunge: 'Through the snowdrift' },
    waves: { groups: 5, gap: 0.12, jitter: 0.1 },
  }),
  sections: [
    // The sastrugi: low wind-carved ridges across the ice (on a straight: the recipe keeps rows of bumps off bends).
    { name: 'Sastrugi ridges', shape: straight(55, { grade: 0.13 }), features: [moguls({ from: 0.3, to: 0.9, count: 5 })], scenery: ['bare'] },
    {
      name: 'Glacier sweep', shape: sweep({ side: 'left', radius: 80, degrees: 140, grade: 0.13 }), billboards: 2, scenery: ['bare'],
    },
    // (Not in the design: the recipe's braking zone needs a straight before the one sharp bend.)
    {
      name: 'Run to the hairpin', shape: straight(55, { grade: 0.13 }), scenery: ['rocks'],
      obstacles: [peg({ costume: 'route-flag', at: 0.3, line: 'left' }), peg({ costume: 'route-flag', at: 0.55, line: 'right' })],
    },
    { name: 'Hairpin', shape: hairpin({ side: 'right' }), obstacles: [swipe({ costume: 'musk-ox', side: 'high' })], scenery: ['rocks'] },
    { name: 'Crevasse bridge', shape: straight(50, { grade: 0.15 }), bridge: 'ice' },
    // The track's big feature: a long steep drop through an ice cave inside the glacier.
    { name: 'Ice cave', shape: plunge(110, { grade: 0.4, from: 0.16 }), tunnel: 'ice-cave' },
    { name: 'Out of the cave', shape: straight(50, { grade: 0.14 }), billboards: 1, scenery: ['bare'] },
    {
      name: 'Fjord S-bends', shape: sBends({ first: 'right', radius: 70, degrees: 80, grade: 0.13 }), figures: ['arctic-fox'], scenery: ['rocks'],
      obstacles: [peg({ costume: 'route-flag', at: 0.3, line: 'left' }), peg({ costume: 'route-flag', at: 0.7, line: 'right' })],
    },
    { name: 'Fjord spiral', shape: spiral({ side: 'left', radius: 45, grade: 0.15 }), scenery: ['icefjord'] },
    {
      name: 'Harbour straight', shape: straight(80, { grade: 0.14 }), billboards: 1, scenery: ['colourful-houses'],
      features: [brake({ at: 0.05, length: 12, drag: 0.02 })],
      obstacles: [parked({ costume: 'snowmobile', at: 0.3, side: 'right', length: 8 }), slalom({ costume: 'route-flag', from: 0.55, to: 0.9, count: 3, loss: 0.3 })],
    },
    { name: 'Finish', shape: runIn(), scenery: ['colourful-houses', 'icefjord'] },
  ],
});
