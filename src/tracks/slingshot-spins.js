'use strict';

// Slingshot Spins: a 1950s flying-saucer invasion pinball table. The marbles drop in waves from
// the hovering mothership past saucer bumpers, then long sweeps across the playfield under the
// saucers, through a ray-gun spinner, S-bends over the little town, an alien at the hairpin and
// a last sweep past a row of saucer targets to the flippers, where EXTRA BALL lights up.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'slingshot-spins',
  name: 'Slingshot Spins',
  family: 'pinball',
  difficulty: 'extreme',
  description: 'A flying-saucer pinball table: dropped in waves from the mothership, long sweeps under hovering saucers, through a ray-gun spinner, over a little 1950s town and past an alien at the hairpin to the flippers.',
  surface: 'ice',
  biome: 'playfield',
  lighting: 'parlour',
  pinball: { art: 'saucers', display: 'INVASION!', finish: 'EXTRA BALL!' },
  signature: 'Under the saucer',
  tvCameras: [
    { section: 'Under the saucer', at: 0.8, side: 'left', distance: 6, height: 8 },
    { section: 'Alien hairpin', at: 0.4, side: 'left', distance: 6, height: 8 },
  ],
  start: { landmark: 'flying-saucer', gate: 'paddle', shots: { countdown: 'chase', launch: 'side' } },
  finish: {},
  designChanges: [
    'Built from the staggered drop (the marbles drop in waves from the mothership, past a pile-up of saucer bumpers and a slalom of bumper posts) and saucer sweeps, the library layout made for this table: a long sweep under the saucers, a slalom drop, a second sweep through the ray-gun spinner, S-bends over the little town, the hairpin late with an alien, a last sweep and a row of saucer targets with bumper posts on the run to the flippers.',
    'The big wobbling saucer hovers high beside the second sweep, not over the middle of the track, so it never comes between the camera and the marbles; the strobe scene is left for the sound and light pass.',
  ],
  opening: opening('staggered-drop', {
    costumes: { block: 'saucer-bumper', slalom: 'bumper-post' },
    names: { plunge: 'Out of the mothership' },
  }),
  sections: layout('saucer-sweeps', {
    costumes: { slalom: 'bumper-post', curtain: 'ray-gun', swipe: 'alien', parked: 'saucer-targets', peg: 'bumper-post' },
    dress: {
      sweep1: { name: 'Across the playfield', landmarks: [{ name: 'saucer-town', at: 0.5, side: 'right', distance: 60 }] },
      drop: { name: 'Bumper drop' },
      sweep2: { name: 'Under the saucer', landmarks: [{ name: 'flying-saucer', at: 0.5, side: 'left', distance: 40 }] },
      sBends: { name: 'Over the town' },
      brakingStraight: { name: 'Run to the hairpin' },
      hairpin: { name: 'Alien hairpin' },
      sweep3: { name: 'Last sweep' },
      lastStraight: { name: 'Down to the flippers' },
    },
  }),
});
