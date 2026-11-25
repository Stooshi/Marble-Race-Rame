'use strict';

// Rio Samba Relay (Moses, 21 Nov 2026: tonight's Track and Field tracks). A big round concrete stadium below the
// mountains and the sugarloaf by the bay: away from the gate on the clear start (the field let go in waves, gentle
// bends and nothing in the way for the first seconds), along the beach past a hurdle cart, a lap of the
// stadium past the hurdles, S-bends through the samba streets, up to the banking, then the track's big feature: a
// tight, steep banked turn raised high under the mountain; S-bends along the bay and the home straight. Generic stands;
// no names.
const { track, opening, straight, sweep, sBends, runIn, peg, slalom, parked, brake } = require('../trackKit');

module.exports = track({
  slug: 'rio-samba-relay',
  name: 'Rio Samba Relay',
  family: 'athletics',
  difficulty: 'extreme',
  description: 'Rio\'s big round stadium below the mountains: away from the gate in a pack, along the beach past the hurdle cart, a lap of the stadium over the hurdles, S-bends through the samba streets, a tight banked turn raised high under the mountain and along the bay to the line.',
  surface: 'tartan',
  biome: 'meadow',
  lighting: 'day',
  variants: ['sunset'],
  athletics: { stadium: 'rio', lanes: 'blue' },
  coaster: { style: 'concrete', colours: { support: '#c9c4b8', rail: '#f4f1ea', tie: '#2f9a4a' } },
  signature: 'Banked under the mountain',
  tvCameras: [
    // (On the outside at the end of the banking, looking back up at the field coming round the wall.)
    { section: 'Banked under the mountain', at: 0.8, side: 'left', distance: 10, height: 12 },
    { section: 'Along the beach', at: 0.4, side: 'right', distance: 9, height: 10 },
  ],
  start: { landmark: 'warm-up-track', type: 'cliff', gate: 'barrier', shots: { countdown: 'swing', launch: 'high-side' } },
  finish: { landmark: 'medal-podium' },
  designChanges: [
    'Start shots that look down the track (30 Oct 2026, Moses): the lane numbers read the right way up only from behind the field, so no face-on countdown or look-back first seconds on Track and Field.',
  ],
  opening: opening('clear-start', { side: 'right', waves: { groups: 5, gap: 0.24, jitter: 0.2 } }),
  sections: [
    {
      name: 'Along the beach', shape: straight(40, { grade: 0.12 }),
      landmarks: [{ name: 'sugarloaf', at: 0.5, side: 'right', distance: 90 }],
      obstacles: [parked({ costume: 'hurdle-cart', at: 0.5, side: 'left', length: 7 })],
    },
    {
      name: 'Round the stadium', shape: sweep({ side: 'left', radius: 90, degrees: 140, grade: 0.11 }), stadium: true, billboards: 1,
      features: [brake({ at: 0.06, length: 14, drag: 0.025 })],
      obstacles: [peg({ costume: 'hurdle', at: 0.35, line: 'left' }), peg({ costume: 'hurdle', at: 0.6, line: 'right' }), peg({ costume: 'hurdle', at: 0.85, line: 'left' })],
    },
    {
      name: 'Through the samba streets', shape: sBends({ first: 'right', radius: 70, degrees: 55, grade: 0.14 }), billboards: 1,
      obstacles: [peg({ costume: 'hurdle', at: 0.3, line: 'right' }), peg({ costume: 'hurdle', at: 0.65, line: 'left' })],
    },
    {
      name: 'Up to the banking', shape: straight(50, { grade: 0.14 }),
      obstacles: [slalom({ costume: 'hurdle', from: 0.2, to: 0.85, count: 5, loss: 0.3 })],
    },
    { name: 'Banked under the mountain', shape: sweep({ side: 'right', radius: 45, degrees: 170, grade: 0.16 }), height: 8 },
    {
      name: 'Along the bay', shape: sBends({ first: 'left', radius: 75, degrees: 45, grade: 0.13 }), billboards: 1,
      obstacles: [slalom({ costume: 'hurdle', from: 0.25, to: 0.8, count: 5, loss: 0.32 })],
    },
    {
      name: 'Home straight', shape: straight(70, { grade: 0.13 }), stadium: true, billboards: 1,
      features: [brake({ at: 0.08, length: 10, drag: 0.02 })],
      obstacles: [slalom({ costume: 'hurdle', from: 0.25, to: 0.75, count: 5, loss: 0.3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
