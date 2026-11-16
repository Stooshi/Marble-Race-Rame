'use strict';

// Lake Como Villa Run (Moses, 16 Nov 2026: ten more Coasters tracks, the pack filled to 20; one of the three Easy
// ones). A coaster along Lake Como: from a clock tower above a lakeside village, the field rolls off together and
// stays together along the lakefront (no obstacle in the first seconds), then the big feature: a long banked spiral
// out over the water round a little island with its church, the villa gardens in S-bends, a hairpin by the ferry
// landing past moored boats, a sweep under the umbrella pines and the run to the boathouse. No names on anything.
const { track, opening, straight, sweep, spiral, sBends, hairpin, runIn, peg, slalom, block, moguls } = require('../trackKit');

module.exports = track({
  slug: 'lake-como-villa-run',
  name: 'Lake Como Villa Run',
  family: 'coaster',
  difficulty: 'easy',
  description: 'A coaster along Lake Como: down from a clock tower above a lakeside village, along the lakefront, round and round a little island church far out over the water, through the villa gardens, past the ferry landing and under the umbrella pines to the boathouse.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'day',
  variants: ['sunset'],
  coaster: { height: 12, colours: { support: '#e8dcc4', rail: '#2f4a5a', tie: '#7a5a3a' } },
  signature: 'Island spiral',
  tvCameras: [
    // (Where the spiral ends, looking back at the field coming round the island over the water.)
    { section: 'Island spiral', at: 0.95, side: 'left', distance: 10, height: 12 },
    { section: 'Under the pines', at: 0.3, side: 'right', distance: 10, height: 10 },
  ],
  start: { landmark: 'lakeside-village', scenery: ['cypress'], type: 'clock-tower', gate: 'paddle', shots: { countdown: 'crane', launch: 'side' } },
  finish: { landmark: 'rowing-boats', billboards: 1 },
  opening: opening('rolling-start', {
    side: 'left',
    costumes: { block: 'buoy', slalom: 'mooring-pole' },
    names: { plunge: 'Down from the tower', bends: 'Village bends' },
    waves: { groups: 5, gap: 0.12, jitter: 0.04 },
    dress: { plunge: { height: 14 }, bends: { height: 10 } },
  }),
  sections: [
    {
      name: 'Along the lakefront', shape: straight(80, { grade: 0.12 }), height: 6, water: true, billboards: 2,
      landmarks: [{ name: 'lakeside-village', at: 0.5, side: 'left', distance: 34 }],
      obstacles: [peg({ costume: 'mooring-pole', at: 0.5, line: 'right' })],
    },
    {
      name: 'Island spiral', shape: spiral({ side: 'right', radius: 46, turns: 1, grade: 0.17 }), height: 14, water: true,
      around: 'lake-island', landmarks: [{ name: 'island-church', at: 0.5, side: 'right', distance: 20 }],
    },
    {
      name: 'Villa gardens', shape: sBends({ first: 'left', radius: 70, degrees: 65, grade: 0.15 }), height: 8, scenery: ['cypress'],
      obstacles: [slalom({ costume: 'mooring-pole', from: 0.25, to: 0.85, count: 5, loss: 0.25 })],
    },
    {
      name: 'To the ferry landing', shape: straight(55, { grade: 0.13 }), height: 4, water: true,
      obstacles: [peg({ costume: 'mooring-pole', at: 0.3, line: 'left' }), peg({ costume: 'mooring-pole', at: 0.55, line: 'right' }), peg({ costume: 'mooring-pole', at: 0.8, line: 'center' })],
    },
    { name: 'Ferry hairpin', shape: hairpin({ side: 'left' }), height: 6, landmarks: [{ name: 'river-ferry', at: 0.5, side: 'left', distance: 22 }] },
    {
      name: 'Villa terraces', shape: sBends({ first: 'right', radius: 65, degrees: 60, grade: 0.17 }), height: 4,
      obstacles: [slalom({ costume: 'mooring-pole', from: 0.2, to: 0.85, count: 5, loss: 0.3 })],
    },
    {
      name: 'Under the pines', shape: sweep({ side: 'left', radius: 80, degrees: 75, grade: 0.13 }), height: 10, billboards: 2,
      landmarks: [{ name: 'umbrella-pines', at: 0.5, side: 'right', distance: 26 }],
      obstacles: [peg({ costume: 'mooring-pole', at: 0.3, line: 'left' }), block({ costume: 'buoy', at: 0.65, line: 'center' })],
    },
    {
      name: 'Promenade bends', shape: sBends({ first: 'right', radius: 70, degrees: 50, grade: 0.15 }), height: 6, water: true,
      obstacles: [peg({ costume: 'mooring-pole', at: 0.3, line: 'right' }), peg({ costume: 'mooring-pole', at: 0.65, line: 'left' })],
    },
    {
      name: 'Run to the boathouse', shape: straight(70, { grade: 0.15 }), height: 0,
      obstacles: [slalom({ costume: 'mooring-pole', from: 0.15, to: 0.4, count: 3, loss: 0.25 })],
      features: [moguls({ from: 0.6, to: 0.9, count: 3 })],
    },
    { name: 'Finish', shape: runIn(), height: 0 },
  ],
});
