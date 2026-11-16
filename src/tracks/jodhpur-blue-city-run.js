'use strict';

// Jodhpur Blue City Run (Moses, 16 Nov 2026: ten more Coasters tracks; one of the three Extreme ones). A coaster in
// Jodhpur, India's blue city: from a minaret on the fort's ramparts the field drops off and stays together along the
// battlements (nothing in its way for the first seconds), then the big feature: the long, steep drop off the fort's
// cliff into the blue city below, its lanes in S-bends under drying cloth, the stepwell sweep, the hairpin by the
// clock tower market and the run to the city gate. No names on anything.
const { track, opening, straight, plunge, sweep, spiral, sBends, hairpin, runIn, peg, slalom, moguls, pileUp, block } = require('../trackKit');

module.exports = track({
  slug: 'jodhpur-blue-city-run',
  name: 'Jodhpur Blue City Run',
  family: 'coaster',
  difficulty: 'extreme',
  description: 'A coaster in Jodhpur, India\'s blue city: from a minaret on the great fort\'s ramparts, along the battlements, down the long steep drop off the fort\'s cliff into the blue houses below, through the lanes under drying cloth, past the stepwell and the market to the city gate.',
  surface: 'ice',
  biome: 'desert',
  lighting: 'day',
  variants: ['sunset'],
  coaster: { height: 20, colours: { support: '#c87a3a', rail: '#3a6ab8', tie: '#3a2a1e' } },
  signature: 'Off the fort',
  tvCameras: [
    // (At the foot of the fort's cliff, looking back up at the field coming down.)
    { section: 'Off the fort', at: 0.95, side: 'right', distance: 10, height: 12 },
    { section: 'Old city bends', at: 0.5, side: 'left', distance: 10, height: 10 },
  ],
  start: { landmark: 'hill-fort', scenery: ['colourful-houses'], type: 'minaret', gate: 'barrier', shots: { countdown: 'crane', launch: 'high-behind' } },
  finish: { landmark: 'red-fort-gate', billboards: 1 },
  opening: opening('pipe-drop', {
    side: 'left',
    costumes: { block: 'camel', slalom: 'lantern-pole' },
    names: { plunge: 'Off the ramparts' },
    waves: { groups: 5, gap: 0.12, jitter: 0.04 },
    dress: {},
  }),
  sections: [
    {
      name: 'Along the battlements', shape: sBends({ first: 'left', radius: 80, degrees: 55, grade: 0.14 }), height: 30, billboards: 2,
      landmarks: [{ name: 'hill-fort', at: 0.5, side: 'right', distance: 40 }],
      obstacles: [block({ costume: 'camel', at: 0.3, line: 'right' }), peg({ costume: 'lantern-pole', at: 0.7, line: 'left' })],
    },
    { name: 'Off the fort', shape: plunge(95, { grade: 0.55, from: 0.1 }), height: 0, scenery: ['colourful-houses'] },
    {
      name: 'Through the bazaar', shape: straight(50, { grade: 0.14 }), height: 4,
      obstacles: [pileUp({ costume: 'camel', at: 0.2 }), peg({ costume: 'lantern-pole', at: 0.6, line: 'left' }), peg({ costume: 'lantern-pole', at: 0.85, line: 'right' })],
    },
    {
      name: 'Blue lanes', shape: sBends({ first: 'right', radius: 60, degrees: 65, grade: 0.16 }), height: 6, scenery: ['colourful-houses'],
      obstacles: [peg({ costume: 'lantern-pole', at: 0.25, line: 'left' }), slalom({ costume: 'lantern-pole', from: 0.5, to: 0.9, count: 3, loss: 0.25 })],
    },
    {
      name: 'Stepwell spiral', shape: spiral({ side: 'left', radius: 40, turns: 1, grade: 0.18 }), height: 10,
      around: 'mughal-fountain',
    },
    { name: 'To the market', shape: straight(50, { grade: 0.13 }), height: 8, billboards: 1, features: [moguls({ from: 0.6, to: 0.9, count: 3 })] },
    { name: 'Market hairpin', shape: hairpin({ side: 'right' }), height: 10, landmarks: [{ name: 'qutub-minar', at: 0.5, side: 'right', distance: 30 }] },
    {
      name: 'Old city bends', shape: sBends({ first: 'right', radius: 65, degrees: 60, grade: 0.16 }), height: 6,
      obstacles: [peg({ costume: 'lantern-pole', at: 0.3, line: 'center' }), peg({ costume: 'lantern-pole', at: 0.7, line: 'left' })],
    },
    {
      name: 'Run to the city gate', shape: straight(55, { grade: 0.15 }), height: 0, billboards: 1,
      obstacles: [slalom({ costume: 'lantern-pole', from: 0.4, to: 0.85, count: 3, loss: 0.3 })],
    },
    { name: 'Finish', shape: runIn(), height: 0 },
  ],
});
