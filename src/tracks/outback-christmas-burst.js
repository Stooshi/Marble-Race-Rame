'use strict';

// Outback Christmas Burst: Holiday Season 2026 track (Canyons), Track of the Day on 6 December.
// Christmas in the Australian summer: down into a red desert gorge, a jib line along its dry floor
// past a mob of kangaroos, through the red rock meanders, out over the ridge and back in, to a lone
// homestead hung with Christmas lights at the gorge's mouth.
const { track, opening, straight, sBends, sweep, hairpin, plunge, runIn, slalom, swipe, peg, rumble, jibLine } = require('../trackKit');

module.exports = track({
  slug: 'outback-christmas-burst',
  name: 'Outback Christmas Burst',
  season: 'holiday-2026',
  family: 'canyon',
  difficulty: 'extreme',
  description: 'Christmas in the Australian summer: into a red desert gorge, a jib line along its dry floor past a mob of kangaroos, through the red rock meanders and over the ridge, to a lone homestead hung with Christmas lights.',
  surface: 'ice',
  biome: 'desert',
  lighting: 'day',
  canyon: { palette: 'namib', depth: 34, river: 'right' },
  coaster: { colours: { support: '#8a5a3a', rail: '#f2ede2', tie: '#4a3a2e' } },
  signature: 'Gorge floor jib line',
  start: { landmark: 'kangaroo-mob', scenery: ['rocks'], type: 'rooftop', gate: 'barrier', shots: { countdown: 'chase', launch: 'look-back' } },
  finish: { landmark: 'outback-homestead' },
  designChanges: [
    'A pipe drop at the gate (the field let go in waves into a half-pipe down the gorge wall), then the jib line along the dry gorge floor, as planned.',
    'The gate stands on a rooftop start (the start types for canyons are spread so no more than two share one; the others are taken), the kangaroos below it.',
    'The red rock is the desert canyon palette; the kangaroos stand at the start and on the gorge floor, the homestead with its Christmas lights past the line.',
  ],
  opening: opening('pipe-drop', {
    side: 'left',
    names: { plunge: 'Rim drop', pipe: 'Gorge wall half-pipe' },
    dress: { plunge: { height: 0 }, pipe: { height: 0 } },
  }),
  sections: [
    {
      name: 'Gorge floor jib line', shape: straight(120, { grade: 0.1 }), height: 0, billboards: 1,
      features: [jibLine({ from: 0.15 })], landmarks: [{ name: 'kangaroo-mob', side: 'right', at: 0.6, distance: 9 }],
    },
    { name: 'Red rock meanders', shape: sBends({ first: 'left', radius: 55, degrees: 90, grade: 0.13 }), height: 0, billboards: 1, obstacles: [slalom({ costume: 'cairn', from: 0.2, to: 0.8, count: 5, loss: 0.3 })] },
    { name: 'Over the ridge', shape: sweep({ side: 'right', radius: 85, degrees: 120, grade: 0.09 }), height: 24, billboards: 2 },
    { name: 'Drop back in', shape: plunge(45, { grade: 0.2, from: 0.1 }), height: 0, obstacles: [slalom({ costume: 'cairn', from: 0.3, to: 0.95, count: 5, loss: 0.3 })] },
    { name: 'Dry creek bends', shape: sBends({ first: 'right', radius: 65, degrees: 80, grade: 0.11 }), height: 0 },
    { name: 'Run to the hairpin', shape: straight(45, { grade: 0.12 }), height: 0, obstacles: [peg({ costume: 'cairn', at: 0.25, line: 'left' }), peg({ costume: 'cairn', at: 0.45, line: 'right' })] },
    { name: 'Eagle hairpin', shape: hairpin({ side: 'left' }), height: 0, obstacles: [swipe({ costume: 'falcon', side: 'high' })] },
    { name: 'Homestead bend', shape: sweep({ side: 'right', radius: 80, degrees: 80, grade: 0.09 }), height: 0, billboards: 1 },
    {
      name: 'Run to the homestead', shape: straight(90, { grade: 0.13 }), height: 0,
      obstacles: [peg({ costume: 'cairn', at: 0.15, line: 'center' }), peg({ costume: 'cairn', at: 0.3, line: 'left' }), peg({ costume: 'cairn', at: 0.45, line: 'right' })], features: [rumble({ from: 0.6, to: 0.95, count: 3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
