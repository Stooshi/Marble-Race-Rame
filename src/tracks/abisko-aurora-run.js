'use strict';

// Abisko Aurora Run: Blocks Series 2 (winter landscapes), Swedish Lapland built from cubes under the northern
// lights; year-round, no holiday decorations. In two chutes from the station's lift, two pairs of banked
// switchbacks down the snowy fell (big feature one), through the birch wood, onto the frozen lake and round
// its island (big feature two), off the shore, the hairpin by the sauna hut and down the valley to the station.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'abisko-aurora-run',
  name: 'Abisko Aurora Run',
  family: 'block-2',
  difficulty: 'extreme',
  description: 'Swedish Lapland built from cubes under the northern lights: switchbacks down the snowy fell, through the birch wood, round the island on the frozen lake and past the sauna hut to the station.',
  surface: 'ice',
  biome: 'arctic',
  lighting: 'night-northern-lights',
  variants: ['snow'],
  block: { world: 'aurora' },
  coaster: { style: 'blocks', colours: { support: '#6c7686', rail: '#eef3f8', tie: '#3e4656' } },
  signature: 'Round the island',
  tvCameras: [
    { section: 'Second switchbacks', at: 0.8, side: 'left', distance: 10, height: 12 },
    { section: 'Round the island', at: 0.9, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'aurora-station', type: 'straight-lift', gate: 'stalls', shots: { countdown: 'above', launch: 'low-chase' } },
  finish: { landmark: 'aurora-station' },
  designChanges: [
    'Blocks Series 2 (Moses, 30 Oct 2026): two big features, two pairs of banked switchbacks down the fell and the splitter round the island on the frozen lake. Built from the split start and aurora fell, the library layout made for this track (L109).',
    'Year-round winter (not part of the Holiday Season): no holiday decorations.',
  ],
  opening: opening('split-start', {
    costumes: { block: 'voxel-cube', slalom: 'cube-pillar' },
    names: { plunge: 'Off the lift' },
  }),
  sections: layout('aurora-fell', {
    costumes: { slalom: 'cube-pillar', peg: 'cube-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      switch1: { landmarks: [{ name: 'fell-peaks', at: 0.5, side: 'left', distance: 60 }] },
      switch2: { landmarks: [{ name: 'fell-peaks', at: 0.5, side: 'right', distance: 60 }] },
      birches: {},
      onTheLake: { landmarks: [{ name: 'ice-lake', at: 0.5, side: 'left', distance: 24 }] },
      splitter: { around: 'lake-island', landmarks: [{ name: 'ice-lake', at: 0.5, side: 'right', distance: 30 }] },
      hairpin: { landmarks: [{ name: 'sauna-hut', at: 0.5, side: 'high', distance: 16 }] },
      valley: {},
      lastStraight: { name: 'To the station', landmarks: [{ name: 'fell-peaks', at: 0.5, side: 'right', distance: 70 }] },
    },
  }),
});
