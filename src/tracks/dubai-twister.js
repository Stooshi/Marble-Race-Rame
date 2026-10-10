'use strict';

// Dubai Twister: from the red desert dunes into futuristic Dubai, ending on the Palm.
// Moses's design ("New Track Designs", 4), built with the track kit. The surface looks
// like sand in the desert and polished stone in the city, and races as ice throughout.
const {
  track, plunge, straight, sBends, sweep, spiral, hairpin, splitter, runIn,
  pileUp, swipe, parked, slalom, boost, brake,
} = require('../trackKit');

module.exports = track({
  slug: 'dubai-twister',
  name: 'Dubai Twister',
  difficulty: 'extreme',
  description: 'From the red desert dunes past an oasis into futuristic Dubai, round the twisting tower and down to the Palm.',
  surface: 'sand',
  biome: 'desert',
  lighting: 'day',
  variants: ['sunset'],
  signature: 'The Twister',
  billboardFrame: 'led',
  // The gate on the crest of a tall red dune beside a Bedouin tent and resting camels; the
  // finish on the Palm Jumeirah boardwalk, the Burj Khalifa in the distance behind the line.
  start: { landmark: 'bedouin-camp', scenery: ['bare'] },
  finish: { landmark: 'burj-khalifa', scenery: ['skyscrapers'] },
  designChanges: [
    'Desert rally marker flags down the dune plunge after the kneeling camels, glanced off like slalom gates: with camels alone the strongest marbles win too often and the field reaches the splitter sorted by strength.',
    'The dune buggy is parked on the sand beside the S-bends, not on the track: a parked object on a bend trapped the slowest marble against it for up to 8 s (the last one home at 89 s), so the recipe now keeps parked objects to straights.',
    'A 50 m straight, "Run to the falcon", before the hairpin: the recipe needs a braking zone before the one sharp bend; its first 15 m are a drift of sand blown across the road (a braking stretch), which bunches the field so it overtakes enough.',
  ],
  sections: [
    {
      name: 'Dune plunge', shape: plunge(80, { grade: 0.6 }),
      obstacles: [pileUp({ costume: 'camel', at: 0.42 }), slalom({ costume: 'rally-flag', from: 0.55, to: 0.97, count: 6, loss: 0.3 })], scenery: ['bare'],
    },
    {
      name: 'Dune S-bends', shape: sBends({ first: 'left', radius: 75, degrees: 80, grade: 0.13 }),
      landmarks: [{ name: 'dune-buggy', at: 0.5, side: 'left', distance: 6 }], scenery: ['bare'], billboards: 1,
    },
    {
      name: 'Oasis splitter', shape: splitter({ side: 'left', balance: { tipOffset: -0.8, left: { drag: 1.32, scrub: 1.32 }, right: { drag: 0.42, scrub: 0.72 } } }),
      around: 'oasis',
    },
    {
      name: 'Skyline sweep', shape: sweep({ side: 'right', radius: 80, degrees: 160, grade: 0.07 }), surface: 'stone', features: [boost({ at: 0.08 })], billboards: 2,
      landmarks: [{ name: 'museum-of-the-future', at: 0.3, side: 'left', distance: 20 }, { name: 'dubai-frame', at: 0.75, side: 'left', distance: 24 }], scenery: ['skyscrapers'],
    },
    // (Not in the design: the recipe's braking zone needs a straight before the one sharp bend.)
    { name: 'Run to the falcon', shape: straight(50, { grade: 0.13 }), surface: 'stone', features: [brake({ at: 0.25, length: 15 })], billboards: 1, scenery: ['skyscrapers'] },
    { name: 'Falcon hairpin', shape: hairpin({ side: 'left' }), surface: 'stone', obstacles: [swipe({ costume: 'falcon', side: 'high' })] },
    // The longest, smoothest spiral of all the tracks, round a twisting skyscraper.
    { name: 'The Twister', shape: spiral({ side: 'right', radius: 50, turns: 1.2, grade: 0.18 }), surface: 'stone', around: 'twisted-tower', scenery: ['skyscrapers'] },
    {
      name: 'Burj Al Arab plunge', shape: straight(90, { grade: 0.2 }), surface: 'stone',
      obstacles: [parked({ costume: 'sports-car', at: 0.4, side: 'right', length: 9 })],
      landmarks: [{ name: 'burj-al-arab', at: 0.6, side: 'left', distance: 40 }],
    },
    { name: 'Finish', shape: runIn(), surface: 'stone', landmarks: [{ name: 'palm-boardwalk', at: 0.5, side: 'left', distance: 8 }] },
  ],
});
