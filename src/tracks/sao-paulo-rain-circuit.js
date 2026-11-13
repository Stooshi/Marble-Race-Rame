'use strict';

// São Paulo Rain Circuit (Moses, 12 Nov 2026: eleven new motorsport Grand Prix tracks, the third of four Wild ones). A
// hilly old circuit in the south of São Paulo in a tropical downpour: the pipe drop (a short plunge into a half-pipe of
// streaming water), the Reservoir esses, the long banked Lake curve (big feature one, the signature: a dramatic banked
// turn round the reservoir), the climb to the top of the hill, the Downhill plunge (big feature two: a big drop), the
// Favela hairpin, the Uphill esses and the run along the grandstands to the line. Generic racing pieces only: no real
// circuit, series, team, driver or sponsor.
const {
  track, opening, straight, plunge, climb, sBends, sweep, hairpin, runIn, peg, slalom, rumble, curtain,
} = require('../trackKit');

module.exports = track({
  slug: 'sao-paulo-rain-circuit',
  name: 'São Paulo Rain Circuit',
  difficulty: 'hard',
  description: 'A hilly old circuit in the south of São Paulo in a tropical downpour: down a half-pipe of streaming water from the start, round the long banked curve by the reservoir, over the top of the hill and down a big drop, round the hairpin below the hillside houses and back up past the grandstands to the line.',
  surface: 'asphalt',
  biome: 'city',
  lighting: 'rain',
  variants: ['day'],
  grandPrix: { crowd: 'fans', barrier: 'tyres', groupsEvery: 900 },
  signature: 'Lake curve',
  tvCameras: [
    // (Near the end of the banked curve, looking back round it at the field fanned up the banking in the rain.)
    { section: 'Lake curve', at: 0.85, side: 'right', distance: 9, height: 10 },
  ],
  start: { landmark: 'pit-garages', gate: 'paddle', shots: { countdown: 'chase', launch: 'side' } },
  finish: { landmark: 'pit-garages', scenery: ['grandstand'] },
  opening: opening('pipe-drop', {
    side: 'right',
    names: { plunge: 'Start plunge', pipe: 'Rain channel' },
  }),
  sections: [
    {
      name: 'Reservoir esses', shape: sBends({ first: 'left', radius: 60, degrees: 100, grade: 0.15 }), scenery: ['colourful-houses'],
      obstacles: [peg({ costume: 'traffic-cone', at: 0.2, line: 'center' }), slalom({ costume: 'traffic-cone', from: 0.4, to: 0.75, count: 5, loss: 0.3 })],
    },
    {
      name: 'Lake curve', shape: sweep({ side: 'left', radius: 70, degrees: 200, grade: 0.13 }), billboards: 2, scenery: ['crowd'],
      obstacles: [peg({ costume: 'traffic-cone', at: 0.25, line: 'center' }), slalom({ costume: 'traffic-cone', from: 0.4, to: 0.6, count: 3, loss: 0.2 }), peg({ costume: 'traffic-cone', at: 0.75, line: 'high' })],
    },
    {
      name: 'Back straight', shape: straight(60, { grade: 0.16 }),
      obstacles: [slalom({ costume: 'traffic-cone', from: 0.15, to: 0.65, count: 5, loss: 0.25 })],
    },
    { name: 'Top of the hill', shape: climb(14, { grade: -0.06, after: 0.2 }) },
    {
      name: 'Downhill plunge', shape: plunge(60, { grade: 0.34, from: 0.2 }), scenery: ['colourful-houses'],
      obstacles: [slalom({ costume: 'traffic-cone', from: 0.55, to: 0.9, count: 3, loss: 0.25 })],
    },
    {
      name: 'Run to the hairpin', shape: straight(45, { grade: 0.12 }),
      obstacles: [peg({ costume: 'traffic-cone', at: 0.35, line: 'right' })],
    },
    { name: 'Favela hairpin', shape: hairpin({ side: 'right' }), scenery: ['crowd'] },
    {
      name: 'Uphill esses', shape: sBends({ first: 'left', radius: 65, degrees: 80, grade: 0.14 }), billboards: 1,
      obstacles: [peg({ costume: 'traffic-cone', at: 0.2, line: 'center' }), slalom({ costume: 'traffic-cone', from: 0.4, to: 0.65, count: 3, loss: 0.2 }), peg({ costume: 'traffic-cone', at: 0.85, line: 'left' })],
    },
    {
      name: 'Grandstand sweep', shape: sweep({ side: 'left', radius: 80, degrees: 90, grade: 0.13 }),
      obstacles: [peg({ costume: 'traffic-cone', at: 0.2, line: 'center' }), curtain({ costume: 'banner-gantry', at: 0.5, side: 'high' }), peg({ costume: 'traffic-cone', at: 0.8, line: 'left' })],
    },
    {
      name: 'Home straight', shape: straight(60, { grade: 0.17 }), billboards: 2, scenery: ['grandstand'],
      obstacles: [peg({ costume: 'traffic-cone', at: 0.15, line: 'left' }), peg({ costume: 'traffic-cone', at: 0.35, line: 'right' })],
      features: [rumble({ from: 0.5, to: 0.85, count: 3 })],
    },
    { name: 'Finish', shape: runIn(), scenery: ['grandstand'] },
  ],
});
