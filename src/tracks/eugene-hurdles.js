'use strict';

// Eugene Hurdles: Track and Field track 4. Hayward Field, Oregon: a modern stadium of timber and
// steel; into the stadium round its bend, down the hurdles straight (rows of hurdles), the hairpin,
// out past the field events and round to the line.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'eugene-hurdles',
  name: 'Eugene Hurdles',
  family: 'athletics',
  difficulty: 'extreme',
  description: 'Through Hayward Field in Oregon: S-bends in, round the stadium\'s bend and down the hurdles straight, rows of hurdles across the lanes, then the hairpin, a climb and a drop and a spiral to the line.',
  surface: 'tartan',
  biome: 'city',
  lighting: 'day',
  variants: ['sunset'],
  athletics: { stadium: 'hayward', lanes: 'red' },
  coaster: { style: 'concrete', colours: { support: '#a99372', rail: '#f4f1ea', tie: '#8d3b30' } },
  signature: 'Hurdles straight',
  tvCameras: [
    { section: 'Hurdles straight', at: 0.5, side: 'left', distance: 8, height: 9 },
    { section: 'Spiral', at: 0.5, side: 'right', distance: 8, height: 9 },
  ],
  start: { landmark: 'timber-stand', type: 'curving-lift', gate: 'paddle', shots: { countdown: 'chase', launch: 'side' } },
  finish: { landmark: 'field-events' },
  designChanges: [
    'Built from the peg drop (seven hurdles down the start plunge, the field let go in waves, as from staggered starts) and the hurdles straight, the library layout made for this track: S-bends, the stadium\'s bend, a long straight of hurdles ending in a slalom, the hairpin, a sweep, a climb and a drop, a spiral and a run-in past two hurdles.',
    'The hurdles are the pegs (each drawn the size of its peg); the stadium is drawn round the bend and the hurdles straight: timber and steel stands, a canopy over one side, a slender tower (looks only).',
  ],
  opening: opening('peg-drop', {
    costumes: { peg: 'hurdle' },
    names: { plunge: 'Hurdle drop' },
  }),
  sections: layout('hurdles-straight', {
    costumes: { slalom: 'hurdle', peg: 'hurdle', block: 'steeple-barrier', parked: 'hurdle-cart' },
    dress: {
      sBends: { name: 'S-bends' },
      sweep: { name: 'Stadium bend', stadium: true },
      hurdles: { name: 'Hurdles straight', stadium: true },
      brakingStraight: { name: 'Run to the hairpin' },
      hairpin: { name: 'Hairpin' },
      sweep2: { name: 'Round the field events', landmarks: [{ name: 'field-events', at: 0.5, side: 'left', distance: 30 }] },
      crest: { name: 'Climb' },
      drop: { name: 'Drop' },
      spin: { name: 'Spiral' },
      lastStraight: { name: 'Run to the line' },
    },
  }),
});
