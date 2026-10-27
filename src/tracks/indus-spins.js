'use strict';

// Indus Spins: Canyon Series track 8, along the Indus gorge below Nanga Parbat in Pakistan. From a
// hill fort, out along a ledge high on the cliff face below the mountain road, decorated trucks on
// the rim, then a plunge to the river, river bends below the giant peak, a falcon at the hairpin, a
// spin and a drop to a village of orchards.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'indus-spins',
  name: 'Indus Spins',
  family: 'canyon',
  difficulty: 'extreme',
  description: 'Along the Indus gorge below Nanga Parbat: out along a narrow ledge high on the cliff face, painted trucks on the mountain road above, then a plunge to the river and its bends below the giant peak, to a village of orchards.',
  surface: 'ice',
  biome: 'desert',
  lighting: 'day',
  canyon: { palette: 'karakoram', depth: 46, river: 'right' },
  coaster: { colours: { support: '#6e6254', rail: '#f2ede2', tie: '#3a3430' } },
  signature: 'The cliff ledge',
  tvCameras: [
    { section: 'Ledge bend', at: 0.8, side: 'left', distance: 10, height: 12 },
    { section: 'Gorge spin', at: 0.8, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'hill-fort', scenery: ['rocks'], type: 'cliff', gate: 'barrier', shots: { countdown: 'above', launch: 'look-back' } },
  finish: { landmark: 'trail-village' },
  designChanges: [
    'Built from the classic start (the steep plunge, its pile-up and slalom) and cliff ledge, the library layout made for this track.',
    'The ledge is the track on its supports halfway up the canyon wall; the decorated trucks drive the road on the rim above.',
  ],
  opening: opening('classic', {
    costumes: { block: 'mossy-boulder', slalom: 'cairn' },
    names: { plunge: 'Start plunge' },
    dress: { plunge: { height: 0 } },
  }),
  sections: layout('cliff-ledge', {
    costumes: { slalom: 'cairn', peg: 'cairn', swipe: 'falcon', parked: 'river-raft' },
    dress: {
      ledge: { name: 'The cliff ledge', height: 26, landmarks: [{ name: 'jingle-truck', at: 0.5, side: 'left', rim: true, distance: 3 }] },
      ledgeBend: { name: 'Ledge bend', height: 26 },
      plunge: { name: 'Plunge to the river', height: 0 },
      riverBends: { name: 'River bends', height: 0, landmarks: [{ name: 'giant-peak', at: 0.5, side: 'left', distance: 380 }] },
      brakingStraight: { name: 'Run to the hairpin', height: 0 },
      hairpin: { name: 'Falcon hairpin', height: 0 },
      spin: { name: 'Gorge spin', height: 14 },
      drop: { name: 'Drop', height: 0 },
      lastStraight: { name: 'Run to the orchards', height: 0 },
    },
  }),
});
