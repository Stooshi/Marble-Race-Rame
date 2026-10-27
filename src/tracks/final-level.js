'use strict';

// Final Level: Block Series track 10. A dusk-blue world of blocks: from the spawn beacon down the
// bowl, S-bends, through a glowing block portal into a sweep, a drop, the loop round a ring of
// lit pillars, a bonus run, the hairpin, a slalom drop and a last sweep, to a clean GG over the
// finish that lights once the winner is home.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'final-level',
  name: 'Final Level',
  family: 'block',
  difficulty: 'extreme',
  description: 'A dusk-blue world of blocks: through a glowing block portal, round the loop about a ring of lit pillars, down a slalom drop and a last sweep to a clean GG past the line that lights once the winner is home.',
  surface: 'ice',
  biome: 'arctic',
  lighting: 'night',
  block: { world: 'portal' },
  coaster: { style: 'blocks', colours: { support: '#3a3f62', rail: '#e8ecf8', tie: '#1d2038' } },
  signature: 'The loop',
  tvCameras: [
    { section: 'The loop', at: 0.8, side: 'right', distance: 10, height: 12 },
    { section: 'Through the portal', at: 0.8, side: 'left', distance: 10, height: 12 },
  ],
  start: { landmark: 'spawn-beacon', type: 'elevator', gate: 'barrier', shots: { countdown: 'above', launch: 'side' } },
  finish: { landmark: 'gg-arch' },
  designChanges: [
    'Built from the funnel drop and the final level (mirrored), the library layout made for this track: S-bends, a sweep with a boost, a drop, the loop (a spiral), a mogul straight, the hairpin, a slalom drop and a second sweep.',
    'Through a glowing block portal; the loop winds round a ring of lit pillars 14 m up on block pillars; the GG past the line lights once the winner is home (looks only).',
  ],
  opening: opening('funnel-drop', {
    costumes: { block: 'voxel-cube', slalom: 'cube-pillar' },
    names: { plunge: 'Into the level' },
  }),
  sections: layout('final-level', {
    mirror: true,
    costumes: { slalom: 'cube-pillar', peg: 'cube-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      introBends: { name: 'Level bends' },
      portalSweep: { name: 'Through the portal', landmarks: [{ name: 'block-portal', at: 0.2, over: true }] },
      drop: { name: 'Portal drop' },
      loop: { name: 'The loop', height: 14, around: 'level-pillars' },
      bonusRun: { name: 'Bonus run' },
      brakingStraight: { name: 'Run to the hairpin' },
      hairpin: { name: 'Crane hairpin' },
      slalomDrop: { name: 'Pillar slalom' },
      sweep2: { name: 'Last sweep' },
      lastStraight: { name: 'Run to the GG' },
    },
  }),
});
