'use strict';

// Fish River Burst: Canyon Series track 10, through the Fish River Canyon in Namibia, the largest in
// Africa. From a grove of quiver trees on the rim, down the desert canyon's tight meanders past a
// hikers' camp, out over the rock and back in, a falcon at the hairpin and more meanders, to the
// steaming hot springs at the canyon's end.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'fish-river-burst',
  name: 'Fish River Burst',
  family: 'canyon',
  difficulty: 'extreme',
  description: 'Through the Fish River Canyon in Namibia, the largest in Africa: from quiver trees on the rim down the desert canyon\'s tight meanders, past a hikers\' camp, out over the rock and back in, to steaming hot springs at the end.',
  surface: 'ice',
  biome: 'desert',
  lighting: 'day',
  canyon: { palette: 'namib', depth: 36, river: 'left' },
  coaster: { colours: { support: '#8a6a4a', rail: '#f2ede2', tie: '#4a3a2e' } },
  signature: 'The meanders',
  start: { landmark: 'quiver-grove', scenery: ['rocks'], type: 'curving-lift', gate: 'trapdoor', shots: { countdown: 'above', launch: 'overhead' } },
  finish: { landmark: 'hot-springs' },
  designChanges: [
    'Built from the banked first turn (a plunge into a steep banked turn) and meanders, the library layout made for this track.',
    'The meanders are tight S-bends (50 m radius), the tightest bends the recipe allows besides the one hairpin.',
  ],
  opening: opening('banked-turn', {
    costumes: { block: 'mossy-boulder', slalom: 'cairn' },
    names: { plunge: 'Start plunge', turn: 'Into the canyon' },
    dress: { plunge: { height: 0 }, turn: { height: 0 } },
  }),
  sections: layout('meanders', {
    costumes: { slalom: 'cairn', peg: 'cairn', swipe: 'falcon', parked: 'river-raft' },
    dress: {
      meander1: { name: 'The meanders', height: 0 },
      straight1: { name: 'Hikers\' camp', height: 0, landmarks: [{ name: 'hikers-camp', at: 0.5, side: 'right', distance: 5 }] },
      meander2: { name: 'More meanders', height: 0 },
      highSweep: { name: 'Over the rock', height: 28 },
      drop: { name: 'Drop back in', height: 0 },
      brakingStraight: { name: 'Run to the hairpin', height: 0 },
      hairpin: { name: 'Falcon hairpin', height: 0 },
      meander3: { name: 'Last meanders', height: 0 },
      lastStraight: { name: 'Run to the springs', height: 0 },
    },
  }),
});
