'use strict';

// Wadi Mujib Burst: Canyon Series track 15, through Wadi Mujib in Jordan. From the wadi gate, launched
// into the siq, a narrow passage of deep red sandstone filled with a clear green stream, past
// the ladders up a little cascade, over a boulder and through the narrows, round the hairpin and the pool, then out of the walls on
// a long sweep to the finish where the wadi opens onto the Dead Sea.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'wadi-mujib-burst',
  name: 'Wadi Mujib Burst',
  family: 'canyon',
  difficulty: 'extreme',
  description: 'Through Wadi Mujib in Jordan: a narrow passage of deep red sandstone filled with a clear stream, past the ladders up a little cascade, over a boulder and through the narrows, out to where the wadi opens onto the Dead Sea.',
  surface: 'ice',
  biome: 'desert',
  lighting: 'day',
  variants: ['sunset'],
  canyon: { palette: 'mujib', depth: 40, river: 'left', narrow: true },
  coaster: { colours: { support: '#7a3a2e', rail: '#f2e8de', tie: '#3a2420' } },
  signature: 'The siq',
  tvCameras: [
    { section: 'The siq', at: 0.8, side: 'left', distance: 10, height: 12 },
    { section: 'Out of the walls', at: 0.6, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'wadi-gate', scenery: ['rocks'], type: 'station-launch', gate: 'stalls', shots: { countdown: 'chase', launch: 'overhead' } },
  finish: { landmark: 'dead-sea-shore' },
  designChanges: [
    'Built from the boost-pad launch and the siq passage, the library layout made for this track: tight S-bends, a slalom straight through the water, a short climb over a boulder, a drop, more tight S-bends, the hairpin, a spiral round the pool where the siq widens and a long sweep out of the walls.',
    'A narrow canyon (`narrow`), its stream filling the passage beside the track (looks only).',
  ],
  opening: opening('boost-launch', {
    costumes: { block: 'mossy-boulder', slalom: 'cairn' },
    names: { drop: 'Launch drop', launch: 'Launch strip', plunge: 'Into the siq' },
    dress: { drop: { height: 0 }, launch: { height: 0 }, plunge: { height: 0 } },
  }),
  sections: layout('siq-passage', {
    mirror: true,
    costumes: { block: 'mossy-boulder', slalom: 'river-stake', peg: 'cairn', swipe: 'falcon', parked: 'river-raft' },
    dress: {
      narrows: { name: 'The narrows', height: 0 },
      siq1: { name: 'The siq', height: 0, landmarks: [{ name: 'siq-ladders', at: 0.55, side: 'left', distance: 6 }] },
      boulder: { name: 'Over the boulder', height: 0 },
      dropIn: { name: 'Drop back in', height: 0 },
      siq2: { name: 'Deeper narrows', height: 0 },
      brakingStraight: { name: 'Run to the hairpin', height: 0 },
      hairpin: { name: 'Falcon hairpin', height: 0 },
      pool: { name: 'The pool', height: 0 },
      openSweep: { name: 'Out of the walls', height: 24 },
      lastStraight: { name: 'Run to the Dead Sea', height: 0 },
    },
  }),
});
