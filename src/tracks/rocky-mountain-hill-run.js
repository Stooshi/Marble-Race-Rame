'use strict';

// Rocky Mountain Hill Run (Moses, 12 Nov 2026: eleven new motorsport Grand Prix tracks, the last of four Wild ones). A
// mountain hill race down a road through the Rocky Mountains on a snowy afternoon: off the start beside a falling
// mountain stream (the Falls start, a waterfall plunge), through the Pine S-bends, along the Pass road, down the Canyon
// drop (big feature one: a big drop between the rock walls), round the long banked Switchback curve (big feature two,
// the signature: a dramatic banked turn above the valley), the Lodge hairpin and down the valley to the line. Generic
// racing pieces only: no real hill climb, series, team, driver or sponsor.
const {
  track, waterfall, straight, plunge, sBends, sweep, hairpin, runIn, peg, slalom, pileUp, rumble, curtain,
} = require('../trackKit');

module.exports = track({
  slug: 'rocky-mountain-hill-run',
  name: 'Rocky Mountain Hill Run',
  difficulty: 'hard',
  description: 'A mountain road race through the Rockies on a snowy afternoon: off the start beside a falling mountain stream, through the pines, along the pass road, down a big drop between the canyon walls, round a long banked switchback above the valley and down past the lodge to the line.',
  surface: 'asphalt',
  biome: 'alpine',
  lighting: 'day',
  variants: ['sunset'],
  grandPrix: { crowd: 'fans', barrier: 'logs', groupsEvery: 1000 },
  signature: 'Switchback curve',
  tvCameras: [
    // (Near the end of the banked switchback, looking back round it at the field fanned up the banking.)
    { section: 'Switchback curve', at: 0.85, side: 'left', distance: 9, height: 10 },
  ],
  start: { landmark: 'mountain-hut', gate: 'trapdoor', shots: { countdown: 'crane', launch: 'high-behind' } },
  finish: { landmark: 'old-lodge', scenery: ['grandstand'] },
  sections: [
    {
      name: 'Falls start', shape: waterfall(70, { grade: 0.6 }),
      obstacles: [peg({ costume: 'rally-flag', at: 0.22, line: 'right' }), pileUp({ costume: 'tyre-stack', at: 0.45 }), slalom({ costume: 'rally-flag', from: 0.6, to: 0.97, count: 6, loss: 0.3 })],
    },
    {
      name: 'Pine S-bends', shape: sBends({ first: 'right', radius: 60, degrees: 85, grade: 0.15 }),
      obstacles: [slalom({ costume: 'rally-flag', from: 0.4, to: 0.7, count: 3, loss: 0.2 })],
    },
    {
      name: 'Pass road', shape: straight(80, { grade: 0.12 }), billboards: 1,
      obstacles: [slalom({ costume: 'rally-flag', from: 0.3, to: 0.6, count: 4, loss: 0.25 })],
    },
    {
      name: 'Canyon drop', shape: plunge(60, { grade: 0.34, from: 0.14 }), tunnel: 'canyon',
    },
    {
      name: 'Switchback curve', shape: sweep({ side: 'left', radius: 70, degrees: 190, grade: 0.13 }), billboards: 1,
      obstacles: [peg({ costume: 'rally-flag', at: 0.45, line: 'center' })],
    },
    {
      name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }),
      obstacles: [peg({ costume: 'rally-flag', at: 0.3, line: 'right' })],
    },
    { name: 'Lodge hairpin', shape: hairpin({ side: 'right' }), scenery: ['grandstand'] },
    {
      name: 'Valley esses', shape: sBends({ first: 'left', radius: 65, degrees: 80, grade: 0.15 }), billboards: 1,
      obstacles: [slalom({ costume: 'rally-flag', from: 0.4, to: 0.7, count: 3, loss: 0.2 })],
    },
    {
      name: 'Valley sweep', shape: sweep({ side: 'right', radius: 80, degrees: 100, grade: 0.12 }), billboards: 1,
      obstacles: [curtain({ costume: 'banner-gantry', at: 0.4, side: 'high' })],
    },
    {
      name: 'Home straight', shape: straight(90, { grade: 0.13 }), billboards: 1,
      features: [rumble({ from: 0.5, to: 0.85, count: 3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
