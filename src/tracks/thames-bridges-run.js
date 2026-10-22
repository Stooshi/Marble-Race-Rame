'use strict';

// Thames Bridges Run: Rivers track 6, down a great tidal river through an old city. Out of a lift inside a
// bridge tower, down the river in a half-pipe, a slalom between the towers of a raised bascule bridge, a
// spiral round a dock, a sweep out over the water under a suspension bridge past the river clippers and
// the glass towers, back along the wharves and down the long reach under a steel arch bridge.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'thames-bridges-run',
  name: 'Thames Bridges Run',
  family: 'river',
  difficulty: 'extreme',
  description: 'A great tidal river through an old city: a slalom between the towers of a raised bascule bridge, a sweep out over the water under a suspension bridge past the river clippers and the glass towers, and down the long reach under a steel arch bridge.',
  surface: 'ice',
  biome: 'city',
  lighting: 'day',
  variants: ['sunset', 'rain'],
  river: { palette: 'thames', side: 'left', width: 120, banks: 'quay' },
  coaster: { colours: { support: '#4a5560', rail: '#eef0f2', tie: '#2a3038' } },
  signature: 'Between the bascule towers',
  start: { type: 'elevator', look: 'bridge-tower', gate: 'paddle', shots: { countdown: 'front', launch: 'low-chase' } },
  finish: { landmark: 'river-barge' },
  designChanges: [
    'Built from the pipe drop (down from the bridge tower into a half-pipe) and the bridge gate, the library layout made for this track: an embankment straight, a slalom drop between the towers of a raised bascule bridge (the lottery the pipe drop needs), a dock spiral, a sweep out over the river under a suspension bridge, the hairpin, S-bends, a short climb up to a wharf and off it, the long reach and the run-in.',
    'More luck early (a quick run: the strongest five 47.7% of wins against the weakest five\'s 5.8%, the last starting group 23.7%): the bascule slalom from seven gates at a loss of 0.3 to nine at 0.35, starting sooner (from 10% of the drop).',
    'Shortened for pace (winner 54.2 s at first): the suspension sweep from 110 to 90 degrees, the long reach from 80 to 60, the last straight from 75 to 65 m.',
  ],
  opening: opening('pipe-drop', {
    names: { plunge: 'Down from the tower', pipe: 'The river pipe' },
    dress: { plunge: { height: 0, river: 'left' }, pipe: { height: 0, river: 'left' } },
  }),
  sections: layout('bridge-gate', {
    costumes: { slalom: 'mooring-pole', peg: 'bollard', swipe: 'toll-boom', parked: 'river-ferry' },
    dress: {
      embankment: { name: 'Along the embankment', height: 0, river: 'left' },
      bascule: { name: 'Between the bascule towers', height: 0, river: 'left', overhead: ['bascule-bridge'] },
      dock: { name: 'Round the dock', height: 0, river: 'none', scenery: ['city-quay'] },
      reach: { name: 'Under the suspension bridge', height: 12, river: 'under', overhead: ['river-suspension-bridge'], landmarks: [{ name: 'river-clipper', at: 0.35, river: true, distance: 30 }, { name: 'glass-towers', at: 0.7, side: 'left', distance: 150 }] },
      brakingStraight: { name: 'Run to the hairpin', height: 0, river: 'right' },
      hairpin: { name: 'Barrier hairpin', height: 0, river: 'right' },
      sBends: { name: 'Along the wharves', height: 0, river: 'right', scenery: ['city-quay'] },
      rise: { name: 'Up to the wharf', height: 0, river: 'right' },
      drop: { name: 'Off the wharf', height: 0, river: 'right' },
      longReach: { name: 'The long reach', height: 0, river: 'right', overhead: ['steel-arch-bridge'], landmarks: [{ name: 'river-clipper', at: 0.6, river: true, distance: 20 }] },
      lastStraight: { name: 'Run to the pier', height: 0, river: 'right', scenery: ['city-quay'] },
    },
  }),
});
