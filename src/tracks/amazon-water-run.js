'use strict';

// Amazon Water Run: racing down a jungle river, over two waterfalls, to a riverside
// village. The marbles ride on the water as if it were ice. Moses's design ("New Track
// Designs", 5), built with the track kit. (Toucans, a sloth, a river dolphin, a caiman
// and a jaguar: Rio has the jungle start and the anaconda.)
const {
  track, straight, sBends, sweep, spiral, hairpin, splitter, waterfall, runIn,
  block, pileUp, slalom, boost, bump,
} = require('../trackKit');

module.exports = track({
  slug: 'amazon-water-run',
  name: 'Amazon Water Run',
  difficulty: 'extreme',
  description: 'Down a jungle river and over two waterfalls, past a sloth, a river dolphin and a caiman, to a village on stilts.',
  surface: 'water',
  biome: 'jungle',
  lighting: 'day',
  variants: ['rain', 'fog'],
  signature: 'Second waterfall',
  billboardFrame: 'wood',
  // The gate on mossy rocks at the top of a waterfall, toucans on the branches overhead; the
  // finish at a wooden river dock beside a village on stilts, the Teatro Amazonas far off.
  start: { landmark: 'toucan-tree' },
  finish: { landmark: 'teatro-amazonas', scenery: ['stilt-houses'] },
  designChanges: [
    'The floating logs lie in a pile-up where the first waterfall pours into the river, followed by river marker stakes glanced off like slalom gates, instead of on the S-bends: with no obstacles down the start the front of the gate won far too often (the first starting group finished 3 places ahead of the last), and logs on the bends spread the field to a 30 s gap.',
    'A 40 m straight, "Pool below the falls", between the second waterfall and the root spiral: without it the spiral wound round right beside the waterfall\'s rock fill, which came between the follow camera and its marble.',
    'The root spiral winds down in the open jungle, not through a tunnel of giant roots: the roots tunnel, seen across the hillside from much of the track, took a phone over its drawing budget (36 draw calls; 35 allowed).',
    'A 35 m straight, "Run to the falls", between the hairpin and the second waterfall: the recipe needs a straight before a waterfall, so the field comes down off the walls before the lip.',
  ],
  sections: [
    {
      // Floating logs piled up where the waterfall pours into the river, then the river pilots' marker stakes.
      name: 'First waterfall', shape: waterfall(80, { grade: 0.6 }),
      obstacles: [pileUp({ costume: 'log', at: 0.42 }), slalom({ costume: 'river-stake', from: 0.55, to: 0.97, count: 6, loss: 0.3 })],
    },
    {
      name: 'River S-bends', shape: sBends({ first: 'left', radius: 75, degrees: 80, grade: 0.13 }),
      billboards: 1,
    },
    {
      name: 'Island splitter', shape: splitter({ side: 'left', balance: { tipOffset: -0.8, left: { drag: 1.32, scrub: 1.32 }, right: { drag: 0.42, scrub: 0.72 } } }),
      around: 'river-island',
    },
    {
      name: 'Wide river sweep', shape: sweep({ side: 'right', radius: 80, degrees: 160, grade: 0.07 }), features: [boost({ at: 0.08 })], billboards: 2,
      landmarks: [{ name: 'river-pool', at: 0.5, side: 'left', distance: 18 }],
    },
    // The rapids: rocks under the surface, two low bumps. (Also the braking zone before the hairpin.)
    { name: 'Rapids', shape: straight(80, { grade: 0.14 }), features: [bump({ at: 0.45 }), bump({ at: 0.65 })], billboards: 1 },
    { name: 'Caiman hairpin', shape: hairpin({ side: 'left' }), obstacles: [block({ costume: 'caiman', line: 'high', size: 'large' })] },
    // (Not in the design: the recipe needs a straight before a waterfall, so the field comes down off the walls first.)
    { name: 'Run to the falls', shape: straight(35, { grade: 0.15 }) },
    { name: 'Second waterfall', shape: waterfall(60, { grade: 0.38, curtain: true }) },
    // (Not in the design: a pool below the falls, so the spiral starts clear of the waterfall's rock fill.)
    { name: 'Pool below the falls', shape: straight(40, { grade: 0.15 }) },
    { name: 'Root spiral', shape: spiral({ side: 'right', radius: 45, grade: 0.17 }) },
    { name: 'Final run', shape: straight(90, { grade: 0.2 }), figures: ['jaguar'] },
    { name: 'Finish', shape: runIn(), landmarks: [{ name: 'river-dock', at: 0.5, side: 'left', distance: 6 }] },
  ],
});
