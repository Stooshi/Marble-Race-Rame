'use strict';

// Monaco Harbour Lap (Moses, 21 Nov 2026: the Track and Field pack filled to 20; track 15 of the series). A compact
// stadium squeezed between the harbour and the rock: away from the gate on the clear start (the field let go in waves,
// gentle bends and nothing in the way for the first seconds), along the quay past a steeplechase barrier and over the
// hurdles, then the track's big feature: a long drop down the rock to the harbour; a lap round the harbour into the
// stadium, S-bends past the yachts, round the rock and the home straight. Generic stands; no names.
const { track, opening, straight, sweep, plunge, sBends, runIn, slalom, block, brake } = require('../trackKit');

module.exports = track({
  slug: 'monaco-harbour-lap',
  name: 'Monaco Harbour Lap',
  family: 'athletics',
  difficulty: 'extreme',
  description: 'Monaco\'s little stadium between the harbour and the rock: away from the gate in a pack, along the quay past the barrier and over the hurdles, a long drop down the rock to the harbour, then round past the yachts and the rock to the line.',
  surface: 'tartan',
  biome: 'meadow',
  lighting: 'day',
  variants: ['sunset'],
  athletics: { stadium: 'monaco', lanes: 'red' },
  coaster: { style: 'concrete', colours: { support: '#b7aa98', rail: '#f6f1e8', tie: '#c23a3a' } },
  signature: 'Down to the harbour',
  tvCameras: [
    // (At the foot of the drop, looking back up the rock at the field coming down.)
    { section: 'Down to the harbour', at: 0.9, side: 'right', distance: 9, height: 9 },
    { section: 'Past the yachts', at: 0.6, side: 'left', distance: 9, height: 10 },
  ],
  start: { landmark: 'harbour', type: 'lighthouse', gate: 'trapdoor', shots: { countdown: 'side', launch: 'side' } },
  finish: { landmark: 'medal-podium' },
  designChanges: [
    'Start shots that look down the track (30 Oct 2026, Moses): the lane numbers read the right way up only from behind the field, so no face-on countdown or look-back first seconds on Track and Field.',
  ],
  opening: opening('clear-start', { side: 'left', waves: { groups: 5, gap: 0.28, jitter: 0.24 } }),
  sections: [
    {
      name: 'Along the quay', shape: straight(60, { grade: 0.12 }), billboards: 1,
      landmarks: [{ name: 'yachts', at: 0.5, side: 'right', distance: 22 }],
      features: [brake({ at: 0.06, length: 10, drag: 0.02 })],
      obstacles: [block({ costume: 'steeple-barrier', at: 0.3, line: 'left', loss: 0.3 }), slalom({ costume: 'hurdle', from: 0.5, to: 0.95, count: 5, loss: 0.25 })],
    },
    { name: 'Down to the harbour', shape: plunge(55, { grade: 0.3, from: 0.12 }) },
    {
      name: 'Round the harbour', shape: sweep({ side: 'right', radius: 90, degrees: 150, grade: 0.11 }), stadium: true, billboards: 1,
      features: [brake({ at: 0.06, length: 14, drag: 0.025 })],
      obstacles: [slalom({ costume: 'hurdle', from: 0.3, to: 0.88, count: 6, loss: 0.25 })],
    },
    {
      name: 'Past the yachts', shape: sBends({ first: 'right', radius: 60, degrees: 65, grade: 0.16 }), billboards: 1,
      landmarks: [{ name: 'riviera-harbour', at: 0.5, side: 'left', distance: 26 }],
    },
    { name: 'Round the rock', shape: sweep({ side: 'left', radius: 60, degrees: 130, grade: 0.14 }), billboards: 1 },
    {
      name: 'Home straight', shape: straight(65, { grade: 0.12 }), stadium: true, billboards: 1,
      features: [brake({ at: 0.08, length: 10, drag: 0.02 })],
      obstacles: [slalom({ costume: 'hurdle', from: 0.35, to: 0.9, count: 5, loss: 0.2 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
