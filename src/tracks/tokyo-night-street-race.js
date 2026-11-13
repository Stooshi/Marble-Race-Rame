'use strict';

// Tokyo Night Street Race (Moses, 12 Nov 2026: eleven new motorsport Grand Prix tracks, the second of four Wild
// ones). A street race through Tokyo at night among the lit towers: the start plunge into the Station chicane, the
// Shopping street, round the Expressway spiral (the big feature, the signature: a full banked turn down round a lit
// tower, passing under itself like a city interchange), either side of the monument at the Overpass splitter, the Bay
// S-bends, the Tower hairpin, down the Neon drop and round the harbour to the line. (13 Nov 2026, Moses: the loop
// replaced by the spiral; with the loop it fell short of 65 overtakes and looked too like Nevada Drag Strip's.)
// Generic racing pieces only: no real circuit, series, team or sponsor.
const {
  track, opening, straight, plunge, sBends, sweep, spiral, splitter, hairpin, runIn, peg, slalom, rumble, curtain,
} = require('../trackKit');

module.exports = track({
  slug: 'tokyo-night-street-race',
  name: 'Tokyo Night Street Race',
  difficulty: 'hard',
  description: 'A street race through Tokyo at night among the lit towers: through the station chicane and the shopping street, down the banked expressway spiral round a lit tower and under itself, either side of the monument at the overpass, through the bay S-bends, round the tower hairpin and down past the harbour to the line.',
  surface: 'asphalt',
  biome: 'city',
  lighting: 'night',
  grandPrix: { crowd: 'fans', barrier: 'tyres', groupsEvery: 900 },
  signature: 'Expressway spiral',
  tvCameras: [
    // (Where the field passes under the expressway's first deck, looking back up the spiral at it coming round.)
    { section: 'Expressway spiral', at: 0.85, side: 'right', distance: 9, height: 10 },
  ],
  start: { landmark: 'city-hall', gate: 'trapdoor', shots: { countdown: 'low-front', launch: 'overhead' } },
  finish: { landmark: 'pit-garages', scenery: ['grandstand'] },
  opening: opening('chicane-start', {
    side: 'left',
    costumes: { block: 'tyre-stack', slalom: 'traffic-cone', peg: 'traffic-cone' },
    names: { plunge: 'Start plunge', chicane: 'Station chicane' },
    dress: { chicane: { scenery: ['shopfronts'] } },
  }),
  sections: [
    {
      name: 'Shopping street', shape: straight(50, { grade: 0.15 }), scenery: ['shopfronts'],
      obstacles: [curtain({ costume: 'banner-gantry', at: 0.25, side: 'left' }), peg({ costume: 'traffic-cone', at: 0.6, line: 'right' })],
    },
    { name: 'Expressway spiral', shape: spiral({ side: 'right', radius: 50, turns: 1, grade: 0.22 }), around: 'twisted-tower' },
    {
      name: 'Overpass splitter', shape: splitter({ side: 'left', degrees: 0, approach: 50, merge: 30, balance: { tipOffset: -1.2, left: { drag: 1.6, scrub: 1.6 }, right: { drag: 1.0, scrub: 1.0 } } }),
      around: 'roundabout-monument', scenery: ['skyscrapers'],
      obstacles: [peg({ costume: 'traffic-cone', at: 0.06, line: 'left' }), peg({ costume: 'traffic-cone', at: 0.14, line: 'right' }), peg({ costume: 'traffic-cone', at: 0.21, line: 'center' })],
    },
    { name: 'Off-ramp drop', shape: plunge(45, { grade: 0.36, from: 0.13 }), scenery: ['skyscrapers'] },
    {
      name: 'Bay S-bends', shape: sBends({ first: 'left', radius: 70, degrees: 85, grade: 0.18 }), billboards: 2, scenery: ['skyscrapers'],
      obstacles: [slalom({ costume: 'traffic-cone', from: 0.35, to: 0.7, count: 3, loss: 0.2 })],
    },
    {
      name: 'Run to the hairpin', shape: straight(50, { grade: 0.14 }),
      obstacles: [peg({ costume: 'traffic-cone', at: 0.3, line: 'center' })],
    },
    { name: 'Tower hairpin', shape: hairpin({ side: 'left' }), scenery: ['grandstand'] },
    {
      name: 'Neon drop', shape: plunge(45, { grade: 0.38, from: 0.15 }), scenery: ['skyscrapers'],
    },
    {
      name: 'Riverside straight', shape: straight(60, { grade: 0.16 }), scenery: ['skyscrapers'],
      obstacles: [slalom({ costume: 'traffic-cone', from: 0.25, to: 0.7, count: 5, loss: 0.25 })],
    },
    {
      name: 'Harbour sweep', shape: sweep({ side: 'right', radius: 80, degrees: 130, grade: 0.155 }), billboards: 1,
      obstacles: [peg({ costume: 'traffic-cone', at: 0.15, line: 'center' }), curtain({ costume: 'banner-gantry', at: 0.4, side: 'high' })],
    },
    {
      name: 'Home straight', shape: straight(65, { grade: 0.16 }), billboards: 2, scenery: ['grandstand'],
      features: [rumble({ from: 0.5, to: 0.85, count: 3 })],
    },
    { name: 'Finish', shape: runIn(), scenery: ['grandstand'] },
  ],
});
