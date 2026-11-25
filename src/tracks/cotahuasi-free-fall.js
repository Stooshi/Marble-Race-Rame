'use strict';

// Cotahuasi Free Fall: Canyon Series track 9, through the Cotahuasi Canyon in Peru, one of the
// deepest on Earth. From a village church, high on supports among giant puya plants on the rim,
// then the free fall: a waterfall drop beside a tall waterfall into the canyon, through the pool
// below, a hawk at the hairpin and a cairn drop, to a village of stone houses.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'cotahuasi-free-fall',
  name: 'Cotahuasi Free Fall',
  family: 'canyon',
  difficulty: 'extreme',
  description: 'Through the Cotahuasi Canyon in Peru, one of the deepest on Earth: high among giant puya plants, then the free fall beside a tall waterfall into the canyon, through the pool below and down to a village of stone houses.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'sunset',
  canyon: { palette: 'andes', depth: 50, river: 'right' },
  coaster: { colours: { support: '#7a5a3a', rail: '#f2ede2', tie: '#3a302a' } },
  signature: 'The free fall',
  tvCameras: [
    { section: 'The free fall', at: 0.8, side: 'right', distance: 6, height: 12 },
    { section: 'Hawk hairpin', at: 0.4, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'andean-church', scenery: ['rocks'], type: 'elevator', gate: 'trapdoor', shots: { countdown: 'front', launch: 'side' } },
  finish: { landmark: 'andean-village' },
  designChanges: [
    'Built from the tunnel launch (out of a rock tunnel into the canyon) and free fall, the library layout made for this track.',
    'The free fall is the kit\'s waterfall drop, beside a tall waterfall pouring off the canyon wall.',
  ],
  opening: opening('tunnel-launch', {
    costumes: { block: 'mossy-boulder', slalom: 'cairn' },
    names: { portal: 'To the tunnel', tunnel: 'Rock tunnel' },
    tunnel: 'rock',
    dress: { portal: { height: 0 }, tunnel: { height: 0 } },
  }),
  sections: layout('free-fall', {
    costumes: { slalom: 'cairn', peg: 'cairn', swipe: 'falcon', parked: 'river-raft' },
    dress: {
      highSweep: { name: 'Puya sweep', height: 30, landmarks: [{ name: 'puya-plants', at: 0.5, side: 'left', rim: true, distance: 3 }] },
      toTheLip: { name: 'To the lip', height: 0 },
      freeFall: { name: 'The free fall', height: 0, landmarks: [{ name: 'canyon-waterfall', at: 0.4, side: 'left', rim: true, distance: -2 }] },
      pool: { name: 'The pool', height: 0, landmarks: [{ name: 'llama-herd', at: 0.5, side: 'left', distance: 5 }] },
      sBends: { name: 'Canyon bends', height: 0 },
      brakingStraight: { name: 'Run to the hairpin', height: 0 },
      hairpin: { name: 'Hawk hairpin', height: 0 },
      slalomDrop: { name: 'Cairn drop', height: 0 },
      sweep2: { name: 'Terrace sweep', height: 16, landmarks: [{ name: 'andean-terraces', at: 0.5, side: 'left', distance: 8 }] },
      lastStraight: { name: 'Run to the village', height: 0 },
    },
  }),
});
