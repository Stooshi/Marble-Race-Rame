'use strict';

// London Steeplechase: Track and Field track 8. London's stadium under its white roof ring: the
// steeplechase, heavy barriers across the lanes and the water jump inside the stadium, then out in
// S-bends and a drop, the hairpin, a spiral and a last sweep to the line.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'london-steeplechase',
  name: 'London Steeplechase',
  family: 'athletics',
  difficulty: 'extreme',
  description: 'A steeplechase through London\'s stadium at sunset: heavy barriers and the water jump under the white roof ring, then out in S-bends and a drop, round the hairpin, a spiral and a last sweep to the line.',
  surface: 'tartan',
  biome: 'city',
  lighting: 'sunset',
  variants: ['day'],
  athletics: { stadium: 'london', lanes: 'red' },
  coaster: { style: 'concrete', colours: { support: '#c9cbcf', rail: '#f4f1ea', tie: '#8d3b30' } },
  signature: 'The water jump',
  tvCameras: [
    { section: 'The water jump', at: 0.5, side: 'left', distance: 8, height: 9 },
    { section: 'Hairpin', at: 0.5, side: 'right', distance: 8, height: 9 },
  ],
  start: { landmark: 'steeple-pit', type: 'cliff', gate: 'trapdoor', shots: { countdown: 'chase', launch: 'high-behind' } },
  finish: { landmark: 'medal-podium' },
  designChanges: [
    'Built from the peg drop (seven barriers down the start plunge, the field let go in waves) and the steeple water, the library layout made for this track: a barrier straight, a sweep, a second barrier and the water jump (a short stretch of water with a light brake, the same for every lane), S-bends, a drop, the hairpin, a spiral and a sweep.',
    'The barriers are big pegs (each drawn the size of its peg: blocks, which stop marbles dead, spread the field to a 23 s gap); the stadium is drawn round the second barrier, the water jump and the S-bends: grey stands under a white roof ring (looks only).',
  ],
  opening: opening('peg-drop', {
    costumes: { peg: 'steeple-peg' },
    names: { plunge: 'Barrier drop' },
    dress: { plunge: { height: 0 } },
  }),
  sections: layout('steeple-water', {
    costumes: { swipe: 'camera-crane', slalom: 'hurdle', peg: 'hurdle', block: 'steeple-barrier', barrier: 'steeple-peg', parked: 'hurdle-cart' },
    dress: {
      barrier1: { name: 'Barrier straight' },
      sweep: { name: 'Sweep' },
      barrier2: { name: 'Second barrier', stadium: true },
      waterJump: { name: 'The water jump', stadium: true, surface: 'water' },
      sBends: { name: 'S-bends', stadium: true },
      drop: { name: 'Drop' },
      brakingStraight: { name: 'Run to the hairpin' },
      hairpin: { name: 'Hairpin' },
      spin: { name: 'Spiral' },
      sweep2: { name: 'Last sweep' },
      lastStraight: { name: 'Run to the line' },
    },
  }),
});
