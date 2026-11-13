'use strict';

// Iguazú Devil's Throat (Moses, 13 Nov 2026: five more Rivers tracks, the pack filled to 20; the Extreme one). The
// Iguazú on the border of Argentina and Brazil: down into the rainforest and round a steep banked bend of the river,
// down to the water, along the catwalks over the upper river, a sweep to the lip, then down the Devil's Throat, the great horseshoe of
// falls (the track's big feature: a long waterfall drop, through a sheet of falling water), through the spray, round the
// island in the middle of the falls (two channels, a splitter), the lower falls, the hairpin at the boat landing, a sweep through the rainforest, a last drop and the
// run to the landing. Generic rainforest and river life only; no names on anything.
const {
  track, opening, straight, plunge, sweep, hairpin, waterfall, splitter, runIn, peg, slalom, moguls,
} = require('../trackKit');

module.exports = track({
  slug: 'iguazu-devils-throat',
  name: "Iguazú Devil's Throat",
  family: 'river',
  difficulty: 'extreme',
  description: 'The Iguazú on the border of Argentina and Brazil: through the rainforest, along the catwalks over the upper river, down the Devil\'s Throat, the great horseshoe of falls, through the spray, round the island and past the lower falls to the boat landing.',
  surface: 'ice',
  biome: 'jungle',
  lighting: 'day',
  variants: ['sunset'],
  river: { palette: 'iguazu', side: 'left', width: 140, banks: 'rock', slope: 0.8, gap: 10 },
  coaster: { colours: { support: '#5a3a2a', rail: '#f2e8d4', tie: '#3a2a20' } },
  signature: "The Devil's Throat",
  tvCameras: [
    // (In the spray at the foot of the falls, looking back up at the field pouring down through the falling water.)
    { section: 'In the spray', at: 0.6, side: 'right', distance: 10, height: 12 },
    { section: 'Through the rainforest', at: 0.5, side: 'left', distance: 10, height: 11 },
  ],
  start: { landmark: 'toucan-tree', type: 'curving-lift', gate: 'paddle', shots: { countdown: 'crane', launch: 'look-back' } },
  finish: { landmark: 'jet-boat' },
  opening: opening('banked-turn', {
    side: 'right',
    costumes: { block: 'jaguar', slalom: 'river-stake' },
    names: { plunge: 'Into the rainforest', turn: 'Round the river bend' },
    // (Let go in waves, a new order every race: without them the first starting group won a little more.)
    waves: { groups: 5, gap: 0.12, jitter: 0.04 },
    dress: { plunge: { height: 0, river: 'left' }, turn: { height: 0, river: 'left' } },
  }),
  sections: [
    {
      name: 'Down to the river', shape: plunge(40, { grade: 0.3, from: 0.14 }), height: 0, river: 'left',
      obstacles: [peg({ costume: 'mossy-boulder', at: 0.45, line: 'left' }), peg({ costume: 'mossy-boulder', at: 0.75, line: 'right' })],
    },
    {
      name: 'Along the catwalks', shape: straight(90, { grade: 0.14 }), height: 6, river: 'under',
      landmarks: [{ name: 'rainforest-catwalk', at: 0.5, river: true, distance: 18 }],
      obstacles: [slalom({ costume: 'river-stake', from: 0.68, to: 0.94, count: 3, loss: 0.2 })],
      features: [moguls({ from: 0.36, to: 0.6, count: 4 })],
    },
    { name: 'Upper river', shape: sweep({ side: 'right', radius: 75, degrees: 120, grade: 0.12 }), height: 0, river: 'left', billboards: 2 },
    { name: 'To the lip', shape: straight(40, { grade: 0.1 }), height: 0, river: 'left' },
    {
      name: "The Devil's Throat", shape: waterfall(55, { grade: 0.62, curtain: true }), height: 0, river: 'none',
      landmarks: [{ name: 'horseshoe-cataract', at: 0.5, side: 'left', distance: 40 }],
    },
    {
      name: 'In the spray', shape: straight(45, { grade: 0.13 }), height: 0, river: 'left',
      obstacles: [peg({ costume: 'mossy-boulder', at: 0.25, line: 'right' }), peg({ costume: 'mossy-boulder', at: 0.5, line: 'left' }), peg({ costume: 'mossy-boulder', at: 0.75, line: 'center' })],
    },
    {
      // (The island in the middle of the falls: the field divides round it, two straight channels, mixed by three
      // boulders in the run-in, as Arno Old Bridge Run's bridge. Curving 40° round it, the leaders took the outside.)
      name: 'Round the island', shape: splitter({ side: 'right', degrees: 0, approach: 55, merge: 30, balance: { tipOffset: -0.6, left: { drag: 1.4, scrub: 1.4 }, right: { drag: 1.4, scrub: 1.4 } } }),
      around: 'river-island', height: 6, river: 'under',
      obstacles: [peg({ costume: 'mossy-boulder', at: 0.06, line: 'right' }), peg({ costume: 'mossy-boulder', at: 0.14, line: 'left' }), peg({ costume: 'mossy-boulder', at: 0.21, line: 'center' })],
    },
    { name: 'The lower falls', shape: plunge(40, { grade: 0.25, from: 0.14 }), height: 0, river: 'left' },
    { name: 'Run to the hairpin', shape: straight(50, { grade: 0.13 }), height: 0, river: 'left', billboards: 2 },
    { name: 'Boat landing hairpin', shape: hairpin({ side: 'left' }), height: 0, river: 'none' },
    {
      name: 'Through the rainforest', shape: sweep({ side: 'right', radius: 70, degrees: 130, grade: 0.15 }), height: 0, river: 'right',
      obstacles: [slalom({ costume: 'river-stake', from: 0.3, to: 0.7, count: 4, loss: 0.2 })],
    },
    { name: 'Last drop', shape: plunge(35, { grade: 0.28, from: 0.15 }), height: 0, river: 'right' },
    {
      name: 'To the landing', shape: straight(55, { grade: 0.15 }), height: 0, river: 'right',
      obstacles: [peg({ costume: 'mooring-pole', at: 0.25, line: 'left' }), peg({ costume: 'mooring-pole', at: 0.6, line: 'right' })],
    },
    { name: 'Finish', shape: runIn(), height: 0, river: 'right' },
  ],
});
