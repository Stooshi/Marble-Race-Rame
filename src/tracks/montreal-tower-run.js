'use strict';

// Montreal Tower Run (Moses, 21 Nov 2026: tonight's Track and Field tracks, Extreme). A concrete stadium bowl with
// its tall tower leaning out over one end, by the river: away from the gate on the clear start (the field let go in
// waves, gentle bends and nothing in the way for the first seconds), S-bends through the park under a banner gantry and
// over the hurdles, along the island, a lap of the stadium, then the track's big feature: a full loop beside the
// leaning tower; straight after it a steep drop to the river and the home straight. Generic stands; no names.
const { track, opening, straight, sweep, plunge, sBends, loop, runIn, peg, slalom, curtain, brake } = require('../trackKit');

module.exports = track({
  slug: 'montreal-tower-run',
  name: 'Montreal Tower Run',
  family: 'athletics',
  difficulty: 'extreme',
  description: 'Montreal\'s concrete stadium under its leaning tower: away from the gate in a pack, through the park under the banners and over the hurdles, along the island, a lap of the stadium, then a full loop beside the tower and a steep drop to the river before the line.',
  surface: 'tartan',
  biome: 'meadow',
  lighting: 'day',
  variants: ['sunset'],
  athletics: { stadium: 'montreal', lanes: 'blue' },
  coaster: { style: 'concrete', colours: { support: '#b9b4ab', rail: '#eceae5', tie: '#3a6fc4' } },
  signature: 'Loop by the tower',
  tvCameras: [
    // (Just past the loop, looking back at the field coming over the top.)
    { section: 'Loop by the tower', at: 0.7, side: 'left', distance: 10, height: 10 },
    { section: 'Along the island', at: 0.4, side: 'right', distance: 9, height: 10 },
  ],
  start: { landmark: 'warm-up-track', type: 'spiral-tower', gate: 'trapdoor', shots: { countdown: 'chase', launch: 'high-side' } },
  finish: { landmark: 'medal-podium' },
  designChanges: [
    'Start shots that look down the track (30 Oct 2026, Moses): the lane numbers read the right way up only from behind the field, so no face-on countdown or look-back first seconds on Track and Field.',
  ],
  opening: opening('clear-start', { side: 'right', waves: { groups: 5, gap: 0.2, jitter: 0.16 } }),
  sections: [
    {
      name: 'Through the park', shape: sBends({ first: 'left', radius: 75, degrees: 45, grade: 0.14 }), billboards: 1,
      obstacles: [curtain({ costume: 'banner-gantry', at: 0.25, side: 'left' }), slalom({ costume: 'hurdle', from: 0.45, to: 0.9, count: 5, loss: 0.3 })],
    },
    {
      name: 'Along the island', shape: straight(55, { grade: 0.14 }), billboards: 1,
      features: [brake({ at: 0.06, length: 10, drag: 0.02 })],
      obstacles: [peg({ costume: 'hurdle', at: 0.4, line: 'left' }), peg({ costume: 'hurdle', at: 0.7, line: 'right' })],
    },
    {
      name: 'Round the stadium', shape: sweep({ side: 'right', radius: 90, degrees: 130, grade: 0.1 }), stadium: true, billboards: 1,
      features: [brake({ at: 0.06, length: 14, drag: 0.025 })],
      obstacles: [slalom({ costume: 'hurdle', from: 0.35, to: 0.85, count: 5, loss: 0.3 })],
    },
    {
      name: 'Loop by the tower', shape: straight(170, { grade: 0.13 }), height: 0,
      features: [brake({ at: 0.08, length: 12, drag: 0.02 }), loop({ at: 0.45, viewSide: 14 })],
    },
    { name: 'Down to the river', shape: plunge(50, { grade: 0.32, from: 0.12 }) },
    {
      name: 'Home straight', shape: straight(75, { grade: 0.12 }), stadium: true, billboards: 1,
      features: [brake({ at: 0.08, length: 10, drag: 0.02 })],
      obstacles: [slalom({ costume: 'hurdle', from: 0.35, to: 0.9, count: 5, loss: 0.35 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
