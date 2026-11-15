'use strict';

// Huayna Picchu Terraces (Moses, 15 Nov 2026: six more Peaks tracks, the pack filled to 20; one of the two Extreme ones).
// Huayna Picchu above Machu Picchu in Peru: off a stone tower and down the steep Inca stairs among pegs, a sweep along
// the green Inca terraces, a straight past the roofless stone citadel, the hairpin below it, S-bends under the
// sugarloaf peak, then round the terraced hill (the track's big feature: a splitter, the field dividing either side of
// a hill ringed with stone-faced terraces), a drop into the cloud forest, a straight along the river, a sweep down the
// river valley and the run to the line. The peak is scenery only; generic stone and plants; no names on anything.
const {
  track, opening, straight, plunge, sBends, sweep, hairpin, splitter, runIn, peg, slalom, brake, moguls,
} = require('../trackKit');

module.exports = track({
  slug: 'huayna-picchu-terraces',
  name: 'Huayna Picchu Terraces',
  family: 'peak',
  difficulty: 'extreme',
  description: 'Huayna Picchu above Machu Picchu: down the steep Inca stairs, along the green terraces, past the stone citadel, under the sugarloaf peak, round a terraced hill either side and down through the cloud forest to the river.',
  surface: 'snow',
  biome: 'jungle',
  lighting: 'day',
  variants: ['sunset'],
  peak: { palette: 'huayna-picchu' },
  coaster: { style: 'alpine', colours: { support: '#6a665e', rail: '#f2f0e8', tie: '#4a463e' } },
  signature: 'Round the terraced hill',
  tvCameras: [
    // (Just past the hill, looking back at the field coming out either side of it.)
    { section: 'Into the cloud forest', at: 0.3, side: 'left', distance: 10, height: 12 },
    { section: 'Past the citadel', at: 0.6, side: 'right', distance: 10, height: 11 },
  ],
  start: { landmark: 'inca-terraces', type: 'castle-tower', gate: 'paddle', shots: { countdown: 'low-front', launch: 'overhead' } },
  finish: { landmark: 'peak-camp' },
  opening: opening('peg-drop', {
    costumes: { peg: 'stone-block' },
    names: { plunge: 'Down the Inca stairs' },
    dress: { plunge: { height: 0, peak: { zone: 'rock' } } },
  }),
  sections: [
    {
      name: 'Along the terraces', shape: sweep({ side: 'right', radius: 80, degrees: 100, grade: 0.12 }), height: 0, peak: { zone: 'moorland' },
      landmarks: [{ name: 'inca-terraces', at: 0.5, side: 'left', distance: 30 }],
    },
    {
      name: 'Past the citadel', shape: straight(75, { grade: 0.11 }), height: 0, billboards: 1, peak: { zone: 'moorland' },
      landmarks: [{ name: 'stone-citadel', at: 0.5, side: 'right', distance: 32 }],
      features: [brake({ at: 0.08, length: 12, drag: 0.02 })],
      obstacles: [slalom({ costume: 'stone-block', from: 0.4, to: 0.85, count: 3, loss: 0.25 })],
    },
    { name: 'Hairpin below the citadel', shape: hairpin({ side: 'left' }), height: 0, peak: { zone: 'moorland' } },
    { name: 'Under the sugarloaf', shape: sBends({ first: 'right', radius: 65, degrees: 85, grade: 0.11 }), height: 0, billboards: 1, peak: { zone: 'cloud-forest' } },
    {
      name: 'Round the terraced hill',
      shape: splitter({ side: 'left', degrees: 0, approach: 55, merge: 30, balance: { tipOffset: 0.3, left: { drag: 1.4, scrub: 1.4 }, right: { drag: 1.4, scrub: 1.4 } } }),
      around: 'terraced-hill', height: 0, peak: { zone: 'moorland' },
      obstacles: [peg({ costume: 'stone-block', at: 0.06, line: 'left' }), peg({ costume: 'stone-block', at: 0.14, line: 'right' }), peg({ costume: 'stone-block', at: 0.21, line: 'center' })],
    },
    { name: 'Into the cloud forest', shape: plunge(40, { grade: 0.26, from: 0.14 }), height: 0, peak: { zone: 'cloud-forest' } },
    {
      name: 'Along the river', shape: straight(65, { grade: 0.11 }), height: 0, peak: { zone: 'cloud-forest' },
      features: [brake({ at: 0.05, length: 10, drag: 0.02 })],
      obstacles: [slalom({ costume: 'stone-block', from: 0.35, to: 0.85, count: 4, loss: 0.25 })],
    },
    {
      name: 'Down the river valley', shape: sweep({ side: 'left', radius: 75, degrees: 120, grade: 0.11 }), height: 0, peak: { zone: 'cloud-forest' },
    },
    {
      name: 'To the line', shape: straight(70, { grade: 0.11 }), height: 0, billboards: 2, peak: { zone: 'moorland' },
      obstacles: [slalom({ costume: 'stone-block', from: 0.62, to: 0.92, count: 3, loss: 0.3 })],
      features: [brake({ at: 0.05, length: 10, drag: 0.02 }), moguls({ from: 0.44, to: 0.56, count: 2 })],
    },
    { name: 'Finish', shape: runIn(), height: 0, peak: { zone: 'moorland' } },
  ],
});
