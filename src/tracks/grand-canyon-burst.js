'use strict';

// Grand Canyon Burst: the first Canyon Series track. From a stone lookout on the South Rim the
// field bursts over the edge and down into the canyon, along the floor beside the green river
// between walls of red, orange and cream rock, climbs out over the rock on trestles at the sweep
// and drops back in, swings round the horseshoe bend under a glass skywalk on the rim, past a
// peregrine falcon at the hairpin, to a camp of cabins at the river's edge.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'grand-canyon-burst',
  name: 'Grand Canyon Burst',
  family: 'canyon',
  difficulty: 'extreme',
  description: 'Over the South Rim and down into the Grand Canyon: along the river between layered red walls, out over the rock on trestles and back in, round the horseshoe bend beneath a glass skywalk, to a camp of cabins at the water\'s edge.',
  surface: 'ice',
  biome: 'desert',
  lighting: 'day',
  canyon: { palette: 'grand-canyon', depth: 42, river: 'left' },
  coaster: { colours: { support: '#7a4a2c', rail: '#e8dcc4', tie: '#4a3426' } },
  signature: 'Horseshoe Bend',
  tvCameras: [
    { section: 'Horseshoe Bend', at: 0.8, side: 'left', distance: 10, height: 12 },
    { section: 'Trestle climb', at: 0.8, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'rim-lookout', scenery: ['rocks'], type: 'cliff', gate: 'trapdoor', shots: { countdown: 'above', launch: 'low-chase' } },
  finish: { landmark: 'river-camp' },
  designChanges: [
    'Built from the staggered gate drop (the field let go from the rim in waves, down the plunge into the canyon) and horseshoe bend, the library layout made for this track.',
    'The glass horseshoe bridge is a generic glass skywalk on the rim, with no attraction\'s name on it.',
  ],
  opening: opening('staggered-drop', {
    costumes: { block: 'mossy-boulder', slalom: 'cairn' },
    names: { plunge: 'Over the rim' },
    dress: { plunge: { height: 0 } },
  }),
  sections: layout('horseshoe-bend', {
    costumes: { slalom: 'cairn', peg: 'cairn', swipe: 'falcon', parked: 'river-raft' },
    dress: {
      riverRun: { name: 'River run', height: 0, landmarks: [{ name: 'mule-train', at: 0.55, side: 'right', distance: 6 }] },
      rapids: { name: 'Over the rapids', height: 0 },
      climbOut: { name: 'Trestle climb', height: 40, overhead: ['condor'] },
      dropIn: { name: 'Drop back in', height: 0 },
      horseshoe: { name: 'Horseshoe Bend', height: 0, landmarks: [{ name: 'glass-skywalk', at: 0.5, side: 'left', rim: true, distance: 2 }] },
      brakingStraight: { name: 'Run to the hairpin', height: 0 },
      hairpin: { name: 'Falcon hairpin', height: 0 },
      slalomDrop: { name: 'Cairn drop', height: 0 },
      sweep2: { name: 'Rapids sweep', height: 12 },
      lastStraight: { name: 'Run to camp', height: 0, landmarks: [{ name: 'river-rafts', at: 0.4, river: true }] },
    },
  }),
});
