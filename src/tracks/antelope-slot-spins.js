'use strict';

// Antelope Slot Spins: Canyon Series track 11, through a slot canyon in Arizona. Down steel stairs
// into the slot, through its wavy orange sandstone, past shafts of light falling from the rim far
// above, round a corkscrew that climbs out over the slot and drops back in, to the sandy wash at
// its mouth where the tour trucks wait.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'antelope-slot-spins',
  name: 'Antelope Slot Spins',
  family: 'canyon',
  difficulty: 'extreme',
  description: 'Down into a slot canyon in Arizona: through twisting walls of wavy orange sandstone, past shafts of light falling from the rim far above, round a corkscrew out over the slot and back in, to the sandy wash at its mouth.',
  surface: 'ice',
  biome: 'desert',
  lighting: 'day',
  variants: ['sunset'],
  canyon: { palette: 'slot', depth: 44, river: 'none', narrow: true },
  coaster: { colours: { support: '#7a4a32', rail: '#f2e6d6', tie: '#4a2e22' } },
  signature: 'The light-beam hall',
  start: { landmark: 'slot-stairs', scenery: ['rocks'], type: 'straight-lift', gate: 'trapdoor', shots: { countdown: 'front', launch: 'low-chase' } },
  finish: { landmark: 'tour-trucks' },
  designChanges: [
    'Built from the funnel drop (the field squeezes into the slot) and the slot canyon, the library layout made for this track: a peg hall, tight S-bends, more tight S-bends, a straight up out of the slot and a corkscrew over it, the hairpin, last S-bends and a drop.',
    'A narrow canyon (`narrow`): the walls stand about 15 m from the track instead of 20 and climb faster.',
    'The light shafts are see-through and stand beside the track, never over it (looks only).',
  ],
  opening: opening('funnel-drop', {
    costumes: { block: 'mossy-boulder', slalom: 'cairn' },
    names: { plunge: 'Into the slot' },
    dress: { plunge: { height: 0 } },
  }),
  sections: layout('slot-canyon', {
    mirror: true,
    costumes: { slalom: 'cairn', peg: 'cairn', swipe: 'falcon', parked: 'river-raft' },
    dress: {
      beamHall: { name: 'The light-beam hall', height: 0, landmarks: [{ name: 'light-beams', at: 0.4, side: 'left', distance: 7 }, { name: 'light-beams', at: 0.75, side: 'right', distance: 7 }] },
      twist1: { name: 'The twists', height: 0 },
      twist2: { name: 'Deeper twists', height: 0, landmarks: [{ name: 'light-beams', at: 0.5, side: 'left', distance: 7 }] },
      rimRun: { name: 'Up out of the slot', height: 14 },
      corkscrew: { name: 'Out over the slot', height: 14 },
      brakingStraight: { name: 'Run to the hairpin', height: 0 },
      hairpin: { name: 'Falcon hairpin', height: 0 },
      twist3: { name: 'Last twists', height: 0, landmarks: [{ name: 'light-beams', at: 0.4, side: 'right', distance: 7 }] },
      drop: { name: 'Drop to the wash', height: 0 },
      lastStraight: { name: 'Run to the wash', height: 0 },
    },
  }),
});
