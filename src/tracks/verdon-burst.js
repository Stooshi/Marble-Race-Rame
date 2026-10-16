'use strict';

// Verdon Burst: Canyon Series track 12, through the Verdon Gorge in Provence, France. From the stone steps
// of a village perched on a ledge, over a crest and out along the cliff road high on the white limestone rim past fields
// of lavender, down into the gorge beside the turquoise river where griffon vultures circle, round a
// spin and down to the turquoise lake at the gorge's mouth.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'verdon-burst',
  name: 'Verdon Burst',
  family: 'canyon',
  difficulty: 'extreme',
  description: 'Through the Verdon Gorge in Provence: along the cliff road high on the white limestone rim past fields of lavender, then down into the gorge beside the turquoise river, to the lake at its mouth.',
  surface: 'ice',
  biome: 'alpine',
  lighting: 'day',
  variants: ['sunset'],
  canyon: { palette: 'verdon', depth: 46, river: 'right' },
  coaster: { colours: { support: '#8a8478', rail: '#f4f2ec', tie: '#4a463e' } },
  signature: 'The cliff road',
  start: { landmark: 'perched-village', scenery: ['rocks'], type: 'stepped-platform', gate: 'trapdoor', shots: { countdown: 'chase', launch: 'low-chase' } },
  finish: { landmark: 'lake-pedalos' },
  designChanges: [
    'Built from the crest start (it mixes the field before the long rim sweep; with the boost-pad launch the middle starting places lost out) and the cliff road, the library layout made for this track: a long sweep high on the rim, a slalom past the lookout, a spin down into the gorge, a plunge to the river, a mogul straight, the hairpin, a sweep along the river and a drop to the lake.',
    'Lavender fields stand up on the rim, back from its edge; the gate stands on the stepped platform, the village\'s stone steps (looks only).',
  ],
  opening: opening('crest-start', {
    costumes: { block: 'mossy-boulder', slalom: 'river-stake' },
    names: { plunge: 'Down from the village', climb: 'Over the crest', drop: 'Onto the cliff road' },
    dress: { plunge: { height: 0 }, climb: { height: 0 }, drop: { height: 0 } },
  }),
  sections: layout('cliff-road', {
    mirror: true,
    costumes: { slalom: 'river-stake', peg: 'cairn', swipe: 'falcon', parked: 'river-raft' },
    dress: {
      rimRoad: { name: 'The cliff road', height: 30, landmarks: [{ name: 'lavender-field', at: 0.45, side: 'left', rim: true, distance: 14 }] },
      lookout: { name: 'Past the lookout', height: 30, landmarks: [{ name: 'lavender-field', at: 0.5, side: 'right', rim: true, distance: 14 }] },
      spin: { name: 'Down into the gorge', height: 12 },
      dive: { name: 'Plunge to the river', height: 0 },
      paddleRun: { name: 'Along the turquoise river', height: 0, overhead: ['vulture'] },
      brakingStraight: { name: 'Run to the hairpin', height: 0 },
      hairpin: { name: 'Vulture hairpin', height: 0 },
      riverSweep: { name: 'River sweep', height: 0 },
      lakeDrop: { name: 'Drop to the lake', height: 0 },
      lastStraight: { name: 'Run to the lake', height: 0 },
    },
  }),
});
