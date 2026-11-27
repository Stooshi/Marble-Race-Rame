'use strict';

// Samaria Iron Gates (Moses, 15 Nov 2026: six more Canyons tracks, the pack filled to 20; one of the two Easy ones).
// The Samaria Gorge on Crete: down the stony path at the gorge's head (a rolling start, the field let go in waves) and
// round past the cypresses, along the gorge floor, then down the wooden staircase (the track's big feature: a drop down
// the cliff where flights of plank steps zigzag), a straight below it, S-bends past the abandoned stone village, a rise
// over the ford, then the Iron Gates, the narrowest passage (a half-pipe between pale walls only a few metres apart and
// towering overhead), the hairpin by the chapel, a sweep down the dry riverbed and the run to the shore. Generic stone
// and trees only; no names on anything.
const {
  track, opening, straight, plunge, climb, sBends, sweep, hairpin, halfPipe, runIn, slalom, brake,
} = require('../trackKit');

module.exports = track({
  slug: 'samaria-iron-gates',
  name: 'Samaria Iron Gates',
  family: 'canyon',
  difficulty: 'easy',
  description: 'The Samaria Gorge on Crete: down the stony path past the cypresses, down the wooden staircase on the cliff, past the abandoned stone village, through the Iron Gates where the walls almost touch, and down the dry riverbed to the shore.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'day',
  variants: ['sunset'],
  canyon: { palette: 'samaria', depth: 48, river: 'right', narrow: true },
  coaster: { colours: { support: '#7a7468', rail: '#f4f0e6', tie: '#4a463e' } },
  signature: 'The wooden staircase',
  tvCameras: [
    // (At the foot of the staircase, looking back up the drop at the field coming down it.)
    { section: 'Below the stairs', at: 0.2, side: 'left', distance: 10, height: 12 },
    { section: 'The Iron Gates', at: 0.85, side: 'right', distance: 8, height: 10 },
  ],
  start: { landmark: 'wooden-staircase', scenery: ['pines'], type: 'rope-bridge', gate: 'barrier', shots: { countdown: 'crane', launch: 'side' } },
  finish: { landmark: 'coast-palms' },
  opening: opening('rolling-start', {
    side: 'right',
    costumes: { slalom: 'cairn' },
    names: { run: 'Down the gorge path', turn: 'Past the cypresses' },
    // (Let go in shorter waves, a new order every race: the opening's own longer waves favoured one starting group.)
    waves: { groups: 5, gap: 0.12, jitter: 0.04 },
    dress: { run: { height: 0 }, turn: { height: 0 } },
  }),
  sections: [
    { name: 'Down the gorge floor', shape: sweep({ side: 'left', radius: 80, degrees: 100, grade: 0.11 }), height: 0 },
    { name: 'To the staircase', shape: straight(45, { grade: 0.12 }), height: 0, billboards: 1 },
    {
      name: 'The wooden staircase', shape: plunge(48, { grade: 0.34, from: 0.12 }), height: 0,
      landmarks: [{ name: 'wooden-staircase', at: 0.5, side: 'right', distance: 14 }],
    },
    {
      name: 'Below the stairs', shape: straight(65, { grade: 0.11 }), height: 0,
      features: [brake({ at: 0.08, length: 14, drag: 0.02 })],
      obstacles: [slalom({ costume: 'cairn', from: 0.35, to: 0.8, count: 3, loss: 0.2 })],
    },
    {
      name: 'Past the village', shape: sBends({ first: 'right', radius: 70, degrees: 70, grade: 0.12 }), height: 0, billboards: 1,
      landmarks: [{ name: 'stone-village', at: 0.5, side: 'left', distance: 26 }],
    },
    { name: 'Over the ford', shape: climb(12, { grade: -0.06, after: 0.25 }), height: 0 },
    {
      name: 'Run to the Iron Gates', shape: straight(45, { grade: 0.12 }), height: 0,
      obstacles: [slalom({ costume: 'cairn', from: 0.3, to: 0.8, count: 3, loss: 0.2 })],
    },
    { name: 'The Iron Gates', shape: halfPipe({ first: 'left', width: 8, swings: 2, radius: 150, degrees: 16, grade: 0.11 }), height: 0, walls: 1 },
    { name: 'Out of the gates', shape: straight(40, { grade: 0.11 }), height: 0 },
    { name: 'Hairpin by the chapel', shape: hairpin({ side: 'left' }), height: 0 },
    { name: 'Down the riverbed', shape: sweep({ side: 'left', radius: 75, degrees: 110, grade: 0.12 }), height: 0 },
    {
      name: 'To the shore', shape: straight(65, { grade: 0.12 }), height: 0, billboards: 2,
      features: [brake({ at: 0.05, length: 12, drag: 0.02 })],
    },
    { name: 'Finish', shape: runIn(), height: 0 },
  ],
});
