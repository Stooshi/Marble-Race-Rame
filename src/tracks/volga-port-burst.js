'use strict';

// Volga Port Burst: Rivers track 8, at a great river port on the plains. Out of a port crane's cab, down the
// quay in waves, a slalom drop through the container cranes, sweeps across the wide plain and past the birch
// woods, under a loading gantry, a wide spiral above the river and S-bends out along a long many-span bridge.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'volga-port-burst',
  name: 'Volga Port Burst',
  family: 'river',
  difficulty: 'extreme',
  description: 'A great river port on the plains: a slalom drop through the container cranes, sweeps across the wide plain past the birch woods, under a loading gantry, and S-bends out along a long many-span bridge.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'day',
  variants: ['sunset'],
  river: { palette: 'volga', side: 'left', width: 160, banks: 'sand' },
  coaster: { colours: { support: '#6a7078', rail: '#f0f0ec', tie: '#30343a' } },
  signature: 'Through the container cranes',
  start: { type: 'elevator', look: 'port-crane', gate: 'stalls', shots: { countdown: 'chase', launch: 'high-behind' } },
  finish: { landmark: 'river-ferry' },
  designChanges: [
    'Built from the clean drop (its S-bends turning right first) and the port cranes, the library layout made for this track: a slalom drop through the container cranes (the lottery the clean drop needs), sweeps across the plain and past the birch woods, the hairpin, a short climb and a drop, a wide spiral, S-bends along a many-span bridge and the run-in.',
    'Shortened for pace (1,533 m at first): the wide spiral from 0.8 to 0.7 of a turn, the last straight from 85 to 70 m.',
    'Overtakes (54 at first, the field strung out): the crane slalom from seven gates at a loss of 0.3 to eight at 0.18 (the luck the clean drop needs stays: the strongest five about 42%), a longer sweep across the plain (115 degrees) with three pegs.',
    'A port gantry crane straddles the crane slalom too, seen ahead from the follow camera in a tall frame; the quay cranes\' booms reach out over the water, away from the track (looks only).',
  ],
  opening: opening('clean-drop', {
    side: 'right',
    names: { plunge: 'Down from the crane', bends: 'Along the quay' },
    dress: { plunge: { height: 0, river: 'left' }, bends: { height: 0, river: 'left' } },
  }),
  sections: layout('port-cranes', {
    costumes: { slalom: 'bollard', peg: 'mooring-pole', swipe: 'container-crane', parked: 'river-ferry' },
    dress: {
      cranes: { name: 'Through the container cranes', height: 0, river: 'left', overhead: ['loading-gantry'], landmarks: [{ name: 'quay-cranes', at: 0.45, side: 'left', distance: 26 }] },
      plain: { name: 'Across the plain', height: 0, river: 'left', landmarks: [{ name: 'river-barge', at: 0.5, river: true, distance: 30 }] },
      birches: { name: 'By the birch woods', height: 0, river: 'right', scenery: ['birches'] },
      brakingStraight: { name: 'Under the loading gantry', height: 0, river: 'right', overhead: ['loading-gantry'] },
      hairpin: { name: 'Crane hairpin', height: 0, river: 'right' },
      rise: { name: 'Up to the grain quay', height: 0, river: 'right' },
      drop: { name: 'Off the grain quay', height: 0, river: 'right' },
      spin: { name: 'Wide spiral', height: 0, river: 'none', scenery: ['birches'] },
      bridgeRun: { name: 'Along the long bridge', height: 10, river: 'under', overhead: ['multi-span-bridge'] },
      lastStraight: { name: 'Run to the ferry', height: 0, river: 'left' },
    },
  }),
});
