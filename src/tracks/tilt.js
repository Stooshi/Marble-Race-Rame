'use strict';

// Tilt: a 1970s diner and pinball parlour table, the electromechanical era. The whole playfield
// is nudged: the field drops past milkshake bumpers into a steep banked first turn, sweeps along
// the diner counter, hops over the score reels, pours down the soda fountain to the lower
// playfield, S-bends past the booths, a flipper at the hairpin, a spin round a giant jukebox and
// a row of jukeboxes on the run to the flippers, where the bell chimes and MATCH lights up.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'tilt',
  name: 'Tilt',
  family: 'pinball',
  difficulty: 'extreme',
  description: 'A 1970s diner pinball table: nudged into a steep banked turn past milkshake bumpers, over the score reels, down the soda fountain to the lower playfield and round a giant jukebox to the flippers.',
  surface: 'ice',
  biome: 'playfield',
  lighting: 'parlour',
  pinball: { art: 'diner', display: 'DON\'T TILT!', finish: 'MATCH!' },
  signature: 'Soda fountain',
  tvCameras: [
    { section: 'Soda fountain', at: 0.6, side: 'left', distance: 6, height: 12 },
    { section: 'Jukebox spin', at: 0.6, side: 'right', distance: 6, height: 8 },
  ],
  start: { landmark: 'retro-diner', gate: 'paddle', shots: { countdown: 'front', launch: 'overhead' } },
  finish: {},
  designChanges: [
    'Built from the banked first turn (the steep first drop past a pile-up of milkshake bumpers and a slalom of bumper posts, straight into a steep banked turn, the nudge) and lower playfield, the library layout made for this table: a long sweep along the diner counter, a straight over the score-reel bumps, the soda fountain as a waterfall down to the lower playfield, S-bends, the hairpin with a flipper, a sweep out of it, a spiral round a giant jukebox and a row of jukeboxes and bumper posts on the run to the flippers.',
    'The neon TILT sign stands on the diner at the start and on the backglass rather than flashing on every bumper hit; the flashing and the bell are left for the sound and light pass. The spinning score reels are the bumps on the straight before the soda fountain, painted cream and black.',
  ],
  opening: opening('banked-turn', {
    side: 'left',
    costumes: { block: 'milkshake-bumper', slalom: 'bumper-post' },
    names: { plunge: 'The nudge', turn: 'Banked turn' },
  }),
  sections: layout('lower-playfield', {
    mirror: true,
    bumps: 'reels',
    costumes: { swipe: 'flipper-bat', parked: 'jukebox', peg: 'bumper-post' },
    dress: {
      sweep: { name: 'Along the counter', addObstacles: [{ obstacle: 'peg', costume: 'bumper-post', at: 0.6, line: 'center', radius: 0.4 }], landmarks: [{ name: 'retro-diner', at: 0.5, side: 'left', distance: 55 }] },
      reels: { name: 'Over the score reels', addObstacles: [{ obstacle: 'peg', costume: 'bumper-post', at: 0.4, line: 'left', radius: 0.4 }] },
      drop: { name: 'Soda fountain', landmarks: [{ name: 'soda-fountain', at: 0.5, side: 'right', distance: 16 }] },
      lower: { name: 'Lower playfield' },
      spiral: { name: 'Jukebox spin', around: 'jukebox-tower' },
      sBends: { name: 'Booth bends' },
      brakingStraight: { name: 'Run to the hairpin' },
      hairpin: { name: 'Flipper hairpin' },
      outOfHairpin: { name: 'Out of the booth' },
      lastStraight: { name: 'Down to the flippers' },
    },
  }),
});
