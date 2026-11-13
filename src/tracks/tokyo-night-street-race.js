'use strict';

// Tokyo Night Street Race (Moses, 12 Nov 2026: eleven new motorsport Grand Prix tracks, the second of four Wild
// ones). A street race through Tokyo at night among the lit towers: the start plunge into the Station chicane, the
// Shopping street, up onto the elevated expressway and round the Expressway loop (the big
// feature, the signature, the lit towers behind it), the Bay S-bends straight after it, the Tower hairpin, down the
// Neon drop and round the harbour to the line. Generic racing pieces only: no real circuit, series, team or sponsor.
const {
  track, opening, straight, plunge, sBends, sweep, hairpin, runIn, slalom, rumble, curtain, loop,
} = require('../trackKit');

module.exports = track({
  slug: 'tokyo-night-street-race',
  name: 'Tokyo Night Street Race',
  difficulty: 'hard',
  description: 'A street race through Tokyo at night among the lit towers: through the station chicane and the shopping street, up onto the elevated expressway and round a loop with the towers behind it, through the bay S-bends, round the tower hairpin and down past the harbour to the line.',
  surface: 'asphalt',
  biome: 'city',
  lighting: 'night',
  grandPrix: { crowd: 'fans', barrier: 'tyres', groupsEvery: 900 },
  signature: 'Expressway loop',
  tvCameras: [
    // (Out of the loop on the expressway, looking back at the field coming round it, the towers behind.)
    { section: 'Expressway loop', at: 0.75, side: 'right', distance: 9, height: 10 },
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
      name: 'Shopping street', shape: straight(60, { grade: 0.15 }), scenery: ['shopfronts'],
      obstacles: [slalom({ costume: 'traffic-cone', from: 0.2, to: 0.75, count: 4, loss: 0.25 })],
    },
    { name: 'Expressway loop', shape: straight(130, { grade: 0.12 }), features: [loop({ at: 0.25, viewSide: 20 })] }, // (no towers beside the loop: they stood between the follow camera and the loop)
    {
      name: 'Bay S-bends', shape: sBends({ first: 'left', radius: 70, degrees: 85, grade: 0.16 }), billboards: 2, scenery: ['skyscrapers'],
      obstacles: [slalom({ costume: 'traffic-cone', from: 0.35, to: 0.7, count: 3, loss: 0.2 })],
    },
    {
      name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), billboards: 1,
    },
    { name: 'Tower hairpin', shape: hairpin({ side: 'left' }), scenery: ['grandstand'] },
    {
      name: 'Neon drop', shape: plunge(45, { grade: 0.24, from: 0.15 }), scenery: ['skyscrapers'],
    },
    {
      name: 'Riverside straight', shape: straight(100, { grade: 0.13 }), scenery: ['skyscrapers'],
      obstacles: [slalom({ costume: 'traffic-cone', from: 0.35, to: 0.6, count: 3, loss: 0.2 })],
    },
    {
      name: 'Harbour sweep', shape: sweep({ side: 'right', radius: 80, degrees: 160, grade: 0.12 }), billboards: 1,
      obstacles: [curtain({ costume: 'banner-gantry', at: 0.35, side: 'high' })],
    },
    {
      name: 'Home straight', shape: straight(90, { grade: 0.14 }), billboards: 2, scenery: ['grandstand'],
      features: [rumble({ from: 0.5, to: 0.85, count: 3 })],
    },
    { name: 'Finish', shape: runIn(), scenery: ['grandstand'] },
  ],
});
