'use strict';

// Budapest Danube Arches (Moses, 21 Nov 2026: the Track and Field pack filled to 20; a Track and Field track). A big
// modern stadium by the Danube, the castle on its hill across the river: away from the gate on the clear start (the
// field let go in waves, gentle bends and nothing in the way for the first seconds), a bend along the river past a
// swinging camera crane and over the hurdles, a straight under the stadium's arches, then the track's big feature: a
// full loop over the river; S-bends past the domed hall, back along the embankment and the home straight. Generic stands; no names.
const { track, opening, straight, sweep, sBends, loop, runIn, peg, slalom, swipe, brake } = require('../trackKit');

module.exports = track({
  slug: 'budapest-danube-arches',
  name: 'Budapest Danube Arches',
  family: 'athletics',
  difficulty: 'extreme',
  description: 'Budapest\'s big stadium by the Danube: away from the gate in a pack, along the river past the camera crane and over the hurdles, under the stadium\'s arches, then a full loop over the river and S-bends past the domed hall and back along the embankment to the line.',
  surface: 'tartan',
  biome: 'meadow',
  lighting: 'day',
  variants: ['sunset'],
  athletics: { stadium: 'budapest', lanes: 'red' },
  coaster: { style: 'steel', colours: { support: '#5b616a', rail: '#eef0f2', tie: '#a8323a' } },
  signature: 'Loop over the river',
  tvCameras: [
    // (Just past the loop, looking back at the field coming over the top.)
    { section: 'Loop over the river', at: 0.7, side: 'left', distance: 10, height: 10 },
    { section: 'Along the river', at: 0.15, side: 'right', distance: 9, height: 10 },
  ],
  start: { landmark: 'warm-up-track', type: 'castle-tower', gate: 'trapdoor', shots: { countdown: 'side', launch: 'side' } },
  finish: { landmark: 'medal-podium' },
  designChanges: [
    'Start shots that look down the track (30 Oct 2026, Moses): the lane numbers read the right way up only from behind the field, so no face-on countdown or look-back first seconds on Track and Field.',
  ],
  opening: opening('clear-start', { side: 'left', waves: { groups: 5, gap: 0.26, jitter: 0.26 } }),
  sections: [
    {
      name: 'Along the river', shape: sweep({ side: 'right', radius: 90, degrees: 90, grade: 0.11 }), billboards: 1,
      obstacles: [swipe({ costume: 'camera-crane', at: 0.25, side: 'high' }), slalom({ costume: 'hurdle', from: 0.45, to: 0.9, count: 5, loss: 0.3 })],
    },
    {
      name: 'Under the arches', shape: straight(60, { grade: 0.12 }), stadium: true, billboards: 1,
      features: [brake({ at: 0.06, length: 12, drag: 0.02 })],
      obstacles: [slalom({ costume: 'hurdle', from: 0.35, to: 0.95, count: 5, loss: 0.35 })],
    },
    {
      name: 'Loop over the river', shape: straight(170, { grade: 0.13 }), height: 0,
      features: [brake({ at: 0.08, length: 12, drag: 0.02 }), loop({ at: 0.45, viewSide: 14 })],
    },
    {
      name: 'Past the domed hall', shape: sBends({ first: 'right', radius: 70, degrees: 60, grade: 0.14 }), billboards: 1,
      obstacles: [slalom({ costume: 'hurdle', from: 0.25, to: 0.8, count: 6, loss: 0.35 })],
    },
    {
      name: 'Back along the embankment', shape: sweep({ side: 'left', radius: 55, degrees: 150, grade: 0.13 }), billboards: 1,
      obstacles: [peg({ costume: 'hurdle', at: 0.35, line: 'left' }), peg({ costume: 'hurdle', at: 0.65, line: 'right' })],
    },
    {
      name: 'Home straight', shape: straight(70, { grade: 0.12 }), stadium: true, billboards: 1,
      features: [brake({ at: 0.08, length: 10, drag: 0.02 })],
      obstacles: [slalom({ costume: 'hurdle', from: 0.35, to: 0.9, count: 5, loss: 0.35 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
