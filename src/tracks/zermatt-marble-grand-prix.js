'use strict';

// Zermatt Marble Grand Prix: Holiday Season 2026 track (Grand Prix), Track of the Day on 8 December.
// A car-free Alpine village at dusk, the pyramid peak above it lit pink by the last sun: down from the
// station through the chalets, a table top along the village street past the horse sleighs, over the
// river and round the church to a floodlit finish. In the Holiday Season pass until it ends.
const { track, opening, peg, straight, sBends, sweep, spiral, hairpin, runIn, slalom, swipe, curtain, tableTop, rumble } = require('../trackKit');

module.exports = track({
  slug: 'zermatt-marble-grand-prix',
  name: 'Zermatt Marble Grand Prix',
  season: 'holiday-2026',
  difficulty: 'extreme',
  description: 'A car-free Alpine village at dusk, the pyramid peak above it lit pink by the last sun: through the chalets, along the village street past the horse sleighs, over the river and round the church to a floodlit finish.',
  surface: 'snow',
  biome: 'alpine',
  lighting: 'sunset',
  variants: ['snow'],
  grandPrix: { crowd: 'villagers', barrier: 'snow', groupsEvery: 650 },
  signature: 'Village street',
  billboardFrame: 'wood',
  tvCameras: [
    { section: 'Chalet S-bends', at: 0.5, side: 'left', distance: 8, height: 14 },
    { section: 'Meadow sweep', at: 0.5, side: 'right', distance: 8, height: 14 },
  ],
  start: { landmark: 'lift-station', gate: 'stalls', shots: { countdown: 'side', launch: 'look-back' } },
  finish: { landmark: 'church' },
  designChanges: [
    'No splitter: no setting gave its smaller channel a real share (30–70%) and passed the fairness checks, so bends under a banner gantry take its place (Moses: every splitter under 30%, 19 Oct).',
    'The staggered drop at the gate lets the field go in waves past a snowball pile-up and a slalom of lanterns, then it races the village street past the horse sleighs.',
    'The pyramid peak is the alpine skyline at sunset (no named mountain model); the village is chalets, with horse sleighs standing along the street.',
  ],
  opening: opening('staggered-drop', { costumes: { block: 'giant-snowball', slalom: 'ice-lantern' }, names: { plunge: 'Station drop' } }),
  sections: [
    {
      name: 'Village street', shape: straight(80, { grade: 0.12 }), scenery: ['chalets'],
      features: [tableTop({ at: 0.35, length: 24, height: 0.3, down: 8 })],
      landmarks: [{ name: 'horse-sleigh', side: 'left', at: 0.2, distance: 8 }, { name: 'horse-sleigh', side: 'right', at: 0.75, distance: 8 }],
    },
    { name: 'Church spiral', shape: spiral({ side: 'left', radius: 46, turns: 1, grade: 0.17 }), around: 'bell-tower' },
    { name: 'Chalet S-bends', shape: sBends({ first: 'right', radius: 65, degrees: 90, grade: 0.13 }), billboards: 2, scenery: ['chalets'], obstacles: [slalom({ costume: 'ice-lantern', from: 0.2, to: 0.8, count: 5, loss: 0.3 })] },
    { name: 'River bends', shape: sBends({ first: 'left', radius: 70, degrees: 70, grade: 0.12 }), obstacles: [curtain({ costume: 'banner-gantry', at: 0.5, side: 'right' })] },
    { name: 'Run to the hairpin', shape: straight(40, { grade: 0.12 }), obstacles: [peg({ costume: 'ice-lantern', at: 0.25, line: 'left' }), peg({ costume: 'ice-lantern', at: 0.5, line: 'right' })] },
    { name: 'Hairpin', shape: hairpin({ side: 'left' }), obstacles: [swipe({ costume: 'camera-crane', side: 'high' })] },
    { name: 'Meadow sweep', shape: sweep({ side: 'right', radius: 85, degrees: 95, grade: 0.09 }), billboards: 2, scenery: ['pines'], obstacles: [curtain({ costume: 'banner-gantry', at: 0.5, side: 'left' })] },
    { name: 'Floodlit run', shape: straight(60, { grade: 0.15 }), obstacles: [slalom({ costume: 'traffic-cone', from: 0.1, to: 0.45, count: 4, loss: 0.3 })], features: [rumble({ from: 0.55, to: 0.95, count: 3 })], scenery: ['grandstand'] },
    { name: 'Finish', shape: runIn(), scenery: ['grandstand'] },
  ],
});
