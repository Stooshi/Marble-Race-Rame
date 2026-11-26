'use strict';

// Sognefjord: the Coaster Series' proof track (built with the coaster kit first, as its
// design asks). Up on the tallest steel supports over Norway's longest fjord, down past a
// waterfall, through the fjord wall and round to a village on the water.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'sognefjord',
  name: 'Sognefjord',
  family: 'coaster',
  difficulty: 'extreme',
  description: 'A coaster on towering steel supports: off the cliff top past a stave church, high over Norway\'s longest fjord, down past a waterfall and through the fjord wall, round to a village on the water where cruise ships pass.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'day',
  coaster: { height: 18, colours: { support: '#2f5d9a', rail: '#d9dde3', tie: '#4a505a' } },
  signature: 'Fjord crossing',
  tvCameras: [
    { section: 'Fjord crossing', at: 0.8, side: 'right', distance: 10, height: 12 },
    { section: 'Fjord spin', at: 0.8, side: 'left', distance: 10, height: 12 },
  ],
  start: { landmark: 'stave-church', scenery: ['pines'], type: 'cliff', gate: 'trapdoor', shots: { countdown: 'side', launch: 'low-chase' } },
  finish: { landmark: 'fjord-village', billboards: 2, scenery: ['wooden-houses'] },
  designChanges: [
    'Built from the libraries: the crest start (its first drop, a pile-up of mossy boulders and a slalom of fishing-net poles, then a camelback over the cliff top) and the long-sweeps layout. The design\'s seven fixed sections are replaced by the layout, as decided for the coaster series; its landmark moments stay: the stave church behind the lift hill, the fjord crossing on the tallest supports, the run past the waterfall through its spray, the mountain tunnel, the troll at the hairpin high over the fjord, the fjord spin and the village station.',
    'No splitter: the long sweeps give the overtakes without one. (On the climb-and-drop layout the fjord splitter could not be balanced: out of the fjord bends the leaders always took its inside channel.)',
    'The waterfall swoop is a run past the falls, over a field of moguls, with the water curtain over the rails; the layout has no drop there.',
    'The mountain tunnel is the straight before the hairpin, its braking zone.',
    'Fishing-net poles stand in the second fjord sweep, and drying nets hang over the quay run.',
  ],
  opening: opening('crest-start', {
    costumes: { block: 'mossy-boulder', slalom: 'net-pole' },
    names: { plunge: 'Lift hill and first drop', climb: 'Cliff-top crest', drop: 'Over the edge' },
    dress: { plunge: { height: 24 }, climb: { height: 18 }, drop: { height: 30 } },
  }),
  sections: layout('long-sweeps', {
    costumes: { swipe: 'fjord-troll', peg: 'net-pole', curtain: 'drying-nets' },
    dress: {
      sweep1: { name: 'Fjord crossing', height: 40, water: true },
      moguls: { name: 'Waterfall run', height: 8, waterCurtain: true, landmarks: [{ name: 'waterfall-cliff', at: 0.5, side: 'left', distance: 42 }] },
      sweep2: { name: 'Fjord bends', height: 30, water: true, landmarks: [{ name: 'cruise-ship', at: 0.5, side: 'left', distance: 60 }] },
      brakingStraight: { name: 'Mountain tunnel', tunnel: 'rock', billboards: 0 },
      hairpin: { name: 'Troll hairpin', height: 30, water: true, landmarks: [{ name: 'ledge-farm', at: 0.5, side: 'right', distance: 30 }] },
      spiral: { name: 'Fjord spin', height: 14 },
      lastStraight: { name: 'Quay run', height: 3 },
    },
  }),
});
