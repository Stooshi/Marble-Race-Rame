'use strict';

// Harbin Ice City: Holiday Season 2026 track (Coasters), Track of the Day on Christmas Day. A frozen
// night among huge castles of ice lit blue, red, green and gold: down from an ice tower, a half-pipe of ice through the castles, the snow sculptures and the frozen
// river, and back past the glowing towers to the line.
const { track, opening, straight, sBends, sweep, spiral, halfPipe, hairpin, plunge, runIn, slalom, swipe, peg, rumble, boost } = require('../trackKit');

module.exports = track({
  slug: 'harbin-ice-city',
  name: 'Harbin Ice City',
  season: 'holiday-2026',
  family: 'coaster',
  difficulty: 'extreme',
  description: 'A frozen night among huge castles of ice lit blue, red, green and gold: a half-pipe of ice through the castles, past the snow sculptures and over the frozen river, and back past the glowing towers to the line.',
  surface: 'ice',
  biome: 'arctic',
  lighting: 'night',
  coaster: { height: 16, colours: { support: '#cfe6f4', rail: '#5ab8ff', tie: '#2a3a5a' } },
  signature: 'Ice castle half-pipe',
  tvCameras: [
    { section: 'Ice castle half-pipe', at: 0.9, side: 'right', distance: 6, height: 12 },
    { section: 'Tower spin', at: 0.8, side: 'left', distance: 10, height: 12 },
  ],
  start: { landmark: 'ice-castles', scenery: ['birches'], type: 'castle-tower', gate: 'stalls', shots: { countdown: 'front', launch: 'high-behind' } },
  finish: { landmark: 'ice-castles' },
  designChanges: [
    'The gate stands on top of a great round tower of ice (a new start type), and a peg drop between ice lanterns lets the field go in waves, rather than the planned pipe drop, which leaves the field too spread out for its overtakes.',
    'The ice castles are generic castles of ice blocks, lit from within in colours; the snow sculptures are generic carved shapes. No names on anything drawn.',
  ],
  opening: opening('peg-drop', { costumes: { peg: 'ice-lantern' }, names: { plunge: 'Ice lantern peg drop' }, dress: { plunge: { height: 8 } } }),
  sections: [
    { name: 'Tower spin', shape: spiral({ side: 'right', radius: 52, turns: 1.3, grade: 0.15 }), height: 12, around: 'clocktower' },
    { name: 'Sculpture bends', shape: sBends({ first: 'right', radius: 70, degrees: 80, grade: 0.12 }), height: 10, billboards: 2, landmarks: [{ name: 'snow-sculptures', side: 'left', at: 0.5, distance: 26 }], obstacles: [slalom({ costume: 'ice-lantern', from: 0.2, to: 0.8, count: 4, loss: 0.2 })] },
    { name: 'To the castles', shape: straight(40, { grade: 0.11 }), height: 4 },
    {
      name: 'Ice castle half-pipe', shape: halfPipe({ first: 'left', width: 8, swings: 3, radius: 70, degrees: 30, grade: 0.12 }), height: 0,
      landmarks: [{ name: 'ice-castles', side: 'right', at: 0.5, distance: 30 }],
    },
    { name: 'Frozen river sweep', shape: sweep({ side: 'left', radius: 90, degrees: 160, grade: 0.08 }), height: 16, billboards: 2, scenery: ['frozen-lake'] },
    { name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), height: 6, billboards: 1, obstacles: [peg({ costume: 'ice-lantern', at: 0.15, line: 'center' }), peg({ costume: 'ice-lantern', at: 0.32, line: 'left' }), peg({ costume: 'ice-lantern', at: 0.5, line: 'right' })] },
    { name: 'Hairpin', shape: hairpin({ side: 'left' }), height: 8, obstacles: [swipe({ costume: 'snow-troll', side: 'high' })] },
    {
      name: 'Glowing towers run', shape: straight(110, { grade: 0.12 }), height: 3,
      obstacles: [slalom({ costume: 'ice-lantern', from: 0.1, to: 0.45, count: 4, loss: 0.3 })], features: [rumble({ from: 0.6, to: 0.95, count: 3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
