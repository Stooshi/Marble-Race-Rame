'use strict';

// Crystal Grotto (Moses, 15 Nov 2026: seven more Blocks 1 tracks, the pack filled to 20; one of the three Wild ones). A
// deep violet cave world of glowing crystals: out of a glowing portal and a clean drop into S-bends (the field let go
// in waves), a straight past a still crystal pool, then round the crystal spire (the track's big feature: a banked
// spiral right round a towering cluster of violet and blue crystal), a straight along a seam of gems, S-bends through
// the cavern, past rows that clear, the hairpin, a long drop to the lower cave, a half-pipe down a crystal channel, a
// sweep through the lower cave and the last straight. Our own shapes and colours: no names, creatures or pieces from
// any existing game.
const {
  track, opening, straight, plunge, sBends, sweep, spiral, hairpin, halfPipe, runIn, peg, slalom, brake,
} = require('../trackKit');

module.exports = track({
  slug: 'crystal-grotto',
  name: 'Crystal Grotto',
  family: 'block',
  difficulty: 'hard',
  description: 'A deep violet cave world of glowing crystals: out of a glowing portal, past a still crystal pool, round and round a towering crystal spire, along a seam of gems and down to the lower cave.',
  surface: 'ice',
  biome: 'alpine',
  lighting: 'cave',
  block: { world: 'grotto' },
  coaster: { style: 'blocks', colours: { support: '#2c2545', rail: '#ece4ff', tie: '#1c1730' } },
  signature: 'Round the crystal spire',
  tvCameras: [
    // (Low on the outside at the end of the spiral, looking back round it at the field coming down.)
    { section: 'Round the crystal spire', at: 0.85, side: 'left', distance: 10, height: 12 },
    { section: 'To the lower cave', at: 0.5, side: 'right', distance: 10, height: 11 },
  ],
  start: { landmark: 'crystal-pool', type: 'portal-gate', gate: 'trapdoor', shots: { countdown: 'low-front', launch: 'high-behind' } },
  finish: { landmark: 'block-hall' },
  opening: opening('clean-drop', {
    side: 'left',
    costumes: { block: 'voxel-cube', slalom: 'cube-pillar' },
    names: { plunge: 'Out of the portal', bends: 'Down the crystal steps' },
    // (Let go in short jittered waves, a new order every race.)
    waves: { groups: 5, gap: 0.16, jitter: 0.1 },
  }),
  sections: [
    {
      name: 'Past the crystal pool', shape: straight(60, { grade: 0.17 }), billboards: 1,
      landmarks: [{ name: 'crystal-pool', at: 0.5, side: 'right', distance: 28 }],
      features: [brake({ at: 0.05, length: 12, drag: 0.02 })],
      obstacles: [slalom({ costume: 'cube-pillar', from: 0.45, to: 0.9, count: 4, loss: 0.2 })],
    },
    { name: 'Round the crystal spire', shape: spiral({ side: 'left', radius: 42, turns: 1, grade: 0.21 }), height: 8, around: 'crystal-spire', billboards: 1 },
    {
      name: 'Along the gem seam', shape: straight(55, { grade: 0.16 }),
      landmarks: [{ name: 'gem-seam', at: 0.5, side: 'right', distance: 18 }],
      obstacles: [slalom({ costume: 'cube-pillar', from: 0.3, to: 0.8, count: 4, loss: 0.25 })],
    },
    {
      name: 'Through the cavern', shape: sBends({ first: 'right', radius: 65, degrees: 80, grade: 0.17 }),
      obstacles: [peg({ costume: 'cube-pillar', at: 0.3, line: 'center' }), peg({ costume: 'cube-pillar', at: 0.7, line: 'left' })],
    },
    {
      name: 'Past the clearing rows', shape: straight(55, { grade: 0.16 }),
      landmarks: [{ name: 'clear-rows', at: 0.5, side: 'right', distance: 6 }],
      features: [brake({ at: 0.05, length: 10, drag: 0.02 })],
      obstacles: [slalom({ costume: 'cube-pillar', from: 0.6, to: 0.92, count: 3, loss: 0.25 })],
    },
    { name: 'Hairpin by the gems', shape: hairpin({ side: 'left' }) },
    { name: 'To the lower cave', shape: plunge(66, { grade: 0.34, from: 0.15 }), billboards: 1 },
    { name: 'Down the crystal channel', shape: halfPipe({ first: 'left', width: 8, swings: 2, radius: 150, degrees: 16, grade: 0.13 }) },
    {
      name: 'Through the lower cave', shape: sweep({ side: 'right', radius: 75, degrees: 100, grade: 0.17 }),
      obstacles: [peg({ costume: 'cube-pillar', at: 0.3, line: 'right' }), peg({ costume: 'cube-pillar', at: 0.7, line: 'left' })],
    },
    {
      name: 'Last straight', shape: straight(65, { grade: 0.17 }), billboards: 1,
      obstacles: [slalom({ costume: 'cube-pillar', from: 0.35, to: 0.7, count: 3, loss: 0.2 })],
      features: [brake({ at: 0.05, length: 10, drag: 0.02 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
