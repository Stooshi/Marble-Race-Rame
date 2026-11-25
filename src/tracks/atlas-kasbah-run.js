'use strict';

// Atlas Kasbah Run (Moses, 16 Nov 2026: ten more Coasters tracks; one of the four Wild ones). A coaster through a
// mud-brick kasbah at the foot of the Atlas Mountains: from a minaret, out of the sand trap and past the camel
// caravan, through the palm grove, then the big feature: a half-pipe swinging between the kasbah's high earthen walls
// and through its covered market, the hairpin by the mosque, a sweep across the river bed and the run to the camp.
// No names on anything.
const { track, opening, straight, sweep, sBends, hairpin, halfPipe, plunge, runIn, peg, slalom, brake } = require('../trackKit');

module.exports = track({
  slug: 'atlas-kasbah-run',
  name: 'Atlas Kasbah Run',
  family: 'coaster',
  difficulty: 'hard',
  description: 'A coaster through a mud-brick kasbah at the foot of the Atlas Mountains: down from a minaret, past the camel caravan, through the palm grove, swinging between the kasbah\'s high earthen walls and through its covered market, past the mosque and across the river bed to the camp.',
  surface: 'ice',
  biome: 'desert',
  lighting: 'sunset',
  variants: ['day'],
  coaster: { height: 14, colours: { support: '#a8643a', rail: '#f0e2c8', tie: '#4a3020' } },
  signature: 'Between the kasbah walls',
  tvCameras: [
    // (At the end of the half-pipe, looking back at the field swinging between the walls.)
    { section: 'Between the kasbah walls', at: 0.95, side: 'right', distance: 10, height: 12 },
    { section: 'Across the river bed', at: 0.2, side: 'left', distance: 10, height: 10 },
  ],
  start: { landmark: 'kasbah', scenery: ['palms'], type: 'minaret', gate: 'stalls', shots: { countdown: 'side', launch: 'look-back' } },
  finish: { landmark: 'bedouin-camp', billboards: 1 },
  opening: opening('rumble-start', {
    side: 'right',
    costumes: { block: 'camel', slalom: 'rope-post' },
    waves: { groups: 5, gap: 0.12, jitter: 0.04 },
    dress: {},
  }),
  sections: [
    {
      name: 'Past the caravan', shape: sweep({ side: 'left', radius: 80, degrees: 70, grade: 0.14 }), height: 10, billboards: 2,
      landmarks: [{ name: 'caravan', at: 0.5, side: 'right', distance: 30 }],
      obstacles: [peg({ costume: 'rope-post', at: 0.35, line: 'right' }), peg({ costume: 'rope-post', at: 0.7, line: 'left' })],
    },
    {
      name: 'Palm grove', shape: sBends({ first: 'right', radius: 70, degrees: 50, grade: 0.16 }), height: 8,
      landmarks: [{ name: 'palm-grove', at: 0.5, side: 'left', distance: 26 }],
      obstacles: [slalom({ costume: 'rope-post', from: 0.3, to: 0.8, count: 4, loss: 0.25 })],
    },
    { name: 'To the walls', shape: straight(40, { grade: 0.14 }), height: 4, obstacles: [peg({ costume: 'rope-post', at: 0.6, line: 'left' })], features: [brake({ at: 0.05, length: 14, drag: 0.03 })] },
    {
      name: 'Between the kasbah walls', shape: halfPipe({ first: 'left', width: 8, swings: 2, radius: 130, degrees: 22, grade: 0.13 }), height: 0,
      landmarks: [{ name: 'kasbah', at: 0.5, side: 'right', distance: 26 }],
    },
    { name: 'Through the market', shape: straight(40, { grade: 0.13 }), height: 0, tunnel: 'bazaar' },
    {
      name: 'Kasbah lanes', shape: sBends({ first: 'right', radius: 60, degrees: 50, grade: 0.14 }), height: 2,
      obstacles: [peg({ costume: 'rope-post', at: 0.3, line: 'left' }), peg({ costume: 'rope-post', at: 0.65, line: 'center' })],
    },
    {
      name: 'Mosque bends', shape: sBends({ first: 'left', radius: 65, degrees: 55, grade: 0.16 }), height: 6,
      landmarks: [{ name: 'mud-mosque', at: 0.5, side: 'right', distance: 28 }],
      obstacles: [peg({ costume: 'rope-post', at: 0.3, line: 'center' }), peg({ costume: 'rope-post', at: 0.7, line: 'right' })],
    },
    { name: 'To the hairpin', shape: straight(35, { grade: 0.13 }), height: 8, features: [brake({ at: 0.05, length: 14, drag: 0.03 })] },
    { name: 'Mosque hairpin', shape: hairpin({ side: 'right' }), height: 8 },
    { name: 'Down to the river bed', shape: plunge(40, { grade: 0.24, from: 0.14 }), height: 4 },
    {
      name: 'Across the river bed', shape: sweep({ side: 'right', radius: 85, degrees: 60, grade: 0.14 }), height: 6, billboards: 2,
      obstacles: [slalom({ costume: 'rope-post', from: 0.3, to: 0.7, count: 4, loss: 0.3 })],
    },
    {
      name: 'Run to the camp', shape: straight(55, { grade: 0.15 }), height: 0,
      obstacles: [peg({ costume: 'rope-post', at: 0.35, line: 'left' }), peg({ costume: 'rope-post', at: 0.7, line: 'right' })],
    },
    { name: 'Finish', shape: runIn(), height: 0 },
  ],
});
