'use strict';

// Nairobi Highlands Mile (Moses, 24 Nov 2026: the Track and Field pack filled to 20; replaces Monaco Harbour Lap).
// A big open bowl of a stadium on the city's edge, the plains of the national park beyond it, flat-topped acacias:
// away from the gate on the clear start (the field let go in waves, gentle bends and nothing in the way for the
// first seconds), out past the park over the hurdles, S-bends along the forest road off a speed pad, a lap of the
// stadium, then the track's big feature: a steep spiral round a great acacia down onto the plains; across the
// plains off a second speed pad and the home straight. Generic stands; no names.
const { track, opening, straight, sweep, sBends, spiral, runIn, peg, slalom, brake, boost } = require('../trackKit');

module.exports = track({
  slug: 'nairobi-highlands-mile',
  name: 'Nairobi Highlands Mile',
  family: 'athletics',
  difficulty: 'extreme',
  description: 'Nairobi\'s big stadium at the edge of the plains: away from the gate in a pack, out past the park over the hurdles, along the forest road, a lap of the stadium, then a steep spiral round a great acacia down onto the plains and across them to the line.',
  surface: 'tartan',
  biome: 'meadow',
  lighting: 'day',
  variants: ['sunset'],
  athletics: { stadium: 'nairobi', lanes: 'red' },
  coaster: { style: 'concrete', colours: { support: '#a59d8f', rail: '#efe9dd', tie: '#b5452c' } },
  signature: 'Round the great acacia',
  tvCameras: [
    // (At the foot of the spiral, looking back up at the field coming round the acacia.)
    { section: 'Round the great acacia', at: 0.9, side: 'right', distance: 9, height: 9 },
    { section: 'Along the forest road', at: 0.4, side: 'left', distance: 9, height: 10 },
  ],
  start: { landmark: 'warm-up-track', type: 'water-tower', gate: 'stalls', shots: { countdown: 'crane', launch: 'low-chase' } },
  finish: { landmark: 'medal-podium' },
  designChanges: [
    'Start shots that look down the track (30 Oct 2026, Moses): the lane numbers read the right way up only from behind the field, so no face-on countdown or look-back first seconds on Track and Field.',
  ],
  opening: opening('clear-start', { side: 'right', waves: { groups: 5, gap: 0.27, jitter: 0.24 } }),
  sections: [
    {
      name: 'Out past the park', shape: straight(45, { grade: 0.12 }), billboards: 1,
      features: [brake({ at: 0.06, length: 10, drag: 0.02 })],
      obstacles: [slalom({ costume: 'hurdle', from: 0.35, to: 0.92, count: 5, loss: 0.3 })],
    },
    {
      name: 'Along the forest road', shape: sBends({ first: 'left', radius: 70, degrees: 55, grade: 0.13 }), billboards: 1,
      features: [boost({ at: 0.08, kick: 4 })],
      obstacles: [peg({ costume: 'hurdle', at: 0.35, line: 'left' }), peg({ costume: 'hurdle', at: 0.6, line: 'right' }), peg({ costume: 'hurdle', at: 0.85, line: 'left' })],
    },
    {
      name: 'Round the stadium', shape: sweep({ side: 'right', radius: 90, degrees: 130, grade: 0.09 }), stadium: true, billboards: 1,
      features: [brake({ at: 0.06, length: 12, drag: 0.02 })],
      obstacles: [slalom({ costume: 'hurdle', from: 0.35, to: 0.85, count: 5, loss: 0.3 })],
    },
    { name: 'Run to the plains', shape: straight(35, { grade: 0.13 }), billboards: 1 },
    { name: 'Round the great acacia', shape: spiral({ side: 'left', radius: 42, turns: 1, grade: 0.2 }), around: 'acacia' },
    {
      name: 'Across the plains', shape: straight(55, { grade: 0.12 }), billboards: 1,
      features: [boost({ at: 0.12, kick: 4 })],
      obstacles: [slalom({ costume: 'hurdle', from: 0.35, to: 0.9, count: 5, loss: 0.3 })],
    },
    {
      name: 'Home straight', shape: straight(60, { grade: 0.12 }), stadium: true, billboards: 1,
      features: [brake({ at: 0.08, length: 10, drag: 0.02 })],
      obstacles: [peg({ costume: 'hurdle', at: 0.35, line: 'right' }), peg({ costume: 'hurdle', at: 0.6, line: 'left' })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
