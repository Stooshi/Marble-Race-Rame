'use strict';

// Amalfi Coast Run (Moses, 16 Nov 2026: ten more Coasters tracks; one of the four Wild ones). A coaster down Italy's
// Amalfi Coast: from a lighthouse on the headland the field rumbles off and stays together along the cliff road
// (nothing in its way for the first seconds), then the big feature: the long drop down the cliff from the perched
// village to the harbour, past the yachts, the lemon terraces in S-bends, the hairpin above the beach, the sweep
// round the cove under the umbrella pines and the run to the harbour wall. No names on anything.
const { track, opening, straight, plunge, sweep, sBends, hairpin, runIn, peg, slalom, block, moguls } = require('../trackKit');

module.exports = track({
  slug: 'amalfi-coast-run',
  name: 'Amalfi Coast Run',
  family: 'coaster',
  difficulty: 'wild',
  description: 'A coaster down Italy\'s Amalfi Coast: from a lighthouse on the headland, along the cliff road, down the long drop from the perched village to the harbour, past the yachts, through the lemon terraces and round the cove under the umbrella pines to the harbour wall.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'day',
  variants: ['sunset'],
  coaster: { height: 18, colours: { support: '#f4ecd8', rail: '#2a6a8a', tie: '#5a4632' } },
  signature: 'Down to the harbour',
  tvCameras: [
    // (At the foot of the drop, looking back up the cliff at the field coming down from the village.)
    { section: 'Down to the harbour', at: 0.95, side: 'left', distance: 10, height: 12 },
    { section: 'Round the cove', at: 0.5, side: 'right', distance: 10, height: 10 },
  ],
  start: { landmark: 'riviera-lighthouse', scenery: ['balcony-houses'], type: 'lighthouse', gate: 'stalls', shots: { countdown: 'crane', launch: 'look-back' } },
  finish: { landmark: 'riviera-harbour', billboards: 1 },
  opening: opening('rumble-start', {
    side: 'left',
    costumes: { block: 'barrel', slalom: 'mooring-pole' },
    waves: { groups: 5, gap: 0.12, jitter: 0.04 },
    dress: {},
  }),
  sections: [
    {
      name: 'Along the cliff road', shape: sweep({ side: 'right', radius: 95, degrees: 60, grade: 0.12 }), height: 24, billboards: 2,
      landmarks: [{ name: 'perched-village', at: 0.6, side: 'left', distance: 40 }],
    },
    { name: 'Above the village', shape: straight(45, { grade: 0.12 }), height: 26 },
    { name: 'Down to the harbour', shape: plunge(85, { grade: 0.5, from: 0.12 }), height: 0, landmarks: [{ name: 'perched-village', at: 0.3, side: 'right', distance: 36 }] },
    {
      name: 'Past the yachts', shape: straight(55, { grade: 0.13 }), height: 4, water: true,
      landmarks: [{ name: 'yachts', at: 0.5, side: 'left', distance: 30 }],
      obstacles: [peg({ costume: 'mooring-pole', at: 0.3, line: 'right' }), peg({ costume: 'mooring-pole', at: 0.55, line: 'left' }), peg({ costume: 'mooring-pole', at: 0.8, line: 'center' })],
    },
    {
      name: 'Lemon terraces', shape: sBends({ first: 'left', radius: 65, degrees: 70, grade: 0.15 }), height: 8,
      landmarks: [{ name: 'olive-grove', at: 0.5, side: 'right', distance: 26 }],
      obstacles: [slalom({ costume: 'mooring-pole', from: 0.3, to: 0.8, count: 4, loss: 0.25 })],
    },
    { name: 'To the hairpin', shape: straight(55, { grade: 0.13 }), height: 8, features: [moguls({ from: 0.6, to: 0.9, count: 3 })] },
    { name: 'Beach hairpin', shape: hairpin({ side: 'right' }), height: 10 },
    {
      name: 'Round the cove', shape: sweep({ side: 'left', radius: 75, degrees: 100, grade: 0.15 }), height: 8, water: true, billboards: 2,
      landmarks: [{ name: 'umbrella-pines', at: 0.5, side: 'right', distance: 26 }],
      obstacles: [peg({ costume: 'mooring-pole', at: 0.35, line: 'left' }), peg({ costume: 'mooring-pole', at: 0.7, line: 'right' })],
    },
    {
      name: 'Fishing village lanes', shape: sBends({ first: 'left', radius: 65, degrees: 70, grade: 0.14 }), height: 6,
      obstacles: [peg({ costume: 'mooring-pole', at: 0.25, line: 'center' }), peg({ costume: 'mooring-pole', at: 0.5, line: 'left' }), peg({ costume: 'mooring-pole', at: 0.75, line: 'right' })],
    },
    {
      name: 'Coast road', shape: sweep({ side: 'right', radius: 90, degrees: 60, grade: 0.13 }), height: 10, water: true,
      obstacles: [slalom({ costume: 'mooring-pole', from: 0.3, to: 0.8, count: 4, loss: 0.25 })],
    },
    {
      name: 'Harbour bends', shape: sBends({ first: 'right', radius: 70, degrees: 60, grade: 0.15 }), height: 6,
      obstacles: [block({ costume: 'barrel', at: 0.5, line: 'center' })],
    },
    {
      name: 'Run to the harbour wall', shape: straight(70, { grade: 0.15 }), height: 0,
      obstacles: [slalom({ costume: 'mooring-pole', from: 0.4, to: 0.85, count: 3, loss: 0.3 })],
    },
    { name: 'Finish', shape: runIn(), height: 0 },
  ],
});
