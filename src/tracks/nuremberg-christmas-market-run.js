'use strict';

// Nuremberg Christmas Market Run: Holiday Season 2026 track (World Tour), Track of the Day on 26 December.
// The old town at the blue hour with snow falling: down the castle hill's bowl, through the lanes of
// half-timbered houses, a table top across the market square between the red-and-white stalls and the
// gingerbread stands, round the Gothic church front, over the river and through the old town to the line.
const { track, opening, straight, sBends, sweep, hairpin, runIn, peg, slalom, swipe, rumble, tableTop, curtain } = require('../trackKit');

module.exports = track({
  slug: 'nuremberg-christmas-market-run',
  name: 'Nuremberg Christmas Market Run',
  season: 'holiday-2026',
  difficulty: 'extreme',
  description: 'The old town at the blue hour with snow falling: down the castle hill, a table top across the Christmas market between the red-and-white stalls and the gingerbread stands, round a Gothic church front and over the river to the line.',
  surface: 'snow',
  biome: 'city',
  lighting: 'snow',
  variants: ['sunset'],
  signature: 'Market square',
  tvCameras: [
    { section: 'Church sweep', at: 0.5, side: 'left', distance: 8, height: 14 },
    { section: 'Half-timbered bends', at: 0.5, side: 'right', distance: 8, height: 14 },
  ],
  start: { landmark: 'castle-keep', gate: 'paddle', shots: { countdown: 'front', launch: 'high-behind' } },
  finish: { landmark: 'gothic-church-front', scenery: ['market-stalls'] },
  designChanges: [
    'No splitter: no setting gave its smaller channel a real share (30–70%) and passed the fairness checks, so bends under a banner gantry take its place (Moses: every splitter under 30%, 19 Oct).',
    'A plunge down the castle hill into a steep banked bend at the gate (barrels and a slalom of lanterns) rather than the planned peg drop: two World Tour tracks already open with a peg drop, the most one opening may have.',
    'The Gothic church front is a generic red sandstone church (two spired towers, a rose window), beside the Church sweep and again past the line; the gingerbread stands and the market stalls line the Market square. No names of real stalls or shops.',
  ],
  opening: opening('banked-turn', { side: 'right', costumes: { block: 'barrel', slalom: 'lantern-pole' }, names: { plunge: 'Castle hill drop', turn: 'Castle bend' } }),
  sections: [
    {
      name: 'Market square', shape: straight(90, { grade: 0.11 }), scenery: ['market-stalls'], billboards: 1,
      features: [tableTop({ at: 0.3, length: 25, height: 0.3, down: 8 })],
      landmarks: [{ name: 'gingerbread-stands', side: 'left', at: 0.5, distance: 12 }],
    },
    { name: 'Castle lane bends', shape: sBends({ first: 'left', radius: 60, degrees: 60, grade: 0.13 }), scenery: ['stone-houses'], billboards: 2 },
    {
      name: 'Church sweep', shape: sweep({ side: 'left', radius: 80, degrees: 110, grade: 0.09 }), billboards: 2,
      landmarks: [{ name: 'gothic-church-front', side: 'high', at: 0.5, distance: 30 }],
    },
    { name: 'River bends', shape: sBends({ first: 'left', radius: 70, degrees: 70, grade: 0.12 }), obstacles: [curtain({ costume: 'banner-gantry', at: 0.5, side: 'right' })] },
    { name: 'Run to the hairpin', shape: straight(45, { grade: 0.12 }), obstacles: [peg({ costume: 'lantern-pole', at: 0.25, line: 'left' }), peg({ costume: 'lantern-pole', at: 0.5, line: 'right' })] },
    { name: 'Hairpin', shape: hairpin({ side: 'left' }), obstacles: [swipe({ costume: 'street-sign', side: 'high' })] },
    { name: 'Half-timbered bends', shape: sBends({ first: 'left', radius: 70, degrees: 75, grade: 0.12 }), scenery: ['merchant-houses'], obstacles: [slalom({ costume: 'lantern-pole', from: 0.2, to: 0.8, count: 4, loss: 0.2 })] },
    { name: 'Old town run', shape: straight(85, { grade: 0.14 }), scenery: ['stone-houses'], obstacles: [peg({ costume: 'lantern-pole', at: 0.15, line: 'center' }), peg({ costume: 'lantern-pole', at: 0.3, line: 'right' })], features: [rumble({ from: 0.6, to: 0.95, count: 3 })] },
    { name: 'Finish', shape: runIn(), scenery: ['market-stalls'] },
  ],
});
