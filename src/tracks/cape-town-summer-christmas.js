'use strict';

// Cape Town Summer Christmas: Holiday Season 2026 track (Coasters), Track of the Day on 2 December.
// Christmas in high summer at the foot of the table-shaped mountain: down past the coloured houses,
// a jib line along the beachfront promenade hung with Christmas lights, round the waterfront clock
// tower, the braai smoke over the grass by the beach, and a long sweep along the sea to the line.
const { track, opening, straight, sBends, sweep, spiral, hairpin, plunge, runIn, slalom, swipe, peg, rumble, jibLine, boost } = require('../trackKit');

module.exports = track({
  slug: 'cape-town-summer-christmas',
  name: 'Cape Town Summer Christmas',
  season: 'holiday-2026',
  family: 'coaster',
  difficulty: 'extreme',
  description: 'Christmas in high summer at the foot of a table-shaped mountain: past the coloured houses, a jib line along the beachfront promenade hung with Christmas lights, round the waterfront clock tower and a long sweep along the sea through the braai smoke.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'day',
  coaster: { height: 16, colours: { support: '#f2efe6', rail: '#d23a3a', tie: '#2e4a66' } },
  signature: 'Promenade jib line',
  tvCameras: [
    { section: 'Promenade jib line', at: 0.8, side: 'left', distance: 10, height: 12 },
    { section: 'Beach sweep', at: 0.8, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'flat-top-mountain', scenery: ['colourful-houses'], type: 'stepped-platform', gate: 'stalls', shots: { countdown: 'above', launch: 'overhead' } },
  finish: { landmark: 'harbour', scenery: ['palms'] },
  designChanges: [
    'The table-shaped mountain is a generic flat-topped mountain with its cloth of cloud, behind the start; the clock tower is the kit\'s clock tower at the centre of the spin.',
    'The Christmas lights on the promenade are lamp posts strung with coloured lights and stars; the braai fires stand on the grass beside the Beach sweep. No names of real places on anything drawn.',
  ],
  opening: opening('split-start', {
    costumes: { block: 'buoy', slalom: 'street-lamp' },
    names: { plunge: 'Mountain drop' },
    dress: { plunge: { height: 22, scenery: ['colourful-houses'] } },
  }),
  sections: [
    {
      name: 'Promenade jib line', shape: straight(110, { grade: 0.1 }), height: 0, scenery: ['palms'],
      features: [jibLine({ from: 0.15 })], landmarks: [{ name: 'promenade-lights', side: 'left', at: 0.5, distance: 14 }],
    },
    { name: 'Clock tower spin', shape: spiral({ side: 'right', radius: 55, turns: 1.2, grade: 0.14 }), height: 12, around: 'clocktower' },
    { name: 'Harbour drop', shape: plunge(50, { grade: 0.2, from: 0.1 }), height: 14, obstacles: [slalom({ costume: 'lantern-pole', from: 0.45, to: 0.9, count: 3, loss: 0.1 })] },
    { name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), height: 6, billboards: 1 },
    { name: 'Hairpin', shape: hairpin({ side: 'right' }), height: 8, obstacles: [swipe({ costume: 'camera-crane', side: 'high' })] },
    {
      name: 'Beach sweep', shape: sweep({ side: 'left', radius: 90, degrees: 150, grade: 0.075 }), height: 12, billboards: 2,
      features: [boost({ at: 0.08 })], landmarks: [{ name: 'braai-fires', side: 'low', at: 0.5, distance: 26 }],
    },
    { name: 'Sea bends', shape: sBends({ first: 'right', radius: 75, degrees: 70, grade: 0.12 }), height: 6, billboards: 1, obstacles: [slalom({ costume: 'lantern-pole', from: 0.2, to: 0.8, count: 4, loss: 0.12 })] },
    {
      name: 'Waterfront run', shape: straight(90, { grade: 0.13 }), height: 3,
      features: [rumble({ from: 0.6, to: 0.95, count: 3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
