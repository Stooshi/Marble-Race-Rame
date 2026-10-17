'use strict';

// Bonus Round: Block Series track 15. A stage world of cream and gold blocks at night: twin chutes
// off a rooftop, under checkpoint arches that flash as the leader passes, beside a score wall that
// fills with lit blocks as the race goes on, round a spin and the hairpin, and a long last sweep to
// the bright final stage, lit once the winner is home.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'bonus-round',
  name: 'Bonus Round',
  family: 'block',
  difficulty: 'extreme',
  description: 'A stage world of blocks at night: under checkpoint arches that flash as the leader passes, beside a score wall that fills with lit blocks as the race goes on, round a spin and a long last sweep to a bright final stage.',
  surface: 'ice',
  biome: 'city',
  lighting: 'night',
  block: { world: 'bonus' },
  coaster: { style: 'blocks', colours: { support: '#3a3456', rail: '#f4eedc', tie: '#1c1830' } },
  signature: 'Score wall straight',
  start: { landmark: 'block-hall', type: 'rooftop', gate: 'paddle', shots: { countdown: 'chase', launch: 'high-behind' } },
  finish: { landmark: 'final-stage' },
  designChanges: [
    'Built from the split start (twin chutes off the roof) and the bonus stages, the library layout made for this track: a peg straight, a sweep, S-bends, a slalom straight, a spin, the hairpin and a long last sweep.',
    'The peg straight out of the twin chutes is 90 m with four pegs, two of them on the inside of the sweep that follows (the inside chute won 54.6% of races with 49.1% of the marbles).',
    'The score wall fills a row of lit blocks for each tenth of the race the leader has run, gold once the winner is home; the checkpoint arches flash as the leader passes under; the final stage lights once the winner is home (looks only, on the race clock and the leader\'s progress).',
  ],
  opening: opening('split-start', {
    costumes: { block: 'voxel-cube', slalom: 'cube-pillar' },
  }),
  sections: layout('bonus-stages', {
    mirror: true,
    costumes: { slalom: 'cube-pillar', peg: 'cube-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      stage1: { name: 'Score wall straight', landmarks: [{ name: 'checkpoint-arch', at: 0.12, over: true }, { name: 'score-wall', at: 0.55, side: 'left', distance: 7 }] },
      bonusSweep: { name: 'Bonus sweep' },
      checkpointBends: { name: 'Checkpoint bends', landmarks: [{ name: 'checkpoint-arch', at: 0.5, over: true }] },
      stage2: { name: 'Second stage', height: 10, landmarks: [{ name: 'score-wall', at: 0.6, side: 'right', distance: 7 }] },
      spin: { name: 'Bonus spin', height: 10 },
      brakingStraight: { name: 'Run to the hairpin', landmarks: [{ name: 'checkpoint-arch', at: 0.3, over: true }] },
      hairpin: { name: 'Crane hairpin' },
      finalStage: { name: 'The final stage' },
      lastStraight: { name: 'Run to the line' },
    },
  }),
});
