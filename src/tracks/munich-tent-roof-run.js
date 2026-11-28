'use strict';

// Munich Tent Roof Run (Moses, 21 Nov 2026: the Track and Field pack filled to 20; track 13 of the series). A green
// bowl of a stadium sunk into its park, a tent roof hung from tall masts over one side, the lake and the hill made from
// rubble beside it and the tall TV tower above: away from the gate on the clear start (the field let go in waves, gentle
// bends and nothing in the way for the first seconds), along the lake, a lap under the tent roof, then the track's big
// feature: a full loop by the tower; over the hill, the hairpin and the home straight. Generic stands; no names.
const { track, opening, straight, sweep, hairpin, sBends, loop, runIn, peg, slalom, brake } = require('../trackKit');

module.exports = track({
  slug: 'munich-tent-roof-run',
  name: 'Munich Tent Roof Run',
  family: 'athletics',
  difficulty: 'extreme',
  description: 'Munich\'s green stadium under its tent roof: away from the gate in a pack, along the lake, a lap under the roof over the hurdles, then a full loop by the tall tower, over the hill and round the hairpin to the line.',
  surface: 'tartan',
  biome: 'meadow',
  lighting: 'day',
  variants: ['sunset'],
  athletics: { stadium: 'munich', lanes: 'blue' },
  coaster: { style: 'steel', colours: { support: '#9aa0a6', rail: '#e8ecef', tie: '#4f7d4a' } },
  signature: 'Loop by the tower',
  tvCameras: [
    // (Just past the loop, looking back at the field coming over the top.)
    { section: 'Loop by the tower', at: 0.7, side: 'right', distance: 10, height: 10 },
    { section: 'Along the lake', at: 0.6, side: 'left', distance: 9, height: 10 },
  ],
  start: { landmark: 'warm-up-track', type: 'observation-tower', gate: 'barrier', shots: { countdown: 'crane', launch: 'side' } },
  finish: { landmark: 'medal-podium' },
  designChanges: [
    'Start shots that look down the track (30 Oct 2026, Moses): the lane numbers read the right way up only from behind the field, so no face-on countdown or look-back first seconds on Track and Field.',
  ],
  opening: opening('clear-start', { side: 'left', waves: { groups: 5, gap: 0.24, jitter: 0.2 } }),
  sections: [
    {
      name: 'Along the lake', shape: straight(50, { grade: 0.12 }), billboards: 1,
      features: [brake({ at: 0.1, length: 12, drag: 0.02 })],
      obstacles: [slalom({ costume: 'hurdle', from: 0.35, to: 0.95, count: 5, loss: 0.3 })],
    },
    {
      name: 'Under the tent roof', shape: sweep({ side: 'right', radius: 90, degrees: 130, grade: 0.11 }), stadium: true, billboards: 1,
      features: [brake({ at: 0.06, length: 14, drag: 0.025 })],
      obstacles: [slalom({ costume: 'hurdle', from: 0.35, to: 0.85, count: 5, loss: 0.3 })],
    },
    {
      name: 'Loop by the tower', shape: straight(170, { grade: 0.13 }), height: 0,
      landmarks: [{ name: 'tv-tower', at: 0.45, side: 'left', distance: 30 }],
      features: [brake({ at: 0.08, length: 12, drag: 0.02 }), loop({ at: 0.45, viewSide: 14 })],
    },
    {
      name: 'Over the hill', shape: sBends({ first: 'left', radius: 70, degrees: 55, grade: 0.15 }), billboards: 1,
      obstacles: [peg({ costume: 'hurdle', at: 0.3, line: 'left' }), peg({ costume: 'hurdle', at: 0.65, line: 'right' })],
    },
    { name: 'Run to the hairpin', shape: straight(40, { grade: 0.13 }), billboards: 1 },
    { name: 'Hairpin under the hill', shape: hairpin({ side: 'left' }) },
    {
      name: 'Home straight', shape: straight(65, { grade: 0.12 }), stadium: true, billboards: 1,
      features: [brake({ at: 0.08, length: 10, drag: 0.02 })],
      obstacles: [slalom({ costume: 'hurdle', from: 0.35, to: 0.9, count: 5, loss: 0.35 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
