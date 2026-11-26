'use strict';

// Taroko Marble Gorge (Moses, 15 Nov 2026: six more Canyons tracks, the pack filled to 20; one of the two Wild ones).
// Taroko Gorge in Taiwan: off the end of a rope footbridge, a plunge and the field let go in waves, then the Nine
// Turns, S-bends under the marble walls, and through the old road's rock tunnel, out along the milky turquoise river, then
// the narrows (the track's big feature: a splitter round a pillar of marble standing where the gorge is tightest, the
// field dividing either side of it), past the shrine on its cliff with the waterfall pouring out beside it, a drop to
// the river, a sweep along it, the hairpin, S-bends under the marble walls and the last straight. Generic architecture
// only; no names on anything.
const {
  track, opening, straight, plunge, sBends, sweep, hairpin, splitter, runIn, peg, slalom, moguls, brake, curtain,
} = require('../trackKit');

module.exports = track({
  slug: 'taroko-marble-gorge',
  name: 'Taroko Marble Gorge',
  family: 'canyon',
  difficulty: 'hard',
  description: 'Taroko Gorge in Taiwan: off a rope footbridge, through the Nine Turns\' rock tunnels in the marble walls, round a marble pillar at the narrows, past the shrine and its waterfall on the cliff and along the turquoise river to the line.',
  surface: 'ice',
  biome: 'jungle',
  lighting: 'day',
  variants: ['sunset'],
  canyon: { palette: 'taroko', depth: 50, river: 'right', narrow: true },
  coaster: { colours: { support: '#5a5a58', rail: '#f2f2ee', tie: '#2f2f2e' } },
  signature: 'The narrows',
  tvCameras: [
    // (Just past the pillar, looking back at the field coming out either side of it.)
    { section: 'Past the shrine', at: 0.15, side: 'left', distance: 10, height: 11 },
    { section: 'Under the marble walls', at: 0.6, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'shrine-waterfall', scenery: ['rocks'], type: 'rope-bridge', gate: 'trapdoor', shots: { countdown: 'low-front', launch: 'low-chase' } },
  finish: { landmark: 'gorge-viewpoint' },
  opening: opening('clean-drop', {
    side: 'left',
    costumes: { block: 'mossy-boulder', slalom: 'river-stake' },
    names: { plunge: 'Off the footbridge', bends: 'The Nine Turns' },
    dress: { plunge: { height: 0 }, bends: { height: 0 } },
  }),
  sections: [
    {
      name: 'Through the old tunnels', shape: straight(70, { grade: 0.15 }), height: 0, tunnel: 'rock',
      obstacles: [peg({ costume: 'cairn', at: 0.2, line: 'right' }), peg({ costume: 'cairn', at: 0.32, line: 'left' }), slalom({ costume: 'river-stake', from: 0.5, to: 0.9, count: 4, loss: 0.25 })],
      features: [brake({ at: 0.04, length: 8, drag: 0.02 })],
    },
    {
      name: 'The narrows',
      shape: splitter({ side: 'left', degrees: 0, approach: 55, merge: 30, balance: { tipOffset: 0.6, left: { drag: 2.4, scrub: 2.4 }, right: { drag: 0.6, scrub: 0.6 } } }),
      around: 'marble-pillar', height: 0,
      obstacles: [peg({ costume: 'cairn', at: 0.06, line: 'left' }), peg({ costume: 'cairn', at: 0.14, line: 'right' }), peg({ costume: 'cairn', at: 0.21, line: 'center' })],
    },
    {
      name: 'Past the shrine', shape: straight(75, { grade: 0.15 }), height: 0,
      landmarks: [{ name: 'shrine-waterfall', at: 0.5, side: 'left', distance: 22 }],
      obstacles: [curtain({ costume: 'vines', at: 0.25, side: 'left' })],
      features: [brake({ at: 0.06, length: 10, drag: 0.02 }), moguls({ from: 0.45, to: 0.85, count: 4 })],
    },
    { name: 'Drop to the river', shape: plunge(45, { grade: 0.26, from: 0.15 }), height: 0, billboards: 1 },
    {
      name: 'Along the river', shape: sweep({ side: 'right', radius: 75, degrees: 120, grade: 0.15 }), height: 0, billboards: 1,
    },
    {
      name: 'Run to the hairpin', shape: straight(55, { grade: 0.14 }), height: 0,
      features: [brake({ at: 0.05, length: 10, drag: 0.02 })],
    },
    { name: 'Hairpin under the cliff', shape: hairpin({ side: 'left' }), height: 0 },
    {
      name: 'Under the marble walls', shape: sBends({ first: 'right', radius: 65, degrees: 80, grade: 0.17 }), height: 0,
      obstacles: [slalom({ costume: 'river-stake', from: 0.3, to: 0.7, count: 4, loss: 0.2 })],
    },
    {
      name: 'Last straight', shape: straight(65, { grade: 0.16 }), height: 0, billboards: 2,
      obstacles: [slalom({ costume: 'cairn', from: 0.3, to: 0.6, count: 3, loss: 0.15 })],
      features: [brake({ at: 0.05, length: 10, drag: 0.02 })],
    },
    { name: 'Finish', shape: runIn(), height: 0 },
  ],
});
