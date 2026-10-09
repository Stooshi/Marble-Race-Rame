'use strict';

// Åre Run (Sweden): a winter-evening race down Åreskutan under the northern
// lights, finishing in Åre village by the frozen Åresjön. Moses's design
// ("New Track Designs", 9), built with the track kit.
const {
  track, plunge, straight, sBends, sweep, spiral, hairpin, splitter, runIn,
  block, pileUp, parked, slalom, boost, brake, moguls,
} = require('../trackKit');

module.exports = track({
  slug: 'are-run',
  name: 'Åre Run',
  difficulty: 'extreme',
  description: 'A winter-evening race down Åreskutan under the northern lights, finishing by the frozen lake in Åre village.',
  surface: 'snow',
  biome: 'alpine',
  lighting: 'night-northern-lights',
  signature: 'Funicular spiral',
  billboardFrame: 'wood',
  // The gate near the top of Åreskutan, bare and wind-swept; the finish in the village by
  // the frozen Åresjön, warm lights in the wooden houses and the old stone church nearby.
  start: { scenery: ['bare'] },
  finish: { landmark: 'church', scenery: ['frozen-lake', 'wooden-houses'] },
  sections: [
    { name: 'Summit plunge', shape: plunge(80, { grade: 0.6 }), obstacles: [pileUp({ costume: 'reindeer', at: 0.42 }), slalom({ from: 0.6, to: 0.97, count: 5, loss: 0.25 })], scenery: ['bare'] },
    { name: 'Fell S-bends', shape: sBends({ first: 'left', radius: 75, degrees: 80, grade: 0.13 }), scenery: ['rocks'], billboards: 1 },
    { name: 'Splitter', shape: splitter({ side: 'left', balance: { tipOffset: -1.7, left: { drag: 1.52, scrub: 1.52 }, right: { drag: 0.42, scrub: 0.72 } } }), around: 'mountain-hut', scenery: ['rocks'] },
    {
      name: 'Lake sweep', shape: sweep({ side: 'right', radius: 80, degrees: 160, grade: 0.07 }), features: [boost({ at: 0.08 })],
      billboards: 2, overhead: ['gondola'], scenery: ['pines'],
    },
    // (Not in the design: the recipe's braking zone needs a straight before the one sharp bend.)
    { name: 'Run to the hairpin', shape: straight(50, { grade: 0.13 }), billboards: 1, scenery: ['birches'] },
    { name: 'Hairpin', shape: hairpin({ side: 'left' }), obstacles: [block({ costume: 'reindeer', line: 'high', size: 'large' })], scenery: ['birches'] },
    {
      // The steepest stretch after the start: a nod to Åre's alpine World Championships.
      name: 'World Championship plunge', shape: plunge(120, { grade: 0.38, from: 0.16 }),
      features: [moguls({ from: 0.4, to: 0.95, count: 8 })], scenery: ['race-netting'],
    },
    { name: 'Funicular spiral', shape: spiral({ side: 'right', radius: 45, grade: 0.17 }), scenery: ['funicular'] },
    {
      name: 'Final plunge', shape: straight(90, { grade: 0.18 }),
      obstacles: [parked({ costume: 'kick-sled', at: 0.4, side: 'right', length: 8 })], scenery: ['wooden-houses'],
    },
    { name: 'Finish', shape: runIn(), scenery: ['frozen-lake'] },
  ],
});
