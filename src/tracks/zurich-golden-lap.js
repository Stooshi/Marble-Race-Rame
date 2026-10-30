'use strict';

// Zurich Golden Lap: Track and Field track 10. Letzigrund, Zurich: a night meeting under the
// floodlights; out of the players' tunnel, a sweep and a drop, the hairpin and a spiral, then the
// golden lap round the stadium under its band of floodlights, S-bends and a golden finish.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'zurich-golden-lap',
  name: 'Zurich Golden Lap',
  family: 'athletics',
  difficulty: 'extreme',
  description: 'A night meeting at Zurich\'s Letzigrund: out of the players\' tunnel, round the hairpin and a spiral, then the golden lap round the floodlit stadium and a golden finish, gold lights and confetti for the winner.',
  surface: 'tartan',
  biome: 'city',
  lighting: 'night',
  variants: ['day'],
  athletics: { stadium: 'letzigrund', lanes: 'red' },
  coaster: { style: 'concrete', colours: { support: '#5c6168', rail: '#f4f1ea', tie: '#8d3b30' } },
  signature: 'The golden lap',
  tvCameras: [
    { section: 'Hairpin', at: 0.5, side: 'right', distance: 8, height: 9 },
    { section: 'The golden lap', at: 0.5, side: 'left', distance: 8, height: 9 },
  ],
  start: { landmark: 'athletes-village', type: 'rooftop', gate: 'stalls', shots: { countdown: 'above', launch: 'side' } },
  finish: { landmark: 'golden-arch' },
  designChanges: [
    'Built from the tunnel launch (the players\' tunnel) and the golden lap, the library layout made for this track: a peg straight, a sweep, a drop, a peg straight, the hairpin, a part-spiral, the long golden sweep round the stadium and S-bends.',
    'The stadium is drawn round the golden lap and the S-bends: a dark roof all round with a band of floodlights under it; once the winner is home, gold lamps light by the line and gold confetti flies (looks only).',
    'Start shots that look down the track (30 Oct 2026, Moses): the lane numbers, painted as on a real track, read the right way up only from behind the field, so no face-on countdown or look-back first seconds on Track and Field.',
  ],
  opening: opening('tunnel-launch', {
    tunnel: 'subway',
    costumes: { block: 'steeple-barrier', slalom: 'hurdle' },
    names: { portal: 'Down to the tunnel', tunnel: 'Players\' tunnel' },
  }),
  sections: layout('golden-lap', {
    costumes: { slalom: 'hurdle', peg: 'hurdle', block: 'steeple-barrier', parked: 'hurdle-cart' },
    dress: {
      leadIn: { name: 'Lead-in straight' },
      sweep: { name: 'Sweep' },
      drop: { name: 'Drop' },
      pegStraight: { name: 'Peg straight' },
      brakingStraight: { name: 'Run to the hairpin' },
      hairpin: { name: 'Hairpin' },
      spin: { name: 'Spiral', around: 'floodlight-mast' },
      goldenSweep: { name: 'The golden lap', stadium: true },
      sBends: { name: 'S-bends', stadium: true },
      lastStraight: { name: 'Run to the line' },
    },
  }),
});
