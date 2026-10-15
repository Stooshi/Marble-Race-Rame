'use strict';

// Block Fortress: Block Series track 9. A castle of stone blocks in green hills: into a banked
// turn, round the moat past a cube farm, over the drawbridge as it lowers, down into the courtyard
// and through the gate whose blocks drop into place as the pack comes, the hairpin, S-bends along
// the walls and a spiral to the hall.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'block-fortress',
  name: 'Block Fortress',
  family: 'block',
  difficulty: 'extreme',
  description: 'A castle of stone blocks in green hills: round the moat, over the drawbridge as it lowers, down into the courtyard and through a gate whose blocks drop into place as the pack comes, past the castle walls.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'day',
  variants: ['sunset'],
  block: { world: 'fortress' },
  coaster: { style: 'blocks', colours: { support: '#8a8278', rail: '#f2ede2', tie: '#4f4a44' } },
  signature: 'The block gate',
  start: { landmark: 'cube-cottage', type: 'straight-lift', gate: 'paddle', shots: { countdown: 'front', launch: 'look-back' } },
  finish: { landmark: 'block-hall' },
  designChanges: [
    'Built from the banked first turn (to the left) and the fortress gate (mirrored), the library layout made for this track: a sweep, a short climb (the drawbridge), a drop into the courtyard, a slalom straight (the gate), the hairpin, S-bends, a second sweep with a boost and a spiral.',
    'The drawbridge lowers and the gate\'s blocks drop into place as the leader comes (looks only, on the race clock).',
  ],
  opening: opening('banked-turn', {
    side: 'left',
    costumes: { block: 'voxel-cube', slalom: 'cube-pillar' },
    names: { plunge: 'Start drop', turn: 'First turn' },
  }),
  sections: layout('fortress-gate', {
    mirror: true,
    costumes: { slalom: 'cube-pillar', peg: 'cube-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      moatSweep: { name: 'Round the moat', landmarks: [{ name: 'cube-farm', at: 0.55, side: 'left', distance: 16 }] },
      drawbridge: { name: 'The drawbridge', landmarks: [{ name: 'drawbridge', at: 0.5, side: 'right', distance: 6 }] },
      courtyardDrop: { name: 'Into the courtyard' },
      gateRun: { name: 'The block gate', landmarks: [{ name: 'block-gate', at: 0.15, over: true }, { name: 'voxel-castle', at: 0.6, side: 'right', distance: 24 }] },
      brakingStraight: { name: 'Run to the hairpin' },
      hairpin: { name: 'Crane hairpin' },
      wallBends: { name: 'Along the walls' },
      sweep2: { name: 'Castle sweep' },
      spin: { name: 'Tower spiral' },
      lastStraight: { name: 'Run to the hall' },
    },
  }),
});
