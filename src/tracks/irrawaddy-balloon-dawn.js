'use strict';

// Irrawaddy Balloon Dawn: Rivers track 10, at dawn over a wide river plain dotted with old brick temples
// (only ever seen far off). Up a curving lift and out of a tunnel through the bank, down along a sandbank, S-bends
// high over the plain among the drifting hot-air balloons, a slalom down past the temple plain, a spiral on
// the sandbank and three sweeps down the river past the boats to the landing.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'irrawaddy-balloon-dawn',
  name: 'Irrawaddy Balloon Dawn',
  family: 'river',
  difficulty: 'extreme',
  description: 'Dawn over a wide river plain dotted with old brick temples far off: S-bends high over the plain among the drifting hot-air balloons, a slalom down past the temple plain, a spiral on the sandbank and three sweeps down the river past the boats.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'dawn',
  variants: ['day'],
  river: { palette: 'irrawaddy', side: 'left', width: 160, banks: 'sand', calm: true },
  coaster: { colours: { support: '#8a6a4a', rail: '#f4ece0', tie: '#4a3a2a' } },
  signature: 'Among the balloons',
  start: { type: 'curving-lift', gate: 'barrier', shots: { countdown: 'front', launch: 'side' } },
  finish: { landmark: 'river-ferry' },
  designChanges: [
    'Built from the tunnel launch (through the bank) and the balloon plain, the library layout made for this track: a long gentle drop along the sandbank (three pegs, to mix the field out of the tunnel), S-bends flying high over the plain (two pegs), a short climb and a slalom drop, a spiral, the hairpin, three sweeps down the river and the run-in.',
    'Its first 20 seconds were the same as Arcade Spins\' (a straight with two pegs, then S-bends: 1.00), so the sandbank is a long gentle drop with three pegs and the S-bends carry two (closest now 0.70). A levee crest out of the tunnel was tried and dropped: the front starting group won too often over it.',
    'Fairness and pace: the slalom drop from three gates at 0.15 to five at 0.2; the last sweep from 90 to 60 degrees, the first from 80 to 65, the spiral from 0.8 to 0.7 of a turn, the last straight from 80 to 65 m.',
    'Looks: the balloons drift low over the plain well ahead of the S-bends, so they fill the sky in a tall frame as the field comes through (they were 40 to 64 m up, out of the follow camera\'s picture); the river a calm grey-blue (it read as sand).',
  ],
  opening: opening('tunnel-launch', {
    costumes: { block: 'log', slalom: 'river-stake' },
    tunnel: 'rock',
    names: { portal: 'Down to the bank', tunnel: 'Through the bank' },
    dress: { portal: { height: 0, river: 'left' }, tunnel: { height: 0, river: 'left' } },
  }),
  sections: layout('balloon-plain', {
    costumes: { slalom: 'river-stake', peg: 'mooring-pole', swipe: 'fisherman', parked: 'river-ferry' },
    dress: {
      sandbank: { name: 'Down to the sandbank', height: 0, river: 'left' },
      plainBends: { name: 'Among the balloons', height: 14, river: 'under', overhead: ['hot-air-balloons'] },
      rise: { name: 'Up to the terrace', height: 0, river: 'right' },
      slalomDrop: { name: 'Past the temple plain', height: 0, river: 'right', landmarks: [{ name: 'brick-temples', at: 0.5, side: 'left', distance: 220 }] },
      spin: { name: 'Sandbank spiral', height: 0, river: 'right' },
      brakingStraight: { name: 'Run to the hairpin', height: 0, river: 'right' },
      hairpin: { name: 'Fisherman hairpin', height: 0, river: 'right' },
      sweep1: { name: 'Down the river', height: 0, river: 'right', scenery: ['river-palms'] },
      sweep2: { name: 'Past the boats', height: 0, river: 'left', landmarks: [{ name: 'longtail-boat', at: 0.3, river: true, distance: 20 }, { name: 'river-barge', at: 0.7, river: true, distance: 40 }] },
      sweep3: { name: 'Sweep to the landing', height: 0, river: 'left', scenery: ['river-palms'] },
      lastStraight: { name: 'Run to the landing', height: 0, river: 'left' },
    },
  }),
});
