'use strict';

// Combo Drop: Block Series track 7. Step drops down beside a stand of lamp rows: each landing
// lights the next row. Split chutes from a rooftop start, a long run of steps, a spiral, a drop,
// more steps, a sweep past a block well, the hairpin and a slalom drop to the well at the end.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'combo-drop',
  name: 'Combo Drop',
  family: 'block',
  difficulty: 'extreme',
  description: 'Step drops down a world of blocks beside stands of lamp rows that light one after another as the pack lands: split chutes from a rooftop start, a long run of steps, a spiral, more steps and a slalom drop to the well.',
  surface: 'ice',
  biome: 'city',
  lighting: 'sunset',
  variants: ['day'],
  block: { world: 'puzzle' },
  coaster: { style: 'blocks', colours: { support: '#6a6f8a', rail: '#eef0f4', tie: '#2a3447' } },
  signature: 'Combo steps',
  tvCameras: [
    { section: 'Combo steps', at: 0.8, side: 'left', distance: 10, height: 12 },
    { section: 'Well sweep', at: 0.8, side: 'left', distance: 10, height: 12 },
  ],
  start: { landmark: 'block-hall', type: 'rooftop', gate: 'trapdoor', shots: { countdown: 'above', launch: 'low-chase' } },
  finish: { landmark: 'block-well' },
  designChanges: [
    'Built from the split start and the combo steps, the library layout made for this track: a straight of steps, a steep spiral, a drop, a second straight of steps, a long sweep with a boost, the hairpin and a slalom drop.',
    'Beside each run of steps, a stand of five lamp rows that light one after another as the leader lands (looks only, on the race clock).',
  ],
  opening: opening('split-start', {
    costumes: { block: 'voxel-cube', slalom: 'cube-pillar' },
  }),
  sections: layout('combo-steps', {
    costumes: { slalom: 'cube-pillar', peg: 'cube-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      steps1: { name: 'Combo steps', landmarks: [{ name: 'combo-rows', at: 0.55, side: 'left', distance: 5 }] },
      spin: { name: 'Combo spiral' },
      drop: { name: 'Drop' },
      steps2: { name: 'More steps', landmarks: [{ name: 'combo-rows', at: 0.55, side: 'right', distance: 5 }] },
      sweep: { name: 'Well sweep', landmarks: [{ name: 'block-well', at: 0.5, side: 'left', distance: 12 }] },
      brakingStraight: { name: 'Run to the hairpin' },
      hairpin: { name: 'Crane hairpin' },
      slalomDrop: { name: 'Pillar slalom' },
      lastStraight: { name: 'Run to the well' },
    },
  }),
});
