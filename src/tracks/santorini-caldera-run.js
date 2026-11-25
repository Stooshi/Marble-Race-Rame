'use strict';

// Santorini Caldera Run (Moses, 15 Nov 2026: seven new World Tour tracks fill the pack to 20; one of the two Extreme
// ones). Oia at sunset, on the rim of the drowned volcano: out of the village's two lanes (the split start, the
// field let go in waves), along the caldera rim past the white cube houses, the windmills on the ridge, the hairpin
// by the blue domes, down the zigzag of the old donkey steps (signature feature one), then straight down the
// caldera cliff to the old port (the track's big feature and signature feature two), along the harbour wall in a
// half-pipe and the run along the quay. Our own houses, domes, windmills and boats; place names only.
const {
  track, opening, straight, plunge, sBends, sweep, hairpin, halfPipe, runIn, peg, slalom, brake,
} = require('../trackKit');

module.exports = track({
  slug: 'santorini-caldera-run',
  name: 'Santorini Caldera Run',
  difficulty: 'extreme',
  description: 'Oia at sunset on the rim of the drowned volcano: past the white houses and the windmills, down the zigzag of the old donkey steps and straight down the caldera cliff to the old port, along the harbour wall to the quay.',
  surface: 'stone',
  biome: 'desert',
  lighting: 'sunset',
  variants: ['day'],
  // The caldera's sea to the west of the whole run, the island falling to it as cliffs (looks only).
  sea: { toward: [-1, 0.2], from: 0, coast: 30 },
  signature: 'Down the caldera cliff',
  tvCameras: [
    // (At the foot of the cliff, looking back up it at the field dropping to the old port.)
    { section: 'Along the old port', at: 0.25, side: 'left', distance: 6, height: 15 },
    { section: 'Past the windmills', at: 0.6, side: 'right', distance: 8, height: 8 },
  ],
  billboardFrame: 'wood',
  start: { landmark: 'cycladic-village', gate: 'stalls', shots: { countdown: 'crane', launch: 'high-behind' } },
  finish: { landmark: 'yachts' },
  designChanges: [
    'Two big features from the real place: the zigzag of the old donkey steps down the cliff (tight S-bends), then the straight drop down the caldera cliff to the old port (the big feature).',
    'Our own white houses, blue domes, windmills and boats; place names only.',
  ],
  // (The split start: two lanes out of the village, one each side of a row of houses; let go in jittered waves.)
  opening: opening('split-start', {
    costumes: { block: 'cafe-table', slalom: 'street-lamp' },
    names: { plunge: 'Out of Oia', chutes: 'The two lanes', after: 'Onto the rim' },
    // (The left lane a little faster: with both alike the right lane's marbles won more than their share.)
    balance: { left: { drag: 0.7, scrub: 0.7 }, right: { drag: 1.3, scrub: 1.3 } },
    waves: { groups: 5, gap: 0.12, jitter: 0.1 },
  }),
  sections: [
    {
      name: 'Across the square', shape: straight(40, { grade: 0.13 }), features: [brake({ at: 0.15, length: 12 })],
      // (Oia's white houses round the square, a second stretch of the village: Moses, 16 Nov 2026, the village should
      // read clearly in the overview.)
      landmarks: [{ name: 'cycladic-village', at: 0.5, side: 'right', distance: 60 }],
    },
    {
      name: 'Along the caldera rim', shape: sweep({ side: 'left', radius: 90, degrees: 150, grade: 0.11 }), billboards: 1,
      landmarks: [{ name: 'cycladic-village', at: 0.5, side: 'right', distance: 52 }],
      obstacles: [peg({ costume: 'street-lamp', at: 0.35, line: 'right' }), peg({ costume: 'street-lamp', at: 0.7, line: 'left' })],
    },
    {
      name: 'Past the windmills', shape: straight(70, { grade: 0.12 }), billboards: 1,
      landmarks: [{ name: 'cycladic-windmills', at: 0.5, side: 'left', distance: 28 }],
      obstacles: [peg({ costume: 'street-lamp', at: 0.2, line: 'left' }), peg({ costume: 'street-lamp', at: 0.4, line: 'right' })],
    },
    { name: 'Hairpin by the blue domes', shape: hairpin({ side: 'right' }) },
    {
      // The old donkey steps: a zigzag path down the cliff face (signature feature one).
      name: 'Down the donkey steps', shape: sBends({ first: 'left', radius: 60, degrees: 110, grade: 0.15 }), billboards: 1,
      landmarks: [{ name: 'blue-domes', at: 0.3, side: 'right', distance: 22 }],
      obstacles: [peg({ costume: 'street-lamp', at: 0.3, line: 'right' }), peg({ costume: 'street-lamp', at: 0.7, line: 'left' })],
    },
    // The track's big feature: straight down the caldera cliff to the old port.
    { name: 'Down the caldera cliff', shape: plunge(70, { grade: 0.34, from: 0.15 }) },
    { name: 'Along the old port', shape: halfPipe({ first: 'right', width: 8, swings: 3, radius: 150, degrees: 16, grade: 0.11 }) },
    {
      name: 'Along the quay', shape: straight(100, { grade: 0.12 }), billboards: 1,
      features: [brake({ at: 0.05, length: 10, drag: 0.02 })],
      obstacles: [slalom({ costume: 'street-lamp', from: 0.5, to: 0.9, count: 3, loss: 0.3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
