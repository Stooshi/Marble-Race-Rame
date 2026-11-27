'use strict';

// Coliseum Anchor Leg: Track and Field track 9. The Los Angeles Memorial Coliseum: a great open
// bowl, its row of tall arches and the flame cauldron at one end; S-bends, a climb and a drop
// through the arches, a sweep, a spiral and the hairpin, then into the bowl and the anchor leg's
// final sprint to the line.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'coliseum-anchor-leg',
  name: 'Coliseum Anchor Leg',
  family: 'athletics',
  difficulty: 'extreme',
  description: 'Into the Los Angeles Memorial Coliseum at sunset: through the arches, round a sweep, a spiral and the hairpin, then into the great bowl past the flame cauldron for the anchor leg\'s long final sprint.',
  surface: 'tartan',
  biome: 'city',
  lighting: 'sunset',
  variants: ['day'],
  athletics: { stadium: 'coliseum', lanes: 'red' },
  coaster: { style: 'concrete', colours: { support: '#cdbb9a', rail: '#f4f1ea', tie: '#8d3b30' } },
  signature: 'The anchor leg',
  tvCameras: [
    { section: 'The arena pipe', at: 0.5, side: 'right', distance: 8, height: 14 },
    { section: 'Hairpin', at: 0.5, side: 'left', distance: 8, height: 9 },
  ],
  start: { landmark: 'field-events', type: 'stepped-platform', gate: 'barrier', shots: { countdown: 'chase', launch: 'overhead' } },
  designChanges: [
    'Built from the clean drop (its first S-bends to the right, the field let go in waves) and the anchor arches, the library layout made for this track: a half-pipe through the arena, a climb and a drop through the arches, a sweep, a peg straight with a slalom, a spiral, the hairpin, a long sweep into the bowl and a long final sprint.',
    'The stadium is drawn round the last sweep and the final sprint: a great open bowl, a row of tall arches at one end and a plain flame cauldron on them, our own plain bowl (looks only).',
    'Start shots that look down the track (30 Oct 2026, Moses): the lane numbers, painted as on a real track, read the right way up only from behind the field, so no face-on countdown or look-back first seconds on Track and Field.',
  ],
  opening: opening('clean-drop', { side: 'right' }),
  sections: layout('anchor-arches', {
    costumes: { swipe: 'camera-crane', slalom: 'hurdle', peg: 'hurdle', block: 'steeple-barrier', parked: 'hurdle-cart' },
    dress: {
      pipe: { name: 'The arena pipe' },
      crest: { name: 'Climb' },
      arches: { name: 'Through the arches', landmarks: [{ name: 'peristyle-arches', at: 0.5, side: 'left', distance: 30 }] },
      sweep: { name: 'Sweep' },
      spin: { name: 'Spiral' },
      brakingStraight: { name: 'Run to the hairpin' },
      hairpin: { name: 'Hairpin' },
      sweep2: { name: 'Into the bowl', stadium: true },
      lastStraight: { name: 'The anchor leg', stadium: true },
    },
  }),
});
