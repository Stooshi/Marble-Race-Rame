'use strict';

// Quebec Château Run (Moses, 16 Nov 2026: ten more Coasters tracks; one of the three Easy ones). A coaster through old
// Quebec City: from a castle tower on the ramparts the field drops off together and stays together along the
// terrace under the great château hotel (nothing in its way for the first seconds), then the big feature: the drop
// down the cliff beside the funicular to the lower town, its lamp-lit streets in S-bends, a sweep along the river
// past the cruise ships, the hairpin at the old port, a half-pipe between the ramparts and the run up to the fortress
// walls. No names on anything.
const { track, opening, straight, plunge, sweep, sBends, runIn, peg, slalom, block, brake, pileUp } = require('../trackKit');

module.exports = track({
  slug: 'quebec-chateau-run',
  name: 'Quebec Château Run',
  family: 'coaster',
  difficulty: 'easy',
  description: 'A coaster through old Quebec City: off the ramparts, along the terrace under the great château hotel, down the cliff beside the funicular into the lamp-lit lower town, along the river past the cruise ships and round the old port to the fortress walls.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'sunset',
  variants: ['day'],
  coaster: { height: 14, colours: { support: '#5a6a4a', rail: '#e8e2d2', tie: '#3a3226' } },
  signature: 'Down the cliff',
  tvCameras: [
    // (At the foot of the cliff, looking back up at the field pouring down beside the funicular.)
    { section: 'Down the cliff', at: 0.95, side: 'right', distance: 10, height: 12 },
    { section: 'Plains bends', at: 0.4, side: 'left', distance: 10, height: 11 },
  ],
  start: { landmark: 'fortress-walls', scenery: ['stone-houses'], type: 'water-tower', gate: 'paddle', shots: { countdown: 'chase', launch: 'low-chase' } },
  finish: { landmark: 'fortress-walls', billboards: 1 },
  opening: opening('clean-drop', {
    side: 'left',
    costumes: { block: 'barrel', slalom: 'street-lamp' },
    names: { plunge: 'Off the ramparts', bends: 'Old town bends' },
    waves: { groups: 5, gap: 0.12, jitter: 0.04 },
    dress: {},
  }),
  sections: [
    {
      name: 'Along the terrace', shape: sweep({ side: 'right', radius: 90, degrees: 60, grade: 0.12 }), height: 14, billboards: 2,
      landmarks: [{ name: 'chateau-hotel', at: 0.5, side: 'left', distance: 36 }],
      obstacles: [peg({ costume: 'street-lamp', at: 0.4, line: 'left' }), peg({ costume: 'street-lamp', at: 0.75, line: 'right' })],
    },
    { name: 'Down the cliff', shape: plunge(70, { grade: 0.5, from: 0.12 }), height: 0, scenery: ['funicular'] },
    {
      name: 'To the lower town', shape: straight(40, { grade: 0.12 }), height: 4,
      obstacles: [peg({ costume: 'street-lamp', at: 0.75, line: 'center' })],
      features: [brake({ at: 0.1, length: 12, drag: 0.025 })],
    },
    { name: 'Round the lower town', shape: sweep({ side: 'left', radius: 55, degrees: 150, grade: 0.13 }), height: 6, landmarks: [{ name: 'harbour', at: 0.5, side: 'left', distance: 30 }] },
    {
      name: 'Lower town', shape: sBends({ first: 'right', radius: 65, degrees: 65, grade: 0.15 }), height: 6, scenery: ['stone-houses'],
      obstacles: [peg({ costume: 'street-lamp', at: 0.25, line: 'center' }), peg({ costume: 'street-lamp', at: 0.5, line: 'left' }), peg({ costume: 'street-lamp', at: 0.75, line: 'right' })],
    },
    {
      name: 'Along the river', shape: sweep({ side: 'left', radius: 85, degrees: 80, grade: 0.14 }), height: 10, water: true, billboards: 2,
      landmarks: [{ name: 'cruise-ship', at: 0.5, side: 'right', distance: 40 }],
      obstacles: [peg({ costume: 'mooring-pole', at: 0.35, line: 'left' }), peg({ costume: 'mooring-pole', at: 0.7, line: 'right' })],
    },
    {
      name: 'Rampart lanes', shape: sBends({ first: 'right', radius: 65, degrees: 55, grade: 0.15 }), height: 6,
      obstacles: [peg({ costume: 'street-lamp', at: 0.25, line: 'center' }), peg({ costume: 'street-lamp', at: 0.5, line: 'left' }), peg({ costume: 'street-lamp', at: 0.75, line: 'right' })],
    },
    {
      name: 'Plains bends', shape: sBends({ first: 'left', radius: 75, degrees: 60, grade: 0.15 }), height: 8,
      obstacles: [slalom({ costume: 'street-lamp', from: 0.25, to: 0.85, count: 4, loss: 0.25 })],
    },
    {
      name: 'Run to the walls', shape: straight(60, { grade: 0.15 }), height: 0, billboards: 1,
      obstacles: [block({ costume: 'barrel', at: 0.3, line: 'center' }), peg({ costume: 'street-lamp', at: 0.7, line: 'right' })],
    },
    { name: 'Finish', shape: runIn(), height: 0 },
  ],
});
