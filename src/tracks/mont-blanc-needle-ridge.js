'use strict';

// Mont Blanc Needle Ridge: Peaks track 3 (test five), the granite needles above the great glacier. Out of a
// cable-car cabin at a needle-top station, the classic plunge, then along a knife-edge snow ridge on high
// supports with drops on both sides, the plunge off the ridge onto the glacier, S-bends and a wide double sweep
// down it under the cable car, the hairpin, and over a moraine to the run-in.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'mont-blanc-needle-ridge',
  name: 'Mont Blanc Needle Ridge',
  family: 'peak',
  difficulty: 'extreme',
  description: 'The granite needles above the great glacier in the Alps: out of a cable-car cabin, along a knife-edge snow ridge with drops on both sides, the plunge onto the glacier and a wide double sweep down it under the cable car, in the alpenglow.',
  surface: 'ice',
  biome: 'alpine',
  lighting: 'sunset',
  variants: ['day', 'high-altitude'],
  peak: { palette: 'mont-blanc' },
  coaster: { style: 'alpine', colours: { support: '#8a7166', rail: '#eef2f6', tie: '#4f4a47' } },
  signature: 'The ridge',
  start: { landmark: 'granite-needles', type: 'gondola', gate: 'barrier', shots: { countdown: 'side', launch: 'low-chase' } },
  finish: { landmark: 'pass-cairn' },
  designChanges: [
    'Built from the classic opening and the needle ridge, the library layout made for this track (L90): the ridge traverse (two pegs and a slalom), a slalom drop off the ridge (five gates), S-bends (a peg), a double sweep down the glacier (a peg), the hairpin, a short climb over the moraine and a drop, and the run-in.',
    'The ridge flies 14 m up on high supports held by cable stays, the land falling away steeply on both sides of it (looks only).',
    'The last straight 110 m (it was 100 m: the winner took 47.9 s, under the 48 s floor; now 48.3 s).',
  ],
  opening: opening('classic', {
    costumes: { block: 'chamois', slalom: 'route-flag' },
    names: { plunge: 'Off the station' },
  }),
  sections: layout('needle-ridge', {
    mirror: true,
    costumes: { slalom: 'route-flag', peg: 'cairn', swipe: 'stag', parked: 'piste-groomer' },
    dress: {
      ridge: { name: 'The ridge', height: 14, peak: { ridge: true, zone: 'snow' }, landmarks: [{ name: 'granite-needles', at: 0.5, side: 'left', distance: 160 }] },
      hairpin: { name: 'Corniced hairpin', peak: { zone: 'snow' } },
      offRidge: { peak: { zone: 'snow' } },
      glacier1: { name: 'Glacier sweep', peak: { zone: 'ice' }, overhead: ['cable-car'] },
      glacier2: { peak: { zone: 'ice' }, landmarks: [{ name: 'granite-needles', at: 0.4, side: 'right', distance: 180 }] },
      moraine: { peak: { zone: 'rock' } },
      drop: { peak: { zone: 'rock' }, scenery: ['pines'] },
      sBends: { name: 'Moraine S-bends', peak: { zone: 'rock' }, scenery: ['pines'] },
      lastStraight: { peak: { zone: 'rock' }, landmarks: [{ name: 'pass-cairn', at: 0.6, side: 'left', distance: 14 }] },
    },
  }),
});
