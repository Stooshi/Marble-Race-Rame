'use strict';

// Voxel Harbor: Block Series track 12. A harbour of blocks at sunset: in waves from the harbour
// office along the quay past stacked containers, round a spin under a block crane swinging its jib,
// out along the pier past moored boats, round the basin, the hairpin and on to the block lighthouse
// at the end of the mole.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'voxel-harbor',
  name: 'Voxel Harbor',
  family: 'block',
  difficulty: 'extreme',
  description: 'A harbour of blocks at sunset: in waves along the quay past stacked containers, round a spin under a swinging block crane, out along the pier past moored boats and round the basin to the lighthouse.',
  surface: 'ice',
  biome: 'city',
  lighting: 'sunset',
  variants: ['night'],
  block: { world: 'harbour' },
  coaster: { style: 'blocks', colours: { support: '#5e636a', rail: '#eef0f4', tie: '#2a2f36' } },
  signature: 'The quay',
  start: { landmark: 'harbour-office', type: 'curving-lift', gate: 'trapdoor', shots: { countdown: 'chase', launch: 'low-chase' } },
  finish: { landmark: 'block-lighthouse' },
  designChanges: [
    'Built from the staggered drop (the field leaves the harbour office in waves) and the harbour quays, the library layout made for this track: tight S-bends through the warehouses (they mix the field), a long quay straight, a wide part-spiral round the crane, a pier straight, a long sweep round the basin, a drop, the hairpin and pegs at the run-in.',
    'The basin is water (the land sinks under it); the boats float on it, beside the track (looks only).',
  ],
  opening: opening('staggered-drop', {
    costumes: { block: 'voxel-cube', slalom: 'cube-pillar' },
  }),
  sections: layout('harbour-quays', {
    mirror: true,
    costumes: { slalom: 'cube-pillar', peg: 'cube-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      sBends: { name: 'Warehouse bends', height: 0, landmarks: [{ name: 'container-stack', at: 0.5, side: 'left', distance: 18 }] },
      quay: { name: 'The quay', height: 0, landmarks: [{ name: 'container-stack', at: 0.4, side: 'right', distance: 16 }] },
      craneSpin: { name: 'Crane spin', height: 0 },
      pier: { name: 'The pier', height: 6, water: true, landmarks: [{ name: 'block-boats', at: 0.5, side: 'left', distance: 12 }] },
      basinSweep: { name: 'Round the basin', height: 6, water: true, landmarks: [{ name: 'cube-crane', at: 0.5, side: 'right', distance: 14 }] },
      dockDrop: { name: 'Drop to the docks', height: 0 },
      brakingStraight: { name: 'Run to the hairpin', height: 0 },
      hairpin: { name: 'Crane hairpin', height: 0 },
      lastStraight: { name: 'Run to the lighthouse', height: 0 },
    },
  }),
});
