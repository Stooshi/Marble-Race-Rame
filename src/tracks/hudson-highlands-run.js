'use strict';

// Hudson Highlands Run (Moses, 13 Nov 2026: five more Rivers tracks, the pack filled to 20; one of the two Easy ones).
// The Hudson in autumn: off the top of the dark cliffs along its west bank, over a crest and down to the shore, along
// the foot of the cliffs, S-bends into the Highlands and round World's End, the river's sharpest bend between the
// mountains (the track's big feature: a long, deep banked turn, the field fanned up its banking), past a ruined castle
// on a little island, a drop to the water, the hairpin, a sweep back under the woods and the run-in to the landing.
// Generic river life only: sloops, a paddle steamer, a lighthouse; no real ship's, company's or building's name.
const {
  track, opening, straight, plunge, sBends, sweep, hairpin, runIn, peg, slalom, moguls,
} = require('../trackKit');

module.exports = track({
  slug: 'hudson-highlands-run',
  name: 'Hudson Highlands Run',
  family: 'river',
  difficulty: 'easy',
  description: 'The Hudson in autumn: off the top of the dark cliffs and down to the shore, along the foot of the cliffs, round World\'s End, the river\'s deepest bend between the Highlands, past a ruined castle on its island and back under the red and gold woods to the landing.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'day',
  variants: ['sunset'],
  river: { palette: 'hudson', side: 'left', width: 160, banks: 'rock', slope: 0.8, gap: 10 },
  coaster: { colours: { support: '#4a4440', rail: '#efe6d6', tie: '#2f2a26' } },
  signature: "World's End",
  tvCameras: [
    // (Near the end of the long bend, looking back round it at the field fanned up the banking.)
    { section: "World's End", at: 0.85, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'palisade-cliffs', type: 'lighthouse', gate: 'paddle', shots: { countdown: 'crane', launch: 'low-chase' } },
  finish: { landmark: 'paddle-steamer' },
  opening: opening('crest-start', {
    costumes: { block: 'log', slalom: 'river-stake' },
    names: { plunge: 'Off the cliffs', climb: 'The ledge', drop: 'Down to the shore' },
    // (Let go in waves, a new order every race, as on Nevada Drag Strip: without them the fourth starting group lost a little.)
    waves: { groups: 5, gap: 0.12, jitter: 0.04 },
    dress: { plunge: { height: 0, river: 'left' }, climb: { height: 0, river: 'left' }, drop: { height: 0, river: 'left' } },
  }),
  sections: [
    {
      name: 'Under the cliffs', shape: straight(85, { grade: 0.15 }), height: 0, river: 'left', billboards: 1,
      landmarks: [{ name: 'palisade-cliffs', at: 0.5, side: 'right', distance: 26 }],
      obstacles: [slalom({ costume: 'river-stake', from: 0.55, to: 0.9, count: 4, loss: 0.2 })],
      features: [moguls({ from: 0.12, to: 0.4, count: 4 })],
    },
    { name: 'Into the Highlands', shape: sBends({ first: 'left', radius: 72, degrees: 70, grade: 0.14 }), height: 0, river: 'left' },
    { name: "Run to World's End", shape: straight(45, { grade: 0.13 }), height: 0, river: 'left' },
    {
      name: "World's End", shape: sweep({ side: 'left', radius: 58, degrees: 205, grade: 0.13 }), height: 8, river: 'under', billboards: 2,
      landmarks: [{ name: 'river-sloops', at: 0.5, river: true, distance: 45 }],
    },
    {
      name: 'Past the island ruin', shape: straight(75, { grade: 0.15 }), height: 0, river: 'left',
      landmarks: [{ name: 'island-ruin', at: 0.5, river: true, distance: 30 }],
      obstacles: [peg({ costume: 'mooring-pole', at: 0.2, line: 'right' })],
      features: [moguls({ from: 0.5, to: 0.85, count: 4 })],
    },
    { name: 'Drop to the water', shape: plunge(45, { grade: 0.2, from: 0.15 }), height: 0, river: 'left' },
    { name: 'Run to the hairpin', shape: straight(50, { grade: 0.14 }), height: 0, river: 'left' },
    { name: 'Hairpin by the sloops', shape: hairpin({ side: 'right' }), height: 0, river: 'none' },
    {
      name: 'Under the woods', shape: sweep({ side: 'left', radius: 80, degrees: 100, grade: 0.17 }), height: 0, river: 'right',
    },
    { name: 'Last S-bends', shape: sBends({ first: 'right', radius: 75, degrees: 65, grade: 0.16 }), height: 0, river: 'right' },
    {
      name: 'To the landing', shape: straight(50, { grade: 0.16 }), height: 0, river: 'right', billboards: 2,
      landmarks: [{ name: 'paddle-steamer', at: 0.5, river: true, distance: 40 }],
      obstacles: [peg({ costume: 'mooring-pole', at: 0.3, line: 'left' })],
    },
    { name: 'Finish', shape: runIn(), height: 0, river: 'right' },
  ],
});
