'use strict';

// Bryce Hoodoo Run (Moses, 15 Nov 2026: six more Canyons tracks, the pack filled to 20; one of the two Easy ones).
// Bryce Canyon in Utah at sunrise: off the rim and through a chicane among the spires (the field
// let go in waves), a sweep along the hoodoos (an
// amphitheatre of orange and white rock spires), the run to Wall Street, then the switchbacks down it (the track's big
// feature: two pairs of steep banked switchbacks in a narrow slot between tall walls, firs reaching for the light),
// a drop to the floor, past a hammer-headed hoodoo, the hairpin, S-bends through the garden of hoodoos and the line.
// Generic rock and trees only; no names on anything.
const {
  track, opening, straight, plunge, sBends, sweep, hairpin, runIn, peg, slalom, curtain, brake,
} = require('../trackKit');

module.exports = track({
  slug: 'bryce-hoodoo-run',
  name: 'Bryce Hoodoo Run',
  family: 'canyon',
  difficulty: 'easy',
  description: 'Bryce Canyon at sunrise: off the rim into the amphitheatre of orange and white hoodoos, down the steep banked switchbacks of Wall Street between tall walls, past a hammer-headed hoodoo and through the garden of spires to the line.',
  surface: 'ice',
  biome: 'desert',
  lighting: 'sunset',
  variants: ['day'],
  canyon: { palette: 'bryce', depth: 36, river: 'none' },
  coaster: { colours: { support: '#8a4a2e', rail: '#f6ece0', tie: '#5a3424' } },
  signature: 'Wall Street switchbacks',
  tvCameras: [
    // (At the foot of the switchbacks, looking back up them at the field swinging down the banking.)
    { section: 'Wall Street switchbacks', at: 0.9, side: 'left', distance: 9, height: 12 },
  ],
  start: { landmark: 'hoodoo-amphitheatre', scenery: ['rocks'], type: 'castle-tower', gate: 'paddle', shots: { countdown: 'crane', launch: 'high-behind' } },
  finish: { landmark: 'rim-lookout' },
  opening: opening('chicane-start', {
    side: 'right',
    costumes: { block: 'mossy-boulder', slalom: 'cairn', peg: 'cairn' },
    names: { plunge: 'Off the rim', chicane: 'Among the spires' },
    dress: { plunge: { height: 0 }, chicane: { height: 0 } },
  }),
  sections: [
    {
      name: 'Along the hoodoos', shape: sweep({ side: 'left', radius: 80, degrees: 110, grade: 0.16 }), height: 0, billboards: 1,
      landmarks: [{ name: 'hoodoo-amphitheatre', at: 0.5, side: 'right', distance: 30 }],
    },
    {
      name: 'To Wall Street', shape: straight(70, { grade: 0.16 }), height: 0,
      obstacles: [slalom({ costume: 'cairn', from: 0.45, to: 0.9, count: 4, loss: 0.15 })],
      features: [brake({ at: 0.1, length: 15, drag: 0.02 })],
    },
    { name: 'Wall Street switchbacks', shape: sBends({ first: 'left', radius: 46, degrees: 105, grade: 0.17 }), height: 0, walls: 1 },
    { name: 'Lower switchbacks', shape: sBends({ first: 'left', radius: 56, degrees: 95, grade: 0.17 }), height: 0, walls: 1, billboards: 1 },
    { name: 'Drop to the floor', shape: plunge(45, { grade: 0.22, from: 0.15 }), height: 0 },
    {
      name: 'Past the hammer', shape: straight(65, { grade: 0.17 }), height: 0,
      landmarks: [{ name: 'hammer-hoodoo', at: 0.4, side: 'right', distance: 16 }],
      obstacles: [slalom({ costume: 'cairn', from: 0.3, to: 0.7, count: 4, loss: 0.2 })],
      features: [brake({ at: 0.05, length: 12, drag: 0.02 })],
    },
    { name: 'Hairpin by the spires', shape: hairpin({ side: 'right' }), height: 0 },
    {
      name: 'Through the garden', shape: sBends({ first: 'right', radius: 75, degrees: 60, grade: 0.18 }), height: 0,
      obstacles: [peg({ costume: 'cairn', at: 0.3, line: 'right' }), peg({ costume: 'cairn', at: 0.7, line: 'left' })],
    },
    {
      name: 'To the line', shape: straight(70, { grade: 0.17 }), height: 0, billboards: 2,
      features: [brake({ at: 0.04, length: 12, drag: 0.02 })],
    },
    { name: 'Finish', shape: runIn(), height: 0 },
  ],
});
