'use strict';

// Eiger North Face (Moses, 15 Nov 2026: six more Peaks tracks, the pack filled to 20; one of the two Wild ones). The
// Eiger in the Bernese Alps: off a ski jump's in-run and down the snow path (the rumble start, the field let go in
// waves), a sweep across the snowfield, a straight under the great dark north face where the railway's windows look
// out of the rock, a drop down the glacier, then round the window pillar (the track's big feature: a banked spiral
// round a pillar of dark rock with the gallery's windows cut in it), a straight below it among the seracs, a sweep
// along the glacier, the hairpin by the hut, a rise over the moraine, S-bends down the pasture beside the cog railway
// and the last straight. Generic train and rock; no names on anything.
const {
  track, opening, straight, plunge, climb, sBends, sweep, spiral, hairpin, runIn, slalom, brake,
} = require('../trackKit');

module.exports = track({
  slug: 'eiger-north-face',
  name: 'Eiger North Face',
  family: 'peak',
  difficulty: 'hard',
  description: 'The Eiger in the Bernese Alps: off a ski jump, across the snowfield under the great dark north face, down the glacier, round and round a rock pillar with the railway\'s windows in it, along the glacier and down the pasture beside the cog railway.',
  surface: 'snow',
  biome: 'alpine',
  lighting: 'day',
  variants: ['sunset'],
  peak: { palette: 'eiger' },
  coaster: { style: 'alpine', colours: { support: '#4a4744', rail: '#f2f4f6', tie: '#2f2d2b' } },
  signature: 'Round the window pillar',
  tvCameras: [
    // (Low on the outside at the end of the spiral, looking back round it at the field coming down.)
    { section: 'Round the window pillar', at: 0.85, side: 'left', distance: 10, height: 12 },
    { section: 'Along the railway', at: 0.5, side: 'left', distance: 10, height: 11 },
  ],
  start: { landmark: 'cog-railway', type: 'ski-jump', gate: 'barrier', shots: { countdown: 'low-front', launch: 'low-chase' } },
  finish: { landmark: 'peak-camp' },
  opening: opening('rumble-start', {
    costumes: { slalom: 'cairn' },
    names: { plunge: 'Down the snow path' },
    // (Let go in shorter waves, a new order every race: the opening's own longer waves favour one starting group.)
    waves: { groups: 5, gap: 0.12, jitter: 0.04 },
    dress: { plunge: { height: 0, peak: { zone: 'snow' } } },
  }),
  sections: [
    { name: 'Across the snowfield', shape: sweep({ side: 'right', radius: 80, degrees: 90, grade: 0.16 }), height: 0, billboards: 1, peak: { zone: 'snow' } },
    {
      name: 'Under the north face', shape: straight(65, { grade: 0.16 }), height: 0, peak: { zone: 'snow' },
      landmarks: [{ name: 'gallery-windows', at: 0.5, side: 'right', distance: 46 }],
      obstacles: [slalom({ costume: 'cairn', from: 0.5, to: 0.9, count: 4, loss: 0.2 })],
      features: [brake({ at: 0.05, length: 12, drag: 0.02 })],
    },
    { name: 'Down the glacier', shape: plunge(40, { grade: 0.24, from: 0.15 }), height: 0, peak: { zone: 'ice' } },
    { name: 'Round the window pillar', shape: spiral({ side: 'left', radius: 42, turns: 1, grade: 0.19 }), height: 8, around: 'window-pillar', billboards: 1, peak: { zone: 'rock' } },
    {
      name: 'Below the pillar', shape: straight(65, { grade: 0.13 }), height: 0, peak: { zone: 'ice' },
      obstacles: [slalom({ costume: 'serac', from: 0.3, to: 0.8, count: 4, loss: 0.25 })],
    },
    { name: 'Along the glacier', shape: sweep({ side: 'right', radius: 80, degrees: 90, grade: 0.17 }), height: 0, peak: { zone: 'ice' } },
    {
      name: 'Run to the hairpin', shape: straight(50, { grade: 0.15 }), height: 0, peak: { zone: 'snow' },
    },
    { name: 'Hairpin by the hut', shape: hairpin({ side: 'left' }), height: 0, peak: { zone: 'snow' } },
    { name: 'Over the moraine', shape: climb(12, { grade: -0.04, after: 0.3 }), height: 0, peak: { zone: 'rock' } },
    {
      name: 'Along the railway', shape: sBends({ first: 'right', radius: 65, degrees: 80, grade: 0.15 }), height: 0, billboards: 1, peak: { zone: 'moorland' },
      landmarks: [{ name: 'cog-railway', at: 0.5, side: 'right', distance: 30 }],
    },
    {
      name: 'Last straight', shape: straight(70, { grade: 0.16 }), height: 0, billboards: 1, peak: { zone: 'moorland' },
      obstacles: [slalom({ costume: 'cairn', from: 0.3, to: 0.65, count: 3, loss: 0.15 })],
      features: [brake({ at: 0.05, length: 10, drag: 0.02 })],
    },
    { name: 'Finish', shape: runIn(), height: 0, peak: { zone: 'moorland' } },
  ],
});
