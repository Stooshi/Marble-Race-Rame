'use strict';

// Bavarian Castle Run (Moses, 16 Nov 2026: ten more Coasters tracks; one of the three Extreme ones). A coaster in the
// Bavarian Alps: from a clock tower in a lakeside village, through the chicane and the pastures, then the big feature:
// a splitter round the white fairy-tale castle on its crag, one channel each side, the drop through the gorge below
// it, the alpine meadows in S-bends past the cows, the hairpin by the chapel and the run down to the village.
// No names on anything.
const { track, opening, straight, sweep, sBends, hairpin, splitter, plunge, halfPipe, runIn, peg, slalom, block, moguls } = require('../trackKit');

module.exports = track({
  slug: 'bavarian-castle-run',
  name: 'Bavarian Castle Run',
  family: 'coaster',
  difficulty: 'extreme',
  description: 'A coaster in the Bavarian Alps: from a clock tower in a lakeside village, across the pastures, round the white fairy-tale castle on its crag one side or the other, down through the gorge below it, past the cows in the alpine meadows and the chapel to the village.',
  surface: 'ice',
  biome: 'alpine',
  lighting: 'day',
  variants: ['sunset'],
  coaster: { height: 16, colours: { support: '#3a4a3a', rail: '#f2efe6', tie: '#2a2620' } },
  signature: 'Round the castle',
  tvCameras: [
    // (Where the two channels meet again below the castle, looking back at both.)
    { section: 'Round the castle', at: 0.95, side: 'right', distance: 10, height: 14 },
    { section: 'Alpine meadows', at: 0.6, side: 'left', distance: 10, height: 10 },
  ],
  start: { landmark: 'church', scenery: ['chalets'], type: 'clock-tower', gate: 'stalls', shots: { countdown: 'side', launch: 'side' } },
  finish: { landmark: 'hilltop-castle', billboards: 1 },
  opening: opening('chicane-start', {
    side: 'right',
    costumes: { block: 'cow', slalom: 'fence-post' },
    dress: {},
  }),
  sections: [
    {
      name: 'Through the village gate', shape: straight(60, { grade: 0.16 }), height: 10, billboards: 2,
      obstacles: [peg({ costume: 'fence-post', at: 0.25, line: 'left' })],
      features: [moguls({ from: 0.6, to: 0.9, count: 3 })],
    },
    {
      name: 'Across the pastures', shape: sweep({ side: 'left', radius: 80, degrees: 70, grade: 0.15 }), height: 12,
      obstacles: [peg({ costume: 'fence-post', at: 0.35, line: 'left' }), peg({ costume: 'fence-post', at: 0.7, line: 'right' })],
    },
    {
      name: 'Round the castle',
      shape: splitter({ side: 'right', degrees: 0, approach: 60, merge: 30, balance: { tipOffset: 0, left: { drag: 1.3, scrub: 1.3 }, right: { drag: 2.5, scrub: 2.5 } } }),
      around: 'castle-keep', height: 18,
      landmarks: [{ name: 'hilltop-castle', at: 0.5, side: 'left', distance: 60 }],
      obstacles: [peg({ costume: 'fence-post', at: 0.06, line: 'left' }), peg({ costume: 'fence-post', at: 0.14, line: 'right' }), peg({ costume: 'fence-post', at: 0.21, line: 'center' })],
    },
    { name: 'Down the gorge', shape: plunge(60, { grade: 0.36, from: 0.14 }), height: 0 },
    { name: 'Gorge half-pipe', shape: halfPipe({ first: 'right', width: 8, swings: 2, radius: 140, degrees: 22, grade: 0.12 }), height: 0 },
    {
      name: 'Alpine meadows', shape: sBends({ first: 'left', radius: 65, degrees: 75, grade: 0.16 }), height: 8, scenery: ['pasture'],
      obstacles: [block({ costume: 'cow', at: 0.3, line: 'left' }), slalom({ costume: 'fence-post', from: 0.55, to: 0.9, count: 3, loss: 0.25 })],
    },
    { name: 'To the chapel', shape: straight(55, { grade: 0.13 }), height: 8, features: [moguls({ from: 0.6, to: 0.9, count: 3 })] },
    { name: 'Chapel hairpin', shape: hairpin({ side: 'left' }), height: 10 },
    {
      name: 'Hay meadow bends', shape: sBends({ first: 'right', radius: 65, degrees: 70, grade: 0.15 }), height: 6,
      obstacles: [peg({ costume: 'fence-post', at: 0.25, line: 'center' }), peg({ costume: 'fence-post', at: 0.5, line: 'left' }), peg({ costume: 'fence-post', at: 0.75, line: 'right' })],
    },
    {
      name: 'Lakeside sweep', shape: sweep({ side: 'right', radius: 75, degrees: 90, grade: 0.15 }), height: 8, water: true, billboards: 2,
      obstacles: [peg({ costume: 'fence-post', at: 0.35, line: 'right' }), peg({ costume: 'fence-post', at: 0.7, line: 'left' })],
    },
    {
      name: 'Run to the village', shape: straight(70, { grade: 0.15 }), height: 0,
      obstacles: [slalom({ costume: 'fence-post', from: 0.4, to: 0.85, count: 3, loss: 0.3 })],
    },
    { name: 'Finish', shape: runIn(), height: 0 },
  ],
});
