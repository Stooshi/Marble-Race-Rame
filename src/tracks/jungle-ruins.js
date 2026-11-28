'use strict';

// Jungle Ruins (Moses, 15 Nov 2026: seven more Blocks 1 tracks, the pack filled to 20; one of the three Wild ones). A deep
// green game world of cube jungle over mossy stone: off a ruined stone tower and down the rough path (the rumble start,
// the field let go in waves), S-bends past the vine temple, a straight under a broken arch, then down the falls (the
// track's big feature: a waterfall drop through falling water), through the spray, a sweep along the river, past a
// checkpoint, the hairpin, S-bends among the ferns and the last straight. Our own shapes and colours: no names,
// creatures or pieces from any existing game.
const {
  track, opening, straight, sBends, sweep, hairpin, waterfall, runIn, peg, slalom, brake,
} = require('../trackKit');

module.exports = track({
  slug: 'jungle-ruins',
  name: 'Jungle Ruins',
  family: 'block',
  difficulty: 'hard',
  description: 'A deep green world of cube jungle over mossy stone: past the vine-hung temple, under a broken arch, down the falls through falling water, along the river past a checkpoint and through the ferns to the line.',
  surface: 'ice',
  biome: 'jungle',
  lighting: 'day',
  variants: ['sunset'],
  block: { world: 'jungle' },
  coaster: { style: 'blocks', colours: { support: '#6f6a52', rail: '#f2eee2', tie: '#3f3a2a' } },
  signature: 'Down the falls',
  tvCameras: [
    // (In the spray at the foot of the falls, looking back up at the field pouring down through the water.)
    { section: 'In the spray', at: 0.6, side: 'right', distance: 10, height: 12 },
    { section: 'Among the ferns', at: 0.5, side: 'left', distance: 10, height: 11 },
  ],
  start: { landmark: 'vine-arch', type: 'castle-tower', gate: 'barrier', shots: { countdown: 'crane', launch: 'look-back' } },
  finish: { landmark: 'block-hall' },
  opening: opening('rumble-start', {
    costumes: { slalom: 'cube-pillar' },
    names: { plunge: 'Down the rough path' },
    // (Let go in short waves with more jitter, a new order every race.)
    waves: { groups: 5, gap: 0.13, jitter: 0.1 },
  }),
  sections: [
    {
      name: 'Past the vine temple', shape: sBends({ first: 'left', radius: 65, degrees: 80, grade: 0.12 }), billboards: 1,
      landmarks: [{ name: 'vine-temple', at: 0.5, side: 'right', distance: 44 }],
    },
    {
      name: 'Under the broken arch', shape: straight(60, { grade: 0.12 }),
      landmarks: [{ name: 'vine-arch', at: 0.3, side: 'left', distance: 16 }],
      features: [brake({ at: 0.05, length: 12, drag: 0.02 })],
      obstacles: [slalom({ costume: 'cube-pillar', from: 0.45, to: 0.9, count: 3, loss: 0.25 })],
    },
    { name: 'To the falls', shape: straight(30, { grade: 0.1 }) },
    { name: 'Down the falls', shape: waterfall(40, { grade: 0.6, curtain: true }) },
    {
      name: 'In the spray', shape: straight(50, { grade: 0.11 }),
      obstacles: [peg({ costume: 'cube-pillar', at: 0.55, line: 'center' })],
    },
    { name: 'Along the river', shape: sweep({ side: 'right', radius: 75, degrees: 140, grade: 0.12 }), billboards: 1 },
    {
      name: 'Past the checkpoint', shape: straight(55, { grade: 0.12 }),
      landmarks: [{ name: 'checkpoint-arch', at: 0.5, side: 'left', distance: 18 }],
      features: [brake({ at: 0.05, length: 10, drag: 0.02 })],
    },
    { name: 'Hairpin by the roots', shape: hairpin({ side: 'right' }) },
    {
      name: 'Among the ferns', shape: sBends({ first: 'right', radius: 60, degrees: 80, grade: 0.13 }), billboards: 1,
      obstacles: [slalom({ costume: 'cube-pillar', from: 0.3, to: 0.7, count: 3, loss: 0.15 })],
    },
    {
      name: 'Last straight', shape: straight(85, { grade: 0.12 }), billboards: 1,
      features: [brake({ at: 0.05, length: 10, drag: 0.02 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
