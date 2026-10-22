'use strict';

// Ganges Dawn Run: Rivers track 10, at a great river's stone steps at dawn. Down the long river steps to
// the water's edge, low over the water among small floating lamps and rowing boats in the mist, along
// the steps and their old houses, a rise and a drop to the water, round to the steps again.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'ganges-dawn-run',
  name: 'Ganges Dawn Run',
  family: 'river',
  difficulty: 'extreme',
  description: 'A great river\'s stone steps at dawn: down the long river steps to the water\'s edge, skimming low among small floating lamps and rowing boats in the morning mist, along the steps and their old houses and down to the water.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'dawn',
  variants: ['day'],
  river: { palette: 'ganges', side: 'left', width: 160, banks: 'sand', slope: 0.8, gap: 10 },
  coaster: { colours: { support: '#8a7a62', rail: '#f4ecd8', tie: '#4a3e30' } },
  signature: 'Down the river steps',
  start: { type: 'stepped-platform', gate: 'stalls', shots: { countdown: 'above', launch: 'look-back' } },
  finish: { landmark: 'ghat-steps' },
  designChanges: [
    'Built from the peg drop (the family\'s second, its first bend to the left: Mekong Market Spins turns right first) and the river steps, the library layout made for this track: a straight down five river steps, a slalom low over the water among the lamps, a sweep, part of a spiral round a moored boat, S-bends along the steps, a short climb and a drop to the water, the hairpin, a sweep and the run-in.',
    'The steps and the old houses above them only; no shrines, temples, figures or ceremonies (looks only).',
    'Tuned on the layout\'s test track: the first draft raced a 57.7 s winner, so the steps straight is 80 m (90), the lamp slalom 85 m (100), the first sweep steeper (0.11), the second sweep 90 degrees (120) and the run-in 75 m (85).',
    'The lamp slalom flies 10 m over the river, the lamps and a rowing boat close either side of it, so the morning river shows from the follow camera; fewer lamps and a lighter mist keep the phone under 60k triangles (looks only).',
    'Looks, from the portrait review (October 2026): the river runs 10 m from the track beside the ground stretches (`gap`, 15 elsewhere), its shore low and gentle so no ridge hides it; the land rises at most 0.8 beside another stretch (`slope`) and the hills are meadow green (`hillside`) (looks only).',
  ],
  opening: opening('peg-drop', {
    costumes: { peg: 'mooring-pole' },
    names: { plunge: 'Down from the steps' },
    dress: { plunge: { height: 0, river: 'left' } },
  }),
  sections: layout('river-steps', {
    costumes: { slalom: 'mooring-pole', peg: 'river-stake', swipe: 'fisherman', parked: 'river-raft' },
    dress: {
      riverSteps: { name: 'Down the river steps', height: 0, river: 'left', landmarks: [{ name: 'ghat-steps', at: 0.5, side: 'right', distance: 16 }] },
      lamps: { name: 'Among the floating lamps', height: 10, river: 'under', landmarks: [{ name: 'floating-lamps', at: 0.15, river: true, distance: 10 }, { name: 'rowing-boats', at: 0.45, river: true, distance: -14 }, { name: 'floating-lamps', at: 0.8, river: true, distance: 10 }] },
      lampSweep: { name: 'Through the mist', height: 0, river: 'left', landmarks: [{ name: 'rowing-boats', at: 0.5, river: true, distance: 30 }] },
      boatTurn: { name: 'Round the moored boat', height: 0, river: 'right' },
      alongSteps: { name: 'Along the steps', height: 0, river: 'left', landmarks: [{ name: 'ghat-steps', at: 0.5, side: 'right', distance: 20 }] },
      rise: { name: 'Up the bank', height: 0, river: 'left' },
      drop: { name: 'Down to the water', height: 0, river: 'left' },
      brakingStraight: { name: 'Run to the hairpin', height: 0, river: 'left' },
      hairpin: { name: 'Boatman hairpin', height: 0, river: 'none' },
      sweep2: { name: 'Sweep to the steps', height: 0, river: 'left', landmarks: [{ name: 'floating-lamps', at: 0.5, river: true, distance: 20 }] },
      lastStraight: { name: 'Run to the steps', height: 0, river: 'left' },
    },
  }),
});
