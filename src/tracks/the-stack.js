'use strict';

// The Stack: Block Series track 8. A spiral round a towering stack of blocks, where new blocks keep
// dropping onto the top and settling: over a crest from the gate, a peg straight, S-bends, a
// spiral, a drop, a sweep, the hairpin, then the long spiral round the stack, high on block
// pillars, and the run to the hall.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'the-stack',
  name: 'The Stack',
  family: 'block',
  difficulty: 'extreme',
  description: 'A spiral round a towering stack of blocks, where new blocks keep dropping onto the top and settling: over a crest, through S-bends and a spiral, then the long spiral round the stack high on block pillars.',
  surface: 'ice',
  biome: 'city',
  lighting: 'dawn',
  variants: ['day'],
  block: { world: 'puzzle' },
  coaster: { style: 'blocks', colours: { support: '#7a7f96', rail: '#eef0f4', tie: '#2a3447' } },
  signature: 'Round the stack',
  tvCameras: [
    { section: 'Round the stack', at: 0.8, side: 'left', distance: 10, height: 12 },
    { section: 'Stack sweep', at: 0.8, side: 'left', distance: 10, height: 12 },
  ],
  start: { landmark: 'block-well', type: 'spiral-tower', gate: 'stalls', shots: { countdown: 'chase', launch: 'overhead' } },
  finish: { landmark: 'block-hall' },
  designChanges: [
    'Built from the crest start and the stack spiral, the library layout made for this track: a peg straight, S-bends, a spiral, a drop, a sweep with a boost, the hairpin and the long spiral (a little over one turn).',
    'The long spiral winds round the stack 12 m up on block pillars; new blocks drop onto the stack every few seconds and settle, and a full layer clears with a flash (looks only, on the race clock).',
  ],
  opening: opening('crest-start', {
    costumes: { block: 'voxel-cube', slalom: 'cube-pillar' },
    names: { plunge: 'Start drop', climb: 'First crest', drop: 'Over the top' },
  }),
  sections: layout('stack-spiral', {
    costumes: { slalom: 'cube-pillar', peg: 'cube-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      pegRun: { name: 'Peg straight' },
      sBends: { name: 'Tile bends' },
      spin: { name: 'First spiral' },
      drop: { name: 'Drop' },
      sweep: { name: 'Stack sweep' },
      brakingStraight: { name: 'Run to the hairpin' },
      hairpin: { name: 'Crane hairpin' },
      stackSpiral: { name: 'Round the stack', height: 12, around: 'settling-stack' },
      lastStraight: { name: 'Run to the hall' },
    },
  }),
});
