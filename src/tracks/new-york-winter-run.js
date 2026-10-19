'use strict';

// New York Winter Run: Holiday Season 2026 track (Grand Prix), Track of the Day on 27 December. A
// floodlit winter night among the skyscrapers: down an avenue, a box line between
// the avenues, past a sunken ice rink under a giant lit tree, round the towers and down the long
// avenue to the line. No named buildings, plazas or shops.
const { track, opening, straight, sBends, sweep, spiral, splitter, hairpin, plunge, runIn, peg, slalom, swipe, rumble, box, rail } = require('../trackKit');

module.exports = track({
  slug: 'new-york-winter-run',
  name: 'New York Winter Run',
  season: 'holiday-2026',
  difficulty: 'extreme',
  description: 'A floodlit winter night among the skyscrapers: down an avenue, a box line between the avenues, past a sunken ice rink under a giant lit tree, round the towers and down the long avenue to the line.',
  surface: 'snow',
  biome: 'city',
  lighting: 'night',
  variants: ['snow'],
  grandPrix: { crowd: 'fans', barrier: 'snow', groupsEvery: 600 },
  signature: 'Ice rink plaza',
  billboardFrame: 'led',
  tvCameras: [
    { section: 'Tower spiral', at: 0.5, side: 'left', distance: 9, height: 14 },
    { section: 'Run to the hairpin', at: 0.5, side: 'right', distance: 8, height: 14 },
  ],
  start: { landmark: 'ice-rink-tree', gate: 'barrier', shots: { countdown: 'front', launch: 'side' } },
  finish: { scenery: ['skyscrapers', 'grandstand'] },
  designChanges: [
    'A peg drop down the avenue between street lamps at the gate (the field let go in waves; the planned subway tunnel launch would start exactly like another track), then the box line across the ice rink plaza.',
    'The ice rink and its giant lit tree are a generic sunken rink in a plaza between towers; the skyscrapers are the kit\'s city towers. No named buildings, plazas or shops on anything drawn.',
  ],
  opening: opening('peg-drop', { costumes: { peg: 'street-lamp' }, names: { plunge: 'Down the avenue' } }),
  sections: [
    {
      name: 'Ice rink plaza', shape: straight(110, { grade: 0.11 }), scenery: ['skyscrapers'], billboards: 1,
      obstacles: [peg({ costume: 'street-lamp', at: 0.05, line: 'left' }), peg({ costume: 'street-lamp', at: 0.1, line: 'right' })],
      features: [box({ at: 0.2, length: 12 }), rail({ at: 0.55, length: 10 })],
      landmarks: [{ name: 'ice-rink-tree', side: 'right', at: 0.5, distance: 22 }],
    },
    { name: 'Tower spiral', shape: spiral({ side: 'left', radius: 50, turns: 1.1, grade: 0.16 }), around: 'twisted-tower' },
    { name: 'Park sweep', shape: sweep({ side: 'right', radius: 85, degrees: 90, grade: 0.09 }), billboards: 2, scenery: ['plane-trees'] },
    { name: 'Avenue straight', shape: straight(40, { grade: 0.12 }), obstacles: [peg({ costume: 'street-lamp', at: 0.2, line: 'center' }), peg({ costume: 'street-lamp', at: 0.45, line: 'left' }), peg({ costume: 'street-lamp', at: 0.7, line: 'right' })] },
    { name: 'Avenue bends', shape: sBends({ first: 'left', radius: 65, degrees: 65, grade: 0.12 }), scenery: ['skyscrapers'], billboards: 2 },
    { name: 'Run to the hairpin', shape: straight(45, { grade: 0.12 }), obstacles: [peg({ costume: 'street-lamp', at: 0.15, line: 'center' }), peg({ costume: 'street-lamp', at: 0.32, line: 'left' }), peg({ costume: 'street-lamp', at: 0.5, line: 'right' })] },
    { name: 'Hairpin', shape: hairpin({ side: 'right' }), obstacles: [swipe({ costume: 'camera-crane', side: 'high' })] },
    {
      name: 'River splitter', shape: splitter({ side: 'left', balance: { tipOffset: 0, left: { drag: 1.4, scrub: 1.4 }, right: { drag: 0.42, scrub: 0.72 } } }),
      around: 'big-rock',
    },
    { name: 'Long avenue', shape: straight(90, { grade: 0.14 }), scenery: ['skyscrapers', 'grandstand'], billboards: 1, obstacles: [peg({ costume: 'traffic-cone', at: 0.15, line: 'center' }), peg({ costume: 'traffic-cone', at: 0.3, line: 'left' })], features: [rumble({ from: 0.6, to: 0.95, count: 3 })] },
    { name: 'Finish', shape: runIn(), scenery: ['grandstand'] },
  ],
});
