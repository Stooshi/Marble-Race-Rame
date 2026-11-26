'use strict';

// Gold Coast Surf Run (Moses, 16 Nov 2026: ten more Coasters tracks; one of the three Easy ones). A coaster along
// Australia's Gold Coast: from an observation tower among the beachfront towers, through the beach bends, then the
// big feature: a long, steeply banked turn out over the surf round a rocky islet, a run past the surfers, the marina
// hairpin among the yachts, S-bends through the palms and the run along the sand to the surf club. No names on anything.
const { track, opening, straight, sweep, sBends, hairpin, plunge, runIn, peg, slalom, block, curtain, brake } = require('../trackKit');

module.exports = track({
  slug: 'gold-coast-surf-run',
  name: 'Gold Coast Surf Run',
  family: 'coaster',
  difficulty: 'easy',
  description: 'A coaster along Australia\'s Gold Coast: down from an observation tower among the beachfront towers, a long banked turn out over the surf round a rocky islet, past the surfers and the yachts in the marina, through the palms and along the sand to the surf club.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'day',
  variants: ['sunset'],
  coaster: { height: 16, colours: { support: '#f2f2ee', rail: '#1f8fbf', tie: '#2a3a46' } },
  signature: 'Surf bank',
  tvCameras: [
    // (Where the banked turn comes back to the shore, looking back at the field leaning round over the surf.)
    { section: 'Surf bank', at: 0.92, side: 'left', distance: 10, height: 13 },
    { section: 'Through the palms', at: 0.6, side: 'right', distance: 10, height: 10 },
  ],
  start: { landmark: 'glass-towers', scenery: ['palms'], type: 'observation-tower', gate: 'stalls', shots: { countdown: 'crane', launch: 'low-chase' } },
  finish: { landmark: 'riviera-beach', billboards: 2 },
  opening: opening('rolling-start', {
    side: 'right',
    costumes: { block: 'buoy', slalom: 'route-flag' },
    names: { plunge: 'Off the tower', bends: 'Beachfront bends' },
    waves: { groups: 5, gap: 0.12, jitter: 0.04 },
    dress: { plunge: { height: 22 }, bends: { height: 16 } },
  }),
  sections: [
    {
      name: 'Along the esplanade', shape: straight(70, { grade: 0.12 }), height: 14, billboards: 2,
      landmarks: [{ name: 'glass-towers', at: 0.5, side: 'left', distance: 40 }],
      obstacles: [peg({ costume: 'route-flag', at: 0.4, line: 'left' }), peg({ costume: 'route-flag', at: 0.75, line: 'right' })],
    },
    {
      name: 'Surf bank', shape: sweep({ side: 'right', radius: 60, degrees: 200, grade: 0.13 }), height: 18, water: true,
      landmarks: [{ name: 'sea-stacks-beach', at: 0.5, side: 'right', distance: 40 }, { name: 'coast-palms', at: 0.2, side: 'left', distance: 30 }],
    },
    {
      name: 'Past the surfers', shape: straight(60, { grade: 0.13 }), height: 8, water: true,
      obstacles: [curtain({ costume: 'surfer', at: 0.3, side: 'left' }), slalom({ costume: 'route-flag', from: 0.55, to: 0.95, count: 3, loss: 0.25 })],
    },
    {
      name: 'Marina bends', shape: sBends({ first: 'left', radius: 70, degrees: 60, grade: 0.14 }), height: 6,
      landmarks: [{ name: 'yachts', at: 0.5, side: 'right', distance: 30 }],
      obstacles: [peg({ costume: 'mooring-pole', at: 0.3, line: 'right' }), peg({ costume: 'mooring-pole', at: 0.65, line: 'left' })],
    },
    { name: 'To the marina', shape: straight(45, { grade: 0.13 }), height: 6, obstacles: [block({ costume: 'buoy', at: 0.65, line: 'center' })], features: [brake({ at: 0.05, length: 14, drag: 0.025 })] },
    { name: 'Marina hairpin', shape: hairpin({ side: 'right' }), height: 8, landmarks: [{ name: 'harbour', at: 0.5, side: 'right', distance: 44 }] },
    { name: 'Down to the sand', shape: plunge(40, { grade: 0.28, from: 0.14 }), height: 4 },
    {
      name: 'Through the palms', shape: sBends({ first: 'right', radius: 75, degrees: 55, grade: 0.14 }), height: 6, scenery: ['palms'],
      obstacles: [slalom({ costume: 'route-flag', from: 0.3, to: 0.8, count: 4, loss: 0.25 })],
    },
    { name: 'Dune sweep', shape: sweep({ side: 'left', radius: 90, degrees: 60, grade: 0.12 }), height: 4, billboards: 1 },
    {
      name: 'Along the sand', shape: straight(70, { grade: 0.14 }), height: 0,
      obstacles: [peg({ costume: 'route-flag', at: 0.35, line: 'center' }), peg({ costume: 'route-flag', at: 0.7, line: 'left' })],
    },
    { name: 'Finish', shape: runIn(), height: 0 },
  ],
});
