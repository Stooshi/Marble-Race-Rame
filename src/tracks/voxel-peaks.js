'use strict';

// Voxel Peaks: Block Series track 3. Snowy mountains of cubes: from a cliff-top start into a
// banked turn, out on tall block pillars over the cube cliffs round a long sweep, a drop, over a
// crest and along the ridge, down a slalom drop and round a spiral wound about a cube peak, to a
// log cabin in the snow.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'voxel-peaks',
  name: 'Voxel Peaks',
  family: 'block',
  difficulty: 'extreme',
  description: 'Snowy mountains built of cubes: from a cliff-top start, out on tall block pillars over the cube cliffs, over a crest and along the ridge, then down round a spiral wound about a cube peak to a cabin in the snow.',
  surface: 'ice',
  biome: 'alpine',
  lighting: 'day',
  variants: ['snow'],
  block: { world: 'snow' },
  coaster: { style: 'blocks', colours: { support: '#8a929c', rail: '#f2ede2', tie: '#4f565f' } },
  signature: 'Out on the beams',
  start: { landmark: 'beam-tower', type: 'cliff', gate: 'trapdoor', shots: { countdown: 'above', launch: 'overhead' } },
  finish: { landmark: 'cube-cabin' },
  designChanges: [
    'Built from the banked first turn (to the right) and the peak beams, the library layout made for this track: a long sweep with a boost, a drop, a crest, a second sweep, S-bends, the hairpin, a slalom drop and a spiral.',
    'The long sweep flies 30 m up on block pillars over the cube cliffs, the ridge sweep 18 m; the spiral winds round a cube peak.',
  ],
  opening: opening('banked-turn', {
    side: 'right',
    costumes: { block: 'voxel-cube', slalom: 'cube-pillar' },
    names: { plunge: 'Cliff drop', turn: 'First snow turn' },
  }),
  sections: layout('peak-beams', {
    costumes: { slalom: 'cube-pillar', peg: 'cube-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      beamSweep: { name: 'Out on the beams', height: 30, landmarks: [{ name: 'beam-tower', at: 0.5, side: 'left', distance: 12 }] },
      drop: { name: 'Off the beams' },
      crest: { name: 'Snow crest' },
      ridgeSweep: { name: 'Ridge sweep', height: 18, landmarks: [{ name: 'voxel-peak', at: 0.5, side: 'right', distance: 34 }] },
      sBends: { name: 'Snow bends' },
      brakingStraight: { name: 'Run to the hairpin' },
      hairpin: { name: 'Crane hairpin' },
      slalomDrop: { name: 'Pillar slalom' },
      spin: { name: 'Peak spiral', around: 'voxel-peak' },
      lastStraight: { name: 'Run to the cabin' },
    },
  }),
});
