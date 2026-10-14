'use strict';

// Colca Spin: Canyon Series track 3, through the Colca Canyon in the Peruvian Andes. From the white
// church of a canyon village, out high on supports where Andean condors circle, down into the
// canyon and down its ancient farming terraces step by step, past llamas, a condor at the hairpin
// and a viewpoint on the rim, to a village of stone houses by the river.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'colca-spin',
  name: 'Colca Spin',
  family: 'canyon',
  difficulty: 'extreme',
  description: 'Through the Colca Canyon in the Andes: high on supports where condors circle, down into the canyon and step by step down its ancient terraces, past llamas and a condor viewpoint on the rim, to a village of stone houses by the river.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'day',
  canyon: { palette: 'andes', depth: 44, river: 'left' },
  coaster: { colours: { support: '#5a6a3a', rail: '#f2ede2', tie: '#3a302a' } },
  signature: 'Condor sweep',
  start: { landmark: 'andean-church', scenery: ['pasture'], type: 'curving-lift', gate: 'stalls', shots: { countdown: 'side', launch: 'overhead' } },
  finish: { landmark: 'andean-village' },
  designChanges: [
    'Built from the staggered gate drop (the field let go in waves into the canyon) and terrace steps, the library layout made for this track. On the crest start the last four starting places won too seldom (16.6% of 3,000 races).',
    'The terraces are stone steps across the track (the kit\'s steps), with green terraced fields stepping down the canyon walls on the ledges.',
  ],
  opening: opening('staggered-drop', {
    costumes: { block: 'mossy-boulder', slalom: 'cairn' },
    names: { plunge: 'Into the canyon' },
    dress: { plunge: { height: 0 } },
  }),
  sections: layout('terrace-steps', {
    mirror: true,
    costumes: { slalom: 'cairn', peg: 'cairn', swipe: 'falcon', parked: 'river-raft' },
    dress: {
      highSweep: { name: 'Condor sweep', height: 34, overhead: ['condor'], landmarks: [{ name: 'condor-viewpoint', at: 0.55, side: 'right', rim: true, distance: 4 }] },
      drop: { name: 'Drop into the canyon', height: 0 },
      terraces: { name: 'Terrace steps', height: 0, landmarks: [{ name: 'andean-terraces', at: 0.5, side: 'right', distance: 6 }] },
      sBends: { name: 'River bends', height: 0, landmarks: [{ name: 'llama-herd', at: 0.5, side: 'right', distance: 5 }] },
      brakingStraight: { name: 'Run to the hairpin', height: 0 },
      hairpin: { name: 'Condor hairpin', height: 0 },
      slalomDrop: { name: 'Cairn drop', height: 0 },
      sweep2: { name: 'Canyon sweep', height: 18 },
      lastStraight: { name: 'Run to the village', height: 0 },
    },
  }),
});
