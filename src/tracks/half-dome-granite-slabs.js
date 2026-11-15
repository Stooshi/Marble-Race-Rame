'use strict';

// Half Dome Granite Slabs (Moses, 15 Nov 2026: six more Peaks tracks, the pack filled to 20; one of the two Easy
// ones). Half Dome in Yosemite: a rolling start down the valley trail (the field let go in waves) and round past the
// meadow, through the tall pines, then down the granite slabs below the great dome's sheer face (the track's big
// feature: a long drop down the smooth pale rock), a straight below the face where the cables route climbs the
// dome's back, the hairpin under the face, a sweep across the meadow, a rise over the river's rocks, the giant pines,
// S-bends down the valley, a sweep along the river and the run to the line. The dome is scenery only: nothing of ours
// on it. Generic rock and trees; no names on anything.
const {
  track, opening, straight, plunge, climb, sBends, sweep, hairpin, runIn, slalom, brake,
} = require('../trackKit');

module.exports = track({
  slug: 'half-dome-granite-slabs',
  name: 'Half Dome Granite Slabs',
  family: 'peak',
  difficulty: 'easy',
  description: 'Half Dome in Yosemite: down the valley trail and through the tall pines, down the pale granite slabs below the great dome\'s sheer face, past the cables route, across the meadow and down the valley to the line.',
  surface: 'snow',
  biome: 'alpine',
  lighting: 'day',
  variants: ['sunset'],
  peak: { palette: 'half-dome' },
  coaster: { style: 'alpine', colours: { support: '#8a867e', rail: '#f2f0ea', tie: '#5a564f' } },
  signature: 'Down the granite slabs',
  tvCameras: [
    // (At the foot of the slabs, looking back up the drop at the field coming down it under the face.)
    { section: 'Below the face', at: 0.2, side: 'left', distance: 10, height: 12 },
    { section: 'Along the river', at: 0.45, side: 'right', distance: 10, height: 11 },
  ],
  start: { landmark: 'cable-route', type: 'curving-lift', gate: 'barrier', shots: { countdown: 'low-front', launch: 'side' } },
  finish: { landmark: 'peak-camp' },
  opening: opening('rolling-start', {
    side: 'left',
    costumes: { slalom: 'cairn' },
    names: { run: 'Down the valley trail', turn: 'Past the meadow' },
    // (Let go in shorter waves, a new order every race: the opening's own longer waves favour one starting group.)
    waves: { groups: 5, gap: 0.12, jitter: 0.04 },
    dress: { run: { height: 0, peak: { zone: 'moorland' } }, turn: { height: 0, peak: { zone: 'moorland' } } },
  }),
  sections: [
    { name: 'Through the pines', shape: sweep({ side: 'right', radius: 80, degrees: 100, grade: 0.11 }), height: 0, peak: { zone: 'cloud-forest' } },
    { name: 'To the slabs', shape: straight(45, { grade: 0.12 }), height: 0, billboards: 1, peak: { zone: 'rock' } },
    {
      name: 'Down the granite slabs', shape: plunge(48, { grade: 0.34, from: 0.12 }), height: 0, peak: { zone: 'rock' },
      landmarks: [{ name: 'sheer-dome', at: 0.5, side: 'right', distance: 75 }],
    },
    {
      name: 'Below the face', shape: straight(65, { grade: 0.11 }), height: 0, peak: { zone: 'rock' },
      landmarks: [{ name: 'cable-route', at: 0.6, side: 'right', distance: 34 }],
      features: [brake({ at: 0.08, length: 14, drag: 0.02 })],
      obstacles: [slalom({ costume: 'cairn', from: 0.35, to: 0.8, count: 3, loss: 0.2 })],
    },
    { name: 'Hairpin under the face', shape: hairpin({ side: 'left' }), height: 0, peak: { zone: 'rock' } },
    { name: 'Across the meadow', shape: sweep({ side: 'right', radius: 80, degrees: 90, grade: 0.12 }), height: 0, billboards: 1, peak: { zone: 'moorland' } },
    { name: 'Over the river rocks', shape: climb(12, { grade: -0.06, after: 0.25 }), height: 0, peak: { zone: 'moorland' } },
    {
      name: 'Through the giant pines', shape: straight(50, { grade: 0.12 }), height: 0, peak: { zone: 'cloud-forest' },
      obstacles: [slalom({ costume: 'mossy-boulder', from: 0.3, to: 0.8, count: 3, loss: 0.2 })],
    },
    { name: 'Down the valley', shape: sBends({ first: 'left', radius: 70, degrees: 75, grade: 0.12 }), height: 0, peak: { zone: 'cloud-forest' } },
    { name: 'Along the river', shape: sweep({ side: 'left', radius: 75, degrees: 100, grade: 0.12 }), height: 0, peak: { zone: 'moorland' } },
    {
      name: 'To the line', shape: straight(65, { grade: 0.12 }), height: 0, billboards: 2, peak: { zone: 'moorland' },
      features: [brake({ at: 0.05, length: 12, drag: 0.02 })],
    },
    { name: 'Finish', shape: runIn(), height: 0, peak: { zone: 'moorland' } },
  ],
});
