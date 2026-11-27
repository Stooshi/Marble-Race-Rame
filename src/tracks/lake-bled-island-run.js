'use strict';

// Lake Bled Island Run (Moses, 15 Nov 2026: seven new World Tour tracks fill the pack to 20; one of the two Easy
// ones). The green lake under the Julian Alps on a bright morning: down from the meadow above the lake and round
// the first turn (the banked-turn start, the field let go in waves), up to the castle on its cliff (signature feature
// one), S-bends through the gorge, the hairpin, then right round the bay facing the little island with its church
// (the track's big feature and signature feature two: a dramatic banked turn), along the lake past the rowing boats
// to the promenade. Our own castle, island, church and boats; place names only.
const {
  track, opening, straight, climb, sBends, sweep, hairpin, runIn, peg, slalom, brake,
} = require('../trackKit');

module.exports = track({
  slug: 'lake-bled-island-run',
  name: 'Lake Bled Island Run',
  difficulty: 'easy',
  description: 'The green lake under the Julian Alps on a bright morning: up to the castle on its cliff, through the gorge, right round the bay facing the little island with its church and along the lake to the promenade.',
  surface: 'stone',
  biome: 'alpine-lake',
  lighting: 'day',
  variants: ['sunset'],
  // The lake along the west of the run (looks only): its cold, clear green water (Moses, 16 Nov 2026: an alpine
  // lake, not a Mediterranean coast), pine forest and the Julian Alps behind.
  sea: { toward: [-1, 0.1], from: 0, coast: 30, near: '#4c9a86', far: '#22626a' },
  signature: 'Round the bay',
  tvCameras: [
    // (At the end of the bay, looking back round it at the field with the island behind.)
    { section: 'Round the bay', at: 0.85, side: 'left', distance: 8, height: 9 },
    { section: 'Through the gorge', at: 0.5, side: 'right', distance: 8, height: 8 },
  ],
  billboardFrame: 'wood',
  start: { landmark: 'mountain-hut', gate: 'paddle', shots: { countdown: 'crane', launch: 'low-chase' } },
  finish: { landmark: 'rowing-boats' },
  designChanges: [
    'Two big features from the real place: the climb up to the castle on its cliff above the lake, then the turn right round the bay facing the island with its church (the big feature: a dramatic banked turn).',
    'Our own castle, island, church and boats; place names only.',
  ],
  // (The banked-turn start: down from the meadow above the lake, then a wide banked first turn; let go in waves.)
  opening: opening('banked-turn', {
    side: 'left',
    costumes: { block: 'mossy-boulder', slalom: 'street-lamp' },
    names: { plunge: 'Down the meadow', turn: 'Above the lake' },
    waves: { groups: 5, gap: 0.13, jitter: 0.1 },
  }),
  sections: [
    {
      name: 'Up to the castle', shape: climb(12, { grade: -0.04, after: 0.3 }),
      landmarks: [{ name: 'hilltop-castle', at: 0.5, side: 'left', distance: 34 }, { name: 'giant-peak', at: 0.5, side: 'right', distance: 460 }],
    },
    {
      name: 'Through the gorge', shape: sBends({ first: 'right', radius: 65, degrees: 100, grade: 0.12 }), billboards: 1,
      obstacles: [peg({ costume: 'street-lamp', at: 0.3, line: 'left' }), peg({ costume: 'street-lamp', at: 0.7, line: 'right' })],
    },
    {
      name: 'Run to the hairpin', shape: straight(60, { grade: 0.12 }), billboards: 1,
      obstacles: [slalom({ costume: 'street-lamp', from: 0.2, to: 0.6, count: 3, loss: 0.3 })],
    },
    { name: 'Hairpin', shape: hairpin({ side: 'left' }) },
    // The track's big feature: a dramatic banked turn right round the bay, the island and its church out on the lake.
    {
      name: 'Round the bay', shape: sweep({ side: 'right', radius: 45, degrees: 180, grade: 0.11 }),
      landmarks: [{ name: 'island-church', at: 0.5, side: 'left', distance: 130 }, { name: 'giant-peak', at: 0.5, side: 'left', distance: 560 }],
    },
    {
      name: 'Along the lake', shape: sweep({ side: 'left', radius: 90, degrees: 150, grade: 0.1 }), billboards: 2,
    },
    {
      name: 'The promenade', shape: straight(100, { grade: 0.12 }),
      features: [brake({ at: 0.05, length: 10, drag: 0.02 })],
      obstacles: [slalom({ costume: 'street-lamp', from: 0.5, to: 0.9, count: 3, loss: 0.3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
