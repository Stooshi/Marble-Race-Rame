'use strict';

// Giant's Causeway Run (Moses, 15 Nov 2026: seven new World Tour tracks fill the pack to 20; one of the three Wild
// ones). The north coast of Antrim on a bright windy day: off the headland and through a chicane between two outcrops (the
// chicane start, the field let go in waves), S-bends down the cliff path, a sweep along the clifftop past the ruined castle, across the swaying
// rope bridge to the little island (signature feature one), the hairpin, straight down the steep steps of the cliff
// (the track's big feature: a long steep drop), a half-pipe along the bay between the basalt columns and over the
// stepping columns of the causeway itself (signature feature two). Our own cliffs, columns and ruin; place names only.
const {
  track, opening, straight, plunge, sBends, sweep, hairpin, halfPipe, runIn, peg, slalom, brake, moguls,
} = require('../trackKit');

module.exports = track({
  slug: 'giants-causeway-run',
  name: 'Giant\'s Causeway Run',
  difficulty: 'hard',
  description: 'The north coast on a bright windy day: along the clifftop past the ruined castle, across the swaying rope bridge, straight down the steep steps of the cliff and over the stepping basalt columns of the causeway.',
  surface: 'stone',
  biome: 'meadow',
  lighting: 'day',
  variants: ['fog'],
  // The sea along the north of the run, the land ending in cliffs (looks only).
  sea: { toward: [0.15, -1], from: 0, coast: 30 },
  signature: 'Down the cliff steps',
  tvCameras: [
    // (At the foot of the cliff, looking back up the steps at the field coming down.)
    { section: 'Along the bay', at: 0.2, side: 'left', distance: 6, height: 15 },
    { section: 'Along the clifftop', at: 0.6, side: 'right', distance: 8, height: 8 },
  ],
  billboardFrame: 'wood',
  start: { landmark: 'island-ruin', gate: 'barrier', shots: { countdown: 'crane', launch: 'overhead' } },
  finish: { landmark: 'basalt-columns' },
  designChanges: [
    'Two big features from the real place: the swaying rope bridge to the little island, then straight down the steep steps of the cliff (the big feature) to the stepping basalt columns of the causeway.',
    'Our own cliffs, columns and ruin; place names only.',
  ],
  // (The chicane start: off the headland past the fallen rocks, then a tight chicane between two outcrops; the field
  // let go in waves.)
  opening: opening('chicane-start', {
    side: 'left',
    costumes: { block: 'rock', slalom: 'street-lamp', peg: 'rock' },
    names: { plunge: 'Off the headland', chicane: 'Between the outcrops' },
  }),
  sections: [
    {
      name: 'Along the headland', shape: straight(65, { grade: 0.13 }),
      features: [moguls({ from: 0.55, to: 0.95, count: 4 })],
      obstacles: [peg({ costume: 'rock', at: 0.15, line: 'right' }), peg({ costume: 'rock', at: 0.3, line: 'left' })],
    },
    {
      name: 'Down the cliff path', shape: sBends({ first: 'left', radius: 60, degrees: 95, grade: 0.13 }), billboards: 1,
      obstacles: [slalom({ costume: 'street-lamp', from: 0.3, to: 0.7, count: 3, loss: 0.3 })],
    },
    {
      name: 'Along the clifftop', shape: sweep({ side: 'right', radius: 90, degrees: 150, grade: 0.1 }), billboards: 2,
      landmarks: [{ name: 'island-ruin', at: 0.5, side: 'left', distance: 60 }],
      obstacles: [peg({ costume: 'rock', at: 0.2, line: 'left' }), peg({ costume: 'rock', at: 0.4, line: 'right' }), peg({ costume: 'rock', at: 0.6, line: 'center' }), peg({ costume: 'rock', at: 0.8, line: 'left' })],
    },
    {
      name: 'Over the rope bridge', shape: straight(60, { grade: 0.12 }), bridge: 'wood',
      obstacles: [peg({ costume: 'rock', at: 0.2, line: 'left' }), peg({ costume: 'rock', at: 0.4, line: 'right' })],
    },
    { name: 'Hairpin on the island', shape: hairpin({ side: 'left' }) },
    // The track's big feature: straight down the steep steps of the cliff.
    { name: 'Down the cliff steps', shape: plunge(80, { grade: 0.38, from: 0.16 }) },
    { name: 'Along the bay', shape: halfPipe({ first: 'right', width: 8, swings: 3, radius: 150, degrees: 16, grade: 0.12 }) },
    {
      name: 'Over the stepping columns', shape: straight(100, { grade: 0.12 }), billboards: 1,
      landmarks: [{ name: 'basalt-columns', at: 0.35, side: 'left', distance: 24 }],
      features: [brake({ at: 0.04, length: 10, drag: 0.02 }), moguls({ from: 0.32, to: 0.52, count: 4 })],
      obstacles: [slalom({ costume: 'street-lamp', from: 0.62, to: 0.94, count: 4, loss: 0.35 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
