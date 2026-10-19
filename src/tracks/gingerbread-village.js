'use strict';

// Gingerbread Village: Holiday Season 2026 track (Winter Wonders), Track of the Day on 3 December.
// A snowy evening in a village baked of gingerbread: a clean drop at the gate, down the street of
// gingerbread houses over a table top of icing, round the lollipop sweep and the sugar spiral, a candy-cane slalom drop,
// the hairpin, the gumdrop bends and the run past gumdrop bumpers to the bakery at the line.
const { track, opening, straight, sBends, sweep, spiral, plunge, hairpin, runIn, peg, slalom, swipe, block, rumble, tableTop } = require('../trackKit');

module.exports = track({
  slug: 'gingerbread-village',
  name: 'Gingerbread Village',
  family: 'winter-wonders',
  season: 'holiday-2026',
  difficulty: 'extreme',
  description: 'A snowy evening in a village baked of gingerbread: over a table top of icing between gingerbread houses, round the lollipop trees, down a candy-cane slalom and past gumdrop bumpers to the line.',
  surface: 'snow',
  biome: 'arctic',
  lighting: 'sunset',
  variants: ['snow'],
  signature: 'Gingerbread street',
  tvCameras: [
    { section: 'Gingerbread street', at: 0.6, side: 'right', distance: 8, height: 14 },
    { section: 'Gumdrop bends', at: 0.5, side: 'left', distance: 8, height: 14 },
  ],
  start: { landmark: 'candy-trees', gate: 'paddle', shots: { countdown: 'front', launch: 'look-back' } },
  finish: { landmark: 'gingerbread-houses' },
  designChanges: [
    'The village is ours: gingerbread houses with thick icing on the eaves and sweets on the walls, lollipop trees and giant candy canes along the street. Candy canes are the slalom poles and pegs, gumdrops the bumpers: only looks, racing exactly like the kit\'s poles, pegs and blocks.',
  ],
  opening: opening('clean-drop', { side: 'right', names: { plunge: 'Icing drop', bends: 'Candy lane bends' } }),
  sections: [
    {
      name: 'Gingerbread street', shape: straight(100, { grade: 0.11 }), billboards: 1,
      features: [tableTop({ at: 0.3, length: 25, height: 0.3, down: 8 })],
      landmarks: [{ name: 'gingerbread-houses', side: 'left', at: 0.5, distance: 14 }],
    },
    {
      name: 'Lollipop sweep', shape: sweep({ side: 'left', radius: 85, degrees: 110, grade: 0.09 }), billboards: 2,
      landmarks: [{ name: 'candy-trees', side: 'high', at: 0.5, distance: 24 }],
    },
    { name: 'Sugar spiral', shape: spiral({ side: 'right', radius: 50, turns: 0.75, grade: 0.13 }) },
    { name: 'Candy-cane drop', shape: plunge(50, { grade: 0.2, from: 0.1 }), obstacles: [slalom({ costume: 'candy-cane', from: 0.35, to: 0.95, count: 5, loss: 0.2 })] },
    {
      name: 'Run to the hairpin', shape: straight(45, { grade: 0.11 }),
      obstacles: [peg({ costume: 'candy-cane', at: 0.2, line: 'center' }), peg({ costume: 'candy-cane', at: 0.45, line: 'left' }), peg({ costume: 'candy-cane', at: 0.7, line: 'right' })],
    },
    { name: 'Hairpin', shape: hairpin({ side: 'right' }), obstacles: [swipe({ costume: 'stag', side: 'high' })] },
    { name: 'Gumdrop bends', shape: sBends({ first: 'left', radius: 70, degrees: 80, grade: 0.11 }), billboards: 1, obstacles: [slalom({ costume: 'candy-cane', from: 0.2, to: 0.8, count: 4, loss: 0.15 })] },
    {
      name: 'Run to the bakery', shape: straight(100, { grade: 0.12 }),
      obstacles: [block({ costume: 'gumdrop', at: 0.12, line: 'right' }), peg({ costume: 'candy-cane', at: 0.3, line: 'left' }), peg({ costume: 'candy-cane', at: 0.45, line: 'center' })],
      features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
      landmarks: [{ name: 'candy-trees', side: 'right', at: 0.5, distance: 14 }],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
