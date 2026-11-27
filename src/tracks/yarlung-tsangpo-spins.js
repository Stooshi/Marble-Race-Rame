'use strict';

// Yarlung Tsangpo Spins: Canyon Series track 2, down the deepest gorge on Earth in Tibet. Out of a
// rock tunnel below a hillside monastery into the gorge, between grey walls with snow on their
// tops, under prayer flags strung from rim to rim, out over the rock on supports and back down,
// past a yak at the hairpin, round the great bend (a spiral and a quarter round a snow peak) and
// down to a Tibetan village by the river.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'yarlung-tsangpo-spins',
  name: 'Yarlung Tsangpo Spins',
  family: 'canyon',
  difficulty: 'extreme',
  description: 'Down the deepest gorge on Earth: out of a rock tunnel into the Yarlung Tsangpo canyon, under prayer flags strung from rim to rim, out over the rock and back down, and round the great bend, spiralling round a snow peak, to a Tibetan village by the river.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'day',
  canyon: { palette: 'himalaya', depth: 48, river: 'right' },
  coaster: { colours: { support: '#8a2a22', rail: '#f2ede2', tie: '#3a302a' } },
  signature: 'The great bend',
  tvCameras: [
    { section: 'The great bend', at: 0.8, side: 'left', distance: 10, height: 12 },
    { section: 'Over the rock', at: 0.8, side: 'left', distance: 10, height: 12 },
  ],
  start: { landmark: 'gompa', scenery: ['rocks'], type: 'spiral-tower', gate: 'paddle', shots: { countdown: 'front', launch: 'high-behind' } },
  finish: { landmark: 'tibetan-village' },
  designChanges: [
    'Built from the tunnel launch (out of a rock tunnel into the gorge) and great bend, the library layout made for this track.',
    'The great bend is a spiral and a quarter round a snow peak; the canyon\'s walls give way to the open hillside there, where the turns pass over each other.',
  ],
  opening: opening('tunnel-launch', {
    costumes: { block: 'mossy-boulder', slalom: 'mani-post' },
    names: { portal: 'To the gorge', tunnel: 'Rock tunnel' },
    tunnel: 'rock',
    dress: { portal: { height: 0 }, tunnel: { height: 0 } },
  }),
  sections: layout('great-bend', {
    costumes: { slalom: 'mani-post', peg: 'mani-post', swipe: 'musk-ox', parked: 'river-raft' },
    dress: {
      gorge: { name: 'Into the gorge', height: 0, landmarks: [{ name: 'chorten-row', at: 0.6, side: 'left', distance: 6 }] },
      flagRun: { name: 'Under the prayer flags', height: 0, overhead: ['prayer-flags'] },
      ledge: { name: 'Over the rock', height: 36, landmarks: [{ name: 'yak-herd', at: 0.5, side: 'left', rim: true, distance: 12 }] },
      dropIn: { name: 'Drop back in', height: 0 },
      brakingStraight: { name: 'Run to the hairpin', height: 0 },
      hairpin: { name: 'Yak hairpin', height: 0 },
      greatBend: { name: 'The great bend', height: 16, around: 'snow-peak' },
      slalomDrop: { name: 'Flag drop', height: 0 },
      lastStraight: { name: 'Run to the village', height: 0 },
    },
  }),
});
