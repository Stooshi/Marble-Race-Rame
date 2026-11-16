'use strict';

// Bobsleigh Run (re-laid 16 Nov 2026, Moses: its own layout like the other World Tour tracks; the track before it is
// frozen for the tests in src/game/referenceTracks.js). Still a hand-built track to look at: the snowy mountainside
// in pine forest, the ice channel and its ice blocks, polar bear, icicles and snowman (the 3D view's 'alpine' theme by
// slug). A natural-ice run in the high Alps, its bends named as the old runs name them: the push-off past the start
// house and round Sunny Corner (the rolling start, the field let go in waves), down Devil's Dyke, round the Snake, up
// to the Telegraph, round the Horseshoe (the track's big feature: a huge, steep banked turn, the famous bend of the
// old natural-ice runs), through the Shamrock, the Portago hairpin and the run past Martineau to the finish.
// Place names of the bends only.
const {
  track, handBuilt, opening, straight, plunge, climb, sBends, sweep, spiral, hairpin, runIn,
  block, curtain, swipe, slalom, peg, brake,
} = require('../trackKit');

module.exports = handBuilt(track({
  slug: 'bobsleigh-run',
  name: 'Bobsleigh Run',
  difficulty: 'extreme',
  description: 'A natural-ice bobsleigh run high in the Alps: the push-off round Sunny Corner, down Devil\'s Dyke, round the Snake, up to the Telegraph, round the huge banked Horseshoe, through the Shamrock and the Portago hairpin to the finish.',
  surface: 'ice',
  biome: 'alpine',
  lighting: 'day',
  signature: 'The Horseshoe',
  tvCameras: [
    // (At the end of the Horseshoe, looking back round the banking at the field coming round it high on the wall.)
    { section: 'The Horseshoe', at: 0.85, side: 'right', distance: 8, height: 9 },
    { section: 'Down Devil\'s Dyke', at: 0.9, side: 'left', distance: 8, height: 8 },
  ],
  start: { gate: 'trapdoor', shots: { countdown: 'side', launch: 'low-chase' } },
  designChanges: [
    'Its own layout (16 Nov 2026): the rolling start round Sunny Corner, then the bends of an old natural-ice run, the huge banked Horseshoe its big feature.',
    'No splitter and no bumps across the whole field any more.',
  ],
  // (The rolling start: the push-off down a long gentle run past the start house, a short slalom of gates, then the
  // wide banked Sunny Corner; let go in waves.)
  opening: opening('rolling-start', {
    side: 'left',
    names: { run: 'The push-off', turn: 'Sunny Corner' },
    waves: { groups: 5, gap: 0.14, jitter: 0.1 },
  }),
  sections: [
    {
      name: 'Run to Devil\'s Dyke', shape: straight(55, { grade: 0.13 }), billboards: 1,
      features: [brake({ at: 0.1, length: 12, drag: 0.02 })],
      obstacles: [peg({ at: 0.55, line: 'left' }), peg({ at: 0.75, line: 'right' })],
    },
    { name: 'Down Devil\'s Dyke', shape: plunge(70, { grade: 0.34, from: 0.16 }) },
    { name: 'Run to the Snake', shape: straight(40, { grade: 0.14 }) },
    { name: 'The Snake', shape: spiral({ side: 'right', radius: 40, turns: 0.75 }), obstacles: [peg({ at: 0.5, line: 'center' })] },
    {
      name: 'Up to the Telegraph', shape: climb(12, { grade: -0.04, after: 0.3 }),
    },
    {
      name: 'Telegraph straight', shape: straight(50, { grade: 0.13 }), billboards: 1,
      features: [brake({ at: 0.6, length: 10, drag: 0.01 })],
      obstacles: [swipe({ at: 0.3, side: 'left' })],
    },
    // The track's big feature: the Horseshoe, a huge, steep banked turn.
    { name: 'The Horseshoe', shape: sweep({ side: 'left', radius: 45, degrees: 180, grade: 0.1 }), obstacles: [peg({ at: 0.35, line: 'right' }), peg({ at: 0.65, line: 'left' })] },
    {
      name: 'Run to the Shamrock', shape: straight(50, { grade: 0.13 }), billboards: 1,
      obstacles: [curtain({ at: 0.3, side: 'left' }), peg({ at: 0.75, line: 'right' })],
    },
    {
      name: 'The Shamrock', shape: sBends({ first: 'right', radius: 60, degrees: 90, grade: 0.13 }),
      obstacles: [peg({ at: 0.3, line: 'left' }), peg({ at: 0.7, line: 'right' })],
    },
    {
      name: 'Run to Portago', shape: straight(50, { grade: 0.12 }), billboards: 1,
      features: [brake({ at: 0.2, length: 15, drag: 0.02 })],
    },
    { name: 'Portago', shape: hairpin({ side: 'right' }) },
    {
      name: 'Past Martineau', shape: straight(85, { grade: 0.13 }),
      obstacles: [slalom({ from: 0.15, to: 0.6, count: 5, loss: 0.3 }), block({ at: 0.85, line: 'center', size: 'large' })],
    },
    { name: 'Finish', shape: runIn() },
  ],
}));
