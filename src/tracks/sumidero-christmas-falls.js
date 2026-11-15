'use strict';

// Sumidero Christmas Falls (Moses, 15 Nov 2026: six more Canyons tracks, the pack filled to 20; one of the two
// Extreme ones). The Sumidero Canyon in Mexico: off the rim and down the canyon wall in S-bends (the field let go in
// waves), past the crocodiles basking on a sandbank, a sweep under the sheer thousand-metre walls, then down the
// "Christmas tree" (the track's big feature: a waterfall through falling water beside the great cone of green moss the
// water has built up on the wall), through the spray, a split round a rock, a drop, a half-pipe between the walls, the
// hairpin, a sweep past the tour boats and the run to the dock. Generic boats and rock only; no names on anything.
// (It opened with a half-pipe down the wall at first: that sorted the field by strength, and the strongest five kept
// their places to the line.)
const {
  track, opening, straight, plunge, sweep, hairpin, halfPipe, waterfall, splitter, runIn, peg, slalom, curtain, brake, moguls,
} = require('../trackKit');

module.exports = track({
  slug: 'sumidero-christmas-falls',
  name: 'Sumidero Christmas Falls',
  family: 'canyon',
  difficulty: 'extreme',
  description: 'The Sumidero Canyon in Mexico: off the rim and down the canyon wall, past the crocodiles, under the sheer thousand-metre walls and down the falls beside the great moss "Christmas tree", round a rock, between the walls and past the tour boats to the dock.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'day',
  variants: ['sunset'],
  canyon: { palette: 'sumidero', depth: 56, river: 'left', narrow: true },
  coaster: { colours: { support: '#4a4a44', rail: '#f2f2ea', tie: '#2a2a26' } },
  signature: 'The Christmas tree',
  tvCameras: [
    // (In the spray at the foot of the falls, looking back up at the field pouring down through the falling water.)
    { section: 'In the spray', at: 0.6, side: 'right', distance: 10, height: 12 },
    { section: 'Past the boats', at: 0.3, side: 'left', distance: 10, height: 11 },
  ],
  start: { landmark: 'gorge-viewpoint', scenery: ['rocks'], type: 'ski-jump', gate: 'paddle', shots: { countdown: 'crane', launch: 'look-back' } },
  finish: { landmark: 'river-rafts' },
  opening: opening('clean-drop', {
    side: 'right',
    costumes: { block: 'mossy-boulder', slalom: 'river-stake' },
    names: { plunge: 'Off the rim', bends: 'Down the canyon wall' },
    // (Let go in shorter waves, a new order every race: the opening's own longer waves favoured the fourth starting group.)
    waves: { groups: 5, gap: 0.12, jitter: 0.04 },
    dress: { plunge: { height: 0 }, bends: { height: 0 } },
  }),
  sections: [
    {
      name: 'Past the crocodiles', shape: straight(66, { grade: 0.14 }), height: 0,
      landmarks: [{ name: 'crocodiles', at: 0.5, side: 'left', distance: 24 }],
      obstacles: [curtain({ costume: 'vines', at: 0.2, side: 'right' }), slalom({ costume: 'river-stake', from: 0.76, to: 0.97, count: 3, loss: 0.25 })],
      features: [moguls({ from: 0.46, to: 0.72, count: 4 })],
    },
    {
      name: 'Under the walls', shape: sweep({ side: 'right', radius: 70, degrees: 85, grade: 0.17 }), height: 0, billboards: 2,
      obstacles: [peg({ costume: 'mossy-boulder', at: 0.35, line: 'center' }), peg({ costume: 'mossy-boulder', at: 0.7, line: 'right' })],
    },
    { name: 'To the falls', shape: straight(40, { grade: 0.1 }), height: 0 },
    {
      name: 'The Christmas tree', shape: waterfall(55, { grade: 0.62, curtain: true }), height: 0,
      landmarks: [{ name: 'tree-waterfall', at: 0.5, side: 'left', distance: 28 }],
    },
    {
      name: 'In the spray', shape: straight(50, { grade: 0.13 }), height: 0,
      obstacles: [peg({ costume: 'mossy-boulder', at: 0.25, line: 'right' }), peg({ costume: 'mossy-boulder', at: 0.5, line: 'left' }), peg({ costume: 'mossy-boulder', at: 0.75, line: 'center' })],
    },
    {
      name: 'Round the rock',
      shape: splitter({ side: 'right', degrees: 0, approach: 55, merge: 30, balance: { tipOffset: -0.6, left: { drag: 1.3, scrub: 1.3 }, right: { drag: 1.9, scrub: 1.9 } } }),
      around: 'river-island', height: 0,
      obstacles: [peg({ costume: 'mossy-boulder', at: 0.06, line: 'right' }), peg({ costume: 'mossy-boulder', at: 0.14, line: 'left' }), peg({ costume: 'mossy-boulder', at: 0.21, line: 'center' })],
    },
    { name: 'Drop below the rock', shape: plunge(30, { grade: 0.22, from: 0.14 }), height: 0 },
    { name: 'Between the walls', shape: halfPipe({ first: 'right', width: 8, swings: 2, radius: 150, degrees: 18, grade: 0.11 }), height: 0, walls: 1 },
    {
      name: 'Run to the hairpin', shape: straight(45, { grade: 0.12 }), height: 0,
      obstacles: [slalom({ costume: 'river-stake', from: 0.3, to: 0.7, count: 3, loss: 0.2 })],
      features: [brake({ at: 0.05, length: 10, drag: 0.02 })],
    },
    { name: 'Boat dock hairpin', shape: hairpin({ side: 'left' }), height: 0 },
    {
      name: 'Past the boats', shape: sweep({ side: 'right', radius: 75, degrees: 70, grade: 0.15 }), height: 0,
      landmarks: [{ name: 'river-rafts', at: 0.5, side: 'right', distance: 26 }],
      obstacles: [slalom({ costume: 'river-stake', from: 0.3, to: 0.7, count: 4, loss: 0.3 })],
    },
    {
      name: 'To the dock', shape: straight(65, { grade: 0.16 }), height: 0, billboards: 2,
      obstacles: [slalom({ costume: 'river-stake', from: 0.7, to: 0.95, count: 3, loss: 0.3 })],
      features: [moguls({ from: 0.47, to: 0.65, count: 3 })],
    },
    { name: 'Finish', shape: runIn(), height: 0 },
  ],
});
