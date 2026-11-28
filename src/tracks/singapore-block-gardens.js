'use strict';

// Singapore Block Gardens: Blocks Series 2 (cities), Singapore's gardens by the bay built from cubes, by day.
// Out of the tunnel along the bay, the spiral round a cluster of tall garden towers (big feature one, generic: not
// any real structure), the skywalk sweep, into a glass-block dome and through its curtain waterfall (big feature
// two), the cloud-forest slalom, the hairpin under the dome and S-bends along the bay.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'singapore-block-gardens',
  name: 'Singapore Block Gardens',
  family: 'block-2',
  difficulty: 'extreme',
  description: 'Gardens by a tropical bay built from cubes: out of a tunnel along the water, round a cluster of tall garden towers and through the waterfall inside a glass dome.',
  surface: 'ice',
  biome: 'city',
  lighting: 'day',
  variants: ['sunset'],
  block: { world: 'tropic' },
  coaster: { style: 'blocks', colours: { support: '#6b7179', rail: '#f2ede2', tie: '#4f5560' } },
  signature: 'Through the dome waterfall',
  tvCameras: [
    { section: 'Round the garden towers', at: 0.6, side: 'left', distance: 9, height: 12 },
    { section: 'Cloud-forest slalom', at: 0.3, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'bay-skyline', type: 'elevator', gate: 'stalls', shots: { countdown: 'chase', launch: 'overhead' } },
  finish: { landmark: 'glass-dome' },
  designChanges: [
    'Blocks Series 2 (Moses, 30 Oct 2026): two big features, the spiral round the garden towers and the curtain waterfall inside the glass dome. Built from the tunnel launch and garden domes, the library layout made for this track (L112).',
    'Generic garden-city architecture built from cubes: no registered landmark (no Merlion, no Marina Bay Sands), nothing copied.',
  ],
  opening: opening('tunnel-launch', {
    costumes: { block: 'voxel-cube', slalom: 'cube-pillar' },
  }),
  sections: layout('garden-domes', {
    costumes: { slalom: 'cube-pillar', peg: 'cube-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      baySweep: { landmarks: [{ name: 'bay-skyline', at: 0.5, side: 'right', distance: 60 }, { name: 'glass-dome', at: 0.8, side: 'left', distance: 36 }] },
      towers: { around: 'garden-towers' },
      intoDome: { landmarks: [{ name: 'glass-dome', at: 0.6, side: 'right', distance: 26 }] },
      bayBends: { landmarks: [{ name: 'bay-skyline', at: 0.5, side: 'right', distance: 70 }] },
      lastStraight: { name: 'Run-in by the bay', landmarks: [{ name: 'garden-towers', at: 0.4, side: 'left', distance: 24 }] },
    },
  }),
});
