'use strict';

// Blyde Potholes Spiral (Moses, 15 Nov 2026: six more Canyons tracks, the pack filled to 20; one of the two Wild
// ones). Blyde River Canyon in South Africa: down from the viewpoint, over the lip and down into the canyon (the
// field let go in waves), past the Three Rondavels (three round rock towers capped with bush, like huts on the ridge), then round the potholes (the track's big feature: a banked spiral round the smooth
// round pits the swirling river has worn in the rock), a straight below them, down to the river, S-bends along
// it, the hairpin, a sweep under the cliffs and the last straight. Generic rock and bush only; no names on anything.
const {
  track, opening, straight, plunge, sBends, sweep, spiral, hairpin, runIn, peg, slalom, curtain, brake,
} = require('../trackKit');

module.exports = track({
  slug: 'blyde-potholes-spiral',
  name: 'Blyde Potholes Spiral',
  family: 'canyon',
  difficulty: 'hard',
  description: 'Blyde River Canyon in South Africa: down from the viewpoint into the canyon, past the Three Rondavels, round and round the river\'s swirling potholes, along the river and under the red cliffs to the line.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'day',
  variants: ['sunset'],
  canyon: { palette: 'blyde', depth: 44, river: 'left' },
  coaster: { colours: { support: '#6a3a24', rail: '#f2e8d8', tie: '#3a2418' } },
  signature: 'Round the potholes',
  tvCameras: [
    // (Low on the outside at the end of the spiral, looking back round it at the field coming down.)
    { section: 'Round the potholes', at: 0.85, side: 'left', distance: 10, height: 12 },
  ],
  start: { landmark: 'gorge-viewpoint', scenery: ['rocks'], type: 'rock-arch', gate: 'stalls', shots: { countdown: 'low-front', launch: 'side' } },
  finish: { landmark: 'river-camp' },
  opening: opening('crest-start', {
    costumes: { block: 'mossy-boulder', slalom: 'cairn' },
    names: { plunge: 'Down from the viewpoint', climb: 'Over the lip', drop: 'Into the canyon' },
    // (Let go in waves, a new order every race: without them the first starting group did a little better.)
    waves: { groups: 5, gap: 0.12, jitter: 0.04 },
    dress: { plunge: { height: 0 }, climb: { height: 0 }, drop: { height: 0 } },
  }),
  sections: [
    {
      name: 'Past the Three Rondavels', shape: straight(80, { grade: 0.15 }), height: 0,
      landmarks: [{ name: 'three-rondavels', at: 0.5, side: 'right', distance: 55 }],
      obstacles: [curtain({ costume: 'vines', at: 0.3, side: 'left' }), slalom({ costume: 'cairn', from: 0.5, to: 0.9, count: 4, loss: 0.2 })],
      features: [brake({ at: 0.05, length: 12, drag: 0.02 })],
    },
    { name: 'Round the potholes', shape: spiral({ side: 'left', radius: 42, turns: 1, grade: 0.19 }), height: 8, around: 'potholes', billboards: 2 },
    {
      name: 'Below the potholes', shape: straight(65, { grade: 0.13 }), height: 0,
      obstacles: [slalom({ costume: 'cairn', from: 0.3, to: 0.8, count: 4, loss: 0.25 })],
      features: [brake({ at: 0.05, length: 12, drag: 0.02 })],
    },
    { name: 'Down to the river', shape: plunge(45, { grade: 0.24, from: 0.15 }), height: 0, billboards: 1 },
    {
      name: 'Along the river', shape: sBends({ first: 'right', radius: 60, degrees: 85, grade: 0.15 }), height: 0,
    },
    {
      name: 'Run to the hairpin', shape: straight(55, { grade: 0.14 }), height: 0,
      features: [brake({ at: 0.05, length: 10, drag: 0.02 })],
    },
    { name: 'Hairpin by the camp', shape: hairpin({ side: 'right' }), height: 0 },
    { name: 'Under the cliffs', shape: sweep({ side: 'left', radius: 80, degrees: 110, grade: 0.15 }), height: 0, billboards: 1 },
    {
      name: 'Last straight', shape: straight(70, { grade: 0.16 }), height: 0,
      obstacles: [slalom({ costume: 'cairn', from: 0.3, to: 0.65, count: 3, loss: 0.15 })],
      features: [brake({ at: 0.05, length: 10, drag: 0.02 })],
    },
    { name: 'Finish', shape: runIn(), height: 0 },
  ],
});
