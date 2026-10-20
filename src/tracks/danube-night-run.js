'use strict';

// Danube Night Run: Rivers track 1, through a great river city at night. Out of a lit tunnel under the
// quay, along the embankment's lamps, a slalom between the piers of an old chain bridge high overhead,
// a sweep out over the dark water past a river cruiser, back along the far bank, round an island and
// down to the domed hall on the quay.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'danube-night-run',
  name: 'Danube Night Run',
  family: 'river',
  difficulty: 'extreme',
  description: 'A great river city at night: out of a lit tunnel under the quay, a slalom between the piers of an old chain bridge, a sweep out over the dark water past a river cruiser, and down the far bank to the domed hall on the embankment.',
  surface: 'ice',
  biome: 'city',
  lighting: 'night',
  variants: ['day'],
  river: { palette: 'danube', side: 'left', width: 110, banks: 'quay' },
  coaster: { colours: { support: '#5a5e66', rail: '#e8e2cc', tie: '#2f3238' } },
  signature: 'The chain bridge slalom',
  start: { type: 'pier', gate: 'trapdoor', shots: { countdown: 'side', launch: 'low-chase' } },
  finish: { landmark: 'domed-hall' },
  designChanges: [
    'Built from the tunnel launch (out from under the quay) and the bridge slalom, the library layout made for this track: a quay straight, a short climb, a slalom between a chain bridge\'s piers, a sweep out over the river, a drop, the hairpin, a spiral round an island, S-bends along the far bank and the run-in.',
    'The chain bridge stands high over the slalom (18 m clear of the rim at the lowest); its piers stand in the river and beside the track, never in it (looks only).',
  ],
  opening: opening('tunnel-launch', {
    costumes: { block: 'stone-block', slalom: 'street-lamp' },
    tunnel: 'lit-tunnel',
    names: { portal: 'Down to the quay', tunnel: 'Under the quay' },
    dress: { portal: { height: 0, river: 'left' }, tunnel: { height: 0, river: 'left' } },
  }),
  sections: layout('bridge-slalom', {
    costumes: { block: 'stone-block', slalom: 'mooring-pole', peg: 'street-lamp', swipe: 'container-crane', parked: 'river-ferry' },
    dress: {
      quay: { name: 'Along the embankment', height: 0, river: 'left', landmarks: [{ name: 'quay-lamps', at: 0.5, side: 'right', distance: 18 }] },
      pillars: { name: 'The chain bridge slalom', height: 0, river: 'left', overhead: ['chain-bridge'], scenery: ['city-quay'] },
      rise: { name: 'Up to the bridge', height: 0, river: 'left' },
      flyOut: { name: 'Out over the river', height: 14, river: 'under', landmarks: [{ name: 'river-cruiser', at: 0.55, river: true }] },
      drop: { name: 'Down from the bridge', height: 0, river: 'right' },
      farBank: { name: 'The far bank', height: 0, river: 'right', scenery: ['plane-trees'] },
      brakingStraight: { name: 'Run to the hairpin', height: 0, river: 'right' },
      hairpin: { name: 'Crane hairpin', height: 0, river: 'none' },
      island: { name: 'Round the island', height: 0, river: 'left', landmarks: [{ name: 'river-barge', at: 0.5, river: true }] },
      lastStraight: { name: 'Run to the domed hall', height: 0, river: 'left', scenery: ['city-quay'] },
    },
  }),
});
