'use strict';

// Chain Reaction: Block Series track 14. A calm plain of coloured blocks at night: down a stepped
// platform and the start plunge, through deep S-bends, then along the cascade run, where long walls of block rows clear in
// a cascade as the pack passes, each wall setting off the next; over a crest, the hairpin and a
// spiral and a half past one more wall to the line.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'chain-reaction',
  name: 'Chain Reaction',
  family: 'block',
  difficulty: 'extreme',
  description: 'A plain of coloured blocks at night, where long walls of block rows clear in a cascade as the pack passes, each wall setting off the next: along the cascade run, over a crest, round the hairpin and a spiral and a half to the line.',
  surface: 'ice',
  biome: 'city',
  lighting: 'night',
  variants: ['sunset'],
  block: { world: 'puzzle' },
  coaster: { style: 'blocks', colours: { support: '#5d6c8c', rail: '#eef0f4', tie: '#20263a' } },
  signature: 'The cascade run',
  tvCameras: [
    { section: 'The cascade run', at: 0.8, side: 'left', distance: 10, height: 12 },
    { section: 'Chain spiral', at: 0.8, side: 'left', distance: 10, height: 12 },
  ],
  start: { landmark: 'block-hall', type: 'stepped-platform', gate: 'stalls', shots: { countdown: 'side', launch: 'overhead' } },
  finish: { landmark: 'block-well' },
  designChanges: [
    'Built from the classic plunge (from a stepped platform) and the cascade rows, the library layout made for this track: tight, deep S-bends first (they mix the field), a long straight beside the chain walls (a parked piece, a peg, a slalom), S-bends, a short climb, a drop, the hairpin and a spiral and a half.',
    'The chain walls clear one after another, 0.3 s apart, as the leader comes level with the first: looks only, on the race clock and the leader\'s progress, undone by rewinding a replay.',
  ],
  opening: opening('classic', {
    costumes: { block: 'voxel-cube', slalom: 'cube-pillar' },
  }),
  sections: layout('cascade-rows', {
    mirror: true,
    costumes: { slalom: 'cube-pillar', peg: 'cube-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      firstSweep: { name: 'First bends' },
      cascadeRun: { name: 'The cascade run', landmarks: [{ name: 'chain-wall', at: 0.3, side: 'left', distance: 6 }, { name: 'chain-wall', at: 0.7, side: 'right', distance: 6 }] },
      sBends: { name: 'Cascade bends' },
      crest: { name: 'Over the crest' },
      drop: { name: 'Drop' },
      brakingStraight: { name: 'Run to the hairpin', height: 10 },
      hairpin: { name: 'Crane hairpin', height: 10 },
      spin: { name: 'Chain spiral', height: 10 },
      lastStraight: { name: 'Last chain', landmarks: [{ name: 'chain-wall', at: 0.6, side: 'left', distance: 6 }] },
    },
  }),
});
