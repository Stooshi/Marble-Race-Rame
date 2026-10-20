'use strict';

// Mississippi Steamer Run: Rivers track 3, down a great river's levee country. Off the end of a landing
// beside a moored river boat, along the grassy levee and its porched houses, straight through a paddle
// steamer's lower deck, out over the bayou among bald cypresses, through an iron-balcony river town and
// round to the landing where the steamer waits.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'mississippi-steamer-run',
  name: 'Mississippi Steamer Run',
  family: 'river',
  difficulty: 'extreme',
  description: 'Down a great river\'s levee country: along the grassy levee, straight through a paddle steamer\'s lower deck, out over the bayou among bald cypresses hung with moss, through an iron-balcony river town and round to the landing.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'sunset',
  variants: ['day'],
  river: { palette: 'mississippi', side: 'left', width: 150, banks: 'bayou' },
  coaster: { colours: { support: '#6a4a32', rail: '#f4f2ea', tie: '#3a2a20' } },
  signature: 'Through the steamer',
  start: { landmark: 'levee-houses', scenery: ['cypress'], type: 'river-boat', gate: 'barrier', shots: { countdown: 'above', launch: 'side' } },
  finish: { landmark: 'paddle-steamer' },
  designChanges: [
    'Built from the staggered drop and the steamer pass, the library layout made for this track: a levee straight, a straight through a paddle steamer (a boost), a sweep out over the bayou, a drop, S-bends through the river town, the hairpin, a slalom drop, a sweep to the landing and the run-in.',
    'The steamer is a tunnel (its lower deck: white planking, red bands, lamps); it stands on the land at the water\'s edge (looks only).',
  ],
  opening: opening('staggered-drop', {
    costumes: { block: 'barrel', slalom: 'fence-post' },
    names: { plunge: 'Off the landing' },
    dress: { plunge: { height: 0, river: 'left' } },
  }),
  sections: layout('steamer-pass', {
    costumes: { slalom: 'river-stake', peg: 'mooring-pole', swipe: 'black-bear', parked: 'horse-cart' },
    dress: {
      levee: { name: 'Along the levee', height: 0, river: 'left', landmarks: [{ name: 'levee-houses', at: 0.5, side: 'right', distance: 26 }] },
      steamer: { name: 'Through the steamer', height: 0, river: 'left', tunnel: 'steamer' },
      bayou: { name: 'Over the bayou', height: 10, river: 'under', scenery: ['cypress', 'reeds'] },
      drop: { name: 'Down to the town', height: 0, river: 'right' },
      town: { name: 'The river town', height: 0, river: 'none', scenery: ['balcony-houses'] },
      brakingStraight: { name: 'Run to the hairpin', height: 0, river: 'right' },
      hairpin: { name: 'Bear hairpin', height: 0, river: 'right', scenery: ['cypress'] },
      slalomDrop: { name: 'Slalom to the river', height: 0, river: 'right', scenery: ['reeds'] },
      landing: { name: 'Sweep to the landing', height: 0, river: 'right', landmarks: [{ name: 'river-barge', at: 0.5, river: true, distance: 30 }] },
      lastStraight: { name: 'Run to the landing', height: 0, river: 'right', scenery: ['balcony-houses'] },
    },
  }),
});
