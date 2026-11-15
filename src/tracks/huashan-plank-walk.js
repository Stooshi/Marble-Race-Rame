'use strict';

// Huashan Plank Walk (Moses, 15 Nov 2026: six more Peaks tracks, the pack filled to 20; one of the two Easy ones).
// Huashan in China, a mountain of sheer granite peaks: off a spiral tower, down from the north peak, over the saddle
// and into the gorge (the field let go in waves), along a knife-edge ridge, then the plank walk (the track's big
// feature: a dramatic banked turn on high supports round the sheer cliff where narrow planks are bolted to the rock),
// a rise towards the west peak, S-bends among the cliff pines, down the stone stairs cut into the cliff, a half-pipe
// down a gully, the hairpin, a sweep under the west peak and the last straight. The peaks are scenery only: no temple,
// shrine or sign of ours; no names on anything.
const {
  track, opening, straight, plunge, climb, sBends, sweep, hairpin, halfPipe, runIn, peg, slalom, brake,
} = require('../trackKit');

module.exports = track({
  slug: 'huashan-plank-walk',
  name: 'Huashan Plank Walk',
  family: 'peak',
  difficulty: 'easy',
  description: 'Huashan in China: down from the north peak and over the saddle, along a knife-edge ridge, round the sheer cliff of the plank walk high on its supports, down the stone stairs cut in the rock and through the cliff pines to the line.',
  surface: 'snow',
  biome: 'alpine',
  lighting: 'day',
  variants: ['sunset'],
  peak: { palette: 'huashan' },
  coaster: { style: 'alpine', colours: { support: '#7a6c64', rail: '#f2eee8', tie: '#4f4540' } },
  signature: 'The plank walk',
  tvCameras: [
    // (At the foot of the plank walk's turn, looking back round it at the field coming off the cliff.)
    { section: 'Up to the west peak', at: 0.5, side: 'left', distance: 10, height: 12 },
    { section: 'In the gully', at: 0.6, side: 'right', distance: 10, height: 11 },
  ],
  start: { landmark: 'cliff-stairs', type: 'spiral-tower', gate: 'stalls', shots: { countdown: 'crane', launch: 'low-chase' } },
  finish: { landmark: 'peak-camp' },
  opening: opening('crest-start', {
    costumes: { block: 'mossy-boulder', slalom: 'cairn' },
    names: { plunge: 'Off the north peak', climb: 'Over the saddle', drop: 'Into the gorge' },
    // (Let go in waves, a new order every race.)
    waves: { groups: 5, gap: 0.12, jitter: 0.04 },
    dress: { plunge: { height: 0, peak: { zone: 'rock' } }, climb: { height: 0, peak: { zone: 'rock' } }, drop: { height: 0, peak: { zone: 'rock' } } },
  }),
  sections: [
    {
      name: 'Along the ridge', shape: sweep({ side: 'left', radius: 90, degrees: 70, grade: 0.12 }), height: 6, peak: { zone: 'rock', ridge: true },
      obstacles: [peg({ costume: 'cairn', at: 0.4, line: 'right' }), peg({ costume: 'cairn', at: 0.75, line: 'left' })],
      features: [brake({ at: 0.1, length: 12, drag: 0.02 })],
    },
    {
      name: 'The plank walk', shape: sweep({ side: 'right', radius: 45, degrees: 170, grade: 0.12 }), height: 8, billboards: 1, peak: { zone: 'rock' },
      landmarks: [{ name: 'plank-walk', at: 0.5, side: 'left', distance: 30 }],
    },
    { name: 'Up to the west peak', shape: climb(12, { grade: -0.03, after: 0.3 }), height: 0, billboards: 1, peak: { zone: 'rock' } },
    {
      name: 'Among the cliff pines', shape: sBends({ first: 'left', radius: 60, degrees: 85, grade: 0.12 }), height: 0, peak: { zone: 'cloud-forest' },
      obstacles: [slalom({ costume: 'cairn', from: 0.3, to: 0.7, count: 4, loss: 0.25 })],
    },
    {
      name: 'Down the cliff stairs', shape: plunge(45, { grade: 0.28, from: 0.15 }), height: 0, peak: { zone: 'rock' },
      landmarks: [{ name: 'cliff-stairs', at: 0.6, side: 'right', distance: 30 }],
    },
    { name: 'In the gully', shape: halfPipe({ first: 'right', width: 8, swings: 2, radius: 150, degrees: 16, grade: 0.12 }), height: 0, peak: { zone: 'rock' } },
    {
      name: 'Run to the hairpin', shape: straight(55, { grade: 0.12 }), height: 0, peak: { zone: 'cloud-forest' },
      features: [brake({ at: 0.05, length: 12, drag: 0.02 })],
    },
    { name: 'Hairpin under the cliff', shape: hairpin({ side: 'left' }), height: 0, peak: { zone: 'cloud-forest' } },
    { name: 'Under the west peak', shape: sweep({ side: 'right', radius: 75, degrees: 110, grade: 0.12 }), height: 0, billboards: 1, peak: { zone: 'rock' } },
    {
      name: 'Last straight', shape: straight(70, { grade: 0.13 }), height: 0, billboards: 2, peak: { zone: 'cloud-forest' },
      obstacles: [slalom({ costume: 'cairn', from: 0.3, to: 0.65, count: 3, loss: 0.15 })],
      features: [brake({ at: 0.05, length: 10, drag: 0.02 })],
    },
    { name: 'Finish', shape: runIn(), height: 0, peak: { zone: 'cloud-forest' } },
  ],
});
