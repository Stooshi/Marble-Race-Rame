'use strict';

// Waimea Free Fall: Canyon Series track 14, through Waimea Canyon on Kauai, Hawaii. From a terraced
// lookout, out along a sweep over the green ridges, down between walls of red volcanic earth, the
// hairpin, then a free fall beside a long waterfall pouring off the rim with a rainbow in its spray,
// round a spin and down to coconut palms where the river reaches the sea.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'waimea-free-fall',
  name: 'Waimea Free Fall',
  family: 'canyon',
  difficulty: 'extreme',
  description: 'Through Waimea Canyon on Kauai, Hawaii: over green ridges and down between walls of red earth, then a free fall beside a long waterfall with a rainbow in its spray, down to palms where the river meets the sea.',
  surface: 'ice',
  biome: 'jungle',
  lighting: 'day',
  variants: ['rain'],
  canyon: { palette: 'waimea', depth: 50, river: 'right' },
  coaster: { colours: { support: '#6a4a3a', rail: '#f4ece2', tie: '#3a2a22' } },
  signature: 'The free fall',
  start: { landmark: 'ridge-lookout', scenery: ['rocks'], type: 'stepped-platform', gate: 'barrier', shots: { countdown: 'front', launch: 'overhead' } },
  finish: { landmark: 'coast-palms' },
  designChanges: [
    'Built from the classic start (a steep plunge, a pile-up, a slalom) and the long falls, the library layout made for this track: a sweep over the ridges, S-bends, the hairpin early, a straight to the lip, the long waterfall, a peg straight in the plunge pool, a spin and a last sweep.',
    'A new start type, the stepped platform: the gate on top of broad stone steps (looks only).',
    'The rainbow is see-through, in the waterfall\'s spray beside the track (looks only).',
    'Over the plunge pool and round the spin the track flies on trestles: the spin\'s last turn passes under the pool\'s stretch, where banks on the land would hide the follow camera.',
  ],
  opening: opening('classic', {
    costumes: { block: 'mossy-boulder', slalom: 'cairn' },
    dress: { plunge: { height: 0 } },
  }),
  sections: layout('long-falls', {
    mirror: true,
    costumes: { slalom: 'cairn', peg: 'cairn', swipe: 'falcon', parked: 'river-raft' },
    dress: {
      ridgeSweep: { name: 'Over the green ridges', height: 28 },
      sBends: { name: 'Red earth bends', height: 0 },
      brakingStraight: { name: 'Run to the hairpin', height: 0 },
      hairpin: { name: 'Falcon hairpin', height: 0 },
      toTheLip: { name: 'To the lip', height: 14 },
      longFall: { name: 'The free fall', height: 0, landmarks: [{ name: 'long-waterfall', at: 0.4, side: 'left', rim: true, distance: -2 }] },
      plungePool: { name: 'Over the plunge pool', height: 12 },
      spin: { name: 'Canyon spin', height: 12 },
      sweep2: { name: 'Last sweep', height: 0 },
      lastStraight: { name: 'Run to the sea', height: 0 },
    },
  }),
});
