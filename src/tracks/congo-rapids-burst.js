'use strict';

// Congo Rapids Burst: Rivers track 8, at the rainforest rapids of a great river. Off broad stone steps,
// down three rapids one after another, out over the white water between the fishermen's tall wooden
// tripods, along the forest bank and round to the dugout canoes at the landing.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'congo-rapids-burst',
  name: 'Congo Rapids Burst',
  family: 'river',
  difficulty: 'extreme',
  description: 'The rainforest rapids of a great river: down three rapids one after another, out over the white water between the fishermen\'s tall wooden tripods and their basket traps, along the forest bank to the dugout canoes.',
  surface: 'ice',
  biome: 'jungle',
  lighting: 'day',
  variants: ['fog'],
  river: { palette: 'congo', side: 'left', width: 160, banks: 'rock' },
  coaster: { colours: { support: '#5a4030', rail: '#efe4cc', tie: '#33261c' } },
  signature: 'Between the tripods',
  start: { landmark: 'parrot-tree', type: 'stepped-platform', gate: 'paddle', shots: { countdown: 'side', launch: 'high-behind' } },
  finish: { landmark: 'river-dock' },
  designChanges: [
    'Built from the staggered drop (the family\'s second) and the rapids ladder, the library layout made for this track: a straight above the rapids, three short rapid drops with pools between, a slalom flying out over the white water between the tripods, a forest sweep, the hairpin, S-bends past the dugouts, a spiral and the run-in.',
    'Its first bend turns right (Mississippi Steamer Run, the other staggered drop, turns left first). The fishermen\'s tripods stand in the river either side of the slalom, never in the track (looks only).',
    'The rapids ladder and the white-water slalom fly 10 to 12 m over the river (it runs under them, white where it falls), so the water and the tripods show from the follow camera; the tripods stand 16 m out either side, ahead of the leader; the water darker olive-brown with wavelets, so it never reads as the earth banks (looks only).',
  ],
  opening: opening('staggered-drop', {
    costumes: { block: 'log', slalom: 'river-stake' },
    names: { plunge: 'Off the steps' },
    dress: { plunge: { height: 0, river: 'left' } },
  }),
  sections: layout('rapids-ladder', {
    costumes: { slalom: 'river-stake', peg: 'mooring-pole', swipe: 'hippo', parked: 'river-raft' },
    dress: {
      aboveRapids: { name: 'Above the rapids', height: 10, river: 'under' },
      rapid1: { name: 'First rapid', height: 10, river: 'under' },
      pool1: { name: 'First pool', height: 10, river: 'under' },
      rapid2: { name: 'Second rapid', height: 10, river: 'under', landmarks: [{ name: 'fishing-tripods', at: 0.5, river: true, distance: 30 }] },
      pool2: { name: 'Second pool', height: 10, river: 'under' },
      rapid3: { name: 'Third rapid', height: 10, river: 'under' },
      whiteWater: { name: 'Between the tripods', height: 12, river: 'under', landmarks: [{ name: 'fishing-tripods', at: 0.1, river: true, distance: 16 }, { name: 'fishing-tripods', at: 0.45, river: true, distance: -16 }, { name: 'fishing-tripods', at: 0.8, river: true, distance: 16 }] },
      forestSweep: { name: 'Forest sweep', height: 0, river: 'left' },
      brakingStraight: { name: 'Run to the hairpin', height: 0, river: 'left' },
      hairpin: { name: 'Hippo hairpin', height: 0, river: 'none' },
      landingBends: { name: 'Past the dugouts', height: 0, river: 'right', landmarks: [{ name: 'dugout-canoes', at: 0.5, river: true, distance: 30 }] },
      spin: { name: 'Forest spiral', height: 0, river: 'right' },
      lastStraight: { name: 'Run to the landing', height: 0, river: 'right', landmarks: [{ name: 'dugout-canoes', at: 0.4, river: true, distance: 25 }] },
    },
  }),
});
