'use strict';

// Hells Burst: Canyon Series track 6, through Hells Canyon on the Idaho–Oregon border, the deepest
// in North America. From a fire lookout on the rim, out over the dark basalt on timber trestles and
// down to the whitewater, past jet boats and columns of basalt, a black bear at the hairpin and
// bighorn sheep on a ledge, over a crest and out on the trestles again, to a ranch by the river.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'hells-burst',
  name: 'Hells Burst',
  family: 'canyon',
  difficulty: 'extreme',
  description: 'Through Hells Canyon, the deepest in North America: out over the dark basalt on timber trestles, down to the whitewater past jet boats and basalt columns, a black bear and bighorn sheep, to a ranch by the river.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'day',
  canyon: { palette: 'basalt', depth: 44, river: 'right' },
  coaster: { style: 'timber', colours: { support: '#6a4a30', rail: '#e8dcc0', tie: '#3a2a20' } },
  signature: 'Whitewater run',
  tvCameras: [
    { section: 'Whitewater run', at: 0.8, side: 'left', distance: 10, height: 12 },
    { section: 'Bear hairpin', at: 0.4, side: 'left', distance: 10, height: 12 },
  ],
  start: { landmark: 'fire-lookout', scenery: ['rocks'], type: 'elevator', gate: 'stalls', shots: { countdown: 'chase', launch: 'high-behind' } },
  finish: { landmark: 'river-ranch' },
  designChanges: [
    'Built from the split-and-merge start (the field divides round a basalt island just below the gate) and basalt gorge, the library layout made for this track.',
    'The trestle climb-outs stand on timber trestle bents (coaster style timber).',
  ],
  opening: opening('split-start', {
    costumes: { block: 'mossy-boulder', slalom: 'river-stake' },
    names: { plunge: 'Start plunge', chutes: 'Basalt island', after: 'Into the gorge' },
    dress: { plunge: { height: 0 }, chutes: { height: 0 }, after: { height: 0 } },
  }),
  sections: layout('basalt-gorge', {
    costumes: { slalom: 'river-stake', peg: 'river-stake', swipe: 'black-bear', parked: 'river-raft' },
    dress: {
      trestle1: { name: 'Trestle sweep', height: 32 },
      drop: { name: 'Down to the river', height: 0 },
      whitewater: { name: 'Whitewater run', height: 0, landmarks: [{ name: 'jet-boat', at: 0.5, river: true }] },
      columns: { name: 'Basalt bends', height: 0, landmarks: [{ name: 'basalt-columns', at: 0.5, side: 'left', distance: 10 }] },
      rapids: { name: 'Below the rapids', height: 0 },
      brakingStraight: { name: 'Run to the hairpin', height: 0 },
      hairpin: { name: 'Bear hairpin', height: 0 },
      crest: { name: 'Over the crest', height: 0, landmarks: [{ name: 'bighorn-sheep', at: 0.5, side: 'left', rim: true, distance: 2 }] },
      trestle2: { name: 'Second trestle', height: 24 },
      drop2: { name: 'Last drop', height: 0 },
      lastStraight: { name: 'Run to the ranch', height: 0 },
    },
  }),
});
