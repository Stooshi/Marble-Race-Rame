'use strict';

// Sydney Harbour New Year: Holiday Season 2026 track (Coasters), Track of the Day on New Year's Eve.
// A summer New Year's Eve with fireworks bursting over the harbour all race long: off a lighthouse on
// the headland, down round the harbour's edge, past the sail-roofed hall and under
// the great arch bridge, among the boats to the line.
const { track, opening, curtain, slalom, straight, sBends, sweep, spiral, halfPipe, hairpin, plunge, runIn, swipe, peg, rumble, boost } = require('../trackKit');

module.exports = track({
  slug: 'sydney-harbour-new-year',
  name: 'Sydney Harbour New Year',
  season: 'holiday-2026',
  family: 'coaster',
  difficulty: 'extreme',
  description: 'A summer New Year\'s Eve, fireworks bursting over the harbour all race long: off a lighthouse on the headland, down round the harbour\'s edge, past a sail-roofed hall and under a great arch bridge, among the boats to the line.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'fireworks-night',
  coaster: { height: 16, colours: { support: '#f2f2ee', rail: '#2a7ac8', tie: '#2e3a4a' } },
  signature: 'Bridge sweep',
  tvCameras: [
    { section: 'Bridge sweep', at: 0.8, side: 'right', distance: 10, height: 12 },
    { section: 'Ferry spin', at: 0.8, side: 'left', distance: 10, height: 12 },
  ],
  start: { landmark: 'harbour-arch-bridge', scenery: ['palms'], type: 'lighthouse', gate: 'stalls', shots: { countdown: 'above', launch: 'high-behind' } },
  finish: { landmark: 'marina' },
  designChanges: [
    'The gate stands on the gallery of a lighthouse on the headland (a new start type); a clean drop lets the field go in waves down to the harbour, past the sail-roofed hall, rather than the planned peg drop (two coasters already open with one); the half-pipe is left out, as it let the strongest marbles break away.',
    'The fireworks burst over the harbour all race long (the new fireworks-night sky, looks only). The arch bridge and the sail-roofed hall are generic; no names on anything drawn.',
  ],
  opening: opening('clean-drop', { side: 'right', names: { plunge: 'Headland drop', bends: 'Harbour bends' }, dress: { plunge: { height: 10 }, bends: { height: 2, landmarks: [{ name: 'opera-house', side: 'left', at: 0.3, distance: 90 }] } } }),
  sections: [
    { name: 'Quay straight', shape: straight(60, { grade: 0.11 }), height: 0, obstacles: [peg({ costume: 'mooring-pole', at: 0.15, line: 'center' }), peg({ costume: 'mooring-pole', at: 0.35, line: 'left' }), peg({ costume: 'mooring-pole', at: 0.55, line: 'right' }), peg({ costume: 'mooring-pole', at: 0.75, line: 'center' })] },
    { name: 'Bridge sweep', shape: sweep({ side: 'left', radius: 90, degrees: 105, grade: 0.09 }), height: 18, billboards: 2, obstacles: [curtain({ costume: 'banner-gantry', at: 0.5, side: 'right' })] },
    { name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), height: 6, billboards: 1, obstacles: [peg({ costume: 'mooring-pole', at: 0.15, line: 'center' }), peg({ costume: 'mooring-pole', at: 0.32, line: 'left' }), peg({ costume: 'mooring-pole', at: 0.5, line: 'right' })] },
    { name: 'Hairpin', shape: hairpin({ side: 'left' }), height: 8, obstacles: [swipe({ costume: 'container-crane', side: 'high' })] },
    { name: 'Ferry spin', shape: spiral({ side: 'right', radius: 52, turns: 1, grade: 0.15 }), height: 12, around: 'clocktower' },
    { name: 'Ferry pier', shape: straight(50, { grade: 0.12 }), height: 4, obstacles: [peg({ costume: 'mooring-pole', at: 0.15, line: 'center' }), peg({ costume: 'mooring-pole', at: 0.35, line: 'left' }), peg({ costume: 'mooring-pole', at: 0.55, line: 'right' }), peg({ costume: 'mooring-pole', at: 0.75, line: 'center' })] },
    { name: 'Headland bends', shape: sBends({ first: 'left', radius: 60, degrees: 80, grade: 0.12 }), height: 4, billboards: 2, obstacles: [curtain({ costume: 'banner-gantry', at: 0.5, side: 'right' })] },
    {
      name: 'Among the boats', shape: straight(95, { grade: 0.14 }), height: 3,
      obstacles: [peg({ costume: 'mooring-pole', at: 0.12, line: 'center' }), peg({ costume: 'mooring-pole', at: 0.24, line: 'left' }), peg({ costume: 'mooring-pole', at: 0.36, line: 'right' }), peg({ costume: 'mooring-pole', at: 0.48, line: 'center' })], features: [rumble({ from: 0.6, to: 0.95, count: 3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
