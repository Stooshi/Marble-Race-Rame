'use strict';

// Tara River Spins: Canyon Series track 4, down the Tara River Canyon in Montenegro, the deepest
// in Europe. From a mountain hut on the rim, through rafting gates on the turquoise river, a spin
// in a whirlpool, the long run under the great concrete arch bridge high across the gorge, out
// over the pale limestone and back in, past a brown bear at the hairpin, to a rafting camp.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'tara-river-spins',
  name: 'Tara River Spins',
  family: 'canyon',
  difficulty: 'extreme',
  description: 'Down the deepest canyon in Europe: through rafting gates on the turquoise Tara, a whirlpool spin, under the great arch bridge high across the gorge, out over the pale limestone and back in, past a brown bear to a rafting camp.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'day',
  canyon: { palette: 'limestone', depth: 46, river: 'right' },
  coaster: { colours: { support: '#5f6a72', rail: '#f2f2ee', tie: '#3a3f44' } },
  signature: 'Under the arch bridge',
  start: { landmark: 'mountain-hut', scenery: ['pines'], type: 'straight-lift', gate: 'barrier', shots: { countdown: 'chase', launch: 'side' } },
  finish: { landmark: 'rafting-camp' },
  designChanges: [
    'Built from the banked first turn (a plunge off the lift hill into a steep banked turn) and rafting run, the library layout made for this track.',
    'The arch bridge is a stylised impression: one great concrete arch from wall to wall under a long deck on slender piers, high above the track.',
  ],
  opening: opening('banked-turn', {
    side: 'right',
    costumes: { block: 'mossy-boulder', slalom: 'slalom-gate' },
    names: { plunge: 'Start plunge', turn: 'Into the gorge' },
    dress: { plunge: { height: 0 }, turn: { height: 0 } },
  }),
  sections: layout('rafting-run', {
    costumes: { slalom: 'slalom-gate', peg: 'river-stake', swipe: 'black-bear', parked: 'river-raft' },
    dress: {
      gates: { name: 'Rafting gates', height: 0, landmarks: [{ name: 'river-rafts', at: 0.5, river: true }] },
      whirlpool: { name: 'Whirlpool spin', height: 10 },
      bridgeRun: { name: 'Under the arch bridge', height: 0, overhead: ['arch-bridge'] },
      sweep: { name: 'Limestone sweep', height: 32 },
      drop: { name: 'Drop back in', height: 0 },
      sBends: { name: 'Turquoise bends', height: 0 },
      brakingStraight: { name: 'Run to the hairpin', height: 0 },
      hairpin: { name: 'Bear hairpin', height: 0 },
      lastStraight: { name: 'Run to camp', height: 0 },
    },
  }),
});
