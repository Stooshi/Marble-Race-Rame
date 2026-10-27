'use strict';

// Flipper Spins: a stage-magic pinball table in a grand old theatre. The field drops past
// spotlight bumpers, straight into the hairpin round the
// magician's trunk, a slalom drop, a long sweep through the stage curtain, a spin round a giant
// top hat, S-bends and the run to the flippers, where the winner takes a bow under falling roses.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'flipper-spins',
  name: 'Flipper Spins',
  family: 'pinball',
  difficulty: 'extreme',
  description: 'A stage-magic pinball table in a grand old theatre: down past the spotlights, round the magician\'s trunk at the early hairpin, through the red stage curtain and round a giant top hat to the flippers.',
  surface: 'ice',
  biome: 'playfield',
  lighting: 'parlour',
  pinball: { art: 'theatre', display: 'SKILL SHOT!', finish: 'TAKE A BOW!' },
  signature: 'Through the curtain',
  tvCameras: [
    { section: 'Through the curtain', at: 0.8, side: 'left', distance: 6, height: 8 },
    { section: 'Top hat spin', at: 0.8, side: 'right', distance: 6, height: 8 },
  ],
  start: { landmark: 'grand-theatre', gate: 'stalls', shots: { countdown: 'front', launch: 'look-back' } },
  finish: {},
  designChanges: [
    'Built from the classic opening (the steep first drop past a pile-up of spotlight bumpers and a slalom of bumper posts) and stage hairpin, the library layout made for this table: the hairpin first, round the magician\'s trunk, a slalom drop, a long sweep through the stage curtain, a spiral round the giant top hat, S-bends and bumper posts on the run to the flippers.',
    'The design\'s boost-pad launch (the plunger) was tried first and dropped, as the design allows: on this table the weakest marbles took its boost pads far more often than the strongest (31% against 20%), and the winner-to-last gap went over 18 s. The classic opening is the only one no other pinball table uses.',
    'The magician\'s trunk stands in the middle of the hairpin as scenery (its lid open, a dove on it) rather than as a block on the track; the hairpin\'s swipe is the magician\'s wand.',
    'The design\'s top-hat spinner is the giant top hat in the middle of the spin; the stage curtain is the spinner (a curtain) on the sweep.',
  ],
  opening: opening('classic', {
    costumes: { block: 'spotlight-bumper', slalom: 'bumper-post' },
    names: { plunge: 'Skill shot' },
  }),
  sections: layout('stage-hairpin', {
    costumes: { swipe: 'magic-wand', slalom: 'bumper-post', curtain: 'stage-curtain', peg: 'bumper-post' },
    dress: {
      brakingStraight: { name: 'To the trunk' },
      hairpin: { name: 'Trunk hairpin', around: 'magician-trunk' },
      outOfHairpin: { name: 'Bumper drop' },
      sweep: { name: 'Through the curtain' },
      spiral: { name: 'Top hat spin', around: 'top-hat' },
      sBends: { name: 'Orchestra pit bends' },
      lastStraight: { name: 'Down to the flippers' },
    },
  }),
});
