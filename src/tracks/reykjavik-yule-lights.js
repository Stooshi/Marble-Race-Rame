'use strict';

// Reykjavik Yule Lights: Holiday Season 2026 track (Block Series), Track of the Day on 13 December. A
// polar evening in a snowy town of blocks under the northern lights: down from a block lighthouse, a peg
// drop between cube pillars, a jib line down the harbour street past coloured block houses with candles
// in their windows, round the bay and back up the hill to the line.
const { track, opening, straight, sBends, sweep, spiral, hairpin, plunge, runIn, peg, swipe, rumble, jibLine } = require('../trackKit');

module.exports = track({
  slug: 'reykjavik-yule-lights',
  name: 'Reykjavik Yule Lights',
  season: 'holiday-2026',
  family: 'block',
  difficulty: 'extreme',
  description: 'A polar evening in a snowy town of blocks under the northern lights: a jib line down the harbour street past coloured block houses with candles in their windows, round the bay and back to the line.',
  surface: 'snow',
  biome: 'arctic',
  lighting: 'night-northern-lights',
  block: { world: 'snow' },
  coaster: { style: 'blocks', colours: { support: '#d8dee6', rail: '#eef0f4', tie: '#2a2f36' } },
  signature: 'Harbour street jib line',
  tvCameras: [
    { section: 'Church hill spiral', at: 0.8, side: 'right', distance: 10, height: 12 },
    { section: 'Hairpin', at: 0.4, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'block-lighthouse', type: 'lighthouse', gate: 'paddle', shots: { countdown: 'front', launch: 'overhead' } },
  finish: { landmark: 'harbour-office' },
  designChanges: [
    'The gate stands on the gallery of a lighthouse (a new start type) beside a block lighthouse; a peg drop between cube pillars lets the field go in waves.',
    'The coloured block houses with candles in their windows are the cube cottages, lit in the evening; the northern lights are the sky. No names on anything drawn.',
  ],
  opening: opening('peg-drop', { costumes: { peg: 'cube-pillar' }, names: { plunge: 'Lighthouse peg drop' }, dress: { plunge: { height: 0 } } }),
  sections: [
    {
      name: 'Harbour street jib line', shape: straight(120, { grade: 0.09 }), height: 0, billboards: 1,
      obstacles: [peg({ costume: 'cube-pillar', at: 0.05, line: 'center' })],
      features: [jibLine({ from: 0.15 })], landmarks: [{ name: 'cube-cottage', side: 'left', at: 0.3, distance: 12 }, { name: 'cube-cottage', side: 'right', at: 0.7, distance: 12 }],
    },
    { name: 'Bay sweep', shape: sweep({ side: 'right', radius: 90, degrees: 140, grade: 0.075 }), height: 6, water: true, billboards: 2, landmarks: [{ name: 'block-boats', side: 'left', at: 0.5, distance: 12 }] },
    { name: 'Run to the hairpin', shape: straight(45, { grade: 0.12 }), height: 0, obstacles: [peg({ costume: 'cube-pillar', at: 0.15, line: 'center' }), peg({ costume: 'cube-pillar', at: 0.32, line: 'left' }), peg({ costume: 'cube-pillar', at: 0.5, line: 'right' })] },
    { name: 'Hairpin', shape: hairpin({ side: 'left' }), height: 0, obstacles: [swipe({ costume: 'block-crane', side: 'high' })] },
    { name: 'Church hill spiral', shape: spiral({ side: 'left', radius: 50, turns: 1.1, grade: 0.15 }), height: 0, around: 'settling-stack' },
    { name: 'Hill drop', shape: plunge(50, { grade: 0.2, from: 0.1 }), height: 0, obstacles: [peg({ costume: 'cube-pillar', at: 0.4, line: 'left' }), peg({ costume: 'cube-pillar', at: 0.6, line: 'right' }), peg({ costume: 'cube-pillar', at: 0.8, line: 'center' })] },
    { name: 'Coloured house bends', shape: sBends({ first: 'right', radius: 65, degrees: 80, grade: 0.12 }), height: 0, billboards: 2, landmarks: [{ name: 'cube-cabin', side: 'left', at: 0.5, distance: 12 }] },
    {
      name: 'Run to the office', shape: straight(100, { grade: 0.11 }), height: 0,
      obstacles: [peg({ costume: 'cube-pillar', at: 0.12, line: 'center' }), peg({ costume: 'cube-pillar', at: 0.24, line: 'left' }), peg({ costume: 'cube-pillar', at: 0.36, line: 'right' })], features: [rumble({ from: 0.6, to: 0.95, count: 3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
