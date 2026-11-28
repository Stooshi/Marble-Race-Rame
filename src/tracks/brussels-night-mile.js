'use strict';

// Brussels Night Mile (Moses, 21 Nov 2026: the Track and Field pack filled to 20; track 14 of the series). A night
// meeting in Brussels' city stadium under its dark roof and four floodlight masts: away from the gate on the clear start
// (the field let go in waves, gentle bends and nothing in the way for the first seconds), into the stadium, along the
// boulevard over the hurdles, then the track's big feature: a tight, steep banked turn raised high over the park;
// S-bends through the park and the home straight under the lights. Generic stands; no names.
const { track, opening, straight, sweep, sBends, runIn, peg, slalom, brake } = require('../trackKit');

module.exports = track({
  slug: 'brussels-night-mile',
  name: 'Brussels Night Mile',
  family: 'athletics',
  difficulty: 'extreme',
  description: 'A night meeting in Brussels under the floodlights: away from the gate in a pack, into the stadium, along the boulevard over the hurdles, then a tight banked turn raised high over the park and S-bends to the line.',
  surface: 'tartan',
  biome: 'meadow',
  lighting: 'night',
  variants: ['sunset'],
  athletics: { stadium: 'brussels', lanes: 'red' },
  coaster: { style: 'steel', colours: { support: '#5a5e66', rail: '#d8dbe0', tie: '#8e2a2e' } },
  signature: 'The banked turn',
  tvCameras: [
    // (On the outside at the end of the banking, looking back up at the field coming round the wall.)
    { section: 'The banked turn', at: 0.8, side: 'left', distance: 10, height: 12 },
    { section: 'Into the stadium', at: 0.3, side: 'right', distance: 9, height: 10 },
  ],
  start: { landmark: 'floodlight-mast', type: 'water-tower', gate: 'barrier', shots: { countdown: 'above', launch: 'side' } },
  finish: { landmark: 'medal-podium' },
  designChanges: [
    'Start shots that look down the track (30 Oct 2026, Moses): the lane numbers read the right way up only from behind the field, so no face-on countdown or look-back first seconds on Track and Field.',
  ],
  opening: opening('clear-start', { side: 'right', waves: { groups: 5, gap: 0.28, jitter: 0.24 } }),
  sections: [
    {
      name: 'Into the stadium', shape: sweep({ side: 'left', radius: 90, degrees: 120, grade: 0.1 }), stadium: true, billboards: 1,
      features: [brake({ at: 0.06, length: 14, drag: 0.025 })],
      obstacles: [peg({ costume: 'hurdle', at: 0.35, line: 'left' }), peg({ costume: 'hurdle', at: 0.6, line: 'right' })],
    },
    {
      name: 'Along the boulevard', shape: straight(55, { grade: 0.12 }), billboards: 1,
      features: [brake({ at: 0.1, length: 12, drag: 0.02 })],
      obstacles: [slalom({ costume: 'hurdle', from: 0.35, to: 0.95, count: 5, loss: 0.3 })],
    },
    { name: 'Up to the banking', shape: straight(45, { grade: 0.12 }), billboards: 1 },
    { name: 'The banked turn', shape: sweep({ side: 'right', radius: 45, degrees: 170, grade: 0.14 }), height: 8 },
    {
      name: 'Through the park', shape: sBends({ first: 'left', radius: 70, degrees: 55, grade: 0.14 }), billboards: 1,
      obstacles: [slalom({ costume: 'hurdle', from: 0.3, to: 0.8, count: 5, loss: 0.3 })],
    },
    {
      name: 'Home straight', shape: straight(65, { grade: 0.12 }), stadium: true, billboards: 1,
      features: [brake({ at: 0.08, length: 10, drag: 0.02 })],
      obstacles: [slalom({ costume: 'hurdle', from: 0.35, to: 0.9, count: 5, loss: 0.35 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
