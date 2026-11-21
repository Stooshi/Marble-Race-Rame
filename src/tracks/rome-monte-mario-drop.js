'use strict';

// Rome Monte Mario Drop (Moses, 21 Nov 2026: the Track and Field pack filled to 20; track 11 of the series). Rome's
// great stadium below the wooded hill of Monte Mario: away from the gate on the clear start (the field let go in
// waves, gentle bends and nothing in the way for the first seconds), along the hill among the umbrella pines, then the track's big feature: the long
// drop down the hillside straight into the stadium, a lap under the light roof ring with its hurdles, a spiral round a
// floodlight mast, back through the pines and the home straight with its hurdles. Generic stands and pines; no names on anything.
const { track, opening, straight, sweep, spiral, plunge, sBends, runIn, peg, slalom, brake } = require('../trackKit');

module.exports = track({
  slug: 'rome-monte-mario-drop',
  name: 'Rome Monte Mario Drop',
  family: 'athletics',
  difficulty: 'extreme',
  description: 'Rome\'s great stadium under Monte Mario: away from the gate in a pack, along the hill among the umbrella pines, then a long drop down the hillside straight into the stadium for a lap under the light roof, round a floodlight mast, back through the pines and over the hurdles of the home straight.',
  surface: 'tartan',
  biome: 'meadow',
  lighting: 'sunset',
  variants: ['night'],
  athletics: { stadium: 'olimpico', lanes: 'red' },
  coaster: { style: 'concrete', colours: { support: '#7a6f62', rail: '#f4f1ea', tie: '#8d3b30' } },
  signature: 'Down Monte Mario',
  tvCameras: [
    // (At the foot of the drop, looking back up the hill at the field coming down.)
    { section: 'Down Monte Mario', at: 0.85, side: 'left', distance: 9, height: 10 },
    { section: 'Back through the pines', at: 0.5, side: 'right', distance: 9, height: 10 },
  ],
  start: { landmark: 'athletes-village', scenery: ['pines'], type: 'straight-lift', gate: 'trapdoor', shots: { countdown: 'crane', launch: 'low-chase' } },
  finish: { landmark: 'medal-podium' },
  designChanges: [
    'Start shots that look down the track (30 Oct 2026, Moses): the lane numbers read the right way up only from behind the field, so no face-on countdown or look-back first seconds on Track and Field.',
  ],
  opening: opening('clear-start', { side: 'left', waves: { groups: 5, gap: 0.2, jitter: 0.12 } }),
  sections: [
    {
      name: 'Along Monte Mario', shape: straight(45, { grade: 0.12 }), scenery: ['pines'], billboards: 1,
      features: [brake({ at: 0.1, length: 12, drag: 0.02 })],
      obstacles: [peg({ costume: 'hurdle', at: 0.35, line: 'right' }), peg({ costume: 'hurdle', at: 0.7, line: 'left' })],
    },
    { name: 'Down Monte Mario', shape: plunge(55, { grade: 0.32, from: 0.12 }), scenery: ['pines'] },
    {
      name: 'Under the roof ring', shape: sweep({ side: 'left', radius: 90, degrees: 160, grade: 0.09 }), stadium: true, billboards: 1,
      features: [brake({ at: 0.06, length: 14, drag: 0.025 })],
      obstacles: [slalom({ costume: 'hurdle', from: 0.35, to: 0.85, count: 5, loss: 0.3 })],
    },
    { name: 'Round the mast', shape: spiral({ side: 'right', radius: 50, turns: 0.6, grade: 0.15 }), around: 'floodlight-mast' },
    {
      name: 'Back through the pines', shape: sBends({ first: 'left', radius: 70, degrees: 60, grade: 0.13 }), scenery: ['pines'], billboards: 1,
      obstacles: [slalom({ costume: 'hurdle', from: 0.2, to: 0.8, count: 5, loss: 0.3 })],
    },
    {
      name: 'Home straight', shape: straight(80, { grade: 0.12 }), stadium: true, billboards: 1,
      features: [brake({ at: 0.08, length: 10, drag: 0.02 })],
      obstacles: [slalom({ costume: 'hurdle', from: 0.35, to: 0.9, count: 5, loss: 0.35 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
