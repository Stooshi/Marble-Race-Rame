'use strict';

// Oaxaca Posadas Run: Holiday Season 2026 track (World Tour), Track of the Day on 17 December, as the
// posadas begin. A warm night in the old colonial town: down the church steps, a jib line along the
// market under strings of papel picado, past a candlelit posada procession, round the bell tower and
// through the coloured streets to a little plaza of star piñatas.
const { track, opening, straight, sBends, sweep, spiral, hairpin, plunge, runIn, peg, slalom, swipe, rumble, jibLine } = require('../trackKit');

module.exports = track({
  slug: 'oaxaca-posadas-run',
  name: 'Oaxaca Posadas Run',
  season: 'holiday-2026',
  difficulty: 'extreme',
  description: 'A warm December night in the old colonial town: a jib line along the market under strings of papel picado, past a candlelit posada procession, round the bell tower and through the coloured streets to a plaza of star piñatas.',
  surface: 'stone',
  biome: 'city',
  lighting: 'night',
  variants: ['sunset'],
  signature: 'Market jib line',
  tvCameras: [
    { section: 'Procession sweep', at: 0.5, side: 'left', distance: 8, height: 14 },
    { section: 'Bell tower spiral', at: 0.5, side: 'right', distance: 9, height: 14 },
  ],
  start: { landmark: 'church', gate: 'barrier', shots: { countdown: 'above', launch: 'low-chase' } },
  finish: { landmark: 'pinata-line', scenery: ['market-stalls'] },
  designChanges: [
    'A staggered drop down the church steps at the gate (the field let go in waves past a pile-up of barrels and a slalom of lanterns) rather than the planned clean drop: a clean drop leaves the field too spread out for its overtakes.',
    'The posada procession is people walking two by two with candles behind a lantern on a pole (no figures from the nativity); the piñatas are star piñatas. No names of real places, churches or shops on anything drawn.',
  ],
  opening: opening('staggered-drop', { costumes: { block: 'barrel', slalom: 'lantern-pole' }, names: { plunge: 'Church steps drop' } }),
  sections: [
    {
      name: 'Market jib line', shape: straight(110, { grade: 0.1 }), scenery: ['market-stalls'], billboards: 1,
      features: [jibLine({ from: 0.15 })], landmarks: [{ name: 'papel-picado', side: 'left', at: 0.5, distance: 10 }],
    },
    {
      name: 'Procession sweep', shape: sweep({ side: 'left', radius: 80, degrees: 110, grade: 0.09 }), billboards: 2,
      landmarks: [{ name: 'posada-procession', side: 'low', at: 0.5, distance: 10 }],
    },
    { name: 'Coloured street bends', shape: sBends({ first: 'right', radius: 65, degrees: 85, grade: 0.12 }), scenery: ['colourful-houses'], billboards: 2, obstacles: [slalom({ costume: 'lantern-pole', from: 0.2, to: 0.8, count: 4, loss: 0.2 })] },
    { name: 'Bell tower spiral', shape: spiral({ side: 'left', radius: 48, turns: 1, grade: 0.16 }), around: 'bell-tower' },
    { name: 'Run to the hairpin', shape: straight(45, { grade: 0.12 }), obstacles: [peg({ costume: 'lantern-pole', at: 0.25, line: 'left' }), peg({ costume: 'lantern-pole', at: 0.5, line: 'right' })] },
    { name: 'Hairpin', shape: hairpin({ side: 'right' }), obstacles: [swipe({ costume: 'camera-crane', side: 'high' })] },
    { name: 'Plaza drop', shape: plunge(50, { grade: 0.2, from: 0.1 }), obstacles: [slalom({ costume: 'lantern-pole', from: 0.35, to: 0.95, count: 5, loss: 0.3 })] },
    { name: 'Run to the piñatas', shape: straight(80, { grade: 0.14 }), scenery: ['colourful-houses'], features: [rumble({ from: 0.6, to: 0.95, count: 3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
