'use strict';

// Berlin Blue Lanes: Track and Field track 2. Berlin's 1936 stadium: a stone oval of pale limestone,
// a colonnade round its top and the blue track; S-bends in, round the stadium's
// bend, down the blue lanes past the colonnades, out under the bell tower and round the park to the
// line.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'berlin-blue-lanes',
  name: 'Berlin Blue Lanes',
  family: 'athletics',
  difficulty: 'extreme',
  description: 'Through Berlin\'s 1936 stadium on its blue track: S-bends in, round the stone stadium\'s bend and down the blue lanes past the colonnades, then out under the bell tower and round the park to the line.',
  surface: 'tartan-blue',
  biome: 'city',
  lighting: 'day',
  variants: ['sunset'],
  athletics: { stadium: 'berlin-1936', lanes: 'blue' },
  coaster: { style: 'concrete', colours: { support: '#cfc5b2', rail: '#f4f1ea', tie: '#284f80' } },
  signature: 'The blue lanes',
  tvCameras: [
    { section: 'Stadium bend', at: 0.5, side: 'right', distance: 8, height: 9 },
    { section: 'Hairpin', at: 0.5, side: 'left', distance: 8, height: 9 },
  ],
  start: { landmark: 'stadium-bell-tower', type: 'straight-lift', gate: 'trapdoor', shots: { countdown: 'side', launch: 'low-chase' } },
  finish: { landmark: 'stone-colonnade' },
  designChanges: [
    'Built from the staggered drop (the field leaves in waves) and the blue lanes, the library layout made for this track: deep S-bends (they mix the field), the stadium\'s bend, the colonnade straight, a climb and a drop, a long sweep, a part-spiral and the hairpin. (The tunnel launch first planned kept the front starting group ahead: average place 9.95 to 10.12.)',
    'Blue tartan, as Berlin\'s; the stadium is drawn round the bend and the straight: limestone stands, a colonnade round the top, a light ring roof (looks only).',
  ],
  opening: opening('staggered-drop', {
    costumes: { block: 'steeple-barrier', slalom: 'hurdle' },
  }),
  sections: layout('blue-lanes', {
    costumes: { slalom: 'hurdle', peg: 'hurdle', block: 'steeple-barrier', parked: 'hurdle-cart' },
    dress: {
      entryBends: { name: 'S-bends' },
      stadiumBend: { name: 'Stadium bend', stadium: true },
      colonnade: { name: 'The blue lanes', stadium: true },
      crest: { name: 'Climb' },
      drop: { name: 'Under the tower', landmarks: [{ name: 'stone-colonnade', at: 0.5, side: 'left', distance: 24 }] },
      longSweep: { name: 'Round the park' },
      spin: { name: 'Spiral' },
      brakingStraight: { name: 'Run to the hairpin' },
      hairpin: { name: 'Hairpin' },
      lastStraight: { name: 'Run to the line' },
    },
  }),
});
