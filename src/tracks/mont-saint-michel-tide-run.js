'use strict';

// Mont-Saint-Michel Tide Run (Moses, 15 Nov 2026: seven new World Tour tracks fill the pack to 20; one of the two
// Easy ones). The abbey on its rock in the bay, the tide out, on a grey-gold evening: down off the dunes and through
// tight bends (the clean-drop start, the field let go in waves), across the salt meadows past the grazing sheep,
// along the causeway over the sands (signature feature one), the hairpin, up the steep village street, round the abbey
// mount (the track's big feature and signature feature two: a spiral right round the rock under the abbey's spire),
// down off the ramparts and over the sands to the finish. Our own abbey, village and sheep; place names only.
const {
  track, opening, straight, plunge, climb, sweep, spiral, hairpin, runIn, peg, slalom, brake,
} = require('../trackKit');

module.exports = track({
  slug: 'mont-saint-michel-tide-run',
  name: 'Mont-Saint-Michel Tide Run',
  difficulty: 'easy',
  description: 'The abbey on its rock in the bay, the tide out, on a grey-gold evening: across the salt meadows past the sheep, along the causeway over the sands, up the steep village street, right round the abbey mount and down off the ramparts.',
  surface: 'stone',
  biome: 'meadow',
  lighting: 'sunset',
  variants: ['fog'],
  // The bay along the north of the run, the tide far out over the sands (looks only).
  sea: { toward: [0.2, -1], from: 0, coast: 40 },
  signature: 'Round the abbey',
  tvCameras: [
    // (Coming off the mount, looking back round the rock at the field winding down under the spire.)
    { section: 'Down off the ramparts', at: 0.3, side: 'left', distance: 8, height: 12 },
    { section: 'Along the causeway', at: 0.5, side: 'right', distance: 8, height: 8 },
  ],
  billboardFrame: 'wood',
  start: { landmark: 'sheep-flock', gate: 'stalls', shots: { countdown: 'chase', launch: 'look-back' } },
  finish: { landmark: 'riviera-beach' },
  designChanges: [
    'Two big features from the real place: the causeway across the sands to the mount, then the spiral right round the abbey mount (the big feature), under the abbey church\'s spire.',
    'Our own abbey, village and sheep; place names only.',
  ],
  // (The clean-drop start: off the dunes at full speed into tight bends; let go in jittered waves.)
  opening: opening('clean-drop', {
    side: 'right',
    names: { plunge: 'Off the dunes', bends: 'Through the dunes' },
    waves: { groups: 5, gap: 0.13, jitter: 0.1 },
  }),
  sections: [
    {
      name: 'Across the salt meadows', shape: straight(60, { grade: 0.12 }), billboards: 1,
      landmarks: [{ name: 'sheep-flock', at: 0.5, side: 'left', distance: 26 }],
      obstacles: [slalom({ costume: 'street-lamp', from: 0.2, to: 0.7, count: 4, loss: 0.3 })],
    },
    {
      name: 'Along the causeway', shape: sweep({ side: 'left', radius: 90, degrees: 160, grade: 0.1 }), billboards: 2,
      features: [brake({ at: 0.04, length: 12 })],
      obstacles: [peg({ costume: 'street-lamp', at: 0.3, line: 'right' }), peg({ costume: 'street-lamp', at: 0.65, line: 'left' })],
    },
    {
      name: 'Run to the hairpin', shape: straight(60, { grade: 0.12 }),
      obstacles: [peg({ costume: 'street-lamp', at: 0.2, line: 'left' }), peg({ costume: 'street-lamp', at: 0.35, line: 'right' }), peg({ costume: 'street-lamp', at: 0.5, line: 'center' })],
    },
    { name: 'Hairpin below the walls', shape: hairpin({ side: 'right' }) },
    { name: 'Up the village street', shape: climb(12, { grade: -0.04, after: 0.3 }) },
    // The track's big feature: a spiral right round the abbey mount, under the spire.
    {
      name: 'Round the abbey', shape: spiral({ side: 'left', radius: 45, grade: 0.14 }), around: 'abbey-mount',
      obstacles: [peg({ costume: 'street-lamp', at: 0.25, line: 'right' }), peg({ costume: 'street-lamp', at: 0.5, line: 'left' }), peg({ costume: 'street-lamp', at: 0.75, line: 'right' })],
    },
    { name: 'Down off the ramparts', shape: plunge(55, { grade: 0.3, from: 0.15 }) },
    {
      name: 'Over the sands', shape: straight(100, { grade: 0.12 }), billboards: 1,
      features: [brake({ at: 0.05, length: 10, drag: 0.02 })],
      obstacles: [slalom({ costume: 'street-lamp', from: 0.45, to: 0.9, count: 4, loss: 0.3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
