'use strict';

// Barcelona Montjuïc Mile (Moses, 24 Nov 2026: the Track and Field pack filled to 20; replaces Kingston Blue
// Mountain Run, set aside after three tries at its splitter). A big stone-fronted stadium on the hill above the
// city and the harbour: away from the gate on the clear start (the field let go in waves, gentle bends and nothing
// in the way for the first seconds), along the palace terraces past a camera crane and over the hurdles, a lap of
// the stadium, then the track's big feature: the fountain steps, a steep drop down the terraced cascade; S-bends
// through the gardens off a speed pad, the hairpin under the castle, a drop down from the castle and another down to the harbour, along the
// waterfront off a second speed pad and the home straight. Generic stands; no names.
const { track, opening, straight, sweep, sBends, plunge, hairpin, runIn, peg, slalom, swipe, brake, boost } = require('../trackKit');

module.exports = track({
  slug: 'barcelona-montjuic-mile',
  name: 'Barcelona Montjuïc Mile',
  family: 'athletics',
  difficulty: 'extreme',
  description: 'Barcelona\'s big stadium on the hill above the harbour: away from the gate in a pack, along the palace terraces over the hurdles, a lap of the stadium, then down the fountain steps, through the gardens, round the hairpin under the castle, down from the castle and down again to the harbour and along the waterfront to the line.',
  surface: 'tartan',
  biome: 'meadow',
  lighting: 'day',
  variants: ['sunset'],
  athletics: { stadium: 'barcelona', lanes: 'red' },
  coaster: { style: 'concrete', colours: { support: '#c8b79a', rail: '#f2ece0', tie: '#b5452c' } },
  signature: 'Down the fountain steps',
  tvCameras: [
    // (At the foot of the fountain steps, looking back up at the field coming down the cascade.)
    { section: 'Down the fountain steps', at: 0.9, side: 'right', distance: 9, height: 8 },
    { section: 'Down to the harbour', at: 0.55, side: 'left', distance: 9, height: 9 },
  ],
  start: { landmark: 'warm-up-track', type: 'clock-tower', gate: 'barrier', shots: { countdown: 'low-front', launch: 'overhead' } },
  finish: { landmark: 'medal-podium' },
  designChanges: [
    'Start shots that look down the track (30 Oct 2026, Moses): the lane numbers read the right way up only from behind the field, so no face-on countdown or look-back first seconds on Track and Field.',
  ],
  opening: opening('clear-start', { side: 'right', waves: { groups: 5, gap: 0.27, jitter: 0.24 } }),
  sections: [
    {
      name: 'Along the palace terraces', shape: straight(55, { grade: 0.12 }),
      obstacles: [swipe({ costume: 'camera-crane', at: 0.2, side: 'right' }), slalom({ costume: 'hurdle', from: 0.45, to: 0.95, count: 4, loss: 0.3 })],
    },
    {
      name: 'Round the stadium', shape: sweep({ side: 'left', radius: 90, degrees: 135, grade: 0.09 }), stadium: true, billboards: 1,
      features: [brake({ at: 0.06, length: 12, drag: 0.02 })],
      obstacles: [slalom({ costume: 'hurdle', from: 0.35, to: 0.85, count: 5, loss: 0.3 })],
    },
    {
      name: 'Down the fountain steps', shape: plunge(60, { grade: 0.36, from: 0.09 }),
      landmarks: [{ name: 'fountains', at: 0.5, side: 'right', distance: 20 }],
    },
    {
      name: 'Through the gardens', shape: sBends({ first: 'right', radius: 70, degrees: 55, grade: 0.13 }), billboards: 1,
      features: [boost({ at: 0.08, kick: 4 })],
      obstacles: [peg({ costume: 'hurdle', at: 0.35, line: 'left' }), peg({ costume: 'hurdle', at: 0.6, line: 'right' }), peg({ costume: 'hurdle', at: 0.85, line: 'left' })],
    },
    { name: 'Run to the castle', shape: straight(40, { grade: 0.12 }) },
    {
      name: 'Hairpin under the castle', shape: hairpin({ side: 'left' }),
      landmarks: [{ name: 'castle-hill', at: 0.5, side: 'right', distance: 40 }],
    },
    { name: 'Down from the castle', shape: plunge(50, { grade: 0.36, from: 0.16 }) },
    { name: 'Above the harbour', shape: straight(35, { grade: 0.11 }), billboards: 1 },
    { name: 'Down to the harbour', shape: plunge(55, { grade: 0.36, from: 0.11 }) },
    {
      name: 'Along the waterfront', shape: straight(55, { grade: 0.11 }),
      features: [boost({ at: 0.1, kick: 4 })],
      obstacles: [slalom({ costume: 'hurdle', from: 0.3, to: 0.85, count: 5, loss: 0.3 })],
    },
    {
      name: 'Home straight', shape: straight(60, { grade: 0.12 }), stadium: true, billboards: 1,
      features: [brake({ at: 0.08, length: 10, drag: 0.02 })],
      obstacles: [peg({ costume: 'hurdle', at: 0.35, line: 'right' }), peg({ costume: 'hurdle', at: 0.6, line: 'left' })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
