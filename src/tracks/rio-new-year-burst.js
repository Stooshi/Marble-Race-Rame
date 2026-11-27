'use strict';

// Rio New Year Burst: Holiday Season 2026 track (Pinball), Track of the Day on 29 December and
// again on 1 January. A beach table on a summer New Year's night under the fireworks: a pipe drop
// at the gate, the promenade S-bends past little boats of flowers floating out to sea, the seafront
// spiral, round the shore past the crowd dressed in white, the flipper hairpin, down the fireworks
// lane and the last straight past a firework-rocket bumper to the flippers.
const { track, opening, straight, sBends, sweep, spiral, hairpin, runIn, peg, slalom, swipe, block, rumble, curtain } = require('../trackKit');

module.exports = track({
  slug: 'rio-new-year-burst',
  name: 'Rio New Year Burst',
  family: 'pinball',
  season: 'holiday-2026',
  difficulty: 'extreme',
  description: 'A beach pinball table on a summer New Year\'s night under the fireworks: past little boats of flowers floating out to sea, round the seafront spiral, round the shore past the crowd in white and down the fireworks lane to the flippers.',
  surface: 'ice',
  biome: 'playfield',
  lighting: 'fireworks-night',
  pinball: { art: 'beach-fireworks', display: 'HAPPY NEW YEAR!', finish: 'MIDNIGHT!' },
  signature: 'Fireworks lane',
  tvCameras: [
    { section: 'Fireworks lane', at: 0.5, side: 'right', distance: 8, height: 14 },
    { section: 'Shore sweep', at: 0.4, side: 'left', distance: 8, height: 14 },
  ],
  start: { landmark: 'white-crowd', gate: 'barrier', shots: { countdown: 'front', launch: 'side' } },
  finish: { landmark: 'flower-boats' },
  designChanges: [
    'No splitter: its pier splitter failed the fairness check (the leaders favoured one channel), so the pier bends under a stage curtain take its place.',
    'The crowd dressed in white waits on the sand along the shore and at the gate; little boats of flowers float at the water\'s edge beside the S-bends and at the finish; the fireworks burst overhead all race (the fireworks-night sky). All generic: no named beach, hotel or building.',
    'Firework rockets are the pop bumpers: only looks, racing exactly like the kit\'s blocks.',
  ],
  opening: opening('pipe-drop', { side: 'right', names: { plunge: 'Rocket drop', pipe: 'Shoreline pipe' } }),
  sections: [
    {
      name: 'Shore sweep', shape: sweep({ side: 'right', radius: 85, degrees: 55, grade: 0.09 }), billboards: 2,
      obstacles: [peg({ costume: 'bumper-post', at: 0.3, line: 'center' }), peg({ costume: 'bumper-post', at: 0.65, line: 'center' })],
      landmarks: [{ name: 'white-crowd', side: 'left', at: 0.5, distance: 34 }],
    },
    { name: 'Seafront spiral', shape: spiral({ side: 'right', radius: 50, turns: 0.6, grade: 0.15 }) },
    { name: 'Run to the hairpin', shape: straight(45, { grade: 0.11 }), obstacles: [peg({ costume: 'bumper-post', at: 0.2, line: 'center' }), peg({ costume: 'bumper-post', at: 0.45, line: 'left' }), peg({ costume: 'bumper-post', at: 0.7, line: 'right' })] },
    { name: 'Flipper hairpin', shape: hairpin({ side: 'right' }), obstacles: [swipe({ costume: 'flipper-bat', side: 'high' })] },
    {
      name: 'Fireworks lane', shape: straight(72, { grade: 0.1 }),
      obstacles: [slalom({ costume: 'bumper-post', from: 0.15, to: 0.85, count: 6, loss: 0.15 })],
    },
    { name: 'Pier bends', shape: sBends({ first: 'right', radius: 70, degrees: 75, grade: 0.1 }), obstacles: [curtain({ costume: 'stage-curtain', at: 0.5, side: 'left' })] },
    {
      name: 'Promenade S-bends', shape: sBends({ first: 'left', radius: 70, degrees: 65, grade: 0.1 }), billboards: 2,
      landmarks: [{ name: 'flower-boats', side: 'right', at: 0.5, distance: 22 }],
      obstacles: [peg({ costume: 'bumper-post', at: 0.3, line: 'center' }), peg({ costume: 'bumper-post', at: 0.7, line: 'center' })],
    },
    {
      name: 'Last straight', shape: straight(80, { grade: 0.1 }),
      obstacles: [block({ costume: 'firework-bumper', at: 0.12, line: 'left' }), peg({ costume: 'bumper-post', at: 0.3, line: 'right' }), peg({ costume: 'bumper-post', at: 0.45, line: 'center' })],
      features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
