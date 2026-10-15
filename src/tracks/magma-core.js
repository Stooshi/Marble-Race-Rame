'use strict';

// Magma Core: Block Series track 5. A dark cave of basalt blocks over glowing magma, lit only by
// the lava: down the bowl, round a long sweep over a magma pool past lava falls, a drop, a mogul
// run beside the magma, S-bends, a spiral wound round a basalt spire, over a crest and through the
// hairpin, a second spiral and the run to the lava falls.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'magma-core',
  name: 'Magma Core',
  family: 'block',
  difficulty: 'extreme',
  description: 'A dark cave of basalt blocks over glowing magma, lit only by the lava: round a sweep over a magma pool past lava falls, a mogul run beside the magma, a spiral round a basalt spire and on to the falls.',
  surface: 'ice',
  biome: 'desert',
  lighting: 'magma',
  block: { world: 'magma' },
  coaster: { style: 'blocks', colours: { support: '#3a3234', rail: '#e8d8c4', tie: '#231e20' } },
  signature: 'Over the magma',
  start: { landmark: 'basalt-spire', type: 'spiral-tower', gate: 'paddle', shots: { countdown: 'side', launch: 'high-behind' } },
  finish: { landmark: 'lava-falls' },
  designChanges: [
    'Built from the funnel drop and the magma loops, the library layout made for this track: a long sweep, a drop, a mogul straight (a boost, a peg), S-bends, a spiral, a crest, the hairpin, a second spiral and a boost into the run to the line.',
    'Magma light: the cave lit from below by the glowing magma and lava falls, a few embers drifting up; the marbles glow in their own colours.',
  ],
  opening: opening('funnel-drop', {
    costumes: { block: 'voxel-cube', slalom: 'magma-pillar' },
    names: { plunge: 'Into the core' },
  }),
  sections: layout('magma-loops', {
    costumes: { slalom: 'magma-pillar', peg: 'magma-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      rimSweep: { name: 'Over the magma', height: 14, landmarks: [{ name: 'magma-pool', at: 0.5, side: 'right', distance: 10 }, { name: 'lava-falls', at: 0.85, side: 'left', distance: 20 }] },
      drop: { name: 'Drop to the core' },
      lavaRun: { name: 'Magma run', landmarks: [{ name: 'magma-pool', at: 0.5, side: 'left', distance: 8 }] },
      sBends: { name: 'Basalt bends' },
      spin1: { name: 'Spire spiral', around: 'basalt-spire' },
      crest: { name: 'Basalt crest' },
      brakingStraight: { name: 'Run to the hairpin' },
      hairpin: { name: 'Crane hairpin' },
      spin2: { name: 'Second spiral' },
      lastStraight: { name: 'Run to the falls', landmarks: [{ name: 'magma-pool', at: 0.4, side: 'right', distance: 10 }] },
    },
  }),
});
