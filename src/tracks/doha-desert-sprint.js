'use strict';

// Doha Desert Sprint (Moses, 21 Nov 2026: the Track and Field pack filled to 20; a Track and Field track). A
// sand-coloured stadium under a shade roof at the edge of the desert: away from the gate on the clear start (the field
// let go in waves, gentle bends and nothing in the way for the first seconds), along the corniche under a banner gantry
// and over the hurdles, a lap of the stadium, then the track's big feature: a tight, steep banked turn raised high over
// the dunes; S-bends through the dunes and the home straight. Generic stands; no names.
const { track, opening, straight, sweep, sBends, runIn, slalom, curtain, brake } = require('../trackKit');

module.exports = track({
  slug: 'doha-desert-sprint',
  name: 'Doha Desert Sprint',
  family: 'athletics',
  difficulty: 'extreme',
  description: 'Doha\'s shaded stadium at the edge of the desert: away from the gate in a pack, along the corniche under the banners and over the hurdles, a lap of the stadium, then a tight banked turn raised high over the dunes and S-bends to the line.',
  surface: 'tartan',
  biome: 'desert',
  lighting: 'day',
  variants: ['sunset'],
  athletics: { stadium: 'doha', lanes: 'blue' },
  coaster: { style: 'steel', colours: { support: '#b9a684', rail: '#f4efe4', tie: '#8a2a3c' } },
  signature: 'Banked over the dunes',
  tvCameras: [
    // (On the outside at the end of the banking, looking back up at the field coming round the wall.)
    { section: 'Banked over the dunes', at: 0.8, side: 'right', distance: 10, height: 12 },
    { section: 'Along the corniche', at: 0.3, side: 'left', distance: 9, height: 10 },
  ],
  start: { landmark: 'warm-up-track', type: 'minaret', gate: 'paddle', shots: { countdown: 'side', launch: 'high-behind' } },
  finish: { landmark: 'medal-podium' },
  designChanges: [
    'Start shots that look down the track (30 Oct 2026, Moses): the lane numbers read the right way up only from behind the field, so no face-on countdown or look-back first seconds on Track and Field.',
  ],
  opening: opening('clear-start', { side: 'left', waves: { groups: 5, gap: 0.24, jitter: 0.2 } }),
  sections: [
    {
      name: 'Along the corniche', shape: sBends({ first: 'right', radius: 75, degrees: 45, grade: 0.13 }), billboards: 1,
      features: [brake({ at: 0.06, length: 10, drag: 0.02 })],
      obstacles: [curtain({ costume: 'banner-gantry', at: 0.3, side: 'right' }), slalom({ costume: 'hurdle', from: 0.5, to: 0.95, count: 5, loss: 0.3 })],
    },
    {
      name: 'Round the stadium', shape: sweep({ side: 'right', radius: 90, degrees: 120, grade: 0.1 }), stadium: true, billboards: 1,
      features: [brake({ at: 0.06, length: 14, drag: 0.025 })],
      obstacles: [slalom({ costume: 'hurdle', from: 0.35, to: 0.85, count: 5, loss: 0.3 })],
    },
    { name: 'Up to the banking', shape: straight(45, { grade: 0.12 }), billboards: 1 },
    { name: 'Banked over the dunes', shape: sweep({ side: 'left', radius: 45, degrees: 170, grade: 0.14 }), height: 8 },
    {
      name: 'Through the dunes', shape: sBends({ first: 'right', radius: 70, degrees: 55, grade: 0.14 }), billboards: 1,
      landmarks: [{ name: 'caravan', at: 0.5, side: 'left', distance: 30 }],
    },
    {
      name: 'Home straight', shape: straight(65, { grade: 0.12 }), stadium: true, billboards: 1,
      features: [brake({ at: 0.08, length: 10, drag: 0.02 })],
      obstacles: [slalom({ costume: 'hurdle', from: 0.35, to: 0.9, count: 5, loss: 0.3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
