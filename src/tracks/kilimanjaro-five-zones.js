'use strict';

// Kilimanjaro Five Zones: Peaks track 2 (test five), Africa's highest mountain. From an ice terrace below the
// crater's ice cliffs, down the mountain's climate zones in one run above a sea of clouds at sunrise: S-bends on
// the ice, a long sweep across the alpine desert, a slalom among giant groundsels on the moorland, a spiral
// through the heath and a dive into the cloud forest. No sign or cairn at the summit, nothing on it.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'kilimanjaro-five-zones',
  name: 'Kilimanjaro Five Zones',
  family: 'peak',
  difficulty: 'extreme',
  description: 'Africa\'s highest mountain at sunrise, above a sea of clouds: from the crater\'s ice cliffs down through its climate zones in one run, the ice, the alpine desert, the moorland of giant groundsels, the heath and the cloud forest.',
  surface: 'snow',
  biome: 'alpine',
  lighting: 'dawn',
  variants: ['day'],
  peak: { palette: 'kilimanjaro' },
  coaster: { style: 'alpine', colours: { support: '#6a5f58', rail: '#eef2f6', tie: '#4a423c' } },
  signature: 'Groundsel slalom',
  tvCameras: [
    { section: 'Groundsel slalom', at: 0.8, side: 'left', distance: 10, height: 12 },
    { section: 'Forest hairpin', at: 0.4, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'crater-ice-cliffs', type: 'stepped-platform', gate: 'stalls', shots: { countdown: 'front', launch: 'side' } },
  finish: { landmark: 'giant-groundsels', scenery: ['sea-of-clouds'] },
  designChanges: [
    'Built from the funnel drop and the zone descent, the library layout made for this track (L92): S-bends on the ice, a long sweep across the alpine desert (two pegs), a slalom straight among giant groundsels (four gates), a spiral through the heath, a dive into the forest, the hairpin, a forest sweep (a peg) and the run-in.',
    'Each zone has its own ground colours and what grows there (looks only); a sea of clouds lies over the far valleys.',
  ],
  opening: opening('funnel-drop', {
    costumes: { block: 'giant-snowball', slalom: 'route-flag' },
    names: { plunge: 'Off the ice terrace' },
    dress: { plunge: { peak: { zone: 'ice' } } },
  }),
  sections: layout('zone-descent', {
    costumes: { slalom: 'groundsel', peg: 'groundsel', swipe: 'falcon', parked: 'safari-jeep' },
    dress: {
      iceTerrace: { peak: { zone: 'ice' } },
      ice: { peak: { zone: 'ice' }, landmarks: [{ name: 'crater-ice-cliffs', at: 0.5, side: 'right', distance: 110 }] },
      desert: { peak: { zone: 'alpine-desert' } },
      moorland: { peak: { zone: 'moorland' }, landmarks: [{ name: 'giant-groundsels', at: 0.5, side: 'left', distance: 18 }] },
      heath: { peak: { zone: 'heath' } },
      forest: { peak: { zone: 'cloud-forest' } },
      brakingStraight: { peak: { zone: 'cloud-forest' } },
      hairpin: { name: 'Forest hairpin', peak: { zone: 'cloud-forest' } },
      sweep2: { peak: { zone: 'cloud-forest' } },
      lastStraight: { name: 'Last straight', peak: { zone: 'heath' } },
    },
  }),
});
