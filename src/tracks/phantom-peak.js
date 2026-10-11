'use strict';

// Phantom Peak: a spooky theme-park mountain at dusk, our own invented park (no real
// park's name, logo or ride). Off the skull rock on the summit, low over a misty swamp,
// through the graveyard crypt, round the totem hairpin, over the airtime hills and
// round a smoking volcano to the midway.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'phantom-peak',
  name: 'Phantom Peak',
  family: 'coaster',
  difficulty: 'extreme',
  description: 'A coaster through a spooky theme-park mountain at dusk: off a glowing-eyed skull rock, low over a misty swamp, through a graveyard crypt, round a carved totem and a smoking volcano to the lit midway.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'sunset',
  coaster: { height: 18, colours: { support: '#4a2a5a', rail: '#c8c2d8', tie: '#2a2430' } },
  signature: 'Airtime hills',
  start: { landmark: 'skull-rock', scenery: ['bare'] },
  finish: { landmark: 'park-midway', billboards: 2, scenery: ['crowd'] },
  designChanges: [
    'Built from the libraries: the staggered drop (the field let go in waves down the first drop, through tumbling barrels and a slalom of tombstones) and the early-hairpin layout. The design\'s seven fixed sections are replaced by the layout, as decided for the coaster series; its landmark moments stay: the skull rock and the park gate at the lift hill, the swoop low over the swamp, the graveyard crypt tunnel, the totem at the hairpin, the airtime hills with other coasters across the valley, the spin round the smoking volcano and the midway station.',
    'The airtime hills are the layout\'s S-bends up on tall supports; the hops stay low, as the recipe asks.',
    'The layout adds a splitter after the airtime hills (two sets of rails on a wider frame) and a short drop out of the hairpin, with more tombstones.',
    'The crypt tunnel is the straight before the hairpin, its braking zone; it is a rock tunnel, with the graveyard and its crypt at the portal.',
    'No hanging vines in the swamp and no parked ticket booth: the layout has no curtain or parked object there. The swamp keeps its twisted trees, and the ticket booths stand on the midway.',
  ],
  opening: opening('staggered-drop', {
    costumes: { block: 'barrel', slalom: 'tombstone' },
    names: { plunge: 'Lift hill and first drop' },
    dress: { plunge: { height: 24 } },
  }),
  sections: layout('early-hairpin', {
    costumes: { swipe: 'park-totem', slalom: 'tombstone' },
    dress: {
      sweep: { name: 'Swamp swoop', height: 0, scenery: ['bare'] },
      brakingStraight: { name: 'Graveyard crypt', tunnel: 'rock', billboards: 0, landmarks: [{ name: 'graveyard', at: 0.05, side: 'left', distance: 22 }] },
      hairpin: { name: 'Totem hairpin', height: 20 },
      outOfHairpin: { name: 'Out of the hairpin', height: 24 },
      sBends: { name: 'Airtime hills', height: 32, landmarks: [{ name: 'distant-coasters', at: 0.5, side: 'right', distance: 150 }] },
      splitter: { name: 'Haunted splitter', height: 22 },
      spiral: { name: 'Volcano spin', height: 12, around: 'volcano-rock' },
      lastStraight: { name: 'Midway run', height: 3 },
    },
  }),
});
