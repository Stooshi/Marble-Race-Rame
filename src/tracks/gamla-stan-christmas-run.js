'use strict';

// Gamla Stan Christmas Run: Holiday Season 2026 track (World Tour), Track of the Day on Christmas Eve.
// Stockholm's old town at three in the afternoon on Christmas Eve, the dusk already falling with the
// snow: a peg drop between lantern posts at the gate, a box line down a narrow lane, the Christmas
// market on the old square among red and ochre gabled houses, round the church spiral and along the water.
const { track, opening, climb, straight, sBends, spiral, hairpin, plunge, runIn, peg, slalom, swipe, box, rail, rumble } = require('../trackKit');

module.exports = track({
  slug: 'gamla-stan-christmas-run',
  name: 'Gamla Stan Christmas Run',
  season: 'holiday-2026',
  difficulty: 'extreme',
  description: 'Christmas Eve in Stockholm\'s old town, the dusk falling with the snow at three: past the Christmas market on the old square, down a narrow lane of red and ochre gabled houses with candles in every window, to the church by the water.',
  surface: 'snow',
  biome: 'city',
  lighting: 'snow',
  variants: ['sunset'],
  signature: 'Market square',
  tvCameras: [
    { section: 'Market square', at: 0.5, side: 'left', distance: 8, height: 14 },
    { section: 'Church spiral', at: 0.5, side: 'right', distance: 8, height: 14 },
  ],
  start: { landmark: 'church', gate: 'paddle', shots: { countdown: 'above', launch: 'look-back' } },
  finish: { landmark: 'steamboats' },
  designChanges: [
    'A peg drop at the gate (lantern posts; the field let go in waves) rather than the planned clean drop: with the clean drop the field spread out and raced too few overtakes (45 a race, the target is 60); with the peg drop 61.',
    'The box line (a rail and a box) is down the Narrow lane, as planned; the slalom of lantern posts on the Lane drop after the hairpin adds the rest of the luck.',
    'The market stalls, the gabled houses and the candles in the windows are the city scenery (market stalls, colourful houses; their windows lit in the snowy dusk). No names of real shops or stalls.',
  ],
  opening: opening('peg-drop', { costumes: { peg: 'lantern-pole' }, names: { plunge: 'Slussen peg drop' } }),
  sections: [
    {
      name: 'Narrow lane', shape: straight(110, { grade: 0.13 }), scenery: ['colourful-houses'], billboards: 1,
      features: [rail({ at: 0.15, length: 10 }), box({ at: 0.45, length: 12 })],
    },
    { name: 'Market square', shape: sBends({ first: 'right', radius: 65, degrees: 95, grade: 0.11 }), billboards: 2, scenery: ['market-stalls', 'colourful-houses'], figures: ['spectator', 'spectator'] },
    { name: 'Over the palace hill', shape: climb(30) },
    { name: 'Palace bends', shape: sBends({ first: 'left', radius: 70, degrees: 70, grade: 0.12 }), billboards: 2, scenery: ['stone-houses'] },
    { name: 'Church spiral', shape: spiral({ side: 'left', radius: 46, turns: 1.05, grade: 0.17 }), around: 'bell-tower' },
    { name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), obstacles: [peg({ costume: 'lantern-pole', at: 0.25, line: 'left' }), peg({ costume: 'lantern-pole', at: 0.45, line: 'right' })] },
    { name: 'Hairpin', shape: hairpin({ side: 'right' }), obstacles: [swipe({ costume: 'stag', side: 'high' })] },
    { name: 'Lane drop', shape: plunge(70, { grade: 0.3, from: 0.1 }), obstacles: [slalom({ costume: 'lantern-pole', from: 0.2, to: 0.95, count: 5, loss: 0.3 })] },
    { name: 'Waterfront run', shape: straight(95, { grade: 0.15 }), obstacles: [peg({ costume: 'lantern-pole', at: 0.15, line: 'center' }), peg({ costume: 'lantern-pole', at: 0.3, line: 'left' }), peg({ costume: 'lantern-pole', at: 0.45, line: 'right' })], features: [rumble({ from: 0.65, to: 0.95, count: 3 })], scenery: ['stone-houses'] },
    { name: 'Finish', shape: runIn() },
  ],
});
