'use strict';

// Santa Monica Pier Run (Moses, 16 Nov 2026: ten more Coasters tracks; one of the three Extreme ones). A coaster on
// a seaside amusement pier in California: out of the sand by the pier's water tower, a sweep over the beach, then the big
// feature: a loop out over the surf beside the pier's funfair, the field going right round it, rough boards
// after it to bunch the field again, S-bends through the midway's stalls, the hairpin at the end of the pier, a
// sweep under the palms along the promenade and the run back to the station. No names on anything.
const { track, opening, straight, sweep, sBends, hairpin, plunge, runIn, peg, slalom, block, brake, loop } = require('../trackKit');

module.exports = track({
  slug: 'santa-monica-pier-run',
  name: 'Santa Monica Pier Run',
  family: 'coaster',
  difficulty: 'extreme',
  description: 'A coaster on a seaside amusement pier in California: down from the pier\'s water tower, over the beach, right round a loop out over the surf beside the funfair, through the midway\'s stalls, round the end of the pier and back along the palm-lined promenade.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'sunset',
  variants: ['night'],
  coaster: { height: 14, colours: { support: '#f2f2ee', rail: '#e23a3a', tie: '#2a2d36' } },
  signature: 'Loop over the surf',
  tvCameras: [
    // (Past the loop, looking back at the field coming down out of it over the surf.)
    { section: 'Loop over the surf', at: 0.8, side: 'left', distance: 12, height: 13 },
    { section: 'Promenade sweep', at: 0.5, side: 'right', distance: 10, height: 10 },
  ],
  start: { landmark: 'park-midway', scenery: ['palms'], type: 'water-tower', gate: 'barrier', shots: { countdown: 'low-front', launch: 'high-behind' } },
  finish: { landmark: 'distant-coasters', billboards: 1 },
  opening: opening('sand-trap', {
    side: 'right',
    costumes: { block: 'barrel', slalom: 'route-flag' },
    waves: { groups: 5, gap: 0.12, jitter: 0.04 },
    dress: {},
  }),
  sections: [
    {
      name: 'Over the beach', shape: sweep({ side: 'left', radius: 80, degrees: 80, grade: 0.15 }), height: 12, billboards: 2,
      landmarks: [{ name: 'riviera-beach', at: 0.5, side: 'right', distance: 34 }],
      obstacles: [peg({ costume: 'route-flag', at: 0.35, line: 'left' }), peg({ costume: 'route-flag', at: 0.7, line: 'right' })],
    },
    {
      name: 'Loop over the surf', shape: straight(170, { grade: 0.13 }), height: 0,
      features: [brake({ at: 0.08, length: 12, drag: 0.02 }), loop({ at: 0.45, viewSide: 14 })],
    },
    {
      name: 'Under the pier', shape: sBends({ first: 'left', radius: 65, degrees: 70, grade: 0.15 }), height: 4,
      obstacles: [peg({ costume: 'mooring-pole', at: 0.25, line: 'right' }), peg({ costume: 'mooring-pole', at: 0.5, line: 'center' }), peg({ costume: 'mooring-pole', at: 0.75, line: 'left' })],
    },
    {
      name: 'Midway bends', shape: sBends({ first: 'right', radius: 65, degrees: 80, grade: 0.16 }), height: 6,
      obstacles: [slalom({ costume: 'route-flag', from: 0.3, to: 0.75, count: 4, loss: 0.25 })],
    },
    {
      name: 'Past the stalls', shape: straight(35, { grade: 0.14 }), height: 6,
      features: [brake({ at: 0.1, length: 12, drag: 0.02 })],
    },
    { name: 'End of the pier hairpin', shape: hairpin({ side: 'left' }), height: 8, water: true },
    { name: 'Off the pier', shape: plunge(45, { grade: 0.3, from: 0.14 }), height: 4 },
    {
      name: 'Promenade sweep', shape: sweep({ side: 'right', radius: 75, degrees: 100, grade: 0.15 }), height: 8, billboards: 2, scenery: ['palms'],
      obstacles: [peg({ costume: 'route-flag', at: 0.3, line: 'right' }), peg({ costume: 'route-flag', at: 0.65, line: 'left' })],
    },
    {
      name: 'Run to the station', shape: straight(70, { grade: 0.15 }), height: 0,
      obstacles: [block({ costume: 'barrel', at: 0.2, line: 'center' }), slalom({ costume: 'route-flag', from: 0.4, to: 0.85, count: 3, loss: 0.3 })],
    },
    { name: 'Finish', shape: runIn(), height: 0 },
  ],
});
