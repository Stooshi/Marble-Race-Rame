'use strict';

// Beijing Nest 200: Track and Field track 5. The woven steel nest in Beijing, at night: S-bends in,
// round its long sweeping bend into the straight, out through S-bends, the hairpin and a spiral to
// the line.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'beijing-nest-200',
  name: 'Beijing Nest 200',
  family: 'athletics',
  difficulty: 'extreme',
  description: 'Through Beijing\'s woven steel nest at night: S-bends in, round the long sweeping bend into the straight under the red-lit lattice, out through S-bends, round the hairpin and a spiral to the line.',
  surface: 'tartan',
  biome: 'city',
  lighting: 'night',
  variants: ['day'],
  athletics: { stadium: 'nest', lanes: 'red' },
  coaster: { style: 'concrete', colours: { support: '#9a9da3', rail: '#f4f1ea', tie: '#8d3b30' } },
  signature: 'The long bend',
  tvCameras: [
    { section: 'The long bend', at: 0.5, side: 'right', distance: 8, height: 9 },
    { section: 'Hairpin', at: 0.5, side: 'left', distance: 8, height: 9 },
  ],
  start: { landmark: 'woven-lattice', type: 'elevator', gate: 'barrier', shots: { countdown: 'side', launch: 'overhead' } },
  finish: { landmark: 'medal-podium' },
  designChanges: [
    'Built from the clean drop (its first S-bends to the left, the field let go in waves) and the nest bend, the library layout made for this track: one long sweeping bend (a half circle) into the home straight of hurdles, S-bends, the hairpin (a camera crane swipe), S-bends out of it, a slalom straight, a spiral and the run-in.',
    'The stadium is drawn round the long bend and the straight: red seats inside a woven steel shell, lit red from within (looks only).',
  ],
  opening: opening('clean-drop', {
    side: 'left',
  }),
  sections: layout('nest-bend', {
    costumes: { swipe: 'camera-crane', slalom: 'hurdle', peg: 'hurdle', block: 'steeple-barrier', parked: 'hurdle-cart' },
    dress: {
      longBend: { name: 'The long bend', stadium: true },
      homeStraight: { name: 'Home straight', stadium: true },
      sBends: { name: 'More S-bends' },
      brakingStraight: { name: 'Run to the hairpin' },
      hairpin: { name: 'Hairpin' },
      sweep2: { name: 'Out of the hairpin' },
      spin: { name: 'Spiral' },
      lastStraight: { name: 'Run to the line' },
    },
  }),
});
