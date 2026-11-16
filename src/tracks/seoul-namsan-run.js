'use strict';

// Seoul Namsan Run (Moses, 16 Nov 2026: ten more Coasters tracks; one of the four Wild ones). A coaster through Seoul:
// from an observation tower on the mountain in the middle of the city, through the chicane past the palace halls,
// the big feature: a splitter round a pagoda on the hill, one channel each side, then over the river under the
// cable-stayed bridge, the lantern-lit market streets, the hairpin and the run down to the palace gate.
// No names on anything.
const { track, opening, straight, sweep, sBends, hairpin, splitter, plunge, runIn, peg, slalom, block, moguls, brake } = require('../trackKit');

module.exports = track({
  slug: 'seoul-namsan-run',
  name: 'Seoul Namsan Run',
  family: 'coaster',
  difficulty: 'wild',
  description: 'A coaster through Seoul: down from the tower on the mountain in the middle of the city, past the palace halls, round a hilltop pagoda one side or the other, over the river under the great bridge and through the lantern-lit market streets to the palace gate.',
  surface: 'ice',
  biome: 'city',
  lighting: 'night',
  variants: ['sunset'],
  coaster: { height: 18, colours: { support: '#2a2f3a', rail: '#e94a5a', tie: '#1a1d24' } },
  signature: 'Round the pagoda',
  tvCameras: [
    // (Where the two channels meet again past the pagoda, looking back at both.)
    { section: 'Round the pagoda', at: 0.95, side: 'left', distance: 10, height: 14 },
    { section: 'Down the steps', at: 0.5, side: 'right', distance: 10, height: 10 },
  ],
  start: { landmark: 'tv-tower', scenery: ['skyscrapers'], type: 'observation-tower', gate: 'barrier', shots: { countdown: 'low-front', launch: 'look-back' } },
  finish: { landmark: 'wudian-hall', billboards: 1 },
  opening: opening('chicane-start', {
    side: 'left',
    costumes: { block: 'stone-lion', slalom: 'lantern-pole' },
    dress: {},
  }),
  sections: [
    {
      name: 'Past the palace halls', shape: straight(70, { grade: 0.13 }), height: 16, billboards: 2,
      landmarks: [{ name: 'wudian-hall', at: 0.5, side: 'left', distance: 34 }],
      features: [moguls({ from: 0.55, to: 0.85, count: 3 })],
    },
    {
      name: 'Round the pagoda',
      shape: splitter({ side: 'left', degrees: 0, approach: 60, merge: 30, balance: { tipOffset: -0.6, left: { drag: 1.3, scrub: 1.3 }, right: { drag: 2.3, scrub: 2.3 } } }),
      around: 'pagoda', height: 20,
      obstacles: [peg({ costume: 'lantern-pole', at: 0.06, line: 'right' }), peg({ costume: 'lantern-pole', at: 0.14, line: 'left' })],
    },
    { name: 'Off the hill', shape: plunge(50, { grade: 0.3, from: 0.14 }), height: 10 },
    {
      name: 'Over the river', shape: straight(80, { grade: 0.12 }), height: 22, water: true, overhead: ['cable-stayed-bridge'], billboards: 2,
      obstacles: [slalom({ costume: 'lantern-pole', from: 0.4, to: 0.85, count: 4, loss: 0.25 })],
      features: [moguls({ from: 0.15, to: 0.35, count: 3 })],
    },
    {
      name: 'Market lanes', shape: sBends({ first: 'right', radius: 65, degrees: 70, grade: 0.15 }), height: 8,
      landmarks: [{ name: 'lantern-row', at: 0.5, side: 'left', distance: 22 }],
      obstacles: [peg({ costume: 'lantern-pole', at: 0.3, line: 'center' }), peg({ costume: 'lantern-pole', at: 0.7, line: 'right' })],
    },
        {
      name: 'Night market', shape: sweep({ side: 'right', radius: 80, degrees: 60, grade: 0.13 }), height: 6,
      obstacles: [peg({ costume: 'lantern-pole', at: 0.35, line: 'left' }), peg({ costume: 'lantern-pole', at: 0.7, line: 'right' })],
    },
    { name: 'To the hairpin', shape: straight(55, { grade: 0.13 }), height: 8, obstacles: [block({ costume: 'stone-lion', at: 0.65, line: 'center' })], features: [brake({ at: 0.05, length: 12, drag: 0.02 })] },
    { name: 'Temple hairpin', shape: hairpin({ side: 'left' }), height: 10 },
    {
      name: 'Down the steps', shape: sBends({ first: 'left', radius: 70, degrees: 55, grade: 0.14 }), height: 4,
      obstacles: [peg({ costume: 'lantern-pole', at: 0.4, line: 'center' })],
    },
    {
      name: 'Run to the palace gate', shape: straight(70, { grade: 0.15 }), height: 0, billboards: 1,
      obstacles: [slalom({ costume: 'lantern-pole', from: 0.35, to: 0.8, count: 3, loss: 0.3 })],
    },
    { name: 'Finish', shape: runIn(), height: 0 },
  ],
});
