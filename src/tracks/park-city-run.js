'use strict';

// Park City Run (Utah, USA): down the mountain past old silver-mining relics to
// Park City's historic Main Street. Moses's design ("New Track Designs", 7),
// built with the track kit. (An elk, not a moose: Bobsleigh Run has the moose.)
const {
  track, plunge, straight, sBends, sweep, spiral, hairpin, splitter, runIn,
  block, pileUp, parked, slalom, boost, moguls,
} = require('../trackKit');

module.exports = track({
  slug: 'park-city-run',
  name: 'Park City Run',
  difficulty: 'extreme',
  description: 'Down the Wasatch past old silver-mine relics and through a timbered mine tunnel to historic Main Street.',
  surface: 'snow',
  biome: 'alpine',
  lighting: 'day',
  signature: 'Mine tunnel',
  billboardFrame: 'wood',
  // The gate at a summit lift station, the Wasatch peaks all around; the finish at the
  // bottom of Main Street, Old West shopfronts and the town lift overhead. (No Olympic rings.)
  start: { landmark: 'lift-station', scenery: ['bare'] },
  finish: { scenery: ['shopfronts'] },
  designChanges: [
    'A 50 m straight, "Run to the hairpin", before the hairpin: the recipe needs a braking zone before the one sharp bend.',
    'A few elk on the summit plunge (a pile-up before the slalom gates): without it the strongest marbles win too often, as on Åre Run.',
  ],
  sections: [
    {
      name: 'Summit plunge', shape: plunge(80, { grade: 0.6 }),
      obstacles: [pileUp({ costume: 'elk', at: 0.42 }), slalom({ from: 0.55, to: 0.97, count: 6, loss: 0.3 })], scenery: ['bare'],
    },
    { name: 'Aspen S-bends', shape: sBends({ first: 'left', radius: 75, degrees: 80, grade: 0.13 }), scenery: ['aspens'], billboards: 1 },
    {
      name: 'Mine splitter', shape: splitter({ side: 'left', balance: { tipOffset: -0.8, left: { drag: 1.42, scrub: 1.42 }, right: { drag: 0.42, scrub: 0.72 } } }),
      around: 'mine-headframe', landmarks: [{ name: 'mine-buildings', at: 0.6, side: 'right', distance: 16 }], scenery: ['aspens'],
    },
    { name: 'Valley sweep', shape: sweep({ side: 'right', radius: 80, degrees: 160, grade: 0.08 }), features: [boost({ at: 0.08 })], billboards: 2, scenery: ['pines'] },
    // (Not in the design: the recipe's braking zone needs a straight before the one sharp bend.)
    { name: 'Run to the hairpin', shape: straight(50, { grade: 0.13 }), billboards: 1, scenery: ['aspens'] },
    { name: 'Hairpin', shape: hairpin({ side: 'left' }), obstacles: [block({ costume: 'elk', line: 'high', size: 'large' })], scenery: ['pines'] },
    {
      name: 'Mine tunnel', shape: straight(70, { grade: 0.19 }), tunnel: 'mine',
      obstacles: [parked({ costume: 'ore-cart', at: 0.45, side: 'right', length: 8 })],
    },
    {
      name: 'Terrain-park run', shape: straight(110, { grade: 0.22 }),
      features: [moguls({ from: 0.35, to: 0.9, count: 6 })], figures: ['snowboarder', 'snowboarder', 'skier'],
      landmarks: [{ name: 'snow-park', at: 0.5, side: 'left', distance: 12 }], scenery: ['pines'],
    },
    { name: 'Spiral', shape: spiral({ side: 'right', radius: 45, grade: 0.17 }), scenery: ['pines'] },
    { name: 'Finish', shape: runIn(), overhead: ['chairlift'], scenery: ['shopfronts'] },
  ],
});
