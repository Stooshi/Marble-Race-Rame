'use strict';

// Hallstatt Salt Mine Run (Moses, 15 Nov 2026: seven new World Tour tracks fill the pack to 20; one of the three Wild
// ones). The lakeside village under the mountain on a still winter morning: down the village lanes (the chicane
// start, the field let go in waves), along the lakeshore past the pastel houses and the church spire, up the
// mountain beside the funicular (signature feature one), then down the old miners' wooden slide inside the salt mine
// (the track's big feature and signature feature two: a long steep drop through the mine), the hairpin and back along
// the lake to the market square. Our own houses, church and mine buildings; place names only.
const {
  track, opening, straight, plunge, climb, sweep, hairpin, runIn, peg, slalom, brake,
} = require('../trackKit');

module.exports = track({
  slug: 'hallstatt-salt-mine-run',
  name: 'Hallstatt Salt Mine Run',
  difficulty: 'hard',
  description: 'The lakeside village under the mountain on a still winter morning: along the lake past the pastel houses and the church spire, up beside the funicular and down the old miners\' slide inside the salt mine, back along the lake to the market square.',
  surface: 'stone',
  biome: 'alpine',
  lighting: 'dawn',
  variants: ['day'],
  // The lake along the east of the run, the mountain falling to it (looks only).
  sea: { toward: [1, 0.15], from: 0, coast: 30 },
  signature: 'Down the miners\' slide',
  tvCameras: [
    // (At the foot of the slide, looking back up into the mine at the field coming down it.)
    { section: 'Run to the hairpin', at: 0.6, side: 'left', distance: 8, height: 10 },
    { section: 'Along the lake', at: 0.2, side: 'right', distance: 8, height: 8 },
  ],
  billboardFrame: 'wood',
  start: { landmark: 'lakeside-village', gate: 'paddle', shots: { countdown: 'crane', launch: 'side' } },
  finish: { landmark: 'lakeside-village' },
  designChanges: [
    'Two big features from the real place: the climb beside the funicular up the mountain, then the old miners\' wooden slide down inside the salt mine (the big feature: a long steep drop through the mine).',
    'Our own houses, church and mine buildings; place names only.',
  ],
  // (The chicane start: down the steep village lane, then a tight chicane between the houses; let go in waves.)
  opening: opening('chicane-start', {
    side: 'right',
    costumes: { block: 'cafe-table', slalom: 'street-lamp', peg: 'street-lamp' },
    names: { plunge: 'Down the village lane', chicane: 'Between the houses' },
  }),
  sections: [
    { name: 'Across the square', shape: straight(40, { grade: 0.12 }), features: [brake({ at: 0.15, length: 12 })] },
    {
      name: 'Along the lake', shape: sweep({ side: 'right', radius: 90, degrees: 150, grade: 0.1 }), billboards: 1,
      obstacles: [peg({ costume: 'street-lamp', at: 0.3, line: 'right' }), peg({ costume: 'street-lamp', at: 0.6, line: 'left' })],
      landmarks: [{ name: 'lakeside-village', at: 0.5, side: 'left', distance: 36 }],
    },
    {
      name: 'Up beside the funicular', shape: climb(14, { grade: -0.04, after: 0.3 }),
      landmarks: [{ name: 'cog-railway', at: 0.5, side: 'left', distance: 30 }],
    },
    // The track's big feature: down the old miners' wooden slide inside the salt mine.
    { name: 'Down the miners\' slide', shape: plunge(75, { grade: 0.36, from: 0.16 }), tunnel: 'mine' },
    {
      name: 'Run to the hairpin', shape: straight(60, { grade: 0.13 }), billboards: 1,
      landmarks: [{ name: 'mine-buildings', at: 0.6, side: 'right', distance: 20 }],
      obstacles: [slalom({ costume: 'street-lamp', from: 0.3, to: 0.65, count: 3, loss: 0.3 })],
    },
    { name: 'Hairpin above the lake', shape: hairpin({ side: 'left' }) },
    {
      name: 'Along the lakeshore', shape: sweep({ side: 'right', radius: 90, degrees: 150, grade: 0.1 }), billboards: 2,
      obstacles: [peg({ costume: 'street-lamp', at: 0.3, line: 'left' }), peg({ costume: 'street-lamp', at: 0.65, line: 'right' })],
    },
    {
      name: 'To the market square', shape: straight(100, { grade: 0.12 }), billboards: 1,
      features: [brake({ at: 0.05, length: 10, drag: 0.02 })],
      obstacles: [slalom({ costume: 'street-lamp', from: 0.5, to: 0.9, count: 3, loss: 0.3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
