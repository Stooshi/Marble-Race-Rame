'use strict';

// Chao Phraya Dawn Spiral (Moses, 13 Nov 2026: five more Rivers tracks, the pack filled to 20; one of the two Easy
// ones). The Chao Phraya in Bangkok at dawn: down the long ferry pier, across the sand of the
// landing and into a wide bend of the river, past the long-tail boats, then round the riverside temple's tall tower (the track's
// big feature: a banked spiral climbing round it, the gold of dawn on its tiers), down to the water, along a wide
// canal (a half-pipe, the field rocking wall to wall), the hairpin by the ferry pier, a sweep past the temple roofs, under a cable-stayed bridge and the last S-bends
// to the pier. Generic temple architecture and river life only; no names on anything.
const {
  track, opening, straight, plunge, sBends, sweep, spiral, hairpin, runIn, slalom, halfPipe,
} = require('../trackKit');

module.exports = track({
  slug: 'chao-phraya-dawn-spiral',
  name: 'Chao Phraya Dawn Spiral',
  family: 'river',
  difficulty: 'easy',
  description: 'The Chao Phraya in Bangkok at dawn: down the long ferry pier, past the long-tail boats, round and round the riverside temple\'s tall tower, along a canal, past the temple roofs and under a great cable-stayed bridge to the pier.',
  surface: 'ice',
  biome: 'jungle',
  lighting: 'sunset',
  variants: ['day'],
  river: { palette: 'chao-phraya', side: 'left', width: 150, banks: 'quay', slope: 0.6, gap: 10 },
  coaster: { colours: { support: '#7a5a3a', rail: '#f2e4c4', tie: '#4a3826' } },
  signature: 'Round the temple tower',
  tvCameras: [
    // (Low on the outside at the end of the spiral, looking back round the tower at the field coming down it.)
    { section: 'Round the temple tower', at: 0.85, side: 'right', distance: 11, height: 12 },
  ],
  start: { landmark: 'longtail-boat', type: 'spiral-tower', gate: 'stalls', shots: { countdown: 'low-front', launch: 'side' } },
  finish: { landmark: 'river-cruiser' },
  opening: opening('sand-trap', {
    costumes: { block: 'log', slalom: 'lantern-pole' },
    names: { plunge: 'Down the ferry pier' },
    // (Let go in waves, a new order every race: without them the first starting group did a little better.)
    waves: { groups: 5, gap: 0.12, jitter: 0.04 },
    dress: { plunge: { height: 6, river: 'under' } },
  }),
  sections: [
    { name: 'Into the river bend', shape: sweep({ side: 'right', radius: 75, degrees: 120, grade: 0.13 }), height: 0, river: 'left' },
    {
      name: 'Past the long-tail boats', shape: straight(90, { grade: 0.15 }), height: 0, river: 'left',
      landmarks: [{ name: 'longtail-boat', at: 0.4, river: true, distance: 35 }, { name: 'longtail-boat', at: 0.8, river: true, distance: 50 }],
      obstacles: [slalom({ costume: 'lantern-pole', from: 0.4, to: 0.8, count: 4, loss: 0.15 })],
    },
    {
      name: 'Round the temple tower', shape: spiral({ side: 'left', radius: 44, turns: 1, grade: 0.19 }), height: 10, river: 'none', billboards: 2,
      around: 'temple-prang',
    },
    { name: 'Down to the water', shape: plunge(45, { grade: 0.26, from: 0.15 }), height: 0, river: 'left' },
    {
      // (A wide canal: the field rocks from wall to wall down it, side by side, and the order changes.)
      name: 'Along the canal', shape: halfPipe({ first: 'right', width: 7.5, swings: 3, radius: 150, degrees: 18, grade: 0.12 }), height: 0, river: 'left', scenery: ['stilt-houses'],
    },
    { name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), height: 0, river: 'left' },
    { name: 'Ferry pier hairpin', shape: hairpin({ side: 'left' }), height: 0, river: 'none' },
    {
      name: 'Past the temple roofs', shape: sweep({ side: 'right', radius: 85, degrees: 90, grade: 0.15 }), height: 0, river: 'right', billboards: 1,
      landmarks: [{ name: 'wat-roofs', at: 0.5, side: 'left', distance: 30 }],
    },
    {
      name: 'Under the bridge', shape: straight(70, { grade: 0.16 }), height: 0, river: 'right', overhead: ['cable-stayed-bridge'],
    },
    {
      name: 'Last S-bends', shape: sBends({ first: 'left', radius: 75, degrees: 50, grade: 0.15 }), height: 0, river: 'right',
    },
    {
      name: 'To the pier', shape: straight(55, { grade: 0.15 }), height: 0, river: 'right', billboards: 2,
    },
    { name: 'Finish', shape: runIn(), height: 0, river: 'right' },
  ],
});
