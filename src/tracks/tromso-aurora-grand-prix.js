'use strict';

// Tromsø Aurora Grand Prix: Holiday Season 2026 track (Grand Prix), Track of the Day on 1 December. The
// polar night in Tromsø under the northern lights: a floodlit snowy circuit down past the harbour's
// wooden houses, over the fjord bridge and down a half-pipe beneath it, round a white peaked church
// (architecture only) and a spiral by the water to the line. In the Holiday Season pass until it ends.
const { track, opening, plunge, straight, sBends, sweep, spiral, hairpin, halfPipe, runIn, swipe, slalom, rumble } = require('../trackKit');

module.exports = track({
  slug: 'tromso-aurora-grand-prix',
  name: 'Tromsø Aurora Grand Prix',
  season: 'holiday-2026',
  difficulty: 'extreme',
  description: 'The polar night in Tromsø under the northern lights: a floodlit snowy circuit past the harbour\'s wooden houses, over the fjord bridge, down a half-pipe beneath it and round a white peaked church to the line.',
  surface: 'ice',
  biome: 'arctic',
  lighting: 'night-northern-lights',
  variants: ['snow'],
  grandPrix: { crowd: 'fans', barrier: 'snow', groupsEvery: 600 },
  signature: 'Under the fjord bridge',
  billboardFrame: 'banner',
  tvCameras: [
    { section: 'Under the fjord bridge', at: 0.5, side: 'right', distance: 8, height: 14 },
    { section: 'Aurora spiral', at: 0.6, side: 'right', distance: 9, height: 9 },
  ],
  start: { landmark: 'lighthouse', gate: 'barrier', shots: { countdown: 'front', launch: 'overhead' } },
  finish: { landmark: 'harbour' },
  designChanges: [
    'The field threads down a peg drop at the gate (the varied starts: let go in waves, so no pile-up is needed).',
    'The fjord bridge is the straight before the half-pipe (the field races over it, then drops into the half-pipe beside its piers): the kit draws no bridge over a widened channel.',
    'The white peaked church is the generic church landmark (architecture only), standing on the outside of the Church sweep.',
  ],
  opening: opening('peg-drop', { costumes: { peg: 'ice-lantern' }, names: { plunge: 'Harbour peg drop' } }),
  sections: [
    { name: 'Wooden-house S-bends', shape: sBends({ first: 'right', radius: 60, degrees: 90, grade: 0.13 }), billboards: 2, scenery: ['wooden-houses'] },
    { name: 'Fjord bridge', shape: straight(45, { grade: 0.1 }), bridge: 'steel' },
    { name: 'Bridge drop', shape: plunge(60, { grade: 0.3, from: 0.1 }), obstacles: [slalom({ costume: 'ice-lantern', from: 0.2, to: 0.95, count: 6, loss: 0.3 })] },
    { name: 'Under the fjord bridge', shape: halfPipe({ first: 'left', width: 8, swings: 3, radius: 70, degrees: 30, grade: 0.12 }) },
    { name: 'Church sweep', shape: sweep({ side: 'right', radius: 80, degrees: 120, grade: 0.08 }), landmarks: [{ name: 'church', side: 'high', at: 0.5, distance: 26 }], billboards: 2 },
    {
      name: 'Storgata S-bends', shape: sBends({ first: 'left', radius: 70, degrees: 80, grade: 0.13 }), scenery: ['wooden-houses'],
      obstacles: [slalom({ costume: 'ice-lantern', from: 0.2, to: 0.8, count: 4, loss: 0.15 })],
    },
    { name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { name: 'Hairpin', shape: hairpin({ side: 'left' }), obstacles: [swipe({ costume: 'stag', side: 'high' })] },
    { name: 'Aurora spiral', shape: spiral({ side: 'right', radius: 48, turns: 1.1, grade: 0.16 }) },
    { name: 'Harbour run', shape: straight(75, { grade: 0.15 }), features: [rumble({ from: 0.6, to: 0.95, count: 4 })], billboards: 2, scenery: ['grandstand', 'wooden-houses'] },
    { name: 'Finish', shape: runIn(), scenery: ['grandstand'] },
  ],
});
