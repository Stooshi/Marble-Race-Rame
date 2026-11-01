'use strict';

// Kinabalu Cube Summit: Blocks Series 2 (mountains), a granite mountain in Borneo built from cubes at dawn. Off granite slabs into the funnel off
// the plateau (big feature one), S-bends down the slabs, the waterfall drop into the cloud forest (big feature two),
// the cloud-forest slalom, the giant ferns, the hairpin and a sweep through the ferns. Nothing on the summit.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'kinabalu-cube-summit',
  name: 'Kinabalu Cube Summit',
  family: 'block-2',
  difficulty: 'extreme',
  description: 'A granite mountain in Borneo built from cubes at dawn: out of the funnel off the granite plateau, down the slabs, over the falls into the cloud forest and through the giant ferns.',
  surface: 'ice',
  biome: 'jungle',
  lighting: 'dawn',
  variants: ['day'],
  block: { world: 'cloudforest' },
  coaster: { style: 'blocks', colours: { support: '#7a7a80', rail: '#f2f2ee', tie: '#55555c' } },
  signature: 'Into the cloud forest',
  tvCameras: [
    { section: 'Into the cloud forest', at: 0.9, side: 'left', distance: 10, height: 12 },
    { section: 'Giant fern sweep', at: 0.5, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'granite-plateau', type: 'stepped-platform', gate: 'stalls', shots: { countdown: 'front', launch: 'overhead' } },
  finish: { landmark: 'giant-ferns' },
  designChanges: [
    'Blocks Series 2 (Moses, 30 Oct 2026): two big features, the funnel off the granite plateau and the waterfall drop into the cloud forest. Built from the plateau falls layout made for this track (L119).',
    'A generic Mount Kinabalu landscape built from cubes; no real building copied and nothing on a summit.',
  ],
  opening: opening('funnel-drop', {
    costumes: { block: 'voxel-cube', slalom: 'cube-pillar' },
  }),
  sections: layout('plateau-falls', {
    costumes: { slalom: 'cube-pillar', peg: 'cube-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      slabBends: { landmarks: [{ name: 'granite-plateau', at: 0.5, side: 'left', distance: 120 }] },
      cloudForest: { landmarks: [{ name: 'giant-ferns', at: 0.3, side: 'left', distance: 16 }, { name: 'giant-ferns', at: 0.75, side: 'right', distance: 16 }] },
      fernBends: { landmarks: [{ name: 'giant-ferns', at: 0.5, side: 'right', distance: 18 }] },
      fernSweep: { landmarks: [{ name: 'granite-plateau', at: 0.5, side: 'left', distance: 140 }] },
      lastStraight: { name: 'Under the tree ferns', landmarks: [{ name: 'giant-ferns', at: 0.4, side: 'left', distance: 16 }] },
    },
  }),
});
