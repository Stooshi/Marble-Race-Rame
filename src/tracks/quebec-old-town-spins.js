'use strict';

// Québec Old Town Spins: Holiday Season 2026 track (World Tour), Track of the Day on 5 December.
// A snowy night in the old walled town above the river: a peg drop between lantern posts at the
// gate, along the terrace under the castle-like hotel on its cliff, down a toboggan run beside the
// old toboggan slide, through the narrow stone lanes of the lower town, and round the river to the line.
const { track, opening, straight, sBends, sweep, halfPipe, hairpin, splitter, runIn, peg, slalom, swipe, rumble } = require('../trackKit');

module.exports = track({
  slug: 'quebec-old-town-spins',
  name: 'Québec Old Town Spins',
  season: 'holiday-2026',
  difficulty: 'extreme',
  description: 'A snowy night in Québec\'s old walled town: along the terrace under the castle-like hotel on its cliff, down a toboggan run beside the old slide, through the stone lanes of the lower town and round the frozen river to the line.',
  surface: 'snow',
  biome: 'city',
  lighting: 'night',
  variants: ['snow'],
  signature: 'Toboggan run',
  tvCameras: [
    { section: 'Toboggan run', at: 0.5, side: 'right', distance: 8, height: 14 },
    { section: 'River splitter', at: 0.6, side: 'right', distance: 10, height: 9 },
  ],
  start: { landmark: 'church', gate: 'barrier', shots: { countdown: 'chase', launch: 'overhead' } },
  finish: { landmark: 'harbour', scenery: ['frozen-lake'] },
  designChanges: [
    'The castle-like hotel stands on its cliff above the terrace (a generic grand hotel: brick, green copper roofs, turrets), the toboggan slide beside the Toboggan run, drawn as the half-pipe, as planned.',
    'The frozen river is the finish\'s frozen lake; the lower town is stone houses with lit windows. No names of real hotels, shops or streets on anything drawn.',
  ],
  opening: opening('peg-drop', { costumes: { peg: 'lantern-pole' }, names: { plunge: 'Ramparts peg drop' } }),
  sections: [
    {
      name: 'Terrace sweep', shape: sweep({ side: 'left', radius: 80, degrees: 100, grade: 0.1 }), billboards: 2,
      landmarks: [{ name: 'chateau-hotel', side: 'high', at: 0.5, distance: 40 }],
    },
    { name: 'To the slide', shape: straight(25, { grade: 0.12 }) },
    {
      name: 'Toboggan run', shape: halfPipe({ first: 'right', width: 8, swings: 3, radius: 70, degrees: 30, grade: 0.13 }),
      landmarks: [{ name: 'toboggan-slide', side: 'left', at: 0.5, distance: 22 }],
    },
    {
      name: 'Lower town lane', shape: straight(100, { grade: 0.11 }), scenery: ['stone-houses'],
      obstacles: [slalom({ costume: 'lantern-pole', from: 0.2, to: 0.8, count: 5, loss: 0.3 })],
    },
    { name: 'Old town S-bends', shape: sBends({ first: 'left', radius: 70, degrees: 90, grade: 0.11 }), scenery: ['stone-houses'], billboards: 2 },
    {
      name: 'River splitter', shape: splitter({ side: 'left', balance: { tipOffset: -0.8, left: { drag: 1.32, scrub: 1.32 }, right: { drag: 0.42, scrub: 0.72 } } }),
      around: 'big-rock',
    },
    { name: 'Run to the hairpin', shape: straight(45, { grade: 0.12 }), obstacles: [peg({ costume: 'lantern-pole', at: 0.3, line: 'left' }), peg({ costume: 'lantern-pole', at: 0.55, line: 'right' })] },
    { name: 'Hairpin', shape: hairpin({ side: 'right' }), obstacles: [swipe({ costume: 'camera-crane', side: 'high' })] },
    { name: 'Riverside run', shape: straight(120, { grade: 0.13 }), scenery: ['wooden-houses'], obstacles: [peg({ costume: 'lantern-pole', at: 0.15, line: 'center' }), peg({ costume: 'lantern-pole', at: 0.3, line: 'left' })], features: [rumble({ from: 0.6, to: 0.95, count: 3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
