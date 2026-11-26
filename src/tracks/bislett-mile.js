'use strict';

// Bislett Mile: Track and Field track 3. Bislett, Oslo: a tight, steep classic stadium in the city;
// round and round on a long spiral (the laps), then into the stadium down its home straight and
// round its bend, out to the hairpin and a second spiral (the bell lap) to the line.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'bislett-mile',
  name: 'Bislett Mile',
  family: 'athletics',
  difficulty: 'extreme',
  description: 'Round and round on a long spiral (the laps), then into Bislett\'s tight, steep stadium in Oslo, down its home straight and round its bend, out to the hairpin and the bell lap: a second spiral and S-bends to the line.',
  surface: 'tartan',
  biome: 'city',
  lighting: 'sunset',
  variants: ['day'],
  athletics: { stadium: 'bislett', lanes: 'red' },
  coaster: { style: 'concrete', colours: { support: '#9a9ca0', rail: '#f4f1ea', tie: '#8d3b30' } },
  signature: 'The laps',
  tvCameras: [
    { section: 'The laps', at: 0.5, side: 'right', distance: 8, height: 9 },
    { section: 'Hairpin', at: 0.5, side: 'left', distance: 8, height: 9 },
  ],
  start: { landmark: 'warm-up-track', type: 'spiral-tower', gate: 'stalls', shots: { countdown: 'above', launch: 'overhead' } },
  finish: { landmark: 'medal-podium' },
  designChanges: [
    'Built from the pipe drop (its first swing to the right) and the bell lap, the library layout made for this track: a long spiral (the laps), a slalom drop, a peg straight, a sweep, the hairpin, a slalom straight, a second spiral the other way (the bell lap) and S-bends.',
    'The stadium is drawn round the home straight and the bend: steep, tight stands, roofs over the straights, four floodlight masts (looks only).',
  ],
  opening: opening('pipe-drop', {
    side: 'right',
    names: { pipe: 'Warm-up pipe' },
  }),
  sections: layout('bell-lap', {
    costumes: { swipe: 'camera-crane', slalom: 'hurdle', peg: 'hurdle', block: 'steeple-barrier', parked: 'hurdle-cart' },
    dress: {
      lapSpiral: { name: 'The laps' },
      backStraight: { name: 'Home straight', stadium: true },
      sweep: { name: 'Stadium bend', stadium: true },
      brakingStraight: { name: 'Run to the hairpin' },
      hairpin: { name: 'Hairpin' },
      straight2: { name: 'Slalom straight' },
      bellSpiral: { name: 'The bell lap', around: 'floodlight-mast' },
      sBends: { name: 'S-bends' },
      lastStraight: { name: 'Run to the line' },
    },
  }),
});
