'use strict';

// Line Clear: Block Series track 6. A calm tiled plain of our own coloured blocks: beside the track
// stand walls of block rows, and as the pack passes, their full rows clear with a flash and the
// rows above settle down. Waves of marbles from the gate, a slalom past the first rows, S-bends,
// the steps, a drop, a spiral, the hairpin and a sweep to the block hall.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'line-clear',
  name: 'Line Clear',
  family: 'block',
  difficulty: 'extreme',
  description: 'A calm plain of coloured blocks, where walls of block rows stand beside the track: as the pack passes, their full rows clear with a flash and the rows above settle down. A slalom, S-bends, a run of steps, a spiral and a sweep to the block hall.',
  surface: 'ice',
  biome: 'city',
  lighting: 'day',
  variants: ['sunset'],
  block: { world: 'puzzle' },
  coaster: { style: 'blocks', colours: { support: '#5d6c8c', rail: '#eef0f4', tie: '#2a3447' } },
  signature: 'Row steps',
  start: { landmark: 'block-well', type: 'curving-lift', gate: 'barrier', shots: { countdown: 'front', launch: 'side' } },
  finish: { landmark: 'block-hall' },
  designChanges: [
    'Built from the staggered drop and the clear rows, the library layout made for this track: a slalom straight, S-bends, a straight of steps, a drop, a spiral, the hairpin and a sweep with a boost.',
    'Four walls of block rows beside the track: as the leader passes each, its two full rows flash and clear and the rows above settle down (looks only, on the race clock).',
  ],
  opening: opening('staggered-drop', {
    costumes: { block: 'voxel-cube', slalom: 'cube-pillar' },
    names: { plunge: 'Wave drop' },
  }),
  sections: layout('clear-rows', {
    costumes: { slalom: 'cube-pillar', peg: 'cube-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      rowRun: { name: 'First rows', landmarks: [{ name: 'clear-rows', at: 0.5, side: 'left', distance: 5 }] },
      sBends: { name: 'Tile bends' },
      rowSteps: { name: 'Row steps', landmarks: [{ name: 'clear-rows', at: 0.55, side: 'right', distance: 5 }] },
      drop: { name: 'Drop' },
      spin: { name: 'Block spiral' },
      brakingStraight: { name: 'Run to the hairpin' },
      hairpin: { name: 'Crane hairpin' },
      sweep: { name: 'Clearing sweep', landmarks: [{ name: 'clear-rows', at: 0.5, side: 'left', distance: 6 }] },
      lastStraight: { name: 'Run to the hall', landmarks: [{ name: 'clear-rows', at: 0.55, side: 'right', distance: 5 }] },
    },
  }),
});
