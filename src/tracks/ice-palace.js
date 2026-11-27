'use strict';

// Ice Palace: Holiday Season 2026 track (Winter Wonders), Track of the Day on 11 December. A palace
// of clear ice at night: down through an ice tunnel at the gate, into the halls under ice
// chandeliers, a half-pipe through the ice halls, the frozen throne run, the chandelier hairpin, the
// frost sweep, the crystal bends, the icicle drop and the run to the palace gate.
const { track, opening, straight, sweep, halfPipe, plunge, hairpin, sBends, runIn, curtain, peg, slalom, swipe, rumble } = require('../trackKit');

module.exports = track({
  slug: 'ice-palace',
  name: 'Ice Palace',
  family: 'winter-wonders',
  season: 'holiday-2026',
  difficulty: 'extreme',
  description: 'A palace of clear ice at night: down through an ice tunnel, under ice chandeliers, through the ice halls in a half-pipe, past the frozen throne and down the icicle drop to the palace gate.',
  surface: 'ice',
  biome: 'arctic',
  lighting: 'night',
  variants: ['snow'],
  signature: 'Ice hall half-pipe',
  tvCameras: [
    { section: 'Ice hall half-pipe', at: 0.8, side: 'right', distance: 8, height: 14 },
    { section: 'Crystal bends', at: 0.6, side: 'left', distance: 10, height: 12 },
  ],
  start: { landmark: 'ice-chandeliers', gate: 'barrier', shots: { countdown: 'above', launch: 'low-chase' } },
  finish: { landmark: 'ice-palace' },
  designChanges: [
    'No splitter: every setting either sent nearly all the marbles down one channel or failed the fairness checks, so the crystal bends under a laser curtain take its place (Moses chose bends over a lopsided splitter, 19 Oct).',
    'A tunnel launch through an ice tunnel at the gate rather than a banked turn (its first 20 seconds were too like Nuremberg\'s); the halls and the frost sweep are longer to keep the race inside its time.',
    'The palace is ours and generic: halls of clear ice blocks, pointed ice towers, battlements and arches of ice, chandeliers of icicles; nothing from any film. Crystal posts and snowballs are the poles, pegs and pile-up; a chandelier swings at the hairpin.',
  ],
  opening: opening('tunnel-launch', { tunnel: 'lit-tunnel', costumes: { block: 'giant-snowball', slalom: 'crystal-post' }, names: { portal: 'Down to the ice halls', tunnel: 'Ice tunnel' } }),
  sections: [
    {
      name: 'Into the halls', shape: straight(55, { grade: 0.11 }), billboards: 1,
      landmarks: [{ name: 'ice-chandeliers', side: 'right', at: 0.5, distance: 12 }],
    },
    {
      name: 'Ice hall half-pipe', shape: halfPipe({ first: 'right', width: 8, swings: 3, radius: 70, degrees: 30, grade: 0.12 }),
      landmarks: [{ name: 'ice-palace', side: 'left', at: 0.5, distance: 34 }],
    },
    {
      name: 'Frozen throne run', shape: straight(85, { grade: 0.1 }),
      obstacles: [peg({ costume: 'crystal-post', at: 0.25, line: 'center' }), peg({ costume: 'crystal-post', at: 0.45, line: 'left' }), peg({ costume: 'crystal-post', at: 0.65, line: 'right' })],
    },
    { name: 'Chandelier hairpin', shape: hairpin({ side: 'left' }), obstacles: [swipe({ costume: 'chandelier', side: 'high' })] },
    { name: 'Frost sweep', shape: sweep({ side: 'right', radius: 85, degrees: 170, grade: 0.08 }), billboards: 2, obstacles: [curtain({ costume: 'laser-curtain', at: 0.5, side: 'left' })] },
    { name: 'Crystal bends', shape: sBends({ first: 'left', radius: 70, degrees: 75, grade: 0.11 }), obstacles: [curtain({ costume: 'laser-curtain', at: 0.5, side: 'right' })] },
    { name: 'Icicle drop', shape: plunge(45, { grade: 0.18, from: 0.1 }), obstacles: [slalom({ costume: 'crystal-post', from: 0.35, to: 0.9, count: 4, loss: 0.2 })] },
    {
      name: 'Run to the palace gate', shape: straight(120, { grade: 0.11 }), billboards: 1,
      obstacles: [peg({ costume: 'crystal-post', at: 0.15, line: 'right' }), peg({ costume: 'crystal-post', at: 0.3, line: 'left' }), peg({ costume: 'crystal-post', at: 0.45, line: 'center' })],
      features: [rumble({ from: 0.65, to: 0.95, count: 3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
