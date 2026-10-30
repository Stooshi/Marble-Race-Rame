'use strict';

// Marble Stadium Sprint: Track and Field track 1. A long, narrow arena of white marble in Athens,
// open at one end: in through the open end, down the home straight, round the hairpin at the marble
// end, back up the far straight and out past the athletes' village, round a spiral, a drop and
// S-bends to the line.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'marble-stadium-sprint',
  name: 'Marble Stadium Sprint',
  family: 'athletics',
  difficulty: 'extreme',
  description: 'Through the white marble stadium in Athens: in at its open end, down the long home straight, round the hairpin at the marble end and back up the far straight, then out round a spiral and S-bends to the line.',
  surface: 'tartan',
  biome: 'city',
  lighting: 'day',
  variants: ['sunset'],
  athletics: { stadium: 'panathenaic', lanes: 'red' },
  coaster: { style: 'concrete', colours: { support: '#d8d3c8', rail: '#f4f1ea', tie: '#8d3b30' } },
  signature: 'The marble end',
  // TV moments: trackside cameras at the marble end (outside the hairpin) and on the S-bends home.
  tvCameras: [
    { section: 'The marble end', at: 0.5, side: 'left', distance: 6, height: 9 },
    { section: 'More S-bends', at: 0.5, side: 'right', distance: 8, height: 9 },
  ],
  start: { landmark: 'herm-gateway', type: 'stepped-platform', gate: 'barrier', shots: { countdown: 'side', launch: 'high-behind' } },
  finish: { landmark: 'medal-podium' },
  designChanges: [
    'Built from the classic plunge (from a stepped platform) and the horseshoe sprint, the library layout made for this track: deep, tight S-bends in through the open end (they mix the field), the home straight, the hairpin round the marble end, the far straight, a sweep out, a spiral, a drop and S-bends.',
    'The stadium is drawn round the home straight, the hairpin and the far straight: white marble stands, open at the end the track comes in by, no roof (looks only).',
    'Start shots that look down the track (30 Oct 2026, Moses): the lane numbers, painted as on a real track, read the right way up only from behind the field, so no face-on countdown or look-back first seconds on Track and Field.',
  ],
  opening: opening('classic', {
    costumes: { block: 'steeple-barrier', slalom: 'hurdle' },
    dress: { plunge: { height: 0 } },
  }),
  sections: layout('horseshoe-sprint', {
    costumes: { slalom: 'hurdle', peg: 'hurdle', block: 'steeple-barrier', parked: 'hurdle-cart' },
    dress: {
      approach: { name: 'S-bends into the arena', landmarks: [{ name: 'athletes-village', at: 0.5, side: 'right', distance: 40 }] },
      homeStraight: { name: 'Home straight', stadium: true },
      hairpin: { name: 'The marble end', stadium: true },
      backStraight: { name: 'Far straight', stadium: true },
      finalSweep: { name: 'Out of the arena' },
      spin: { name: 'Spiral', around: 'medal-podium' },
      drop: { name: 'Drop' },
      sBends: { name: 'More S-bends' },
      lastStraight: { name: 'Run to the line' },
    },
  }),
});
