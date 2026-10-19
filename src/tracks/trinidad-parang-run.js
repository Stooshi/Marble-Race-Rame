'use strict';

// Trinidad Parang Run: Holiday Season 2026 track (Pinball), Track of the Day on 21 December.
// A parang band's table on a warm Caribbean night: a peg drop through maraca posts at the gate,
// round the hillside of wooden gallery houses strung with lights, the flipper hairpin early, down
// the steel-pan lane past steel-pan pop bumpers, through the S-bends past the band on its stage,
// the village bends and the run past more maraca posts to the flippers.
const { track, opening, straight, sBends, sweep, hairpin, plunge, runIn, peg, slalom, swipe, block, rumble, curtain } = require('../trackKit');

module.exports = track({
  slug: 'trinidad-parang-run',
  name: 'Trinidad Parang Run',
  family: 'pinball',
  season: 'holiday-2026',
  difficulty: 'extreme',
  description: 'A parang band\'s pinball table on a warm Caribbean night: through maraca posts, round a hillside of wooden houses strung with lights, down the steel-pan lane past steel-pan bumpers and past the band on its stage to the flippers.',
  surface: 'ice',
  biome: 'playfield',
  lighting: 'parlour',
  pinball: { art: 'parang', display: 'PARANG!', finish: 'SERENADE!' },
  signature: 'Steel-pan lane',
  tvCameras: [
    { section: 'Steel-pan lane', at: 0.5, side: 'right', distance: 8, height: 14 },
    { section: 'Lights drop', at: 0.3, side: 'left', distance: 8, height: 14 },
  ],
  start: { landmark: 'parang-band', gate: 'trapdoor', shots: { countdown: 'side', launch: 'low-chase' } },
  finish: { landmark: 'gallery-houses' },
  designChanges: [
    'No splitter: no setting gave its smaller channel a real share (30–70%) and passed the fairness checks, so bends under a banner gantry take its place (Moses: every splitter under 30%, 19 Oct).',
    'The parang band (guitar, cuatro, box bass and maracas) plays on its stage at the gate and again beside the S-bends; the gallery houses with their fretwork verandas and strung lights stand on the hillside, all generic.',
    'Steel pans are the pop bumpers and maracas the posts: both only looks, racing exactly like the kit\'s blocks and pegs.',
  ],
  opening: opening('peg-drop', { costumes: { peg: 'maraca-post' }, names: { plunge: 'Maraca peg drop' } }),
  sections: [
    {
      name: 'Hillside sweep', shape: sweep({ side: 'right', radius: 75, degrees: 140, grade: 0.08 }), billboards: 2,
      landmarks: [{ name: 'gallery-houses', side: 'high', at: 0.5, distance: 42 }],
    },
    { name: 'Down to the hairpin', shape: straight(45, { grade: 0.1 }) },
    { name: 'Flipper hairpin', shape: hairpin({ side: 'left' }), obstacles: [swipe({ costume: 'flipper-bat', side: 'high' })] },
    {
      name: 'Steel-pan lane', shape: straight(115, { grade: 0.09 }), billboards: 1,
      obstacles: [slalom({ costume: 'maraca-post', from: 0.15, to: 0.6, count: 4, loss: 0.15 })],
    },
    {
      name: 'Cuatro S-bends', shape: sBends({ first: 'right', radius: 65, degrees: 85, grade: 0.1 }), billboards: 1,
      landmarks: [{ name: 'parang-band', side: 'left', at: 0.5, distance: 18 }],
    },
    { name: 'Village bends', shape: sBends({ first: 'left', radius: 80, degrees: 90, grade: 0.10 }), obstacles: [curtain({ costume: 'banner-gantry', at: 0.5, side: 'right' })] },
    { name: 'Lights drop', shape: plunge(45, { grade: 0.17, from: 0.1 }), obstacles: [slalom({ costume: 'maraca-post', from: 0.35, to: 0.9, count: 4, loss: 0.15 })] },
    {
      name: 'Run to the flippers', shape: straight(100, { grade: 0.095 }),
      obstacles: [block({ costume: 'steel-pan-bumper', at: 0.15, line: 'right' }), peg({ costume: 'maraca-post', at: 0.3, line: 'left' })],
      features: [rumble({ from: 0.65, to: 0.95, count: 3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
