'use strict';

// Mekong Market Spins: Rivers track 2, through a floating market on a great river. Off a moored
// river boat's deck, along the palm-lined bank, skimming low between boats heaped with fruit, under a long
// pier, a spin past stilt houses, and over a line of floats to the temple on the bank.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'mekong-market-spins',
  name: 'Mekong Market Spins',
  family: 'river',
  difficulty: 'extreme',
  description: 'A floating market on a great river: off a moored boat\'s deck, skimming low between boats heaped with fruit, under a long pier, a spin past stilt houses, and over a line of floats to the temple roofs on the bank.',
  surface: 'ice',
  biome: 'jungle',
  lighting: 'day',
  variants: ['sunset'],
  river: { palette: 'mekong', side: 'right', width: 130, banks: 'sand' },
  coaster: { colours: { support: '#6a4428', rail: '#f2e6c8', tie: '#3a2a1e' } },
  signature: 'The floating market',
  start: { landmark: 'wat-roofs', scenery: ['river-palms'], type: 'river-boat', gate: 'stalls', shots: { countdown: 'front', launch: 'high-behind' } },
  finish: { landmark: 'longtail-boat' },
  designChanges: [
    'Built from the crest start (off the river boat\'s deck, over its gangway) and the market maze, the library layout made for this track: S-bends along the bank, a long slalom low over the water among the boats, a peg under a pier, a sweep along the market bank, the hairpin, a spin, pegs past a line of floats and the run-in.',
    'The market boats float on the river beside the slalom; the slalom poles are the boats\' mooring poles (looks only).',
  ],
  opening: opening('crest-start', {
    costumes: { block: 'wooden-crate', slalom: 'river-stake' },
    names: { plunge: 'Off the boat', climb: 'Over the gangway', drop: 'Down to the bank' },
    dress: { plunge: { height: 0, river: 'right' }, climb: { height: 0, river: 'right' }, drop: { height: 0, river: 'right' } },
  }),
  sections: layout('market-maze', {
    mirror: true,
    costumes: { slalom: 'mooring-pole', peg: 'river-stake', swipe: 'fisherman', parked: 'river-raft' },
    dress: {
      bankBends: { name: 'Along the bank', height: 0, river: 'left', scenery: ['river-palms', 'stilt-houses'] },
      boats: { name: 'The floating market', height: 7, river: 'under', landmarks: [{ name: 'market-boats', at: 0.3, river: true, distance: 14 }, { name: 'market-boats', at: 0.75, river: true, distance: 14 }, { name: 'longtail-boat', at: 0.5, river: true, distance: 32 }] },
      underPier: { name: 'Under the pier', height: 0, river: 'left', landmarks: [{ name: 'longtail-boat', at: 0.5, river: true, distance: 10 }] },
      spin: { name: 'Stilt-house spin', height: 0, river: 'left', scenery: ['stilt-houses'] },
      bankSweep: { name: 'Market bank', height: 0, river: 'right', scenery: ['market-stalls', 'river-palms'] },
      brakingStraight: { name: 'Run to the hairpin', height: 0, river: 'right' },
      hairpin: { name: 'Fisherman hairpin', height: 0, river: 'right' },
      pontoon: { name: 'Over the floats', height: 0, river: 'right', landmarks: [{ name: 'pontoon-floats', at: 0.6, river: true, distance: 10 }] },
      lastStraight: { name: 'Run to the temple', height: 0, river: 'right', scenery: ['river-palms'], landmarks: [{ name: 'wat-roofs', at: 0.4, side: 'left', distance: 26 }] },
    },
  }),
});
