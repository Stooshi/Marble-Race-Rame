'use strict';

// Heartland Oval Speedway (Moses, 12 Nov 2026: eleven new motorsport Grand Prix tracks, the first of four Easy
// ones). A big oval speedway out on the prairie on a summer afternoon: a rolling start down the pace-lap run into
// the banked first turn, the long back straight past the grandstands, the long banked sweep of turns three and
// four (the big feature, the signature: a dramatic banked turn), then off the oval through the infield road
// course: S-bends, the infield hairpin and a last banked sweep to the line. Generic racing pieces only: no real
// speedway, series, team or sponsor.
const {
  track, opening, straight, plunge, sBends, sweep, hairpin, runIn, peg, slalom, rumble, curtain,
} = require('../trackKit');

module.exports = track({
  slug: 'heartland-oval-speedway',
  name: 'Heartland Oval Speedway',
  difficulty: 'easy',
  description: 'A big oval speedway out on the prairie on a summer afternoon: a rolling start into the banked first turn, down the long back straight past packed grandstands, round the long banked sweep of turns three and four, then through the infield road course to the line.',
  surface: 'asphalt',
  biome: 'meadow',
  lighting: 'day',
  variants: ['sunset'],
  grandPrix: { crowd: 'fans', barrier: 'tyres', groupsEvery: 1000 }, // (the small groups of spectators further apart than usual: the flyover's drawing budget)
  signature: 'Turns three and four',
  tvCameras: [
    // (Near the end of the long banked sweep, looking back round it at the field fanned up the banking.)
    { section: 'Turns three and four', at: 0.85, side: 'left', distance: 9, height: 10 },
  ],
  start: { landmark: 'park-fence', gate: 'barrier', shots: { countdown: 'crane', launch: 'overhead' } },
  finish: { landmark: 'pit-garages', scenery: ['grandstand'] },
  opening: opening('rolling-start', {
    side: 'left',
    costumes: { slalom: 'traffic-cone' },
    names: { run: 'Pace lap', turn: 'Turn one' },
  }),
  sections: [
    {
      name: 'Back straight', shape: straight(100, { grade: 0.16 }),
      obstacles: [peg({ costume: 'traffic-cone', at: 0.15, line: 'left' }), slalom({ costume: 'traffic-cone', from: 0.27, to: 0.6, count: 4, loss: 0.25 })],
      features: [rumble({ from: 0.72, to: 0.92, count: 3 })],
    },
    {
      name: 'Turns three and four', shape: sweep({ side: 'right', radius: 85, degrees: 150, grade: 0.13 }), billboards: 2,
    },
    {
      name: 'Front stretch', shape: plunge(90, { grade: 0.24, from: 0.12 }),
      obstacles: [slalom({ costume: 'traffic-cone', from: 0.25, to: 0.7, count: 4, loss: 0.2 })],
    },
    {
      name: 'Infield S-bends', shape: sBends({ first: 'left', radius: 70, degrees: 80, grade: 0.15 }),
    },
    {
      name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }),
    },
    { name: 'Infield hairpin', shape: hairpin({ side: 'left' }), scenery: ['crowd'] },
    {
      name: 'Infield straight', shape: straight(70, { grade: 0.17 }),
      obstacles: [curtain({ costume: 'banner-gantry', at: 0.3, side: 'right' })],
      features: [rumble({ from: 0.6, to: 0.9, count: 3 })],
    },
    {
      name: 'Last banked S-bends', shape: sBends({ first: 'right', radius: 75, degrees: 70, grade: 0.13 }),
      obstacles: [peg({ costume: 'traffic-cone', at: 0.35, line: 'left' })],
    },
    {
      name: 'Home straight', shape: straight(60, { grade: 0.16 }), billboards: 2,
      features: [rumble({ from: 0.5, to: 0.85, count: 3 })],
    },
    { name: 'Finish', shape: runIn(), scenery: ['grandstand'] },
  ],
});
