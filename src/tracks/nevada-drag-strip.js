'use strict';

// Nevada Drag Strip (Moses, 12 Nov 2026: eleven new motorsport Grand Prix tracks, the first of three Extreme ones, the
// showpiece). A drag strip out in the Nevada desert at sunset: the start lights, a short rise so the pack settles (the
// crest start, the field let go in waves so no starting group gets an edge), then about 10 seconds in the Speed pads,
// two wall to wall, that every marble crosses, like a second start; then the long Drag strip half-pipe (the big
// feature, the signature: long enough to watch the field accelerate and catch up), a sand strip to take the edge off
// the speed and the Desert loop; the Mesa S-bends, the Canyon hairpin, the Wash drop and the desert sweep back to the
// line. A low camera in front of the waiting field for the countdown, then a low chase camera.
// Generic racing pieces only: no real drag strip, series, team, driver or sponsor.
const {
  track, opening, brake, straight, plunge, sBends, sweep, hairpin, halfPipe, runIn, peg, slalom, rumble, curtain, boost, loop,
} = require('../trackKit');

module.exports = track({
  slug: 'nevada-drag-strip',
  name: 'Nevada Drag Strip',
  difficulty: 'extreme',
  description: 'A drag strip out in the Nevada desert at sunset: the start lights, a short rise, then speed pads wall to wall like a second start, a long wide half-pipe where the field races side by side and catches up, a loop at its end, and back across the desert past the mesas to the line.',
  surface: 'asphalt',
  biome: 'desert',
  lighting: 'sunset',
  variants: ['day'],
  grandPrix: { crowd: 'fans', barrier: 'tyres', groupsEvery: 1000 },
  signature: 'Drag strip half-pipe',
  tvCameras: [
    // (Just out of the half-pipe, looking back up it at the field racing side by side towards the loop; the half-pipe's
    // own banks stand in the way of a camera beside it.)
    { section: 'Desert loop', at: 0.2, side: 'left', distance: 9, height: 9 },
    { section: 'Run to the hairpin', at: 0.5, side: 'right', distance: 9, height: 9 },
  ],
  start: { landmark: 'pit-garages', gate: 'paddle', shots: { countdown: 'low-front', launch: 'low-chase' } },
  finish: { landmark: 'big-rock' },
  opening: opening('crest-start', {
    costumes: { block: 'tyre-stack', slalom: 'traffic-cone' },
    names: { plunge: 'Start plunge', climb: 'The rise', drop: 'Over the rise' },
    // (Let go in waves, a new order every race: without them the first starting group won a little more.)
    waves: { groups: 5, gap: 0.12, jitter: 0.04 },
  }),
  sections: [
    {
      name: 'Speed pads', shape: straight(70, { grade: 0.15 }),
      obstacles: [curtain({ costume: 'banner-gantry', at: 0.08, side: 'left' }), slalom({ costume: 'traffic-cone', from: 0.18, to: 0.38, count: 4, loss: 0.3 }), peg({ costume: 'traffic-cone', at: 0.44, line: 'right' })],
      features: [boost({ at: 0.5, length: 8 }), boost({ at: 0.75, length: 8 })],
    },
    {
      name: 'Drag strip half-pipe', shape: halfPipe({ first: 'right', width: 8.5, swings: 6, radius: 150, degrees: 16, grade: 0.11 }),
    },
    { name: 'Desert loop', shape: straight(170, { grade: 0.1 }), features: [brake({ at: 0.08, length: 16, drag: 0.04 }), loop({ at: 0.45, viewSide: 14 })] },
    {
      name: 'Mesa S-bends', shape: sBends({ first: 'right', radius: 65, degrees: 80, grade: 0.18 }), billboards: 2,
      obstacles: [peg({ costume: 'traffic-cone', at: 0.2, line: 'center' }), slalom({ costume: 'traffic-cone', from: 0.4, to: 0.7, count: 4, loss: 0.25 }), peg({ costume: 'traffic-cone', at: 0.88, line: 'left' })],
    },
    {
      name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }),
      obstacles: [peg({ costume: 'traffic-cone', at: 0.2, line: 'left' }), slalom({ costume: 'traffic-cone', from: 0.5, to: 0.85, count: 3, loss: 0.2 })],
    },
    { name: 'Canyon hairpin', shape: hairpin({ side: 'left' }) },
    {
      name: 'Wash drop', shape: plunge(45, { grade: 0.3, from: 0.15 }),
      obstacles: [peg({ costume: 'traffic-cone', at: 0.55, line: 'center' }), peg({ costume: 'traffic-cone', at: 0.8, line: 'left' })],
    },
    {
      name: 'Desert sweep', shape: sweep({ side: 'right', radius: 75, degrees: 100, grade: 0.16 }),
      obstacles: [peg({ costume: 'traffic-cone', at: 0.3, line: 'center' }), slalom({ costume: 'traffic-cone', from: 0.5, to: 0.8, count: 3, loss: 0.2 })],
    },
    {
      name: 'Home straight', shape: straight(60, { grade: 0.16 }), billboards: 2,
      obstacles: [peg({ costume: 'traffic-cone', at: 0.2, line: 'center' })],
      features: [rumble({ from: 0.5, to: 0.85, count: 3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
