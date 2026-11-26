'use strict';

// Park City Run (Utah, USA): down the mountain past old silver-mining relics to
// Park City's historic Main Street. Moses's design ("New Track Designs", 7),
// built with the track kit. (An elk, not a moose: Bobsleigh Run has the moose.)
const {
  track, opening, plunge, straight, sBends, spiral, hairpin, runIn,
  block, parked, slalom, moguls, peg, brake,
} = require('../trackKit');

module.exports = track({
  slug: 'park-city-run',
  name: 'Park City Run',
  difficulty: 'extreme',
  description: 'Down the Wasatch past old silver-mine relics and through a timbered mine tunnel to historic Main Street.',
  surface: 'snow',
  biome: 'alpine',
  lighting: 'day',
  signature: 'Down the Silver King shaft',
  tvCameras: [
    // (At the foot of the shaft, looking back up it at the field dropping out of the mine.)
    { section: 'Terrain-park run', at: 0.2, side: 'left', distance: 6, height: 10 },
    { section: 'Aspen S-bends', at: 0.5, side: 'right', distance: 6, height: 6 },
  ],
  billboardFrame: 'wood',
  // The gate at a summit lift station, the Wasatch peaks all around; the finish at the
  // bottom of Main Street, Old West shopfronts and the town lift overhead. (No Olympic rings.)
  start: { landmark: 'lift-station', scenery: ['bare'], gate: 'barrier', shots: { countdown: 'above', launch: 'high-behind' } },
  finish: { scenery: ['shopfronts'] },
  designChanges: [
    'Its own layout and opening (Moses, 15 Nov 2026: World Tour re-layouts): a rolling start down from the lift station (the field let go in waves) and a wide first turn, S-bends through the aspens, the hairpin by the elk, into the timbered mine tunnel and down the old silver mine\'s shaft (the big feature: a long steep drop), the terrain-park run, the spiral and Main Street.',
    'A straight, "Run to the hairpin", before the hairpin: the recipe needs a braking zone before the one sharp bend.',
  ],
  // (The rolling start: down from the summit lift station through the gates, a wide first turn; let go in jittered
  // waves, a new order every race.)
  opening: opening('rolling-start', {
    side: 'right',
    names: { run: 'Summit run', turn: 'Lift-line turn' },
    waves: { groups: 5, gap: 0.14, jitter: 0.1 },
  }),
  sections: [
    {
      name: 'Aspen S-bends', shape: sBends({ first: 'left', radius: 70, degrees: 80, grade: 0.11 }), scenery: ['aspens'], billboards: 2,
      obstacles: [peg({ costume: 'snowman', at: 0.3, line: 'right' }), peg({ costume: 'snowman', at: 0.7, line: 'left' })],
    },
    // (Not in the design: the recipe's braking zone needs a straight before the one sharp bend.)
    {
      name: 'Run to the hairpin', shape: straight(55, { grade: 0.13 }), scenery: ['aspens'],
      landmarks: [{ name: 'mine-buildings', at: 0.5, side: 'right', distance: 16 }],
      obstacles: [slalom({ from: 0.15, to: 0.6, count: 3, loss: 0.3 })],
    },
    { name: 'Hairpin', shape: hairpin({ side: 'left' }), obstacles: [block({ costume: 'elk', line: 'high', size: 'large' })], scenery: ['pines'] },
    {
      name: 'Mine tunnel', shape: straight(60, { grade: 0.15 }), tunnel: 'mine',
      obstacles: [parked({ costume: 'ore-cart', at: 0.45, side: 'right', length: 8 })],
    },
    // The track's big feature: a long steep drop down the old silver mine's shaft.
    { name: 'Down the Silver King shaft', shape: plunge(80, { grade: 0.4, from: 0.16 }), tunnel: 'mine' },
    {
      name: 'Terrain-park run', shape: straight(90, { grade: 0.13 }), billboards: 1,
      features: [brake({ at: 0.05, length: 12, drag: 0.02 }), moguls({ from: 0.4, to: 0.9, count: 6 })], figures: ['snowboarder', 'snowboarder', 'skier'],
      landmarks: [{ name: 'snow-park', at: 0.5, side: 'left', distance: 12 }], scenery: ['pines'],
    },
    {
      name: 'Spiral', shape: spiral({ side: 'left', radius: 45, grade: 0.13 }), scenery: ['pines'],
      obstacles: [peg({ costume: 'snowman', at: 0.35, line: 'left' }), peg({ costume: 'snowman', at: 0.7, line: 'right' })],
    },
    {
      name: 'Main Street', shape: straight(75, { grade: 0.13 }), billboards: 1, scenery: ['shopfronts'],
      features: [brake({ at: 0.05, length: 12, drag: 0.02 })],
      obstacles: [slalom({ from: 0.45, to: 0.9, count: 4, loss: 0.4 })],
    },
    { name: 'Finish', shape: runIn(), overhead: ['chairlift'], scenery: ['shopfronts'] },
  ],
});
