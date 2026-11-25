'use strict';

// Finland Forest Rally (Moses, 12 Nov 2026: eleven new motorsport Grand Prix tracks, the first of four Wild ones). A
// gravel rally stage through the lake forests of Finland on a summer night under the midnight sun: a rumble start
// over the ruts into the Gravel S-bends, along the Forest straight, over the Ridge crest (a short climb and a rounded
// top, no jump) and down the Lake drop (the big feature, the signature: a big drop through the pines to the lake
// shore), round the shore, the Farm hairpin, the Birch S-bends, the Second drop and back through the pines to the
// line. Generic rally pieces only: no real rally, series, team, driver or sponsor.
const {
  track, opening, straight, plunge, climb, sBends, sweep, hairpin, runIn, peg, slalom, rumble, curtain,
} = require('../trackKit');

module.exports = track({
  slug: 'finland-forest-rally',
  name: 'Finland Forest Rally',
  difficulty: 'medium',
  description: 'A gravel rally stage through the lake forests of Finland on a summer night under the midnight sun: over the ruts from the start, through the pines, over a ridge crest and down a big drop to the lake, round the shore and the farm hairpin and back through the birches to the line.',
  surface: 'sand',
  biome: 'meadow',
  lighting: 'midnight-sun',
  variants: ['day'],
  grandPrix: { crowd: 'fans', barrier: 'logs', groupsEvery: 900 },
  signature: 'Lake drop',
  tvCameras: [
    // (At the foot of the big drop, looking back up it at the field pouring down through the pines.)
    { section: 'Lake drop', at: 0.95, side: 'left', distance: 9, height: 9 },
  ],
  start: { landmark: 'mountain-hut', gate: 'stalls', shots: { countdown: 'crane', launch: 'low-chase' } },
  finish: { landmark: 'pit-garages', scenery: ['grandstand'] },
  opening: opening('rumble-start', {
    costumes: { slalom: 'rally-flag' },
    names: { plunge: 'Rumble start' },
    dress: { plunge: { scenery: ['pines'] } },
  }),
  sections: [
    {
      name: 'Gravel S-bends', shape: sBends({ first: 'left', radius: 60, degrees: 90, grade: 0.14 }),
      obstacles: [slalom({ costume: 'rally-flag', from: 0.4, to: 0.7, count: 3, loss: 0.2 })],
    },
    {
      name: 'Forest straight', shape: straight(80, { grade: 0.16 }), billboards: 2,
      obstacles: [slalom({ costume: 'rally-flag', from: 0.3, to: 0.55, count: 3, loss: 0.3 })],
    },
    { name: 'Ridge crest', shape: climb(14, { grade: -0.06, after: 0.2 }) },
    {
      name: 'Lake drop', shape: plunge(60, { grade: 0.34, from: 0.2 }),
    },
    {
      name: 'Lakeshore sweep', shape: sweep({ side: 'right', radius: 70, degrees: 130, grade: 0.13 }), billboards: 2,
    },
    {
      name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }),
    },
    { name: 'Farm hairpin', shape: hairpin({ side: 'left' }), scenery: ['crowd'] },
    {
      name: 'Birch S-bends', shape: sBends({ first: 'right', radius: 65, degrees: 80, grade: 0.15 }),
      obstacles: [slalom({ costume: 'rally-flag', from: 0.4, to: 0.7, count: 3, loss: 0.2 })],
    },
    {
      name: 'Second drop', shape: plunge(50, { grade: 0.27, from: 0.15 }), billboards: 1,
    },
    {
      name: 'Pine sweep', shape: sweep({ side: 'left', radius: 75, degrees: 100, grade: 0.13 }),
      obstacles: [curtain({ costume: 'banner-gantry', at: 0.35, side: 'high' })],
    },
    {
      name: 'Home straight', shape: straight(65, { grade: 0.17 }), billboards: 2, scenery: ['grandstand'],
      features: [rumble({ from: 0.55, to: 0.85, count: 3 })],
    },
    { name: 'Finish', shape: runIn(), scenery: ['grandstand'] },
  ],
});
