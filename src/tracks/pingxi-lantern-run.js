'use strict';

// Pingxi Lantern Run (Moses, 16 Nov 2026: ten more Coasters tracks; one of the four Wild ones). A coaster through the
// Pingxi valley in Taiwan, where sky lanterns are let go: from a pagoda at the top of the valley the field drops off
// and stays together along the old railway (nothing in its way for the first seconds), then the big feature: the drop
// down the wide waterfall through its falling water, the lanterns strung along the village street in S-bends, the
// little train, a sweep through the jungle, the hairpin and the run to the lantern bridge. No names on anything.
const { track, opening, straight, sweep, sBends, hairpin, waterfall, runIn, peg, slalom, moguls, pileUp, brake } = require('../trackKit');

module.exports = track({
  slug: 'pingxi-lantern-run',
  name: 'Pingxi Lantern Run',
  family: 'coaster',
  difficulty: 'wild',
  description: 'A coaster through the Pingxi valley in Taiwan, where the sky lanterns are let go: from a pagoda at the top of the valley, along the old railway, down the wide waterfall through its falling water, along the lantern-strung village street and through the jungle to the lantern bridge.',
  surface: 'ice',
  biome: 'jungle',
  lighting: 'sunset',
  variants: ['night'],
  coaster: { height: 14, colours: { support: '#6a2a24', rail: '#f2c24a', tie: '#2a1e1a' } },
  signature: 'The wide falls',
  tvCameras: [
    // (In the spray at the foot of the falls, looking back up at the field coming down through the water.)
    { section: 'In the spray', at: 0.5, side: 'left', distance: 10, height: 12 },
    { section: 'Jungle sweep', at: 0.6, side: 'right', distance: 10, height: 10 },
  ],
  start: { landmark: 'hanging-lanterns', scenery: ['stilt-houses'], type: 'pagoda-tower', gate: 'paddle', shots: { countdown: 'crane', launch: 'overhead' } },
  finish: { landmark: 'lantern-bridge', billboards: 1 },
  opening: opening('pipe-drop', {
    side: 'right',
    costumes: { block: 'monkey', slalom: 'lantern-pole' },
    names: { plunge: 'Off the pagoda' },
    waves: { groups: 5, gap: 0.12, jitter: 0.04 },
    dress: {},
  }),
  sections: [
    {
      name: 'Along the old railway', shape: straight(70, { grade: 0.12 }), height: 12, billboards: 2,
    },
    {
      name: 'The wide falls', shape: waterfall(55, { grade: 0.6, curtain: true }), height: 0,
      landmarks: [{ name: 'long-waterfall', at: 0.5, side: 'right', distance: 30 }],
    },
    {
      name: 'In the spray', shape: straight(50, { grade: 0.13 }), height: 0,
      obstacles: [peg({ costume: 'lantern-pole', at: 0.25, line: 'right' }), peg({ costume: 'lantern-pole', at: 0.5, line: 'left' }), peg({ costume: 'lantern-pole', at: 0.75, line: 'center' })],
    },
    {
      name: 'Below the falls', shape: sBends({ first: 'right', radius: 65, degrees: 70, grade: 0.15 }), height: 4,
      obstacles: [peg({ costume: 'lantern-pole', at: 0.3, line: 'left' }), peg({ costume: 'lantern-pole', at: 0.7, line: 'right' })],
    },
    {
      name: 'Lantern street', shape: sBends({ first: 'left', radius: 65, degrees: 70, grade: 0.15 }), height: 6,
      landmarks: [{ name: 'lantern-row', at: 0.5, side: 'right', distance: 22 }],
      obstacles: [slalom({ costume: 'lantern-pole', from: 0.3, to: 0.8, count: 4, loss: 0.25 })],
    },
    {
      name: 'Past the little train', shape: straight(55, { grade: 0.13 }), height: 8,
      landmarks: [{ name: 'steam-train', at: 0.5, side: 'left', distance: 26 }],
      obstacles: [pileUp({ costume: 'monkey', at: 0.25 }), peg({ costume: 'lantern-pole', at: 0.5, line: 'left' })],

    },
    {
      name: 'Jungle sweep', shape: sweep({ side: 'left', radius: 75, degrees: 90, grade: 0.15 }), height: 12, billboards: 2,
      obstacles: [peg({ costume: 'lantern-pole', at: 0.35, line: 'right' }), peg({ costume: 'lantern-pole', at: 0.7, line: 'left' })],
    },
    { name: 'To the hairpin', shape: straight(40, { grade: 0.13 }), height: 8, features: [brake({ at: 0.05, length: 14, drag: 0.03 })] },
    { name: 'Village hairpin', shape: hairpin({ side: 'right' }), height: 8 },
    {
      name: 'Bamboo bends', shape: sBends({ first: 'left', radius: 65, degrees: 70, grade: 0.15 }), height: 4,
      obstacles: [peg({ costume: 'lantern-pole', at: 0.25, line: 'center' }), peg({ costume: 'lantern-pole', at: 0.5, line: 'right' }), peg({ costume: 'lantern-pole', at: 0.75, line: 'left' })],
    },
    {
      name: 'Run to the bridge', shape: straight(70, { grade: 0.15 }), height: 0,
      obstacles: [slalom({ costume: 'lantern-pole', from: 0.4, to: 0.85, count: 3, loss: 0.3 })],
    },
    { name: 'Finish', shape: runIn(), height: 0 },
  ],
});
