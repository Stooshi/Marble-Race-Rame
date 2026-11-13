'use strict';

// Mexico City Stadium Section (Moses, 12 Nov 2026: eleven new motorsport Grand Prix tracks, the last of four Easy
// ones). A city-park circuit in Mexico City at dusk, under the jacarandas: a rolling start and the banked first turn, the long Avenue sweep, the Park esses and the back straight, the Fountain hairpin, then into the Stadium
// section (the big feature, the signature: a half-circle banked round the inside of a stadium bowl packed with fans)
// and out along the home straight to the line. Generic racing pieces only: no real circuit, series, team or sponsor.
const {
  track, opening, straight, plunge, sBends, sweep, hairpin, runIn, peg, slalom, rumble, curtain,
} = require('../trackKit');

module.exports = track({
  slug: 'mexico-city-stadium-section',
  name: 'Mexico City Stadium Section',
  difficulty: 'easy',
  description: 'A city-park circuit in Mexico City at dusk under the flowering jacarandas: a rolling start into the banked first turn, round the long avenue sweep, through the park esses and the fountain hairpin, then into the stadium section, banked half round the inside of a bowl packed with fans, and out to the line.',
  surface: 'asphalt',
  biome: 'city',
  lighting: 'dusk',
  variants: ['day'],
  grandPrix: { crowd: 'fans', barrier: 'tyres', groupsEvery: 800 },
  signature: 'Stadium section',
  tvCameras: [
    // (Halfway round the stadium, looking back round the bowl at the field banking through it.)
    { section: 'Stadium section', at: 0.45, side: 'left', distance: 9, height: 11 },
  ],
  start: { landmark: 'city-hall', gate: 'trapdoor', shots: { countdown: 'above', launch: 'side' } },
  finish: { landmark: 'pit-garages', scenery: ['grandstand'] },
  opening: opening('rolling-start', {
    side: 'right',
    costumes: { slalom: 'traffic-cone' },
    names: { run: 'Rolling start', turn: 'Turn one' },
    dress: { turn: { scenery: ['jacarandas'] } },
  }),
  sections: [
    {
      name: 'Reforma straight', shape: straight(55, { grade: 0.2 }), scenery: ['colourful-houses'],
      obstacles: [slalom({ costume: 'traffic-cone', from: 0.2, to: 0.8, count: 5, loss: 0.3 })],
    },
    {
      name: 'Park esses', shape: sBends({ first: 'left', radius: 65, degrees: 85, grade: 0.14 }), scenery: ['jacarandas'],
      obstacles: [slalom({ costume: 'traffic-cone', from: 0.35, to: 0.65, count: 3, loss: 0.15 })],
    },
    {
      name: 'Avenue sweep', shape: sweep({ side: 'left', radius: 80, degrees: 150, grade: 0.12 }), billboards: 1, scenery: ['colourful-houses'],
    },
    {
      name: 'Long avenue', shape: straight(150, { grade: 0.13 }), billboards: 2, scenery: ['jacarandas'],
      obstacles: [peg({ costume: 'traffic-cone', at: 0.25, line: 'center' }), peg({ costume: 'traffic-cone', at: 0.45, line: 'right' })],
      features: [rumble({ from: 0.65, to: 0.9, count: 3 })],
    },
    {
      name: 'Stadium section', shape: sweep({ side: 'right', radius: 60, degrees: 180, grade: 0.12 }), scenery: ['grandstand'],
      obstacles: [peg({ costume: 'traffic-cone', at: 0.35, line: 'center' }), peg({ costume: 'traffic-cone', at: 0.7, line: 'high' })],
    },
    {
      name: 'Run to the hairpin', shape: straight(90, { grade: 0.11 }), billboards: 1, scenery: ['jacarandas'],
      obstacles: [curtain({ costume: 'banner-gantry', at: 0.3, side: 'right' })],
    },
    { name: 'Fountain hairpin', shape: hairpin({ side: 'left' }), scenery: ['crowd'] },
    {
      name: 'Home straight', shape: straight(125, { grade: 0.12 }), billboards: 2, scenery: ['grandstand'],
      obstacles: [peg({ costume: 'traffic-cone', at: 0.2, line: 'center' })],
      features: [rumble({ from: 0.5, to: 0.8, count: 3 })],
    },
    { name: 'Finish', shape: runIn(), scenery: ['grandstand'] },
  ],
});
