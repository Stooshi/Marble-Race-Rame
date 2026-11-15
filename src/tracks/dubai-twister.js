'use strict';

// Dubai Twister: from the red desert dunes into futuristic Dubai, ending on the Palm.
// Moses's design ("New Track Designs", 4), built with the track kit. The surface looks
// like sand in the desert and polished stone in the city, and races as ice throughout.
const {
  track, opening, plunge, straight, sBends, sweep, spiral, hairpin, runIn,
  climb, parked, slalom, brake,
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
  tvCameras: [
    // (Near the foot of the tower, looking back up the spiral at the field winding down it.)
    { section: 'The Twister', at: 0.85, side: 'left', distance: 6, height: 12 },
    { section: 'Skyline S-bends', at: 0.5, side: 'right', distance: 6, height: 6 },
  ],
  billboardFrame: 'led',
  // The gate on the crest of a tall red dune beside a Bedouin tent and resting camels; the
  // finish on the Palm Jumeirah boardwalk, the Burj Khalifa in the distance behind the line.
  start: { landmark: 'bedouin-camp', scenery: ['bare'], gate: 'barrier', shots: { countdown: 'front', launch: 'overhead' } },
  finish: { landmark: 'burj-khalifa', scenery: ['skyscrapers'] },
  designChanges: [
    'Its own layout and opening (Moses, 15 Nov 2026: World Tour re-layouts): through the dunes (the sand-trap start, the field let go in waves) past the kneeling camels and rally flags, up a red dune and down its face, a sweep over the dunes, the hairpin, S-bends through the skyline, the Twister (the big feature: the longest, smoothest spiral of all the tracks, round a twisting skyscraper), the drop past the Burj Al Arab and the Palm.',
    'The dune buggy is parked on the sand beside the sweep, not on the track: a parked object on a bend traps marbles, so the recipe keeps parked objects to straights.',
    'No falcon swooping at the hairpin since 15 Nov 2026: knocked marbles fell far behind (the gap from first to last went over the report\'s limit).',
    'A straight, "Run to the falcon", before the hairpin: the recipe needs a braking zone before the one sharp bend; its first metres are a drift of sand blown across the road.',
  ],
  // (The sand-trap start: down the dune through deep sand, past the kneeling camels and the rally flags; let go in
  // jittered waves, a new order every race.)
  opening: opening('sand-trap', {
    costumes: { block: 'camel', slalom: 'rally-flag' },
    names: { plunge: 'Through the dunes' },
    waves: { groups: 5, gap: 0.12, jitter: 0.1 },
  }),
  sections: [
    { name: 'Up the red dune', shape: climb(8, { grade: -0.03, after: 0.3 }), scenery: ['bare'] },
    { name: 'Down the dune face', shape: plunge(45, { grade: 0.4, from: 0.3 }), scenery: ['bare'], billboards: 1 },
    {
      name: 'Dune sweep', shape: sweep({ side: 'right', radius: 80, degrees: 130, grade: 0.12 }),
      landmarks: [{ name: 'dune-buggy', at: 0.5, side: 'left', distance: 6 }], scenery: ['bare'],
    },
    // (Not in the design: the recipe's braking zone needs a straight before the one sharp bend.)
    {
      name: 'Run to the falcon', shape: straight(60, { grade: 0.13 }), surface: 'stone', billboards: 1, scenery: ['skyscrapers'],
      obstacles: [slalom({ costume: 'rally-flag', from: 0.2, to: 0.6, count: 3, loss: 0.3 })],
    },
    { name: 'Falcon hairpin', shape: hairpin({ side: 'right' }), surface: 'stone' },
    {
      name: 'Skyline S-bends', shape: sBends({ first: 'right', radius: 70, degrees: 80, grade: 0.14 }), surface: 'stone', billboards: 2,
      landmarks: [{ name: 'museum-of-the-future', at: 0.3, side: 'left', distance: 20 }, { name: 'dubai-frame', at: 0.75, side: 'right', distance: 24 }], scenery: ['skyscrapers'],
    },
    { name: 'To the tower', shape: straight(35, { grade: 0.12 }), surface: 'stone', scenery: ['skyscrapers'] },
    // The longest, smoothest spiral of all the tracks, round a twisting skyscraper: the track's big feature.
    { name: 'The Twister', shape: spiral({ side: 'left', radius: 50, turns: 1.2, grade: 0.16 }), surface: 'stone', around: 'twisted-tower', scenery: ['skyscrapers'] },
    {
      name: 'Burj Al Arab plunge', shape: plunge(50, { grade: 0.3, from: 0.16 }), surface: 'stone',
      landmarks: [{ name: 'burj-al-arab', at: 0.6, side: 'right', distance: 40 }],
    },
    {
      name: 'Along the Palm', shape: straight(80, { grade: 0.13 }), surface: 'stone', billboards: 1,
      features: [brake({ at: 0.05, length: 12, drag: 0.02 })],
      obstacles: [parked({ costume: 'sports-car', at: 0.3, side: 'right', length: 9 }), slalom({ costume: 'rally-flag', from: 0.55, to: 0.9, count: 3, loss: 0.35 })],
    },
    { name: 'Finish', shape: runIn(), surface: 'stone', landmarks: [{ name: 'palm-boardwalk', at: 0.5, side: 'left', distance: 8 }] },
  ],
});
