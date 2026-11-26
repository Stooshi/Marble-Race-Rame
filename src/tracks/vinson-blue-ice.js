'use strict';

// Vinson Blue Ice: Peaks track 5 (test five), Antarctica's highest mountain range. Down the loading ramp of a ski
// plane parked on the glacier runway, a peg drop between ice pinnacles, a long open double sweep over wind-polished
// blue ice, a slalom between dark nunataks, the hairpin, a straight over sastrugi, over a drift and a drop, and a
// spiral round a flag-free camp, the sun circling low all "night".
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'vinson-blue-ice',
  name: 'Vinson Blue Ice',
  family: 'peak',
  difficulty: 'extreme',
  description: 'Antarctica\'s highest range under the midnight sun: off a ski plane on a glacier runway, a long open sweep over wind-polished blue ice, a slalom between dark nunataks, a straight over sastrugi and a spiral round the camp.',
  surface: 'ice',
  biome: 'arctic',
  lighting: 'midnight-sun',
  variants: ['high-altitude'],
  peak: { palette: 'vinson' },
  coaster: { style: 'alpine', colours: { support: '#3a3633', rail: '#eef2f6', tie: '#2b2826' } },
  signature: 'Nunatak slalom',
  tvCameras: [
    { section: 'Nunatak slalom', at: 0.8, side: 'left', distance: 10, height: 12 },
    { section: 'Spiral round the camp', at: 0.6, side: 'left', distance: 10, height: 12 },
  ],
  start: { landmark: 'ski-plane', type: 'ski-plane', gate: 'stalls', shots: { countdown: 'above', launch: 'overhead' } },
  finish: { landmark: 'peak-camp' },
  designChanges: [
    'Built from the peg drop and the blue-ice plain, the library layout made for this track (L91): a long open double sweep (a peg), a slalom between nunataks (five gates: the luck the peg drop\'s waves need further on), the hairpin, a straight over sastrugi (moguls), a short climb and a drop, a spiral round the camp and the run-in.',
    'The ice pinnacles of the peg drop are seracs; the nunataks are the slalom poles (looks only).',
  ],
  opening: opening('peg-drop', {
    costumes: { peg: 'serac' },
    names: { plunge: 'Down the ramp' },
  }),
  sections: layout('blue-ice-plain', {
    costumes: { slalom: 'nunatak', peg: 'serac', swipe: 'camera-crane', parked: 'snowmobile' },
    dress: {
      sweep1: { peak: { zone: 'ice' } },
      sweep2: { peak: { zone: 'ice' }, landmarks: [{ name: 'nunataks', at: 0.5, side: 'right', distance: 90 }] },
      nunataks: { peak: { zone: 'ice' }, landmarks: [{ name: 'nunataks', at: 0.6, side: 'right', distance: 80 }] },
      brakingStraight: { peak: { zone: 'snow' } },
      hairpin: { name: 'Drift hairpin', peak: { zone: 'snow' } },
      sastrugi: { peak: { zone: 'snow' } },
      rise: { peak: { zone: 'snow' } },
      drop: { peak: { zone: 'ice' } },
      campSpin: { peak: { zone: 'snow' }, landmarks: [{ name: 'peak-camp', at: 0.5, side: 'right', distance: 30 }] },
      lastStraight: { peak: { zone: 'snow' }, landmarks: [{ name: 'ski-plane', at: 0.4, side: 'left', distance: 24 }] },
    },
  }),
});
