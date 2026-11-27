'use strict';

// Helsinki Tower Lap (Moses, 21 Nov 2026: the Track and Field pack filled to 20; track 12 of the series). Helsinki's
// white functionalist stadium with its tall white tower: away from the gate on the clear start (the field let go in
// waves, gentle bends and nothing in the way for the first seconds), along the bay, then the track's big feature: a
// splitter round the foot of the stadium tower, the field taking either side of it; the hairpin by the park, a lap of the stadium
// with its hurdles, S-bends through the birches and the home straight. Generic stands; no names.
const { track, opening, straight, sweep, hairpin, sBends, splitter, runIn, peg, slalom, brake } = require('../trackKit');

module.exports = track({
  slug: 'helsinki-tower-lap',
  name: 'Helsinki Tower Lap',
  family: 'athletics',
  difficulty: 'extreme',
  description: 'Helsinki\'s white stadium with its tall tower: away from the gate in a pack, along the bay, then either side of the tower at the splitter, the hairpin by the park, a lap of the stadium over the hurdles and S-bends through the birches to the line.',
  surface: 'tartan',
  biome: 'meadow',
  lighting: 'day',
  variants: ['sunset'],
  athletics: { stadium: 'helsinki', lanes: 'red' },
  coaster: { style: 'concrete', colours: { support: '#8a8d90', rail: '#f4f1ea', tie: '#3c6e9e' } },
  signature: 'Round the tower',
  tvCameras: [
    // (Where the channels meet again past the tower, looking back at the field coming round both sides.)
    { section: 'Round the tower', at: 0.9, side: 'left', distance: 9, height: 11 },
    { section: 'Through the birches', at: 0.5, side: 'right', distance: 9, height: 10 },
  ],
  start: { landmark: 'warm-up-track', type: 'clock-tower', gate: 'paddle', shots: { countdown: 'crane', launch: 'overhead' } },
  finish: { landmark: 'medal-podium' },
  designChanges: [
    'Start shots that look down the track (30 Oct 2026, Moses): the lane numbers read the right way up only from behind the field, so no face-on countdown or look-back first seconds on Track and Field.',
  ],
  opening: opening('clear-start', { side: 'right', waves: { groups: 5, gap: 0.24, jitter: 0.2 } }),
  sections: [
    {
      name: 'Along the bay', shape: straight(50, { grade: 0.12 }), billboards: 1,
      features: [brake({ at: 0.1, length: 12, drag: 0.02 })],
      obstacles: [slalom({ costume: 'hurdle', from: 0.35, to: 0.95, count: 5, loss: 0.3 })],
    },
    {
      name: 'Round the tower',
      shape: splitter({ side: 'left', degrees: 0, approach: 55, merge: 30, balance: { tipOffset: 0, left: { drag: 1.2, scrub: 1.2 }, right: { drag: 1.2, scrub: 1.2 } } }),
      landmarks: [{ name: 'stadium-bell-tower', at: 0.55, side: 'left', distance: 16 }],
      obstacles: [peg({ costume: 'hurdle', at: 0.15, line: 'left' }), peg({ costume: 'hurdle', at: 0.3, line: 'right' })],
    },
    {
      name: 'Run to the park', shape: straight(40, { grade: 0.13 }), billboards: 1,
    },
    { name: 'Hairpin by the park', shape: hairpin({ side: 'right' }) },
    {
      name: 'The stadium lap', shape: sweep({ side: 'right', radius: 90, degrees: 140, grade: 0.09 }), stadium: true, billboards: 1,
      features: [brake({ at: 0.06, length: 14, drag: 0.025 })],
      obstacles: [slalom({ costume: 'hurdle', from: 0.35, to: 0.85, count: 5, loss: 0.3 })],
    },
    {
      name: 'Through the birches', shape: sBends({ first: 'left', radius: 70, degrees: 55, grade: 0.13 }), billboards: 1,
      obstacles: [peg({ costume: 'hurdle', at: 0.3, line: 'left' }), peg({ costume: 'hurdle', at: 0.65, line: 'right' })],
    },
    {
      name: 'Home straight', shape: straight(65, { grade: 0.12 }), stadium: true, billboards: 1,
      features: [brake({ at: 0.08, length: 10, drag: 0.02 })],
      obstacles: [slalom({ costume: 'hurdle', from: 0.35, to: 0.9, count: 5, loss: 0.35 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
