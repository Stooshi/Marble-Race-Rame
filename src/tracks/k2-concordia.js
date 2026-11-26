'use strict';

// K2 Concordia: Peaks track 8, where two great glaciers meet below the steep pyramid of the peak. Off a rock
// prow in two chutes, a long straight along a dark moraine stripe like a road, the splitter at the junction (the
// track's big feature: two straight channels round the rock island where the glaciers meet), a wide sweep, an
// icefall step, the hairpin at the camp, S-bends and the run-in. Storm clouds breaking to sun.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'k2-concordia',
  name: 'K2 Concordia',
  family: 'peak',
  difficulty: 'extreme',
  description: 'Where two great glaciers meet below the steep pyramid of the peak: along a dark moraine stripe like a road, splitting round the rock island at the junction, a wide sweep, an icefall step and a camp hairpin.',
  surface: 'ice',
  biome: 'alpine',
  lighting: 'snow',
  variants: ['high-altitude'],
  peak: { palette: 'k2' },
  coaster: { style: 'alpine', colours: { support: '#7f868e', rail: '#e8eef4', tie: '#4f555e' } },
  signature: 'The junction',
  tvCameras: [
    { section: 'The junction', at: 0.95, side: 'left', distance: 10, height: 12 },
    { section: 'S-bends', at: 0.5, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'rock-island', type: 'cliff', gate: 'trapdoor', shots: { countdown: 'side', launch: 'overhead' } },
  finish: { landmark: 'peak-camp' },
  designChanges: [
    'Built from the split start and the glacier junction, the library layout made for this track (L96): a long straight along a moraine stripe (a peg and a stretch of rough stones that slows the leaders), the junction splitter (the track\'s big feature, Moses\'s rule of 27 Oct 2026: two straight channels round the rock island), a wide sweep, an icefall step (a peg), the hairpin at the camp, S-bends, a short climb over the medial moraine and a drop, and the run-in.',
    'The camp is flag-free; the summit is scenery only, far in the backdrop.',
  ],
  opening: opening('split-start', {
    names: { plunge: 'Off the rock prow' },
    dress: { after: { peak: { zone: 'ice' } } },
  }),
  sections: layout('glacier-junction', {
    costumes: { slalom: 'serac', peg: 'serac', swipe: 'falcon', parked: 'kick-sled' },
    dress: {
      moraine: { peak: { zone: 'ice' } },
      splitter: { peak: { zone: 'ice' }, around: 'mountain-hut', landmarks: [{ name: 'rock-island', at: 0.5, side: 'left', distance: 40 }] },
      sweep: { peak: { zone: 'ice' }, landmarks: [{ name: 'serac-field', at: 0.5, side: 'right', distance: 45 }] },
      icefall: { peak: { zone: 'ice' } },
      brakingStraight: { peak: { zone: 'snow' } },
      hairpin: { peak: { zone: 'snow' } },
      sBends: { peak: { zone: 'snow' } },
      rise: { peak: { zone: 'rock' } },
      drop: { peak: { zone: 'snow' } },
      lastStraight: { name: 'Past the tents', peak: { zone: 'snow' }, landmarks: [{ name: 'peak-camp', at: 0.5, side: 'right', distance: 22 }] },
    },
  }),
});
