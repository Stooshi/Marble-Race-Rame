'use strict';

// Belgrade Badnjak Run: Holiday Season 2026 track (World Tour), Track of the Day on 19 December and
// again on 6 January, Orthodox Christmas Eve. Christmas Eve night by the fortress over the meeting of
// two rivers: down into a half-pipe along the fortress moat, past the churchyard bonfires of oak logs,
// through the old town's streets and down to the riverbank.
const { track, opening, straight, sBends, sweep, spiral, hairpin, plunge, runIn, peg, slalom, swipe, rumble, curtain } = require('../trackKit');

module.exports = track({
  slug: 'belgrade-badnjak-run',
  name: 'Belgrade Badnjak Run',
  season: 'holiday-2026',
  difficulty: 'extreme',
  description: 'Christmas Eve night by the fortress over the meeting of two rivers: a half-pipe along the fortress moat, past the churchyard bonfires of oak logs, through the old town and down to the riverbank.',
  surface: 'snow',
  biome: 'city',
  lighting: 'night',
  variants: ['snow'],
  signature: 'Fortress moat',
  tvCameras: [
    { section: 'Bonfire sweep', at: 0.5, side: 'left', distance: 8, height: 14 },
    { section: 'Steps drop', at: 0.3, side: 'right', distance: 8, height: 14 },
  ],
  start: { landmark: 'fortress-walls', gate: 'paddle', shots: { countdown: 'side', launch: 'low-chase' } },
  finish: { landmark: 'church', scenery: ['stone-houses'] },
  designChanges: [
    'No splitter: no setting gave its smaller channel a real share (30–70%) and passed the fairness checks, so a sweep under a banner gantry and a drop to the river bank take its place (Moses: every splitter under 30%, 19 Oct).',
    'The fortress is a generic walled fortress on its ridge over two rivers (no flags or emblems on it); the half-pipe is its moat.',
    'The bonfires of oak logs burn in the churchyard beside the Bonfire sweep, people standing round them; no figures from the church.',
  ],
  opening: opening('pipe-drop', { side: 'left', names: { plunge: 'Fortress drop', pipe: 'Fortress moat' } }),
  sections: [
    { name: 'Gate straight', shape: straight(60, { grade: 0.12 }), obstacles: [peg({ costume: 'lantern-pole', at: 0.3, line: 'center' }), peg({ costume: 'lantern-pole', at: 0.5, line: 'left' }), peg({ costume: 'lantern-pole', at: 0.7, line: 'right' })] },
    { name: 'Old town bends', shape: sBends({ first: 'right', radius: 65, degrees: 85, grade: 0.12 }), scenery: ['stone-houses'], billboards: 2, obstacles: [slalom({ costume: 'lantern-pole', from: 0.2, to: 0.8, count: 4, loss: 0.2 })] },
    {
      name: 'Bonfire sweep', shape: sweep({ side: 'right', radius: 80, degrees: 110, grade: 0.09 }), billboards: 2,
      landmarks: [{ name: 'badnjak-fires', side: 'low', at: 0.5, distance: 14 }],
    },
    { name: 'Confluence sweep', shape: sweep({ side: 'left', radius: 80, degrees: 105, grade: 0.09 }), obstacles: [curtain({ costume: 'banner-gantry', at: 0.5, side: 'right' })] },
    { name: 'River bank drop', shape: plunge(35, { grade: 0.13, from: 0.1 }) },
    { name: 'Run to the hairpin', shape: straight(45, { grade: 0.12 }), obstacles: [peg({ costume: 'lantern-pole', at: 0.15, line: 'center' }), peg({ costume: 'lantern-pole', at: 0.32, line: 'left' }), peg({ costume: 'lantern-pole', at: 0.5, line: 'right' })] },
    { name: 'Hairpin', shape: hairpin({ side: 'left' }), obstacles: [swipe({ costume: 'stag', side: 'high' })] },
    { name: 'Steps drop', shape: plunge(55, { grade: 0.2, from: 0.1 }), obstacles: [slalom({ costume: 'lantern-pole', from: 0.35, to: 0.95, count: 5, loss: 0.3 })] },
    { name: 'Riverbank run', shape: straight(90, { grade: 0.14 }), billboards: 1, scenery: ['wooden-houses'], obstacles: [peg({ costume: 'lantern-pole', at: 0.15, line: 'center' }), peg({ costume: 'lantern-pole', at: 0.3, line: 'left' })], features: [rumble({ from: 0.6, to: 0.95, count: 3 })] },
    { name: 'Finish', shape: runIn() },
  ],
});
