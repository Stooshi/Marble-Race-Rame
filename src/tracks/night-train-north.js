'use strict';

// Night Train North: Holiday Season 2026 track (Winter Wonders), Track of the Day on 20 December and
// again on 5 January. Racing a steam train north through a snowy forest at night: a pipe drop at the
// gate, round the forest sweep, the long straight beside the train, the viaduct bends, the junction
// bends, the hairpin at the level crossing, the tunnel spiral and the run up to the lit station at the top of the world.
const { track, opening, straight, sBends, sweep, spiral, hairpin, runIn, curtain, peg, slalom, swipe, rumble } = require('../trackKit');

module.exports = track({
  slug: 'night-train-north',
  name: 'Night Train North',
  family: 'winter-wonders',
  season: 'holiday-2026',
  difficulty: 'extreme',
  description: 'Racing a steam train north through a snowy forest at night: beside the train with its lit carriages, over the viaduct bends, round the tunnel spiral and up to the lit station at the top of the world.',
  surface: 'snow',
  biome: 'arctic',
  lighting: 'night',
  variants: ['snow'],
  signature: 'Beside the train',
  tvCameras: [
    { section: 'Beside the train', at: 0.5, side: 'left', distance: 8, height: 14 },
    { section: 'Tunnel spiral', at: 0.5, side: 'right', distance: 8, height: 14 },
  ],
  start: { landmark: 'top-station', gate: 'stalls', shots: { countdown: 'chase', launch: 'side' } },
  finish: { landmark: 'top-station', scenery: ['pines'] },
  designChanges: [
    'No splitter: every setting either sent nearly all the marbles down one channel or failed the fairness checks, so the junction bends under a banner gantry take its place (Moses chose bends over a lopsided splitter, 19 Oct).',
    'The steam train is ours: an engine with a tall chimney and a puff of steam, a tender and three carriages with lit windows, standing on its rails beside the long straight. The station at the top of the world is a timber station under a snowy roof with a clock tower. No railway names or emblems.',
    'A level-crossing boom swings at the hairpin and a banner gantry hangs over the forest sweep; lanterns are the poles and pegs.',
  ],
  opening: opening('pipe-drop', { side: 'left', names: { plunge: 'Tender drop', pipe: 'Snow cutting' } }),
  sections: [
    { name: 'Forest sweep', shape: sweep({ side: 'left', radius: 90, degrees: 60, grade: 0.09 }), scenery: ['pines'], billboards: 2, obstacles: [curtain({ costume: 'banner-gantry', at: 0.5, side: 'right' })] },
    {
      name: 'Beside the train', shape: straight(90, { grade: 0.1 }), billboards: 1,
      landmarks: [{ name: 'steam-train', side: 'right', at: 0.5, distance: 12 }],
      obstacles: [peg({ costume: 'ice-lantern', at: 0.2, line: 'center' }), peg({ costume: 'ice-lantern', at: 0.4, line: 'left' })],
    },
    {
      name: 'Viaduct bends', shape: sBends({ first: 'right', radius: 70, degrees: 80, grade: 0.11 }), scenery: ['pines'], billboards: 1,
      obstacles: [slalom({ costume: 'ice-lantern', from: 0.2, to: 0.6, count: 3, loss: 0.15 }), curtain({ costume: 'banner-gantry', at: 0.8, side: 'left' })],
    },
    { name: 'Junction bends', shape: sBends({ first: 'left', radius: 70, degrees: 75, grade: 0.11 }), obstacles: [curtain({ costume: 'banner-gantry', at: 0.5, side: 'right' })] },
    {
      name: 'Run to the crossing', shape: straight(45, { grade: 0.11 }),
      obstacles: [peg({ costume: 'ice-lantern', at: 0.2, line: 'center' }), peg({ costume: 'ice-lantern', at: 0.45, line: 'left' }), peg({ costume: 'ice-lantern', at: 0.7, line: 'right' })],
    },
    { name: 'Level-crossing hairpin', shape: hairpin({ side: 'left' }), obstacles: [swipe({ costume: 'toll-boom', side: 'high' })] },
    { name: 'Tunnel spiral', shape: spiral({ side: 'right', radius: 50, turns: 0.5, grade: 0.14 }) },
    {
      name: 'Up to the station', shape: straight(85, { grade: 0.12 }),
      obstacles: [peg({ costume: 'ice-lantern', at: 0.15, line: 'right' }), peg({ costume: 'ice-lantern', at: 0.3, line: 'left' }), peg({ costume: 'ice-lantern', at: 0.45, line: 'center' })],
      features: [rumble({ from: 0.65, to: 0.95, count: 3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
