'use strict';

// Åre Run (Sweden): a winter-evening race down Åreskutan under the northern
// lights, finishing in Åre village by the frozen Åresjön. Moses's design
// ("New Track Designs", 9), built with the track kit.
const {
  track, opening, plunge, straight, sBends, sweep, spiral, hairpin, runIn,
  parked, slalom, moguls, peg, brake,
} = require('../trackKit');

module.exports = track({
  slug: 'are-run',
  name: 'Åre Run',
  difficulty: 'extreme',
  description: 'A winter-evening race down Åreskutan under the northern lights, finishing by the frozen lake in Åre village.',
  surface: 'snow',
  biome: 'alpine',
  lighting: 'night-northern-lights',
  signature: 'World Championship plunge',
  tvCameras: [
    // (At the foot of the plunge, looking back up the World Championship slope at the field coming down.)
    { section: 'Village S-bends', at: 0.2, side: 'left', distance: 6, height: 8 },
    { section: 'Kabinbanan sweep', at: 0.7, side: 'right', distance: 6, height: 6 },
  ],
  billboardFrame: 'wood',
  // The gate near the top of Åreskutan, bare and wind-swept; the finish in the village by
  // the frozen Åresjön, warm lights in the wooden houses and the old stone church nearby.
  start: { scenery: ['bare'], gate: 'trapdoor', shots: { countdown: 'front', launch: 'low-chase' } },
  designChanges: [
    'Its own layout (Moses, 15 Nov 2026: World Tour re-layouts): down the summit\'s moguls, the hairpin, a sweep under the gondola line, down the World Championship slope (the big feature), the funicular spiral, S-bends through the village and the run to the lake.',
    'A rumble start (since 15 Nov 2026): down the summit\'s mogul field, the field let go in jittered waves, which keep the luck the reindeer pile-up gave.',
  ],
  finish: { landmark: 'church', scenery: ['frozen-lake', 'wooden-houses'] },
  // (The rumble start: down the summit's mogul field and through the gates; let go in jittered waves, a new order
  // every race.)
  opening: opening('rumble-start', {
    names: { plunge: 'Summit moguls' },
    waves: { groups: 5, gap: 0.14, jitter: 0.1 },
  }),
  sections: [
    {
      name: 'Run to the hairpin', shape: straight(60, { grade: 0.13 }), billboards: 1, scenery: ['birches'],
      obstacles: [peg({ costume: 'snowman', at: 0.3, line: 'left' }), peg({ costume: 'snowman', at: 0.55, line: 'right' })],
    },
    { name: 'Hairpin', shape: hairpin({ side: 'left' }), scenery: ['birches'] },
    {
      name: 'Kabinbanan sweep', shape: sweep({ side: 'right', radius: 80, degrees: 150, grade: 0.1 }),
      billboards: 2, overhead: ['gondola'], scenery: ['rocks'],
      obstacles: [peg({ costume: 'snowman', at: 0.35, line: 'left' }), peg({ costume: 'snowman', at: 0.7, line: 'right' })],
    },
    { name: 'To the start house', shape: straight(30, { grade: 0.1 }), scenery: ['race-netting'] },
    {
      // Åre's alpine World Championship slope: the track's big feature, a long steep drop.
      name: 'World Championship plunge', shape: plunge(90, { grade: 0.38, from: 0.16 }),
      features: [moguls({ from: 0.45, to: 0.95, count: 8 })], scenery: ['race-netting'], billboards: 1,
    },
    { name: 'Funicular spiral', shape: spiral({ side: 'left', radius: 45, grade: 0.15 }), scenery: ['funicular'] },
    {
      name: 'Village S-bends', shape: sBends({ first: 'right', radius: 70, degrees: 75, grade: 0.12 }), scenery: ['wooden-houses'],
      obstacles: [peg({ costume: 'snowman', at: 0.3, line: 'right' }), peg({ costume: 'snowman', at: 0.7, line: 'left' })],
    },
    {
      name: 'Final straight', shape: straight(80, { grade: 0.13 }), scenery: ['wooden-houses'],
      features: [brake({ at: 0.05, length: 12, drag: 0.02 })],
      obstacles: [parked({ costume: 'kick-sled', at: 0.3, side: 'right', length: 8 }), slalom({ from: 0.55, to: 0.9, count: 3, loss: 0.3 })],
    },
    { name: 'Finish', shape: runIn(), scenery: ['frozen-lake'] },
  ],
});
