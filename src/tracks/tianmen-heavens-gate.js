'use strict';

// Tianmen Heaven's Gate (Moses, 15 Nov 2026: six more Peaks tracks, the pack filled to 20; one of the two Wild ones).
// Tianmen Mountain in China: out of the lift in the cliff and down the rough rock path (the rumble start, the field
// let go in waves), a drop down the cliff face, the road of the 99 bends in S-bends, a sweep along the cliff walk, a
// drop off the cliff, the hairpin, then through Heaven's Gate (the track's big feature: a loop under the great arch
// that goes right through the mountain, the field going right round it), a rise out of the gate, S-bends down through
// the misty forest and the last straight. Generic rock, road and forest; no names on anything.
const {
  track, opening, straight, plunge, climb, sBends, sweep, hairpin, runIn, peg, slalom, brake, loop, curtain,
} = require('../trackKit');

module.exports = track({
  slug: 'tianmen-heavens-gate',
  name: 'Tianmen Heaven\'s Gate',
  family: 'peak',
  difficulty: 'hard',
  description: 'Tianmen Mountain in China: out of the lift in the cliff and down the cliff face, along the road of the 99 bends, round the cliff walk and off the cliff, then right round a loop under the great arch through the mountain and down through the misty forest to the line.',
  surface: 'snow',
  biome: 'jungle',
  lighting: 'day',
  variants: ['sunset'],
  peak: { palette: 'tianmen' },
  coaster: { style: 'alpine', colours: { support: '#5f564e', rail: '#f2eee6', tie: '#3a342f' } },
  signature: 'Through Heaven\'s Gate',
  tvCameras: [
    // (Past the loop, looking back at the field coming down out of it under the arch.)
    { section: 'Through Heaven\'s Gate', at: 0.85, side: 'left', distance: 10, height: 12 },
    { section: 'Along the cliff walk', at: 0.5, side: 'right', distance: 10, height: 11 },
  ],
  start: { landmark: 'switchback-road', type: 'elevator', gate: 'paddle', shots: { countdown: 'chase', launch: 'overhead' } },
  finish: { landmark: 'peak-camp' },
  opening: opening('rumble-start', {
    costumes: { slalom: 'cairn' },
    names: { plunge: 'Out of the lift' },
    // (Let go in short waves with more jitter, a new order every race: with the opening's own, the fourth starting group did better.)
    waves: { groups: 5, gap: 0.12, jitter: 0.1 },
    dress: { plunge: { height: 0, peak: { zone: 'rock' } } },
  }),
  sections: [
    { name: 'Down the cliff face', shape: plunge(40, { grade: 0.26, from: 0.12 }), height: 0, peak: { zone: 'rock' } },
    {
      name: 'The 99 bends', shape: sBends({ first: 'left', radius: 55, degrees: 90, grade: 0.18 }), height: 0, billboards: 1, peak: { zone: 'cloud-forest' },
      landmarks: [{ name: 'switchback-road', at: 0.5, side: 'right', distance: 40 }],
      obstacles: [peg({ costume: 'cairn', at: 0.3, line: 'right' }), peg({ costume: 'cairn', at: 0.7, line: 'left' })],
    },
    {
      name: 'Along the cliff walk', shape: sweep({ side: 'left', radius: 70, degrees: 110, grade: 0.16 }), height: 0, peak: { zone: 'rock' },
    },
    { name: 'Off the cliff', shape: plunge(38, { grade: 0.26, from: 0.15 }), height: 0, peak: { zone: 'rock' } },
    {
      name: 'Run to the hairpin', shape: straight(55, { grade: 0.14 }), height: 0, peak: { zone: 'cloud-forest' },
      features: [brake({ at: 0.05, length: 12, drag: 0.02 })],
      obstacles: [curtain({ costume: 'vines', at: 0.55, side: 'right' })],
    },
    { name: 'Hairpin under the arch', shape: hairpin({ side: 'right' }), height: 0, peak: { zone: 'cloud-forest' } },
    {
      name: 'Through Heaven\'s Gate', shape: straight(170, { grade: 0.13 }), height: 0, peak: { zone: 'rock' },
      landmarks: [{ name: 'sky-arch', at: 0.45, side: 'left', distance: 46 }],
      features: [brake({ at: 0.08, length: 14, drag: 0.03 }), loop({ at: 0.45, viewSide: 14 })],
    },
    { name: 'Up out of the gate', shape: climb(12, { grade: -0.04, after: 0.3 }), height: 0, billboards: 1, peak: { zone: 'rock' } },
    {
      name: 'Down the misty forest', shape: sBends({ first: 'left', radius: 65, degrees: 80, grade: 0.16 }), height: 0, billboards: 1, peak: { zone: 'cloud-forest' },
      obstacles: [peg({ costume: 'mossy-boulder', at: 0.35, line: 'left' }), peg({ costume: 'mossy-boulder', at: 0.7, line: 'right' })],
    },
    {
      name: 'Last straight', shape: straight(65, { grade: 0.16 }), height: 0, billboards: 1, peak: { zone: 'cloud-forest' },
      obstacles: [curtain({ costume: 'vines', at: 0.3, side: 'left' }), slalom({ costume: 'cairn', from: 0.55, to: 0.92, count: 4, loss: 0.35 })],
      features: [brake({ at: 0.05, length: 10, drag: 0.02 })],
    },
    { name: 'Finish', shape: runIn(), height: 0, peak: { zone: 'cloud-forest' } },
  ],
});
