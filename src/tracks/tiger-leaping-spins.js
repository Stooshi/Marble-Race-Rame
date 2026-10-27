'use strict';

// Tiger Leaping Spins: Canyon Series track 13, down Tiger Leaping Gorge in Yunnan, China, one of the
// deepest river gorges in the world. From the roof of a guesthouse on the high trail, down twin
// chutes into the gorge, along the roaring rapids under snow peaks, past the great rock in the river
// where a tiger is said to have leapt across, down a cascade of white water and out along the high
// trail, round the whirlpool and down to a viewing platform at the gorge's end.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'tiger-leaping-spins',
  name: 'Tiger Leaping Spins',
  family: 'canyon',
  difficulty: 'extreme',
  description: 'Down Tiger Leaping Gorge in Yunnan, China: along roaring rapids under snow peaks, past the great rock in the river where a tiger is said to have leapt across, down a white-water cascade and out along the high trail.',
  surface: 'ice',
  biome: 'alpine',
  lighting: 'day',
  variants: ['fog'],
  canyon: { palette: 'jinsha', depth: 52, river: 'left' },
  coaster: { colours: { support: '#6a665e', rail: '#efece4', tie: '#3a3833' } },
  signature: 'The tiger rock',
  tvCameras: [
    { section: 'The tiger rock', at: 0.8, side: 'left', distance: 10, height: 12 },
    { section: 'The whirlpool', at: 0.8, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'trail-guesthouse', scenery: ['pines'], type: 'rooftop', gate: 'stalls', shots: { countdown: 'side', launch: 'look-back' } },
  finish: { landmark: 'gorge-viewpoint' },
  designChanges: [
    'Built from the split start (twin chutes into the gorge) and the rapids gorge, the library layout made for this track: a mogul straight of rapids, S-bends, a peg straight past the tiger rock, a cascade in white water, a long sweep out along the high trail, the hairpin, the whirlpool (a spiral) and a slalom drop. Two pegs at the start of the rapids mix the field out of the twin chutes.',
    'The tiger rock stands out on the river, beside the track (looks only).',
  ],
  opening: opening('split-start', {
    costumes: { block: 'mossy-boulder', slalom: 'mani-post' },
    dress: { plunge: { height: 0 }, chutes: { height: 0 }, after: { height: 0 } },
  }),
  sections: layout('rapids-gorge', {
    costumes: { slalom: 'river-stake', peg: 'cairn', swipe: 'falcon', parked: 'river-raft' },
    dress: {
      rapids: { name: 'The rapids', height: 0, landmarks: [{ name: 'snow-peak', at: 0.5, side: 'right', rim: true, distance: 40 }] },
      sBends: { name: 'Gorge bends', height: 0 },
      rockRun: { name: 'The tiger rock', height: 0, landmarks: [{ name: 'tiger-rock', at: 0.5, river: true }] },
      cascade: { name: 'Down the cascade', height: 0 },
      pool: { name: 'Below the cascade', height: 0 },
      highTrail: { name: 'The high trail', height: 28 },
      brakingStraight: { name: 'Run to the hairpin', height: 0 },
      hairpin: { name: 'Falcon hairpin', height: 0 },
      whirlpool: { name: 'The whirlpool', height: 0 },
      slalomDrop: { name: 'Stake slalom', height: 0 },
      lastStraight: { name: 'Run to the viewpoint', height: 0 },
    },
  }),
});
