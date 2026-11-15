'use strict';

// Etna Valle del Bove (Moses, 15 Nov 2026: six more Peaks tracks, the pack filled to 20; one of the two Extreme ones).
// Etna on Sicily: out of the cable car and through the black cinders (the sand-trap start, the field let go in waves),
// S-bends past the smoking craters, a straight beside a glowing lava flow, then into the Valle del Bove (the track's big
// feature: a long drop off the rim into the great horseshoe valley in the volcano's flank), across the valley floor, a
// half-pipe down an old lava channel, a rise over the old flow, the hairpin, S-bends through the pinewoods and the run
// to the line. Generic rock and smoke; no names on anything.
const {
  track, opening, straight, plunge, climb, sBends, sweep, hairpin, halfPipe, runIn, peg, slalom, brake, moguls,
} = require('../trackKit');

module.exports = track({
  slug: 'etna-valle-del-bove',
  name: 'Etna Valle del Bove',
  family: 'peak',
  difficulty: 'extreme',
  description: 'Etna on Sicily: through the black cinders past the smoking craters, beside a glowing lava flow, off the rim and down into the great valley in the volcano\'s flank, down an old lava channel and through the pinewoods to the line.',
  surface: 'snow',
  biome: 'alpine',
  lighting: 'sunset',
  variants: ['day'],
  peak: { palette: 'etna' },
  coaster: { style: 'alpine', colours: { support: '#3a3230', rail: '#f2ece6', tie: '#221e1c' } },
  signature: 'Into the Valle del Bove',
  tvCameras: [
    // (On the valley floor, looking back up the drop at the field pouring off the rim.)
    { section: 'Across the valley floor', at: 0.3, side: 'left', distance: 10, height: 12 },
    { section: 'Through the pinewoods', at: 0.5, side: 'right', distance: 10, height: 11 },
  ],
  start: { landmark: 'smoking-crater', type: 'gondola', gate: 'barrier', shots: { countdown: 'crane', launch: 'side' } },
  finish: { landmark: 'peak-camp' },
  opening: opening('sand-trap', {
    costumes: { block: 'stone-block', slalom: 'cairn' },
    names: { plunge: 'Through the black cinders' },
    // (Let go in waves, a new order every race: without them the front starting places win more.)
    waves: { groups: 5, gap: 0.12, jitter: 0.04 },
    dress: { plunge: { height: 0, peak: { zone: 'black-sand' } } },
  }),
  sections: [
    {
      name: 'Past the craters', shape: sBends({ first: 'left', radius: 70, degrees: 70, grade: 0.16 }), height: 0, billboards: 1, peak: { zone: 'black-sand' },
      landmarks: [{ name: 'smoking-crater', at: 0.5, side: 'right', distance: 44 }],
      obstacles: [peg({ costume: 'stone-block', at: 0.35, line: 'right' }), peg({ costume: 'stone-block', at: 0.7, line: 'left' })],
    },
    {
      name: 'Beside the lava', shape: straight(75, { grade: 0.15 }), height: 0, peak: { zone: 'black-sand' },
      landmarks: [{ name: 'lava-flow', at: 0.5, side: 'left', distance: 36 }],
      obstacles: [slalom({ costume: 'stone-block', from: 0.5, to: 0.9, count: 4, loss: 0.25 })],
      features: [brake({ at: 0.05, length: 12, drag: 0.02 })],
    },
    { name: 'To the rim', shape: straight(35, { grade: 0.12 }), height: 0, peak: { zone: 'alpine-desert' } },
    { name: 'Into the Valle del Bove', shape: plunge(50, { grade: 0.34, from: 0.12 }), height: 0, peak: { zone: 'alpine-desert' } },
    {
      name: 'Across the valley floor', shape: straight(55, { grade: 0.14 }), height: 0, peak: { zone: 'black-sand' },
      obstacles: [peg({ costume: 'stone-block', at: 0.5, line: 'center' })],
    },
    { name: 'Down the lava channel', shape: halfPipe({ first: 'left', width: 8, swings: 2, radius: 150, degrees: 16, grade: 0.13 }), height: 0, peak: { zone: 'black-sand' } },
    { name: 'Over the old flow', shape: climb(12, { grade: -0.04, after: 0.3 }), height: 0, billboards: 1, peak: { zone: 'alpine-desert' } },
    {
      name: 'Run to the hairpin', shape: straight(60, { grade: 0.14 }), height: 0, peak: { zone: 'heath' },
      features: [brake({ at: 0.05, length: 10, drag: 0.02 })],
    },
    { name: 'Hairpin by the woods', shape: hairpin({ side: 'left' }), height: 0, peak: { zone: 'heath' } },
    { name: 'Through the pinewoods', shape: sBends({ first: 'right', radius: 65, degrees: 80, grade: 0.16 }), height: 0, peak: { zone: 'heath' } },
    {
      name: 'To the line', shape: straight(65, { grade: 0.16 }), height: 0, billboards: 2, peak: { zone: 'heath' },
      obstacles: [slalom({ costume: 'cairn', from: 0.6, to: 0.92, count: 3, loss: 0.3 })],
      features: [brake({ at: 0.05, length: 10, drag: 0.02 })],
    },
    { name: 'Finish', shape: runIn(), height: 0, peak: { zone: 'heath' } },
  ],
});
