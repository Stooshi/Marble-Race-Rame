'use strict';

// Kopaonik Spins: a coaster spinning down Serbia's Kopaonik mountain. Off the lift hill
// below the botanist's mausoleum on the summit, a first spin down through the spruces, a
// drop through a slalom of fence posts onto the flower meadows, swoops past a shepherd and
// his sheep, a long sweep on high supports past a medieval monastery, a brown bear at the
// hairpin, a second spin round a wooden watermill and the run-in to the village square,
// where dancers in traditional dress turn in a kolo.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'kopaonik-spins',
  name: 'Kopaonik Spins',
  family: 'coaster',
  difficulty: 'extreme',
  description: 'A coaster spinning down Serbia\'s Kopaonik mountain: from the summit through spruce forest and flower meadows, past a medieval monastery, round a wooden watermill and into a village square where dancers turn in a kolo.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'day',
  coaster: { height: 16, colours: { support: '#2f5a8a', rail: '#e8e4dc', tie: '#3a3d44' } },
  signature: 'Watermill spin',
  start: { landmark: 'pancic-mausoleum', scenery: ['pines'], type: 'straight-lift', gate: 'trapdoor', shots: { countdown: 'chase', launch: 'side' } },
  finish: { landmark: 'kolo-village', billboards: 1, scenery: ['wooden-houses'] },
  designChanges: [
    'Built from the classic opening (the steep first drop off the summit, a pile-up of hay bales and a slalom of fence posts) and two spins, the library layout made for this track. The design\'s seven fixed sections are replaced by the layout, as decided for the coaster series; its landmark moments stay: the mausoleum on the summit behind the lift hill, the spin through the spruces, the meadow swoops with the shepherd and his sheep, the monastery sweep on high supports, the brown bear at the hairpin, the second spin round the watermill and the kolo in the village square.',
    'The meadow\'s slalom of fence posts is on the drop out of the first spin, onto the meadows, rather than in the swoops (the layouts keep slaloms on straight drops).',
    'No boost pad on the monastery sweep: on this layout the slowest marbles took it far more often than the fastest.',
    'The mausoleum is shown only as a plain stone tomb, with no radar station, as decided; the dancers and musicians are scenery in the square, never obstacles.',
  ],
  opening: opening('classic', {
    costumes: { block: 'hay-bale', slalom: 'fence-post' },
    names: { plunge: 'Lift hill and first drop' },
    dress: { plunge: { height: 20 } },
  }),
  sections: layout('two-spins', {
    costumes: { slalom: 'fence-post', swipe: 'grizzly', parked: 'horse-cart', peg: 'fence-post' },
    dress: {
      spin1: { name: 'Spruce spin', height: 18, scenery: ['pines'] },
      meadowDrop: { name: 'Down to the meadows', height: 8 },
      swoops: { name: 'Meadow swoops', height: 6, landmarks: [{ name: 'sheep-flock', at: 0.5, side: 'left', distance: 30 }] },
      sweep: { name: 'Monastery sweep', height: 30, landmarks: [{ name: 'stone-monastery', at: 0.5, side: 'right', distance: 55 }] },
      brakingStraight: { name: 'Run to the hairpin', height: 0 },
      hairpin: { name: 'Bear hairpin', height: 10 },
      spin2: { name: 'Watermill spin', height: 14, around: 'watermill' },
      lastStraight: { name: 'Run-in to the village', height: 3 },
    },
  }),
});
