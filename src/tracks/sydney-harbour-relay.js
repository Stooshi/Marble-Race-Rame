'use strict';

// Sydney Harbour Relay (Moses, 24 Nov 2026: the Track and Field pack filled to 20; no "Olympic" or "torch" in
// its name or scenery). A big oval stadium in a park west of the city, the harbour and its arch bridge on the way:
// away from the gate on the clear start (the field let go in waves, gentle bends and nothing in the way for the
// first seconds), along the harbour over a steeplechase barrier, a speed pad and the hurdles, under the arch bridge, then the track's big
// feature: a steep drop to the quay straight into the surf swell, a half-pipe rocking the field wall to wall;
// a lap of the stadium off a speed pad, along the bay over the hurdles, S-bends through the gum trees and the home straight. Generic stands; no names.
const { track, opening, straight, sweep, sBends, halfPipe, plunge, runIn, peg, slalom, block, brake, boost } = require('../trackKit');

module.exports = track({
  slug: 'sydney-harbour-relay',
  name: 'Sydney Harbour Relay',
  family: 'athletics',
  difficulty: 'extreme',
  description: 'Sydney\'s big stadium by the harbour: away from the gate in a pack, along the water over the hurdles, under the arch bridge, then a steep drop to the quay into the surf swell rocking the field wall to wall, a lap of the stadium, along the bay and through the gum trees to the line.',
  surface: 'tartan',
  biome: 'meadow',
  lighting: 'day',
  variants: ['sunset'],
  athletics: { stadium: 'sydney', lanes: 'blue' },
  coaster: { style: 'steel', colours: { support: '#7a8088', rail: '#f4f1ea', tie: '#1f6fa8' } },
  signature: 'The surf swell',
  tvCameras: [
    // (At the end of the swell, looking back at the field coming down the drop and rocking wall to wall.)
    { section: 'The surf swell', at: 0.85, side: 'right', distance: 9, height: 9 },
    { section: 'Through the gum trees', at: 0.65, side: 'left', distance: 9, height: 10 },
  ],
  start: { landmark: 'warm-up-track', type: 'lighthouse', gate: 'paddle', shots: { countdown: 'low-front', launch: 'high-side' } },
  finish: { landmark: 'medal-podium' },
  designChanges: [
    'Start shots that look down the track (30 Oct 2026, Moses): the lane numbers read the right way up only from behind the field, so no face-on countdown or look-back first seconds on Track and Field.',
  ],
  opening: opening('clear-start', { side: 'left', waves: { groups: 5, gap: 0.26, jitter: 0.24 } }),
  sections: [
    {
      name: 'Along the harbour', shape: straight(50, { grade: 0.12 }),
      features: [brake({ at: 0.06, length: 10, drag: 0.02 }), boost({ at: 0.32, kick: 4 })],
      obstacles: [block({ costume: 'steeple-barrier', at: 0.2, line: 'center', loss: 0.25 }), slalom({ costume: 'hurdle', from: 0.45, to: 0.95, count: 5, loss: 0.3 })],
    },
    {
      name: 'Under the arch bridge', shape: sweep({ side: 'right', radius: 85, degrees: 100, grade: 0.11 }), billboards: 1,
      landmarks: [{ name: 'harbour-arch-bridge', at: 0.5, side: 'left', distance: 30 }],
      obstacles: [peg({ costume: 'hurdle', at: 0.4, line: 'left' }), peg({ costume: 'hurdle', at: 0.7, line: 'right' })],
    },
    { name: 'Down to the quay', shape: plunge(45, { grade: 0.3, from: 0.1 }) },
    { name: 'The surf swell', shape: halfPipe({ first: 'left', width: 8, swings: 3, radius: 130, degrees: 22, grade: 0.13 }), height: 0 },
    {
      name: 'Round the stadium', shape: sweep({ side: 'left', radius: 90, degrees: 135, grade: 0.09 }), stadium: true, billboards: 1,
      features: [boost({ at: 0.08, kick: 4 })],
      obstacles: [slalom({ costume: 'hurdle', from: 0.35, to: 0.85, count: 5, loss: 0.3 })],
    },
    {
      name: 'Along the bay', shape: straight(50, { grade: 0.11 }),
      obstacles: [slalom({ costume: 'hurdle', from: 0.25, to: 0.9, count: 5, loss: 0.3 })],
    },
    {
      name: 'Through the gum trees', shape: sBends({ first: 'right', radius: 70, degrees: 55, grade: 0.13 }), billboards: 1,
      obstacles: [peg({ costume: 'hurdle', at: 0.3, line: 'right' }), peg({ costume: 'hurdle', at: 0.55, line: 'left' }), peg({ costume: 'hurdle', at: 0.8, line: 'right' })],
    },
    {
      name: 'Home straight', shape: straight(65, { grade: 0.12 }), stadium: true, billboards: 1,
      features: [brake({ at: 0.08, length: 10, drag: 0.02 })],
      obstacles: [slalom({ costume: 'hurdle', from: 0.3, to: 0.7, count: 4, loss: 0.3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
