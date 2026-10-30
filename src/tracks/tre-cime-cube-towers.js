'use strict';

// Tre Cime Cube Towers: Blocks Series 2 (mountains), the three rock towers of the Dolomites built from pale
// cubes. Off the cliff, down the scree in tight bends, the long spiral round the three towers (big feature one),
// across a meadow, down the scree gully in a steep plunge (big feature two), the hairpin at the hut and a sweep
// across the high meadows.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'tre-cime-cube-towers',
  name: 'Tre Cime Cube Towers',
  family: 'block-2',
  difficulty: 'extreme',
  description: 'The three rock towers of the Dolomites built from pale cubes: down the scree, a long spiral round the towers, the steep plunge down the scree gully and a sweep across the high meadows.',
  surface: 'ice',
  biome: 'alpine',
  lighting: 'day',
  variants: ['sunset'],
  block: { world: 'dolomite' },
  coaster: { style: 'blocks', colours: { support: '#9c968c', rail: '#f4f2ec', tie: '#5e5a52' } },
  signature: 'Round the three towers',
  tvCameras: [
    { section: 'Round the three towers', at: 0.7, side: 'right', distance: 12, height: 12 },
    { section: 'Across the meadows', at: 0.5, side: 'left', distance: 12, height: 12 },
  ],
  start: { landmark: 'cube-cabin', type: 'cliff', gate: 'trapdoor', shots: { countdown: 'chase', launch: 'look-back' } },
  finish: { landmark: 'cube-cabin' },
  designChanges: [
    'Blocks Series 2 (Moses, 30 Oct 2026): two big features, the long spiral round the three towers and the scree-gully plunge. Built from the clean drop and three towers, the library layout made for this track (L108).',
  ],
  opening: opening('clean-drop', {
    side: 'left',
    names: { plunge: 'Off the cliff', bends: 'Below the cliff' },
  }),
  sections: layout('three-towers', {
    costumes: { slalom: 'cube-pillar', peg: 'cube-pillar', swipe: 'block-crane', parked: 'block-pieces' },
    dress: {
      scree: { landmarks: [{ name: 'scree-fan', at: 0.5, side: 'right', distance: 16 }] },
      screeBends: { landmarks: [{ name: 'dolomite-ridge', at: 0.5, side: 'left', distance: 100 }] },
      towers: { around: 'three-towers' },
      meadow: { landmarks: [{ name: 'scree-fan', at: 0.5, side: 'left', distance: 18 }] },
      gully: { landmarks: [{ name: 'dolomite-ridge', at: 0.5, side: 'right', distance: 100 }] },
      hairpin: { landmarks: [{ name: 'cube-cabin', at: 0.5, side: 'high', distance: 16 }] },
      meadows: { landmarks: [{ name: 'dolomite-ridge', at: 0.5, side: 'right', distance: 110 }] },
      lastStraight: { name: 'Across the high meadow' },
    },
  }),
});
