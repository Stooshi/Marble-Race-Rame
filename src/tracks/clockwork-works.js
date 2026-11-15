'use strict';

// Clockwork Works (Moses, 15 Nov 2026: seven more Blocks 1 tracks, the pack filled to 20; one of the three Wild ones). A
// game world of brass and iron: off an iron gear tower and round the first cogs (a rolling start, the field let go in
// waves), up the gear stairs, a straight past a great wall of turning gears, then round the giant gear (the track's big
// feature: a splitter, the field dividing either side of a huge brass gear on its stand), S-bends through the works,
// past a score wall, the hairpin, a sweep along the belts and the last straight. Our own
// shapes and colours: no names, creatures or pieces from any existing game.
const {
  track, opening, straight, climb, sBends, sweep, hairpin, splitter, runIn, peg, slalom, brake,
} = require('../trackKit');

module.exports = track({
  slug: 'clockwork-works',
  name: 'Clockwork Works',
  family: 'block',
  difficulty: 'hard',
  description: 'A world of brass and iron: round the first cogs and up the gear stairs, past a great wall of turning gears, either side of a giant brass gear, through the works and past a score wall to the line.',
  surface: 'ice',
  biome: 'city',
  lighting: 'sunset',
  variants: ['day'],
  block: { world: 'clockwork' },
  coaster: { style: 'blocks', colours: { support: '#4a4440', rail: '#f2e8d8', tie: '#2a2622' } },
  signature: 'Round the giant gear',
  tvCameras: [
    // (Just past the gear, looking back at the field coming out either side of it.)
    { section: 'Through the works', at: 0.2, side: 'left', distance: 10, height: 12 },
    { section: 'Along the belts', at: 0.5, side: 'right', distance: 10, height: 11 },
  ],
  start: { landmark: 'gear-wall', type: 'gear-tower', gate: 'stalls', shots: { countdown: 'low-front', launch: 'look-back' } },
  finish: { landmark: 'block-hall' },
  opening: opening('rolling-start', {
    side: 'left',
    costumes: { slalom: 'cube-pillar' },
    names: { run: 'Off the gear tower', turn: 'Round the first cogs' },
    // (Let go in short jittered waves, a new order every race.)
    waves: { groups: 5, gap: 0.14, jitter: 0.1 },
  }),
  sections: [
    { name: 'Up the gear stairs', shape: climb(14, { grade: -0.05, after: 0.3 }) },
    {
      name: 'Past the gear wall', shape: straight(70, { grade: 0.13 }), billboards: 1,
      landmarks: [{ name: 'gear-wall', at: 0.5, side: 'left', distance: 30 }],
      features: [brake({ at: 0.05, length: 12, drag: 0.02 })],
      obstacles: [slalom({ costume: 'cube-pillar', from: 0.42, to: 0.86, count: 4, loss: 0.24 })],
    },
    {
      name: 'Round the giant gear',
      shape: splitter({ side: 'right', degrees: 0, approach: 55, merge: 30, balance: { tipOffset: -0.3, left: { drag: 2.7, scrub: 2.7 }, right: { drag: 0.95, scrub: 0.95 } } }),
      around: 'giant-gear',
      obstacles: [peg({ costume: 'cube-pillar', at: 0.06, line: 'right' }), peg({ costume: 'cube-pillar', at: 0.14, line: 'left' }), peg({ costume: 'cube-pillar', at: 0.21, line: 'center' })],
    },
    {
      name: 'Through the works', shape: sBends({ first: 'left', radius: 60, degrees: 85, grade: 0.13 }),
      obstacles: [peg({ costume: 'cube-pillar', at: 0.3, line: 'center' }), peg({ costume: 'cube-pillar', at: 0.7, line: 'right' })],
    },
    {
      name: 'Past the score wall', shape: straight(55, { grade: 0.14 }),
      landmarks: [{ name: 'score-wall', at: 0.5, side: 'right', distance: 12 }],
      features: [brake({ at: 0.05, length: 10, drag: 0.02 })],
    },
    { name: 'Hairpin by the boilers', shape: hairpin({ side: 'left' }) },
    {
      name: 'Along the belts', shape: sweep({ side: 'right', radius: 75, degrees: 110, grade: 0.13 }), billboards: 1,
      obstacles: [peg({ costume: 'cube-pillar', at: 0.35, line: 'center' }), peg({ costume: 'cube-pillar', at: 0.7, line: 'left' })],
    },
    {
      name: 'Last straight', shape: straight(70, { grade: 0.14 }), billboards: 2,
      obstacles: [slalom({ costume: 'cube-pillar', from: 0.5, to: 0.9, count: 4, loss: 0.35 })],
      features: [brake({ at: 0.05, length: 10, drag: 0.02 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
