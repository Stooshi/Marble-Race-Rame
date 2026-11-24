'use strict';

// Kingston Blue Mountain Run (Moses, 21 Nov 2026: the Track and Field pack filled to 20; track 16 of the series). A big
// open bowl of a stadium under the Blue Mountains, its crowd the loudest in the series: away from the gate on the clear
// start (the field let go in waves, gentle bends and nothing in the way for the first seconds), along the harbour road past a
// cart of hurdles, S-bends up into the hills over the hurdles, a lap of the stadium, then the track's big feature: a
// splitter either side of a green hill under the mountains, and the home straight. Generic
// stands; no names.
const { track, opening, straight, sweep, splitter, sBends, plunge, runIn, peg, slalom, brake, boost } = require('../trackKit');

// Second design (Moses, 24 Nov 2026: one more try with a redesigned splitter). The first had the splitter straight
// after the stadium sweep, so the leaders all came to it on one line and that channel won 60–70% of races: now the
// splitter comes off a straight with a hurdle slalom that mixes the field, then the drop down from the mountains.
module.exports = track({
  slug: 'kingston-blue-mountain-run',
  name: 'Kingston Blue Mountain Run',
  family: 'athletics',
  difficulty: 'extreme',
  description: 'Kingston\'s big loud stadium under the Blue Mountains: away from the gate in a pack, along the harbour road over the hurdles, either side of a green hill, up into the hills, then a steep drop down from the mountains, a lap of the stadium and the home straight.',
  surface: 'tartan',
  biome: 'meadow',
  lighting: 'day',
  variants: ['sunset'],
  athletics: { stadium: 'kingston', lanes: 'red' },
  coaster: { style: 'steel', colours: { support: '#6d7178', rail: '#f2efe6', tie: '#2f7a3e' } },
  signature: 'Either side of the hill',
  tvCameras: [
    // (Where the two channels meet again past the hill, looking back at the field coming round both sides.)
    { section: 'Either side of the hill', at: 0.7, side: 'right', distance: 9, height: 11 },
    { section: 'Round the stadium', at: 0.6, side: 'left', distance: 9, height: 10 },
  ],
  start: { landmark: 'warm-up-track', type: 'castle-tower', gate: 'stalls', shots: { countdown: 'side', launch: 'overhead' } },
  finish: { landmark: 'medal-podium' },
  designChanges: [
    'Start shots that look down the track (30 Oct 2026, Moses): the lane numbers read the right way up only from behind the field, so no face-on countdown or look-back first seconds on Track and Field.',
  ],
  opening: opening('clear-start', { side: 'right', waves: { groups: 5, gap: 0.28, jitter: 0.24 } }),
  sections: [
    {
      name: 'Along the harbour road', shape: straight(60, { grade: 0.12 }), billboards: 1,
      obstacles: [slalom({ costume: 'hurdle', from: 0.3, to: 0.92, count: 5, loss: 0.3 })],
    },
    {
      name: 'Either side of the hill',
      shape: splitter({ side: 'left', degrees: 0, approach: 55, merge: 30, balance: { tipOffset: 0, left: { drag: 1.2, scrub: 1.2 }, right: { drag: 1.2, scrub: 1.2 } } }),
    },
    {
      name: 'Up into the hills', shape: sBends({ first: 'left', radius: 70, degrees: 55, grade: 0.13 }), billboards: 1,
      features: [boost({ at: 0.08 })],
      obstacles: [slalom({ costume: 'hurdle', from: 0.3, to: 0.85, count: 5, loss: 0.3 })],
    },
    { name: 'Down from the mountains', shape: plunge(45, { grade: 0.32, from: 0.1 }) },
    {
      name: 'Round the stadium', shape: sweep({ side: 'right', radius: 90, degrees: 125, grade: 0.09 }), stadium: true, billboards: 1,
      features: [boost({ at: 0.06 })],
      obstacles: [slalom({ costume: 'hurdle', from: 0.35, to: 0.85, count: 5, loss: 0.3 })],
    },
    {
      name: 'Home straight', shape: straight(70, { grade: 0.12 }), stadium: true, billboards: 1,
      features: [brake({ at: 0.08, length: 10, drag: 0.02 })],
      obstacles: [peg({ costume: 'hurdle', at: 0.35, line: 'left' }), peg({ costume: 'hurdle', at: 0.6, line: 'right' })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
