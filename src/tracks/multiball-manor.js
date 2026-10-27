'use strict';

// Multiball Manor: the Pinball Series' proof track (built with the pinball kit first, as the
// series' design asks). A gothic manor table at midnight: all twenty marbles wait locked in a
// crypt and burst out of its tunnel together, like a multiball start, then sweep through the
// portrait gallery, down the grand staircase, along the graveyard lane past tombstone
// bumpers, through the library past a lightning-rod spinner and a sliding bookcase, down the
// second staircase, under the swinging chandelier at the hairpin and on to the flippers.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'multiball-manor',
  name: 'Multiball Manor',
  family: 'pinball',
  difficulty: 'extreme',
  description: 'A pinball table at midnight in a gothic manor: out of the crypt in a multiball burst, down two spiral staircases, along the graveyard lane past tombstone bumpers, through the library and under the swinging chandelier to the flippers.',
  surface: 'ice',
  biome: 'playfield',
  lighting: 'parlour',
  pinball: { art: 'manor', display: 'MULTIBALL!', finish: 'JACKPOT!' },
  signature: 'Grand staircase',
  tvCameras: [
    { section: 'Grand staircase', at: 0.8, side: 'left', distance: 6, height: 8 },
    { section: 'Back staircase', at: 0.6, side: 'right', distance: 6, height: 8 },
  ],
  start: { landmark: 'graveyard', gate: 'trapdoor', shots: { countdown: 'above', launch: 'low-chase' } },
  finish: {},
  designChanges: [
    'Built from the tunnel launch (the crypt: a pile-up of tombstone bumpers, bumper posts and the crypt tunnel) and staircases, the library layout made for this table: a sweep through the portrait gallery, the grand staircase, a slalom drop down the graveyard lane, the library run with its lightning-rod spinner and bumper posts, the second staircase, the hairpin late under the swinging chandelier and bumper posts on the run to the flippers.',
    'The design\'s layout idea was twin spirals (two spiral staircases); that library layout is Whistler Spins\', so the table has its own with two spirals, as decided.',
    'The tombstone pop bumpers are blocks marbles are knocked aside round (the crypt\'s pile-up) and bumper posts are pegs; the flippers at the finish stand outside the catch area and flap on a fixed rhythm, never touching a marble.',
  ],
  opening: opening('tunnel-launch', {
    tunnel: 'city-wall',
    costumes: { block: 'tomb-bumper', slalom: 'bumper-post' },
    names: { portal: 'Into the crypt', tunnel: 'Crypt tunnel' },
  }),
  sections: layout('staircases', {
    costumes: { slalom: 'bumper-post', curtain: 'lightning-rod', block: 'bookcase', swipe: 'chandelier', peg: 'bumper-post' },
    dress: {
      gallery: { name: 'Portrait gallery', landmarks: [{ name: 'haunted-manor', at: 0.5, side: 'right', distance: 70 }] },
      stair1: { name: 'Grand staircase' },
      slalomDrop: { name: 'Graveyard lane', landmarks: [{ name: 'graveyard', at: 0.5, side: 'left', distance: 26 }] },
      library: { name: 'Library' },
      stair2: { name: 'Back staircase' },
      brakingStraight: { name: 'Hall to the ballroom' },
      hairpin: { name: 'Chandelier hairpin' },
      lastStraight: { name: 'Down to the flippers' },
    },
  }),
});
