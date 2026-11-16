'use strict';

// Cappadocia Balloon Run (Moses, 15 Nov 2026: seven new World Tour tracks fill the pack to 20; one of the three Wild
// ones). The valleys of soft pale rock at dawn, hot-air balloons rising all round: down a bowl of pale rock (the
// funnel-drop start, the field let go in waves), into the valley under the balloons (signature feature one), right
// round a cluster of fairy chimneys (the track's big feature and signature feature two: a dramatic banked turn), the
// hairpin, down through the underground city carved into the rock, S-bends through the rose-coloured valley and the
// run to the village. Our own rocks and balloons; place names only.
const {
  track, opening, straight, plunge, sBends, sweep, hairpin, runIn, peg, slalom, brake, moguls,
} = require('../trackKit');

module.exports = track({
  slug: 'cappadocia-balloon-run',
  name: 'Cappadocia Balloon Run',
  difficulty: 'hard',
  description: 'The valleys of soft pale rock at dawn, hot-air balloons rising all round: down into the valley under the balloons, right round a cluster of fairy chimneys, down through the underground city and through the rose-coloured valley.',
  surface: 'stone',
  biome: 'desert',
  lighting: 'dawn',
  variants: ['day'],
  signature: 'Round the fairy chimneys',
  tvCameras: [
    // (At the end of the turn, looking back round the fairy chimneys at the field coming round them.)
    { section: 'Round the fairy chimneys', at: 0.85, side: 'right', distance: 8, height: 9 },
    { section: 'Rose Valley S-bends', at: 0.5, side: 'right', distance: 8, height: 8 },
  ],
  billboardFrame: 'wood',
  start: { landmark: 'fairy-chimneys', gate: 'trapdoor', shots: { countdown: 'low-front', launch: 'high-behind' } },
  finish: { landmark: 'fairy-chimneys' },
  designChanges: [
    'Two big features from the real place: the valley under the rising hot-air balloons, then the turn right round a cluster of fairy chimneys (the big feature: a dramatic banked turn); and the drop through the underground city carved into the rock.',
    'Our own rocks, balloons and houses; place names only.',
  ],
  // (The funnel-drop start: a long bowl of pale rock below the ridge, fallen stones in it, then a row of posts;
  // let go in jittered waves.)
  opening: opening('funnel-drop', {
    costumes: { block: 'rock', slalom: 'street-lamp' },
    names: { plunge: 'Down the rock bowl' },
    waves: { groups: 5, gap: 0.13, jitter: 0.1 },
  }),
  sections: [
    { name: 'Into the valley', shape: straight(55, { grade: 0.13 }), features: [moguls({ from: 0.45, to: 0.92, count: 4 })] },
    {
      name: 'Under the balloons', shape: sweep({ side: 'right', radius: 90, degrees: 160, grade: 0.11 }), billboards: 2,
      overhead: ['hot-air-balloons'],
      obstacles: [peg({ costume: 'street-lamp', at: 0.3, line: 'left' }), peg({ costume: 'street-lamp', at: 0.65, line: 'right' })],
    },
    {
      name: 'Along Love Valley', shape: straight(70, { grade: 0.12 }),
      landmarks: [{ name: 'fairy-chimneys', at: 0.4, side: 'right', distance: 22 }],
    },
    // The track's big feature: a dramatic banked turn right round a cluster of fairy chimneys.
    {
      name: 'Round the fairy chimneys', shape: sweep({ side: 'left', radius: 45, degrees: 180, grade: 0.1 }),
      landmarks: [{ name: 'fairy-chimneys', at: 0.5, side: 'left', distance: 45 }],
    },
    {
      name: 'Run to the hairpin', shape: straight(60, { grade: 0.12 }), billboards: 1,
      obstacles: [peg({ costume: 'street-lamp', at: 0.3, line: 'left' }), peg({ costume: 'street-lamp', at: 0.5, line: 'right' })],
    },
    { name: 'Hairpin', shape: hairpin({ side: 'right' }) },
    { name: 'Through the underground city', shape: plunge(75, { grade: 0.36, from: 0.16 }), tunnel: 'rock' },
    {
      name: 'Rose Valley S-bends', shape: sBends({ first: 'left', radius: 70, degrees: 110, grade: 0.12 }), billboards: 1,
      obstacles: [peg({ costume: 'street-lamp', at: 0.3, line: 'right' }), peg({ costume: 'street-lamp', at: 0.7, line: 'left' })],
    },
    {
      name: 'To the village', shape: straight(100, { grade: 0.12 }), billboards: 1,
      features: [brake({ at: 0.05, length: 10, drag: 0.02 })],
      obstacles: [slalom({ costume: 'street-lamp', from: 0.5, to: 0.9, count: 3, loss: 0.3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
