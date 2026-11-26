'use strict';

// Medellín Lights: Holiday Season 2026 track (Coasters), Track of the Day on 7 December, the candle night.
// The valley city at night in its Christmas lights: launched from the riverside station, a half-pipe
// along the river under arches of lights, a tunnel of lights, up through the hillside barrios under the
// cable cars and back down to the river bank lined with lit flowers and birds.
const { track, opening, straight, sBends, sweep, spiral, halfPipe, hairpin, plunge, runIn, slalom, swipe, peg, rumble, boost } = require('../trackKit');

module.exports = track({
  slug: 'medellin-lights',
  name: 'Medellín Lights',
  season: 'holiday-2026',
  family: 'coaster',
  difficulty: 'extreme',
  description: 'The valley city at night in its Christmas lights: along the river under arches of lights, through a tunnel of lights, up through the hillside barrios under the cable cars and down to a river bank lined with lit flowers and birds.',
  surface: 'ice',
  biome: 'city',
  lighting: 'night',
  coaster: { height: 16, colours: { support: '#2a2f3a', rail: '#ffd23f', tie: '#5a3a6a' } },
  signature: 'River of lights',
  tvCameras: [
    { section: 'River of lights', at: 0.9, side: 'left', distance: 6, height: 12 },
    { section: 'Cable car sweep', at: 0.8, side: 'left', distance: 10, height: 12 },
  ],
  start: { landmark: 'light-figures', type: 'stepped-platform', gate: 'stalls', shots: { countdown: 'front', launch: 'low-chase' } },
  finish: { landmark: 'light-arches' },
  designChanges: [
    'A peg drop at the gate (lantern posts; the field let go in waves) from a stepped platform. The half-pipe runs along the river beside its arches of lights (a tunnel cannot close over a half-pipe), and the tunnel of lights comes straight after it.',
    'The lit figures of flowers and birds stand at the start and along the last run; the hillside barrios are the colourful houses; the cable cars cross over the sweep. No names on anything drawn.',
  ],
  opening: opening('peg-drop', {
    costumes: { peg: 'lantern-pole' },
    names: { plunge: 'Station peg drop' },
    dress: { plunge: { height: 6 } },
  }),
  sections: [
    { name: 'Barrio bends', shape: sBends({ first: 'left', radius: 65, degrees: 85, grade: 0.12 }), height: 12, billboards: 2, scenery: ['colourful-houses'], obstacles: [slalom({ costume: 'lantern-pole', from: 0.2, to: 0.8, count: 4, loss: 0.2 })] },
    { name: 'Down to the river', shape: straight(30, { grade: 0.12 }), height: 4, obstacles: [peg({ costume: 'lantern-pole', at: 0.4, line: 'center' })] },
    {
      name: 'River of lights', shape: halfPipe({ first: 'right', width: 8, swings: 3, radius: 70, degrees: 30, grade: 0.12 }), height: 2,
      landmarks: [{ name: 'light-arches', side: 'left', at: 0.5, distance: 18 }],
    },
    { name: 'Tunnel of lights', shape: straight(60, { grade: 0.1 }), height: 0, tunnel: 'lit-tunnel' },
    { name: 'Clock tower spin', shape: spiral({ side: 'left', radius: 52, turns: 1.1, grade: 0.15 }), height: 14, around: 'clocktower' },
    { name: 'Cable car sweep', shape: sweep({ side: 'right', radius: 90, degrees: 130, grade: 0.085 }), height: 18, billboards: 2, overhead: ['cable-car'], features: [boost({ at: 0.08 })] },
    { name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), height: 6, billboards: 1, obstacles: [peg({ costume: 'lantern-pole', at: 0.2, line: 'center' }), peg({ costume: 'lantern-pole', at: 0.4, line: 'right' })] },
    { name: 'Hairpin', shape: hairpin({ side: 'left' }), height: 8, obstacles: [swipe({ costume: 'camera-crane', side: 'high' })] },
    { name: 'Lights drop', shape: plunge(50, { grade: 0.2, from: 0.1 }), height: 10, obstacles: [slalom({ costume: 'lantern-pole', from: 0.35, to: 0.95, count: 5, loss: 0.3 })] },
    { name: 'River bends', shape: sBends({ first: 'right', radius: 70, degrees: 75, grade: 0.12 }), height: 6 },
    {
      name: 'Riverbank run', shape: straight(75, { grade: 0.14 }), height: 3, landmarks: [{ name: 'light-figures', side: 'right', at: 0.5, distance: 16 }],
      obstacles: [peg({ costume: 'lantern-pole', at: 0.15, line: 'center' }), peg({ costume: 'lantern-pole', at: 0.3, line: 'left' })],
      features: [rumble({ from: 0.6, to: 0.95, count: 3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
