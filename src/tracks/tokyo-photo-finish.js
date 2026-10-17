'use strict';

// Tokyo Photo Finish: Track and Field track 6. Tokyo's National Stadium: a roof of timber slats,
// green on its edge; round the city in S-bends and a spiral, the hairpin and a drop, then into the
// stadium round its bend and down the long straight to the photo finish.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'tokyo-photo-finish',
  name: 'Tokyo Photo Finish',
  family: 'athletics',
  difficulty: 'extreme',
  description: 'To Tokyo\'s National Stadium under its timber roof: round the city in S-bends and a spiral, the hairpin and a drop, then into the stadium round its bend and down the long straight to a photo finish.',
  surface: 'tartan',
  biome: 'city',
  lighting: 'day',
  variants: ['sunset'],
  athletics: { stadium: 'tokyo', lanes: 'red' },
  coaster: { style: 'concrete', colours: { support: '#9a8a72', rail: '#f4f1ea', tie: '#8d3b30' } },
  signature: 'The photo finish',
  tvCameras: [
    { section: 'Peg straight', at: 0.5, side: 'left', distance: 8, height: 9 },
    { section: 'Sweep', at: 0.5, side: 'right', distance: 8, height: 9 },
  ],
  start: { landmark: 'wooden-eaves', type: 'rooftop', gate: 'paddle', shots: { countdown: 'above', launch: 'low-chase' } },
  designChanges: [
    'Built from the pipe drop (its first swing to the right, the field let go in waves) and the photo finish, the library layout made for this track: S-bends, a slalom drop, a peg straight, a spiral, a sweep, the hairpin (a camera crane swipe), a drop, a long sweep into the stadium and a long run to the line.',
    'The stadium is drawn round the last sweep and the run to the line: deep stands in earthy mosaic colours under a roof of timber slats; the photo-finish camera flashes as the winner crosses (looks only).',
  ],
  opening: opening('pipe-drop', {
    side: 'right',
  }),
  sections: layout('photo-finish', {
    costumes: { swipe: 'camera-crane', slalom: 'hurdle', peg: 'hurdle', block: 'steeple-barrier', parked: 'hurdle-cart' },
    dress: {
      sBends: { name: 'S-bends' },
      pegStraight: { name: 'Peg straight' },
      roofSpiral: { name: 'Spiral' },
      sweep: { name: 'Sweep' },
      brakingStraight: { name: 'Run to the hairpin' },
      hairpin: { name: 'Hairpin' },
      drop: { name: 'Drop' },
      longSweep: { name: 'Into the stadium', stadium: true },
      lastStraight: { name: 'The photo finish', stadium: true },
    },
  }),
});
