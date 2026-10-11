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
  start: { landmark: 'stave-church', scenery: ['pines'] },
  finish: { landmark: 'fjord-village', billboards: 1, scenery: ['wooden-houses'] },
  designChanges: [
    'Built from the libraries: the crest start (its first drop, a pile-up of mossy boulders and a slalom of fishing-net poles, then a camelback over the cliff top) and the climb-and-drop layout. The design\'s seven fixed sections are replaced by the layout, as decided for the coaster series; its landmark moments stay: the stave church behind the lift hill, the fjord crossing on the tallest supports, the waterfall swoop through the spray, the mountain tunnel, the troll at the hairpin high over the fjord, the fjord spin and the village station.',
    'The layout adds a splitter over the fjord (two sets of rails side by side), which the coaster series needs for its overtakes, and a short climb over a ledge before the waterfall swoop.',
    'The mountain tunnel is the straight before the hairpin, its braking zone.',
    'The slalom of fishing-net poles is in the first drop and the waterfall swoop (where the layouts put their slaloms), not the fjord spin: the layouts keep spirals clear of obstacles.',
    'No parked fishing boat at the quay: the climb-and-drop layout ends with a clear run to the station, so the quay keeps its boats beside the track as scenery.',
  ],
  opening: opening('crest-start', {
    costumes: { block: 'mossy-boulder', slalom: 'net-pole' },
    names: { plunge: 'Lift hill and first drop', climb: 'Cliff-top crest', drop: 'Over the edge' },
    dress: { plunge: { height: 24 }, climb: { height: 18 }, drop: { height: 30 } },
  }),
  sections: layout('climb-drop', {
    costumes: { swipe: 'fjord-troll', slalom: 'net-pole' },
    dress: {
      sweep: { name: 'Fjord crossing', height: 40, water: true },
      approach: { name: 'Towards the falls', height: 24 },
      climb: { name: 'Over the ledge', height: 16 },
      drop: { name: 'Waterfall swoop', height: 6, waterCurtain: true, landmarks: [{ name: 'waterfall-cliff', at: 0.5, side: 'left', distance: 42 }] },
      sBends: { name: 'Fjord bends', height: 26, water: true },
      splitter: { name: 'Fjord splitter', height: 32, water: true, landmarks: [{ name: 'cruise-ship', at: 0.5, side: 'right', distance: 60 }] },
      brakingStraight: { name: 'Mountain tunnel', tunnel: 'rock' },
      hairpin: { name: 'Troll hairpin', height: 30, water: true, landmarks: [{ name: 'ledge-farm', at: 0.5, side: 'left', distance: 30 }] },
      spiral: { name: 'Fjord spin', height: 14 },
      lastStraight: { name: 'Quay run', height: 3 },
    },
  }),
});
