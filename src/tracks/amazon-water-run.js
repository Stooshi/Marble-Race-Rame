'use strict';

// Amazon Water Run: racing down a jungle river, over two waterfalls, to a riverside
// village. The marbles ride on the water as if it were ice. Moses's design ("New Track
// Designs", 5), built with the track kit. (Toucans, a sloth, a river dolphin, a caiman
// and a jaguar: Rio has the jungle start and the anaconda.)
const {
  track, straight, sBends, spiral, hairpin, waterfall, runIn,
  block, pileUp, slalom, bump, peg, brake,
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
  tvCameras: [
    { section: 'Pool below the falls', at: 0.5, side: 'left', distance: 6, height: 12 },
    { section: 'Jungle S-bends', at: 0.85, side: 'right', distance: 6, height: 6 },
  ],
  billboardFrame: 'wood',
  // The gate on mossy rocks at the top of a waterfall, toucans on the branches overhead; the
  // finish at a wooden river dock beside a village on stilts, the Teatro Amazonas far off.
  start: { landmark: 'toucan-tree', gate: 'paddle', shots: { countdown: 'side', launch: 'high-behind' } },
  finish: { landmark: 'teatro-amazonas', scenery: ['stilt-houses'] },
  designChanges: [
    'Its own layout (Moses, 15 Nov 2026: World Tour re-layouts): over the first waterfall past the floating logs, tight S-bends through the jungle, the rapids, the caiman hairpin, over the second waterfall (the big feature, through its falling water), the root spiral, S-bends past the sloth and the river dolphin and the run to the village on stilts.',
    'The floating logs lie in a pile-up where the first waterfall pours into the river, followed by river marker stakes glanced off like slalom gates: with no obstacles down the start the front of the gate won far too often.',
    'A straight, "Pool below the falls", between the second waterfall and the root spiral: without it the spiral wound round right beside the waterfall\'s rock fill, which came between the follow camera and its marble.',
    'The root spiral winds down in the open jungle, not through a tunnel of giant roots: the roots tunnel took a phone over its drawing budget.',
    'A straight, "Run to the falls", between the hairpin and the second waterfall: the recipe needs a straight before a waterfall, so the field comes down off the walls before the lip.',
  ],
  // (Let go in jittered waves, a new order every race: without them the front starting places won more.)
  waves: { groups: 5, gap: 0.13, jitter: 0.1 },
  sections: [
    {
      // Floating logs piled up where the waterfall pours into the river, then the river pilots' marker stakes.
      name: 'First waterfall', shape: waterfall(80, { grade: 0.6 }),
      obstacles: [pileUp({ costume: 'log', at: 0.42 }), slalom({ costume: 'river-stake', from: 0.55, to: 0.97, count: 6, loss: 0.3 })],
    },
    {
      name: 'Jungle S-bends', shape: sBends({ first: 'left', radius: 55, degrees: 110, grade: 0.12 }), billboards: 2,
      landmarks: [{ name: 'river-pool', at: 0.5, side: 'right', distance: 24 }],
      obstacles: [peg({ costume: 'river-stake', at: 0.35, line: 'right' }), peg({ costume: 'river-stake', at: 0.7, line: 'left' })],
    },
    // The rapids: rocks under the surface, two low bumps. (Also the braking zone before the hairpin.)
    {
      name: 'Rapids', shape: straight(80, { grade: 0.13 }), features: [bump({ at: 0.5 }), bump({ at: 0.7 })], billboards: 1,
      obstacles: [peg({ costume: 'river-stake', at: 0.15, line: 'left' }), peg({ costume: 'river-stake', at: 0.28, line: 'right' })],
    },
    { name: 'Caiman hairpin', shape: hairpin({ side: 'right' }), obstacles: [block({ costume: 'caiman', line: 'high' })] },
    // (Not in the design: the recipe needs a straight before a waterfall, so the field comes down off the walls first.)
    { name: 'Run to the falls', shape: straight(35, { grade: 0.15 }) },
    // The track's big feature: the second waterfall, the field dropping through its falling water.
    { name: 'Second waterfall', shape: waterfall(60, { grade: 0.38, curtain: true }) },
    // (Not in the design: a pool below the falls, so the spiral starts clear of the waterfall's rock fill.)
    { name: 'Pool below the falls', shape: straight(40, { grade: 0.15 }) },
    {
      name: 'Root spiral', shape: spiral({ side: 'right', radius: 45, grade: 0.14 }),
      obstacles: [peg({ costume: 'river-stake', at: 0.35, line: 'right' }), peg({ costume: 'river-stake', at: 0.7, line: 'left' })],
    },
    {
      name: 'River S-bends', shape: sBends({ first: 'right', radius: 65, degrees: 90, grade: 0.12 }), billboards: 1,
      obstacles: [peg({ costume: 'river-stake', at: 0.25, line: 'left' }), peg({ costume: 'river-stake', at: 0.5, line: 'center' }), peg({ costume: 'river-stake', at: 0.75, line: 'right' })],
    },
    {
      name: 'Final run', shape: straight(85, { grade: 0.13 }), figures: ['jaguar'],
      features: [brake({ at: 0.05, length: 10, drag: 0.02 })],
      obstacles: [slalom({ costume: 'river-stake', from: 0.5, to: 0.88, count: 3, loss: 0.35 })],
    },
    { name: 'Finish', shape: runIn(), landmarks: [{ name: 'river-dock', at: 0.5, side: 'left', distance: 6 }] },
  ],
});
