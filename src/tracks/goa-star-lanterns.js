'use strict';

// Goa Star Lanterns: Holiday Season 2026 track (Arcade), Track of the Day on 4 December. A bright
// 8-bit lantern world on a warm night: a pipe drop at the gate, down the palm lane to the early
// hairpin, round a long sweep under strings of paper star lanterns, the S-bends past a white
// church front (architecture only), the lantern splitter and the last straight to the line.
const { track, opening, straight, sBends, sweep, hairpin, splitter, runIn, peg, swipe, curtain, rumble } = require('../trackKit');

module.exports = track({
  slug: 'goa-star-lanterns',
  name: 'Goa Star Lanterns',
  family: 'arcade',
  season: 'holiday-2026',
  difficulty: 'extreme',
  description: 'A bright 8-bit lantern world on a warm night: down a palm lane, round a long sweep under strings of paper star lanterns, past a white church front and through the lantern splitter to the line.',
  surface: 'ice',
  biome: 'blacklight-carpet',
  lighting: 'neon-night',
  billboardFrame: 'marquee',
  arcade: { art: 'star-lanterns', finish: 'STAR BRIGHT!' },
  signature: 'Star lantern sweep',
  tvCameras: [
    { section: 'Star lantern sweep', at: 0.5, side: 'right', distance: 8, height: 14 },
    { section: 'Lantern splitter', at: 0.5, side: 'left', distance: 8, height: 14 },
  ],
  start: { landmark: 'star-lanterns', gate: 'barrier', shots: { countdown: 'chase', launch: 'overhead' } },
  finish: { landmark: 'pixel-palms' },
  designChanges: [
    'Paper star lanterns hang on strings over the sweep and at the gate, drawn as glowing pixel stars; the palms and the white church front are pixel blocks too. The church is architecture only: a white gabled front with two bell towers, nothing on it.',
    'Laser curtains (curtains of light) hang over the sweep and the S-bends, the arcade\'s way of stringing lights; they race like the kit\'s curtains.',
  ],
  opening: opening('pipe-drop', { side: 'left', names: { plunge: 'Lantern drop', pipe: 'Pixel pipe' } }),
  sections: [
    {
      name: 'Palm lane', shape: straight(60, { grade: 0.1 }),
      landmarks: [{ name: 'pixel-palms', side: 'right', at: 0.5, distance: 22 }],
      obstacles: [peg({ costume: 'street-lamp', at: 0.15, line: 'center' }), peg({ costume: 'street-lamp', at: 0.3, line: 'left' }), peg({ costume: 'street-lamp', at: 0.45, line: 'right' }), peg({ costume: 'street-lamp', at: 0.6, line: 'center' })],
    },
    { name: 'Lantern hairpin', shape: hairpin({ side: 'left' }), obstacles: [swipe({ costume: 'street-sign', side: 'high' })] },
    {
      name: 'Star lantern sweep', shape: sweep({ side: 'right', radius: 85, degrees: 130, grade: 0.09 }), billboards: 2,
      landmarks: [{ name: 'star-lanterns', side: 'left', at: 0.5, distance: 18 }],
      obstacles: [curtain({ costume: 'laser-curtain', at: 0.5, side: 'left' })],
    },
    {
      name: 'Church square S-bends', shape: sBends({ first: 'left', radius: 70, degrees: 75, grade: 0.11 }), billboards: 1,
      landmarks: [{ name: 'pixel-white-church', side: 'high', at: 0.5, distance: 30 }],
      obstacles: [peg({ costume: 'street-lamp', at: 0.25, line: 'center' }), curtain({ costume: 'laser-curtain', at: 0.55, side: 'right' }), peg({ costume: 'street-lamp', at: 0.8, line: 'center' })],
    },
    { name: 'Lantern splitter', shape: splitter({ side: 'right', balance: { tipOffset: -2.2, left: { drag: 0.33, scrub: 0.55 }, right: { drag: 1.68, scrub: 1.68 } } }) },
    {
      name: 'Last straight', shape: straight(90, { grade: 0.11 }), billboards: 1,
      obstacles: [peg({ costume: 'street-lamp', at: 0.15, line: 'right' }), peg({ costume: 'street-lamp', at: 0.3, line: 'left' }), peg({ costume: 'street-lamp', at: 0.45, line: 'center' })],
      features: [rumble({ from: 0.65, to: 0.95, count: 3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
