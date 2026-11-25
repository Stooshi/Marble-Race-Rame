'use strict';

// Seine Quays Spins: Rivers track 7, along the stone quays of a great river city at golden hour. Off a
// mansard roof on the quay in waves, rocking down the stone channel between the quay walls, a slalom under five stone arch bridges in a
// row, through an arch on alternating sides, round the willow at the island's tip, along the lower quay, up
// past the green bookstalls on the upper quay and back down to the river.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'seine-quays-spins',
  name: 'Seine Quays Spins',
  family: 'river',
  difficulty: 'extreme',
  description: 'The stone quays of a great river city at golden hour: a slalom under five stone arch bridges in a row, through an arch on alternating sides, round the willow at the island\'s tip, and up past the green bookstalls on the upper quay.',
  surface: 'ice',
  biome: 'city',
  lighting: 'sunset',
  variants: ['day'],
  river: { palette: 'seine', side: 'right', width: 90, banks: 'quay' },
  coaster: { colours: { support: '#7a7468', rail: '#f2ece0', tie: '#3a3630' } },
  signature: 'Under the five arches',
  tvCameras: [
    { section: 'Under the five arches', at: 0.8, side: 'right', distance: 6, height: 12 },
    { section: 'Spiral', at: 0.6, side: 'right', distance: 10, height: 12 },
  ],
  start: { type: 'rooftop', look: 'mansard', gate: 'trapdoor', shots: { countdown: 'above', launch: 'overhead' } },
  finish: { landmark: 'river-barge' },
  designChanges: [
    'Built from the pipe drop (off the roof in waves, down into the stone channel between the quay walls) and the arch run, the library layout made for this track: a slalom straight under five stone arch bridges, a sweep round the island\'s tip, a drop, the hairpin, two sweeps along the quays, a short climb to the upper quay and back down, a spiral and the run-in.',
    'The plan had the crest start; its first 20 seconds matched The Stack\'s (0.88: every crest start races through the same first six things). The staggered drop is full in the family (Mississippi, Congo), and the split start, the funnel drop and the banked turn each scored 0.80 or more against other tracks\' starts (Bonus Round, Kali Gandaki Burst, Tara River Spins), so it opens with the pipe drop, the family\'s second (with Thames): the rounded stone channel between the quay walls.',
    'Shortened for pace (winner 57.4 s, gap 20 s at first): the arch slalom from 110 to 90 m (a little steeper, 0.18), the quay sweeps from 100 and 80 to 75 and 60 degrees, the spiral from 0.9 to half a turn, the last straight from 75 to 65 m; the island tip\'s sweep from 130 to 150 degrees.',
    'Luck and overtakes, as the pipe drop has none of its own: the arch slalom from five gates at 0.2 to eight at 0.25 (seven at 0.3 spread the field: gap 18 s, last home 87 s), three pegs round the island tip and two on the lower quay (overtakes 53 to about 60).',
  ],
  opening: opening('pipe-drop', {
    names: { plunge: 'Off the roof', pipe: 'Between the quay walls' },
    dress: { plunge: { height: 0, river: 'right' }, pipe: { height: 0, river: 'right', scenery: ['haussmann'] } },
  }),
  sections: layout('arch-run', {
    costumes: { slalom: 'street-lamp', peg: 'bollard', swipe: 'street-sign', parked: 'river-ferry' },
    dress: {
      arches: { name: 'Under the five arches', height: 0, river: 'right', overhead: ['stone-arch-bridges'], scenery: ['haussmann'] },
      islandTip: { name: 'Round the island tip', height: 8, river: 'under', landmarks: [{ name: 'weeping-willow', at: 0.5, side: 'right', distance: 16 }, { name: 'river-barge', at: 0.3, river: true, distance: 20 }] },
      drop: { name: 'Down to the lower quay', height: 0, river: 'left' },
      brakingStraight: { name: 'Run to the hairpin', height: 0, river: 'left' },
      hairpin: { name: 'Lamp-post hairpin', height: 0, river: 'left' },
      lowQuay: { name: 'Along the lower quay', height: 0, river: 'left', scenery: ['plane-trees'] },
      quayBend: { name: 'Quay sweep', height: 0, river: 'left', scenery: ['haussmann'] },
      rise: { name: 'Up to the bookstalls', height: 0, river: 'left', landmarks: [{ name: 'bookstalls', at: 0.5, side: 'left', distance: 6 }] },
      downQuay: { name: 'Back down to the river', height: 0, river: 'left', landmarks: [{ name: 'bookstalls', at: 0.4, side: 'right', distance: 6 }] },
      spin: { name: 'Spiral', height: 0, river: 'none' },
      lastStraight: { name: 'Run to the barge', height: 0, river: 'right', scenery: ['haussmann'] },
    },
  }),
});
