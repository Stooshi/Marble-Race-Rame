'use strict';

// San Fernando Lantern Spins: Holiday Season 2026 track (Block Series), Track of the Day on 16 December.
// The giant lantern festival at night, in blocks: down from a block tower, a peg drop between cube pillars,
// a table top under giant star lanterns of glowing cubes, past the festival crowds and round the plaza to
// the line.
const { track, opening, straight, sBends, sweep, spiral, hairpin, plunge, runIn, peg, swipe, rumble, tableTop } = require('../trackKit');

module.exports = track({
  slug: 'san-fernando-lantern-spins',
  name: 'San Fernando Lantern Spins',
  season: 'holiday-2026',
  family: 'block',
  difficulty: 'extreme',
  description: 'The giant lantern festival at night, in blocks: a table top under giant star lanterns of glowing cubes, past the festival crowds and round the plaza to the line.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'night',
  block: { world: 'bonus' },
  coaster: { style: 'blocks', colours: { support: '#5a4a6a', rail: '#eef0f4', tie: '#2a2f36' } },
  signature: 'Lantern table top',
  start: { landmark: 'parol-lanterns', type: 'castle-tower', gate: 'stalls', shots: { countdown: 'above', launch: 'high-behind' } },
  finish: { landmark: 'parol-lanterns' },
  designChanges: [
    'The gate stands on top of a round tower (a new start type); a peg drop between cube pillars lets the field go in waves.',
    'The giant lanterns are star lanterns built of glowing cubes; the festival crowds are the bonus world\'s crowds. No names on anything drawn.',
  ],
  opening: opening('peg-drop', { costumes: { peg: 'cube-pillar' }, names: { plunge: 'Tower peg drop' }, dress: { plunge: { height: 0 } } }),
  sections: [
    { name: 'Plaza bends', shape: sBends({ first: 'left', radius: 65, degrees: 85, grade: 0.12 }), height: 0, billboards: 2 },
    {
      name: 'Lantern table top', shape: straight(125, { grade: 0.1 }), height: 0, billboards: 1,
      obstacles: [peg({ costume: 'cube-pillar', at: 0.04, line: 'left' }), peg({ costume: 'cube-pillar', at: 0.1, line: 'right' }), peg({ costume: 'cube-pillar', at: 0.16, line: 'center' })],
      features: [tableTop({ at: 0.3, length: 25, height: 0.3, down: 8 })], landmarks: [{ name: 'parol-lanterns', side: 'right', at: 0.5, distance: 26 }],
    },
    { name: 'Festival sweep', shape: sweep({ side: 'right', radius: 90, degrees: 140, grade: 0.075 }), height: 6, billboards: 2 },
    { name: 'Lantern spiral', shape: spiral({ side: 'left', radius: 50, turns: 1.1, grade: 0.15 }), height: 0, around: 'settling-stack' },
    { name: 'Run to the hairpin', shape: straight(45, { grade: 0.12 }), height: 0, obstacles: [peg({ costume: 'cube-pillar', at: 0.15, line: 'center' }), peg({ costume: 'cube-pillar', at: 0.32, line: 'left' }), peg({ costume: 'cube-pillar', at: 0.5, line: 'right' })] },
    { name: 'Hairpin', shape: hairpin({ side: 'right' }), height: 0, obstacles: [swipe({ costume: 'block-crane', side: 'high' })] },
    { name: 'Street drop', shape: plunge(50, { grade: 0.2, from: 0.1 }), height: 0, obstacles: [peg({ costume: 'cube-pillar', at: 0.4, line: 'left' }), peg({ costume: 'cube-pillar', at: 0.6, line: 'right' }), peg({ costume: 'cube-pillar', at: 0.8, line: 'center' })] },
    {
      name: 'Run to the line', shape: straight(110, { grade: 0.11 }), height: 0,
      obstacles: [peg({ costume: 'cube-pillar', at: 0.12, line: 'center' }), peg({ costume: 'cube-pillar', at: 0.24, line: 'left' }), peg({ costume: 'cube-pillar', at: 0.36, line: 'right' }), peg({ costume: 'cube-pillar', at: 0.48, line: 'center' })], features: [rumble({ from: 0.6, to: 0.95, count: 3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
