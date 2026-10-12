'use strict';

// Grand Champion: a stadium rock-concert pinball table (an original band, no real musicians).
// The field leaves the stage down two ramps, stage left and stage right, past guitar-pick bumpers,
// S-bends past the stage, the microphone boom at an early hairpin, a drop, a spin
// past the lighting rig, a long sweep past the crowd and a late splitter, the encore, to the
// flippers, where the winner's initials go up under GRAND CHAMPION.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'grand-champion',
  name: 'Grand Champion',
  family: 'pinball',
  difficulty: 'extreme',
  description: 'A stadium rock-concert pinball table: off the stage down two ramps past guitar-pick bumpers, round the microphone boom, a spin past the lighting rig and a late split for the encore to the flippers.',
  surface: 'ice',
  biome: 'playfield',
  lighting: 'parlour',
  pinball: { art: 'concert', display: 'ENCORE!', finish: 'GRAND CHAMPION' },
  signature: 'The encore',
  start: { landmark: 'speaker-wall', gate: 'barrier', shots: { countdown: 'above', launch: 'look-back' } },
  finish: {},
  designChanges: [
    'Built from the split start (the field leaves the stage down two ramps, stage left and stage right, past a pile-up of guitar-pick bumpers, merging about two seconds later) and encore split, the library layout made for this table from the late-splitter idea: drum pegs at the front of the stage, S-bends past the stage, the microphone boom at an early hairpin, a drop, a spiral past a lighting rig, a long sweep past the crowd, a late splitter (the encore) and drum pegs on the run to the flippers.',
    'The amplifier stacks are scenery (on the stage, and the speaker wall at the start) rather than blocks on the track; the drums are the pegs. The lighting rig stands beside the spiral, not in its middle, where an earlier stretch of the track passes. The sweeping colour of the lighting rig and the pyro bursts are left for the sound and light pass.',
  ],
  opening: opening('split-start', {
    costumes: { block: 'pick-bumper', slalom: 'bumper-post' },
    names: { plunge: 'Off the stage', chutes: 'Stage left, stage right', after: 'Into the crowd' },
  }),
  sections: layout('encore-split', {
    costumes: { swipe: 'mic-boom', peg: 'drum-peg' },
    dress: {
      stageRun: { name: 'Front of the stage' },
      sBends: { name: 'Stage bends', landmarks: [{ name: 'concert-stage', at: 0.5, side: 'right', distance: 70 }] },
      brakingStraight: { name: 'Run to the hairpin' },
      hairpin: { name: 'Mic boom hairpin' },
      outOfHairpin: { name: 'Down the ramp' },
      spiral: { name: 'Lighting rig spin', landmarks: [{ name: 'lighting-rig', at: 0.25, side: 'right', distance: 26 }] },
      sweep: { name: 'Past the crowd', scenery: ['crowd'] },
      beforeSplit: { name: 'Run to the encore' },
      splitter: { name: 'The encore' },
      lastStraight: { name: 'Down to the flippers' },
    },
  }),
});
