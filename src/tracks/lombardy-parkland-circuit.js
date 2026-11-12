'use strict';

// Lombardy Parkland Circuit (Moses, 12 Nov 2026: eleven new motorsport Grand Prix tracks, the third of four Easy
// ones). A fast old road circuit through the walled royal park of a Lombardy town at sunset: down the start plunge
// into the First chicane, along the long Park straight under the plane trees, the Pit lane splitter (the big
// feature, the signature: a channel either side of the pit garages), the long fast Curva grande, the Villa
// hairpin by the old palace, the Woodland S-bends and the drop to the lake, and the last sweep to the line.
// Generic racing pieces only: no real circuit, series, team or sponsor.
const {
  track, opening, straight, plunge, sBends, sweep, hairpin, splitter, runIn, peg, slalom, rumble, curtain,
} = require('../trackKit');

module.exports = track({
  slug: 'lombardy-parkland-circuit',
  name: 'Lombardy Parkland Circuit',
  difficulty: 'easy',
  description: 'A fast old road circuit through the walled royal park of a Lombardy town at sunset: through the first chicane, down the long park straight under the plane trees, either side of the pit garages, round the long fast curve, the hairpin by the old palace and down past the lake to the line.',
  surface: 'asphalt',
  biome: 'meadow',
  lighting: 'sunset',
  variants: ['day'],
  grandPrix: { crowd: 'fans', barrier: 'tyres', groupsEvery: 650 },
  signature: 'Pit lane splitter',
  tvCameras: [
    // (Where the pit lane and the track meet again past the garages, looking back at the field coming through both.)
    { section: 'Pit lane splitter', at: 0.9, side: 'left', distance: 9, height: 9 },
  ],
  start: { landmark: 'royal-palace', gate: 'paddle', shots: { countdown: 'low-front', launch: 'side' } },
  finish: { landmark: 'pit-garages', scenery: ['grandstand'] },
  opening: opening('chicane-start', {
    side: 'right',
    costumes: { block: 'tyre-stack', slalom: 'traffic-cone', peg: 'traffic-cone' },
    names: { plunge: 'Start plunge', chicane: 'First chicane' },
  }),
  sections: [
    {
      name: 'Park straight', shape: straight(110, { grade: 0.14 }), billboards: 2,
      obstacles: [slalom({ costume: 'traffic-cone', from: 0.3, to: 0.55, count: 3, loss: 0.15 })],
    },
    {
      name: 'Pit lane splitter', shape: splitter({ side: 'right', degrees: 0, approach: 50, merge: 30, balance: { tipOffset: 0, left: { drag: 0.8, scrub: 0.8 }, right: { drag: 2.2, scrub: 2.2 } } }),
      around: 'pit-garages', scenery: ['grandstand'],
      obstacles: [peg({ costume: 'traffic-cone', at: 0.06, line: 'right' }), peg({ costume: 'traffic-cone', at: 0.14, line: 'left' }), peg({ costume: 'traffic-cone', at: 0.21, line: 'center' })],
    },
    {
      name: 'Curva grande', shape: sweep({ side: 'right', radius: 90, degrees: 140, grade: 0.12 }), billboards: 2, scenery: ['crowd'],
    },
    {
      name: 'Run to the hairpin', shape: straight(50, { grade: 0.13 }), billboards: 1,
    },
    { name: 'Villa hairpin', shape: hairpin({ side: 'left' }), scenery: ['grandstand'] },
    {
      name: 'Woodland S-bends', shape: sBends({ first: 'right', radius: 65, degrees: 80, grade: 0.15 }),
      obstacles: [slalom({ costume: 'traffic-cone', from: 0.4, to: 0.7, count: 3, loss: 0.15 })],
    },
    {
      name: 'Drop to the lake', shape: plunge(45, { grade: 0.24, from: 0.15 }), billboards: 1, scenery: ['cypress'],
    },
    {
      name: 'Lakeside sweep', shape: sweep({ side: 'left', radius: 75, degrees: 110, grade: 0.13 }),
      obstacles: [curtain({ costume: 'banner-gantry', at: 0.35, side: 'high' })],
    },
    {
      name: 'Home straight', shape: straight(70, { grade: 0.15 }), billboards: 2, scenery: ['grandstand'],
      features: [rumble({ from: 0.55, to: 0.85, count: 3 })],
    },
    { name: 'Finish', shape: runIn(), scenery: ['grandstand'] },
  ],
});
