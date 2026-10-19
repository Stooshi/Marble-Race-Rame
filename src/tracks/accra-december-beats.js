'use strict';

// Accra December Beats: Holiday Season 2026 track (Track and Field), Track of the Day on 9 December.
// A summer evening under the floodlights: down into a banked turn, past drummers and dancers outside
// the stadium, round the hairpin and a spiral, then a lap of the stadium in kente colours and a table
// top on the home straight, the beach beyond. No team or league names.
const { track, opening, straight, sweep, spiral, hairpin, plunge, runIn, peg, slalom, rumble, tableTop, boost } = require('../trackKit');

module.exports = track({
  slug: 'accra-december-beats',
  name: 'Accra December Beats',
  season: 'holiday-2026',
  family: 'athletics',
  difficulty: 'extreme',
  description: 'A summer December evening under the floodlights: past drummers and dancers outside the stadium, round the hairpin and a spiral, a lap of the stadium in kente colours and a table top on the home straight, the beach beyond.',
  surface: 'tartan',
  biome: 'meadow',
  lighting: 'sunset',
  variants: ['night'],
  athletics: { stadium: 'accra', lanes: 'red' },
  coaster: { style: 'concrete', colours: { support: '#6a6058', rail: '#f4f1ea', tie: '#8d3b30' } },
  signature: 'The kente lap',
  tvCameras: [
    { section: 'Drummers sweep', at: 0.5, side: 'left', distance: 8, height: 12 },
    { section: 'The kente lap', at: 0.5, side: 'right', distance: 8, height: 12 },
  ],
  start: { landmark: 'drum-circle', scenery: ['palms'], type: 'curving-lift', gate: 'stalls', shots: { countdown: 'above', launch: 'look-back' } },
  finish: { scenery: ['palms'] },
  designChanges: [
    'A plunge into a banked turn at the gate (barriers and a slalom of hurdles) rather than the planned peg drop: two Track and Field tracks already open with a peg drop, the most one opening may have.',
    'The stadium is a generic open bowl in kente colours (gold seats, green risers, red walls) with no team or league names; the drummers and dancers stand outside it, by the Drummers sweep and the start.',
  ],
  opening: opening('banked-turn', { side: 'left', costumes: { block: 'steeple-barrier', slalom: 'hurdle' }, names: { plunge: 'Start plunge', turn: 'Banked turn' } }),
  sections: [
    {
      name: 'Beach road', shape: straight(90, { grade: 0.11 }), scenery: ['palms'],
      obstacles: [peg({ costume: 'hurdle', at: 0.15, line: 'center' }), slalom({ costume: 'hurdle', from: 0.4, to: 0.9, count: 3, loss: 0.15 })],
    },
    {
      name: 'Drummers sweep', shape: sweep({ side: 'left', radius: 80, degrees: 110, grade: 0.075 }), billboards: 2,
      landmarks: [{ name: 'drum-circle', side: 'low', at: 0.5, distance: 12 }],
    },
    { name: 'Spiral', shape: spiral({ side: 'left', radius: 55, turns: 0.8, grade: 0.15 }), around: 'floodlight-mast' },
    { name: 'Drop', shape: plunge(45, { grade: 0.22, from: 0.09 }), obstacles: [slalom({ costume: 'hurdle', from: 0.4, to: 0.9, count: 4, loss: 0.25 })] },
    { name: 'The kente lap', shape: sweep({ side: 'right', radius: 90, degrees: 170, grade: 0.085 }), stadium: true, features: [boost({ at: 0.08 })], billboards: 1 },
    { name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), billboards: 1, obstacles: [peg({ costume: 'hurdle', at: 0.15, line: 'left' }), peg({ costume: 'hurdle', at: 0.35, line: 'right' })] },
    { name: 'Hairpin', shape: hairpin({ side: 'left' }) },
    {
      name: 'Home straight', shape: straight(95, { grade: 0.11 }), stadium: true,
      features: [tableTop({ at: 0.15, length: 22, height: 0.3, down: 8 }), rumble({ from: 0.65, to: 0.95, count: 3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
