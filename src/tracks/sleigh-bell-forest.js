'use strict';

// Sleigh Bell Forest: Holiday Season 2026 track (Winter Wonders), Track of the Day on 23 December.
// A moonlit fir forest: a crest start at the gate, over the snowbank, the jib line along the sleigh path beside a
// reindeer herd crossing the snow, into the firs, the owl wood bends, the forest bends, the
// hairpin, the moonlit sweep under lanterns, the bell drop and the run to the clearing where the
// owls watch from their stumps.
const { track, opening, straight, sBends, sweep, plunge, hairpin, runIn, peg, slalom, swipe, rumble, jibLine, curtain } = require('../trackKit');

module.exports = track({
  slug: 'sleigh-bell-forest',
  name: 'Sleigh Bell Forest',
  family: 'winter-wonders',
  season: 'holiday-2026',
  difficulty: 'extreme',
  description: 'A moonlit fir forest: along the lantern-lit sleigh path beside a reindeer herd crossing the snow, through the owl wood, round the moonlit sweep and down the bell drop to the clearing.',
  surface: 'snow',
  biome: 'arctic',
  lighting: 'night',
  variants: ['snow'],
  signature: 'Sleigh path jib line',
  tvCameras: [
    { section: 'Sleigh path jib line', at: 0.6, side: 'left', distance: 8, height: 14 },
    { section: 'Moonlit sweep', at: 0.5, side: 'right', distance: 8, height: 14 },
  ],
  start: { landmark: 'owl-perches', gate: 'paddle', shots: { countdown: 'side', launch: 'high-behind' } },
  finish: { landmark: 'owl-perches', scenery: ['pines'] },
  designChanges: [
    'No splitter: no setting gave its smaller channel a real share (30–70%) and passed the fairness checks, so bends under a banner gantry take its place (Moses: every splitter under 30%, 19 Oct).',
    'The forest is ours: firs and birches under the moon, owls on snowy stumps, a reindeer herd crossing beside the sleigh path and lanterns hung along the sweep. The jib line (a rail, a box and a table top) runs along the sleigh path, as planned.',
  ],
  opening: opening('crest-start', { costumes: { block: 'giant-snowball', slalom: 'ice-lantern' }, names: { plunge: 'Sleigh run drop', climb: 'Up the snowbank', drop: 'Over the crest' } }),
  sections: [
    {
      name: 'Sleigh path jib line', shape: straight(120, { grade: 0.1 }), billboards: 1,
      obstacles: [peg({ costume: 'ice-lantern', at: 0.05, line: 'left' })],
      features: [jibLine({ from: 0.15 })], landmarks: [{ name: 'reindeer-herd', side: 'right', at: 0.5, distance: 16 }],
    },
    { name: 'Into the firs', shape: sweep({ side: 'right', radius: 85, degrees: 50, grade: 0.09 }), scenery: ['pines'], billboards: 2 },
    {
      name: 'Owl wood bends', shape: sBends({ first: 'left', radius: 65, degrees: 85, grade: 0.12 }), scenery: ['birches'], billboards: 1,
      landmarks: [{ name: 'owl-perches', side: 'right', at: 0.5, distance: 12 }],
    },
    { name: 'Forest bends', shape: sBends({ first: 'left', radius: 70, degrees: 70, grade: 0.12 }), obstacles: [curtain({ costume: 'banner-gantry', at: 0.5, side: 'right' })] },
    {
      name: 'Run to the hairpin', shape: straight(45, { grade: 0.11 }),
      obstacles: [peg({ costume: 'ice-lantern', at: 0.2, line: 'center' }), peg({ costume: 'ice-lantern', at: 0.45, line: 'left' }), peg({ costume: 'ice-lantern', at: 0.7, line: 'right' })],
    },
    { name: 'Hairpin', shape: hairpin({ side: 'right' }), obstacles: [swipe({ costume: 'stag', side: 'high' })] },
    {
      name: 'Moonlit sweep', shape: sweep({ side: 'left', radius: 80, degrees: 70, grade: 0.09 }),
      landmarks: [{ name: 'hanging-lanterns', side: 'high', at: 0.5, distance: 20 }],
    },
    { name: 'Bell drop', shape: plunge(45, { grade: 0.18, from: 0.1 }), obstacles: [slalom({ costume: 'ice-lantern', from: 0.35, to: 0.9, count: 4, loss: 0.12 })] },
    {
      name: 'Run to the clearing', shape: straight(85, { grade: 0.14 }), scenery: ['pines'],
      obstacles: [peg({ costume: 'ice-lantern', at: 0.15, line: 'right' }), peg({ costume: 'ice-lantern', at: 0.3, line: 'left' }), peg({ costume: 'ice-lantern', at: 0.45, line: 'center' })],
      features: [rumble({ from: 0.65, to: 0.95, count: 3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
