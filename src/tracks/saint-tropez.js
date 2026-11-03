'use strict';

// Saint-Tropez: World Tour, the French Riviera (Moses, 3 Nov 2026: "the most spectacular track in the game").
// From a hilltop village's lane, down the coastal cliff road in switchbacks with the Mediterranean below, through
// the loop out over the cliff with the sea behind it (big feature one), past the olive groves and the lavender with
// room to overtake, a hairpin on the cliff, the plunge down the cliff to the harbour and the spiral round the
// lighthouse on the harbour wall (big feature two), then along the harbour front to the finish on the quay.
// Place names only: no brands, events, hotels or clubs; our own boats, villas and lighthouse.
const {
  track, opening, straight, sBends, sweep, spiral, hairpin, plunge, runIn, peg, parked, rumble, slalom, brake, loop,
} = require('../trackKit');

module.exports = track({
  slug: 'saint-tropez',
  name: 'Saint-Tropez',
  difficulty: 'extreme',
  description: 'The French Riviera in the late-afternoon sun: from a hilltop village down the cliff road above the sea, through a loop out over the cliff, down to the harbour and round its lighthouse, to the finish on the quay.',
  surface: 'stone',
  biome: 'meadow',
  lighting: 'sunset',
  variants: ['day'],
  // The Mediterranean to the west of the whole run, the hills falling to it as cliffs (looks only).
  sea: { toward: [-1, 0.25], from: 0, coast: 30 },
  signature: 'The loop',
  tvCameras: [
    { section: 'The loop', at: 0.85, side: 'left', distance: 10, height: 10 },
    { section: 'Lighthouse spiral', at: 0.6, side: 'left', distance: 10, height: 12 },
  ],
  billboardFrame: 'wood',
  start: { landmark: 'riviera-village', gate: 'stalls', shots: { countdown: 'chase', launch: 'high-behind' } },
  finish: { landmark: 'riviera-harbour' },
  designChanges: [
    'The start is the hilltop village\'s lane (the staggered drop: the field let go in waves down the lane): the stepped platform and the cliff start are coasters\' starts, and Saint-Tropez races on the ground like every World Tour track.',
    'Big feature one, the loop, stands on the cliff road with the sea behind it; the S-bends, the sweep and the pegs after it give the overtaking room a loop needs. Big feature two is the spiral round the lighthouse on the harbour wall, after the plunge down the cliff to the harbour.',
    'Our own boats, villas, beach, lighthouse and village; place names only.',
  ],
  opening: opening('staggered-drop', { costumes: { block: 'cafe-table', slalom: 'street-lamp' }, names: { plunge: 'Down the village lane' } }),
  sections: [
    {
      name: 'Out of the village', shape: sweep({ side: 'right', radius: 60, degrees: 75, grade: 0.22 }), billboards: 1,
      landmarks: [{ name: 'riviera-village', at: 0.4, side: 'right', distance: 26 }, { name: 'umbrella-pines', at: 0.8, side: 'left', distance: 16 }],
    },
    {
      name: 'Cliff road switchbacks', shape: sBends({ first: 'right', radius: 50, degrees: 95, grade: 0.23 }),
      obstacles: [peg({ costume: 'street-lamp', at: 0.2, line: 'center' }), slalom({ costume: 'street-lamp', from: 0.4, to: 0.8, count: 3, loss: 0.15 })],
      landmarks: [{ name: 'lavender-field', at: 0.5, side: 'right', distance: 18 }], billboards: 1,
    },
    {
      name: 'The loop', shape: straight(130, { grade: 0.12 }), features: [loop({ at: 0.25, viewSide: 26 })], // (the follow camera a little closer in, so it sees down past the rim of the cliff road's channel)
      landmarks: [{ name: 'riviera-beach', at: 0.6, side: 'right', distance: 70 }, { name: 'yachts', at: 0.3, side: 'right', distance: 150 }],
    },
    {
      name: 'Olive grove S-bends', shape: sBends({ first: 'left', radius: 70, degrees: 80, grade: 0.19 }),
      obstacles: [peg({ costume: 'street-lamp', at: 0.12, line: 'center' }), slalom({ costume: 'street-lamp', from: 0.3, to: 0.8, count: 4, loss: 0.15 }), peg({ costume: 'street-lamp', at: 0.92, line: 'left' })],
      // (Rough cobbles at the way in: the loop strings the field out in single file; the cobbles bunch it again for the overtaking.)
      features: [brake({ at: 0.04, length: 14, drag: 0.016 })],
      landmarks: [{ name: 'olive-grove', at: 0.5, side: 'right', distance: 16 }], billboards: 1,
    },
    {
      name: 'Above the bay', shape: sweep({ side: 'right', radius: 85, degrees: 90, grade: 0.18 }),
      obstacles: [peg({ costume: 'street-lamp', at: 0.15, line: 'left' }), slalom({ costume: 'street-lamp', from: 0.35, to: 0.75, count: 3, loss: 0.15 }), peg({ costume: 'street-lamp', at: 0.9, line: 'center' })],
      landmarks: [{ name: 'umbrella-pines', at: 0.5, side: 'left', distance: 14 }], billboards: 1,
    },
    {
      name: 'Run to the cliff hairpin', shape: straight(50, { grade: 0.15 }),
      obstacles: [peg({ costume: 'street-lamp', at: 0.2, line: 'right' })],
    },
    { name: 'Cliff hairpin', shape: hairpin({ side: 'left' }) },
    { name: 'Down the cliff', shape: plunge(70, { grade: 0.34, from: 0.15 }), landmarks: [{ name: 'yachts', at: 0.5, side: 'right', distance: 90 }] },
    {
      name: 'Lighthouse spiral', shape: spiral({ side: 'left', radius: 50, turns: 1, grade: 0.19 }), around: 'riviera-lighthouse',
      obstacles: [slalom({ costume: 'street-lamp', from: 0.3, to: 0.7, count: 3, loss: 0.12 })],
    },
    {
      name: 'Harbour front', shape: straight(100, { grade: 0.18 }),
      obstacles: [parked({ costume: 'sports-car', at: 0.18, side: 'right', length: 6 }), peg({ costume: 'street-lamp', at: 0.36, line: 'left' }), peg({ costume: 'street-lamp', at: 0.5, line: 'right' }), peg({ costume: 'street-lamp', at: 0.62, line: 'center' })],
      features: [brake({ at: 0.06, length: 10, drag: 0.008 }), rumble({ from: 0.72, to: 0.95, count: 3 })],
      landmarks: [{ name: 'riviera-harbour', at: 0.62, side: 'left', distance: 52 }], billboards: 1,
    },
    { name: 'Finish', shape: runIn() },
  ],
});
