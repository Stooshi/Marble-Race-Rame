'use strict';

// Paris Saint-Denis Relay (Moses, 21 Nov 2026: tonight's Track and Field tracks, Extreme). The big stadium north of
// Paris under its thin floating roof, by the canal: away from the gate on the clear start (the field let go in waves,
// gentle bends and nothing in the way for the first seconds), along the canal past a hurdle cart, over the bridges
// and the hurdles, a lap of the stadium, a steep drop back to the canal, then the track's big feature: a splitter
// either side of an obelisk, the two halves of the field side by side like a relay's two legs; the home straight.
// Generic stands; no names.
const { track, opening, straight, sweep, plunge, sBends, splitter, runIn, peg, slalom, parked, brake } = require('../trackKit');

module.exports = track({
  slug: 'paris-saint-denis-relay',
  name: 'Paris Saint-Denis Relay',
  family: 'athletics',
  difficulty: 'extreme',
  description: 'The big stadium north of Paris under its floating roof: away from the gate in a pack, along the canal past the hurdle cart, over the bridges and the hurdles, a lap of the stadium, a steep drop to the canal, then either side of the obelisk at the splitter and down the home straight.',
  surface: 'tartan',
  biome: 'meadow',
  lighting: 'day',
  variants: ['sunset'],
  athletics: { stadium: 'saint-denis', lanes: 'red' },
  coaster: { style: 'concrete', colours: { support: '#aeb6c2', rail: '#eef0f3', tie: '#2f5fb0' } },
  signature: 'Either side of the obelisk',
  tvCameras: [
    // (Where the two channels meet again past the obelisk, looking back at both halves of the field.)
    { section: 'Either side of the obelisk', at: 0.6, side: 'right', distance: 9, height: 11 },
    { section: 'Along the canal', at: 0.4, side: 'left', distance: 9, height: 10 },
  ],
  start: { landmark: 'warm-up-track', type: 'water-tower', gate: 'paddle', shots: { countdown: 'side', launch: 'side' } },
  finish: { landmark: 'medal-podium' },
  designChanges: [
    'Start shots that look down the track (30 Oct 2026, Moses): the lane numbers read the right way up only from behind the field, so no face-on countdown or look-back first seconds on Track and Field.',
  ],
  opening: opening('clear-start', { side: 'left', waves: { groups: 5, gap: 0.24, jitter: 0.2 } }),
  sections: [
    {
      name: 'Along the canal', shape: straight(35, { grade: 0.12 }), billboards: 1,
      features: [brake({ at: 0.08, length: 8, drag: 0.02 })],
      obstacles: [parked({ costume: 'hurdle-cart', at: 0.5, side: 'right', length: 10 })],
    },
    {
      name: 'Over the bridges', shape: sBends({ first: 'right', radius: 70, degrees: 55, grade: 0.12 }), billboards: 1,
      obstacles: [slalom({ costume: 'hurdle', from: 0.25, to: 0.8, count: 5, loss: 0.3 })],
    },
    {
      name: 'Round the stadium', shape: sweep({ side: 'left', radius: 90, degrees: 150, grade: 0.09 }), stadium: true, billboards: 1,
      features: [brake({ at: 0.06, length: 14, drag: 0.025 })],
      obstacles: [peg({ costume: 'hurdle', at: 0.4, line: 'left' }), peg({ costume: 'hurdle', at: 0.7, line: 'right' })],
    },
    { name: 'Down to the canal', shape: plunge(45, { grade: 0.3, from: 0.12 }) },
    {
      name: 'Along the quay', shape: straight(60, { grade: 0.11 }),
      obstacles: [slalom({ costume: 'hurdle', from: 0.2, to: 0.9, count: 5, loss: 0.25 })],
    },
    {
      name: 'Either side of the obelisk', around: 'obelisk',
      shape: splitter({ side: 'left', degrees: 0, approach: 55, merge: 30, balance: { tipOffset: 0, left: { drag: 1.1, scrub: 1.1 }, right: { drag: 1.35, scrub: 1.35 } } }),
      obstacles: [peg({ costume: 'hurdle', at: 0.15, line: 'left' }), peg({ costume: 'hurdle', at: 0.3, line: 'right' })],
    },
    {
      name: 'Home straight', shape: straight(75, { grade: 0.12 }), stadium: true, billboards: 1,
      features: [brake({ at: 0.08, length: 10, drag: 0.02 })],
      obstacles: [slalom({ costume: 'hurdle', from: 0.35, to: 0.9, count: 5, loss: 0.35 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
