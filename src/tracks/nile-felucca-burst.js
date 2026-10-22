'use strict';

// Nile Felucca Burst: Rivers track 7, at a great river's cataract in the desert. Off a granite cliff, a
// banked turn down to the desert bank, over the cataract (a rapid between granite boulder islands), out on
// stilts among the white sails of the feluccas, along the palm bank and round a palm island.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'nile-felucca-burst',
  name: 'Nile Felucca Burst',
  family: 'river',
  difficulty: 'extreme',
  description: 'A great river\'s cataract in the desert: off a granite cliff, down the rapid between granite boulder islands, out on stilts among the white sails of the feluccas, desert on one bank and date palms on the other.',
  surface: 'ice',
  biome: 'desert',
  lighting: 'day',
  variants: ['sunset'],
  river: { palette: 'nile', side: 'right', width: 140, banks: 'rock' },
  coaster: { colours: { support: '#6a5a4a', rail: '#f4ecd8', tie: '#3a3028' } },
  signature: 'The cataract',
  start: { landmark: 'palm-grove', type: 'cliff', gate: 'stalls', shots: { countdown: 'chase', launch: 'overhead' } },
  finish: { landmark: 'river-dock' },
  designChanges: [
    'Built from the banked turn (not the crest start the plan had: on Colca it favoured the last starting places, on Mekong it matched other tracks\' first seconds) and the cataract, the library layout made for this track: a desert-bank straight, the cataract (a waterfall), a slalom between the boulder islands, a sweep flying out among the sails, S-bends along the palm bank, the hairpin, a spiral round a palm island, a short climb, a drop and the run-in.',
    'Desert on the track\'s bank, a palm grove on the far bank; the cliff start is granite (looks only). No pyramids or temples.',
    'The feluccas sail ahead of the leader where the track turns out over the river, so their sails show from the follow camera; the river\'s rapids are white only at the cataract, not all along the falling river (looks only).',
  ],
  opening: opening('banked-turn', {
    side: 'left',
    costumes: { block: 'stone-block', slalom: 'river-stake' },
    names: { plunge: 'Off the granite cliff', turn: 'Down to the desert bank' },
    dress: { plunge: { height: 0, river: 'right' }, turn: { height: 0, river: 'right' } },
  }),
  sections: layout('cataract', {
    costumes: { slalom: 'river-stake', peg: 'cairn', swipe: 'fisherman', parked: 'river-raft' },
    dress: {
      desertBank: { name: 'Desert bank', height: 0, river: 'right', landmarks: [{ name: 'palm-grove', at: 0.5, side: 'right', distance: 175 }] },
      cataract: { name: 'The cataract', height: 0, river: 'right', landmarks: [{ name: 'granite-islands', at: 0.5, river: true, distance: 25 }] },
      boulders: { name: 'Between the granite islands', height: 0, river: 'right', landmarks: [{ name: 'granite-islands', at: 0.5, river: true, distance: 10 }] },
      sails: { name: 'Out among the sails', height: 12, river: 'under', landmarks: [{ name: 'feluccas', at: 0.16, river: true, distance: 30 }, { name: 'feluccas', at: 0.3, river: true, distance: -24 }, { name: 'feluccas', at: 0.75, river: true, distance: -30 }] },
      palmBank: { name: 'Palm bank', height: 0, river: 'left', scenery: ['river-palms'] },
      brakingStraight: { name: 'Run to the hairpin', height: 0, river: 'left' },
      hairpin: { name: 'Fisherman hairpin', height: 0, river: 'none' },
      palmIsland: { name: 'Round the palm island', height: 0, river: 'right', scenery: ['river-palms'] },
      rise: { name: 'Up the bank', height: 0, river: 'right' },
      drop: { name: 'Down to the landing', height: 0, river: 'right' },
      lastStraight: { name: 'Run to the landing', height: 0, river: 'right', landmarks: [{ name: 'feluccas', at: 0.4, river: true, distance: 40 }] },
    },
  }),
});
