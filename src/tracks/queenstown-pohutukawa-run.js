'use strict';

// Queenstown Pōhutukawa Run: Holiday Season 2026 track (Canyons), Track of the Day on 14 December and
// again on 4 January. A summer Christmas day by a mountain lake: off the ski jump above the town, a
// peg drop into the gorge, a half-pipe along its walls, out over the rock, and along the lake shore
// under red-flowering pōhutukawa trees to the line.
const { track, opening, straight, sBends, sweep, halfPipe, hairpin, plunge, runIn, peg, swipe, curtain, rumble } = require('../trackKit');

module.exports = track({
  slug: 'queenstown-pohutukawa-run',
  name: 'Queenstown Pōhutukawa Run',
  season: 'holiday-2026',
  family: 'canyon',
  difficulty: 'extreme',
  description: 'A summer Christmas day by a mountain lake: off a ski jump, down into the gorge, a half-pipe along its walls, out over the rock and along the lake shore under red-flowering pōhutukawa trees.',
  surface: 'ice',
  biome: 'alpine',
  lighting: 'day',
  canyon: { palette: 'himalaya', depth: 32, river: 'left' },
  coaster: { colours: { support: '#7a7a72', rail: '#f2ede2', tie: '#3a3a36' } },
  signature: 'Gorge half-pipe',
  tvCameras: [
    { section: 'Gorge half-pipe', at: 0.9, side: 'left', distance: 6, height: 12 },
    { section: 'Drop back in', at: 0.8, side: 'left', distance: 6, height: 12 },
  ],
  start: { landmark: 'pohutukawa-trees', scenery: ['pines'], type: 'ski-jump', gate: 'barrier', shots: { countdown: 'above', launch: 'side' } },
  finish: { landmark: 'pohutukawa-trees', scenery: ['frozen-lake'] },
  designChanges: [
    'Curtains of vines hang over the schist bends and the lake shore sweep (they give the weakest marbles their chances); the river bends are shorter to keep the race inside its time.',
    'The gate stands at the foot of a ski jump\'s in-run (a new start type: every other canyon start type is taken twice); a peg drop lets the field go in waves into the gorge.',
    'The lake is the finish\'s still water past the line; the pōhutukawa trees stand at the start and past the line. No names on anything drawn.',
  ],
  opening: opening('peg-drop', { costumes: { peg: 'cairn' }, names: { plunge: 'Into the gorge' }, dress: { plunge: { height: 0 } } }),
  sections: [
    { name: 'Gorge entry', shape: straight(60, { grade: 0.1 }), height: 0, billboards: 1 },
    { name: 'Gorge half-pipe', shape: halfPipe({ first: 'right', width: 8, swings: 3, radius: 70, degrees: 30, grade: 0.12 }), height: 0 },
    { name: 'Run to the hairpin', shape: straight(45, { grade: 0.12 }), height: 0, obstacles: [peg({ costume: 'cairn', at: 0.15, line: 'center' }), peg({ costume: 'cairn', at: 0.32, line: 'left' }), peg({ costume: 'cairn', at: 0.5, line: 'right' })] },
    { name: 'Hairpin', shape: hairpin({ side: 'left' }), height: 0, obstacles: [swipe({ costume: 'falcon', side: 'high' })] },
    { name: 'Schist bends', shape: sBends({ first: 'left', radius: 60, degrees: 85, grade: 0.12 }), height: 0, billboards: 2, obstacles: [curtain({ costume: 'vines', at: 0.5, side: 'right' })] },
    { name: 'Over the rock', shape: sweep({ side: 'right', radius: 85, degrees: 120, grade: 0.09 }), height: 24, billboards: 2 },
    { name: 'Drop back in', shape: plunge(45, { grade: 0.2, from: 0.1 }), height: 0, obstacles: [peg({ costume: 'cairn', at: 0.4, line: 'left' }), peg({ costume: 'cairn', at: 0.6, line: 'right' }), peg({ costume: 'cairn', at: 0.8, line: 'center' })] },
    { name: 'River bends', shape: sBends({ first: 'right', radius: 70, degrees: 35, grade: 0.11 }), height: 0 },
    { name: 'Lake shore sweep', shape: sweep({ side: 'left', radius: 80, degrees: 110, grade: 0.085 }), height: 0, obstacles: [curtain({ costume: 'vines', at: 0.5, side: 'right' })] },
    {
      name: 'Shore run', shape: straight(110, { grade: 0.12 }), height: 0,
      obstacles: [peg({ costume: 'cairn', at: 0.15, line: 'center' }), peg({ costume: 'cairn', at: 0.3, line: 'left' })], features: [rumble({ from: 0.6, to: 0.95, count: 3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
